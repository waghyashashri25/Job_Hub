# Job Portal - Complete Guide

A modern, full-stack job portal platform built with **React** (Frontend) and **Spring Boot** (Backend). The application features a responsive UI with job listings, application tracking, and advanced search capabilities.

## Features

- **Job Discovery**: Browse and search job listings with advanced filtering
- **Job Matching**: Intelligent job recommendations based on skills and preferences
- **Application Tracking**: Track all job applications in one place
- **User Authentication**: Secure JWT-based authentication with login/signup
- **Admin Dashboard**: Administrative panel for job management
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Real-time Search**: Live search with trending skills and recent applications
- **Premium UI**: Modern, professional design with smooth animations

## Tech Stack

### Frontend

- **React 18.2** - UI framework
- **React Router 6** - Client-side routing
- **Axios** - HTTP client
- **Vanilla CSS** - Custom styling with modern CSS features (gradients, animations, backdrop-filter)
- **Node.js** - Runtime environment

### Backend

- **Spring Boot** - Java web framework
- **Maven** - Build tool and dependency management
- **PostgreSQL/MySQL** - Database (configurable)
- **Spring Security** - Authentication and authorization
- **JWT** - Token-based security
- **JPA/Hibernate** - ORM

## Prerequisites

### Frontend Requirements

- **Node.js** (v14 or higher)
- **npm** (v6 or higher) or **yarn**

### Backend Requirements

- **Java** (JDK 11 or higher)
- **Maven** (v3.6 or higher)
- **PostgreSQL** or **MySQL** database

## Project Structure

```
job-portal-project/
├── Frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── styles/          # CSS files
│   │   ├── utils/           # Utility functions
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   ├── .env.example         # Frontend environment template
│   └── public/
│
├── Backend/                  # Spring Boot application
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/  # Java source code
│   │   │   └── resources/         # Configuration files
│   │   └── test/            # Test files
│   ├── pom.xml             # Maven configuration
│   ├── .env.example        # Backend environment template
│   ├── mvnw                # Maven wrapper (Unix/Mac)
│   └── mvnw.cmd            # Maven wrapper (Windows)
│
└── Documentation/          # Project documentation
    ├── README.md           # This file
    ├── ARCHITECTURE_GUIDE.md
    └── ... (other guides)
```

## Installation & Setup

### Clone the Repository

```bash
git clone <repository-url>
cd job-portal-project
```

### Frontend Setup

1. **Navigate to Frontend directory**

   ```bash
   cd Frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create environment file**

   ```bash
   cp .env.example .env.local
   ```

4. **Update .env.local with your backend URL**

   ```
   REACT_APP_API_URL=http://localhost:8080/api
   REACT_APP_ENVIRONMENT=development
   ```

5. **Start the development server**
   ```bash
   npm start
   ```
   The application will open at `http://localhost:3000`

### Backend Setup

1. **Navigate to Backend directory**

   ```bash
   cd Backend
   ```

2. **Create environment file**

   ```bash
   cp .env.example .env
   ```

3. **Update .env with database credentials**

   ```
   DB_URL=jdbc:postgresql://localhost:5432/job_portal
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_secret_key
   ```

4. **Build the project**

   ```bash
   # Using Maven wrapper (no Maven installation required)
   ./mvnw clean package -DskipTests  # Unix/Mac
   mvnw.cmd clean package -DskipTests  # Windows

   # OR using Maven (if installed)
   mvn clean package -DskipTests
   ```

5. **Run the application**
   ```bash
   java -jar target/Backend-0.0.1-SNAPSHOT.jar
   ```
   The API server will start at `http://localhost:8080`

### Database Setup (PostgreSQL Example)

1. **Create database**

   ```bash
   createdb job_portal
   ```

2. **Configure database in Backend/.env**
   - Set `DB_URL=jdbc:postgresql://localhost:5432/job_portal`
   - Set `DB_USERNAME=postgres`
   - Set `DB_PASSWORD=your_password`

3. **Tables will be created automatically** by Hibernate (set `SPRING_JPA_HIBERNATE_DDL_AUTO=update` in .env)

## Running the Application

### Development Mode

**Terminal 1 - Backend**

```bash
cd Backend
./mvnw spring-boot:run
# Server runs on http://localhost:8080
```

**Terminal 2 - Frontend**

```bash
cd Frontend
npm start
# App runs on http://localhost:3000
```

### Production Build

**Backend**

```bash
cd Backend
./mvnw clean package
java -jar target/Backend-0.0.1-SNAPSHOT.jar
```

**Frontend**

```bash
cd Frontend
npm run build
# Build output in Frontend/build/
```

## API Endpoints

### Jobs

- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/{id}` - Get job details
- `POST /api/jobs` - Create job (admin)
- `PUT /api/jobs/{id}` - Update job (admin)
- `DELETE /api/jobs/{id}` - Delete job (admin)

### Applications

- `GET /api/applications` - Get user applications
- `POST /api/applications` - Apply to job
- `GET /api/applications/{id}` - Get application details
- `PUT /api/applications/{id}` - Update application status

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Search & Recommendations

- `GET /api/jobs/search` - Search jobs with filters
- `GET /api/jobs/recommended` - Get recommended jobs
- `GET /api/jobs/trending-skills` - Get trending skills

## Environment Variables

### Frontend (.env.local)

```
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_ENVIRONMENT=development
REACT_APP_ENABLE_DEBUG_MODE=false
```

### Backend (.env)

```
DB_URL=jdbc:postgresql://localhost:5432/job_portal
DB_USERNAME=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=dev
```

**⚠️ Security Note**: Never commit `.env` files to version control. Use `.env.example` as a template and create local `.env` files for development.

## Troubleshooting

### Frontend won't connect to backend

- Verify Backend is running on `http://localhost:8080`
- Check `REACT_APP_API_URL` in `.env.local`
- Check browser console for CORS errors

### Backend database connection errors

- Ensure PostgreSQL/MySQL is running
- Verify credentials in `.env` file
- Check database URL and port are correct

### Port already in use

- Frontend (3000): `lsof -i :3000` and kill process if needed
- Backend (8080): `lsof -i :8080` and kill process if needed

### Maven/Node version issues

- Use Maven wrapper: `./mvnw` instead of `mvn`
- Check Node version: `node --version` (should be v14+)
- Check npm version: `npm --version` (should be v6+)

## Testing

### Frontend Tests

```bash
cd Frontend
npm test
```

### Backend Tests

```bash
cd Backend
./mvnw test
```

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files. Use `.env.example` templates.
2. **JWT Secret**: Use a strong, randomly generated JWT secret in production.
3. **Database Password**: Use a secure password for database access.
4. **CORS**: Configure CORS properly in Backend (only allow trusted origins).
5. **Dependency Updates**: Regularly update dependencies for security patches.
6. **API Authentication**: All protected endpoints require valid JWT token.

## Deployment

### Deploy Frontend

- Build: `npm run build`
- Deploy `Frontend/build/` folder to static hosting (Netlify, Vercel, AWS S3, Azure Static Web Apps, etc.)

### Deploy Backend

- Build: `./mvnw clean package`
- Deploy JAR file to cloud server (Heroku, AWS EC2, Azure App Service, Google Cloud Run, etc.)

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Create a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support & Questions

For issues, questions, or suggestions:

1. Check existing documentation in the project
2. Review API response logs in Backend console
3. Check browser console in Frontend for errors
4. Open an issue with detailed description

---

**Last Updated**: 2024
**Version**: 1.0.0
