# PythonAnywhere Deployment Guide

## Step 1: Sign Up (NO Credit Card)
1. Go to **[www.pythonanywhere.com](https://www.pythonanywhere.com)**
2. Click **"Sign up"** → Choose **"Free account"**
3. Create account with email/username
4. Verify email ✅

---

## Step 2: Upload Your Files

### Option A: Upload via Web Interface (Easiest)
1. Login to PythonAnywhere Dashboard
2. Click **"Files"** tab
3. Create new folder: `/home/yourusername/mysite/`
4. Upload these files:
   - `backend.py`
   - `requirements.txt`
   - `.env.production`

### Option B: Upload via Git (Recommended)
1. Go to **"Consoles"** tab
2. Click **"$ Bash"** to open terminal
3. Run:
```bash
git clone https://github.com/yourusername/neat-now-AdminPanel-Web-noor.git
cd neat-now-AdminPanel-Web-noor
```

---

## Step 3: Create Virtual Environment

In **Bash Console**, run:
```bash
mkvirtualenv --python=/usr/bin/python3.10 mysite
workon mysite
pip install -r requirements.txt
```

---

## Step 4: Create Web App

1. Click **"Web"** tab
2. Click **"Add a new web app"**
3. Choose **"Manual configuration"** (NOT framework)
4. Select **Python 3.10**
5. You'll get a URL: `https://yourusername.pythonanywhere.com`

---

## Step 5: Configure WSGI File

1. In **"Web"** tab, find **"WSGI configuration file"**
2. Click the file path (e.g., `/var/www/yourusername_pythonanywhere_com_wsgi.py`)
3. Replace content with:

```python
import sys
import os

# Add project directory to path
path = '/home/yourusername/mysite'
if path not in sys.path:
    sys.path.append(path)

# Activate virtual environment
activate_this = '/home/yourusername/.virtualenvs/mysite/bin/activate_this.py'
exec(open(activate_this).read(), {'__file__': activate_this})

# Import Flask app
from backend import app as application
```

4. Save (Ctrl+S)

---

## Step 6: Update Source Code Path

In **"Web"** tab, find **"Source code"** field:
- Enter: `/home/yourusername/mysite`

---

## Step 7: Set Environment Variables

1. In **"Web"** tab, scroll to **"Web app settings"**
2. Find **"Environment variables"**
3. Add these:

```
FLASK_ENV          = production
FRONTEND_URL       = https://your-vercel-url.vercel.app
PORT               = 80
MODEL_PATH         = /home/yourusername/mysite
```

---

## Step 8: Reload & Test

1. In **"Web"** tab, click **"Reload yourusername.pythonanywhere.com"** (green button)
2. Wait 10 seconds
3. Test: Visit `https://yourusername.pythonanywhere.com/api/health`
4. Should return:
```json
{"status": "ok", "model_loaded": true}
```

---

## Step 9: Update Frontend

In your **Vercel** or **Netlify** environment variables, add:
```
VITE_API_URL = https://yourusername.pythonanywhere.com/api
```

Redeploy frontend ✅

---

## Troubleshooting

### ❌ Error: "ModuleNotFoundError: No module named 'flask'"
- **Solution:** Make sure virtual environment is activated
- Run: `workon mysite` in Bash console

### ❌ Error: "Model not loaded"
- **Solution:** PythonAnywhere free tier may not have disk space
- Models will fallback to mock detections (still works!)

### ❌ 502 Bad Gateway
- **Solution:** Check error log in **"Web"** tab → **"Error log"**
- Look for details about what's failing

### ❌ CORS Errors
- **Solution:** Update FRONTEND_URL in environment variables
- Make sure it matches your deployed frontend URL

---

## Your Final URLs

| Service | URL |
|---------|-----|
| **Backend API** | `https://yourusername.pythonanywhere.com/api` |
| **Health Check** | `https://yourusername.pythonanywhere.com/api/health` |
| **Detection** | `https://yourusername.pythonanywhere.com/api/detect` |

---

## Free Tier Limits

- ⏱️ **CPU limit:** 100 seconds/day (for background tasks)
- 💾 **Disk space:** 512 MB
- 🚀 **Uptime:** 24/7 (as long as you visit monthly)
- ⚙️ **Workers:** 1 concurrent

✅ **Good for:** Testing, demos, small projects
❌ **Not for:** High-traffic production apps

---

## Need Help?

- **PythonAnywhere Docs:** https://help.pythonanywhere.com/
- **Flask Guide:** https://help.pythonanywhere.com/pages/Flask/
- **Troubleshooting:** https://help.pythonanywhere.com/pages/Troubleshooting/
