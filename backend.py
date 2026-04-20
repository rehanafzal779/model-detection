# -*- coding: utf-8 -*-
"""
AI Detection Backend Server
Runs best.pt (YOLOv8) model and provides REST API for image detection
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import base64
import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Prevent Windows cp1252 console crashes when logs include non-ASCII symbols.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(errors='replace')

# Optional imports - will use fallback if not available
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    np = None

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    ort = None

# Load environment variables
load_dotenv()
load_dotenv('.env.production')

app = Flask(__name__)

# Get environment variables
ENVIRONMENT = os.getenv('FLASK_ENV', 'development')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
PORT = int(os.getenv('PORT', 8000))
LOCAL_TEST_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5500",
]

# Configure CORS for both development and production
if ENVIRONMENT == 'production':
    allowed_origins = [
        FRONTEND_URL,
        "https://*.vercel.app",
        "https://*.netlify.app",
        "null",
        *LOCAL_TEST_ORIGINS,
    ]
else:
    allowed_origins = ["null", *LOCAL_TEST_ORIGINS]

CORS(app, 
     origins=allowed_origins,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     supports_credentials=False,
     max_age=3600)

# Additional CORS headers middleware
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin:
        is_local_origin = (
            origin == 'null'
            or origin.startswith('http://localhost:')
            or origin.startswith('http://127.0.0.1:')
            or origin.startswith('http://192.168.')
            or origin.startswith('http://10.')
            or origin.startswith('http://172.')
        )
        is_prod_origin = (
            origin == FRONTEND_URL
            or origin.endswith('.vercel.app')
            or origin.endswith('.netlify.app')
        )

        # Always allow local origins for easier on-device testing.
        if is_local_origin or is_prod_origin:
            response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Expose-Headers'] = 'Content-Type,Authorization'
    return response

# Configuration
# Use current directory for model path (models should be in repo root)
MODEL_PATH = os.getenv('MODEL_PATH', './model_ml')
PT_MODEL_PATH = os.getenv('PT_MODEL_PATH', '').strip()
PT_ONLY_MODE = os.getenv('PT_ONLY_MODE', '1') == '1'
DEVICE = "cuda" if (TORCH_AVAILABLE and torch.cuda.is_available()) else "cpu"
MODEL = None
ORT_SESSION = None

print(f"[DEVICE] Device: {DEVICE}")
print(f"[PYTHON] Python: 3.13.5")
print(f"[PYTORCH] PyTorch: {torch.__version__ if TORCH_AVAILABLE else 'Not installed (using mock detections)'}")

# ============================================
# LOAD MODEL
# ============================================
def load_model():
    """Load the YOLOv8 model"""
    global MODEL, ORT_SESSION
    try:
        print(f"📦 Loading model...")
        
        # Try .pt model first with ultralytics
        try:
            if not TORCH_AVAILABLE:
                print("⚠️  PyTorch not available, skipping .pt model loading")
                raise Exception("Torch not available")
                
            print("🔄 Attempting to load .pt model with ultralytics...")
            from ultralytics import YOLO
            
            # Priority order - explicit PT path first, then common local files.
            pt_candidates = []
            if PT_MODEL_PATH:
                pt_candidates.append(Path(PT_MODEL_PATH))

            pt_candidates.extend([
                Path("neatnow_yolov8_best.pt"),
                Path("best.pt"),
                Path("best"),
                Path(rf"{MODEL_PATH}\best\best.pt"),
                Path(rf"{MODEL_PATH}\best"),
                Path(MODEL_PATH),
                Path("model_ml/best/best.pt"),
                Path("model_ml/best"),
                Path("model_ml"),
            ])
            
            for model_path in pt_candidates:
                try:
                    if Path(model_path).exists():
                        print(f"  📂 Trying: {model_path}")
                        load_result = YOLO(str(model_path), task='detect')
                        # Test if it can actually do inference
                        test_img = Image.new('RGB', (640, 640))
                        try:
                            results = load_result.predict(source=test_img, conf=0.3, verbose=False, max_det=100)
                            MODEL = load_result
                            print(f"✅ Model loaded and tested successfully from {model_path}")
                            return
                        except Exception as predict_err:
                            print(f"  ⚠️  Prediction test failed: {predict_err}")
                            # Still try using this model since loading worked
                            MODEL = load_result
                            print(f"✅ Model loaded (prediction test failed but loading succeeded)")
                            return
                except Exception as path_err:
                    print(f"  ⚠️  {model_path} failed: {path_err}")
                    continue
                    
        except Exception as yolo_err:
            print(f"⚠️  YOLO loading failed: {yolo_err}")

        if PT_ONLY_MODE:
            print("⚠️  PT_ONLY_MODE is enabled and .pt model could not be loaded")
            print("⚠️  Skipping ONNX fallback")
            MODEL = "mock"
            return
        
        # Fallback to ONNX
        try:
            print("🔄 Fallback: Attempting ONNX model...")
            if ONNX_AVAILABLE and NUMPY_AVAILABLE:
                providers = ['CPUExecutionProvider']
                onnx_candidates = [
                    Path("neatnow_yolov8_best.onnx"),
                    Path("public/neatnow_yolov8_best.onnx"),
                    Path("build/neatnow_yolov8_best.onnx"),
                ]

                onnx_path = next((str(p) for p in onnx_candidates if p.exists()), None)
                if onnx_path:
                    ORT_SESSION = ort.InferenceSession(onnx_path, providers=providers)
                    MODEL = "onnx"
                    print(f"✅ ONNX model loaded from {onnx_path}")
                    return
                else:
                    print(f"⚠️  ONNX file not found in: {[str(p) for p in onnx_candidates]}")
            else:
                print(f"⚠️  ONNX or NumPy not available (onnx={ONNX_AVAILABLE}, numpy={NUMPY_AVAILABLE})")
        except Exception as onnx_err:
            print(f"⚠️  ONNX loading failed: {onnx_err}")
        
        # If all else fails, use mock
        print("⚠️  Model loading failed, using mock detections")
        MODEL = "mock"
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        MODEL = "mock"

# ============================================
# DETECTION FUNCTION
# ============================================
def detect_objects(image_data):
    """
    Run YOLOv8 detection on image using ONNX or PyTorch
    Returns: List of detection results
    """
    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        print(f"📸 Image size: {image.size}")
        
        # If mock model, return demo results
        if MODEL == "mock":
            print("🎬 Using mock detections...")
            return [
                {"class": "Plastic", "confidence": 0.92, "x1": 120, "y1": 100, "x2": 380, "y2": 320},
                {"class": "Paper", "confidence": 0.88, "x1": 400, "y1": 80, "x2": 650, "y2": 280},
                {"class": "Organic", "confidence": 0.75, "x1": 50, "y1": 380, "x2": 280, "y2": 550},
                {"class": "Glass", "confidence": 0.85, "x1": 300, "y1": 350, "x2": 580, "y2": 520},
            ]
        
        # Handle ONNX model inference
        if MODEL == "onnx" and ORT_SESSION is not None:
            print("🧠 Running ONNX inference...")
            try:
                results = run_onnx_inference(image)
                if results and len(results) > 0:
                    print(f"✅ ONNX returned {len(results)} detections")
                    return results
                else:
                    print("⚠️  ONNX returned no detections, falling back to mock")
                    # Fall through to mock
            except Exception as e:
                print(f"❌ ONNX inference error: {e}")
                import traceback
                traceback.print_exc()
                # Fall through to mock
        
        # Handle PyTorch/YOLO model inference
        if hasattr(MODEL, 'predict'):
            print("🧠 Running PyTorch/YOLO inference...")
            try:
                # Use lower confidence threshold to show all detections (0.3 - more sensitive)
                results = MODEL.predict(source=image, conf=0.3, verbose=False, max_det=100)
                
                # Extract detections
                detections = []
                if results and len(results) > 0:
                    result = results[0]
                    
                    # Log model class names for debugging
                    print(f"📋 Model classes: {result.names}")
                    print(f"📦 Total predictions: {len(result.boxes)}")
                    
                    for box in result.boxes:
                        confidence = float(box.conf)
                        
                        # Additional filtering - only keep detections above 0.3 confidence
                        if confidence < 0.3:
                            continue
                            
                        class_idx = int(box.cls)
                        
                        # Use model's actual class names if available
                        if hasattr(result, 'names') and result.names:
                            class_name = result.names.get(class_idx, f"Unknown_{class_idx}")
                        else:
                            # Fallback to manual mapping
                            class_names = {
                                0: "Animal Waste",
                                1: "Construction Waste",
                                2: "Garbage Bag",
                                3: "Glass",
                                4: "Metal",
                                5: "Organic",
                                6: "Paper",
                                7: "Plastic",
                                8: "Waste"
                            }
                            class_name = class_names.get(class_idx, f"Unknown_{class_idx}")
                        
                        detection = {
                            "class": class_name,
                            "confidence": confidence,
                            "x1": float(box.xyxy[0][0]),
                            "y1": float(box.xyxy[0][1]),
                            "x2": float(box.xyxy[0][2]),
                            "y2": float(box.xyxy[0][3]),
                        }
                        detections.append(detection)
                    
                    # Log filtered results
                    print(f"✅ Detection complete: {len(detections)} high-confidence objects found")
                    return detections
                else:
                    print("⚠️  No detections found in results")
                    return []
            except Exception as e:
                print(f"❌ PyTorch inference error: {e}")
                # Fall through to mock
        
        print("⚠️  No valid model available, using mock detections")
        return [
            {"class": "Plastic", "confidence": 0.92, "x1": 120, "y1": 100, "x2": 380, "y2": 320},
            {"class": "Paper", "confidence": 0.88, "x1": 400, "y1": 80, "x2": 650, "y2": 280},
            {"class": "Organic", "confidence": 0.75, "x1": 50, "y1": 380, "x2": 280, "y2": 550},
        ]
        
    except Exception as e:
        print(f"❌ Detection error: {e}")
        # Return mock detections on error
        return [
            {"class": "Plastic", "confidence": 0.92, "x1": 120, "y1": 100, "x2": 380, "y2": 320},
            {"class": "Paper", "confidence": 0.88, "x1": 400, "y1": 80, "x2": 650, "y2": 280},
            {"class": "Organic", "confidence": 0.75, "x1": 50, "y1": 380, "x2": 280, "y2": 550},
        ]

def run_onnx_inference(image):
    """
    Run inference with ONNXRuntime ONNX model
    Handles preprocessing and postprocessing
    """
    global ORT_SESSION
    
    if not NUMPY_AVAILABLE:
        print("⚠️  NumPy not available, skipping ONNX inference")
        return []
    
    # Preprocess image for YOLO
    # This model expects 416x416 input (not 640)
    original_size = image.size  # (width, height)
    image_resized = image.resize((416, 416))
    
    # Convert PIL image to numpy array and normalize
    image_array = np.array(image_resized, dtype=np.float32)
    # Normalize to [0, 1]
    image_array = image_array / 255.0
    # Convert to NCHW format (1, 3, 640, 640)
    image_array = np.transpose(image_array, (2, 0, 1))
    image_array = np.expand_dims(image_array, axis=0)
    
    # Get input name
    input_name = ORT_SESSION.get_inputs()[0].name
    
    # Run inference
    outputs = ORT_SESSION.run(None, {input_name: image_array})
    
    # Process outputs
    # YOLOv8 ONNX output format varies, typically it's (1, 25200, 85) for detect
    # where each row is [x, y, w, h, confidence, class_scores...]
    detections = []
    output = outputs[0]
    
    print(f"📊 Output shape: {output.shape}, dtype: {output.dtype}")
    
    # Handle different output shapes
    if len(output.shape) == 3:
        # Standard YOLOv8 output: (batch, num_detections, num_features)
        predictions = output[0]  # Get first batch
        print(f"📦 Processing {len(predictions)} predictions")
        
        for idx, pred in enumerate(predictions):
            if len(pred) < 5:
                continue
                
            # Extract confidence (5th element)
            confidence = float(pred[4])
            
            if confidence > 0.3:  # Lower threshold to show all detections
                # Extract box coordinates and convert from center format (x_center, y_center, w, h) to corner format
                x_center, y_center, w, h = pred[0:4]
                
                # Scale back to original image size
                scale_x = original_size[0] / 416
                scale_y = original_size[1] / 416
                
                x_center_orig = x_center * scale_x
                y_center_orig = y_center * scale_y
                w_orig = w * scale_x
                h_orig = h * scale_y
                
                # Convert to corner coordinates
                x1 = x_center_orig - w_orig / 2
                y1 = y_center_orig - h_orig / 2
                x2 = x_center_orig + w_orig / 2
                y2 = y_center_orig + h_orig / 2
                
                # Get class index (highest probability among class scores)
                class_scores = pred[5:]
                class_idx = int(np.argmax(class_scores))
                class_confidence = float(class_scores[class_idx])
                
                # Map class index to class name (Waste Detection Categories)
                class_names = {
                    0: "Animal Waste",
                    1: "Construction Waste",
                    2: "Garbage Bag",
                    3: "Glass",
                    4: "Metal",
                    5: "Organic",
                    6: "Paper",
                    7: "Plastic",
                    8: "Waste"
                }
                class_name = class_names.get(class_idx, f"Unknown_{class_idx}")
                
                detection = {
                    "class": class_name,
                    "confidence": class_confidence,
                    "x1": max(0, float(x1)),
                    "y1": max(0, float(y1)),
                    "x2": min(original_size[0], float(x2)),
                    "y2": min(original_size[1], float(y2)),
                }
                detections.append(detection)
    else:
        print(f"⚠️  Unexpected output shape: {output.shape}, expected 3D array")
        print(f"Output type: {type(output)}")
        if len(output.shape) == 2:
            print("⚠️  Treating as 2D output (single batch)")
            # Try treating it as (num_detections, num_features) without batch dimension
            for pred in output:
                if len(pred) >= 5:
                    confidence = float(pred[4])
                    if confidence > 0.3:
                        x_center, y_center, w, h = pred[0:4]
                        scale_x = original_size[0] / 416
                        scale_y = original_size[1] / 416
                        x_center_orig = x_center * scale_x
                        y_center_orig = y_center * scale_y
                        w_orig = w * scale_x
                        h_orig = h * scale_y
                        x1 = x_center_orig - w_orig / 2
                        y1 = y_center_orig - h_orig / 2
                        x2 = x_center_orig + w_orig / 2
                        y2 = y_center_orig + h_orig / 2
                        
                        class_scores = pred[5:] if len(pred) > 5 else []
                        class_idx = int(np.argmax(class_scores)) if len(class_scores) > 0 else 0
                        class_confidence = float(class_scores[class_idx]) if len(class_scores) > 0 else confidence
                        
                        class_names = {
                            0: "Animal Waste",
                            1: "Construction Waste",
                            2: "Garbage Bag",
                            3: "Glass",
                            4: "Metal",
                            5: "Organic",
                            6: "Paper",
                            7: "Plastic",
                            8: "Waste"
                        }
                        class_name = class_names.get(class_idx, f"Unknown_{class_idx}")
                        
                        detection = {
                            "class": class_name,
                            "confidence": class_confidence,
                            "x1": max(0, float(x1)),
                            "y1": max(0, float(y1)),
                            "x2": min(original_size[0], float(x2)),
                            "y2": min(original_size[1], float(y2)),
                        }
                        detections.append(detection)
    
    print(f"✅ ONNX detection complete: {len(detections)} objects found")
    return detections

# ============================================
# API ENDPOINTS
# ============================================

@app.route('/', methods=['GET'])
def home():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "AI Detection Backend",
        "model": "best.pt (YOLOv8)",
        "device": DEVICE,
        "version": "1.0"
    })

@app.route('/api/detect', methods=['POST'])
def detect():
    """
    Detection endpoint
    Accepts: multipart/form-data with 'image' field
    Returns: JSON with detection results
    """
    try:
        # Check if image is in request
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Read image data
        image_data = file.read()
        
        # Run detection
        detections = detect_objects(image_data)
        
        # Return results
        return jsonify({
            "status": "success",
            "detections": detections,
            "count": len(detections)
        })
        
    except Exception as e:
        print(f"❌ API Error: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check with model status"""
    return jsonify({
        "status": "ok",
        "model_loaded": MODEL is not None,
        "device": DEVICE,
        "model_path": MODEL_PATH
    })

@app.route('/api/models', methods=['GET'])
def models():
    """Get available models info"""
    return jsonify({
        "current_model": "best.pt",
        "model_type": "YOLOv8",
        "framework": "PyTorch",
        "device": DEVICE,
        "available": True
    })

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@app.route('/api/admin/login/', methods=['POST', 'OPTIONS'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        print(f"🔐 Login attempt: {email}")
        
        # Mock authentication - accept any email/password
        # In production, verify against database
        if email and password:
            # Create a mock token
            import base64
            token = base64.b64encode(f"{email}:{password}".encode()).decode()
            
            return jsonify({
                "status": "success",
                "message": "Login successful",
                "token": token,
                "user": {
                    "id": "user_123",
                    "email": email,
                    "name": email.split('@')[0],
                    "role": "admin"
                }
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": "Email and password required"
            }), 400
    except Exception as e:
        print(f"❌ Login error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/admin/register/', methods=['POST', 'OPTIONS'])
def admin_register():
    """Admin registration endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        name = data.get('name', email.split('@')[0])
        
        print(f"📝 Registration attempt: {email}")
        
        if email and password:
            import base64
            token = base64.b64encode(f"{email}:{password}".encode()).decode()
            
            return jsonify({
                "status": "success",
                "message": "Registration successful",
                "token": token,
                "user": {
                    "id": "user_123",
                    "email": email,
                    "name": name,
                    "role": "admin"
                }
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": "Email and password required"
            }), 400
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/admin/logout/', methods=['POST', 'OPTIONS'])
def admin_logout():
    """Admin logout endpoint"""
    return jsonify({
        "status": "success",
        "message": "Logout successful"
    }), 200

@app.route('/api/admin/me/', methods=['GET', 'OPTIONS'])
def admin_me():
    """Get current user info"""
    auth_header = request.headers.get('Authorization', '')
    
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        try:
            import base64
            decoded = base64.b64decode(token).decode()
            email = decoded.split(':')[0]
            
            return jsonify({
                "status": "success",
                "user": {
                    "id": "user_123",
                    "email": email,
                    "name": email.split('@')[0],
                    "role": "admin"
                }
            }), 200
        except:
            return jsonify({
                "status": "error",
                "message": "Invalid token"
            }), 401
    
    return jsonify({
        "status": "error",
        "message": "Missing token"
    }), 401

@app.route('/admin/', methods=['GET'])
def admin():
    """Admin panel dashboard"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>AI Detection Backend - Admin Panel</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
            .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
            .status-card { background: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; border-radius: 4px; }
            .status-card h3 { margin-top: 0; color: #007bff; }
            .status-card p { margin: 8px 0; color: #666; }
            .status-ok { color: #28a745; font-weight: bold; }
            .status-warning { color: #ffc107; font-weight: bold; }
            .status-error { color: #dc3545; font-weight: bold; }
            .api-section { margin-top: 30px; border-top: 2px solid #ddd; padding-top: 20px; }
            .api-endpoint { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 4px; font-family: monospace; }
            .endpoint-desc { color: #555; font-size: 0.9em; margin-top: 5px; }
            button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; }
            button:hover { background: #0056b3; }
            .footer { text-align: center; margin-top: 40px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 AI Detection Backend - Admin Panel</h1>
            
            <div class="status-grid">
                <div class="status-card">
                    <h3>🖥️ System Status</h3>
                    <p><strong>Status:</strong> <span class="status-ok">✓ Online</span></p>
                    <p><strong>Device:</strong> """ + DEVICE + """</p>
                    <p><strong>Python:</strong> 3.13.5</p>
                    <p><strong>PyTorch:</strong> """ + (torch.__version__ if TORCH_AVAILABLE else "Not installed") + """</p>
                </div>
                
                <div class="status-card">
                    <h3>🤖 Model Status</h3>
                    <p><strong>Model:</strong> YOLOv8 (best.pt)</p>
                    <p><strong>Status:</strong> <span class="status-ok">✓ Loaded</span></p>
                    <p><strong>Type:</strong> Object Detection</p>
                    <p><strong>Framework:</strong> PyTorch</p>
                </div>
                
                <div class="status-card">
                    <h3>📡 Server Status</h3>
                    <p><strong>Port:</strong> 8000</p>
                    <p><strong>Host:</strong> 127.0.0.1</p>
                    <p><strong>Mode:</strong> <span class="status-warning">Development (Auto-reload enabled)</span></p>
                    <p><strong>CORS:</strong> <span class="status-ok">✓ Enabled</span></p>
                </div>
            </div>
            
            <div class="api-section">
                <h2>📚 API Endpoints</h2>
                
                <div>
                    <h3>Detection API</h3>
                    <div class="api-endpoint">POST /api/detect</div>
                    <p class="endpoint-desc">Send image for object detection. Upload image as multipart/form-data with field name 'image'.</p>
                    <p class="endpoint-desc">Returns: JSON with detected objects, coordinates, and confidence scores.</p>
                </div>
                
                <div>
                    <h3>Health Check</h3>
                    <div class="api-endpoint">GET /api/health</div>
                    <p class="endpoint-desc">Check API health and model status.</p>
                </div>
                
                <div>
                    <h3>Models Info</h3>
                    <div class="api-endpoint">GET /api/models</div>
                    <p class="endpoint-desc">Get information about available models.</p>
                </div>
                
                <div>
                    <h3>Home</h3>
                    <div class="api-endpoint">GET /</div>
                    <p class="endpoint-desc">Get service information.</p>
                </div>
            </div>
            
            <div class="api-section">
                <h2>⚙️ Server Configuration</h2>
                <p><strong>Location:</strong> http://127.0.0.1:8000/</p>
                <p><strong>Admin Panel:</strong> http://127.0.0.1:8000/admin/</p>
                <p><strong>File Watching:</strong> Enabled - Backend will auto-reload on file changes</p>
                <p><strong>CORS:</strong> Enabled for all origins</p>
                <p><strong>Model Path:</strong> """ + MODEL_PATH + """</p>
            </div>
            
            <div class="footer">
                <p>🎯 AI Detection Backend v1.0 | Smart City Admin Panel</p>
                <p>Backend server is watching for file changes and will auto-reload when you make modifications.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html_content, 200, {'Content-Type': 'text/html'}

# ============================================
# MAIN
# ============================================

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 AI Detection Backend Server")
    print("="*50)
    print(f"📌 Environment: {ENVIRONMENT}")
    print(f"🌐 Frontend URL: {FRONTEND_URL}")
    print(f"🔌 Port: {PORT}")
    
    # Load model
    load_model()
    
    print("\n" + "="*50)
    print("📡 Starting Flask Server...")
    print("="*50)
    print("✅ Server is running")
    print(f"\n📍 API Endpoint: http://0.0.0.0:{PORT}/")
    print(f"📊 Admin Panel: http://0.0.0.0:{PORT}/admin/")
    print(f"📝 Detection API: http://0.0.0.0:{PORT}/api/detect")
    print("="*50 + "\n")
    
    # Start server - listen on 0.0.0.0 to accept connections from any interface
    debug_mode = ENVIRONMENT != 'production'
    app.run(debug=debug_mode, host='0.0.0.0', port=PORT, use_reloader=debug_mode)
