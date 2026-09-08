# JobHub — Modern Job Aggregator & Career Intelligence Platform

A full-stack career platform built with **Spring Boot 3** and **React 18**. JobHub aggregates live job listings across 9+ external job platforms, provides an ATS-style resume parser with skill gap analysis, generates interactive career roadmaps, and includes full application lifecycle tracking for candidates and recruiters.

---

## Key Features

- **Multi-Source Job Aggregator**: Fetches and deduplicates job listings across platforms including Arbeitnow, Himalayas, Remotive, USAJobs, Jooble, JSearch, and Greenhouse with circuit-breaker fault tolerance.
- **Relevance & Search Engine**: Custom multi-factor scoring matching keywords, tech stacks, experience levels, and location normalization (city/country/remote).
- **ATS Resume Intelligence**: Built-in resume parser (PDF & DOCX using Apache PDFBox and Apache POI) extracting skills, experience, and contact info, providing instant match scoring against any job.
- **Personalized Career Roadmaps**: Generates progressive milestone roadmaps, recommended learning topics, and skill gap breakdowns based on target roles.
- **Full Application Pipeline**: Track application statuses (`Applied`, `Under Review`, `Interview`, `Accepted`, `Rejected`) with notes, reminders, and historical tracking.
- **Authentication & Security**:
  - JWT token-based session management with configurable expiration.
  - OAuth 2.0 social login via Google and GitHub.
  - Email OTP verification and password reset powered by JavaMailSender (SMTP).
- **Recruiter & Admin Tools**:
  - Post and manage job openings directly.
  - Review applicant submissions, resumes, and candidate pipelines.
  - Administrative telemetry: user management, aggregate stats, cache eviction.

---

## Tech Stack

### Backend
- **Framework**: Spring Boot 3.3.5 (Java 17)
- **Security**: Spring Security 6, JJWT (0.11.5)
- **Database & Persistence**: PostgreSQL, Spring Data JPA / Hibernate
- **Caching**: Caffeine In-Memory Cache
- **Document Processing**: Apache PDFBox 3.0.2, Apache POI 5.2.5
- **Mail Delivery**: Spring Mail (JavaMailSender / SMTP)
- **Build Tool**: Apache Maven (Maven Wrapper included)

### Frontend
- **Framework**: React 18.2 (Create React App)
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios (configured with interceptors for JWT injection and token refresh)
- **Styling**: Vanilla CSS (Modular CSS files with glassmorphism design tokens, CSS custom properties, responsive breakpoints)

---

## System Architecture

```text
               +--------------------------------------------------+
               |                  Browser / UI                    |
               |       React 18 SPA (Port 3000 / 5173)            |
               +--------------------------------------------------+
                                        |
                                        | HTTP / REST (JWT Auth)
                                        v
               +--------------------------------------------------+
               |               Spring Boot 3 API                  |
               |                  (Port 8080)                     |
               +--------------------------------------------------+
                 /        |                |             \
                /         |                |              \
               v          v                v               v
       +------------+ +------------+ +------------+ +------------------+
       | PostgreSQL | |  Caffeine  | | PDFBox/POI | |  External APIs   |
       |  Database  | | Cache Layer| | Parser     | | (RemoteOK,       |
       |            | |            | | Service    | |  Himalayas, etc.)|
       +------------+ +------------+ +------------+ +------------------+
```

---

## Project Structure

```text
Job-portal-project/
├── Backend/
│   ├── src/main/java/com/example/backend/
│   │   ├── config/          # Security, AppConfig, Cache, DB optimization
│   │   ├── connector/       # Live connectors (Adzuna, Himalayas, USAJobs, etc.)
│   │   ├── controller/      # REST API Controllers (Jobs, Auth, Career, Admin, Recruiter)
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── model/           # JPA Entities (User, Job, Application, VerificationOtp, ChatMessage)
│   │   ├── repository/      # Spring Data JPA Repositories
│   │   └── service/         # Business logic, CareerIntelligence, ResumeParser, Mailer
│   ├── src/main/resources/
│   │   └── application.properties
│   ├── pom.xml
│   ├── start-backend.ps1    # Automated port-clearing backend launcher
│   └── mvnw.cmd
├── Frontend/
│   ├── public/              # Static index.html and assets
│   ├── src/
│   │   ├── components/      # JobCard, CountryPhoneInput, FilterSidebar, Modals, Navbar
│   │   ├── pages/           # Dashboard, Login, Signup, RecruiterPortal, AdminPanel
│   │   ├── services/        # apiService, axiosInstance, jobMatchingService, resumeService
│   │   ├── styles/          # Modular CSS stylesheets
│   │   ├── utils/           # auth token helpers, link sanitizers
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── .env.example             # Environment variable template
├── init-db.sql              # Pre-seeded job postings dataset
├── load-db.ps1              # Database seed script for PostgreSQL
├── clear-db.ps1             # Database reset utility
└── README.md
```

---

## Getting Started

### Prerequisites
- **Java**: JDK 17 or higher
- **Node.js**: v18.0.0 or higher (npm v9+)
- **PostgreSQL**: v14 or higher running on localhost:5432

---

### Step 1: Database Setup

1. Open PostgreSQL CLI (`psql`) or pgAdmin and create the database:
   ```sql
   CREATE DATABASE job_portal;
   ```
2. *(Optional)* Seed initial job postings and platform data using the included script:
   ```powershell
   # Windows PowerShell
   .\load-db.ps1
   ```
   Or manually load the SQL file:
   ```bash
   psql -U postgres -d job_portal -f init-db.sql
   ```

---

### Step 2: Environment Configuration

Create a `.env` file in the project root by copying the template:

```bash
cp .env.example .env
```

Edit `.env` with your local credentials:

```ini
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/job_portal
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_postgres_password

# JWT Authentication
JWT_SECRET=your_super_secret_signing_key_min_32_characters_long
JWT_TOKEN_VALIDITY_MS=604800000

# Social OAuth (Optional for local testing)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email Delivery (Gmail SMTP App Password for OTP verification)
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=your_email@gmail.com
SPRING_MAIL_PASSWORD=your_16_char_gmail_app_password
APP_MAIL_FROM_NAME="JobHub Platform"
APP_MAIL_FROM_EMAIL=your_email@gmail.com
```

> **Note**: `BackendApplication.java` will automatically parse and load the root `.env` file when starting up.

---

### Step 3: Run the Backend

Navigate to the `Backend` directory and start the Spring Boot server:

```powershell
# Using the PowerShell helper (releases busy ports automatically)
.\start-backend.ps1

# Or standard Maven wrapper
cd Backend
.\mvnw.cmd spring-boot:run
```

*(On Linux / macOS)*:
```bash
cd Backend
chmod +x mvnw
./mvnw spring-boot:run
```

The backend server starts on **http://localhost:8080**.

---

### Step 4: Run the Frontend

In a separate terminal:

```bash
cd Frontend
npm install
npm start
```

The React app will launch automatically at **http://localhost:3000**.

---

## API Endpoints Reference

### Authentication & Account
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new candidate or recruiter | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token | No |
| `POST` | `/api/auth/send-otp` | Send verification OTP via email | No |
| `POST` | `/api/auth/verify-otp` | Verify OTP code | No |
| `POST` | `/api/auth/reset-password` | Reset forgotten password | No |
| `GET` | `/api/oauth/google/url` | Get Google OAuth redirect link | No |
| `GET` | `/api/oauth/github/url` | Get GitHub OAuth redirect link | No |

### Jobs & Discovery
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/jobs` | Paginated list of active jobs | No |
| `GET` | `/api/jobs/search` | Search with query, location, and platform filters | No |
| `GET` | `/api/jobs/{id}` | Get individual job details | No |
| `GET` | `/api/jobs/recommended` | Candidate personalized job recommendations | Yes |
| `GET` | `/api/jobs/trending-skills` | Get high-demand skills in current market | No |
| `POST` | `/api/jobs` | Create new job posting (Recruiter/Admin) | Yes |

### Career Intelligence & ATS
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/career/parse-resume` | Upload and parse PDF/DOCX resume file | Yes |
| `POST` | `/api/career/match-analysis` | Compare candidate skills against target job | Yes |
| `GET` | `/api/career/roadmap` | Generate role roadmap and learning milestones | Yes |

### Applications Pipeline
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/applications/user` | Fetch all applications submitted by candidate | Yes |
| `POST` | `/api/applications/apply/{jobId}` | Submit job application | Yes |
| `PUT` | `/api/applications/{id}/status` | Update stage (`Applied`, `Interview`, etc.) | Yes |
| `DELETE` | `/api/applications/{id}` | Withdraw an application | Yes |

---

## Testing

Run unit and integration tests across the stack:

```bash
# Run backend tests
cd Backend
.\mvnw.cmd test

# Run frontend tests
cd Frontend
npm test -- --watchAll=false
```

---

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/new-connector`).
3. Commit your changes (`git commit -m 'Add new job aggregator connector'`).
4. Push to the branch (`git push origin feature/new-connector`).
5. Open a Pull Request.

---

## License

This project is licensed under the MIT License.
