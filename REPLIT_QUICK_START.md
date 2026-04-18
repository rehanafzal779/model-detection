# Quick Replit Deployment Setup

## 1. Push Code to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 2. Create Replit Project

1. Go to https://replit.com/~
2. Click "Create Replit"
3. Select "Import from GitHub"
4. Paste your repository URL
5. Click "Import from GitHub"

## 3. Add Environment Variables

In Replit:
1. Click the **lock icon** (🔒) in the left sidebar (Secrets)
2. Add these variables:

```
FLASK_ENV=production
FRONTEND_URL=https://your-frontend-url.vercel.app
PORT=8000
MODEL_PATH=./model_ml
```

## 4. Upload Model File

**Recommended: Use ONNX Model (Lightweight)**

1. In Replit file explorer, right-click → "Upload File"
2. Upload `neatnow_yolov8_best.onnx` 
3. The backend will auto-detect and use it

OR

**Use PyTorch Model:**
1. Create folder: `model_ml/best/`
2. Upload `best.pt` inside the `best` folder

## 5. Run the Backend

1. Click the green **"Run"** button
2. Wait for the backend to start
3. You'll see the URL: `https://replit-name.username.repl.co`

## 6. Update Frontend

In your React app, set the API endpoint:

```typescript
// In your API service file
const API_URL = process.env.REACT_APP_API_URL || 
  'https://replit-name.username.repl.co';
```

Then when deploying frontend, set:
```
REACT_APP_API_URL=https://replit-name.username.repl.co
```

## 7. Test It Works

```bash
curl https://replit-name.username.repl.co/api/health
```

Should return:
```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cpu",
  "model_path": "./model_ml"
}
```

## Deployment Architecture

```
Frontend (Vercel/Netlify/Replit)
       ↓ HTTP API calls
Backend (Replit)
       ↓ Uses Model
YOLO Model (ONNX or PyTorch)
```

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Module not found" error | Run `pip install -r requirements.txt` in Shell |
| Model file not found | Use ONNX instead, it's lighter |
| API is slow | Replit free tier is slow; resize images before sending |
| CORS error | Make sure FRONTEND_URL env var is set correctly |
| Replit goes to sleep | Upgrade to Pro or use keep-alive service |

## That's It! 🎉

Your backend is now running on Replit and ready to receive API calls from your frontend.
