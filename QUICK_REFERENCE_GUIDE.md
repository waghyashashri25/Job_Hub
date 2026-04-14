# 🔧 Quick Reference & Testing Guide

## Setup Checklist

### Before First Run:

```
☐ Backend pom.xml has all dependencies
☐ Frontend has axios installed
☐ Database migrations applied (users table has 3 new columns)
☐ .env variables set (if any)
☐ JWT_SECRET configured in backend
☐ CORS enabled for frontend URL
```

### Start Services:

```bash
# Terminal 1: Backend
cd Backend && ./mvnw spring-boot:run

# Terminal 2: Frontend
cd Frontend && npm start

# Both running?
# ✓ Backend: http://localhost:8080/api/jobs/all
# ✓ Frontend: http://localhost:3000
# ✓ Can login with test credentials
```

---

## Test Scenarios

### Scenario 1: Search Functionality

| Step | Action                      | Expected                  | Status |
| ---- | --------------------------- | ------------------------- | ------ |
| 1    | Navigate to Jobs tab        | Search inputs visible     | ✓      |
| 2    | Enter "Java" in keyword     | Input shows "Java"        | ✓      |
| 3    | Click Search                | API called, jobs filtered | ✓      |
| 4    | Result shows "X jobs found" | Count displayed           | ✓      |
| 5    | Try search with location    | "Remote" + keyword        | ✓      |
| 6    | Try platform filter         | LinkedIn filter works     | ✓      |
| 7    | Clear filters               | All jobs show again       | ✓      |

### Scenario 2: Skill-Based Matching

| Step | Action                      | Expected                | Status |
| ---- | --------------------------- | ----------------------- | ------ |
| 1    | Click Skills (⚙️) button    | Skills modal opens      | ✓      |
| 2    | Enter skills: "Java, React" | Skills display in input | ✓      |
| 3    | Click Save Skills           | Success message shows   | ✓      |
| 4    | Go to Jobs tab              | Job cards shown         | ✓      |
| 5    | Check match % on card       | Shows realistic value   | ✓      |
| 6    | Match % = 50%+              | Cards have green badge  | ✓      |
| 7    | Match % < 50%               | Cards have red badge    | ✓      |
| 8    | Skill gap shows correctly   | "You need: X, Y"        | ✓      |

### Scenario 3: Job Card Interactions

| Step | Action                    | Expected               | Status |
| ---- | ------------------------- | ---------------------- | ------ |
| 1    | Find job with description | Description visible    | ✓      |
| 2    | Description > 150 chars   | View More button       | ✓      |
| 3    | Click View More           | Full description       | ✓      |
| 4    | Click View Less           | Collapsed again        | ✓      |
| 5    | Click "Apply Now"         | Link opens in new tab  | ✓      |
| 6    | Click "Save" button       | Button shows "✓ Saved" | ✓      |
| 7    | Go to Applications tab    | Job appears there      | ✓      |

### Scenario 4: Application Tracking

| Step | Action                   | Expected                                     | Status |
| ---- | ------------------------ | -------------------------------------------- | ------ |
| 1    | Go to Applications tab   | Summary cards visible                        | ✓      |
| 2    | Check "Saved" count      | Matches saved jobs                           | ✓      |
| 3    | Click status dropdown    | Options: Applied, Interview, Offer, Rejected | ✓      |
| 4    | Change to "Applied"      | Job moves to Applied section                 | ✓      |
| 5    | Check Applications count | Incremented                                  | ✓      |
| 6    | Change status again      | Job moves correctly                          | ✓      |

---

## API Testing (cURL)

### Test 1: Login & Get Token

```bash
curl -X POST http://localhost:8080/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Copy token from response
export TOKEN="<your_jwt_token>"
```

### Test 2: Get User Profile

```bash
curl -X GET http://localhost:8080/api/users/profile \
  -H "Authorization: Bearer $TOKEN"

# Expect: { id, name, email, skills, jobTitle, experience, role }
```

### Test 3: Update Skills

```bash
curl -X PUT http://localhost:8080/api/users/profile/skills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skills": "Java, Spring Boot, React, MySQL",
    "jobTitle": "Full Stack Developer",
    "experience": 3
  }'

# Expect: 200 OK with updated user object
```

### Test 4: Get Skills Array

```bash
curl -X GET http://localhost:8080/api/users/profile/skills \
  -H "Authorization: Bearer $TOKEN"

# Expect: { skills: ["Java", "Spring Boot", ...], jobTitle, experience }
```

### Test 5: Search Jobs

```bash
# With keyword only
curl "http://localhost:8080/api/jobs/search?keyword=React" \
  -H "Authorization: Bearer $TOKEN"

# With keyword + location
curl "http://localhost:8080/api/jobs/search?keyword=React&location=Remote" \
  -H "Authorization: Bearer $TOKEN"

# With all filters
curl "http://localhost:8080/api/jobs/search?keyword=React&location=Remote&source=LinkedIn" \
  -H "Authorization: Bearer $TOKEN"

# Expect: Paginated job results
```

---

## Browser DevTools Testing

### Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Perform action (search, save, etc.)
4. Check requests:
   - ✓ API call shows 200/201 status
   - ✓ No 401/403 errors (auth working)
   - ✓ Response has expected data
   - ✓ Request Headers include Authorization

### Console Tab

```javascript
// Check if components loaded
console.log(window.location);

// Check Redux state or component state (if debugging)
// Should see no ERROR messages

// Test API call directly:
fetch("http://localhost:8080/api/jobs/all")
  .then((r) => r.json())
  .then((d) => console.log("Jobs:", d));
```

### Application Tab

```
✓ LocalStorage shows JWT token
✓ Cookies include session (if set)
✓ Check CORS headers
```

---

## Common Issues & Fixes

### Issue: "Failed to fetch skills"

```
Problem: 401 error when getting user skills
Fix:
1. Check if logged in: Check localStorage for 'token'
2. Verify token: Try login again
3. Check backend: curl http://localhost:8080/api/users/profile -H "..."
4. If 401: JWT token expired or invalid
```

### Issue: "Search returns no results"

```
Problem: Search works but shows nothing
Fix:
1. Check if jobs exist: Visit /jobs/all first
2. Check search params: Open DevTools → Network
3. Try exact keyword: Simple term like "developer"
4. Check job descriptions in database
5. Verify search endpoint is working: curl http://localhost:8080/api/jobs/search?keyword=java
```

### Issue: "Match % shows 0%"

```
Problem: All jobs show 0% match
Fix:
1. User has no skills: Add skills in Skills modal
2. Job has no keywords: Check job description
3. Skills not saved: Verify backend update worked
4. Check console for errors: F12 → Console tab
5. Verify enrichJobWithAnalysis receiving userSkills
```

### Issue: "Save job fails"

```
Problem: Click Save but shows error
Fix:
1. Check if logged in
2. Verify ApplicationController has /save endpoint
3. Check if applicationService.saveJob exists
4. Look at network tab for error response
5. Check backend logs for exceptions
```

### Issue: "Skills modal doesn't open"

```
Problem: ⚙️ button doesn't show skills input
Fix:
1. Check if showSkillsInput state updates
2. Verify SkillsInput component imported in Dashboard
3. Check CSS: .skills-modal-overlay visible?
4. Open console for errors
5. Try clicking button multiple times
```

---

## Database Queries

### Check if user has skills

```sql
SELECT id, name, email, skills, job_title, experience FROM users WHERE email = 'test@example.com';
```

### Update user skills directly (if needed)

```sql
UPDATE users SET skills = 'Java, React' WHERE email = 'test@example.com';
```

### Check job count

```sql
SELECT COUNT(*) FROM jobs;
SELECT COUNT(*) FROM jobs WHERE LOWER(title) LIKE LOWER('%react%');
```

### Check saved jobs (applications)

```sql
SELECT * FROM applications WHERE user_id = 1;
```

---

## Performance Metrics

### What Should Be Fast:

- **Load all jobs**: < 1 second (50 jobs)
- **Search jobs**: < 500ms (with keyword + location)
- **Save job**: < 300ms
- **Update status**: < 300ms
- **Update skills**: < 500ms
- **Job card render**: Instant (with userSkills)

### Debug Performance:

```javascript
// In browser console:
console.time("search");
// ... perform search ...
console.timeEnd("search");

// Check React DevTools:
// Chrome Extension → React DevTools → Profile tab
```

---

## Production Checklist

Before deploying:

### Backend

- [ ] Build successful: `./mvnw clean package`
- [ ] Tests pass (if any)
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] JWT secret configured
- [ ] CORS configured for frontend domain
- [ ] Error logging enabled
- [ ] Secrets not in code

### Frontend

- [ ] Build successful: `npm run build`
- [ ] No console errors
- [ ] API_URL points to production backend
- [ ] All images/fonts load
- [ ] Responsive on mobile
- [ ] Tests pass (if any)

### Infrastructure

- [ ] HTTPS enabled
- [ ] Database backed up
- [ ] Monitoring set up
- [ ] Error tracking enabled
- [ ] Rate limiting configured
- [ ] File upload limits set

---

## Rollback Plan

If something breaks in production:

### Option 1: Quick Revert

```bash
# Frontend rollback (previous build)
git checkout HEAD~1 Frontend/
npm run build
# Redeploy

# Backend rollback (previous JAR)
# Restore from backup and restart
```

### Option 2: Reset Database

```bash
# If data corrupted:
mysql> TRUNCATE TABLE applications;
mysql> TRUNCATE TABLE jobs;

# Then reload from backup
```

### Option 3: Feature Flag

```javascript
// In code: Disable skills feature if issues
const FEATURES = {
  skillMatching: false, // Disable
  search: true,
  applications: true,
};
```

---

## Monitoring & Logging

### What to Monitor:

```
✓ Backend health: /health endpoint (add if needed)
✓ API response times
✓ Database connection pool
✓ Error rate
✓ Login failures
✓ Search query patterns
```

### Add Logging:

```javascript
// Frontend:
console.info('User skills updated:', newSkills);
console.warn('Search took longer than expected');
console.error('Failed to save job:', err);

// Backend (add this if needed):
@Slf4j
logger.info("Searching jobs: keyword={}, location={}", keyword, location);
logger.warn("Slow search detected: duration={}ms", duration);
logger.error("Search failed", exception);
```

---

## Testing Tools

### Postman Collection (Create This)

```
Login
├── POST /api/users/login
│   Body: { email, password }
│   Response: JWT token
│
Get Profile
├── GET /api/users/profile
│   Headers: Authorization: Bearer {token}
│
Update Skills
├── PUT /api/users/profile/skills
│   Headers: Authorization: Bearer {token}
│   Body: { skills, jobTitle, experience }
│
Search Jobs
├── GET /api/jobs/search
│   Query: ?keyword=React&location=Remote
│   Headers: Authorization: Bearer {token}
│
Save Job
├── POST /api/applications/save
│   Body: { jobId: 1 }
│   Headers: Authorization: Bearer {token}
```

### Load Testing

```bash
# Using Apache Bench (ab):
ab -n 1000 -c 10 "http://localhost:8080/api/jobs/all"

# Using wrk:
wrk -t4 -c100 -d30s http://localhost:8080/api/jobs/all
```

---

## Final Verification

Before declaring complete:

```
✓ Backend starts without errors
✓ Frontend loads at http://localhost:3000
✓ Can login with test account
✓ Can search jobs (returns results)
✓ Can add skills and see real matching
✓ Match % changes based on user skills
✓ Can save jobs and track applications
✓ Can change job status
✓ All tabs work (Jobs, Recommended, Trending, Applications, Insights)
✓ Job descriptions expand/collapse
✓ Buttons have hover effects
✓ Mobile responsive (resize browser to 480px)
✓ No console errors
✓ No network errors (all 200 status)
✓ Database queries execute < 500ms
✓ Page loads in < 3 seconds
✓ Skill matching shows realistic values (not all 0% or 100%)
✓ Can logout and login again
✓ Saved state persists after page reload
```

**If all ✓**: System is ready for production! 🎉
