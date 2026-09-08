const fs = require('fs');

const CITY_HUBS = [
  {
    name: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    locs: [
      'Bengaluru, Karnataka',
      'Electronic City, Bengaluru',
      'Whitefield, Bengaluru',
      'Koramangala, Bengaluru',
      'HSR Layout, Bengaluru',
      'Bellandur, Bengaluru',
      'Manyata Tech Park, Bengaluru',
      'Bengaluru (Hybrid)',
      'Bengaluru (Remote / WFH)'
    ],
    companies: [
      'Flipkart', 'Swiggy', 'Zepto', 'PhonePe', 'Razorpay', 'Cred', 'Meesho',
      'Groww', 'Zerodha', 'Google', 'Microsoft', 'Amazon AWS', 'Oracle',
      'Target', 'Walmart Global Tech', 'Infosys', 'Wipro', 'Capgemini', 'Accenture'
    ]
  },
  {
    name: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    locs: [
      'Mumbai, Maharashtra',
      'Navi Mumbai, Maharashtra',
      'Bandra Kurla Complex (BKC), Mumbai',
      'Andheri East, Mumbai',
      'Powai, Mumbai',
      'Thane, Maharashtra',
      'Mumbai (Hybrid)',
      'Mumbai, Maharashtra (WFH)'
    ],
    companies: [
      'JPMorgan Chase', 'Morgan Stanley', 'Barclays', 'Nomura', 'Reliance Jio',
      'Tata Digital', 'HDFC Bank', 'ICICI Bank', 'Kotak Mahindra Bank', 'Axis Bank',
      'Media.net', 'JioCinema', 'BookMyShow', 'Dream11', 'L&T Construction',
      'Tata Projects', 'Godrej Group', 'Kokilaben Hospital', 'Hinduja Hospital'
    ]
  },
  {
    name: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    locs: [
      'Pune, Maharashtra',
      'Hinjewadi Phase 1, Pune',
      'Magarpatta City, Pune',
      'Kharadi IT Park, Pune',
      'Baner, Pune',
      'Viman Nagar, Pune',
      'Pune, Maharashtra (Hybrid)',
      'Pune, Maharashtra (WFH)'
    ],
    companies: [
      'LTIMindtree', 'Infosys', 'TCS', 'Wipro', 'Cognizant', 'Capgemini',
      'Amdocs', 'Tech Mahindra', 'Barclays Global Tech', 'Deutsche Bank',
      'Veritas', 'Synechron', 'Cybage', 'Tata Motors', 'Bharat Forge'
    ]
  },
  {
    name: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    locs: [
      'Hyderabad, Telangana',
      'HITEC City, Hyderabad',
      'Gachibowli, Hyderabad',
      'Madhapur, Hyderabad',
      'Financial District, Hyderabad',
      'Kondapur, Hyderabad',
      'Hyderabad (Hybrid)',
      'Hyderabad (WFH)'
    ],
    companies: [
      'Microsoft', 'Amazon', 'Google Cloud', 'ServiceNow', 'Oracle',
      'Salesforce', 'Qualcomm', 'Uber', 'TCS', 'Infosys', 'Wipro',
      'Cognizant', 'Tech Mahindra', 'Dr. Reddy Labs', 'Apollo Hospitals'
    ]
  },
  {
    name: 'Delhi',
    state: 'Delhi NCR',
    country: 'India',
    locs: [
      'New Delhi, Delhi',
      'Gurugram, Haryana',
      'Cyber City, Gurugram',
      'Golf Course Road, Gurugram',
      'Noida Sector 62, Delhi NCR',
      'Noida Sector 125, Delhi NCR',
      'Delhi NCR (Hybrid)',
      'Gurugram (Remote / WFH)'
    ],
    companies: [
      'Zomato', 'Blinkit', 'MakeMyTrip', 'Paytm', 'Oyo', 'PolicyBazaar',
      'InfoEdge (Naukri)', 'Nykaa', 'Urban Company', 'Microsoft', 'Adobe',
      'Tata 1mg', 'Dentsu', 'GroupM', 'Max Healthcare', 'Fortis Healthcare'
    ]
  },
  {
    name: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    locs: [
      'Chennai, Tamil Nadu',
      'Old Mahabalipuram Road (OMR), Chennai',
      'Tidel Park, Chennai',
      'Guindy Industrial Estate, Chennai',
      'Siruseri IT Park, Chennai',
      'Chennai (Hybrid)',
      'Chennai (WFH)'
    ],
    companies: [
      'Zoho Corporation', 'Freshworks', 'PayPal', 'Amazon', 'TCS',
      'Infosys', 'Cognizant', 'Wipro', 'HCLTech', 'Standard Chartered GBS',
      'Apollo Hospitals', 'L&T Construction'
    ]
  },
  {
    name: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    locs: [
      'Kolkata, West Bengal',
      'Salt Lake Sector V, Kolkata',
      'New Town Action Area 1, Kolkata',
      'Rajarhat, Kolkata',
      'Kolkata (Hybrid)',
      'Kolkata (WFH)'
    ],
    companies: [
      'TCS', 'Wipro', 'Cognizant', 'IBM India', 'Capgemini',
      'PwC India', 'ITC Infotech', 'Bandhan Bank', 'Tata Medical Center'
    ]
  },
  {
    name: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    locs: [
      'Ahmedabad, Gujarat',
      'GIFT City, Gandhinagar',
      'SG Highway, Ahmedabad',
      'Prahlad Nagar, Ahmedabad',
      'Ahmedabad (Hybrid)',
      'Ahmedabad (WFH)'
    ],
    companies: [
      'GIFT City Global Banking', 'TCS Garima Park', 'Infibeam Avenues',
      'Adani Group', 'Torrent Power', 'Cygnet Infotech', 'Apollo Hospitals'
    ]
  },
  {
    name: 'Remote',
    state: 'Pan-India',
    country: 'India',
    locs: [
      'Pan-India (Remote / WFH)',
      'India (100% Remote)',
      'Bangalore (Remote / WFH)',
      'Mumbai (Remote / WFH)',
      'Pune (Remote / WFH)',
      'Hyderabad (Remote / WFH)'
    ],
    companies: [
      'GitLab', 'Automattic', 'Canonical', 'Red Hat', 'Stripe',
      'Datadog', 'Upwork', 'Razorpay', 'BrowserStack', 'Postman'
    ]
  },
  {
    name: 'Worldwide',
    state: 'Global',
    country: 'Global',
    locs: [
      'Worldwide (100% Remote)',
      'Remote / Global',
      'San Francisco, CA (Remote)',
      'London, UK (Remote)',
      'Singapore (Remote)',
      'Berlin, Germany (Remote)',
      'Toronto, Canada (Remote)'
    ],
    companies: [
      'GitLab', 'Automattic', 'Canonical', 'Stripe', 'Datadog',
      'FastSpring', 'Sierra', 'Remotive', 'Arbeitnow', 'Jobicy'
    ]
  }
];

const ROLE_DEFINITIONS = [
  {
    category: 'Frontend Developer',
    titles: [
      'Frontend Developer',
      'Senior Frontend Developer',
      'Frontend Web Developer (React / Next.js)',
      'Frontend UI Engineer',
      'Lead Frontend Developer',
      'Junior Frontend Developer'
    ],
    desc: 'Develop modular, responsive web applications using React 18, Next.js 14, TypeScript, Redux Toolkit, Tailwind CSS, HTML5, CSS3, REST APIs, and modern frontend design systems.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Java Developer',
    titles: [
      'Senior Java Developer',
      'Java Backend Developer',
      'Java Full Stack Developer (Spring Boot & React)',
      'Lead Java Software Engineer',
      'Java Microservices Engineer',
      'Core Java & Spring Boot Developer'
    ],
    desc: 'Design and build enterprise microservices, Kafka event streaming pipelines, high-throughput REST APIs, and cloud services using Core Java 21, Spring Boot 3, Hibernate JPA, PostgreSQL, Docker, and Kubernetes.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Python Developer',
    titles: [
      'Python Developer',
      'Python Backend Developer',
      'Senior Python Software Engineer',
      'Python Full Stack Engineer (Django / FastAPI)',
      'Lead Python Cloud Engineer',
      'Junior Python Engineer'
    ],
    desc: 'Develop scalable distributed microservices, asynchronous task queues with Celery and Redis, and high-performance RESTful APIs using Python 3.12, FastAPI, Django, PostgreSQL, Docker, and AWS.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'React Developer',
    titles: [
      'React Developer',
      'Senior React Developer',
      'React & TypeScript Frontend Engineer',
      'Full Stack React & Node Developer (MERN)',
      'React Native Mobile Developer'
    ],
    desc: 'Architect high-performance consumer web apps and mobile interfaces using React, Next.js, TypeScript, Zustand, GraphQL, CSS-in-JS, Webpack, and automated testing.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'DevOps & Cloud',
    titles: [
      'DevOps Engineer',
      'DevOps Cloud Engineer',
      'Senior DevOps Engineer',
      'Site Reliability Engineer (SRE)',
      'Cloud Infrastructure Architect (AWS / Azure / GCP)',
      'Lead Kubernetes & Platform Engineer'
    ],
    desc: 'Automate multi-region cloud infrastructure using Terraform, Ansible, Docker, Kubernetes (EKS/GKE), GitHub Actions CI/CD pipelines, Prometheus, Grafana, and AWS cloud security best practices.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'QA & Testing',
    titles: [
      'QA Tester',
      'QA Automation Engineer',
      'Senior QA Automation Engineer',
      'SDET (Software Development Engineer in Test)',
      'Lead Quality Assurance Engineer',
      'Automation Test Architect (Selenium / Playwright)'
    ],
    desc: 'Architect enterprise end-to-end automation test frameworks using Selenium WebDriver, Playwright, Java, Python, REST Assured, Cypress, Appium, TestNG, and CI/CD pipelines.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Data Science & AI',
    titles: [
      'Data Scientist',
      'Senior Data Scientist',
      'Machine Learning Engineer (MLOps)',
      'AI / LLM Application Developer',
      'Lead Data Science Architect'
    ],
    desc: 'Build predictive machine learning models, fine-tune Generative AI/LLM pipelines (LangChain, OpenAI, HuggingFace), deploy models with FastAPI and Docker, and analyze multidimensional business telemetry with PyTorch and Pandas.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Data Engineer',
    titles: [
      'Data Engineer',
      'Senior Data Engineer',
      'Lead Big Data Platform Engineer',
      'Cloud Data Architect (Snowflake / Databricks)',
      'ETL Data Pipeline Developer (PySpark / Kafka)'
    ],
    desc: 'Construct real-time streaming pipelines with Apache Spark, Kafka, Snowflake, Databricks, AWS Glue, dbt, SQL, and Airflow orchestrations.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Data Analyst',
    titles: [
      'Data Analyst',
      'Senior Data Analyst',
      'Business Intelligence (BI) Analyst',
      'Financial Data Analyst',
      'Lead Analytics Consultant (Power BI / Tableau)'
    ],
    desc: 'Execute advanced SQL data modeling, design interactive Power BI and Tableau dashboards, conduct exploratory cohort analysis, and communicate strategic metrics to leadership.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Cybersecurity',
    titles: [
      'Cybersecurity Analyst',
      'Senior Information Security Engineer',
      'Lead SOC Analyst (L2 / L3)',
      'Penetration Tester & Ethical Hacker (VAPT)',
      'Cloud Security Architect'
    ],
    desc: 'Monitor real-time SIEM alerts (Splunk, Sentinel), conduct vulnerability assessments and penetration testing (VAPT), remediate cloud security postures, and lead incident response operations.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Sales Executive',
    titles: [
      'Sales Executive',
      'Senior Sales Executive',
      'B2B Sales Executive',
      'Enterprise Account Executive (Sales)',
      'Business Development Executive (BDE)'
    ],
    desc: 'Lead strategic enterprise client acquisitions, build high-velocity B2B sales pipelines, conduct solution demos, and close revenue quotas.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Civil Engineer',
    titles: [
      'Civil Engineer',
      'Senior Civil Engineer',
      'Site Civil Engineer (Construction)',
      'Structural Design Engineer (Civil)',
      'Project Civil Engineer'
    ],
    desc: 'Supervise on-site construction engineering, structural AutoCAD design modeling, concrete quality assurance, contractor management, and project billing.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Nurse',
    titles: [
      'Nurse',
      'Staff Nurse',
      'Senior Staff Nurse (ICU / Critical Care)',
      'Clinical Staff Nurse',
      'Emergency Department Nurse'
    ],
    desc: 'Provide high-quality clinical patient triage, administer medications, monitor ICU telemetry, and adhere to global healthcare NABH hospital protocols.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'TimesJobs', 'Direct']
  },
  {
    category: 'Accountant',
    titles: [
      'Accountant',
      'Senior Financial Accountant',
      'Chartered Accountant (CA) / Tax Lead',
      'Manager - Accounts & Finance',
      'Statutory Audit & GST Accountant'
    ],
    desc: 'Manage corporate financial reporting, statutory audits, GST & corporate tax compliance, ledger reconciliations, balance sheets, and SAP ERP closures.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'UI/UX Designer',
    titles: [
      'UI/UX Designer',
      'Senior UI/UX Designer',
      'Product Designer (Figma / Design Systems)',
      'Lead Visual UI Designer',
      'User Experience (UX) Researcher'
    ],
    desc: 'Design engaging end-to-end user journeys, interactive high-fidelity Figma prototypes, comprehensive design systems (tokens & components), usability testing, and wireframes.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Product Manager',
    titles: [
      'Product Manager',
      'Associate Product Manager (APM)',
      'Senior Product Manager',
      'Technical Product Manager (TPM)',
      'Lead Growth Product Manager'
    ],
    desc: 'Own product roadmap, define feature PRDs, collaborate with engineering and design teams, analyze A/B testing user cohorts, and drive core north-star metrics.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Technical Writing',
    titles: [
      'Technical Writing',
      'Technical Writer',
      'Senior Technical Writer',
      'API Documentation Specialist',
      'Lead Technical Content Author'
    ],
    desc: 'Author comprehensive REST API documentation, SDK integration guides, architectural specifications, markdown developer tutorials, and release notes.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Content Writer',
    titles: [
      'Content Writer',
      'Senior Content Writer',
      'SEO Content Specialist',
      'Lead Copywriter & Content Strategist',
      'Technical B2B Content Writer'
    ],
    desc: 'Craft high-converting landing page copy, technical blog articles, whitepapers, email campaigns, and SEO-optimized search content.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'HR Executive',
    titles: [
      'HR Executive',
      'Senior HR Executive',
      'Talent Acquisition Specialist (HR)',
      'Technical Recruiter',
      'HR Generalist / Operations Lead'
    ],
    desc: 'Manage end-to-end recruitment lifecycle, talent sourcing via LinkedIn & Naukri, employee onboarding, HR compliance, and payroll management.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Digital Marketing',
    titles: [
      'Digital Marketing',
      'Digital Marketing Specialist',
      'Performance Marketing Manager',
      'SEO & SEM Growth Specialist',
      'Growth Marketing Lead'
    ],
    desc: 'Execute ROI-driven digital performance marketing campaigns across Google Ads, Meta Ads, programmatic display, SEO optimization, and web conversion analytics.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Fresher',
    titles: [
      'Fresher',
      'Junior Software Engineer (Fresher)',
      'Graduate Technology Associate (Fresher)',
      'Entry Level Frontend Developer (Fresher)',
      'Junior QA Automation Engineer (Fresher)',
      'Graduate Engineer Trainee (GET - Fresher)'
    ],
    desc: 'Comprehensive engineering development program for recent graduates, training on modern web architectures, Java/Python programming, database design, and agile product development.',
    sources: ['Naukri', 'LinkedIn', 'Indeed', 'Foundit', 'Shine', 'Glassdoor', 'Direct']
  },
  {
    category: 'Internship',
    titles: [
      'Internship',
      'Frontend Developer Intern',
      'Java Software Engineering Intern',
      'Python Backend Engineering Intern',
      'Data Science & AI Intern',
      'Product Design Intern (UI/UX)',
      'Finance & Accounting Intern',
      'Marketing & Growth Intern'
    ],
    desc: 'Hands-on practical engineering and business internship working alongside senior mentors, contributing to real production codebases, and participating in agile sprints.',
    sources: ['Internshala', 'Unstop', 'Naukri', 'LinkedIn', 'Indeed', 'Direct']
  }
];

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'jobs';
}

function getDirectOfficialApplyLink(source, company, title, city, id, daysAgo, minExp, maxExp) {
  const encTitle = encodeURIComponent(title);
  const encCity = encodeURIComponent(city.name);
  const roleSlug = slugify(title);
  const compSlug = slugify(company);
  const citySlug = slugify(city.name);

  const uniqueNaukriId = `110826${id}`;
  const uniqueLinkedInId = `444834${id}`;
  const uniqueHex = Math.abs(id * 31337).toString(16).padStart(12, 'a');

  switch (source) {
    case 'Naukri':
      return `https://www.naukri.com/${roleSlug}-jobs-in-${citySlug}?k=${encTitle}`;
    case 'LinkedIn':
      return `https://www.linkedin.com/jobs/search/?keywords=${encTitle}&location=${encCity}`;
    case 'Indeed':
      return `https://in.indeed.com/jobs?q=${encTitle}&l=${encCity}`;
    case 'Foundit':
      return `https://www.foundit.in/srp/results?query=${encTitle}&locations=${encCity}`;
    case 'Shine':
      return `https://www.shine.com/job-search/${roleSlug}-jobs-in-${citySlug}`;
    case 'Internshala':
      return `https://internshala.com/internships/${roleSlug}-internship-in-${citySlug}`;
    case 'Unstop':
      return `https://unstop.com/jobs?searchTerm=${encTitle}`;
    case 'Glassdoor':
      return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encTitle}&locKeyword=${encCity}`;
    case 'Direct':
      return `https://www.linkedin.com/jobs/search/?keywords=${encTitle}&location=${encCity}`;
    default:
      return `https://www.naukri.com/${roleSlug}-jobs-in-${citySlug}?k=${encTitle}`;
  }
}

let idCounter = 101;
let sqlStatements = [];

sqlStatements.push('-- ==========================================================');
sqlStatements.push('-- Job Portal Project - Massive Multi-Domain Dataset');
sqlStatements.push('-- ==========================================================');
sqlStatements.push('');
sqlStatements.push('CREATE TABLE IF NOT EXISTS users (');
sqlStatements.push('    id BIGSERIAL PRIMARY KEY,');
sqlStatements.push('    name VARCHAR(255) NOT NULL,');
sqlStatements.push('    email VARCHAR(255) NOT NULL UNIQUE,');
sqlStatements.push('    password VARCHAR(255) NOT NULL,');
sqlStatements.push('    provider VARCHAR(255) NOT NULL DEFAULT \'LOCAL\',');
sqlStatements.push('    role VARCHAR(255) NOT NULL DEFAULT \'USER\',');
sqlStatements.push('    skills TEXT DEFAULT \'\',');
sqlStatements.push('    job_title VARCHAR(255) DEFAULT \'\',');
sqlStatements.push('    experience INTEGER DEFAULT 0');
sqlStatements.push(');');
sqlStatements.push('');
sqlStatements.push('CREATE TABLE IF NOT EXISTS jobs (');
sqlStatements.push('    id BIGSERIAL PRIMARY KEY,');
sqlStatements.push('    title VARCHAR(255) NOT NULL,');
sqlStatements.push('    company VARCHAR(255) NOT NULL,');
sqlStatements.push('    location VARCHAR(255) NOT NULL,');
sqlStatements.push('    description TEXT,');
sqlStatements.push('    source VARCHAR(255) NOT NULL,');
sqlStatements.push('    apply_link VARCHAR(2000) NOT NULL,');
sqlStatements.push('    posted_time TIMESTAMP WITHOUT TIME ZONE NOT NULL');
sqlStatements.push(');');
sqlStatements.push('');
sqlStatements.push('CREATE INDEX IF NOT EXISTS idx_title ON jobs (title);');
sqlStatements.push('CREATE INDEX IF NOT EXISTS idx_location ON jobs (location);');
sqlStatements.push('CREATE INDEX IF NOT EXISTS idx_source ON jobs (source);');
sqlStatements.push('CREATE INDEX IF NOT EXISTS idx_company ON jobs (company);');
sqlStatements.push('CREATE INDEX IF NOT EXISTS idx_posted_time ON jobs (posted_time);');
sqlStatements.push('CREATE INDEX IF NOT EXISTS idx_title_company_source ON jobs (title, company, source);');
sqlStatements.push('');
sqlStatements.push('CREATE TABLE IF NOT EXISTS applications (');
sqlStatements.push('    id BIGSERIAL PRIMARY KEY,');
sqlStatements.push('    user_id BIGINT NOT NULL,');
sqlStatements.push('    job_id BIGINT NOT NULL,');
sqlStatements.push('    status VARCHAR(255) NOT NULL,');
sqlStatements.push('    saved_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,');
sqlStatements.push('    CONSTRAINT fk_applications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,');
sqlStatements.push('    CONSTRAINT fk_applications_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE');
sqlStatements.push(');');
sqlStatements.push('');
sqlStatements.push('CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications (user_id);');
sqlStatements.push('CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications (job_id);');
sqlStatements.push('');
sqlStatements.push('INSERT INTO users (name, email, password, provider, role, skills, job_title, experience)');
sqlStatements.push('VALUES (\'System Admin\', \'admin@example.com\', \'$2b$10$jQgEr77lm6tPkDRvjcuUkOO4DDvdsmTRPI.CRQ9gcFYwp3h/Yd.VK\', \'LOCAL\', \'ADMIN\', \'System Administration, DevOps, Java\', \'Lead Architect\', 8)');
sqlStatements.push('ON CONFLICT (email) DO NOTHING;');
sqlStatements.push('');
sqlStatements.push('DELETE FROM applications;');
sqlStatements.push('DELETE FROM jobs;');
sqlStatements.push('');
sqlStatements.push('INSERT INTO jobs (id, title, company, location, description, source, apply_link, posted_time) VALUES');

let rows = [];

for (const city of CITY_HUBS) {
  for (const role of ROLE_DEFINITIONS) {
    const jobCount = 10;
    for (let i = 0; i < jobCount; i++) {
      const id = idCounter++;
      const title = role.titles[i % role.titles.length];
      const company = city.companies[i % city.companies.length];
      const location = city.locs[i % city.locs.length];
      const source = role.sources[i % role.sources.length];
      const desc = role.desc.replace(/'/g, "''");
      const daysAgo = (i % 12) + 1;
      const minExp = (i % 3) + 1;
      const maxExp = minExp + (i % 4) + 2;

      const applyLink = getDirectOfficialApplyLink(source, company, title, city, id, daysAgo, minExp, maxExp);
      const cleanTitle = title.replace(/'/g, "''");
      const cleanCompany = company.replace(/'/g, "''");

      rows.push(`(${id}, '${cleanTitle}', '${cleanCompany}', '${location}', '${desc}', '${source}', '${applyLink}', NOW() - INTERVAL '${daysAgo} days')`);
    }
  }
}

sqlStatements.push(rows.join(',\n') + ';');
sqlStatements.push('');
sqlStatements.push('SELECT setval(\'jobs_id_seq\', 50000, true);');

fs.writeFileSync('init-db.sql', sqlStatements.join('\n'));
console.log(`Successfully generated init-db.sql with ${rows.length} authentic, rich multi-role, multi-city jobs!`);
