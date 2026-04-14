# 🚀 Deploy to Render - Quick Start (5 Minutes)

This is the absolute quickest way to get Job Portal running on Render.

## Prerequisite (1 minute)

1. Fork/Clone: https://github.com/waghyashashri25/Job_Hub.git
2. Create free Render account: https://render.com (click Sign Up)
3. Have your PostgreSQL database details ready (or create one on Render)

---

## Backend → Render (3 minutes)

1. Go: https://dashboard.render.com → **New +** → **Web Service**
2. Select your GitHub repo, click **Connect**
3. **Fill these:**

   ```
   Name:           job-backend
   Environment:    Java
   Branch:         main
   Root Dir:       Backend
   Build:          ./mvnw clean package -DskipTests
   Start:          java -jar target/*.jar
   ```

4. **Scroll → Environment → Add Variables:**

   ```
   PORT                         10000
   SPRING_DATASOURCE_URL        jdbc:postgresql://YOUR_DB_HOST:5432/job_portal
   SPRING_DATASOURCE_USERNAME   your_db_user
   SPRING_DATASOURCE_PASSWORD   your_db_password
   JWT_SECRET                   (copy from: openssl rand -base64 64)
   SPRING_JPA_HIBERNATE_DDL_AUTO   update
   CORS_ALLOWED_ORIGINS         http://localhost:3000
   ```

5. Click **Create Web Service** ✅ Done!
6. Wait for green checkmark (~2-3 min)
7. **Copy URL**: `https://job-backend-xxx.onrender.com`

---

## Frontend → Render (2 minutes)

1. Go: https://dashboard.render.com → **New +** → **Static Site**
2. Select same GitHub repo
3. **Fill these:**

   ```
   Name:               job-frontend
   Branch:             main
   Root Dir:           Frontend
   Build:              npm install && npm run build
   Publish Dir:        build
   ```

4. **Scroll → Environment → Add:**

   ```
   REACT_APP_API_URL    https://job-backend-xxx.onrender.com/api
   ```

   (Use the Backend URL from step 7 above)

5. Click **Create Static Site** ✅ Done!
6. Wait for green checkmark (~1-2 min)
7. **Copy URL**: `https://job-frontend-xxx.onrender.com`

---

## Final Step (1 minute)

Go back to **Backend Service** → **Environment** → Edit:

```
CORS_ALLOWED_ORIGINS = https://job-frontend-xxx.onrender.com
```

Click Save. Backend redeploys automatically.

---

## 🎉 Done! Your app is live

- Frontend: https://job-frontend-xxx.onrender.com
- Backend: https://job-backend-xxx.onrender.com/api

**First load takes ~30 sec (cold start). That's normal!**

---

## Test It

```bash
# Test backend API
curl https://job-backend-xxx.onrender.com/api/jobs/all

# Visit frontend
https://job-frontend-xxx.onrender.com
```

---

## Auto-Deploy Enabled! 🔄

Just push to GitHub main branch:

```bash
git push origin main
```

Render automatically deploys in 2-3 minutes!

---

## Stuck? Check These

| Problem                          | Solution                                                     |
| -------------------------------- | ------------------------------------------------------------ |
| "Cannot reach API" from frontend | Update CORS_ALLOWED_ORIGINS on backend to match frontend URL |
| Database connection error        | Check SPRING_DATASOURCE_URL, USERNAME, PASSWORD are correct  |
| Build fails                      | See full logs in Render dashboard → Logs tab                 |
| Page takes forever to load       | Free tier cold start = 30+ sec. Normal!                      |

---

## Need More Details?

See `RENDER_DEPLOYMENT.md` for full guide with troubleshooting.

---

**That's it! 🎊 Your Job Portal is now live on Render with auto-deployment!**
