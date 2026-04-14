# Render Deployment Checklist

Quick reference for deploying Job Portal to Render.

## Pre-Deployment Checklist

- [ ] Code pushed to GitHub main branch
- [ ] `.gitignore` properly configured (excludes `.env` files)
- [ ] `.env.example` files exist in Backend and Frontend
- [ ] Backend `application.properties` uses environment variables
- [ ] SecurityConfig allows dynamic CORS from env variables
- [ ] React `.env` configuration ready
- [ ] PostgreSQL database prepared (Render or external)

---

## Backend Deployment (5-10 minutes)

1. **Create Web Service**
   - [ ] New → Web Service
   - [ ] Connect GitHub repo
   - [ ] Select `Job_Hub` repository

2. **Configure Service**
   - [ ] Name: `job-backend`
   - [ ] Environment: Java
   - [ ] Branch: `main`
   - [ ] Root Directory: `Backend`
   - [ ] Build Command: `./mvnw clean package -DskipTests`
   - [ ] Start Command: `java -jar target/*.jar`

3. **Environment Variables**
   - [ ] `PORT=10000`
   - [ ] `SPRING_PROFILES_ACTIVE=production`
   - [ ] `SPRING_DATASOURCE_URL=jdbc:postgresql://...`
   - [ ] `SPRING_DATASOURCE_USERNAME=your_username`
   - [ ] `SPRING_DATASOURCE_PASSWORD=your_password`
   - [ ] `JWT_SECRET=your_secure_key_32chars_min` ⚠️ Important!
   - [ ] `SPRING_JPA_HIBERNATE_DDL_AUTO=update`
   - [ ] `CORS_ALLOWED_ORIGINS=http://localhost:3000` (update later)

4. **Deploy**
   - [ ] Click "Create Web Service"
   - [ ] Wait for green checkmark
   - [ ] Note backend URL: `https://job-backend.onrender.com`

---

## Frontend Deployment (3-5 minutes)

1. **Create Static Site**
   - [ ] New → Static Site
   - [ ] Connect GitHub repo
   - [ ] Select `Job_Hub` repository

2. **Configure Site**
   - [ ] Name: `job-frontend`
   - [ ] Branch: `main`
   - [ ] Root Directory: `Frontend`
   - [ ] Build Command: `npm install && npm run build`
   - [ ] Publish Directory: `build`

3. **Environment Variables**
   - [ ] `REACT_APP_API_URL=https://job-backend.onrender.com/api`
   - [ ] `REACT_APP_ENVIRONMENT=production`

4. **Deploy**
   - [ ] Click "Create Static Site"
   - [ ] Wait for green checkmark
   - [ ] Note frontend URL: `https://job-frontend.onrender.com`

---

## Post-Deployment Setup (2-3 minutes)

1. **Update Backend CORS**
   - [ ] Go back to Backend service
   - [ ] Environment tab
   - [ ] Update `CORS_ALLOWED_ORIGINS=https://job-frontend.onrender.com`
   - [ ] Save and wait for redeploy

2. **Test Frontend**
   - [ ] Visit `https://job-frontend.onrender.com`
   - [ ] Load takes 30+ seconds first time
   - [ ] Dashboard should display
   - [ ] Check Console for errors

3. **Test Backend API**
   - [ ] Call `https://job-backend.onrender.com/api/jobs/all`
   - [ ] Should return JSON
   - [ ] Check response status is 200

4. **End-to-End Test**
   - [ ] Frontend → Try search feature
   - [ ] Check Network tab in DevTools
   - [ ] Verify API calls to backend
   - [ ] Check for CORS errors

---

## Enable Auto-Deployment

- [ ] GitHub integration enabled (automatic by default)
- [ ] Push changes to main branch
- [ ] Render auto-detects and deploys
- [ ] Monitor via Render dashboard

---

## Troubleshooting Quick Fixes

**Frontend won't load**

- [ ] Backend might be cold-starting (~30 sec)
- [ ] Check ENV vars in Render
- [ ] Check browser console for errors

**API calls failing**

- [ ] Backend CORS_ALLOWED_ORIGINS must match frontend URL
- [ ] Database connection check backend logs
- [ ] JWT_SECRET must be set and non-empty

**Build fails**

- [ ] Check logs in Render dashboard
- [ ] Ensure pom.xml/package.json are valid locally first
- [ ] Verify Java/Node versions

---

## Important Notes

⚠️ **Critical Security**:

- Never commit `.env` files
- Always set strong JWT_SECRET
- Use different secrets per environment

🔄 **Auto-redeploy on Push**:

- Push to main branch → Render auto-deploys
- Takes 3-5 minutes for full deployment

❄️ **Cold Start**:

- First load after idle might take 30+ seconds
- This is normal for free tier
- Upgrades to paid tier for instant response

💾 **Database**:

- Keep backups of production data
- Test migrations thoroughly
- Use `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` after first run

---

## Deployment Commands (if needed)

```bash
# Rebuild/redeploy from Render dashboard
# Or push to GitHub main and auto-deploy triggers

# Manual push to trigger deploy
git push origin main

# View Render logs
# Via dashboard → Service → Logs tab
```

---

## Post-Deployment Monitoring

1. Check Render dashboard weekly
2. Monitor error logs for issues
3. Test API calls regularly
4. Backup database monthly
5. Update dependencies quarterly

**Date**: April 2026  
**Deployment Type**: Full-stack on Render  
**Status**: Ready for production
