# Render Deployment Guide - Job Portal

This guide provides step-by-step instructions to deploy the Job Portal full-stack application on Render with automatic CI/CD from GitHub.

## Prerequisites

- GitHub account with Job Portal repository pushed
- Render account (free tier available)
- PostgreSQL database (local, cloud, or Render Postgres)
- Basic understanding of environment variables

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Internet Users                     │
└────────────────────┬────────────────────────────────┘
                     │
     ┌───────────────┴───────────────┐
     │                               │
┌────▼──────────────────┐   ┌───────▼──────────────┐
│  React Frontend       │   │  Spring Boot Backend │
│  (Static Site)        │   │  (Web Service)       │
│  job-frontend         │   │  job-backend         │
│  onrender.com         │   │  onrender.com        │
└─────────┬──────────────┘   └───────┬──────────────┘
          │                          │
          │      HTTPS/REST API      │
          └──────────────┬───────────┘
                         │
         ┌───────────────┴──────────────┐
         │                              │
    ┌────▼─────────────────┐   ┌──────▼─────────┐
    │   PostgreSQL DB      │   │   External     │
    │   (Render or Cloud)  │   │   Job APIs     │
    │                      │   │   (Optional)   │
    └──────────────────────┘   └────────────────┘
```

---

## Step 1: Prepare Your GitHub Repository

Your repository should have this structure:

```
Job_Hub/
├── Backend/                 # Spring Boot application
│   ├── src/
│   ├── pom.xml
│   ├── mvnw
│   ├── mvnw.cmd
│   ├── .env.example
│   ├── .env.render
│   └── target/             # Build output (ignored)
│
├── Frontend/                # React application
│   ├── src/
│   ├── package.json
│   ├── public/
│   ├── .env.example
│   ├── .env.render
│   └── build/              # Build output (ignored)
│
├── render.yaml            # Render deployment config (optional)
├── .gitignore            # Should exclude .env, node_modules, target/
└── README.md
```

✅ Verify your repo has:

- ✓ `Backend/` folder with Spring Boot app
- ✓ `Frontend/` folder with React app
- ✓ `.gitignore` excluding sensitive files
- ✓ `.env.example` files for reference

---

## Step 2: Set Up PostgreSQL Database

### Option A: Use Render PostgreSQL (Recommended for testing)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **PostgreSQL**
3. Configure:
   - **Name**: `job-portal-db`
   - **Region**: Choose closest to you
   - **PostgreSQL Version**: 14+
4. Click **Create Database**
5. Save the connection string details:
   - Internal Database URL
   - External Database URL
   - Username
   - Password

### Option B: Use Existing PostgreSQL Database

If you have a cloud database (AWS RDS, Azure Database, etc.):

- Get the connection string
- Format: `jdbc:postgresql://host:5432/database_name`

### Option C: Use .local PostgreSQL (for development)

For local testing:

- Connection: `jdbc:postgresql://localhost:5432/job_portal`

---

## Step 3: Deploy Backend on Render

### 3.1 Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Click **Build and deploy from a Git repository**
4. Connect your GitHub account if not already connected
5. Select the `Job_Hub` repository

### 3.2 Configure Backend Service

Fill in the following:

```
Name: job-backend (or your preferred name)
Environment: Java
Region: (select closest to your users)
Branch: main
Root Directory: Backend

Build Command: ./mvnw clean package -DskipTests
Start Command: java -jar target/*.jar

Runtimes:
  - Java 17+
  - Maven 3.8+
```

### 3.3 Add Environment Variables

1. Scroll to **Environment** section
2. Add the following variables:

| Key                             | Value                                                | Notes                               |
| ------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| `PORT`                          | `10000`                                              | Render default                      |
| `SPRING_PROFILES_ACTIVE`        | `production`                                         | Production mode                     |
| `SPRING_DATASOURCE_URL`         | `jdbc:postgresql://xxx.onrender.com:5432/job_portal` | Your DB connection string           |
| `SPRING_DATASOURCE_USERNAME`    | `your_db_user`                                       | From PostgreSQL                     |
| `SPRING_DATASOURCE_PASSWORD`    | `your_secure_password`                               | From PostgreSQL                     |
| `JWT_SECRET`                    | `your_super_secret_key_32chars_min`                  | Generate: `openssl rand -base64 64` |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update`                                             | Use `validate` after first deploy   |
| `CORS_ALLOWED_ORIGINS`          | `https://job-frontend.onrender.com`                  | Update after frontend deploy        |

⚠️ **Important**:

- Never use empty `JWT_SECRET`
- Generate strong random JWT secret
- Use `update` on first run, then change to `validate`

### 3.4 Deploy Backend

1. Click **Create Web Service**
2. Render will automatically build and deploy
3. Monitor the deployment logs
4. Once deployed, note your backend URL: `https://job-backend.onrender.com`

### 3.5 Verify Backend Deployment

Once deployed, test the API:

```bash
# Check if backend is running
curl https://job-backend.onrender.com/api/jobs/all

# You should get a JSON response (might be empty list initially)
```

---

## Step 4: Deploy Frontend on Render

### 4.1 Create Static Site

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Static Site**
3. Select your GitHub repository `Job_Hub`

### 4.2 Configure Frontend Service

Fill in the following:

```
Name: job-frontend (or your preferred name)
Region: (same as backend recommended)
Branch: main
Root Directory: Frontend

Build Command: npm install && npm run build
Publish Directory: build
```

### 4.3 Add Environment Variables

1. Scroll to **Environment** section
2. Add the following variables:

| Key                           | Value                                  |
| ----------------------------- | -------------------------------------- |
| `REACT_APP_API_URL`           | `https://job-backend.onrender.com/api` |
| `REACT_APP_ENVIRONMENT`       | `production`                           |
| `REACT_APP_ENABLE_DEBUG_MODE` | `false`                                |

### 4.4 Deploy Frontend

1. Click **Create Static Site**
2. Render will build and deploy
3. Once deployed, get your frontend URL: `https://job-frontend.onrender.com`

### 4.5 Update Backend CORS

Now that frontend is deployed, update backend:

1. Go back to backend service in Render Dashboard
2. Click **Environment**
3. Update `CORS_ALLOWED_ORIGINS` to your frontend URL:
   ```
   https://job-frontend.onrender.com
   ```
4. Save changes
5. Backend will automatically redeploy

---

## Step 5: Test Deployment

### 5.1 Frontend Test

1. Visit: `https://job-frontend.onrender.com`
2. Should load the Job Portal dashboard
3. Check browser console for any errors
4. Try loading jobs, searching, etc.

### 5.2 Backend API Test

1. Test endpoints directly:

   ```bash
   # Public endpoint (no auth required)
   curl https://job-backend.onrender.com/api/jobs/all

   # Should return JSON array of jobs
   ```

2. Test with frontend API calls:
   - Open frontend in browser
   - Open Developer Tools → Network tab
   - Try interactions (search, filter, etc.)
   - Verify API calls show 200 status codes

### 5.3 Common Issues & Fixes

**Issue**: Frontend shows "Cannot connect to API"

- **Fix**: Check `REACT_APP_API_URL` env variable
- **Fix**: Check backend `CORS_ALLOWED_ORIGINS` includes frontend URL
- **Fix**: Backend might be sleeping on free tier (takes ~30 seconds to wake up)

**Issue**: Database connection error in backend logs

- **Fix**: Verify `SPRING_DATASOURCE_URL`, `USERNAME`, `PASSWORD` are correct
- **Fix**: Check database is running and accessible
- **Fix**: For Render Postgres, use External URL from dashboard

**Issue**: Build fails

- **Fix**: Check logs in Render dashboard
- **Fix**: Verify `./mvnw` has execute permissions
- **Fix**: Ensure `pom.xml` is valid

---

## Step 6: Enable Auto-Deployment

### 6.1 GitHub Integration (Automatic)

By default, Render auto-deploys when you push to the main branch:

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. Render automatically detects the push
4. Renders automatically rebuild and redeploy

### 6.2 Monitor Deployments

1. Go to service dashboard in Render
2. Click **Events** tab to see deployment history
3. Click build ID to see full logs
4. Failed builds show error details

---

## Step 7: Update Backend When Frontend URL Changes

If you ever redeploy and get a new frontend URL:

1. Go to Backend service in Render
2. Edit **Environment**
3. Update `CORS_ALLOWED_ORIGINS`
4. Save (backend auto-redeploys)

---

## Database Management

### Connect to Remote Database

```bash
# Using psql (if installed)
psql "postgresql://user:password@host:5432/job_portal"

# View tables
\dt

# Run SQL queries
SELECT * FROM jobs LIMIT 5;
```

### Database Backups

For Render Postgres:

1. Dashboard → Your Database → Backups
2. Create manual backup before major changes
3. Automatic daily backups included

---

## Environment Variables Reference

### Backend (.env for local, Environment in Render)

```properties
# Server
PORT=8080
SPRING_PROFILES_ACTIVE=production

# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://host:5432/db
SPRING_DATASOURCE_USERNAME=user
SPRING_DATASOURCE_PASSWORD=password

# JWT
JWT_SECRET=your_secret_key
JWT_TOKEN_VALIDITY_MS=86400000

# CORS
CORS_ALLOWED_ORIGINS=https://frontend.onrender.com

# Hibernate
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_SHOW_SQL=false

# Scheduler
JOBS_SCHEDULER_ENABLED=true
JOBS_SCHEDULER_FIXED_RATE_MS=600000
```

### Frontend (.env.local for local, Environment in Render)

```
REACT_APP_API_URL=https://backend.onrender.com/api
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_DEBUG_MODE=false
REACT_APP_API_TIMEOUT=30000
```

---

## Generate Strong JWT Secret

```bash
# Linux/Mac
openssl rand -base64 64

# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Random -Maximum 999999999).ToString())) | ForEach-Object { $_ + (Get-Random -Maximum 999999999) }

# Or use an online generator
# https://jwtsecret.github.io/jwt/
```

---

## Troubleshooting

### Deployment Won't Start

**Error**: "Build failed"

- Check if Node modules are ignored in .gitignore
- Run `npm install` locally to verify package.json
- Check Java version compatibility

**Error**: "Service failing to start"

- Check backend logs for database connection errors
- Verify all required environment variables are set
- Check database is accessible from Render

### API Calls Failing

**Error**: "CORS error"

- Update backend `CORS_ALLOWED_ORIGINS` env
- Restart backend service
- Wait a few seconds for env to apply

**Error**: 502 Bad Gateway

- Backend might be starting (cold start)
- Wait ~30 seconds and try again
- Check backend logs for errors

### Database Issues

**Error**: "Connection refused"

- For Render Postgres, use External URL, not Internal
- Verify credentials are correct
- Check security groups allow incoming connections

---

## Production Best Practices

1. **JWT Secret**: Change after first deployment, use strong random value
2. **Database**: Use production-grade Postgres (not SQLite)
3. **HTTPS**: All URLs should use https://
4. **Backups**: Configure automated database backups
5. **Monitoring**: Check Render logs regularly
6. **Dependencies**: Keep Spring Boot and Node dependencies updated
7. **Secrets**: Never commit `.env` files; use environment variables

---

## Monitoring & Logs

### View Logs in Render

1. Service Dashboard → **Logs** tab
2. View real-time logs
3. Search for errors
4. Download full logs if needed

### Check Health

```bash
# Backend health
curl https://job-backend.onrender.com/actuator/health

# If not available, test basic endpoint
curl https://job-backend.onrender.com/api/jobs/all
```

---

## Next Steps

1. ✅ Verify frontend and backend are accessible
2. ✅ Test core functionality (search, apply, etc.)
3. ✅ Monitor deployment logs for errors
4. ✅ Set up database backups
5. ✅ Update domain name (if using custom domain)
6. ✅ Configure additional services (email, analytics, etc.)

---

## Support & Resources

- [Render Documentation](https://render.com/docs)
- [Spring Boot on Render](https://render.com/docs/deploy-spring-boot)
- [React on Render](https://render.com/docs/static-sites)
- [PostgreSQL on Render](https://render.com/docs/postgres)
- Check logs first before posting issues

---

**Deployment Date**: April 2026  
**Framework Versions**: Spring Boot 3.x, React 18.x  
**Database**: PostgreSQL 14+
