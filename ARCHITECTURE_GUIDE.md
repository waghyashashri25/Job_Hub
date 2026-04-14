# 🏗️ System Architecture & Developer Guide

## Overview

The Job Portal is now structured as a **tab-based single-page application** with a modular component architecture.

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  App.js                                                    │
│  └── Navbar (top navigation)                              │
│  └── Dashboard.js (main container)                        │
│      ├── State Management (jobs, search, applications)   │
│      ├── API Integration (jobService, appService)        │
│      └── Tab Router (shows active tab content)           │
│          ├── JobsTab (search + browse + save)           │
│          ├── RecommendedTab (AI suggestions)            │
│          ├── TrendingSkillsTab (market analysis)       │
│          ├── ApplicationsTab (job tracking)             │
│          └── InsightsTab (AI matching)                  │
│                                                             │
└────────┬──────────────────────────────────────────────┬────┘
         │ HTTP Requests (REST)                         │
         │ Responses with Job Data                      │
         │                                               │
┌────────v──────────────────────────────────────────────v────┐
│                    BACKEND (Spring Boot)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  JobController                                             │
│  ├── GET  /api/jobs/all              → getAll()         │
│  ├── GET  /api/jobs/search           → search()         │
│  └── GET  /api/jobs/source/{source}  → getBySource()   │
│                                                             │
│  ApplicationController                                     │
│  ├── POST /api/applications/save     → saveJob()        │
│  ├── GET  /api/applications/user     → getApps()        │
│  └── PUT  /api/applications/update-status┘             │
│                                                             │
│  UserController, AdminController, OAuthController       │
│                                                             │
└────────┬──────────────────────────────────────────────┬────┘
         │                                               │
┌────────v──────────────────────────────────────────────v────┐
│              DATABASE & EXTERNAL SERVICES                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MySQL Database                                            │
│  ├── users                                                 │
│  ├── jobs                                                  │
│  ├── applications                                          │
│  └── oauth_tokens                                          │
│                                                             │
│  OAuth Services                                            │
│  ├── Google OAuth                                          │
│  └── GitHub OAuth                                          │
│                                                             │
│  External Job Aggregators (via JobService)               │
│  ├── LinkedIn API                                          │
│  ├── Indeed API                                            │
│  └── Other platforms                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Dashboard.js (Main Container)

**Responsibilities**:

- State management for entire dashboard
- API orchestration
- Tab content switching
- Data passing to child tabs

**State Variables**:

```javascript
const [activeTab, setActiveTab] = useState("jobs"); // Current tab
const [jobs, setJobs] = useState([]); // Displayed jobs
const [allJobs, setAllJobs] = useState([]); // All unfiltered jobs
const [searchResults, setSearchResults] = useState([]); // Last search results
const [savedJobIds, setSavedJobIds] = useState(new Set()); // User's saved jobs
const [applications, setApplications] = useState([]); // User's applications
const [sources, setSources] = useState([]); // Available platforms
const [loading, setLoading] = useState(false); // Loading state
const [error, setError] = useState(""); // Error messages
```

**Key Methods**:

```javascript
fetchAllJobs(); // Load all jobs on startup
fetchUserApplications(); // Load user's saved jobs
handleSearch(kw, loc, src); // FIXED: Proper API search
handleClearSearch(); // Reset to all jobs
handleSaveJob(jobId); // Save job to applications
handleApply(link); // Open job link
handleUpdateApplicationStatus(); // Change application status
```

### Tab Components (JobsTab, RecommendedTab, etc.)

**JobsTab.js - Search & Browse**

```
Props:
  - jobs (array)              ← Current jobs to display
  - allJobs (array)           ← All jobs from database
  - savedJobIds (Set)         ← User's saved job IDs
  - sources (array)           ← Available platforms
  - loading, isSearching      ← Loading states
  - onSearch(kw, loc, src)    ← Search callback
  - onClearSearch()           ← Clear search callback
  - onSaveJob(jobId)          ← Save callback
  - onApply(link)             ← Apply callback

Components:
  - Search bar (keyword + location + platform)
  - Search button + Clear button
  - Job count display
  - JobCard (rendered in grid)
  - Empty state message
```

**RecommendedTab.js - AI Suggestions**

```
Props:
  - jobs (array)              ← All jobs for analysis
  - savedJobIds (Set)         ← User's saved jobs
  - onSaveJob(jobId)         ← Save callback
  - onApply(link)            ← Apply callback

Logic:
  useMemo(() => {
    1. Get saved job IDs
    2. Analyze each non-saved job
    3. Score by:
       - Same company (+10)
       - Same location (+8)
       - Same platform (+6)
    4. Sort by score
    5. Return top 12
  }, [jobs, savedJobIds])
```

**TrendingSkillsTab.js - Market Analysis**

```
Props:
  - jobs (array)              ← Jobs to analyze

Logic:
  useMemo(() => {
    1. Extract skills from all job descriptions
    2. Count frequency of each skill
    3. Convert to percentages
    4. Sort by frequency
    5. Group by category
    6. Calculate market insights
  }, [jobs])

Renders:
  - Skill bars (top 12)
  - Category cards
  - Market insights (total skills, most in-demand, avg, etc.)
```

**ApplicationsTab.js - Job Tracking**

```
Props:
  - applications (array)      ← User's saved jobs
  - onUpdateStatus(appId, status) ← Status change callback

State:
  - Manually groups apps by status
  - Renders status cards + status sections
  - Status dropdown for changes

Status Flow:
  SAVED → APPLIED → INTERVIEW → OFFER → REJECTED
```

**InsightsTab.js - AI Analysis**

```
Props:
  - jobs (array)              ← Jobs to analyze
  - savedJobIds (Set)         ← User's saved jobs

Logic:
  useMemo(() => {
    1. Enrich all jobs with AI analysis (enrichJobWithAnalysis)
    2. Calculate average match %
    3. Calculate average interview probability
    4. Create match distribution
    5. Get top matches (by match %)
    6. Get best opportunities (by interview probability)
  }, [jobs, savedJobIds])

Displays:
  - Metrics grid (avg match %, avg interview %)
  - Distribution bars (High/Medium/Low)
  - Top matches list
  - Best opportunities list
```

---

## Service Layer Integration

### jobMatchingService.js

**Purpose**: AI analysis of jobs

**Key Functions**:

```javascript
extractSkillsFromJob(description); // Find tech skills in text
calculateMatchPercentage(job, skills); // Match % (0-100)
getSkillGap(job, skills); // Missing vs matched skills
calculateInterviewProbability(match, gap); // Interview chance %
getConfidenceLevel(percentage); // HIGH/MEDIUM/LOW
enrichJobWithAnalysis(job); // Add all analysis to job object
```

**Skill Database** (40+ skills):

```
frontend:  [React, Vue, Angular, TypeScript, JavaScript, CSS, HTML]
backend:   [Java, Spring Boot, Spring, Python, Django, Node.js, Express, Go, Rust]
databases: [MySQL, PostgreSQL, MongoDB, Redis, DynamoDB, Elasticsearch]
devops:    [Docker, Kubernetes, CI/CD, Jenkins, GitHub Actions, AWS, Azure, GCP]
tools:     [Git, Linux, REST API, GraphQL, Microservices]
```

### apiService.js

**Job Service**:

```javascript
getAllJobs(page, size); // GET /api/jobs/all
searchJobs(keyword, location, source); // GET /api/jobs/search
getJobsBySource(source, page, size); // GET /api/jobs/source/{source}
createJob(job); // POST /api/jobs/create
aggregateJobs(keyword, location); // POST /api/jobs/aggregate
```

**Application Service**:

```javascript
saveJob(jobId); // POST /api/applications/save
updateStatus(applicationId, status); // PUT /api/applications/update-status
getApplications(); // GET /api/applications/user
getUserApplications(); // GET /api/applications/user
```

---

## State Management Strategy

### Separation of Concerns

```
allJobs          ← All jobs from database (never changes after load)
jobs             ← Currently displayed jobs (can be all or search results)
searchResults    ← Last search results (for comparison)
isSearching      ← Boolean flag when search is active

Why separate?
- Prevents accidentally modifying all jobs
- Allows clearing search easily
- Better for performance (useMemo dependencies)
- Clear data flow
```

### Props Drilling Optimization

```
Dashboard (managed state)
├── Passes state to JobsTab
│   └── Passes specific props needed
├── Passes state to RecommendedTab
│   └── Uses local useMemo for calculations
└── Passes state to InsightsTab
    └── Uses local useMemo for analysis
```

**Why not Redux/Context?**

- Dashboard is only page that needs this state
- Props drilling is manageable with 5 tabs
- Context would add unnecessary complexity
- Performance is fine with useMemo optimization

---

## Search Logic (FIXED)

### Before (Broken)

```
1. searchJobs() → API call
2. Receives array of results
3. Sets jobs = results
4. applyFilters() runs (in useEffect)
5. applyFilters() filters by keyword again
6. Result: Sometimes 0 jobs shown ❌
```

### After (Fixed)

```
1. searchJobs() → API call
2. Receives array of results
3. Sets jobs = results directly (NO re-filtering)
4. Displays results immediately ✓
5. applyFilters() doesn't run because we're searching
6. Result: Correct jobs shown ✓

Code:
const handleSearch = async (keyword, location, source) => {
  const response = await jobService.searchJobs(keyword, location, source);
  const results = response.data.content || response.data;
  setSearchResults(results);
  setJobs(results);  // ← Direct assignment
}
```

---

## Styling Architecture

### CSS Files

```
global.css
├── Base styling (fonts, colors, spacing)
├── HTML/body defaults
├── Button, input styles
└── .app-shell (full-height, grid layout)

dashboard-layout.css
├── .dashboard-container (main grid)
├── Tab navigation styling (.tab-navigation, .tab-button)
├── .dashboard-content (main content area)
├── Alert styling
└── Responsive breakpoints

tabs.css
├── Common styles (.tab-header, .empty-state)
├── JobsTab (.jobs-tab, .search-section, .jobs-grid)
├── RecommendedTab (.recommended-tab, .recommendation-wrapper)
├── TrendingSkillsTab (.trending-skills-tab, .skill-bar-item)
├── ApplicationsTab (.applications-tab, .application-card)
├── InsightsTab (.insights-tab, .metric-card)
└── All responsive rules
```

### Color Scheme

```javascript
Primary: #4a63ff (Purple-blue) - Main actions, highlights
Secondary: #7d43ff (Purple) - Secondary, gradients
Success: #17b890 (Green) - High match, positive actions
Warning: #f59e0b (Amber) - Medium match, warnings
Danger: #d44f6f (Red) - Low match, rejections
Text: #101426 (Dark blue) - Main text
Soft text: #5d6785 (Gray) - Secondary text
Background: rgba(255,255,255,0.6-0.8) - Glass morphism
```

### Responsive Breakpoints

```
< 480px  → Mobile (single column, stacked tabs)
480-900px → Tablet (adjusted layout)
> 900px  → Desktop (full layout, all visible)
```

---

## API Contract

### Search Endpoint (NOW PROPERLY FIXED)

```
Request:
GET /api/jobs/search?keyword=react&location=mumbai&source=linkedin&page=0&size=50

Query Parameters:
  - keyword (optional): Job title/skills
  - location (optional): City/region
  - source (optional): Platform name
  - page (default: 0)
  - size (default: 50)

Response:
{
  "content": [
    {
      "id": 1,
      "title": "React Developer",
      "company": "Tech Corp",
      "location": "Mumbai",
      "description": "...",
      "source": "LinkedIn",
      "applyLink": "https://...",
      "postedTime": "2024-04-13",
      ...
    },
    ...
  ],
  "totalElements": 45,
  "totalPages": 1,
  "currentPage": 0
}

Frontend Processing:
1. Extract results from response.data.content
2. Display in JobCard components
3. NO additional filtering applied
```

---

## Performance Optimizations

### Memoization

```javascript
// Prevent unnecessary re-renders
const trendingSkills = useMemo(() => {
  // Complex calculation here
}, [jobs]); // Only recalculate when jobs change

// Prevent unnecessary function re-creation
const handleSearch = useCallback(() => {
  // Search logic
}, [jobService, dependencies]);
```

### Lazy Rendering

```javascript
{activeTab === "jobs" && <JobsTab ... />}       // Only renders when active
{activeTab === "recommended" && <RecommendedTab ... />}
// ...
```

### Component Splitting

- Each tab is a separate component
- Only active tab component runs
- Other tabs don't re-render

---

## Error Handling

### Frontend Error Handling

```javascript
// Try-catch blocks in all API calls
try {
  const response = await jobService.searchJobs(...);
  setJobs(results);
} catch (err) {
  console.error("Search failed:", err);
  setError("Search failed. Please try again.");
  setJobs([]);
}

// User sees error in alert banner
<div className="dashboard-alert error">
  {error}
  <button onClick={() => setError("")}>&times;</button>
</div>
```

### API Response Handling

```javascript
// Handle both paginated and non-paginated responses
const jobsList = response.data.content || response.data;

// Graceful degradation if application list is empty
const saved = new Set(
  response.data
    .map((app) => app.jobId || app.job?.id)
    .filter((id) => id !== null && id !== undefined),
);
```

---

## How to Extend

### Add a New Tab

```
1. Create new file: Frontend/src/components/tabs/NewTab.js
2. Import in Dashboard.js
3. Add to tab routes:
   {activeTab === "new" && <NewTab ... props />}
4. Add button to tab navigation:
   <button onClick={() => setActiveTab("new")}>New Tab</button>
5. Create CSS in tabs.css (.new-tab class)
```

### Add New API Endpoint

```
1. Create endpoint in backend (Spring Controller)
2. Add method to apiService.js:
   const newService = {
     myNewEndpoint: (...params) => axiosInstance.get("/api/new", {...})
   };
3. Use in Dashboard or Tab component:
   const response = await newService.myNewEndpoint();
4. Handle response and update state
```

### Add New AI Feature

```
1. Add function to jobMatchingService.js
2. Export the function
3. Use in relevant tab component (likely InsightsTab):
   const analysis = useMemo(() => myNewFunction(data), [data]);
4. Render results in JSX
```

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Each tab loads and renders
- [ ] Search returns correct results
- [ ] Save button works
- [ ] Status update works
- [ ] API errors handled gracefully
- [ ] Mobile responsive at 480px
- [ ] No console errors

### API Testing

```bash
# Test search endpoint
curl "http://localhost:8080/api/jobs/search?keyword=java&location=mumbai"

# Test get all
curl "http://localhost:8080/api/jobs/all"

# Test applications
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/applications/user"
```

---

## Debugging Tips

### 1. Check Console

```
F12 → Console Tab
- Look for JavaScript errors
- Check network requests
```

### 2. Check Network Tab

```
F12 → Network Tab
- Verify API calls are being made
- Check response status (200, 400, 500, etc.)
- Inspect response data
```

### 3. Check Local Storage

```
F12 → Application → LocalStorage
- See stored token
- See search history
- See user profile
```

### 4. React DevTools

```
F12 → Components Tab (if installed)
- See component tree
- Inspect props and state
- Watch re-renders
```

---

## Production Deployment

### Build for Production

```bash
cd Frontend
npm run build
# Creates optimized build in build/ directory
```

### Environment Variables

```
REACT_APP_API_BASE_URL=https://yourdomain.com/api
REACT_APP_OAUTH_REDIRECT=https://yourdomain.com/auth/callback
```

### Backend Configuration

```
server.port=8080
spring.datasource.url=jdbc:mysql://yourhost:3306/jobportal
spring.jpa.hibernate.ddl-auto=validate
```

---

## Version History

### v2.0 (Current - Tab-Based Dashboard)

- ✅ Complete UI rewrite with 5-tab system
- ✅ Fixed search functionality
- ✅ Full-width responsive layout
- ✅ AI insights dashboard
- ✅ Application tracking
- ✅ Trending skills analysis

### v1.0 (Previous - Single Page)

- Job listing page
- Basic search (broken)
- Narrow container layout
- No tabs, no tracking

---

## Support & Maintenance

### Common Issues & Solutions

See: [DASHBOARD_UPGRADE_GUIDE.md](DASHBOARD_UPGRADE_GUIDE.md) - Section "If Issues Occur"

### Documentation

- [DASHBOARD_UPGRADE_GUIDE.md](DASHBOARD_UPGRADE_GUIDE.md) - Complete feature guide
- [DASHBOARD_QUICK_START.md](DASHBOARD_QUICK_START.md) - User quick start
- This file - Technical architecture

---

**Happy coding!** 🚀
