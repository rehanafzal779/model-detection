# Render Backend Deployment Guide

## Prerequisites
- GitHub account (free)
- Render account (free at render.com)
- Your repository pushed to GitHub

## Step 1: Prepare Your Repository

### 1A. Check these files exist in your project root:
- ✅ `requirements.txt` - Dependencies
- ✅ `Procfile` - Render startup command
- ✅ `backend.py` - Main application
- ✅ `.env.production` - Production environment variables
- ✅ `.gitignore` - Should exclude node_modules, .env

### 1B. Update `.gitignore` (add if not present):
```
node_modules/
.env
.env.local
.env.*.local
dist/
build/
__pycache__/
*.pyc
neatnow_yolov8_best.pt.zip
neatnow_yolov8_best.pt
model_ml/
```

### 1C. Push to GitHub:
```bash
git add .
git commit -m "Prepare backend for Render deployment"
git push origin main
```

## Step 2: Deploy to Render

### 2A. Sign Up / Login
1. Go to [Render.com](https://render.com)
2. Click "Sign up" or login with GitHub
3. Authorize Render to access your GitHub repositories

### 2B. Create a New Service
1. Dashboard → New + → Web Service
2. Select your repository from the list
3. If you don't see it, click "Configure account" to grant access to all repos

### 2C. Configure the Service (IMPORTANT)

Fill in these fields:

| Field | Value |
|-------|-------|
| **Name** | `neat-now-backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn backend:app` |
| **Instance Type** | Free (for testing) |

### 2D. Add Environment Variables
1. Click "Advanced" or scroll down
2. Click "Add Environment Variable"
3. Add these variables:

```
FLASK_ENV              production
FRONTEND_URL           https://your-vercel-url.vercel.app  (UPDATE THIS)
PORT                   10000
MODEL_PATH             ./model_ml
PYTHON_VERSION         3.10.0
```

⚠️ **Replace `your-vercel-url` with your actual Vercel deployment URL**

### 2E. Deploy
1. Click "Create Web Service"
2. Render will deploy (takes 2-5 minutes)
3. You'll see the live URL: `https://neat-now-backend-xxxxx.onrender.com`

## Step 3: Handle Large Model Files (IMPORTANT)

Your YOLOv8 model files are large. Options:

### Option A: Upload to Render (if < 500MB)
1. Push model files to GitHub
2. Render will download during `pip install` step

### Option B: Use Model Caching (Recommended)
The backend has fallback to "mock" detections if models aren't found. It will still work but return demo results.

### Option C: Use Cloud Storage (AWS S3)
Download model at runtime from S3 (advanced)

## Step 4: Test Your Backend

### Test Health Endpoint
```bash
curl https://neat-now-backend-xxxxx.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cpu",
  "model_path": "./model_ml"
}
```

### Test Detection Endpoint
```bash
curl -X POST https://neat-now-backend-xxxxx.onrender.com/api/detect \
  -F "image=@path/to/test-image.jpg"
```

## Step 5: Update Frontend

In your Vercel or Netlify environment variables, set:
```
VITE_API_URL=https://neat-now-backend-xxxxx.onrender.app/api
```

Then redeploy your frontend.

## Troubleshooting

### 502 Bad Gateway Error
- Check Render logs: Dashboard → your service → Logs
- Common causes:
  - Model file not found → returns mock data (OK)
  - Missing dependencies → check `requirements.txt`
  - Port mismatch → Render forces port 10000

### Model Not Loading
- This is OK - backend will return mock detections
- Models are large; free tier has limited disk space
- To use actual models, upgrade to paid tier or use Option C

### CORS Errors
- Update `.env.production` with your frontend URL
- Redeploy with new environment variable

### Connection Timeout
- Free tier services spin down after 15 minutes of inactivity
- Takes 30 seconds to wake up
- Upgrade to paid tier for instant startup

## Production Checklist

- [ ] `requirements.txt` created with all dependencies
- [ ] `Procfile` in root directory
- [ ] GitHub repository is updated and pushed
- [ ] Render service created and deployed
- [ ] Environment variables set in Render dashboard
- [ ] Frontend updated with backend API URL
- [ ] Health endpoint tested (/api/health)
- [ ] CORS issues resolved

## Next Steps

1. **Monitor Logs**: Keep an eye on Render logs for errors
2. **Set Up Webhooks** (Optional): Auto-redeploy when you push to GitHub
3. **Upgrade if Needed**: Free tier limitations may require upgrade
4. **Custom Domain** (Optional): Add your own domain in Render settings

---

## Quick Copy-Paste Commands

### For Local Testing (Before Deploying):
```bash
cd your-project-folder
python -m pip install -r requirements.txt
python backend.py
```

### To regenerate requirements.txt locally:
```bash
pip freeze > requirements.txt
```

---

**Need Help?**
- Render Docs: https://render.com/docs
- Python on Render: https://render.com/docs/deploy-python
- Contact: support@render.com
