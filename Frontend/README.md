# Job Portal Frontend

A React-based frontend for the Job Aggregation and Tracking System.

## Features

- User authentication (Login/Signup)
- Job listing with search and filtering
- Application tracking
- Admin panel for job creation and aggregation
- Role-based access control

## Setup

### Prerequisites

- Node.js 14+ installed
- npm or yarn

### Installation

1. Navigate to the Frontend directory:

```bash
cd Frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

The application will open at `http://localhost:3000`.

## API Integration

The frontend connects to the backend at `http://localhost:8080/api`. Ensure the backend is running before starting the frontend.

### Environment Variables

Create a `.env` file in the `Frontend` directory if you need to customize the API endpoint:

```
REACT_APP_API_URL=http://localhost:8080/api
```

## Project Structure

```
src/
├── components/      # Reusable components (Navbar, etc.)
├── pages/          # Full page components (Login, Jobs, etc.)
├── services/       # API service layer (Axios instance, API calls)
├── styles/         # CSS stylesheets
├── utils/          # Utility functions (Auth, Protected Routes)
├── App.js          # Main routing
└── index.js        # Entry point
```

## Features

### Authentication

- Login with email and password
- User signup
- JWT token storage in localStorage
- Automatic logout on token expiration

### Job Listing

- View all aggregated jobs
- Search by keyword and location
- Filter by platform/source
- Save jobs for later
- Direct redirection to job platform

### Application Tracker

- View all saved applications
- Update application status (SAVED, APPLIED, INTERVIEW, REJECTED)
- Track job applications across multiple platforms

### Admin Panel

- Create jobs manually
- Trigger job aggregation from multiple sources
- Monitor job fetching stats

## Security

- JWT tokens automatically attached to API requests
- Protected routes for authenticated users
- Role-based access control (USER/ADMIN)
- Automatic redirect to login on unauthorized access

## Notes

- This frontend uses basic CSS for styling. For production, consider using a CSS framework like Tailwind CSS or styled-components.
- The application relies on the backend being available at the configured API endpoint.
