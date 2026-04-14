# ✅ Complete Verification Checklist

Use this checklist to verify that your new tab-based dashboard is working correctly.

---

## 🔴 Pre-Flight Checks

### Backend Status

- [ ] Backend running: `./mvnw spring-boot:run`
- [ ] No errors in backend console
- [ ] Can access: http://localhost:8080/api/jobs/all
- [ ] Response shows job data (not 401/403/500)

### Frontend Status

- [ ] Frontend running: `npm start`
- [ ] No errors in browser console (F12 → Console)
- [ ] Can access: http://localhost:3000
- [ ] Redirected to /login page

### Network & APIs

- [ ] Network connectivity working
- [ ] localhost:8080 (backend) accessible
- [ ] localhost:3000 (frontend) accessible
- [ ] No CORS or connection errors

---

## 🔒 Authentication

### Login Flow

- [ ] Can login with valid credentials
- [ ] Redirected to /jobs (Jobs tab) after login
- [ ] Token stored in localStorage
- [ ] Can logout (if logout button exists)

### Protected Routes

- [ ] Cannot access /jobs without login
- [ ] Cannot access /applications without login
- [ ] Redirects to /login when accessing protected route

---

## 💼 Jobs Tab Verification

### Tab Navigation

- [ ] Jobs tab button visible (💼 icon)
- [ ] Jobs tab is active by default
- [ ] Can click other tabs and return
- [ ] Tab styling changes when active

### Search Functionality

```
Test Case 1: Search by Keyword
┌─────────────────────────────────────┐
│ Enter: "React"                      │
│ Expected: Jobs with React in title  │
│ Result: ✅ / ❌                    │
└─────────────────────────────────────┘

Test Case 2: Search by Location
┌─────────────────────────────────────┐
│ Enter: "Mumbai"                     │
│ Expected: Jobs in Mumbai            │
│ Result: ✅ / ❌                    │
└─────────────────────────────────────┘

Test Case 3: Search by Platform
┌─────────────────────────────────────┐
│ Select: "LinkedIn"                  │
│ Expected: Only LinkedIn jobs        │
│ Result: ✅ / ❌                    │
└─────────────────────────────────────┘

Test Case 4: Combined Search
┌─────────────────────────────────────┐
│ Keyword: "Java"                     │
│ Location: "Remote"                  │
│ Platform: "LinkedIn"                │
│ Expected: Remote Java jobs from LI  │
│ Result: ✅ / ❌                    │
└─────────────────────────────────────┘

Test Case 5: Empty Search
┌─────────────────────────────────────┐
│ All fields empty                    │
│ Expected: Show all jobs             │
│ Result: ✅ / ❌                    │
└─────────────────────────────────────┘
```

### Job Cards Display

- [ ] Job title displays correctly
- [ ] Company name shows
- [ ] Location displays with pin icon (📍)
- [ ] Source/platform badge shows
- [ ] Description visible
- [ ] AI matching section shows:
  - [ ] Match percentage (colored)
  - [ ] Interview probability percentage
  - [ ] Confidence badge (HIGH/MEDIUM/LOW)
- [ ] Skill tags display:
  - [ ] Missing skills (red)
  - [ ] Your skills (green with checkmark)
- [ ] Apply button clickable
- [ ] Save button clickable

### Search Controls

- [ ] Keyword input editable
- [ ] Location input editable
- [ ] Platform dropdown expandable
- [ ] Search button works (disabled while searching)
- [ ] Clear button clears all inputs
- [ ] Enter key triggers search
- [ ] Loading spinner shows during search

### Search Results

- [ ] Correct jobs displayed
- [ ] Job count updates (shows X jobs found)
- [ ] "No jobs found" message appears if empty
- [ ] Can clear search and see all jobs again

---

## ⭐ Recommended Tab Verification

### Tab Navigation

- [ ] Recommended tab button visible (⭐ icon)
- [ ] Can click to switch to this tab
- [ ] Content updates correctly

### Initial State

- [ ] Empty state message shown ("No saved jobs" or similar)
- [ ] No crash or errors

### After Saving Jobs

1. Save 3+ jobs in Jobs tab
2. Return to Recommended tab

- [ ] Now shows recommendations
- [ ] Shows up to 12 recommendations
- [ ] Each recommendation has:
  - [ ] Badge with icon (🏢/📍/⭐/✨)
  - [ ] Badge with reason text
  - [ ] Job card below badge
  - [ ] All job card elements visible (title, company, location, save, apply)

### Recommendation Logic

- [ ] Recommendations based on saved jobs
- [ ] Companies with saved jobs marked (🏢)
- [ ] Locations with saved jobs marked (📍)
- [ ] Platforms with saved jobs marked (⭐)

---

## 📈 Trending Skills Tab Verification

### Tab Navigation

- [ ] Trending Skills tab button visible (📈 icon)
- [ ] Can click to switch to this tab

### Skill Data Display

- [ ] Top 12 skills shown with bars
- [ ] Each skill shows:
  - [ ] Skill name
  - [ ] Frequency bar (colored)
  - [ ] Number of jobs (count)
  - [ ] Percentage of total jobs
- [ ] Skills sorted by frequency (highest first)

### Category Section

- [ ] Category cards visible (Frontend, Backend, etc.)
- [ ] Each category shows up to 8 skills
- [ ] Skill tags display correctly
- [ ] Tag count shows in badge

### Market Insights

- [ ] Shows total skills identified
- [ ] Shows most in-demand skill name
- [ ] Shows average jobs per skill
- [ ] Shows top skill frequency %

### Mobile View

- [ ] Skills stack vertically
- [ ] Bars are readable
- [ ] All content visible without horizontal scroll

---

## 📂 Applications Tab Verification

### Tab Navigation

- [ ] Applications tab button visible (📂 icon)
- [ ] Can click to switch to this tab

### Summary Cards (Top)

- [ ] Shows 5 cards: Saved, Applied, Interview, Offer, Rejected
- [ ] Each card shows:
  - [ ] Status icon (emoji)
  - [ ] Status label
  - [ ] Counter of applications in that status
- [ ] Cards update when status changes

### Application Cards Sections

- [ ] Each status has its own section (if any applications)
- [ ] Section header shows status + count
- [ ] Each application card shows:
  - [ ] Job title
  - [ ] Company name
  - [ ] Location (📍)
  - [ ] Source platform
  - [ ] Applied date (if available)
  - [ ] Status dropdown
  - [ ] "View Job" link (if available)

### Status Management

```
Test Case: Change Status
┌──────────────────────────────────┐
│ 1. Start with job in "Saved"     │
│ 2. Open dropdown                 │
│ 3. Select "Applied"              │
│ 4. Observe:                       │
│    - Job moves to Applied section │
│    - Card updates immediately    │
│    - Summary card counter updates│
│ Result: ✅ / ❌                 │
└──────────────────────────────────┘
```

### Status Flow

- [ ] Can change from Saved → Applied
- [ ] Can change to Interview
- [ ] Can change to Offer
- [ ] Can change to Rejected
- [ ] Can change back (if allowed)

---

## 🧠 Insights Tab Verification

### Tab Navigation

- [ ] Insights tab button visible (🧠 icon)
- [ ] Can click to switch to this tab

### Average Metrics

- [ ] Shows "Average Match %"
- [ ] Shows "Average Interview Chance"
- [ ] Both are reasonable numbers (0-100%)

### Match Distribution

- [ ] Shows three distribution bars (High/Medium/Low)
- [ ] Each bar labeled correctly
- [ ] Shows count of jobs in each category
- [ ] Bars are different colors (Green/Amber/Red)
- [ ] Bars proportional to counts

### Top Matches (Your Best Matches)

- [ ] Shows up to 5 jobs
- [ ] Each job shows:
  - [ ] Rank (#1, #2, etc.)
  - [ ] Job title
  - [ ] Company name
  - [ ] Location
  - [ ] Match percentage (colored)
- [ ] Sorted by match % (highest first)

### Best Opportunities

- [ ] Shows up to 5 jobs
- [ ] Each job shows:
  - [ ] Job title
  - [ ] Company name
  - [ ] Match score box
  - [ ] Interview probability box
  - [ ] Your Skills section (green tags with ✓)
  - [ ] Learn section (red tags)
- [ ] Sorted by interview probability (highest first)

### Data Accuracy

- [ ] Match % makes sense (more matches = higher %)
- [ ] Interview % is reasonable
- [ ] Skill display matches job description
- [ ] Top matches align with your profile

---

## 🎨 UI/UX Verification

### Layout

- [ ] Full-width layout (not narrow/constrained)
- [ ] Proper spacing between elements
- [ ] Content centered properly
- [ ] No content cut off or hidden
- [ ] Consistent padding/margins

### Typography

- [ ] Headings are large and readable (18px+)
- [ ] Body text is clear (1rem)
- [ ] Labels are visible and bold
- [ ] Hover text is legible

### Colors & Styling

- [ ] Tab buttons change color when active
- [ ] Buttons have hover effects
- [ ] Cards have subtle shadows/borders
- [ ] Color scheme consistent:
  - [ ] Blue for primary actions
  - [ ] Green for high/positive
  - [ ] Amber for medium/warning
  - [ ] Red for low/negative
- [ ] Text contrast is good (readable)

### Buttons & Interactions

- [ ] Buttons have hover effects
- [ ] Buttons change appearance when disabled
- [ ] Clickable areas are large enough
- [ ] Feedback is provided (loading spinner)
- [ ] Success/error messages show

### Responsive Design

#### Desktop (1400px+)

- [ ] All content visible
- [ ] No horizontal scrolling needed
- [ ] Optimal spacing
- [ ] Tabs show icons + labels
- [ ] Multiple columns where appropriate

#### Tablet (900px)

- [ ] Content still readable
- [ ] Spacing adjusted appropriately
- [ ] Tab labels hidden (icons only)
- [ ] Single column for most content
- [ ] No horizontal scrolling

#### Mobile (480px)

- [ ] Fully functional
- [ ] Single column layout
- [ ] Buttons large enough to tap
- [ ] Text readable
- [ ] No horizontal scrolling
- [ ] Tabs stack or scroll horizontally

---

## 🔌 API Integration

### GET /api/jobs/all

```bash
curl http://localhost:8080/api/jobs/all
```

- [ ] Returns 200 status
- [ ] Response contains "content" array or array directly
- [ ] Each job has: id, title, company, location, source, description
- [ ] Jobs display correctly in Jobs tab

### GET /api/jobs/search

```bash
curl "http://localhost:8080/api/jobs/search?keyword=java&location=mumbai"
```

- [ ] Returns 200 status
- [ ] Filters by keyword correctly
- [ ] Filters by location correctly
- [ ] Returns matching jobs only
- [ ] Frontend displays results

### POST /api/applications/save

- [ ] Save button initiates POST request
- [ ] Request includes jobId
- [ ] Returns 200 status on success
- [ ] Status changes to "Saved ✓"
- [ ] Job appears in Applications tab

### GET /api/applications/user

- [ ] Returns list of saved applications
- [ ] Each app has: id, jobId, status
- [ ] Shows in Applications tab
- [ ] Summary counts are correct

### PUT /api/applications/update-status

- [ ] Status dropdown triggers PUT
- [ ] Request includes applicationId and new status
- [ ] Returns 200 on success
- [ ] Application moves to new section
- [ ] Summary card count updates

---

## 📊 Data Flow

### Initial Load

- [ ] Jobs load automatically
- [ ] Saved applications load automatically
- [ ] Sources/platforms list populates
- [ ] No loading delays (< 2 seconds)

### Search Flow

- [ ] Keyword/location entered
- [ ] Search button clicked
- [ ] Loading spinner shows
- [ ] API called
- [ ] Results appear
- [ ] Jobs grid updates

### Save Job Flow

- [ ] Click Save button
- [ ] Button shows "Saved ✓"
- [ ] Applications tab receives update
- [ ] Recommended tab updates
- [ ] Summary card in Applications increments

---

## 🐛 Error Handling

### No Jobs Found

- [ ] Empty state displays: "🔍 No Jobs Found"
- [ ] Message is clear
- [ ] Suggests adjusting search criteria
- [ ] "Show All Jobs" button available

### API Errors

- [ ] 500 error shows error banner
- [ ] 401/403 redirects to login
- [ ] Network error shows message
- [ ] User can retry
- [ ] No app crash

### Invalid Input

- [ ] Empty search shows all jobs
- [ ] Special characters handled
- [ ] Very long inputs don't break layout
- [ ] Numbers/symbols processed correctly

---

## 📱 Mobile Testing

### Portrait Orientation (480px)

- [ ] All tabs accessible
- [ ] Tabs scroll horizontally if needed
- [ ] Content readable without zoom
- [ ] Touch targets are ≥44px
- [ ] No horizontal scroll on main content

### Landscape Orientation (640px)

- [ ] Layout adjusts appropriately
- [ ] Content still visible
- [ ] Buttons still clickable

---

## 🎊 Final Acceptance Criteria

### ✅ All Pass = System Ready!

- [ ] Search functionality works correctly
- [ ] All 5 tabs load and display data
- [ ] UI is full-width and modern
- [ ] Responsive at all breakpoints
- [ ] No console errors
- [ ] No API errors
- [ ] All buttons clickable
- [ ] Data updates correctly
- [ ] Error handling works
- [ ] Performance acceptable
- [ ] Mobile friendly
- [ ] No breaking changes to existing features

### Score: \_\_\_ / 48 Items

**Acceptable**: 45+ items passing ✅  
**Good**: 46+ items passing ✅✅  
**Excellent**: All 48 items passing ✅✅✅

---

## 🎯 Test Results Summary

```
Date: _______________
Tester: _______________
Environment: Desktop / Tablet / Mobile (Circle one)
Browser: _______________
Backend: ✅ Running / ❌ Not running
Frontend: ✅ Running / ❌ Not running

Overall Status: ✅ PASS / ⚠️ ISSUES / ❌ FAIL

Issues Found:
1. ___________________________
2. ___________________________
3. ___________________________

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 📞 Troubleshooting During Testing

If any checks fail, reference this:

| Issue              | Checklist                                           |
| ------------------ | --------------------------------------------------- |
| Search not working | Backend running? API returns data? JSON valid?      |
| Tabs not showing   | CSS loaded? Import correct? Component mounted?      |
| Styling off        | Hard refresh (Ctrl+Shift+R)? CSS file loaded?       |
| Mobile broken      | Responsive CSS applied? Breakpoints correct?        |
| Save not working   | Api endpoint exists? Token valid? Response 200?     |
| No data showing    | API returns data? State updated? Components render? |

---

**Status**: Ready to verify! 🚀

Print this PDF and check off items as you test. Aim for 100% pass rate!
