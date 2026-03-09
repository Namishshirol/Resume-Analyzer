import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load API key — handles both .env and _env filenames, and spaces around =
function loadEnvFile() {
  const candidates = ['_env', '.env', '.env.local'];
  for (const f of candidates) {
    if (fs.existsSync(f)) {
      const lines = fs.readFileSync(f, 'utf8').split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*(\w+)\s*=\s*(.+)\s*$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
      }
      console.log('✅ Loaded env from:', f);
      return;
    }
  }
  console.warn('⚠ No env file found');
}
loadEnvFile();

// Debug: confirm key loaded (shows only first/last 6 chars for security)

const app = express();
const PORT = 9000;

app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Default industry keywords
const industryKeywords = {
  tech: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS', 'Docker', 'REST API', 'Git', 'Agile', 'CI/CD', 'Java', 'C++', 'TypeScript', 'Vue.js', 'Angular', 'Express.js', 'MongoDB', 'PostgreSQL', 'Microservices', 'Linux', 'Kubernetes', 'Jenkins', 'GitLab', 'Version Control', 'API', 'GraphQL', 'SOLID', 'Design Patterns', 'OOP', 'Functional Programming', 'Lambda', 'Cloud Computing', 'AJAX', 'JSON', 'XML', 'OAuth', 'SSL/TLS', 'Scrum', 'Kanban', 'Sprint'],
  data: ['Python', 'SQL', 'Tableau', 'Power BI', 'Machine Learning', 'Data Analysis', 'Excel', 'Statistics', 'ETL', 'Big Data', 'Spark', 'Hadoop', 'R', 'Pandas', 'NumPy', 'SciPy', 'TensorFlow', 'Keras', 'Scikit-learn', 'Data Mining', 'Data Visualization', 'Apache', 'Hive', 'Impala', 'NoSQL', 'Cassandra', 'HBase', 'Redis', 'Regression', 'Classification', 'Clustering', 'Neural Networks', 'Deep Learning', 'NLP', 'Computer Vision', 'A/B Testing', 'Statistical Analysis', 'Predictive Modeling', 'Data Warehousing', 'Dashboard', 'Business Intelligence', 'AWS S3', 'Google BigQuery', 'Snowflake'],
  devops: ['Docker', 'Kubernetes', 'AWS', 'Jenkins', 'Linux', 'Terraform', 'CI/CD', 'Monitoring', 'Python', 'Bash', 'Shell Scripting', 'Ansible', 'Puppet', 'Chef', 'GitOps', 'Infrastructure as Code', 'Container Orchestration', 'Azure', 'Google Cloud', 'Prometheus', 'Grafana', 'ELK Stack', 'Splunk', 'LogStash', 'Nginx', 'Apache', 'Tomcat', 'SSL/TLS', 'Networking', 'TCP/IP', 'DNS', 'Load Balancing', 'Virtualization', 'VMware', 'VirtualBox', 'Cloud Architecture', 'Disaster Recovery', 'Backup & Recovery', 'Performance Tuning', 'Scripting', 'Perl', 'Ruby', 'Git', 'SVN', 'Security', 'Firewall', 'VPN'],
  frontend: ['HTML', 'CSS', 'JavaScript', 'React', 'Vue.js', 'TypeScript', 'UI/UX', 'Responsive Design', 'Webpack', 'Sass', 'LESS', 'Bootstrap', 'Tailwind CSS', 'Material Design', 'Figma', 'Sketch', 'Adobe XD', 'Accessibility', 'WCAG', 'SEO', 'Performance', 'Lazy Loading', 'Code Splitting', 'Bundle Optimization', 'Angular', 'Ember.js', 'Next.js', 'Gatsby', 'Web Components', 'PWA', 'Service Workers', 'REST API', 'GraphQL', 'Fetch API', 'AJAX', 'Testing', 'Jest', 'Mocha', 'Cypress', 'Selenium', 'Git', 'npm', 'Yarn', 'Redux', 'Vuex', 'State Management', 'Form Validation', 'Mobile Responsive', 'Cross-browser Compatibility', 'Debugging'],
  marketing: ['Digital Marketing', 'SEO', 'SEM', 'Social Media Marketing', 'Email Marketing', 'Content Marketing', 'Google Analytics', 'Google Ads', 'Facebook Ads', 'LinkedIn', 'Twitter', 'Instagram', 'HubSpot', 'Mailchimp', 'CRM', 'Marketing Automation', 'A/B Testing', 'Conversion Optimization', 'Brand Management', 'Copywriting', 'Market Research', 'Competitor Analysis', 'Customer Acquisition', 'Retention', 'Lead Generation', 'Campaign Management', 'Budget Management', 'ROI', 'Metrics', 'KPI', 'Adobe Creative Suite', 'Photoshop', 'Illustrator', 'Premiere', 'Canva', 'Figma'],
  product: ['Product Management', 'Product Strategy', 'User Research', 'Market Analysis', 'Roadmapping', 'Agile', 'Scrum', 'Jira', 'Confluence', 'Wireframing', 'Prototyping', 'User Testing', 'A/B Testing', 'Analytics', 'Data-driven Decision Making', 'Stakeholder Management', 'Cross-functional Collaboration', 'OKR', 'Metrics', 'User Journey Mapping', 'Persona Development', 'Competitive Analysis', 'Sprint Planning', 'User Stories', 'Requirements Gathering', 'Technical Knowledge', 'SQL', 'API', 'Cloud Services', 'Mobile Development', 'Web Development', 'User Experience', 'Customer Feedback', 'Go-to-market Strategy']
};

// Extract text from PDF
async function extractTextFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  return pdfData.text;
}

// Calculate formatting score
function getFormattingScore(text) {
  let score = 0;
  const lines = text.split('\n');
  
  if (lines.length > 10) score += 15; // Good spacing
  if (text.length > 500) score += 15; // Detailed content
  if ((text.match(/\d{3}-\d{3}-\d{4}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).length > 0) score += 15; // Contact info
  if ((text.match(/\b(https?:\/\/[^\s]+|linkedin\.com\/in\/[^\s]+)\b/g) || []).length > 0) score += 15; // Links
  if (text.toLowerCase().includes('summary') || text.toLowerCase().includes('objective')) score += 10; // Professional summary
  if (text.toLowerCase().includes('achievement') || text.toLowerCase().includes('result')) score += 10; // Action words
  
  return Math.min(score, 100);
}

// Extract skills from resume
function extractSkills(text) {
  const skillPatterns = [
    /Skills?[\s:]*([^.]+(?:\n[^.]+)*)/gi,
    /Competencies?[\s:]*([^.]+(?:\n[^.]+)*)/gi
  ];
  
  let skills = [];
  for (const pattern of skillPatterns) {
    const match = text.match(pattern);
    if (match) {
      skills = match[0].split(/[,\n]/).filter(s => s.trim()).slice(1, 20);
      break;
    }
  }
  
  return skills.map(s => s.trim()).filter(s => s);
}

// Parse resume into sections
function parseSections(text) {
  const headings = ['summary', 'objective', 'education', 'experience', 'work experience', 'professional experience', 'skills', 'projects', 'certifications', 'awards', 'contact', 'publications'];
  const lines = text.split(/\r?\n/);
  const positions = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim().toLowerCase();
    const clean = l.replace(/[:\-\s]+$/,'');
    if (headings.includes(clean)) {
      positions.push({ heading: clean, index: i });
    }
  }

  // If no explicit headings, try to find common heading patterns
  if (positions.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (/^(education|experience|skills|projects|certificat|contact)/i.test(l)) {
        positions.push({ heading: l.toLowerCase().replace(/[^a-z ]/ig,''), index: i });
      }
    }
  }

  // Build sections by slicing between headings
  const sections = {};
  if (positions.length === 0) {
    // If still none, return whole text as 'full'
    sections.full = text;
    return sections;
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index + 1;
    const end = (i + 1 < positions.length) ? positions[i+1].index : lines.length;
    const name = positions[i].heading.replace(/\s+/g, ' ').trim();
    const content = lines.slice(start, end).join('\n').trim();
    sections[name] = content;
  }

  return sections;
}

// Analyze a single section for errors and improvements
function analyzeSectionContent(name, content) {
  const errors = [];
  const improvements = [];
  const c = (content || '').trim();

  if (!c) {
    errors.push('Section not found or empty');
    improvements.push(`Add a ${name} section with relevant details.`);
    return { errors, improvements };
  }

  switch (name) {
    case 'contact':
      if (!c.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)) errors.push('Missing email');
      if (!c.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)) errors.push('Missing phone number');
      if (!c.toLowerCase().includes('linkedin') && !c.toLowerCase().includes('github') && !c.toLowerCase().includes('portfolio')) improvements.push('Add LinkedIn and/or GitHub/portfolio link');
      break;
    case 'education':
      if (!c.match(/\b(degree|bachelor|master|phd|bs|ba|ms|mba)\b/i)) errors.push('Degree not specified');
      if (!c.match(/\b(\d{4}|graduat|gpa)\b/i)) improvements.push('Include graduation year and GPA if relevant');
      break;
    case 'experience':
    case 'work experience':
    case 'professional experience':
      if (!c.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i) && !c.match(/\d{4}/)) errors.push('Missing dates for roles');
      const bullets = c.split(/\n|\r/).filter(l => /^\s*[-•*]/.test(l));
      if (bullets.length === 0) improvements.push('Use bullet points for achievements under each role');
      const metrics = c.match(/\d+%|\$\d+|\b\d+\b members|\bteam of \d+/i) || [];
      if (metrics.length === 0) improvements.push('Add quantifiable metrics for impact (%, $, team size)');
      break;
    case 'skills':
      const skillsList = c.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      if (skillsList.length < 5) errors.push('Skills list appears short');
      if (skillsList.length > 0) improvements.push('Group skills by category: Languages, Frameworks, Tools, Platforms');
      break;
    case 'projects':
      const projects = c.split(/\n\s*\-\s*/).filter(Boolean);
      if (projects.length === 0) improvements.push('List projects with a short description, technologies used, and results');
      if (!c.toLowerCase().includes('github') && !c.toLowerCase().includes('deployed')) improvements.push('Include links or deployment details where possible');
      break;
    case 'summary':
    case 'objective':
      if (c.length < 50) improvements.push('Expand your summary to 2-4 sentences focusing on achievements and value');
      if (!c.match(/\b(experience|years|specializ|skilled|focused)\b/i)) improvements.push('Mention years of experience and top skills in the summary');
      break;
    default:
      // generic checks
      if (c.length < 30) improvements.push('Expand this section with more details');
  }

  return { errors, improvements };
}

// Get skill gap analysis
function getSkillGap(foundKeywords, keywords) {
  const missing = keywords.filter(k => !foundKeywords.includes(k));
  return {
    missing,
    coverage: Math.round((foundKeywords.length / keywords.length) * 100)
  };
}

// Get improvement tips
function getImprovementTips(text, foundKeywords, foundSections) {
  const tips = [];
  const textLower = text.toLowerCase();
  
  // Keywords analysis
  if (foundKeywords.length < 5) {
    tips.push('🔑 Critical: Add more industry-specific keywords. Your resume should mention 8-12 key skills relevant to the position.');
  } else if (foundKeywords.length < 8) {
    tips.push('🔑 Add 2-3 more relevant keywords to boost your keyword match percentage.');
  }
  
  // Section analysis
  if (!foundSections.includes('Education')) {
    tips.push('🎓 Missing Education section. Add degree, institution, graduation date, and GPA (if 3.5+).');
  }
  
  if (!foundSections.includes('Skills')) {
    tips.push('🛠️ Missing Skills section. Create a dedicated section with: Technical Skills, Tools/Software, and Soft Skills (leadership, communication).');
  }
  
  if (!foundSections.includes('Experience')) {
    tips.push('💼 Missing Experience section. Format as: Company Name | Position | Duration with 3-5 bullet points per role.');
  }
  
  if (!foundSections.includes('Projects')) {
    tips.push('📂 Missing Projects section. Add 2-3 notable projects with description, technologies used, and results.');
  }
  
  // Quantifiable metrics
  const metricsCount = (text.match(/\d+%|\$\d+|increased|improved|reduced|launched|deployed|managed \d+/gi) || []).length;
  if (metricsCount < 5) {
    tips.push('📊 Add quantifiable metrics: "increased revenue by 25%", "managed team of 5", "reduced load time by 30%", "deployed to 100k+ users".');
  }
  
  // Action verbs
  const actionVerbs = text.match(/\b(led|managed|designed|developed|created|implemented|achieved|increased|improved|reduced|optimized|automated|collaborated|coordinated|established|directed|launched|delivered|resolved|enhanced|accelerated|expanded|pioneered|spearheaded)\b/gi) || [];
  if (actionVerbs.length < 10) {
    tips.push('⚡ Use strong action verbs: Led, Managed, Designed, Developed, Implemented, Achieved, Increased, Optimized, Automated, Collaborated.');
  }
  
  // Length analysis
  if (text.length < 400) {
    tips.push('📝 Resume appears too short. Expand to 400+ characters with detailed descriptions of your achievements and responsibilities.');
  }
  
  // Contact info
  if (!textLower.includes('phone') && !text.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)) {
    tips.push('📞 Add phone number in format: (555) 123-4567 or 555-123-4567.');
  }
  
  if (!text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)) {
    tips.push('📧 Add email address in the header (e.g., firstname.lastname@email.com).');
  }
  
  // Links
  if (!textLower.includes('linkedin') && !textLower.includes('github') && !textLower.includes('portfolio')) {
    tips.push('🔗 Add professional links: LinkedIn profile and/or GitHub repo or portfolio website.');
  }
  
  // Achievements vs Responsibilities
  if (!text.match(/\b(achieved|accomplished|attained|earned|won|received|awarded|recognized)\b/gi)) {
    tips.push('🏆 Focus on achievements, not just responsibilities. Use: "Achieved", "Accomplished", "Earned", "Won", "Received".');
  }
  
  // Technical depth
  if (!textLower.includes('framework') && !textLower.includes('library') && !textLower.includes('tool') && !textLower.includes('api')) {
    tips.push('🔧 Specify tools and frameworks: React, Django, Spring Boot, AWS Lambda, Docker containers, etc.');
  }
  
  // Experience duration
  if (!text.match(/years?|months?|2019|2020|2021|2022|2023|2024|2025/i)) {
    tips.push('📅 Include dates for all positions. Use format: "Jan 2020 - Present" for clear timeline.');
  }
  
  // Formatting suggestions
  if (text.length > 1500) {
    tips.push('✂️ Resume is lengthy. Condense to keep it to 1-2 pages. Focus on recent, relevant experience.');
  }
  
  return tips.slice(0, 10); // Return top 10 tips
}

// AI suggestions handled in frontend — no external API needed
async function getAISuggestions() {
  return '';
}

// Main analyze endpoint
app.post('/analyze', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    const jobDescription = req.body.jobDescription || '';
    const customKeywords = req.body.customKeywords ? req.body.customKeywords.split(',').map(k => k.trim()) : [];

    let resumeText = '';
    try {
      resumeText = await extractTextFromPDF(filePath);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to read PDF' });
    }

    // Use custom keywords or default tech keywords
    const selectedIndustry = req.body.industry && industryKeywords[req.body.industry] ? req.body.industry : 'tech';
    const keywords = customKeywords.length > 0 ? customKeywords : industryKeywords[selectedIndustry];
    const foundKeywords = keywords.filter(k => resumeText.toLowerCase().includes(k.toLowerCase()));

    // Check sections
    const sections = ['Education', 'Experience', 'Skills', 'Projects'];
    const foundSections = sections.filter(s => resumeText.includes(s));
    const sectionScore = (foundSections.length / sections.length) * 25;

    // Calculate keyword score
    const keywordScore = (foundKeywords.length / keywords.length) * 50;

    // Get formatting score
    const formattingScore = getFormattingScore(resumeText) * 0.15;

    // Extract skills from resume
    const extractedSkills = extractSkills(resumeText);

    // Get skill gap
    const skillGap = getSkillGap(foundKeywords, keywords);

    // Get improvement tips
    const improvementTips = getImprovementTips(resumeText, foundKeywords, foundSections);

    // Calculate total score
    const totalScore = Math.round(keywordScore + sectionScore + formattingScore);

    // Get AI suggestions
    const aiSuggestions = await getAISuggestions(resumeText, jobDescription);

    // If job description provided, calculate job match percentage
    let jobMatchScore = null;
    if (jobDescription) {
      const jobKeywords = jobDescription.split(/\s+/).filter(w => w.length > 4);
      const matched = jobKeywords.filter(k => resumeText.toLowerCase().includes(k.toLowerCase())).length;
      jobMatchScore = Math.round((matched / Math.min(jobKeywords.length, 50)) * 100);
    }

    // Per-section analysis
    const parsedSections = parseSections(resumeText);
    const sectionAnalysis = {};
    for (const name in parsedSections) {
      sectionAnalysis[name] = analyzeSectionContent(name, parsedSections[name]);
    }

    // Clean up uploaded file
    fs.unlink(filePath, err => {
      if (err) console.error('File deletion error:', err);
    });

    res.json({
      score: totalScore,
      foundKeywords,
      foundSections,
      parsedSections,
      sectionAnalysis,
      extractedSkills,
      skillGap,
      formattingScore: Math.round(getFormattingScore(resumeText)),
      improvementTips,
      aiSuggestions,
      jobMatchScore,
      breakdown: {
        keywordScore: Math.round(keywordScore),
        sectionScore: Math.round(sectionScore),
        formattingScore: Math.round(formattingScore)
      }
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Endpoint for multiple resume comparison
app.post('/compare', upload.array('resumes', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'Minimum 2 resumes required to compare' });
    }
    if (req.files.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 resumes allowed' });
    }

    const keywords = req.body.customKeywords ? req.body.customKeywords.split(',').map(k => k.trim()) : industryKeywords.tech;
    const results = [];

    for (const file of req.files) {
      try {
        const text = await extractTextFromPDF(file.path);
        const foundKeywords = keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
        const sections = ['Education', 'Experience', 'Skills', 'Projects'];
        const foundSections = sections.filter(s => text.includes(s));
        const score = Math.round(
          (foundKeywords.length / keywords.length) * 50 +
          (foundSections.length / sections.length) * 25 +
          (getFormattingScore(text) * 0.15)
        );

        results.push({
          filename: file.originalname,
          score,
          keywordMatch: foundKeywords.length,
          sections: foundSections
        });

        fs.unlink(file.path, err => {});
      } catch (err) {
        console.error(`Error processing ${file.originalname}:`, err);
      }
    }

    results.sort((a, b) => b.score - a.score);
    res.json({ comparison: results });
  } catch (err) {
    console.error('Comparison error:', err);
    res.status(500).json({ error: 'Comparison failed' });
  }
});

// Industry keywords suggestions
app.get('/keywords/:industry', (req, res) => {
  const industry = req.params.industry.toLowerCase();
  const keywords = industryKeywords[industry] || industryKeywords.tech;
  res.json({ keywords });
});

// Generate report endpoint
app.post('/generate-report', (req, res) => {
  const report = req.body;
  const timestamp = new Date().toISOString();

  const reportContent = {
    timestamp,
    atsScore: report.score,
    breakdown: report.breakdown,
    matchedKeywords: report.foundKeywords,
    missingKeywords: report.skillGap.missing,
    formattingScore: report.formattingScore,
    foundSections: report.foundSections,
    extractedSkills: report.extractedSkills,
    skillCoverage: report.skillGap.coverage,
    jobMatchScore: report.jobMatchScore,
    improvementTips: report.improvementTips,
    aiSuggestions: report.aiSuggestions
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="resume-report.json"');
  res.json(reportContent);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});