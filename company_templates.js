export const generateCompanyCard = (company) => `
  <div class="company-card">
    <div class="company-header">
      <img src="${company.companylog || 'https://via.placeholder.com/48x48/1a1a1a/00ff88?text=' + (company._id ? company._id.charAt(0) : 'C')}" alt="Company Logo" class="company-logo"/>
      <div class="company-info">
        <h3 class="company-name">
          <a href="/company/${encodeURIComponent(company._id)}">${company._id}</a>
        </h3>
        <p class="job-count">${company.count} job${company.count > 1 ? 's' : ''} available</p>
      </div>
    </div>
    <div class="company-actions">
      <a href="/company/${encodeURIComponent(company._id)}" class="view-jobs-btn">View Jobs</a>
      ${company.companyLink ? `<a href="${company.companyLink}" target="_blank" class="company-website-btn">Company Website</a>` : ''}
    </div>
  </div>
`;

export const generateCompanyPagination = (page, totalPages) => {
  const baseUrl = `/company`;
  
  let pagination = `<div class="pagination">`;

  if (page > 1) {
    pagination += `<a href="${baseUrl}?page=${page - 1}" class="page-btn">« Prev</a>`;
  }

  if (page > 3) {
    pagination += `<a href="${baseUrl}?page=1" class="page-btn">1</a>`;
    if (page > 4) pagination += `<span class="ellipsis">...</span>`;
  }

  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);

  for (let i = startPage; i <= endPage; i++) {
    if (i === page) {
      pagination += `<span class="page-btn active">${i}</span>`;
    } else {
      pagination += `<a href="${baseUrl}?page=${i}" class="page-btn">${i}</a>`;
    }
  }

  if (page < totalPages - 2) {
    if (page < totalPages - 3) pagination += `<span class="ellipsis">...</span>`;
    pagination += `<a href="${baseUrl}?page=${totalPages}" class="page-btn">${totalPages}</a>`;
  }

  if (page < totalPages) {
    pagination += `<a href="${baseUrl}?page=${page + 1}" class="page-btn">Next »</a>`;
  }

  pagination += `</div>`;
  return pagination;
};

export const generateCompanyJobsPagination = (page, totalPages, companyName) => {
  const baseUrl = `/company/${encodeURIComponent(companyName)}`;
  
  let pagination = `<div class="pagination">`;

  if (page > 1) {
    pagination += `<a href="${baseUrl}?page=${page - 1}" class="page-btn">« Prev</a>`;
  }

  if (page > 3) {
    pagination += `<a href="${baseUrl}?page=1" class="page-btn">1</a>`;
    if (page > 4) pagination += `<span class="ellipsis">...</span>`;
  }

  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);

  for (let i = startPage; i <= endPage; i++) {
    if (i === page) {
      pagination += `<span class="page-btn active">${i}</span>`;
    } else {
      pagination += `<a href="${baseUrl}?page=${i}" class="page-btn">${i}</a>`;
    }
  }

  if (page < totalPages - 2) {
    if (page < totalPages - 3) pagination += `<span class="ellipsis">...</span>`;
    pagination += `<a href="${baseUrl}?page=${totalPages}" class="page-btn">${totalPages}</a>`;
  }

  if (page < totalPages) {
    pagination += `<a href="${baseUrl}?page=${page + 1}" class="page-btn">Next »</a>`;
  }

  pagination += `</div>`;
  return pagination;
};

export const generateCompanyHTML = (data) => {
  const { page, totalCompanies, companyCards, pagination } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Companies - LinkedIn Jobs Database</title>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-primary: #0a0a0a;
          --bg-secondary: #111;
          --bg-tertiary: #1a1a1a;
          --text-primary: #e0e0e0;
          --text-secondary: #bbbbbb;
          --text-tertiary: #aaaaaa;
          --text-muted: #888;
          --border-primary: #222;
          --border-secondary: #333;
          --border-accent: #444;
          --accent-primary: #00ff88;
          --accent-secondary: #00d4ff;
          --accent-gradient: linear-gradient(135deg, #00ff88, #00d4ff);
          --shadow-primary: rgba(0, 0, 0, 0.1);
          --shadow-accent: rgba(0, 255, 136, 0.3);
        }
        
        [data-theme="light"] {
          --bg-primary: #ffffff;
          --bg-secondary: #f8f9fa;
          --bg-tertiary: #ffffff;
          --text-primary: #333333;
          --text-secondary: #555555;
          --text-tertiary: #666666;
          --text-muted: #888888;
          --border-primary: #e1e5e9;
          --border-secondary: #d1d5db;
          --border-accent: #9ca3af;
          --accent-primary: #2563eb;
          --accent-secondary: #3b82f6;
          --accent-gradient: linear-gradient(135deg, #2563eb, #3b82f6);
          --shadow-primary: rgba(0, 0, 0, 0.1);
          --shadow-accent: rgba(37, 99, 235, 0.3);
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
          line-height: 1.6;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        .navbar {
          background: var(--bg-primary);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-primary);
          padding: 1rem 0;
          position: sticky;
          top: 0;
          z-index: 100;
          transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        
        .nav-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .logo {
          font-family: 'JetBrains Mono', monospace;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--accent-primary);
          text-decoration: none;
          transition: color 0.3s ease;
        }
        
        .nav-links {
          display: flex;
          gap: 2rem;
          align-items: center;
        }
        
        .nav-links a {
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s ease;
        }
        
        .nav-links a:hover, .nav-links a.active {
          color: var(--accent-primary);
        }
        
        .company-count {
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-tertiary);
          font-size: 0.9rem;
        }
        
        .theme-toggle {
          background: var(--bg-secondary);
          border: 1px solid var(--border-secondary);
          color: var(--text-primary);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .theme-toggle:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-accent);
        }
        
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .hero {
          text-align: center;
          padding: 1rem 0;
        }
        
        .hero h1 {
          font-size: 3.5rem;
          font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .hero p {
          font-size: 1.2rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto;
        }
        
        .companies-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        
        .company-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 1.5rem;
          transition: all 0.2s ease;
          position: relative;
        }
        
        .company-card:hover {
          border-color: var(--border-secondary);
          background: var(--bg-tertiary);
          transform: translateY(-2px);
        }
        
        .company-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--accent-gradient);
          border-radius: 8px 0 0 8px;
        }
        
        .company-header {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .company-logo {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid var(--border-secondary);
        }
        
        .company-info {
          flex: 1;
        }
        
        .company-name {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .company-name a {
          color: var(--text-primary);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        
        .company-name a:hover {
          color: var(--accent-primary);
        }
        
        .job-count {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        
        .company-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .view-jobs-btn, .company-website-btn {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.2s ease;
          text-align: center;
        }
        
        .view-jobs-btn {
          background: var(--accent-gradient);
          color: #000;
        }
        
        .view-jobs-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px var(--shadow-accent);
        }
        
        .company-website-btn {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-secondary);
        }
        
        .company-website-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border-color: var(--border-accent);
        }
        
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          margin: 3rem 0;
        }
        
        .page-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-accent);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          transition: all 0.2s ease;
          min-width: 40px;
          text-align: center;
        }
        
        .page-btn:hover {
          border-color: var(--border-secondary);
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }
        
        .page-btn.active {
          background: var(--accent-gradient);
          color: #000;
          border-color: transparent;
        }
        
        .ellipsis {
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }
        
        .footer {
          text-align: center;
          padding: 2rem 0;
          border-top: 1px solid var(--border-primary);
          color: var(--text-tertiary);
          font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 1rem;
          }
          
          .hero h1 {
            font-size: 2.5rem;
          }
          
          .companies-container {
            grid-template-columns: 1fr;
          }
          
          .company-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .company-actions {
            justify-content: center;
          }
        }
      </style>
    </head>
    <body>
      <nav class="navbar">
        <div class="nav-content">
          <a href="/view" class="logo">LinkedIn Jobs</a>
          <div class="nav-links">
            <a href="/view">Jobs</a>
            <a href="/company" class="active">Companies</a>
            <div class="company-count">${totalCompanies.toLocaleString()} companies</div>
            <button class="theme-toggle" onclick="toggleTheme()">
              <span id="theme-icon">🌙</span>
              <span id="theme-text">Dark</span>
            </button>
          </div>
        </div>
      </nav>
      
      <div class="hero">
        <h1>Companies</h1>
        <p>Browse all companies with available job positions</p>
      </div>
      
      <div class="container">
        <div class="companies-container">
          ${companyCards}
        </div>
        
        ${pagination}
      </div>
      
      <div class="footer">
        <p>LinkedIn Jobs Database - Browse companies and their job listings</p>
      </div>
      
      <script>
        // Theme management
        function getTheme() {
          return localStorage.getItem('theme') || 'dark';
        }
        
        function setTheme(theme) {
          localStorage.setItem('theme', theme);
          document.documentElement.setAttribute('data-theme', theme);
          updateThemeUI(theme);
        }
        
        function updateThemeUI(theme) {
          const themeIcon = document.getElementById('theme-icon');
          const themeText = document.getElementById('theme-text');
          
          if (theme === 'light') {
            themeIcon.textContent = '☀️';
            themeText.textContent = 'Light';
          } else {
            themeIcon.textContent = '🌙';
            themeText.textContent = 'Dark';
          }
        }
        
        function toggleTheme() {
          const currentTheme = getTheme();
          const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
          setTheme(newTheme);
        }
        
        // Initialize theme on page load
        document.addEventListener('DOMContentLoaded', function() {
          const savedTheme = getTheme();
          setTheme(savedTheme);
        });
      </script>
    </body>
    </html>
  `;
};

export const generateCompanyJobsHTML = (data) => {
  const { companyName, companyInfo, page, totalJobs, jobCards, pagination } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${companyName} Jobs - LinkedIn Jobs Database</title>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-primary: #0a0a0a;
          --bg-secondary: #111;
          --bg-tertiary: #1a1a1a;
          --text-primary: #e0e0e0;
          --text-secondary: #bbbbbb;
          --text-tertiary: #aaaaaa;
          --text-muted: #888;
          --border-primary: #222;
          --border-secondary: #333;
          --border-accent: #444;
          --accent-primary: #00ff88;
          --accent-secondary: #00d4ff;
          --accent-gradient: linear-gradient(135deg, #00ff88, #00d4ff);
          --shadow-primary: rgba(0, 0, 0, 0.1);
          --shadow-accent: rgba(0, 255, 136, 0.3);
        }
        
        [data-theme="light"] {
          --bg-primary: #ffffff;
          --bg-secondary: #f8f9fa;
          --bg-tertiary: #ffffff;
          --text-primary: #333333;
          --text-secondary: #555555;
          --text-tertiary: #666666;
          --text-muted: #888888;
          --border-primary: #e1e5e9;
          --border-secondary: #d1d5db;
          --border-accent: #9ca3af;
          --accent-primary: #2563eb;
          --accent-secondary: #3b82f6;
          --accent-gradient: linear-gradient(135deg, #2563eb, #3b82f6);
          --shadow-primary: rgba(0, 0, 0, 0.1);
          --shadow-accent: rgba(37, 99, 235, 0.3);
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
          line-height: 1.6;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        .navbar {
          background: var(--bg-primary);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-primary);
          padding: 1rem 0;
          position: sticky;
          top: 0;
          z-index: 100;
          transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        
        .nav-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .logo {
          font-family: 'JetBrains Mono', monospace;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--accent-primary);
          text-decoration: none;
          transition: color 0.3s ease;
        }
        
        .nav-links {
          display: flex;
          gap: 2rem;
          align-items: center;
        }
        
        .nav-links a {
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s ease;
        }
        
        .nav-links a:hover, .nav-links a.active {
          color: var(--accent-primary);
        }
        
        .job-count {
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-tertiary);
          font-size: 0.9rem;
        }
        
        .theme-toggle {
          background: var(--bg-secondary);
          border: 1px solid var(--border-secondary);
          color: var(--text-primary);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .theme-toggle:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-accent);
        }
        
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .company-header {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        
        .company-logo {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid var(--border-secondary);
        }
        
        .company-details h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .company-details p {
          color: var(--text-secondary);
          font-size: 1.1rem;
        }
        
        .company-actions {
          margin-left: auto;
          display: flex;
          gap: 1rem;
        }
        
        .back-btn, .website-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .back-btn {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-secondary);
        }
        
        .back-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border-color: var(--border-accent);
        }
        
        .website-btn {
          background: var(--accent-gradient);
          color: #000;
        }
        
        .website-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px var(--shadow-accent);
        }
        
        .jobs-container {
          display: grid;
          gap: 1rem;
          margin-bottom: 3rem;
        }
        
        .job-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 1.5rem;
          transition: all 0.2s ease;
          position: relative;
        }
        
        .job-card:hover {
          border-color: var(--border-secondary);
          background: var(--bg-tertiary);
          transform: translateY(-2px);
        }
        
        .job-card.visited {
          opacity: 0.7;
          border-color: var(--accent-primary);
          background: var(--bg-tertiary);
        }
        
        .job-card.visited .job-title a {
          color: var(--text-muted);
        }
        
        .job-card.visited::before {
          background: var(--accent-secondary);
        }
        
        .job-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--accent-gradient);
          border-radius: 8px 0 0 8px;
        }
        
        .job-header {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .company-logo {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid var(--border-secondary);
        }
        
        .job-info {
          flex: 1;
        }
        
        .job-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .job-title a {
          color: var(--text-primary);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        
        .job-title a:hover {
          color: var(--accent-primary);
        }
        
        .company-name {
          color: var(--accent-secondary);
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        
        .company-name a {
          color: var(--accent-secondary);
          text-decoration: none;
        }
        
        .company-name a:hover {
          text-decoration: underline;
        }
        
        .job-industry {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        
        .job-location {
          color: var(--text-tertiary);
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .job-footer {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-primary);
        }
        
        .job-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-family: 'JetBrains Mono', monospace;
        }
        
        .job-meta-icon {
          width: 14px;
          height: 14px;
          opacity: 0.7;
        }
        
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          margin: 3rem 0;
        }
        
        .page-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-accent);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          transition: all 0.2s ease;
          min-width: 40px;
          text-align: center;
        }
        
        .page-btn:hover {
          border-color: var(--border-secondary);
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }
        
        .page-btn.active {
          background: var(--accent-gradient);
          color: #000;
          border-color: transparent;
        }
        
        .ellipsis {
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }
        
        .footer {
          text-align: center;
          padding: 2rem 0;
          border-top: 1px solid var(--border-primary);
          color: var(--text-tertiary);
          font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 1rem;
          }
          
          .company-header {
            flex-direction: column;
            text-align: center;
          }
          
          .company-actions {
            margin-left: 0;
            justify-content: center;
          }
          
          .company-details h1 {
            font-size: 2rem;
          }
          
          .job-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .job-footer {
            justify-content: center;
          }
        }
      </style>
    </head>
    <body>
      <nav class="navbar">
        <div class="nav-content">
          <a href="/view" class="logo">LinkedIn Jobs</a>
          <div class="nav-links">
            <a href="/view">Jobs</a>
            <a href="/company">Companies</a>
            <div class="job-count">${totalJobs.toLocaleString()} positions</div>
            <button class="theme-toggle" onclick="toggleTheme()">
              <span id="theme-icon">🌙</span>
              <span id="theme-text">Dark</span>
            </button>
          </div>
        </div>
      </nav>
      
      <div class="container">
        <div class="company-header">
          <img src="${companyInfo?.companylog || 'https://via.placeholder.com/80x80/1a1a1a/00ff88?text=' + (companyName ? companyName.charAt(0) : 'C')}" alt="Company Logo" class="company-logo"/>
          <div class="company-details">
            <h1>${companyName}</h1>
            <p>${totalJobs} job${totalJobs > 1 ? 's' : ''} available</p>
          </div>
          <div class="company-actions">
            <a href="/company" class="back-btn">← Back to Companies</a>
            ${companyInfo?.companyLink ? `<a href="${companyInfo.companyLink}" target="_blank" class="website-btn">Company Website</a>` : ''}
          </div>
        </div>

        <div class="jobs-container">
          ${jobCards}
        </div>
        
        ${pagination}
      </div>
      
      <div class="footer">
        <p>LinkedIn Jobs Database - ${companyName} job listings</p>
      </div>
      
      <script>
        // Theme management
        function getTheme() {
          return localStorage.getItem('theme') || 'dark';
        }
        
        function setTheme(theme) {
          localStorage.setItem('theme', theme);
          document.documentElement.setAttribute('data-theme', theme);
          updateThemeUI(theme);
        }
        
        function updateThemeUI(theme) {
          const themeIcon = document.getElementById('theme-icon');
          const themeText = document.getElementById('theme-text');
          
          if (theme === 'light') {
            themeIcon.textContent = '☀️';
            themeText.textContent = 'Light';
          } else {
            themeIcon.textContent = '🌙';
            themeText.textContent = 'Dark';
          }
        }
        
        function toggleTheme() {
          const currentTheme = getTheme();
          const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
          setTheme(newTheme);
        }
        
        // Initialize theme on page load
        document.addEventListener('DOMContentLoaded', function() {
          const savedTheme = getTheme();
          setTheme(savedTheme);
          loadVisitedJobs();
        });
        
        // Visited jobs tracking
        function getVisitedJobs() {
          return JSON.parse(localStorage.getItem('visitedJobs') || '[]');
        }
        
        function saveVisitedJobs(jobIds) {
          localStorage.setItem('visitedJobs', JSON.stringify(jobIds));
        }
        
        function markAsVisited(jobId) {
          const visitedJobs = getVisitedJobs();
          if (!visitedJobs.includes(jobId)) {
            visitedJobs.push(jobId);
            saveVisitedJobs(visitedJobs);
          }
          updateVisitedStyles();
        }
        
        function loadVisitedJobs() {
          const visitedJobs = getVisitedJobs();
          visitedJobs.forEach(jobId => {
            const jobCard = document.querySelector(\`[data-job-id="\${jobId}"]\`);
            if (jobCard) {
              jobCard.classList.add('visited');
            }
          });
        }
        
        function updateVisitedStyles() {
          const visitedJobs = getVisitedJobs();
          visitedJobs.forEach(jobId => {
            const jobCard = document.querySelector(\`[data-job-id="\${jobId}"]\`);
            if (jobCard) {
              jobCard.classList.add('visited');
            }
          });
        }
      </script>
    </body>
    </html>
  `;
};
