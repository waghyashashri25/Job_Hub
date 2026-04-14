# Integration & Setup Guide

## Quick Start After Upgrade

### 1. Frontend Dependencies

All new components use only existing dependencies. No additional npm packages needed.

### 2. Important Configuration

#### Default User Profile (jobMatchingService.js)

Currently uses default skills. To customize:

```javascript
// In src/services/jobMatchingService.js - getUserProfile()
// Edit the default profile:
{
  skills: [
    "React", "JavaScript", "Java", "Spring Boot", "MySQL", "Git", "Docker"
  ],
  jobTitle: "Full Stack Developer",
  experience: 3,
}
```

Or programmatically set via:

```javascript
import { saveUserProfile } from "./services/jobMatchingService";

saveUserProfile({
  skills: ["React", "Node.js", "AWS", "TypeScript"],
  jobTitle: "Senior Developer",
  experience: 5,
});
```

#### Backend Environment Variables

Ensure OAuth credentials are set:

```properties
# application.properties
oauth.google.client-id=YOUR_GOOGLE_CLIENT_ID
oauth.google.redirect-uri=http://localhost:3000/auth/google/callback

oauth.github.client-id=YOUR_GITHUB_CLIENT_ID
oauth.github.redirect-uri=http://localhost:3000/auth/github/callback
```

### 3. Testing the Upgrade

#### Test Scenario 1: Job Matching

1. Go to `/jobs` page
2. View a job card
3. Should see:
   - Match percentage (e.g., "85% Match")
   - Interview probability (e.g., "62%")
   - Confidence badge (HIGH/MEDIUM/LOW)
   - Missing skills section
   - Your matched skills section

#### Test Scenario 2: Search History

1. Search for "React Developer" in "San Francisco"
2. Perform another search
3. Click "Show" in search history
4. Should see previous searches
5. Click a previous search to restore it

#### Test Scenario 3: Trending Skills

1. Go to `/jobs` page after loading jobs
2. Scroll down to see "Trending Skills 📈" section
3. Should see:
   - Top 12 skills from current jobs
   - Skill bars with counts and percentages
   - Color-coded bars

#### Test Scenario 4: Recommendations

1. Save a few jobs by clicking "Save"
2. Scroll to "Recommended for You 💡" section
3. Should see 3 recommendations based on saved jobs
4. Each should have a badge explaining why it's recommended

#### Test Scenario 5: OAuth (Requires Setup)

1. Click "Sign in with Google" or "Sign in with GitHub"
2. Should redirect to provider
3. After login, should redirect to `/auth/google/callback` or `/auth/github/callback`
4. Should extract token and redirect to `/jobs`

### 4. Deploy Checklist

- [ ] Test all components on localhost
- [ ] Verify job matching logic with sample data
- [ ] Test search history persistence
- [ ] Configure OAuth credentials (optional)
- [ ] Test responsive design on mobile
- [ ] Verify all API endpoints return correct data
- [ ] Check console for any JavaScript errors
- [ ] Test save/apply functionality
- [ ] Verify localStorage is working
- [ ] Test error handling and loading states

### 5. Customization Points

#### Modify Skill Categories

File: `src/services/jobMatchingService.js`

```javascript
const technicalSkills = {
  frontend: ['React', 'Vue', 'Angular', ...], // Add more
  backend: [...],
  databases: [...],
  devops: [...],
  tools: [...]
};
```

#### Change Trending Skills Count

File: `src/components/TrendingSkills.js`

```javascript
.slice(0, 12); // Change 12 to show more/fewer skills
```

#### Adjust Match Percentage Calculation

File: `src/services/jobMatchingService.js`

```javascript
calculateInterviewProbability(matchPercentage, skillGap) {
  // Modify weights here
  let probability = matchPercentage * 0.6; // Change 0.6
  const coverageBonus = coverage * 40; // Change 40
  ...
}
```

#### Change Recommendation Count

File: `src/components/RecommendedJobs.js`

```javascript
.slice(0, 3); // Change to show more/fewer recommendations
```

### 6. Component Integration Points

#### JobCard Component

**Usage:**

```jsx
<JobCard
  job={jobObject}
  isSaved={boolean}
  onSave={(jobId) => {...}}
  onApply={(applyLink) => {...}}
/>
```

**Now includes AI analysis:**

- Match percentage
- Interview probability
- Skill gap analysis
- Confidence level

#### TrendingSkills Component

**Usage:**

```jsx
<TrendingSkills jobs={jobsArray} />
```

**Returns:** Top 12 skills with visualization

#### SearchHistory Component

**Usage:**

```jsx
<SearchHistory onSelectSearch={(keyword, location) => {...}} />
```

**Features:**

- Auto-saves searches
- Shows last 5
- Click to restore

#### RecommendedJobs Component

**Usage:**

```jsx
<RecommendedJobs jobs={jobsArray} savedJobIds={setOfIds} />
```

**Returns:** Top 3 recommendations with reasons

### 7. API Integration

Current endpoints used (no changes needed):

```
GET  /api/jobs/all             - Fetch all jobs
GET  /api/jobs/search          - Search jobs
POST /api/applications/save    - Save job
GET  /api/applications         - Get user's applications
GET  /api/oauth/google         - Google OAuth redirect
GET  /api/oauth/github         - GitHub OAuth redirect
GET  /api/oauth/google/callback  - Google callback
GET  /api/oauth/github/callback  - GitHub callback
```

### 8. Performance Tips

1. **Caching**: Job matching is memoized with `useMemo`
2. **localStorage**: Search history uses browser storage (persistent)
3. **Lazy Loading**: Dashboard components only render if jobs exist
4. **Responsive**: No unused CSS loads on mobile

### 9. Troubleshooting

**Issue: "No jobs found" after search**

- Check API is returning jobs
- Verify filters aren't too strict
- Check browser console for API errors

**Issue: Match percentage always same**

- Verify job descriptions contain technical skills
- Check user profile has skills set
- See getSkillsFromJob() is finding keywords

**Issue: OAuth redirect not working**

- Verify OAuth credentials in properties file
- Check redirect URIs match frontend paths
- Test with correct frontend URL in browser

**Issue: Search history not persisting**

- Verify localStorage is enabled
- Check no private/incognito mode
- Verify search term isn't empty

**Issue: Trending skills not showing**

- Ensure jobs are loaded from API
- Check jobs have descriptions
- Verify skill extraction is finding matches

### 10. Support & Documentation

For detailed feature documentation, see: `UPGRADE_SUMMARY.md`

For AI matching algorithm details, see: `src/services/jobMatchingService.js`

For component-specific styling, see respective CSS files:

- `src/styles/jobcard.css` - Job card styling
- `src/styles/dashboard.css` - Dashboard components
- `src/styles/jobs.css` - Jobs page layout
- `src/styles/auth.css` - Auth pages
- `src/styles/global.css` - Global styles

---

**Last Updated:** 2024  
**Version:** 2.0 - Upgraded Platform
