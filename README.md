# Job_Hub
Near real-time multi-platform job aggregation and tracking system integrating 15+ job portals with smart keyword search, dynamic redirection, and application tracking.

# 🚀 Near Real-Time Multi-Platform Job Aggregation & Tracking System

## 💡 Overview

This project is a full-stack Job Aggregation Platform designed to simplify job discovery by integrating multiple job portals into a single unified interface. It provides a scalable and intelligent system for searching, exploring, and tracking job opportunities across 15+ platforms.

---

## 🎯 Key Features

### 🔍 Smart Job Search

* Keyword-based intelligent search system
* Flexible matching across job titles, descriptions, and skills
* Fallback mechanism to avoid "no results" scenarios

### 🌐 Multi-Platform Integration (15+ Platforms)

* **API-based platforms:** Adzuna, JSearch, Remotive, USAJobs
* **Redirect-based platforms:** LinkedIn, Indeed, Naukri, Foundit, Shine, Apna, Glassdoor, Monster, TimesJobs, SimplyHired, Wellfound
* Dynamic URL generation for platforms without APIs

### 🧠 Intelligent Features

* Match Percentage for each job
* Skill Gap Analysis (missing skills)
* Interview Probability Score
* Job Source Confidence indicator

### 📊 Application Tracker

* Save jobs
* Track application status:

  * Saved
  * Applied
  * Interview
  * Rejected

### ⚡ Near Real-Time Aggregation

* Scheduled job fetching every 5–10 minutes
* Deduplication logic using HashMap
* Normalized job data from multiple sources

### 🔐 Authentication & Security

* JWT-based authentication
* Role-based access control (USER / ADMIN)

---

## 🧱 Tech Stack

### Frontend

* React.js
* Axios
* CSS (Responsive UI with card-based layout)

### Backend

* Spring Boot
* REST APIs
* Scheduler (Cron / Fixed Rate)

### Database

* PostgreSQL

### Deployment

* Frontend: Vercel
* Backend: Render

---

## 🏗️ System Architecture

Frontend (React)
↓
Backend (Spring Boot)
↓
Aggregation Layer
↓
API + Redirect Connectors
↓
Database (PostgreSQL)

---

## 🔄 Workflow

1. User searches for jobs (keyword + location)
2. Backend fetches jobs from APIs
3. Generates dynamic links for external platforms
4. Deduplicates and stores job data
5. Displays jobs as interactive cards
6. User can apply (redirect) or track applications

---

## ⚠️ Limitations

* No direct APIs for platforms like LinkedIn (handled via redirection)
* Application status tracking is user-managed
* Near real-time updates (not instant)

---

## 🚀 Future Enhancements

* AI-based job recommendations
* Resume analysis & optimization
* Email notifications for relevant jobs
* Mobile application

---

## 🎯 Conclusion

This project demonstrates a real-world scalable system for job discovery by combining API integration, intelligent search, and user-centric tracking features. It addresses the fragmentation of job platforms and provides a centralized, efficient solution.

---

## 👩‍💻 Author

Developed by [Your Name]
