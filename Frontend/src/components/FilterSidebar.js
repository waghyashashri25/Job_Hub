import React, { useState, useMemo } from "react";
import { cleanCompanyName, parseJobFreshnessDays } from "../utils/linkHelper";
import "../styles/filter-sidebar.css";

export { parseJobFreshnessDays };

export const FRESHNESS_OPTIONS = [
  { label: "Last 24 Hours", value: "1" },
  { label: "Last 3 Days", value: "3" },
  { label: "Last 7 Days", value: "7" },
  { label: "Last 15 Days", value: "15" },
  { label: "Last 30 Days", value: "30" },
];

// Helper to accurately extract all matching locations & metropolitan regions for a job
export const extractJobLocations = (job) => {
  const loc = (job?.location || "").toLowerCase().trim();

  const locations = new Set();

  // Check Remote / WFH
  if (
    loc.includes("remote") ||
    loc.includes("work from home") ||
    loc.includes("wfh") ||
    loc.includes("telecommute") ||
    job?.source === "Remotive" ||
    job?.source === "Arbeitnow"
  ) {
    locations.add("Remote");
  }

  // Check Mumbai & MMR (Navi Mumbai, Thane, Andheri, BKC, etc.)
  if (
    loc.includes("mumbai") ||
    loc.includes("bombay") ||
    loc.includes("navi mumbai") ||
    loc.includes("thane") ||
    loc.includes("andheri") ||
    loc.includes("bandra") ||
    loc.includes("powai") ||
    loc.includes("worli") ||
    loc.includes("bkc")
  ) {
    locations.add("Mumbai");
    locations.add("Mumbai (All Areas)");
    if (loc.includes("navi mumbai")) {
      locations.add("Navi Mumbai");
    }
    if (loc.includes("thane")) {
      locations.add("Thane");
    }
  }

  // Check Bengaluru / Bangalore
  if (
    loc.includes("bengaluru") ||
    loc.includes("bangalore") ||
    loc.includes("whitefield") ||
    loc.includes("electronic city") ||
    loc.includes("koramangala") ||
    loc.includes("indiranagar")
  ) {
    locations.add("Bengaluru");
    locations.add("Bengaluru (All Areas)");
  }

  // Check Pune & PCMC
  if (
    loc.includes("pune") ||
    loc.includes("poona") ||
    loc.includes("hinjewadi") ||
    loc.includes("magarpatta") ||
    loc.includes("pcmc")
  ) {
    locations.add("Pune");
    locations.add("Pune (All Areas)");
  }

  // Check Hyderabad / Secunderabad
  if (
    loc.includes("hyderabad") ||
    loc.includes("secunderabad") ||
    loc.includes("hitech city") ||
    loc.includes("gachibowli") ||
    loc.includes("cyberabad")
  ) {
    locations.add("Hyderabad");
    locations.add("Hyderabad (All Areas)");
  }

  // Check Delhi / NCR (Noida, Gurgaon/Gurugram, Faridabad, Ghaziabad)
  if (
    loc.includes("delhi") ||
    loc.includes("ncr") ||
    loc.includes("new delhi") ||
    loc.includes("noida") ||
    loc.includes("gurgaon") ||
    loc.includes("gurugram") ||
    loc.includes("faridabad") ||
    loc.includes("ghaziabad")
  ) {
    locations.add("Delhi / NCR");
    if (loc.includes("noida") || loc.includes("greater noida")) {
      locations.add("Noida");
    }
    if (loc.includes("gurgaon") || loc.includes("gurugram")) {
      locations.add("Gurugram / Gurgaon");
    }
    if (loc.includes("delhi") || loc.includes("new delhi")) {
      locations.add("Delhi");
    }
  }

  // Check Chennai
  if (loc.includes("chennai") || loc.includes("madras")) {
    locations.add("Chennai");
    locations.add("Chennai (All Areas)");
  }

  // Check Kolkata
  if (loc.includes("kolkata") || loc.includes("calcutta")) {
    locations.add("Kolkata");
  }

  // Check Ahmedabad / Gandhinagar
  if (loc.includes("ahmedabad") || loc.includes("gandhinagar")) {
    locations.add("Ahmedabad");
  }

  // Check Chandigarh / Mohali / Panchkula
  if (loc.includes("chandigarh") || loc.includes("mohali") || loc.includes("panchkula")) {
    locations.add("Chandigarh");
  }

  // Check Jaipur
  if (loc.includes("jaipur")) {
    locations.add("Jaipur");
  }

  // Check Indore
  if (loc.includes("indore")) {
    locations.add("Indore");
  }

  // Check Kochi / Cochin
  if (loc.includes("kochi") || loc.includes("cochin") || loc.includes("kerala")) {
    locations.add("Kochi / Cochin");
  }

  // Global Tech Hubs if present
  if (loc.includes("san francisco") || loc.includes("sf bay area") || loc.includes("san jose")) {
    locations.add("San Francisco Bay Area");
  }
  if (loc.includes("new york") || loc.includes("nyc") || loc.includes("manhattan")) {
    locations.add("New York");
  }
  if (loc.includes("london")) {
    locations.add("London");
  }
  if (loc.includes("singapore")) {
    locations.add("Singapore");
  }

  // Fallback cleanup if none of the above matched
  if (locations.size === 0) {
    if (loc.includes("pan-india") || loc.includes("pan india") || loc === "india") {
      locations.add("Pan India");
    } else if (loc) {
      const rawCleaned = loc.split(/[,/|\-()]/)[0].trim();
      if (rawCleaned.length > 2 && !/^\d+$/.test(rawCleaned)) {
        const formatted = rawCleaned
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        locations.add(formatted);
      } else {
        locations.add("Other Locations");
      }
    } else {
      locations.add("Location Unspecified");
    }
  }

  return Array.from(locations);
};

// Helper to accurately determine experience range requirements for a job
export const extractJobExperience = (job) => {
  const title = (job?.title || "").toLowerCase();
  const desc = (job?.description || "").toLowerCase();
  const fullText = `${title} ${desc}`;

  // 1. Explicit Senior / Staff / Architect / Principal roles
  if (title.includes("principal") || title.includes("architect") || title.includes("director")) {
    return { minExp: 8, maxExp: 15 };
  }
  if (title.includes("senior") || title.includes("sr.") || title.includes("lead") || title.includes("staff")) {
    return { minExp: 4, maxExp: 8 };
  }

  // 2. Explicit Fresher / Trainee / Intern / Graduate roles
  if (
    title.includes("intern") ||
    title.includes("trainee") ||
    title.includes("fresher") ||
    fullText.includes("freshers welcome") ||
    fullText.includes("freshers can apply") ||
    fullText.includes("0-1 year") ||
    fullText.includes("0 - 1 year") ||
    fullText.includes("0-1 yr") ||
    fullText.includes("0 to 1 year") ||
    fullText.includes("0 year") ||
    fullText.includes("fresher")
  ) {
    return { minExp: 0, maxExp: 1 };
  }

  // 3. Junior / Associate / Entry Level roles
  if (
    title.includes("junior") ||
    title.includes("associate") ||
    title.includes("entry level") ||
    fullText.includes("entry-level") ||
    fullText.includes("0-2 year") ||
    fullText.includes("0 - 2 year") ||
    fullText.includes("1-2 year") ||
    fullText.includes("1 - 2 year") ||
    fullText.includes("1-3 year") ||
    fullText.includes("1 - 3 year")
  ) {
    return { minExp: 0, maxExp: 2 };
  }

  // 4. Look for explicit experience range in description (e.g. "2-5 years", "3 to 5 yrs")
  const rangeMatch = fullText.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?)/i);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    if (!isNaN(min) && !isNaN(max)) {
      return { minExp: min, maxExp: max };
    }
  }

  const plusMatch = fullText.match(/(\d+)\+?\s*(?:years?|yrs?)(?:\s*(?:of\s*)?experience)?/i);
  if (plusMatch) {
    const min = parseInt(plusMatch[1], 10);
    if (!isNaN(min)) {
      return { minExp: min, maxExp: min + 3 };
    }
  }

  // 5. Standard Developer / Engineer roles (e.g. "Java Developer", "Software Engineer")
  // Broad developer roles in India typically accept early-career candidates (0 to 3 years)
  return { minExp: 0, maxExp: 3 };
};

// Helper classifiers for facet dimensions
export const classifyJob = (job) => {
  const text = `${job.title || ""} ${job.description || ""} ${job.location || ""}`.toLowerCase();
  const company = (job.company || "").toLowerCase();

  // 1. Work Mode
  let workMode = "Work from office";
  if (text.includes("remote") || text.includes("work from home") || text.includes("wfh") || text.includes("telecommute")) {
    workMode = "Remote";
  } else if (text.includes("hybrid")) {
    workMode = "Hybrid";
  }

  // 2. Department
  let department = "Engineering - Software & QA";
  if (text.includes("data analyst") || text.includes("data science") || text.includes("machine learning") || text.includes("ai ") || text.includes("bi ")) {
    department = "Data Science & Analytics";
  } else if (text.includes("bank") || text.includes("bfsi") || text.includes("invest") || text.includes("trading") || text.includes("equity") || text.includes("wealth")) {
    department = "BFSI, Investments & Trading";
  } else if (text.includes("account") || text.includes("finance") || text.includes("audit") || text.includes("tax") || text.includes("ca ")) {
    department = "Finance & Accounting";
  } else if (text.includes("product manager") || text.includes("ui/ux") || text.includes("designer") || text.includes("graphic")) {
    department = "Product & Design";
  } else if (text.includes("sales") || text.includes("marketing") || text.includes("bde") || text.includes("business dev") || text.includes("seo")) {
    department = "Sales & Marketing";
  } else if (text.includes("hr ") || text.includes("human resource") || text.includes("recruiter") || text.includes("talent")) {
    department = "Human Resources (HR)";
  }

  // 3. Salary Range Bucket
  let salaryBucket = "6-10 Lakhs";
  const title = (job.title || "").toLowerCase();
  if (title.includes("intern") || title.includes("trainee") || text.includes("stipend")) {
    salaryBucket = "0-3 Lakhs";
  } else if (title.includes("fresher") || title.includes("junior") || title.includes("associate")) {
    salaryBucket = "3-6 Lakhs";
  } else if (title.includes("lead") || title.includes("architect") || title.includes("director") || title.includes("principal")) {
    salaryBucket = "25+ Lakhs";
  } else if (title.includes("senior") || title.includes("sr.")) {
    salaryBucket = "15-25 Lakhs";
  } else if (title.includes("engineer") || title.includes("developer") || title.includes("consultant")) {
    salaryBucket = "10-15 Lakhs";
  }

  // 4. Company Type
  let companyType = "Corporate";
  if (company.includes("technologies") || company.includes("tech") || company.includes("labs") || text.includes("startup") || text.includes("series a") || text.includes("fast-paced")) {
    companyType = "Startup / Product";
  } else if (company.includes("nomura") || company.includes("morgan") || company.includes("google") || company.includes("amazon") || company.includes("microsoft") || company.includes("accenture") || company.includes("deloitte") || company.includes("jpmorgan")) {
    companyType = "Foreign MNC";
  } else if (company.includes("tata") || company.includes("tcs") || company.includes("infosys") || company.includes("wipro") || company.includes("reliance") || company.includes("hcl")) {
    companyType = "Indian MNC";
  }

  // 5. Role Category
  let roleCategory = "Software Development";
  if (text.includes("devops") || text.includes("cloud") || text.includes("sre") || text.includes("aws") || text.includes("kubernetes")) {
    roleCategory = "DevOps & Cloud";
  } else if (text.includes("data") || text.includes("analytics") || text.includes("power bi") || text.includes("tableau")) {
    roleCategory = "Data & AI";
  } else if (text.includes("qa ") || text.includes("tester") || text.includes("selenium") || text.includes("automation test")) {
    roleCategory = "Quality Assurance / Testing";
  } else if (text.includes("business intelligence") || text.includes("bi analyst") || text.includes("bi ")) {
    roleCategory = "Business Intelligence";
  } else if (text.includes("banking operations") || text.includes("kyc") || text.includes("underwriting")) {
    roleCategory = "Banking Operations";
  } else if (text.includes("product manage") || text.includes("product owner")) {
    roleCategory = "Product Management";
  }

  // 6. Education
  let education = "Any Graduate";
  if (text.includes("postgraduate") || text.includes("masters") || text.includes("m.tech") || text.includes("ms in")) {
    education = "Any Postgraduate";
  } else if (text.includes("mba") || text.includes("pgdm")) {
    education = "MBA/PGDM";
  } else if (text.includes("b.tech") || text.includes("b.e.") || text.includes("btech") || text.includes("mca") || text.includes("computer science")) {
    education = "B.Tech / B.E. / MCA";
  }

  // 7. Posted by
  let postedBy = "Company Jobs";
  if (job.source === "Adzuna" || job.source === "JSearch" || job.source === "Direct") {
    postedBy = "Company Jobs";
  } else {
    postedBy = "Verified Partner";
  }

  // 8. Industry
  let industry = "IT Services & Consulting";
  if (company.includes("bank") || company.includes("capital") || company.includes("securities") || company.includes("nomura") || text.includes("bfsi") || text.includes("financial")) {
    industry = "Financial Services";
  } else if (company.includes("hospital") || text.includes("healthcare") || text.includes("medical") || text.includes("pharma")) {
    industry = "Healthcare & Life Sciences";
  } else if (text.includes("e-commerce") || text.includes("retail") || company.includes("flipkart") || company.includes("myntra")) {
    industry = "E-Commerce & Retail";
  }

  // 9. Location Cities / Areas
  const locations = extractJobLocations(job);

  // 10. Clean Company
  const cleanComp = cleanCompanyName(job.company) || "Enterprise Partner";

  // 11. Experience in Years (Accurately Parsed Range)
  const { minExp, maxExp } = extractJobExperience(job);

  // 12. Freshness in Days (Accurately Parsed across ISO/Array/Epoch)
  const freshnessDays = parseJobFreshnessDays(job);

  return {
    workMode,
    department,
    salaryBucket,
    companyType,
    roleCategory,
    education,
    postedBy,
    industry,
    locations,
    company: cleanComp,
    minExp,
    maxExp,
    freshnessDays,
  };
};

const FilterSidebar = ({
  jobs = [],
  filters = {},
  onFilterChange,
  onResetFilters,
  onCloseMobile,
}) => {
  // Collapsible accordion state for each section
  const [collapsed, setCollapsed] = useState({
    department: false,
    salary: false,
    companyType: false,
    education: false,
    postedBy: false,
    industry: false,
    companies: false,
    freshness: true,
    location: false,
    experience: false,
  });

  // "View More" toggle state for long sections
  const [expandedSections, setExpandedSections] = useState({
    department: false,
    salary: false,
    companies: false,
    location: false,
  });

  const toggleCollapse = (section) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleExpand = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Pre-classify all jobs once
  const classifiedJobs = useMemo(() => {
    return jobs.map((job) => ({ job, classification: classifyJob(job) }));
  }, [jobs]);

  // Aggregate counts for every facet dynamically
  const counts = useMemo(() => {
    const res = {
      workMode: {},
      department: {},
      salaryBucket: {},
      companyType: {},
      roleCategory: {},
      education: {},
      postedBy: {},
      industry: {},
      companies: {},
      location: {},
    };

    classifiedJobs.forEach(({ classification: c }) => {
      res.workMode[c.workMode] = (res.workMode[c.workMode] || 0) + 1;
      res.department[c.department] = (res.department[c.department] || 0) + 1;
      res.salaryBucket[c.salaryBucket] = (res.salaryBucket[c.salaryBucket] || 0) + 1;
      res.companyType[c.companyType] = (res.companyType[c.companyType] || 0) + 1;
      res.roleCategory[c.roleCategory] = (res.roleCategory[c.roleCategory] || 0) + 1;
      res.education[c.education] = (res.education[c.education] || 0) + 1;
      res.postedBy[c.postedBy] = (res.postedBy[c.postedBy] || 0) + 1;
      res.industry[c.industry] = (res.industry[c.industry] || 0) + 1;
      res.companies[c.company] = (res.companies[c.company] || 0) + 1;

      // Location multi-area counts
      (c.locations || []).forEach((locName) => {
        res.location[locName] = (res.location[locName] || 0) + 1;
      });
    });

    return res;
  }, [classifiedJobs]);

  // Dynamic freshness counts for 24h, 3d, 7d, 15d, 30d
  const freshnessCounts = useMemo(() => {
    let c1 = 0;
    let c3 = 0;
    let c7 = 0;
    let c15 = 0;
    let c30 = 0;

    classifiedJobs.forEach(({ classification: c }) => {
      const days = c.freshnessDays ?? 0;
      if (days <= 1) c1++;
      if (days <= 3) c3++;
      if (days <= 7) c7++;
      if (days <= 15) c15++;
      if (days <= 30) c30++;
    });

    return {
      "1": c1,
      "3": c3,
      "7": c7,
      "15": c15,
      "30": c30,
    };
  }, [classifiedJobs]);

  // Selected label shown on header (e.g. "Select v" or "Last 3 Days v")
  const selectedFreshnessLabel = useMemo(() => {
    if (!filters.freshness || filters.freshness === "any") {
      return "Select";
    }
    const found = FRESHNESS_OPTIONS.find((opt) => opt.value === String(filters.freshness));
    return found ? found.label : "Select";
  }, [filters.freshness]);

  // Helper to handle checkbox change
  const handleCheckbox = (filterKey, value) => {
    const current = filters[filterKey] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange(filterKey, next);
  };

  // Active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    Object.entries(filters).forEach(([key, val]) => {
      if (Array.isArray(val)) count += val.length;
      else if (val && val !== "any" && val !== 10) count += 1;
    });
    return count;
  }, [filters]);

  // Only return options that actually have at least 1 job (count > 0)
  const getSortedOptions = (countsObj, preferredOrder = []) => {
    return Object.entries(countsObj)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        const idxA = preferredOrder.indexOf(a.name);
        const idxB = preferredOrder.indexOf(b.name);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
  };

  const departmentOptions = getSortedOptions(counts.department, [
    "Engineering - Software & QA",
    "Data Science & Analytics",
    "BFSI, Investments & Trading",
    "Finance & Accounting",
    "Product & Design",
    "Sales & Marketing",
    "Human Resources (HR)",
  ]);
  const salaryOptions = getSortedOptions(counts.salaryBucket, [
    "0-3 Lakhs",
    "3-6 Lakhs",
    "6-10 Lakhs",
    "10-15 Lakhs",
    "15-25 Lakhs",
    "25+ Lakhs",
  ]);
  const companyTypeOptions = getSortedOptions(counts.companyType, [
    "Corporate",
    "Foreign MNC",
    "Startup / Product",
    "Indian MNC",
  ]);
  const educationOptions = getSortedOptions(counts.education, [
    "Any Graduate",
    "Any Postgraduate",
    "B.Tech / B.E. / MCA",
    "MBA/PGDM",
  ]);
  const postedByOptions = getSortedOptions(counts.postedBy, ["Company Jobs", "Verified Partner"]);
  const industryOptions = getSortedOptions(counts.industry, [
    "Financial Services",
    "IT Services & Consulting",
    "Healthcare & Life Sciences",
    "E-Commerce & Retail",
  ]);
  const companyOptions = getSortedOptions(counts.companies);
  const locationOptions = getSortedOptions(counts.location, [
    "Mumbai",
    "Mumbai (All Areas)",
    "Navi Mumbai",
    "Thane",
    "Bengaluru",
    "Bengaluru (All Areas)",
    "Pune",
    "Pune (All Areas)",
    "Hyderabad",
    "Hyderabad (All Areas)",
    "Delhi / NCR",
    "Noida",
    "Gurugram / Gurgaon",
    "Delhi",
    "Chennai",
    "Remote",
  ]);

  // Render Section Helper
  const renderSection = (id, title, options, filterKey, expandable = false) => {
    const isCollapsed = collapsed[id];
    const isExpanded = expandedSections[id];
    const visibleOptions = expandable && !isExpanded ? options.slice(0, 4) : options;

    return (
      <div className="filter-section">
        <button
          type="button"
          className="filter-section-header"
          onClick={() => toggleCollapse(id)}
          aria-expanded={!isCollapsed}
        >
          <h4 className="filter-section-title">{title}</h4>
          <span className={`filter-chevron ${isCollapsed ? "collapsed" : ""}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </span>
        </button>

        {!isCollapsed && (
          <div className="filter-options-list">
            {visibleOptions.map((opt) => {
              const checked = (filters[filterKey] || []).includes(opt.name);
              return (
                <label key={opt.name} className={`filter-option-item ${checked ? "active" : ""}`}>
                  <div className="filter-option-left">
                    <input
                      type="checkbox"
                      className="filter-checkbox"
                      checked={checked}
                      onChange={() => handleCheckbox(filterKey, opt.name)}
                    />
                    <span className="filter-label-text" title={opt.name}>
                      {opt.name}
                    </span>
                  </div>
                  <span className="filter-count">({opt.count})</span>
                </label>
              );
            })}

            {expandable && options.length > 4 && (
              <button
                type="button"
                className="filter-view-more-btn"
                onClick={() => toggleExpand(id)}
              >
                {isExpanded ? "View Less" : `View More (${options.length - 4})`}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="filter-sidebar-wrapper" aria-label="Job Filters">
      {/* Header with Title and Clear All */}
      <div className="filter-sidebar-header">
        <h3 className="filter-sidebar-title">
          All Filters
          {activeCount > 0 && <span className="filter-badge-count">{activeCount}</span>}
        </h3>
        {activeCount > 0 && (
          <button
            type="button"
            className="filter-clear-all-btn"
            onClick={onResetFilters}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="filter-sidebar-content">
        {/* 1. Department */}
        {renderSection("department", "Department", departmentOptions, "departments", true)}

        {/* 3. Salary */}
        {renderSection("salary", "Salary", salaryOptions, "salaryRanges", true)}

        {/* 4. Company Type */}
        {renderSection("companyType", "Company type", companyTypeOptions, "companyTypes")}

        {/* 6. Education */}
        {renderSection("education", "Education", educationOptions, "educations")}

        {/* 7. Posted by */}
        {renderSection("postedBy", "Posted by", postedByOptions, "postedBy")}

        {/* 8. Industry */}
        {renderSection("industry", "Industry", industryOptions, "industries")}

        {/* 9. Top Companies */}
        {renderSection("companies", "Top companies", companyOptions, "companies", true)}

        {/* 10. Freshness (Naukri-Style Header + Selectable Options with Counts) */}
        <div className="filter-section filter-freshness-section">
          <button
            type="button"
            className="filter-section-header filter-freshness-header"
            onClick={() => toggleCollapse("freshness")}
            aria-expanded={!collapsed.freshness}
          >
            <h4 className="filter-section-title">Freshness</h4>
            <div className="filter-freshness-header-right">
              <span
                className={`filter-freshness-current-label ${
                  filters.freshness && filters.freshness !== "any" ? "selected" : ""
                }`}
              >
                {selectedFreshnessLabel}
              </span>
              <span className={`filter-chevron ${collapsed.freshness ? "collapsed" : ""}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </span>
            </div>
          </button>

          {!collapsed.freshness && (
            <div className="filter-options-list">
              {FRESHNESS_OPTIONS.map((opt) => {
                const isSelected = String(filters.freshness) === opt.value;
                const count = freshnessCounts[opt.value] || 0;
                return (
                  <label
                    key={opt.value}
                    className={`filter-option-item ${isSelected ? "active" : ""}`}
                  >
                    <div className="filter-option-left">
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        checked={isSelected}
                        onChange={() => {
                          onFilterChange("freshness", isSelected ? "any" : opt.value);
                        }}
                      />
                      <span className="filter-label-text">
                        {opt.label}
                      </span>
                    </div>
                    <span className="filter-count">({count})</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 11. Location */}
        {renderSection("location", "Location", locationOptions, "locations", true)}

        {/* 12. Experience Slider */}
        <div className="filter-section">
          <button
            type="button"
            className="filter-section-header"
            onClick={() => toggleCollapse("experience")}
            aria-expanded={!collapsed.experience}
          >
            <h4 className="filter-section-title">Experience</h4>
            <span className={`filter-chevron ${collapsed.experience ? "collapsed" : ""}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </span>
          </button>

          {!collapsed.experience && (
            <div className="experience-slider-container">
              <div className="experience-slider-bubble-wrapper">
                <span className="experience-slider-bubble">
                  {filters.maxExperience !== undefined && filters.maxExperience !== 10
                    ? `${filters.maxExperience} Yrs`
                    : "Any"}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                className="experience-slider"
                value={filters.maxExperience !== undefined ? filters.maxExperience : 10}
                onChange={(e) => onFilterChange("maxExperience", Number(e.target.value))}
              />
              <div className="experience-slider-labels">
                <span>0 Yrs</span>
                <span>Any</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
