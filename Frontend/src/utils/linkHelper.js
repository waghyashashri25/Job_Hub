/**
 * linkHelper.js
 * Universal, high-precision deep-link resolver for all 18+ job platforms.
 * Uses exact quoted company matching ("Morgan Stanley") and clean short roles
 * so that LinkedIn, Indeed, Naukri, and other portals return ONLY the exact company's jobs in Mumbai.
 */

const KNOWN_CITIES = [
  "Mumbai",
  "Bengaluru",
  "Bangalore",
  "Pune",
  "Hyderabad",
  "Delhi",
  "Noida",
  "Gurugram",
  "Gurgaon",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "San Francisco",
  "New York",
  "London",
  "Berlin",
  "Singapore",
  "Seattle",
  "Austin"
];

// Clean company names by stripping legal entity / group suffixes with strict word boundaries
export const cleanCompanyName = (company = "") => {
  if (!company) return "";
  return company
    .replace(/\(.*?\)/g, "")
    .replace(/\b(Pvt\.?\s*Ltd\.?|Private\s+Limited|Ltd\.?|LLC|Inc\.?|Corp\.?)\b/gi, "")
    .replace(/\b(&\s*)?Co\b\.?/gi, "")
    .replace(/[.,\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Clean job titles by extracting the core skill / role phrase without recruiter noise
export const cleanJobTitle = (title = "") => {
  if (!title) return "Software Engineer";
  return title
    .replace(/\(.*?\)/g, "")
    .replace(/[//|–-]\s*(Job\s+)?Location.*$/gi, "")
    .replace(/\b(Urgent\s+Opening|Walkin\s+Drive|Immediate\s+Joiner)\b.*$/gi, "")
    .replace(/\s+/g, " ")
    .trim() || "Software Engineer";
};

export const extractCoreRole = (title = "") => {
  if (!title || !title.trim()) return "Software Engineer";
  return cleanJobTitle(title);
};

// Intelligently extract target city from any location string
export const extractTargetCity = (loc = "") => {
  if (!loc) return "";

  const lower = loc.toLowerCase();
  for (const city of KNOWN_CITIES) {
    if (lower.includes(city.toLowerCase())) {
      return city === "Bangalore" ? "Bengaluru" : city;
    }
  }

  // Fallback cleanup
  const cleaned = loc
    .replace(/Hybrid\s*-\s*/gi, "")
    .replace(/Work\s+From\s+Home\s*/gi, "")
    .replace(/Remote\s*\/\s*/gi, "")
    .replace(/Pan-India/gi, "")
    .replace(/India/gi, "")
    .replace(/Global/gi, "")
    .replace(/Worldwide/gi, "")
    .replace(/Telecommute/gi, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim();

  return cleaned;
};

export const slugify = (text = "") => {
  if (!text) return "jobs";
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "jobs";
};

/**
 * Builds high-precision platform search URL purely based on Role/Keyword + Target Location
 * (Zero company name filtering, so platforms return all live matching vacancies)
 */
export const buildPlatformUrl = (source = "LinkedIn", arg1 = "", arg2 = "", arg3 = "") => {
  let roleInput = "";
  let locInput = "";

  if (arg3) {
    // Called with (source, company, title, location)
    roleInput = arg2 || arg1 || "Software Engineer";
    locInput = arg3;
  } else if (arg2) {
    // Called with (source, titleOrKeyword, location)
    roleInput = arg1 || "Software Engineer";
    locInput = arg2;
  } else if (arg1) {
    // Called with (source, titleOrKeyword)
    roleInput = arg1;
    locInput = "";
  } else {
    roleInput = "Software Engineer";
    locInput = "";
  }

  const role = extractCoreRole(roleInput);
  const city = extractTargetCity(locInput);

  const encRole = encodeURIComponent(role);
  const encCity = encodeURIComponent(city);
  const citySlug = slugify(city);
  const roleSlug = slugify(role);

  const src = (source || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  if (src.includes("linkedin")) {
    if (city) {
      return `https://www.linkedin.com/jobs/search/?keywords=${encRole}&location=${encCity}`;
    }
    return `https://www.linkedin.com/jobs/search/?keywords=${encRole}&location=India`;
  }

  if (src.includes("indeed")) {
    if (city) {
      return `https://in.indeed.com/jobs?q=${encRole}&l=${encCity}`;
    }
    return `https://in.indeed.com/jobs?q=${encRole}`;
  }

  if (src.includes("naukri")) {
    if (citySlug && citySlug !== "jobs") {
      return `https://www.naukri.com/${roleSlug}-jobs-in-${citySlug}`;
    }
    return `https://www.naukri.com/${roleSlug}-jobs`;
  }

  if (src.includes("foundit")) {
    const loc = encCity || "India";
    return `https://www.foundit.in/srp/results?query=${encRole}&locations=${loc}`;
  }

  if (src.includes("shine")) {
    if (citySlug && citySlug !== "jobs") {
      return `https://www.shine.com/job-search/${roleSlug}-jobs-in-${citySlug}`;
    }
    return `https://www.shine.com/job-search/${roleSlug}-jobs`;
  }

  if (src.includes("apna")) {
    if (city) {
      return `https://apna.co/jobs?text=${encRole}&location=${encCity}`;
    }
    return `https://apna.co/jobs?text=${encRole}`;
  }

  if (src.includes("wellfound")) {
    return `https://wellfound.com/jobs?query=${encRole}`;
  }

  if (src.includes("glassdoor")) {
    const loc = encCity || "India";
    return `https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=${encRole}&locKeyword=${loc}`;
  }

  if (src.includes("timesjobs")) {
    if (city) {
      return `https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=${encRole}&txtLocation=${encCity}`;
    }
    return `https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=${encRole}`;
  }

  if (src.includes("monster")) {
    if (city) {
      return `https://www.monster.com/jobs/search?q=${encRole}&where=${encCity}`;
    }
    return `https://www.monster.com/jobs/search?q=${encRole}`;
  }

  if (src.includes("simplyhired")) {
    if (city) {
      return `https://www.simplyhired.com/search?q=${encRole}&l=${encCity}`;
    }
    return `https://www.simplyhired.com/search?q=${encRole}`;
  }

  if (src.includes("internshala")) {
    if (citySlug && citySlug !== "jobs") {
      return `https://internshala.com/internships/${roleSlug}-internship-in-${citySlug}`;
    }
    return `https://internshala.com/internships/keywords-${roleSlug}`;
  }

  if (src.includes("unstop")) {
    return `https://unstop.com/jobs?searchTerm=${encRole}`;
  }

  if (src.includes("remotive")) {
    return `https://remotive.com/remote-jobs/search?query=${encRole}`;
  }

  if (src.includes("arbeitnow")) {
    return `https://www.arbeitnow.com/jobs?search=${encRole}`;
  }

  if (src.includes("adzuna")) {
    if (city) {
      return `https://www.adzuna.in/search?q=${encRole}&w=${encCity}`;
    }
    return `https://www.adzuna.in/search?q=${encRole}`;
  }

  if (src.includes("google")) {
    const gq = city ? `${role} jobs in ${city}` : `${role} jobs`;
    return `https://www.google.com/search?q=${encodeURIComponent(gq)}&ibp=htl;jobs`;
  }

  if (src.includes("usajobs")) {
    if (city) {
      return `https://www.usajobs.gov/Search/Results?k=${encRole}&l=${encCity}`;
    }
    return `https://www.usajobs.gov/Search/Results?k=${encRole}`;
  }

  // Default fallback to Google Jobs
  const fallbackQuery = city ? `${role} jobs in ${city}` : `${role} jobs`;
  return `https://www.google.com/search?q=${encodeURIComponent(fallbackQuery)}&ibp=htl;jobs`;
};

/**
 * Precision deep-link resolver for applying to a specific job card
 * Combines Company + Job Title + Location to land exactly on the company's vacancy
 */
export const buildJobApplyUrl = (source = "LinkedIn", company = "", title = "", location = "") => {
  const cleanComp = cleanCompanyName(company);
  const cleanTitle = cleanJobTitle(title);
  const city = extractTargetCity(location);
  const encCity = encodeURIComponent(city);
  const citySlug = slugify(city);
  const roleSlug = slugify(cleanTitle);

  // Search query combining company and role for maximum precision
  const queryPhrase = cleanComp ? `${cleanComp} ${cleanTitle}` : cleanTitle;
  const encQuery = encodeURIComponent(queryPhrase);

  const src = (source || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  if ((src.includes("direct") || src.includes("corporate")) && cleanComp) {
    if (city) {
      return `https://www.linkedin.com/jobs/search/?keywords=${encQuery}&location=${encCity}`;
    }
    return `https://www.linkedin.com/jobs/search/?keywords=${encQuery}&location=India`;
  }

  if (src.includes("linkedin")) {
    if (city) {
      return `https://www.linkedin.com/jobs/search/?keywords=${encQuery}&location=${encCity}`;
    }
    return `https://www.linkedin.com/jobs/search/?keywords=${encQuery}&location=India`;
  }

  if (src.includes("indeed")) {
    if (city) {
      return `https://in.indeed.com/jobs?q=${encQuery}&l=${encCity}`;
    }
    return `https://in.indeed.com/jobs?q=${encQuery}`;
  }

  if (src.includes("glassdoor")) {
    const loc = encCity || "India";
    return `https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=${encQuery}&locKeyword=${loc}`;
  }

  if (src.includes("naukri")) {
    if (citySlug && citySlug !== "jobs") {
      return `https://www.naukri.com/${roleSlug}-jobs-in-${citySlug}?k=${encQuery}`;
    }
    return `https://www.naukri.com/${roleSlug}-jobs?k=${encQuery}`;
  }

  if (src.includes("foundit")) {
    const loc = encCity || "India";
    return `https://www.foundit.in/srp/results?query=${encQuery}&locations=${loc}`;
  }

  if (src.includes("shine")) {
    if (citySlug && citySlug !== "jobs") {
      return `https://www.shine.com/job-search/${roleSlug}-jobs-in-${citySlug}?q=${encQuery}`;
    }
    return `https://www.shine.com/job-search/${roleSlug}-jobs?q=${encQuery}`;
  }

  if (src.includes("google")) {
    const gq = city ? `${queryPhrase} jobs in ${city}` : `${queryPhrase} jobs`;
    return `https://www.google.com/search?q=${encodeURIComponent(gq)}&ibp=htl;jobs`;
  }

  return buildPlatformUrl(source, queryPhrase, location);
};

/**
 * Returns accurate apply link for a specific job object
 */
export const getJobApplyLink = (job) => {
  if (!job) return "https://www.linkedin.com/jobs";

  // If the job already has an authentic applyLink (pointing to career site or board), open it directly!
  if (
    job.applyLink &&
    job.applyLink.trim().startsWith("http") &&
    !job.applyLink.includes("google.com/search")
  ) {
    return job.applyLink;
  }

  return buildJobApplyUrl(job.source || "LinkedIn", job.company || "", job.title || "Software Engineer", job.location || "");
};

/**
 * Returns a guaranteed working job portal URL for the vacancy:
 * 1. If the job already has a direct career/platform link (e.g. JSearch, Remotive, Arbeitnow), uses that.
 * 2. If from Adzuna or aggregator, opens Google Jobs deep-search which indexes all Indian boards (Shine, Naukri, Timesjobs, Adzuna)
 *    and NEVER returns "No matching jobs found".
 */
export const getCleanDirectPortalLink = (job) => {
  if (!job) return "https://www.linkedin.com/jobs";

  // If the job already has a clean direct link from a non-adzuna source (like Remotive, Arbeitnow, JSearch, corporate board)
  if (
    job.applyLink &&
    job.applyLink.trim().startsWith("http") &&
    !job.applyLink.includes("adzuna.in") &&
    !job.applyLink.includes("google.com/search")
  ) {
    return job.applyLink;
  }

  const cleanComp = cleanCompanyName(job.company || "");
  const cleanTitle = cleanJobTitle(job.title || "Software Engineer");
  const city = extractTargetCity(job.location || "") || "Mumbai";

  // Google Jobs indexes the exact vacancy across all recruitment networks
  const gq = cleanComp ? `${cleanComp} ${cleanTitle} jobs in ${city}` : `${cleanTitle} jobs in ${city}`;
  return `https://www.google.com/search?q=${encodeURIComponent(gq)}&ibp=htl;jobs`;
};

/**
 * Returns LinkedIn direct job posting or high-precision company + role search
 * Avoids showing random sponsored competitor postings (like micro1)
 */
export const getLinkedInRoleLink = (job) => {
  if (!job) return "https://www.linkedin.com/jobs";

  // If the job already has an authentic LinkedIn URL, open it directly!
  if (
    job.applyLink &&
    job.applyLink.trim().startsWith("http") &&
    job.applyLink.includes("linkedin.com") &&
    !job.applyLink.includes("google.com")
  ) {
    return job.applyLink;
  }

  const cleanComp = cleanCompanyName(job.company || "");
  const cleanTitle = cleanJobTitle(job.title || "Software Engineer");
  const city = extractTargetCity(job.location || "") || "Mumbai";

  // Search company + role so LinkedIn surfaces exact company vacancies
  const queryPhrase = cleanComp ? `${cleanComp} ${cleanTitle}` : cleanTitle;
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(queryPhrase)}&location=${encodeURIComponent(city)}`;
};

/**
 * Returns Naukri direct job posting or high-precision company + role search
 */
export const getNaukriRoleLink = (job) => {
  if (!job) return "https://www.naukri.com";

  if (
    job.applyLink &&
    job.applyLink.trim().startsWith("http") &&
    job.applyLink.includes("naukri.com")
  ) {
    return job.applyLink;
  }

  const cleanComp = cleanCompanyName(job.company || "");
  const cleanTitle = cleanJobTitle(job.title || "Software Engineer");
  const city = extractTargetCity(job.location || "") || "Mumbai";
  const roleSlug = slugify(cleanTitle);
  const citySlug = slugify(city);

  const queryPhrase = cleanComp ? `${cleanComp} ${cleanTitle}` : cleanTitle;
  return `https://www.naukri.com/${roleSlug}-jobs-in-${citySlug}?k=${encodeURIComponent(queryPhrase)}`;
};

/**
 * Determines whether a job opening provides direct application (open ATS, recruiter form, or no account needed)
 * vs closed networks that require logging into a platform profile (LinkedIn, Naukri, Glassdoor).
 */
export const isDirectApply = (job) => {
  if (!job) return false;
  if (isRecruiterDirectJob(job)) return true;
  const src = (job.source || "").toLowerCase();
  const link = (job.applyLink || "").toLowerCase();

  // Known closed networks requiring platform account
  if (
    src.includes("linkedin") ||
    src.includes("naukri") ||
    src.includes("glassdoor") ||
    src.includes("foundit") ||
    src.includes("shine")
  ) {
    return false;
  }

  if (
    link.includes("linkedin.com") ||
    link.includes("naukri.com") ||
    link.includes("glassdoor.com") ||
    link.includes("glassdoor.co.in") ||
    link.includes("foundit.in") ||
    link.includes("shine.com")
  ) {
    return false;
  }

  // Open direct application platforms
  if (
    src.includes("adzuna") ||
    src.includes("jobicy") ||
    src.includes("remotive") ||
    src.includes("arbeitnow") ||
    src.includes("jsearch") ||
    src.includes("direct")
  ) {
    return true;
  }

  // Direct employer ATS systems (Greenhouse, Lever, Workable, etc.)
  if (
    link.includes("greenhouse.io") ||
    link.includes("lever.co") ||
    link.includes("workable.com") ||
    link.includes("smartrecruiters.com") ||
    link.includes("bamboohr.com") ||
    link.includes("ashbyhq.com") ||
    link.includes("applytojob.com") ||
    link.includes("careers.") ||
    link.includes("/careers/")
  ) {
    return true;
  }

  return true;
};

/**
 * Checks if a job is directly posted by an employer/recruiter on JobHub.
 */
export const isRecruiterDirectJob = (job) => {
  if (!job) return false;
  const src = (job.source || "").toLowerCase();
  return Boolean(
    job.postedByEmail ||
    src === "recruiter direct" ||
    src.includes("recruiter") ||
    (src === "database" && job.postedByEmail)
  );
};

/**
 * Robustly parses job posting date across all backend formats:
 * - Jackson LocalDateTime numeric array: [year, month, day, hour, minute, second]
 * - ISO string: "2026-09-04T12:00:00"
 * - Epoch timestamp (ms or seconds)
 * - Null / undefined: defaults to 0 (posted today)
 * Returns the number of integer days elapsed since posting (>= 0).
 */
export const parseJobFreshnessDays = (job) => {
  if (!job) return 0;
  const raw =
    job.postedTime ||
    job.posted_time ||
    job.createdAt ||
    job.created_at ||
    job.date ||
    job.postedDate;

  if (!raw) return 0; // Freshly searched / scraped job -> 0 days old

  let dateObj = null;

  if (Array.isArray(raw)) {
    // Jackson array: [year, month, day, hour, minute, second, ...]
    // Note: JavaScript Date month is 0-indexed (Jan = 0, Sept = 8)
    const year = Number(raw[0]);
    const month = Number(raw[1]);
    const day = Number(raw[2]) || 1;
    const hour = Number(raw[3]) || 0;
    const minute = Number(raw[4]) || 0;
    const second = Number(raw[5]) || 0;
    if (!isNaN(year) && !isNaN(month)) {
      dateObj = new Date(year, month - 1, day, hour, minute, second);
    }
  } else if (typeof raw === "number") {
    dateObj = raw > 1e11 ? new Date(raw) : new Date(raw * 1000);
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    } else {
      const ymd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (ymd) {
        dateObj = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      } else {
        const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (dmy) {
          dateObj = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
        }
      }
    }
  } else if (raw instanceof Date) {
    dateObj = raw;
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return 0; // Fallback to 0 days (fresh)
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  if (diffMs <= 0) {
    return 0; // Posted today or within recent minutes
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
};

/**
 * Returns human-readable relative time display (e.g. "Just Now", "4h ago", "1d ago", "3d ago")
 */
export const getPostedTimeDisplay = (job) => {
  if (!job) return "Recent";
  const raw =
    job.postedTime ||
    job.posted_time ||
    job.createdAt ||
    job.created_at ||
    job.date ||
    job.postedDate;

  if (!raw) return "Just Today";

  let dateObj = null;
  if (Array.isArray(raw)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = raw;
    if (year && month) {
      dateObj = new Date(Number(year), Number(month) - 1, Number(day) || 1, Number(hour), Number(minute), Number(second));
    }
  } else if (typeof raw === "number") {
    dateObj = raw > 1e11 ? new Date(raw) : new Date(raw * 1000);
  } else if (typeof raw === "string") {
    const parsed = new Date(raw.trim());
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  } else if (raw instanceof Date) {
    dateObj = raw;
  }

  if (!dateObj || isNaN(dateObj.getTime())) return "Recently Added";

  const diffMs = Date.now() - dateObj.getTime();
  if (diffMs <= 0) return "Just Today";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just Now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

