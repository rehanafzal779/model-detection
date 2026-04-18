# Replit Backend Deployment Guide

This guide explains how to deploy the AI Detection Backend on Replit (free tier).

## Overview

The backend is a Flask API that serves the YOLOv8 object detection model. It will run on Replit's free platform and can be called by the frontend React application.

## Prerequisites

- A free Replit account (https://replit.com)
- The backend code pushed to a GitHub repository
- The model file (`best.pt` or ONNX file)

## Step 1: Create a Replit from GitHub

1. Go to https://replit.com
2. Click "Create" → "Import from GitHub"
3. Paste your GitHub repository URL
4. Replit will automatically detect the `requirements.txt` and `.replit` file

## Step 2: Configure Environment Variables

1. In the Replit workspace, click the lock icon (Secrets/Environment)
2. Add the following environment variables:

```
FLASK_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
PORT=8000
MODEL_PATH=./model_ml
```

## Step 3: Upload Model File (Important!)

### Option A: Use ONNX Model (Recommended for Free Tier)

The ONNX model is lighter and faster on Replit's limited resources.

1. Click "Upload File" in Replit
2. Upload `neatnow_yolov8_best.onnx`
3. The backend will automatically use ONNX if PyTorch inference fails

### Option B: Use PyTorch Model

1. Create a `model_ml` folder in Replit
2. Create a `best` subfolder inside it
3. Upload `best.pt` to `model_ml/best/`

**Note:** Large model files (>500MB) may cause issues on Replit's free tier. ONNX format is preferred.

## Step 4: Install Dependencies

Replit will automatically install dependencies from `requirements.txt` when you first run it.

If dependencies don't install:
1. Click the "Shell" button at the bottom
2. Run: `pip install -r requirements.txt`

## Step 5: Run the Backend

Click the green "Run" button at the top. The backend will start on:
```
https://your-replit-name.your-username.repl.co
```

## Step 6: Update Frontend API Endpoint

In your React frontend (`src/services/api.ts` or similar), update the API base URL:

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  'https://your-replit-name.your-username.repl.co';
```

Or set the environment variable in your frontend deployment:
```
REACT_APP_API_URL=https://your-replit-name.your-username.repl.co
```

## Step 7: Test the API

Once running, test the endpoints:

### Health Check
```bash
curl https://your-replit-name.your-username.repl.co/api/health
```

### Detection Endpoint
```bash
curl -X POST \
  -F "image=@test_image.jpg" \
  https://your-replit-name.your-username.repl.co/api/detect
```

## Troubleshooting

### Issue: "ModuleNotFoundError" for torch or ultralytics

**Solution:**
- Replit has memory limits. Install only essential packages first
- Use ONNX instead of PyTorch (lighter weight)
- Or use a paid Replit plan with more resources

### Issue: Model file not found

**Solution:**
1. Ensure the model is uploaded to the correct path
2. Check the `.replit` and `backend.py` for correct `MODEL_PATH`
3. The backend will fall back to "mock" mode if the model can't be loaded

### Issue: CORS errors when calling from frontend

**Solution:**
- The backend includes CORS headers
- Ensure `FRONTEND_URL` environment variable is set correctly
- Try using `https://` instead of `http://`

### Issue: API is slow or times out

**Solution:**
- Replit's free tier has limited CPU/memory
- Model inference might be slow on large images
- Resize images before sending to the API
- Consider upgrading to Replit Pro for better performance

## File Structure

```
project/
├── backend.py              # Main Flask app
├── requirements.txt        # Python dependencies
├── .replit                # Replit configuration
├── .env.example           # Environment variables template
├── Procfile               # Process file (if needed)
├── neatnow_yolov8_best.onnx  # ONNX model (recommended)
└── model_ml/
    └── best/
        └── best.pt        # PyTorch model (optional)
```

## Important Notes

1. **Always use ONNX on free Replit** - It's much lighter than PyTorch
2. **Model files are large** - If upload fails, your file may be too big
3. **Free tier has limits** - API may be slow with many concurrent requests
4. **Keep backend running** - Configure Replit to keep your backend always on (paid feature)
5. **Test locally first** - Use `python backend.py` locally before deploying

## Next Steps

1. Push this code to GitHub
2. Create a Replit from your GitHub repo
3. Upload the ONNX model file
4. Set environment variables
5. Click Run
6. Update your frontend to use the new backend URL

## Production Considerations

For production:
- Upgrade to Replit Pro for better performance
- Or use Railway, Render, or Heroku (they have free tiers too)
- Use a database to store detection results
- Implement proper authentication
- Add rate limiting to prevent abuse
- Monitor API usage and performance

## Support

For issues with:
- **Flask/Backend**: See `backend.py` documentation
- **Replit**: Check https://docs.replit.com
- **YOLO Model**: See https://docs.ultralytics.com
