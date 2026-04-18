# Replit Backend Deployment Checklist

## Pre-Deployment

- [ ] Code committed to GitHub repository
- [ ] `requirements.txt` includes all dependencies
- [ ] `.replit` configuration file exists
- [ ] `.env` variables documented in `.env.example`
- [ ] Model file prepared (ONNX recommended for free tier)
- [ ] Backend tested locally with `python backend.py`

## Replit Setup

- [ ] Replit project created from GitHub
- [ ] `.replit` file is recognized by Replit
- [ ] Environment variables added to Replit Secrets:
  - [ ] `FLASK_ENV=production`
  - [ ] `FRONTEND_URL=your-frontend-url`
  - [ ] `PORT=8000`
  - [ ] `MODEL_PATH=./model_ml`

## Model Deployment

- [ ] Model file uploaded to Replit:
  - [ ] ONNX format (if using), OR
  - [ ] PyTorch model in `model_ml/best/best.pt` folder
- [ ] Model file is readable in Replit

## Testing

- [ ] Backend starts without errors: `npm run` or click Run
- [ ] Health check endpoint works:
  ```
  curl https://your-replit.repl.co/api/health
  ```
- [ ] Admin panel accessible:
  ```
  https://your-replit.repl.co/admin/
  ```
- [ ] Detection endpoint responds:
  ```
  curl -X POST -F "image=@test.jpg" https://your-replit.repl.co/api/detect
  ```

## Frontend Integration

- [ ] Frontend repository prepared
- [ ] API endpoint updated in frontend code
- [ ] Frontend deployment configured with:
  ```
  REACT_APP_API_URL=https://your-replit.repl.co
  ```
- [ ] Frontend tested against Replit backend

## Production Ready

- [ ] Backend URL is publicly accessible
- [ ] CORS is properly configured
- [ ] Model is loaded successfully
- [ ] Error handling is working
- [ ] Rate limiting configured (if needed)
- [ ] Monitoring/logging enabled

## Documentation

- [ ] Backend API documentation ready
- [ ] Frontend developers know the API endpoint
- [ ] Deployment instructions shared with team
- [ ] Troubleshooting guide available

## Post-Deployment

- [ ] Monitor backend logs
- [ ] Check API response times
- [ ] Verify model detections are working
- [ ] Get feedback from frontend team
- [ ] Plan upgrades if performance is insufficient

---

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Backend URL:** https://___________
**Notes:** 

