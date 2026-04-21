interface Detection {
  class: string;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// YOLOv8 class names (you may need to adjust based on your model)
const CLASS_NAMES = [
  'pothole', 'garbage', 'damaged_road', 'debris', 'crack',
  'water_leak', 'fallen_tree', 'street_damage', 'trash', 'litter'
];

const ONLINE_INFERENCE_URL = 'https://lab-4--t41175390.replit.app/api/inference/';

// Draw detections on canvas
export function drawDetectionsOnImage(
  imageSrc: string,
  detections: Detection[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Draw detections
      detections.forEach((det, index) => {
        const colors = [
          '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
          '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#52C1D5'
        ];
        const color = colors[index % colors.length];
        
        const x = det.x1;
        const y = det.y1;
        const w = det.x2 - det.x1;
        const h = det.y2 - det.y1;
        
        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        
        // Draw label background
        const label = `${det.class} ${(det.confidence * 100).toFixed(1)}%`;
        ctx.font = 'bold 12px Arial';
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width + 8;
        const textHeight = 20;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y - textHeight, textWidth, textHeight);
        
        // Draw label text
        ctx.fillStyle = '#FFF';
        ctx.fillText(label, x + 4, y - 6);
      });
      
      resolve(canvas.toDataURL());
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}

function normalizeApiDetection(det: any): Detection | null {
  const className = String(
    det?.class_name ?? det?.class ?? det?.label ?? det?.name ?? 'Unknown'
  );

  const confidence = Number(det?.confidence ?? det?.conf ?? det?.score ?? 0);

  let x1 = Number(det?.x1);
  let y1 = Number(det?.y1);
  let x2 = Number(det?.x2);
  let y2 = Number(det?.y2);

  // Supports bbox object format: {x1, y1, x2, y2}
  if ([x1, y1, x2, y2].some(Number.isNaN) && det?.bbox && typeof det.bbox === 'object' && !Array.isArray(det.bbox)) {
    x1 = Number(det.bbox.x1);
    y1 = Number(det.bbox.y1);
    x2 = Number(det.bbox.x2);
    y2 = Number(det.bbox.y2);
  }

  // Supports bbox array format: [x, y, width, height]
  if ([x1, y1, x2, y2].some(Number.isNaN) && Array.isArray(det?.bbox) && det.bbox.length >= 4) {
    x1 = Number(det.bbox[0]);
    y1 = Number(det.bbox[1]);
    x2 = Number(det.bbox[0]) + Number(det.bbox[2]);
    y2 = Number(det.bbox[1]) + Number(det.bbox[3]);
  }

  if (![x1, y1, x2, y2].every(Number.isFinite)) {
    return null;
  }

  return {
    class: className,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    x1,
    y1,
    x2,
    y2,
  };
}

async function imageSrcToBlob(imageSrc: string): Promise<Blob> {
  const response = await fetch(imageSrc);
  if (!response.ok) {
    throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
  }
  return await response.blob();
}

// Main detection function (online API)
export async function detectObjects(imageSrc: string): Promise<Detection[]> {
  try {
    console.log('🚀 Starting online object detection...');

    const blob = await imageSrcToBlob(imageSrc);
    const formData = new FormData();
    formData.append('image', blob, 'image.jpg');

    const response = await fetch(ONLINE_INFERENCE_URL, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }

    if (payload?.status !== 'success' || !Array.isArray(payload?.detections)) {
      throw new Error('Invalid API response format');
    }

    const detections = payload.detections
      .map((det: any) => normalizeApiDetection(det))
      .filter((det: Detection | null): det is Detection => det !== null)
      .sort((a: Detection, b: Detection) => b.confidence - a.confidence);

    console.log(`✅ Detection complete: ${detections.length} objects found`);
    return detections;
  } catch (error: any) {
    console.error('❌ Detection error:', error);
    throw new Error(`AI Detection failed: ${error.message}`);
  }
}

export { Detection };
