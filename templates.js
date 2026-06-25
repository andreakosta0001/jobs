import { DateTime } from 'luxon';

const escapeAttribute = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export const formatPST = (dateStr) => {
  if (!dateStr) return "N/A";
  return DateTime.fromISO(dateStr, { zone: "utc" }).setZone("America/Los_Angeles").toFormat("yyyy/MM/dd HH:mm:ss");
};

export const getRelativeTime = (dateStr) => {
  if (!dateStr) return "N/A";

  const postedTime = DateTime.fromISO(dateStr, { zone: "utc" });
  const now = DateTime.utc();
  const diff = now.diff(postedTime, ['years', 'months', 'weeks', 'days', 'hours', 'minutes']);

  const { years, months, weeks, days, hours, minutes } = diff.toObject();

  if (years >= 1) {
    return `${Math.floor(years)} year${Math.floor(years) > 1 ? 's' : ''} ago`;
  } else if (months >= 1) {
    return `${Math.floor(months)} month${Math.floor(months) > 1 ? 's' : ''} ago`;
  } else if (weeks >= 1) {
    return `${Math.floor(weeks)} week${Math.floor(weeks) > 1 ? 's' : ''} ago`;
  } else if (days >= 1) {
    return `${Math.floor(days)} day${Math.floor(days) > 1 ? 's' : ''} ago`;
  } else if (hours >= 1) {
    return `${Math.floor(hours)} hour${Math.floor(hours) > 1 ? 's' : ''} ago`;
  } else if (minutes >= 1) {
    return `${Math.floor(minutes)} minute${Math.floor(minutes) > 1 ? 's' : ''} ago`;
  } else {
    return "Just now";
  }
};

export const generateJobCard = (job) => `
  <div class="job-card" data-job-id="${job.postId}" data-job-updated="${job.updatedAt ? job.updatedAt.toISOString() : ''}">
    <div class="job-header">
      <img src="${job.companylog || 'https://via.placeholder.com/48x48/1a1a1a/00ff88?text=' + (job.company ? job.company.charAt(0) : 'J')}" alt="Company Logo" class="company-logo"/>
      <div class="job-info">
        <h3 class="job-title"><a href="${job.joblink}" target="_blank" onclick="markAsVisited(${job.postId})">${job.title || 'Untitled Position'}</a></h3>
        <p class="company-name"><a href="${job.companyLink || '#'}" target="_blank">${job.company || 'Unknown Company'}</a></p>
        <p class="job-industry">${job.designation || 'Industry not specified'}</p>
        <p class="job-location">📍 ${job.location || 'Location not specified'}</p>
      </div>
    </div>
    <div class="job-footer">
      <div class="job-meta">
        <span class="job-meta-icon">👥</span>
        <span>${job.e_count ? job.e_count.toLocaleString() + ' employees' : 'Size unknown'}</span>
      </div>
      <div class="job-meta">
        <span class="job-meta-icon">👀</span>
        <span>${job.followersCount ? job.followersCount.toLocaleString() + ' followers' : 'Followers unknown'}</span>
      </div>
      <div class="job-meta">
        <span class="job-meta-icon">⏰</span>
        <span>Posted: ${formatPST(job.postedtime)} (${getRelativeTime(job.postedtime)})</span>
      </div>
    </div>
  </div>
`;

export const generatePagination = (page, totalPages, queryParams, pagePath = '/view') => {
  const { empMax, companyQuery, titleQuery, locationQuery, lastday, industries, industryMode } = queryParams;
  const params = new URLSearchParams();

  if (empMax) params.set('emp', String(empMax));
  if (companyQuery) params.set('company', companyQuery);
  if (titleQuery) params.set('title', titleQuery);
  if (locationQuery) params.set('location', locationQuery);
  if (lastday) params.set('lastday', String(lastday));
  if (industries && industries.length > 0) {
    params.set('industries', industries.join(','));
    params.set('industryMode', industryMode);
  }

  const baseUrl = `${pagePath}?${params.toString()}`;
  const pageSeparator = params.size > 0 ? '&' : '';

  let pagination = `<div class="pagination">`;

  if (page > 1) {
    pagination += `<a href="${baseUrl}${pageSeparator}page=${page - 1}" class="page-btn">« Prev</a>`;
  }

  if (page > 3) {
    pagination += `<a href="${baseUrl}${pageSeparator}page=1" class="page-btn">1</a>`;
    if (page > 4) pagination += `<span class="ellipsis">...</span>`;
  }

  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);

  for (let i = startPage; i <= endPage; i++) {
    if (i === page) {
      pagination += `<span class="page-btn active">${i}</span>`;
    } else {
      pagination += `<a href="${baseUrl}${pageSeparator}page=${i}" class="page-btn">${i}</a>`;
    }
  }

  if (page < totalPages - 2) {
    if (page < totalPages - 3) pagination += `<span class="ellipsis">...</span>`;
    pagination += `<a href="${baseUrl}${pageSeparator}page=${totalPages}" class="page-btn">${totalPages}</a>`;
  }

  if (page < totalPages) {
    pagination += `<a href="${baseUrl}${pageSeparator}page=${page + 1}" class="page-btn">Next »</a>`;
  }

  pagination += `</div>`;
  return pagination;
};

export const generateHTML = (data) => {
  const {
    page,
    totalJobs,
    totalPages,
    jobCards,
    pagination = '',
    useInfiniteScroll = true,
    pageVariant = useInfiniteScroll ? 'view' : 'page',
    queryParams
  } = data;
  const { empMax, companyQuery, titleQuery, locationQuery, lastday, industries, industryMode } = queryParams;
  const isIndexMode = pageVariant === 'index';
  const jobsPath = isIndexMode ? '/index' : (useInfiniteScroll ? '/view' : '/page');
  const hasActiveFilters = Boolean(
    empMax || companyQuery || titleQuery || locationQuery || lastday || (industries && industries.length > 0)
  );
  const dateFilterLabels = {
    0: 'Date posted',
    1: 'Past 24 hours',
    3: 'Past 3 days',
    7: 'Past week',
    14: 'Past 2 weeks',
    30: 'Past month'
  };
  const dateFilterLabel = dateFilterLabels[lastday] || 'Date posted';
  const recentJobsParams = new URLSearchParams();
  if (empMax) recentJobsParams.set('emp', String(empMax));
  if (companyQuery) recentJobsParams.set('company', companyQuery);
  if (titleQuery) recentJobsParams.set('title', titleQuery);
  if (locationQuery) recentJobsParams.set('location', locationQuery);
  if (industries && industries.length > 0) {
    recentJobsParams.set('industries', industries.join(','));
    recentJobsParams.set('industryMode', industryMode);
  }
  recentJobsParams.set('lastday', '1');
  const recentJobsUrl = `/page?${recentJobsParams.toString()}`;
  const currentYear = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isIndexMode ? 'LinkedIn Job Board - Remote US Roles' : 'LinkedIn Jobs Database'} - Page ${page}</title>
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
          --selection-bg: #132a3a;
          --linkedin-blue: #0a66c2;
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
          --selection-bg: #eef3f8;
          --linkedin-blue: #0a66c2;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
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

        .auto-refresh-control {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          color: var(--text-secondary);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.82rem;
          cursor: pointer;
          user-select: none;
        }

        .auto-refresh-control input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .auto-refresh-switch {
          position: relative;
          width: 38px;
          height: 22px;
          flex: 0 0 38px;
          border: 1px solid var(--border-accent);
          border-radius: 11px;
          background: var(--bg-tertiary);
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .auto-refresh-switch::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--text-muted);
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .auto-refresh-control input:checked + .auto-refresh-switch {
          border-color: var(--linkedin-blue);
          background: var(--linkedin-blue);
        }

        .auto-refresh-control input:checked + .auto-refresh-switch::after {
          transform: translateX(16px);
          background: #fff;
        }

        .auto-refresh-control input:focus-visible + .auto-refresh-switch {
          outline: 2px solid var(--linkedin-blue);
          outline-offset: 2px;
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

        .filters {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 3rem;
          transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        .filters h2 {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
          font-weight: 600;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr) auto;
          gap: 1rem;
          align-items: end;
        }

        .industry-filter {
          grid-column: 1 / -1;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-primary);
        }

        .industry-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          align-items: center;
        }

        .industry-mode {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .industry-mode input[type="radio"] {
          margin-right: 0.25rem;
        }

        .industry-mode label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .industry-checkboxes {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
          padding: 1rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 4px;
        }

        /* Custom scrollbar for industry checkboxes */
        .industry-checkboxes::-webkit-scrollbar {
          width: 8px;
        }

        .industry-checkboxes::-webkit-scrollbar-track {
          background: var(--bg-secondary);
          border-radius: 4px;
        }

        .industry-checkboxes::-webkit-scrollbar-thumb {
          background: var(--border-accent);
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .industry-checkboxes::-webkit-scrollbar-thumb:hover {
          background: var(--accent-primary);
        }

        /* Firefox scrollbar styling */
        .industry-checkboxes {
          scrollbar-width: thin;
          scrollbar-color: var(--border-accent) var(--bg-secondary);
        }

        .industry-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .industry-checkbox input[type="checkbox"] {
          margin: 0;
        }

        .industry-checkbox label {
          cursor: pointer;
          flex: 1;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .filter-group label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-group input,
        .filter-group select {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-accent);
          color: var(--text-primary);
          padding: 0.75rem 1rem;
          border-radius: 4px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }

        .filter-group input:focus,
        .filter-group select:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 2px var(--shadow-accent);
        }

        .filter-actions {
          display: flex;
          gap: 0.5rem;
          align-items: end;
        }

        .search-btn {
          background: var(--accent-gradient);
          color: #000;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.95rem;
          height: 48px;
        }

        .search-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px var(--shadow-accent);
        }

        .clear-btn {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-secondary);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          text-decoration: none;
          transition: all 0.2s ease;
          font-size: 0.85rem;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .clear-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border-color: var(--border-accent);
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

        .job-board-layout {
          display: grid;
          grid-template-columns: minmax(340px, 42%) minmax(0, 1fr);
          align-items: start;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          overflow: clip;
          min-height: 640px;
        }

        .job-list-pane {
          min-width: 0;
          border-right: 1px solid var(--border-primary);
          background: var(--bg-secondary);
        }

        .paged-mode .jobs-container {
          gap: 0;
          margin-bottom: 0;
        }

        .paged-mode .job-card {
          border: 0;
          border-bottom: 1px solid var(--border-primary);
          border-radius: 0;
          padding: 1rem 1.25rem;
          cursor: pointer;
          outline-offset: -3px;
        }

        .paged-mode .job-card::before {
          display: none;
        }

        .paged-mode .job-card:hover {
          transform: none;
          background: var(--bg-tertiary);
        }

        .paged-mode .job-card.selected {
          padding-left: calc(1.25rem - 4px);
          border-left: 4px solid var(--linkedin-blue);
          background: var(--selection-bg);
        }

        .paged-mode .job-card.visited {
          opacity: 1;
        }

        .paged-mode .job-card.selected .job-title a,
        .paged-mode .job-card .job-title a {
          color: var(--text-primary);
        }

        .paged-mode .job-header {
          margin-bottom: 0.5rem;
        }

        .paged-mode .job-industry {
          display: none;
        }

        .paged-mode .job-footer {
          margin: 0 0 0 64px;
          padding: 0;
          border: 0;
        }

        .paged-mode .job-meta:not(:last-child) {
          display: none;
        }

        .paged-mode .job-meta:last-child .job-meta-icon {
          display: none;
        }

        .job-detail-panel {
          position: sticky;
          top: 82px;
          align-self: start;
          height: calc(100vh - 104px);
          min-height: 640px;
          overflow-y: auto;
          background: var(--bg-secondary);
          scrollbar-width: thin;
          scrollbar-color: var(--border-accent) var(--bg-secondary);
        }

        .job-detail-header {
          position: relative;
          padding: 2rem 7rem 2rem 2rem;
          border-bottom: 1px solid var(--border-primary);
        }

        .detail-header-actions {
          position: absolute;
          top: 1.25rem;
          right: 1.5rem;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .detail-icon-button {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: rgba(0, 0, 0, 0.7);
          cursor: pointer;
          font: 600 1.6rem/1 'Segoe UI Symbol', Arial, sans-serif;
        }

        .detail-icon-button:hover,
        .detail-icon-button:focus-visible {
          background: #f3f2ef;
          color: rgba(0, 0, 0, 0.9);
          outline: none;
        }

        .detail-more-menu {
          position: absolute;
          top: 44px;
          right: 0;
          min-width: 170px;
          padding: 0.35rem 0;
          border: 1px solid #e0dfdc;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
        }

        .detail-more-menu[hidden] {
          display: none;
        }

        .detail-more-menu a,
        .detail-more-menu button {
          width: 100%;
          min-height: 40px;
          display: flex;
          align-items: center;
          padding: 0.55rem 0.9rem;
          border: 0;
          background: transparent;
          color: rgba(0, 0, 0, 0.75);
          cursor: pointer;
          font: 500 0.86rem/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          text-align: left;
          text-decoration: none;
        }

        .detail-more-menu a:hover,
        .detail-more-menu a:focus-visible,
        .detail-more-menu button:hover,
        .detail-more-menu button:focus-visible {
          background: #f3f2ef;
          color: rgba(0, 0, 0, 0.9);
          outline: none;
        }

        .detail-action-toast {
          position: absolute;
          top: 48px;
          right: 0;
          width: max-content;
          max-width: 220px;
          padding: 0.45rem 0.7rem;
          border-radius: 4px;
          background: #1d2226;
          color: #ffffff;
          font-size: 0.75rem;
          line-height: 1.3;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        }

        .detail-action-toast:empty {
          display: none;
        }

        .job-recruiter {
          margin: 1.5rem 2rem 0;
          padding: 1.25rem 1.5rem;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-secondary);
        }

        .job-recruiter-heading {
          margin-bottom: 1rem;
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.4;
        }

        .job-recruiter-row {
          display: grid;
          grid-template-columns: 52px minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.85rem;
        }

        .job-recruiter-image,
        .job-recruiter-image-placeholder {
          width: 52px;
          height: 52px;
          display: block;
          border-radius: 50%;
          object-fit: cover;
        }

        .job-recruiter-image-placeholder {
          background: #e7e5df;
        }

        .job-recruiter-info {
          min-width: 0;
        }

        .job-recruiter-name {
          display: block;
          color: var(--text-primary);
          font-size: 0.95rem;
          font-weight: 600;
          line-height: 1.35;
          text-decoration: none;
        }

        a.job-recruiter-name:hover,
        a.job-recruiter-name:focus-visible {
          color: var(--linkedin-blue);
          text-decoration: underline;
          outline: none;
        }

        .job-recruiter-title {
          margin-top: 0.15rem;
          color: var(--text-tertiary);
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .job-recruiter-label {
          margin-top: 0.05rem;
          color: var(--text-muted);
          font-size: 0.78rem;
          line-height: 1.35;
        }

        .job-recruiter-message {
          min-width: 102px;
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.45rem 1rem;
          border: 1px solid var(--linkedin-blue);
          border-radius: 20px;
          color: var(--linkedin-blue);
          font: 600 0.9rem/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          text-decoration: none;
        }

        .job-recruiter-message:hover,
        .job-recruiter-message:focus-visible {
          background: #eef3f8;
          box-shadow: inset 0 0 0 1px var(--linkedin-blue);
          outline: none;
        }

        .detail-company-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .detail-company-logo {
          width: 64px;
          height: 64px;
          flex: 0 0 64px;
          object-fit: cover;
          border: 1px solid var(--border-primary);
          border-radius: 4px;
          background: var(--bg-tertiary);
        }

        .detail-company-name {
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
        }

        .detail-company-name:hover {
          color: var(--linkedin-blue);
          text-decoration: underline;
        }

        .job-detail-title {
          margin-bottom: 0.5rem;
          font-size: 1.75rem;
          line-height: 1.25;
          font-weight: 600;
          letter-spacing: 0;
        }

        .job-detail-location {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .job-detail-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1rem;
          margin: 0.75rem 0 1.25rem;
          color: var(--text-tertiary);
          font-size: 0.85rem;
        }

        .job-detail-meta span:not(:first-child)::before {
          content: '·';
          margin-right: 1rem;
        }

        .detail-job-tags {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin: -0.25rem 0 1rem;
        }

        .detail-job-tag {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.4rem 0.9rem;
          border: 1px solid var(--border-accent);
          border-radius: 18px;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          line-height: 1.2;
        }

        .detail-primary-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0.6rem 1.25rem;
          border-radius: 6px;
          background: var(--linkedin-blue);
          color: #fff;
          font-weight: 600;
          text-decoration: none;
        }

        .detail-primary-action:hover {
          background: #004182;
        }

        .job-detail-content {
          padding: 2rem;
        }

        .job-detail-content h2 {
          margin-bottom: 1rem;
          font-size: 1.35rem;
          letter-spacing: 0;
        }

        .job-description {
          color: var(--text-secondary);
          font-size: 0.98rem;
          line-height: 1.65;
          overflow-wrap: anywhere;
        }

        .job-description strong,
        .job-description h3,
        .job-description h4 {
          color: var(--text-primary);
        }

        .job-description ul,
        .job-description ol {
          margin: 0.75rem 0 0.75rem 1.5rem;
        }

        .job-description li {
          margin-bottom: 0.4rem;
        }

        .job-description a {
          color: var(--linkedin-blue);
        }

        .job-criteria {
          margin-top: 2rem;
          border-top: 1px solid var(--border-primary);
        }

        .job-criterion {
          display: grid;
          grid-template-columns: minmax(120px, 0.35fr) 1fr;
          gap: 1rem;
          padding: 1rem 0;
          border-bottom: 1px solid var(--border-primary);
        }

        .job-criterion dt {
          color: var(--text-tertiary);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .job-criterion dd {
          color: var(--text-primary);
        }

        .job-detail-state {
          min-height: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 2rem;
          color: var(--text-secondary);
          text-align: center;
        }

        .detail-loading-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid var(--border-accent);
          border-top-color: var(--linkedin-blue);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .detail-retry-btn {
          padding: 0.55rem 1rem;
          border: 1px solid var(--linkedin-blue);
          border-radius: 6px;
          background: transparent;
          color: var(--linkedin-blue);
          cursor: pointer;
          font-weight: 600;
        }

        .detail-close {
          display: none;
          position: sticky;
          top: 0.75rem;
          float: right;
          z-index: 2;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-primary);
          border-radius: 50%;
          background: var(--bg-tertiary);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 1.5rem;
        }

        body.paged-mode {
          --page-nav-height: 58px;
          --bg-primary: #f4f2ee;
          --bg-secondary: #ffffff;
          --bg-tertiary: #f3f2ef;
          --text-primary: rgba(0, 0, 0, 0.9);
          --text-secondary: rgba(0, 0, 0, 0.75);
          --text-tertiary: rgba(0, 0, 0, 0.6);
          --text-muted: rgba(0, 0, 0, 0.45);
          --border-primary: #e0dfdc;
          --border-secondary: #c7c6c3;
          --border-accent: #8c8c8c;
          --accent-primary: #0a66c2;
          --accent-secondary: #0a66c2;
          --accent-gradient: #0a66c2;
          --selection-bg: #f3f2ef;
          --shadow-primary: rgba(0, 0, 0, 0.08);
          --shadow-accent: rgba(10, 102, 194, 0.2);
          background: #f4f2ee;
          color: rgba(0, 0, 0, 0.9);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }

        .paged-mode .navbar {
          padding: 0.6rem 0;
          background: #ffffff;
          border-bottom-color: #e0dfdc;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .paged-mode .nav-content {
          max-width: 1180px;
        }

        .paged-mode .logo {
          color: #0a66c2;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .paged-mode .page-topbar {
          min-height: var(--page-nav-height);
          padding: 0;
        }

        .paged-mode .page-topbar .nav-content {
          min-height: var(--page-nav-height);
          max-width: 1100px;
          display: grid;
          grid-template-columns: auto minmax(500px, 550px) minmax(390px, 1fr);
          justify-content: initial;
          gap: 0.65rem;
          padding: 0 0.75rem;
        }

        .page-brand {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          background: #0a66c2;
          color: #ffffff;
          font: 700 1.65rem/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          text-decoration: none;
        }

        .page-search-form {
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(190px, 1fr) minmax(190px, 1fr) 88px;
          align-items: center;
          gap: 0.5rem;
        }

        .page-search-field {
          min-width: 0;
          height: 40px;
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0 0.75rem;
          border: 1px solid #8c8c8c;
          border-radius: 20px;
          background: #ffffff;
          color: rgba(0, 0, 0, 0.6);
        }

        .page-search-field:focus-within {
          border-color: rgba(0, 0, 0, 0.9);
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.9);
        }

        .page-search-field input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: rgba(0, 0, 0, 0.9);
          font: 400 0.9rem/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }

        .page-search-field input::placeholder {
          color: rgba(0, 0, 0, 0.55);
          opacity: 1;
        }

        .search-field-icon {
          width: 16px;
          flex: 0 0 16px;
          color: rgba(0, 0, 0, 0.65);
          text-align: center;
          font: 700 1rem/1 'Segoe UI Symbol', Arial, sans-serif;
        }

        .page-search-submit {
          height: 40px;
          padding: 0 1.1rem;
          border: 1px solid #0a66c2;
          border-radius: 20px;
          background: #ffffff;
          color: #0a66c2;
          cursor: pointer;
          font: 600 0.9rem/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }

        .page-search-submit:hover,
        .page-search-submit:focus-visible {
          background: #eef3f8;
          box-shadow: inset 0 0 0 1px #0a66c2;
          outline: none;
        }

        .page-nav-actions {
          min-width: 0;
          display: flex;
          align-items: stretch;
          justify-content: flex-end;
          gap: 0;
        }

        .page-nav-item {
          position: relative;
          min-width: 54px;
          height: 58px;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 0 0.4rem;
          border: 0;
          border-bottom: 0;
          background: transparent;
          color: rgba(0, 0, 0, 0.6);
          cursor: pointer;
          font: 400 0.72rem/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          text-decoration: none;
          white-space: nowrap;
        }

        .page-nav-item:hover,
        .page-nav-item:focus-visible,
        .page-nav-item.active {
          color: rgba(0, 0, 0, 0.9);
          outline: none;
        }

        .page-nav-item.active {
          color: rgba(0, 0, 0, 0.75);
        }

        .page-nav-item-static {
          cursor: default;
        }

        .page-nav-glyph {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font: 700 1.45rem/1 'Segoe UI Symbol', Arial, sans-serif;
        }

        .page-nav-label {
          display: none;
        }

        .page-nav-live-indicator {
          position: absolute;
          top: 7px;
          right: 8px;
          width: 14px;
          height: 14px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          background: #cc1016;
        }

        .page-nav-alert-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 9px;
          height: 9px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          background: #cc1016;
        }

        .page-profile-image {
          width: 27px;
          height: 27px;
          display: block;
          border-radius: 50%;
          object-fit: cover;
        }

        .page-nav-divider {
          width: 1px;
          margin: 0 0.35rem;
          background: #e0dfdc;
        }

        .paged-mode .job-count,
        .paged-mode .auto-refresh-control {
          color: rgba(0, 0, 0, 0.6);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }

        .paged-mode .container {
          max-width: 1180px;
          padding: 0 1.5rem 2rem;
        }

        .paged-mode .filters {
          margin-bottom: 1rem;
          padding: 1.25rem;
          background: #ffffff;
          border-color: #e0dfdc;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .paged-mode .page-filter-shell {
          position: sticky;
          top: var(--page-nav-height);
          z-index: 90;
          margin-bottom: 0;
          padding: 0.65rem 0;
          border-right: 0;
          border-left: 0;
          border-radius: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .page-filter-toolbar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 0.75rem;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .page-filter-toolbar::-webkit-scrollbar {
          display: none;
        }

        .toolbar-job-count {
          flex: 0 0 auto;
          margin-left: auto;
          padding-left: 1rem;
          white-space: nowrap;
        }

        .filter-pill {
          min-height: 36px;
          max-width: 180px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          flex: 0 0 auto;
          padding: 0.4rem 0.9rem;
          border: 1px solid #8c8c8c;
          border-radius: 18px;
          background: #ffffff;
          color: rgba(0, 0, 0, 0.75);
          font: 600 0.9rem/1.2 -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .filter-pill > span:first-child {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .filter-pill:hover,
        .filter-pill:focus-visible {
          background: #f3f2ef;
          border-color: rgba(0, 0, 0, 0.75);
          outline: none;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.75);
        }

        .filter-pill-primary {
          border-color: #01754f;
          background: #01754f;
          color: #ffffff;
        }

        .filter-pill-primary:hover,
        .filter-pill-primary:focus-visible {
          border-color: #004c33;
          background: #004c33;
          color: #ffffff;
          box-shadow: none;
        }

        .filter-pill.applied {
          border-color: #057642;
          background: #e7f3ef;
          color: #004c33;
        }

        .filter-chevron {
          width: 7px;
          height: 7px;
          flex: 0 0 7px;
          border-right: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
          transform: translateY(-2px) rotate(45deg);
        }

        .all-filters-pill {
          position: relative;
          margin-left: 0.25rem;
        }

        .all-filters-pill::before {
          content: '';
          position: absolute;
          left: -0.55rem;
          width: 1px;
          height: 24px;
          background: #c7c6c3;
        }

        .filter-count-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #057642;
        }

        .filter-drawer-backdrop {
          position: fixed;
          inset: 0;
          z-index: 400;
          display: flex;
          justify-content: flex-end;
          background: rgba(0, 0, 0, 0.35);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.2s ease, visibility 0.2s ease;
        }

        .filter-drawer-backdrop.open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .filter-drawer {
          width: min(620px, 100%);
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          color: rgba(0, 0, 0, 0.9);
          box-shadow: -4px 0 18px rgba(0, 0, 0, 0.15);
          transform: translateX(100%);
          transition: transform 0.25s ease;
        }

        .filter-drawer-backdrop.open .filter-drawer {
          transform: translateX(0);
        }

        .filter-drawer-header {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e0dfdc;
        }

        .filter-drawer-header h2 {
          font-size: 1.35rem;
          font-weight: 600;
          letter-spacing: 0;
        }

        .filter-drawer-close {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: rgba(0, 0, 0, 0.75);
          cursor: pointer;
          font-size: 1.7rem;
        }

        .filter-drawer-close:hover {
          background: #f3f2ef;
        }

        .filter-drawer-form {
          min-height: 0;
          display: flex;
          flex: 1;
          flex-direction: column;
        }

        .filter-drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 0 1.5rem;
        }

        .drawer-filter-section {
          padding: 1.5rem 0;
          border-bottom: 1px solid #e0dfdc;
          scroll-margin-top: 1rem;
        }

        .drawer-filter-section h3 {
          margin-bottom: 1rem;
          font-size: 1.05rem;
          font-weight: 600;
          letter-spacing: 0;
        }

        .drawer-filter-section > input[type="text"],
        .drawer-filter-section > input[type="number"] {
          width: 100%;
          min-height: 44px;
          padding: 0.65rem 0.8rem;
          border: 1px solid #8c8c8c;
          border-radius: 4px;
          background: #ffffff;
          color: rgba(0, 0, 0, 0.9);
          font: 400 0.95rem -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }

        .drawer-filter-section > input:focus {
          border-color: #0a66c2;
          outline: 2px solid rgba(10, 102, 194, 0.2);
          outline-offset: 0;
        }

        .drawer-field-label {
          display: block;
          margin-bottom: 0.4rem;
          color: rgba(0, 0, 0, 0.6);
          font-size: 0.85rem;
        }

        .drawer-radio-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem 1.5rem;
        }

        .drawer-choice,
        .filter-drawer .industry-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          color: rgba(0, 0, 0, 0.7);
          font-size: 0.92rem;
          cursor: pointer;
        }

        .drawer-choice input,
        .filter-drawer .industry-checkbox input {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          margin: 0;
          accent-color: #0a66c2;
        }

        .drawer-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .drawer-section-heading h3 {
          margin-bottom: 0;
        }

        .industry-mode-switch {
          display: inline-flex;
          border: 1px solid #8c8c8c;
          border-radius: 18px;
          overflow: hidden;
        }

        .industry-mode-switch label {
          cursor: pointer;
        }

        .industry-mode-switch input {
          position: absolute;
          opacity: 0;
        }

        .industry-mode-switch span {
          display: block;
          padding: 0.35rem 0.75rem;
          color: rgba(0, 0, 0, 0.65);
          font-size: 0.8rem;
          font-weight: 600;
        }

        .industry-mode-switch input:checked + span {
          background: #0a66c2;
          color: #ffffff;
        }

        .filter-drawer .industry-checkboxes {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem 1.5rem;
          max-height: none;
          overflow: visible;
          padding: 0;
          border: 0;
          background: #ffffff;
        }

        .filter-drawer .industry-checkbox label {
          color: rgba(0, 0, 0, 0.65);
          line-height: 1.35;
        }

        .drawer-loading {
          grid-column: 1 / -1;
          padding: 2rem;
          color: rgba(0, 0, 0, 0.5);
          text-align: center;
        }

        .filter-drawer-footer {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 1.25rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e0dfdc;
          background: #ffffff;
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
        }

        .filter-reset-link {
          color: rgba(0, 0, 0, 0.7);
          font-weight: 600;
          text-decoration: none;
        }

        .filter-reset-link:hover {
          text-decoration: underline;
        }

        .filter-show-results {
          min-height: 44px;
          padding: 0.6rem 1.25rem;
          border: 0;
          border-radius: 22px;
          background: #0a66c2;
          color: #ffffff;
          cursor: pointer;
          font-weight: 600;
        }

        .filter-show-results:hover {
          background: #004182;
        }

        body.filters-open {
          overflow: hidden;
        }

        .paged-mode .filter-group label,
        .paged-mode .industry-mode label {
          color: rgba(0, 0, 0, 0.6);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          text-transform: none;
          letter-spacing: 0;
        }

        .paged-mode .filter-group input,
        .paged-mode .filter-group select,
        .paged-mode .industry-checkboxes {
          background: #ffffff;
          border-color: #8c8c8c;
          color: rgba(0, 0, 0, 0.9);
        }

        .paged-mode .industry-checkboxes {
          max-height: 130px;
        }

        .paged-mode .search-btn {
          height: 44px;
          border-radius: 22px;
          background: #0a66c2;
          color: #ffffff;
          box-shadow: none;
        }

        .paged-mode .search-btn:hover {
          background: #004182;
          box-shadow: none;
        }

        .paged-mode .clear-btn {
          height: 44px;
          border-color: #0a66c2;
          border-radius: 22px;
          color: #0a66c2;
          font-weight: 600;
        }

        .paged-mode .job-board-layout {
          grid-template-columns: minmax(360px, 42%) minmax(0, 1fr);
          background: #ffffff;
          border-color: #e0dfdc;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .paged-mode .job-list-pane,
        .paged-mode .job-detail-panel {
          background: #ffffff;
        }

        .paged-mode .job-card {
          padding: 0.9rem 1rem;
          background: #ffffff;
          border-bottom-color: #e0dfdc;
        }

        .paged-mode .job-card:hover {
          background: #f8fafd;
        }

        .paged-mode .job-card.selected {
          padding-left: calc(1rem - 3px);
          border-left: 3px solid #191919;
          background: #f3f2ef;
        }

        .paged-mode .job-card .job-title,
        .paged-mode .job-card.selected .job-title {
          margin-bottom: 0.15rem;
          font-size: 1rem;
          line-height: 1.3;
        }

        .paged-mode .job-card .job-title a,
        .paged-mode .job-card.selected .job-title a {
          color: #0a66c2;
          font-weight: 600;
        }

        .paged-mode .company-name,
        .paged-mode .company-name a {
          margin-bottom: 0.1rem;
          color: rgba(0, 0, 0, 0.9);
          font-size: 0.9rem;
          font-weight: 400;
        }

        .paged-mode .job-location {
          color: rgba(0, 0, 0, 0.6);
          font-size: 0.85rem;
        }

        .paged-mode .company-logo {
          width: 56px;
          height: 56px;
          flex: 0 0 56px;
          border-color: transparent;
        }

        .paged-mode .job-footer {
          margin-left: 72px;
        }

        .paged-mode .job-meta:last-child {
          color: #057642;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          font-size: 0.8rem;
        }

        .job-list-feedback {
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem;
          border-top: 1px solid #e0dfdc;
          border-bottom: 1px solid #e0dfdc;
          background: #ffffff;
        }

        .job-list-feedback strong,
        .job-list-promo strong {
          display: block;
          color: rgba(0, 0, 0, 0.9);
          font-size: 1rem;
          line-height: 1.35;
        }

        .job-list-feedback p {
          margin-top: 0.15rem;
          color: rgba(0, 0, 0, 0.6);
          font-size: 0.82rem;
          line-height: 1.35;
        }

        .job-feedback-actions {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex: 0 0 auto;
        }

        .job-feedback-button,
        .job-list-promo-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          color: rgba(0, 0, 0, 0.7);
          cursor: pointer;
        }

        .job-feedback-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font: 400 1.4rem/1 'Segoe UI Symbol', Arial, sans-serif;
        }

        .job-feedback-button:hover,
        .job-feedback-button:focus-visible,
        .job-feedback-button.selected {
          background: #eef3f8;
          color: #0a66c2;
          outline: none;
        }

        .job-list-promo {
          position: relative;
          min-height: 112px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.85rem;
          padding: 1.25rem 3rem;
          border-bottom: 1px solid #e0dfdc;
          background: #ffffff;
          text-align: center;
        }

        .job-list-promo[hidden] {
          display: none;
        }

        .job-list-promo-close {
          position: absolute;
          top: 0.8rem;
          right: 0.8rem;
          width: 32px;
          height: 32px;
          font-size: 1.35rem;
        }

        .job-list-promo-close:hover,
        .job-list-promo-close:focus-visible {
          color: rgba(0, 0, 0, 0.9);
          outline: 2px solid #0a66c2;
          outline-offset: 1px;
          border-radius: 50%;
        }

        .job-list-promo-action {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.45rem 1rem;
          border: 1px solid #0a66c2;
          border-radius: 19px;
          color: #0a66c2;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
        }

        .job-list-promo-action:hover,
        .job-list-promo-action:focus-visible {
          background: #eef3f8;
          box-shadow: inset 0 0 0 1px #0a66c2;
          outline: none;
        }

        .job-list-pagination {
          border-bottom: 1px solid #e0dfdc;
          background: #ffffff;
        }

        .paged-mode .pagination {
          margin: 0;
          min-height: 72px;
          padding: 0 0.75rem;
        }

        .paged-mode .page-btn {
          min-width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.3rem 0.55rem;
          border-color: transparent;
          border-radius: 16px;
          background: transparent;
          color: #0a66c2;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          font-weight: 600;
        }

        .paged-mode .page-btn:hover {
          background: #eef3f8;
          color: #004182;
        }

        .paged-mode .page-btn.active {
          background: #1d2226;
          color: #ffffff;
        }

        .job-list-footer {
          padding: 1.2rem 1rem 1.35rem;
          background: #ffffff;
          color: rgba(0, 0, 0, 0.6);
          text-align: center;
          font-size: 0.72rem;
          line-height: 1.6;
        }

        .job-list-footer-brand {
          color: #0a66c2;
          font-weight: 700;
        }

        .paged-mode .job-detail-panel {
          top: calc(var(--page-nav-height) + 60px);
          height: calc(100vh - var(--page-nav-height) - 76px);
          scrollbar-color: #b0b0b0 #ffffff;
        }

        .paged-mode .job-detail-header,
        .paged-mode .job-detail-content {
          background: #ffffff;
        }

        .paged-mode .job-recruiter {
          border-color: #e0dfdc;
          background: #ffffff;
        }

        .paged-mode .job-detail-title {
          color: rgba(0, 0, 0, 0.9);
          font-size: 1.5rem;
          font-weight: 600;
        }

        .paged-mode .detail-company-name,
        .paged-mode .job-detail-content h2 {
          color: rgba(0, 0, 0, 0.9);
        }

        .paged-mode .job-detail-location,
        .paged-mode .job-detail-meta,
        .paged-mode .job-description {
          color: rgba(0, 0, 0, 0.6);
        }

        .paged-mode .detail-job-tag {
          border-color: #8c8c8c;
          color: rgba(0, 0, 0, 0.75);
        }

        .paged-mode .detail-primary-action {
          min-height: 44px;
          padding: 0.6rem 1.35rem;
          border-radius: 22px;
          background: #0a66c2;
        }

        .paged-mode .job-description {
          color: rgba(0, 0, 0, 0.75);
          line-height: 1.55;
        }

        .paged-mode .job-description strong,
        .paged-mode .job-description h3,
        .paged-mode .job-description h4 {
          color: rgba(0, 0, 0, 0.9);
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
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

        .scroll-sentinel {
          min-height: 64px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.75rem;
          margin: 1rem 0 2rem;
          color: var(--text-secondary);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
        }

        .loading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid var(--border-accent);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .scroll-sentinel:not(.loading) .loading-spinner {
          display: none;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .chat-shell {
          position: fixed;
          right: 1rem;
          bottom: 0;
          z-index: 320;
          width: 340px;
          color: rgba(0, 0, 0, 0.9);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.15));
        }

        .chat-shell[hidden] {
          display: none;
        }

        .chat-header {
          height: 54px;
          display: flex;
          align-items: center;
          padding: 0 0.55rem;
          border: 1px solid #d6d6d6;
          border-bottom: 0;
          border-radius: 8px 8px 0 0;
          background: #ffffff;
        }

        .chat-header-main {
          min-width: 0;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.35rem;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          text-align: left;
        }

        .chat-avatar-wrap {
          position: relative;
          flex: 0 0 auto;
        }

        .chat-avatar {
          width: 32px;
          height: 32px;
          display: block;
          border-radius: 50%;
          object-fit: cover;
        }

        .chat-online-dot {
          position: absolute;
          right: -1px;
          bottom: -1px;
          width: 10px;
          height: 10px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          background: #a4a4a4;
        }

        .chat-shell.connected .chat-online-dot {
          background: #057642;
        }

        .chat-header-copy {
          min-width: 0;
          flex: 1;
        }

        .chat-header-title {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          line-height: 1.2;
        }

        .chat-presence {
          display: block;
          margin-top: 0.1rem;
          color: rgba(0, 0, 0, 0.55);
          font-size: 0.7rem;
          line-height: 1.2;
        }

        .chat-unread {
          min-width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 0.35rem;
          border-radius: 10px;
          background: #cc1016;
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .chat-unread[hidden] {
          display: none;
        }

        .chat-header-action {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: rgba(0, 0, 0, 0.7);
          cursor: pointer;
          font: 600 1.2rem/1 'Segoe UI Symbol', Arial, sans-serif;
        }

        .chat-header-action:hover,
        .chat-header-action:focus-visible,
        .chat-header-main:hover,
        .chat-header-main:focus-visible {
          background: #f3f2ef;
          outline: none;
        }

        .chat-panel {
          height: min(500px, calc(100vh - 120px));
          display: flex;
          flex-direction: column;
          border: 1px solid #d6d6d6;
          background: #ffffff;
        }

        .chat-shell.collapsed .chat-panel {
          display: none;
        }

        .chat-shell.collapsed .chat-toggle-icon {
          transform: rotate(180deg);
        }

        .chat-settings {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.5rem;
          padding: 0.7rem;
          border-bottom: 1px solid #e0dfdc;
          background: #f8fafd;
        }

        .chat-settings[hidden] {
          display: none;
        }

        .chat-settings input {
          min-width: 0;
          height: 36px;
          padding: 0 0.65rem;
          border: 1px solid #8c8c8c;
          border-radius: 4px;
          color: rgba(0, 0, 0, 0.85);
          font: inherit;
        }

        .chat-settings button {
          min-height: 36px;
          padding: 0.4rem 0.8rem;
          border: 1px solid #0a66c2;
          border-radius: 18px;
          background: #0a66c2;
          color: #ffffff;
          cursor: pointer;
          font-weight: 600;
        }

        .chat-connection {
          min-height: 28px;
          display: flex;
          align-items: center;
          padding: 0.35rem 0.8rem;
          border-bottom: 1px solid #e0dfdc;
          color: rgba(0, 0, 0, 0.55);
          font-size: 0.72rem;
        }

        .chat-list-view {
          min-height: 0;
          flex: 1;
        }

        .chat-list-view {
          display: flex;
          flex-direction: column;
        }

        .chat-list-view[hidden] {
          display: none;
        }

        .chat-user-search {
          padding: 0.65rem;
          border-bottom: 1px solid #e0dfdc;
          background: #ffffff;
        }

        .chat-user-search input {
          width: 100%;
          height: 38px;
          padding: 0 0.75rem;
          border: 0;
          border-radius: 4px;
          background: #edf3f8;
          color: rgba(0, 0, 0, 0.85);
          font: 400 0.84rem/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }

        .chat-user-list {
          min-height: 0;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #b0b0b0 #ffffff;
        }

        .chat-user-button {
          width: 100%;
          min-height: 68px;
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.65rem;
          padding: 0.65rem 0.8rem;
          border: 0;
          border-bottom: 1px solid #e8e8e8;
          background: #ffffff;
          color: rgba(0, 0, 0, 0.85);
          cursor: pointer;
          text-align: left;
        }

        .chat-user-button:hover,
        .chat-user-button:focus-visible {
          background: #f3f2ef;
          outline: none;
        }

        .chat-user-avatar {
          position: relative;
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #dce6f1;
          color: #004182;
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .chat-user-avatar.online::after {
          content: '';
          position: absolute;
          right: -1px;
          bottom: 0;
          width: 11px;
          height: 11px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          background: #057642;
        }

        .chat-user-copy {
          min-width: 0;
        }

        .chat-user-name {
          display: block;
          overflow: hidden;
          color: rgba(0, 0, 0, 0.85);
          font-size: 0.86rem;
          font-weight: 600;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .chat-user-status {
          display: block;
          margin-top: 0.2rem;
          overflow: hidden;
          color: rgba(0, 0, 0, 0.52);
          font-size: 0.72rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .chat-user-unread {
          min-width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 0.3rem;
          border-radius: 10px;
          background: #0a66c2;
          color: #ffffff;
          font-size: 0.68rem;
          font-weight: 700;
        }

        .chat-conversation-shell {
          position: fixed;
          right: 362px;
          bottom: 0;
          z-index: 321;
          width: min(520px, calc(100vw - 390px));
          min-width: 360px;
          color: rgba(0, 0, 0, 0.9);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.15));
        }

        .chat-conversation-shell[hidden] {
          display: none;
        }

        .chat-conversation-shell.collapsed .chat-conversation-panel {
          display: none;
        }

        .chat-conversation-panel {
          height: min(500px, calc(100vh - 120px));
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          border: 1px solid #d6d6d6;
          background: #ffffff;
        }

        .chat-conversation-header {
          min-height: 54px;
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.65rem;
          border: 1px solid #d6d6d6;
          border-bottom: 0;
          border-radius: 8px 8px 0 0;
          background: #ffffff;
        }

        .chat-conversation-action {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: rgba(0, 0, 0, 0.7);
          cursor: pointer;
          font: 600 1.15rem/1 'Segoe UI Symbol', Arial, sans-serif;
        }

        .chat-conversation-action:hover,
        .chat-conversation-action:focus-visible {
          background: #f3f2ef;
          outline: none;
        }

        .chat-conversation-header .chat-user-avatar {
          width: 36px;
          height: 36px;
          font-size: 0.78rem;
        }

        .chat-messages {
          min-height: 0;
          overflow-y: auto;
          padding: 0.75rem;
          scrollbar-width: thin;
          scrollbar-color: #b0b0b0 #ffffff;
        }

        .chat-empty {
          padding: 2rem 1rem;
          color: rgba(0, 0, 0, 0.5);
          font-size: 0.82rem;
          text-align: center;
        }

        .chat-message {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }

        .chat-message.own {
          align-items: flex-end;
        }

        .chat-message-meta {
          margin: 0 0.35rem 0.25rem;
          color: rgba(0, 0, 0, 0.55);
          font-size: 0.68rem;
        }

        .chat-message-bubble {
          max-width: 82%;
          padding: 0.55rem 0.75rem;
          border-radius: 8px;
          background: #f3f2ef;
          color: rgba(0, 0, 0, 0.85);
          font-size: 0.84rem;
          line-height: 1.4;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .chat-message.own .chat-message-bubble {
          background: #dce6f1;
        }

        .chat-composer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 42px;
          align-items: end;
          gap: 0.5rem;
          padding: 0.65rem;
          border-top: 1px solid #e0dfdc;
          background: #ffffff;
        }

        .chat-composer textarea {
          width: 100%;
          min-height: 40px;
          max-height: 96px;
          resize: none;
          padding: 0.6rem 0.7rem;
          border: 1px solid #8c8c8c;
          border-radius: 8px;
          color: rgba(0, 0, 0, 0.85);
          font: 400 0.84rem/1.35 -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }

        .chat-send {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: #0a66c2;
          color: #ffffff;
          cursor: pointer;
          font: 600 1rem/1 'Segoe UI Symbol', Arial, sans-serif;
        }

        .chat-send:disabled {
          background: #a4a4a4;
          cursor: not-allowed;
        }

        .page-theme-toggle .page-nav-glyph {
          font-size: 1.2rem;
        }

        [data-theme="dark"] body.paged-mode {
          --bg-primary: #17191c;
          --bg-secondary: #202326;
          --bg-tertiary: #2a2d31;
          --text-primary: #f1f3f5;
          --text-secondary: #d3d7db;
          --text-tertiary: #aeb5bc;
          --text-muted: #8d969e;
          --border-primary: #3b4045;
          --border-secondary: #4a5056;
          --border-accent: #69727a;
          --selection-bg: #29343e;
          --shadow-primary: rgba(0, 0, 0, 0.38);
          --shadow-accent: rgba(112, 181, 249, 0.24);
          background: var(--bg-primary);
          color: var(--text-primary);
          color-scheme: dark;
        }

        [data-theme="dark"] .paged-mode .navbar,
        [data-theme="dark"] .paged-mode .filters,
        [data-theme="dark"] .paged-mode .job-board-layout,
        [data-theme="dark"] .paged-mode .job-list-pane,
        [data-theme="dark"] .paged-mode .job-detail-panel,
        [data-theme="dark"] .paged-mode .job-detail-header,
        [data-theme="dark"] .paged-mode .job-detail-content,
        [data-theme="dark"] .paged-mode .job-recruiter,
        [data-theme="dark"] .paged-mode .job-card,
        [data-theme="dark"] .paged-mode .job-list-feedback,
        [data-theme="dark"] .paged-mode .job-list-promo,
        [data-theme="dark"] .paged-mode .job-list-pagination,
        [data-theme="dark"] .paged-mode .job-list-footer {
          border-color: var(--border-primary);
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        [data-theme="dark"] .paged-mode .navbar,
        [data-theme="dark"] .paged-mode .page-filter-shell,
        [data-theme="dark"] .paged-mode .job-board-layout {
          box-shadow: 0 1px 3px var(--shadow-primary);
        }

        [data-theme="dark"] .paged-mode .page-search-field,
        [data-theme="dark"] .paged-mode .page-search-submit {
          border-color: var(--border-accent);
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        [data-theme="dark"] .paged-mode .page-search-field input,
        [data-theme="dark"] .paged-mode .page-search-field input::placeholder,
        [data-theme="dark"] .paged-mode .search-field-icon {
          color: var(--text-tertiary);
        }

        [data-theme="dark"] .paged-mode .page-search-field:focus-within {
          border-color: #70b5f9;
          box-shadow: inset 0 0 0 1px #70b5f9;
        }

        [data-theme="dark"] .paged-mode .page-search-submit {
          border-color: #70b5f9;
          color: #70b5f9;
        }

        [data-theme="dark"] .paged-mode .page-search-submit:hover,
        [data-theme="dark"] .paged-mode .page-search-submit:focus-visible,
        [data-theme="dark"] .paged-mode .page-nav-item:hover,
        [data-theme="dark"] .paged-mode .page-nav-item:focus-visible {
          background: #30363c;
        }

        [data-theme="dark"] .paged-mode .page-nav-item,
        [data-theme="dark"] .paged-mode .job-count,
        [data-theme="dark"] .paged-mode .auto-refresh-control {
          color: var(--text-tertiary);
        }

        [data-theme="dark"] .paged-mode .page-nav-item:hover,
        [data-theme="dark"] .paged-mode .page-nav-item:focus-visible,
        [data-theme="dark"] .paged-mode .page-nav-item.active,
        [data-theme="dark"] .paged-mode .page-theme-toggle {
          color: var(--text-primary);
        }

        [data-theme="dark"] .paged-mode .page-nav-divider {
          background: var(--border-primary);
        }

        [data-theme="dark"] .paged-mode .page-nav-live-indicator,
        [data-theme="dark"] .paged-mode .page-nav-alert-dot {
          border-color: var(--bg-secondary);
        }

        [data-theme="dark"] .paged-mode .filter-pill {
          border-color: var(--border-accent);
          background: var(--bg-secondary);
          color: var(--text-secondary);
        }

        [data-theme="dark"] .paged-mode .filter-pill:hover,
        [data-theme="dark"] .paged-mode .filter-pill:focus-visible {
          border-color: var(--text-secondary);
          background: var(--bg-tertiary);
          box-shadow: inset 0 0 0 1px var(--text-secondary);
        }

        [data-theme="dark"] .paged-mode .filter-pill-primary {
          border-color: #2f9b6d;
          background: #1d7452;
          color: #ffffff;
        }

        [data-theme="dark"] .paged-mode .filter-pill.applied {
          border-color: #7fc9a8;
          background: #173e30;
          color: #b7ead3;
        }

        [data-theme="dark"] .paged-mode .all-filters-pill::before {
          background: var(--border-secondary);
        }

        [data-theme="dark"] .paged-mode .filter-drawer,
        [data-theme="dark"] .paged-mode .filter-drawer-footer {
          border-color: var(--border-primary);
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        [data-theme="dark"] .paged-mode .filter-drawer-header,
        [data-theme="dark"] .paged-mode .drawer-filter-section {
          border-color: var(--border-primary);
        }

        [data-theme="dark"] .paged-mode .filter-drawer-close,
        [data-theme="dark"] .paged-mode .filter-reset-link,
        [data-theme="dark"] .paged-mode .drawer-field-label,
        [data-theme="dark"] .paged-mode .drawer-choice,
        [data-theme="dark"] .paged-mode .filter-drawer .industry-checkbox,
        [data-theme="dark"] .paged-mode .filter-drawer .industry-checkbox label,
        [data-theme="dark"] .paged-mode .industry-mode-switch span {
          color: var(--text-tertiary);
        }

        [data-theme="dark"] .paged-mode .filter-drawer-close:hover {
          background: var(--bg-tertiary);
        }

        [data-theme="dark"] .paged-mode .drawer-filter-section > input[type="text"],
        [data-theme="dark"] .paged-mode .drawer-filter-section > input[type="number"],
        [data-theme="dark"] .paged-mode .filter-drawer .industry-checkboxes {
          border-color: var(--border-accent);
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        [data-theme="dark"] .paged-mode .industry-mode-switch {
          border-color: var(--border-accent);
        }

        [data-theme="dark"] .paged-mode .job-card:hover {
          background: #282d32;
        }

        [data-theme="dark"] .paged-mode .job-card.selected {
          border-left-color: #70b5f9;
          background: var(--selection-bg);
        }

        [data-theme="dark"] .paged-mode .job-card .job-title a,
        [data-theme="dark"] .paged-mode .job-card.selected .job-title a {
          color: #70b5f9;
        }

        [data-theme="dark"] .paged-mode .company-name,
        [data-theme="dark"] .paged-mode .company-name a,
        [data-theme="dark"] .paged-mode .job-list-feedback strong,
        [data-theme="dark"] .paged-mode .job-list-promo strong,
        [data-theme="dark"] .paged-mode .job-detail-title,
        [data-theme="dark"] .paged-mode .detail-company-name,
        [data-theme="dark"] .paged-mode .job-detail-content h2,
        [data-theme="dark"] .paged-mode .job-description strong,
        [data-theme="dark"] .paged-mode .job-description h3,
        [data-theme="dark"] .paged-mode .job-description h4 {
          color: var(--text-primary);
        }

        [data-theme="dark"] .paged-mode .job-location,
        [data-theme="dark"] .paged-mode .job-list-feedback p,
        [data-theme="dark"] .paged-mode .job-detail-location,
        [data-theme="dark"] .paged-mode .job-detail-meta,
        [data-theme="dark"] .paged-mode .job-description,
        [data-theme="dark"] .paged-mode .job-list-footer {
          color: var(--text-tertiary);
        }

        [data-theme="dark"] .paged-mode .detail-job-tag {
          border-color: var(--border-accent);
          color: var(--text-secondary);
        }

        [data-theme="dark"] .paged-mode .detail-icon-button,
        [data-theme="dark"] .paged-mode .job-feedback-button,
        [data-theme="dark"] .paged-mode .job-list-promo-close {
          color: var(--text-secondary);
        }

        [data-theme="dark"] .paged-mode .detail-icon-button:hover,
        [data-theme="dark"] .paged-mode .detail-icon-button:focus-visible,
        [data-theme="dark"] .paged-mode .job-feedback-button:hover,
        [data-theme="dark"] .paged-mode .job-feedback-button:focus-visible,
        [data-theme="dark"] .paged-mode .job-feedback-button.selected {
          background: var(--bg-tertiary);
          color: #70b5f9;
        }

        [data-theme="dark"] .paged-mode .detail-more-menu {
          border-color: var(--border-primary);
          background: var(--bg-secondary);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
        }

        [data-theme="dark"] .paged-mode .detail-more-menu a,
        [data-theme="dark"] .paged-mode .detail-more-menu button {
          color: var(--text-secondary);
        }

        [data-theme="dark"] .paged-mode .detail-more-menu a:hover,
        [data-theme="dark"] .paged-mode .detail-more-menu a:focus-visible,
        [data-theme="dark"] .paged-mode .detail-more-menu button:hover,
        [data-theme="dark"] .paged-mode .detail-more-menu button:focus-visible,
        [data-theme="dark"] .paged-mode .job-recruiter-message:hover,
        [data-theme="dark"] .paged-mode .job-recruiter-message:focus-visible,
        [data-theme="dark"] .paged-mode .job-list-promo-action:hover,
        [data-theme="dark"] .paged-mode .job-list-promo-action:focus-visible,
        [data-theme="dark"] .paged-mode .page-btn:hover {
          background: var(--bg-tertiary);
          color: #a8d5ff;
        }

        [data-theme="dark"] .paged-mode .job-recruiter-image-placeholder {
          background: var(--bg-tertiary);
        }

        [data-theme="dark"] .paged-mode .job-recruiter-title,
        [data-theme="dark"] .paged-mode .job-recruiter-label,
        [data-theme="dark"] .paged-mode .job-criterion dt {
          color: var(--text-tertiary);
        }

        [data-theme="dark"] .paged-mode .job-criterion dd {
          color: var(--text-primary);
        }

        [data-theme="dark"] .paged-mode .page-btn {
          color: #70b5f9;
        }

        [data-theme="dark"] .paged-mode .page-btn.active {
          background: #e8eaed;
          color: #202326;
        }

        [data-theme="dark"] .paged-mode .job-detail-panel {
          scrollbar-color: var(--border-accent) var(--bg-secondary);
        }

        [data-theme="dark"] .paged-mode .chat-shell,
        [data-theme="dark"] .paged-mode .chat-conversation-shell {
          color: var(--text-primary);
          filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.5));
        }

        [data-theme="dark"] .paged-mode .chat-header,
        [data-theme="dark"] .paged-mode .chat-panel,
        [data-theme="dark"] .paged-mode .chat-conversation-panel,
        [data-theme="dark"] .paged-mode .chat-conversation-header,
        [data-theme="dark"] .paged-mode .chat-user-search,
        [data-theme="dark"] .paged-mode .chat-user-button,
        [data-theme="dark"] .paged-mode .chat-composer {
          border-color: var(--border-primary);
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        [data-theme="dark"] .paged-mode .chat-header-action,
        [data-theme="dark"] .paged-mode .chat-conversation-action,
        [data-theme="dark"] .paged-mode .chat-user-name,
        [data-theme="dark"] .paged-mode .chat-user-button {
          color: var(--text-secondary);
        }

        [data-theme="dark"] .paged-mode .chat-presence,
        [data-theme="dark"] .paged-mode .chat-connection,
        [data-theme="dark"] .paged-mode .chat-user-status,
        [data-theme="dark"] .paged-mode .chat-empty,
        [data-theme="dark"] .paged-mode .chat-message-meta {
          color: var(--text-muted);
        }

        [data-theme="dark"] .paged-mode .chat-header-action:hover,
        [data-theme="dark"] .paged-mode .chat-header-action:focus-visible,
        [data-theme="dark"] .paged-mode .chat-header-main:hover,
        [data-theme="dark"] .paged-mode .chat-header-main:focus-visible,
        [data-theme="dark"] .paged-mode .chat-conversation-action:hover,
        [data-theme="dark"] .paged-mode .chat-conversation-action:focus-visible,
        [data-theme="dark"] .paged-mode .chat-user-button:hover,
        [data-theme="dark"] .paged-mode .chat-user-button:focus-visible {
          background: var(--bg-tertiary);
        }

        [data-theme="dark"] .paged-mode .chat-settings,
        [data-theme="dark"] .paged-mode .chat-user-search input,
        [data-theme="dark"] .paged-mode .chat-settings input,
        [data-theme="dark"] .paged-mode .chat-composer textarea {
          border-color: var(--border-accent);
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        [data-theme="dark"] .paged-mode .chat-connection,
        [data-theme="dark"] .paged-mode .chat-settings {
          border-color: var(--border-primary);
        }

        [data-theme="dark"] .paged-mode .chat-user-list,
        [data-theme="dark"] .paged-mode .chat-messages {
          scrollbar-color: var(--border-accent) var(--bg-secondary);
        }

        [data-theme="dark"] .paged-mode .chat-online-dot,
        [data-theme="dark"] .paged-mode .chat-user-avatar.online::after {
          border-color: var(--bg-secondary);
        }

        [data-theme="dark"] .paged-mode .chat-user-avatar {
          background: #314456;
          color: #a8d5ff;
        }

        [data-theme="dark"] .paged-mode .chat-message-bubble {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        [data-theme="dark"] .paged-mode .chat-message.own .chat-message-bubble {
          background: #264662;
          color: #edf6ff;
        }

        .index-mode {
          --bg-primary: #f4f6f8;
          --bg-secondary: #ffffff;
          --bg-tertiary: #f8fafb;
          --text-primary: #17212b;
          --text-secondary: #52606d;
          --text-tertiary: #667785;
          --text-muted: #7b8794;
          --border-primary: #dce2e7;
          --border-secondary: #c8d0d8;
          --border-accent: #aeb9c3;
          --accent-primary: #0a66c2;
          --accent-secondary: #0a66c2;
          --accent-gradient: linear-gradient(135deg, #0a66c2, #004182);
          --shadow-primary: rgba(23, 33, 43, 0.08);
          --shadow-accent: rgba(8, 127, 91, 0.16);
          --selection-bg: #eaf5f0;
          background: #f4f6f8;
          color: #17212b;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          letter-spacing: 0;
          overflow-x: hidden;
        }

        .index-mode .index-navbar {
          min-height: 64px;
          padding: 0;
          border-bottom: 1px solid #dce2e7;
          background: rgba(255, 255, 255, 0.97);
          box-shadow: 0 2px 8px rgba(23, 33, 43, 0.06);
          backdrop-filter: blur(12px);
        }

        .index-mode .index-navbar .nav-content {
          width: 100%;
          min-width: 0;
          min-height: 64px;
          max-width: 1520px;
          gap: 1.25rem;
          padding: 0 1.5rem;
        }

        .index-brand {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          color: #17212b;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .index-brand-mark {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: #17212b;
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 800;
        }

        .index-nav-actions {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          margin-left: auto;
        }

        .index-mode .index-nav-actions .job-count {
          color: #52606d;
          font-family: inherit;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .index-mode .container {
          width: 100%;
          max-width: 1520px;
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          grid-template-rows: auto auto;
          align-items: start;
          gap: 1rem 1.25rem;
          padding: 1.5rem;
        }

        .index-mode .filters {
          position: sticky;
          top: 80px;
          grid-column: 1;
          grid-row: 1 / span 2;
          margin: 0;
          padding: 0;
          overflow: hidden;
          border: 1px solid #dce2e7;
          border-radius: 6px;
          background: #ffffff;
          box-shadow: 0 3px 12px rgba(23, 33, 43, 0.05);
        }

        .index-filter-header {
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0 1rem;
          border-bottom: 1px solid #e5e9ed;
        }

        .index-filter-header strong {
          font-size: 0.9rem;
          font-weight: 700;
        }

        .index-filter-reset {
          color: #0a66c2;
          text-decoration: none;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .index-mode .filter-grid {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0;
        }

        .index-mode .filter-group,
        .index-mode .industry-filter,
        .index-mode .filter-actions {
          width: 100%;
          padding: 0.85rem 1rem;
          border-top: 1px solid #eef1f3;
        }

        .index-mode .filter-group:first-of-type {
          border-top: 0;
        }

        .index-mode .filter-group label,
        .index-mode .industry-mode label {
          margin-bottom: 0.4rem;
          color: #52606d;
          font-family: inherit;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0;
          text-transform: none;
        }

        .index-mode .filter-group input,
        .index-mode .filter-group select {
          height: 38px;
          padding: 0 0.65rem;
          border: 1px solid #c8d0d8;
          border-radius: 4px;
          background: #ffffff;
          color: #17212b;
          font-size: 0.82rem;
        }

        .index-mode .filter-group input:focus,
        .index-mode .filter-group select:focus {
          border-color: #0a66c2;
          box-shadow: 0 0 0 2px rgba(8, 127, 91, 0.12);
        }

        .index-mode .industry-filter {
          grid-column: auto;
          margin: 0;
        }

        .index-mode .industry-filter h3 {
          margin: 0 0 0.65rem !important;
          color: #17212b !important;
          font-size: 0.8rem !important;
        }

        .index-mode .industry-controls {
          display: grid;
          gap: 0.45rem;
          margin-bottom: 0.65rem;
        }

        .index-mode .industry-checkboxes {
          grid-template-columns: 1fr;
          max-height: 190px;
          gap: 0.35rem;
          padding: 0.65rem;
          border: 1px solid #dce2e7;
          border-radius: 4px;
          background: #f8fafb;
          scrollbar-color: #aeb9c3 #f8fafb;
        }

        .index-mode .industry-checkbox {
          color: #52606d;
          font-size: 0.76rem;
        }

        .index-mode .filter-actions {
          flex-direction: column;
          align-items: stretch;
          gap: 0.5rem;
        }

        .index-mode .search-btn,
        .index-mode .clear-btn {
          width: 100%;
          height: 40px;
          border-radius: 4px;
          font-family: inherit;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .index-mode .search-btn {
          background: #0a66c2;
          color: #ffffff;
        }

        .index-mode .search-btn:hover {
          background: #004182;
          box-shadow: none;
          transform: none;
        }

        .index-mode .clear-btn {
          border-color: #c8d0d8;
          color: #52606d;
        }

        .index-mode .jobs-container {
          display: grid;
          grid-column: 2;
          grid-row: 1;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
          margin: 0;
        }

        .index-mode .job-card {
          min-width: 0;
          overflow: hidden;
          padding: 1rem;
          border: 1px solid #dce2e7;
          border-radius: 6px;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(23, 33, 43, 0.04);
        }

        .index-mode .job-card::before {
          top: 12px;
          bottom: 12px;
          width: 3px;
          border-radius: 0 2px 2px 0;
          background: #0a66c2;
        }

        .index-mode .job-card:hover {
          border-color: #aeb9c3;
          background: #ffffff;
          box-shadow: 0 6px 18px rgba(23, 33, 43, 0.09);
          transform: translateY(-1px);
        }

        .index-mode .job-card.visited {
          opacity: 1;
          border-color: #9cc3e8;
          background: #eef3f8;
        }

        .index-mode .job-header {
          align-items: flex-start;
          gap: 0.8rem;
          margin-bottom: 0.75rem;
        }

        .index-mode .company-logo {
          width: 44px;
          height: 44px;
          border-color: #dce2e7;
          border-radius: 4px;
        }

        .index-mode .job-title {
          margin-bottom: 0.25rem;
          font-size: 1rem;
          line-height: 1.3;
        }

        .index-mode .job-title a {
          color: #0a66c2;
        }

        .index-mode .job-title a:hover {
          color: #004182;
          text-decoration: underline;
        }

        .index-mode .company-name,
        .index-mode .company-name a {
          color: #17212b;
          font-size: 0.84rem;
        }

        .index-mode .job-industry,
        .index-mode .job-location {
          color: #667785;
          font-size: 0.78rem;
        }

        .index-mode .job-footer {
          gap: 0.8rem 1.25rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-color: #eef1f3;
        }

        .index-mode .job-meta {
          color: #667785;
          font-family: inherit;
          font-size: 0.73rem;
        }

        .index-mode .scroll-sentinel {
          grid-column: 2;
          grid-row: 2;
          margin: 0;
          color: #667785;
        }

        @media (max-width: 1180px) {
          .index-mode .jobs-container {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 820px) {
          .index-mode .index-navbar .nav-content {
            padding: 0 1rem;
          }

          .index-mode .index-nav-actions .job-count {
            display: none;
          }

          .index-mode .container {
            width: auto;
            min-width: 0;
            margin: 0;
            display: block;
            padding: 1rem;
          }

          .index-mode .filters {
            width: 100%;
            min-width: 0;
            position: static;
            margin-bottom: 1rem;
          }

          .index-mode .filter-grid,
          .index-mode .filter-group,
          .index-mode .industry-filter,
          .index-mode .filter-actions,
          .index-mode .filter-group input,
          .index-mode .filter-group select {
            min-width: 0;
            max-width: 100%;
          }

          .index-mode .filter-group input,
          .index-mode .filter-group select {
            width: 100%;
          }

          .index-mode .jobs-container {
            min-width: 0;
            grid-template-columns: 1fr;
          }

          .index-mode .scroll-sentinel {
            margin-top: 1rem;
          }
        }

        .index-mode {
          --index-bg: #f3f2ef;
          --index-surface: #ffffff;
          --index-surface-soft: #f8f9fa;
          --index-text: #1d2226;
          --index-text-muted: #5e6c78;
          --index-border: #d6d9dc;
          --index-border-strong: #aeb7bf;
          --index-accent: #0a66c2;
          --index-accent-hover: #004182;
          --index-focus: rgba(10, 102, 194, 0.18);
          --index-shadow: rgba(29, 34, 38, 0.08);
          --index-visited: #eef3f8;
          --bg-primary: var(--index-bg);
          --bg-secondary: var(--index-surface);
          --bg-tertiary: var(--index-surface-soft);
          --text-primary: var(--index-text);
          --text-secondary: var(--index-text-muted);
          --text-tertiary: var(--index-text-muted);
          --text-muted: var(--index-text-muted);
          --border-primary: var(--index-border);
          --border-secondary: var(--index-border-strong);
          --border-accent: var(--index-border-strong);
          --accent-primary: var(--index-accent);
          --accent-secondary: var(--index-accent);
          --shadow-accent: var(--index-focus);
          background: var(--index-bg);
          color: var(--index-text);
        }

        [data-theme="dark"] .index-mode {
          --index-bg: #171717;
          --index-surface: #242424;
          --index-surface-soft: #2c2c2c;
          --index-text: #f3f3f3;
          --index-text-muted: #b7bec5;
          --index-border: #3e4144;
          --index-border-strong: #5d6267;
          --index-accent: #70b5f9;
          --index-accent-hover: #a8d5ff;
          --index-focus: rgba(112, 181, 249, 0.22);
          --index-shadow: rgba(0, 0, 0, 0.28);
          --index-visited: #202c38;
          color-scheme: dark;
        }

        .index-mode .index-navbar {
          border-color: var(--index-border);
          background: var(--index-surface);
          box-shadow: 0 2px 8px var(--index-shadow);
        }

        .index-brand {
          color: var(--index-text);
        }

        .index-brand-mark {
          width: 36px;
          height: 36px;
          border-radius: 4px;
          background: #0a66c2;
          color: #ffffff;
          font-family: Arial, sans-serif;
          font-size: 1.05rem;
          line-height: 1;
          text-transform: lowercase;
        }

        .index-brand-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }

        .index-brand-copy strong {
          color: var(--index-text);
          font-size: 0.92rem;
          font-weight: 700;
        }

        .index-brand-copy small {
          margin-top: 0.2rem;
          color: var(--index-text-muted);
          font-size: 0.68rem;
          font-weight: 500;
        }

        .index-mode .index-nav-actions .job-count {
          color: var(--index-text-muted);
        }

        .index-theme-toggle {
          min-width: 82px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0 0.7rem;
          border: 1px solid var(--index-border-strong);
          border-radius: 18px;
          background: var(--index-surface-soft);
          color: var(--index-text);
          cursor: pointer;
          font: 600 0.75rem/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }

        .index-theme-toggle:hover,
        .index-theme-toggle:focus-visible {
          border-color: var(--index-accent);
          color: var(--index-accent);
          outline: none;
        }

        .index-mode .filters {
          border-color: var(--index-border);
          background: var(--index-surface);
          box-shadow: 0 3px 12px var(--index-shadow);
        }

        .index-filter-header,
        .index-mode .filter-group,
        .index-mode .industry-filter,
        .index-mode .filter-actions {
          border-color: var(--index-border);
        }

        .index-filter-header strong,
        .index-mode .industry-filter h3 {
          color: var(--index-text) !important;
        }

        .index-filter-reset,
        .index-mode .job-title a {
          color: var(--index-accent);
        }

        .index-filter-reset:hover,
        .index-mode .job-title a:hover {
          color: var(--index-accent-hover);
        }

        .index-mode .filter-group label,
        .index-mode .industry-mode label,
        .index-mode .industry-checkbox,
        .index-mode .job-industry,
        .index-mode .job-location,
        .index-mode .job-meta,
        .index-mode .scroll-sentinel {
          color: var(--index-text-muted);
        }

        .index-mode input[type="radio"],
        .index-mode input[type="checkbox"] {
          accent-color: #0a66c2;
        }

        .index-mode .filter-group input,
        .index-mode .filter-group select {
          border-color: var(--index-border-strong);
          background: var(--index-surface-soft);
          color: var(--index-text);
        }

        .index-mode .filter-group input::placeholder {
          color: var(--index-text-muted);
          opacity: 0.85;
        }

        .index-mode .filter-group input:focus,
        .index-mode .filter-group select:focus {
          border-color: var(--index-accent);
          box-shadow: 0 0 0 2px var(--index-focus);
        }

        .index-mode .industry-checkboxes {
          border-color: var(--index-border);
          background: var(--index-surface-soft);
          scrollbar-color: var(--index-border-strong) var(--index-surface-soft);
        }

        .index-mode .search-btn {
          background: #0a66c2;
          color: #ffffff;
        }

        .index-mode .search-btn:hover {
          background: #004182;
        }

        .index-mode .clear-btn {
          border-color: var(--index-border-strong);
          background: transparent;
          color: var(--index-text-muted);
        }

        .index-mode .clear-btn:hover {
          border-color: var(--index-accent);
          background: var(--index-surface-soft);
          color: var(--index-accent);
        }

        .index-mode .job-card,
        .index-mode .job-card:hover {
          border-color: var(--index-border);
          background: var(--index-surface);
        }

        .index-mode .job-card {
          box-shadow: 0 2px 8px var(--index-shadow);
        }

        .index-mode .job-card:hover {
          border-color: var(--index-border-strong);
          box-shadow: 0 6px 18px var(--index-shadow);
        }

        .index-mode .job-card::before {
          background: #0a66c2;
        }

        .index-mode .job-card.visited {
          border-color: var(--index-accent);
          background: var(--index-visited);
        }

        .index-mode .job-card.visited .job-title a {
          color: var(--index-accent);
        }

        .index-mode .company-logo {
          border-color: var(--index-border);
          background: #ffffff;
        }

        .index-mode .company-name,
        .index-mode .company-name a {
          color: var(--index-text);
        }

        .index-mode .job-footer {
          border-color: var(--index-border);
        }

        /* LinkedIn-style search and filter controls for /index. */
        .index-mode .container {
          width: 100%;
          max-width: none;
          display: block;
          margin: 0 auto;
          padding: 0 0 1.5rem;
        }

        .index-mode .index-filter-toolbar {
          position: sticky;
          top: 64px;
          z-index: 90;
          width: calc(100% - 3rem);
          max-width: 900px;
          margin: 0 auto 1rem;
          padding: 0;
          overflow: visible;
          border: 1px solid var(--index-border);
          border-top: 0;
          border-radius: 0 0 6px 6px;
          background: var(--index-surface);
          box-shadow: 0 2px 7px var(--index-shadow);
        }

        .index-linkedin-filter-row {
          width: 100%;
          max-width: none;
          margin: 0 auto;
          padding-right: clamp(0.75rem, 2vw, 1.5rem);
          padding-left: clamp(0.75rem, 2vw, 1.5rem);
        }

        .index-linkedin-filter-row {
          min-height: 54px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          overflow-x: auto;
          padding-top: 0.55rem;
          padding-bottom: 0.55rem;
          scrollbar-width: none;
        }

        .index-linkedin-filter-row::-webkit-scrollbar {
          display: none;
        }

        .index-mode .index-linkedin-filter-row .filter-pill {
          min-height: 36px;
          border-color: var(--index-border-strong);
          background: var(--index-surface);
          color: var(--index-text);
          font-size: 0.82rem;
        }

        .index-mode .index-linkedin-filter-row .filter-pill:hover,
        .index-mode .index-linkedin-filter-row .filter-pill:focus-visible {
          border-color: var(--index-text);
          background: var(--index-surface-soft);
          box-shadow: inset 0 0 0 1px var(--index-text);
        }

        .index-mode .index-linkedin-filter-row .filter-pill-primary {
          border-color: #057642;
          background: #057642;
          color: #ffffff;
        }

        .index-mode .index-linkedin-filter-row .filter-pill-primary:hover,
        .index-mode .index-linkedin-filter-row .filter-pill-primary:focus-visible {
          border-color: #004c33;
          background: #004c33;
          color: #ffffff;
          box-shadow: none;
        }

        .index-mode .index-linkedin-filter-row .filter-pill.applied {
          border-color: #057642;
          background: #e7f3ef;
          color: #004c33;
        }

        [data-theme="dark"] .index-mode .index-linkedin-filter-row .filter-pill.applied {
          border-color: #7fc9a8;
          background: #173e30;
          color: #b7ead3;
        }

        .index-linkedin-reset {
          flex: 0 0 auto;
          padding: 0.45rem 0.35rem;
          color: var(--index-text-muted);
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }

        .index-linkedin-reset:hover {
          color: var(--index-accent);
          text-decoration: underline;
        }

        .index-filter-result-count {
          flex: 0 0 auto;
          margin-left: auto;
          color: var(--index-text-muted);
          font-size: 0.76rem;
          white-space: nowrap;
        }

        .index-mode .filter-drawer,
        .index-mode .filter-drawer-footer {
          border-color: var(--index-border);
          background: var(--index-surface);
          color: var(--index-text);
        }

        .index-mode .filter-drawer-header,
        .index-mode .drawer-filter-section {
          border-color: var(--index-border);
        }

        .index-mode .filter-drawer-close,
        .index-mode .filter-reset-link,
        .index-mode .drawer-field-label,
        .index-mode .drawer-choice,
        .index-mode .filter-drawer .industry-checkbox,
        .index-mode .filter-drawer .industry-checkbox label {
          color: var(--index-text-muted);
        }

        .index-mode .filter-drawer-close:hover {
          background: var(--index-surface-soft);
        }

        .index-mode .drawer-filter-section > input[type="text"],
        .index-mode .drawer-filter-section > input[type="number"],
        .index-mode .filter-drawer .industry-checkboxes {
          border-color: var(--index-border-strong);
          background: var(--index-surface-soft);
          color: var(--index-text);
        }

        .index-mode .industry-mode-switch {
          border-color: var(--index-border-strong);
        }

        .index-mode .industry-mode-switch span {
          color: var(--index-text-muted);
        }

        .index-mode .index-job-list {
          width: calc(100% - 3rem);
          max-width: 900px;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 0.55rem;
          margin: 0 auto;
        }

        .index-mode .index-job-list .job-card {
          min-height: 128px;
          padding: 1rem 1.2rem;
          border-radius: 6px;
          box-shadow: 0 1px 3px var(--index-shadow);
        }

        .index-mode .index-job-list .job-card:hover {
          transform: none;
          box-shadow: 0 3px 10px var(--index-shadow);
        }

        .index-mode .index-job-list .job-header {
          flex-direction: row;
          align-items: flex-start;
          margin-bottom: 0.55rem;
          text-align: left;
        }

        .index-mode .index-job-list .company-logo {
          width: 52px;
          height: 52px;
        }

        .index-mode .index-job-list .job-footer {
          margin-top: 0.55rem;
          padding-top: 0.55rem;
        }

        .index-mode .scroll-sentinel {
          width: calc(100% - 3rem);
          max-width: 900px;
          margin: 1rem auto 0;
        }

        @media (max-width: 700px) {
          .index-filter-result-count {
            display: none;
          }
        }

        @media (max-width: 520px) {
          .index-mode .container {
            width: 100%;
            padding: 0 0 1rem;
          }

          .index-mode .index-filter-toolbar {
            width: calc(100% - 1.5rem);
            position: static;
            margin-bottom: 0.75rem;
            border-top: 1px solid var(--index-border);
            border-radius: 6px;
          }

          .index-mode .index-job-list .job-card {
            min-height: 0;
            padding: 0.9rem;
          }

          .index-mode .index-job-list .company-logo {
            width: 46px;
            height: 46px;
          }

          .index-mode .index-job-list,
          .index-mode .scroll-sentinel {
            width: calc(100% - 1.5rem);
          }
        }

        .footer {
          text-align: center;
          padding: 2rem 0;
          border-top: 1px solid var(--border-primary);
          color: var(--text-tertiary);
          font-size: 0.9rem;
        }

        @media (max-width: 1100px) {
          .paged-mode .page-topbar .nav-content {
            grid-template-columns: auto minmax(330px, 1fr) auto;
          }

          .page-nav-item {
            min-width: 44px;
            padding-right: 0.3rem;
            padding-left: 0.3rem;
          }

          .page-nav-label {
            display: none;
          }
        }

        @media (max-width: 900px) {
          .page-nav-secondary {
            display: none;
          }

          .filter-drawer {
            width: 100%;
          }

          .job-board-layout {
            grid-template-columns: 1fr;
          }

          .job-list-pane {
            border-right: 0;
          }

          .paged-mode .job-detail-panel {
            display: none;
            position: fixed;
            inset: 0;
            top: 0;
            z-index: 500;
            width: 100%;
            height: 100%;
            min-height: 0;
          }

          .job-detail-panel.is-open {
            display: block;
          }

          .detail-close {
            display: flex;
            margin-right: 0.75rem;
          }

          .detail-header-actions {
            top: 0.75rem;
            right: 4.25rem;
          }

          body.detail-open {
            overflow: hidden;
          }
        }

        @media (max-width: 768px) {
          body.paged-mode {
            --page-nav-height: 108px;
          }

          .chat-shell {
            right: 0.5rem;
            width: min(340px, calc(100vw - 1rem));
          }

          .chat-conversation-shell {
            right: 0.5rem;
            width: min(520px, calc(100vw - 1rem));
            min-width: 0;
            z-index: 322;
          }

          .chat-panel,
          .chat-conversation-panel {
            height: min(460px, calc(100vh - 130px));
          }

          .container {
            padding: 1rem;
          }

          .paged-mode .page-topbar .nav-content {
            min-height: var(--page-nav-height);
            grid-template-columns: auto 1fr;
            grid-template-rows: 48px 52px;
            gap: 0 0.6rem;
            padding: 0 0.65rem 0.4rem;
          }

          .page-brand {
            grid-column: 1;
            grid-row: 1;
          }

          .page-search-form {
            grid-column: 1 / -1;
            grid-row: 2;
            grid-template-columns: minmax(110px, 1.1fr) minmax(95px, 0.9fr) auto;
          }

          .page-nav-actions {
            grid-column: 2;
            grid-row: 1;
          }

          .page-nav-item {
            height: 48px;
          }

          .paged-mode .logo {
            font-size: 1rem;
          }

          .paged-mode .job-count {
            display: none;
          }

          .paged-mode .auto-refresh-control > span:first-child {
            display: none;
          }

          .page-filter-toolbar {
            padding: 0 0.5rem;
          }

          .page-search-submit {
            padding-right: 0.8rem;
            padding-left: 0.8rem;
          }

          .filter-drawer-header,
          .filter-drawer-footer {
            padding-right: 1rem;
            padding-left: 1rem;
          }

          .filter-drawer-body {
            padding: 0 1rem;
          }

          .drawer-radio-grid,
          .filter-drawer .industry-checkboxes {
            grid-template-columns: 1fr;
          }

          .hero h1 {
            font-size: 2.5rem;
          }

          .filter-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .industry-checkboxes {
            grid-template-columns: 1fr;
          }

          .industry-controls {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .filter-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .job-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .paged-mode .job-header {
            flex-direction: row;
            align-items: flex-start;
            text-align: left;
          }

          .paged-mode .job-footer {
            justify-content: flex-start;
          }

          .job-detail-header,
          .job-detail-content {
            padding: 1.25rem;
          }

          .job-recruiter {
            margin: 1.25rem 1.25rem 0;
            padding: 1.1rem;
          }

          .job-detail-header {
            padding-right: 7.5rem;
          }

          .job-detail-title {
            font-size: 1.5rem;
          }

          .job-criterion {
            grid-template-columns: 1fr;
            gap: 0.25rem;
          }

          .job-footer {
            justify-content: center;
          }
        }
      </style>
    </head>
    <body class="${useInfiniteScroll ? 'scroll-mode' : 'paged-mode'}${isIndexMode ? ' index-mode' : ''}">
      ${useInfiniteScroll ? `
        ${isIndexMode ? `
          <nav class="navbar index-navbar" aria-label="Primary navigation">
            <div class="nav-content">
              <a href="/index" class="index-brand" aria-label="LinkedIn Job Board home">
                <span class="index-brand-mark" aria-hidden="true">in</span>
                <span class="index-brand-copy">
                  <strong>LinkedIn Job Board</strong>
                  <small>Remote US roles</small>
                </span>
              </a>
              <div class="index-nav-actions">
                <span class="job-count" id="job-count">${totalJobs.toLocaleString()} positions</span>
                <button type="button" class="index-theme-toggle" onclick="toggleTheme()" aria-label="Toggle color theme" title="Toggle color theme">
                  <span id="theme-icon" aria-hidden="true">☀</span>
                  <span id="theme-text">Light</span>
                </button>
              </div>
            </div>
          </nav>
        ` : `
          <nav class="navbar">
            <div class="nav-content">
              <a href="${jobsPath}" class="logo">-----</a>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="job-count" id="job-count">${totalJobs.toLocaleString()} positions</div>
                <button class="theme-toggle" onclick="toggleTheme()">
                  <span id="theme-icon">🌙</span>
                  <span id="theme-text">Dark</span>
                </button>
              </div>
            </div>
          </nav>
        `}
      ` : `
        <nav class="navbar page-topbar" aria-label="Primary navigation">
          <div class="nav-content">
            <a href="/page" class="page-brand" aria-label="Jobs home">in</a>
            <form class="page-search-form" method="get" action="/page" role="search">
              ${empMax ? `<input type="hidden" name="emp" value="${empMax}">` : ''}
              ${companyQuery ? `<input type="hidden" name="company" value="${escapeAttribute(companyQuery)}">` : ''}
              ${lastday ? `<input type="hidden" name="lastday" value="${lastday}">` : ''}
              ${industries && industries.length ? `<input type="hidden" name="industries" value="${escapeAttribute(industries.join(','))}">` : ''}
              ${industries && industries.length ? `<input type="hidden" name="industryMode" value="${escapeAttribute(industryMode)}">` : ''}
              <label class="page-search-field">
                <span class="search-field-icon" aria-hidden="true">&#128269;&#65038;</span>
                <span class="visually-hidden">Search jobs</span>
                <input type="search" name="title" value="${escapeAttribute(titleQuery)}" placeholder="developer or engineer">
              </label>
              <label class="page-search-field">
                <span class="search-field-icon" aria-hidden="true">&#8982;</span>
                <span class="visually-hidden">Search location</span>
                <input type="search" name="location" value="${escapeAttribute(locationQuery)}" placeholder="City, state, or country">
              </label>
              <button type="submit" class="page-search-submit">Search</button>
            </form>
            <div class="page-nav-actions">
              <a class="page-nav-item" href="/page" title="Home">
                <span class="page-nav-glyph" aria-hidden="true">&#8962;</span>
                <span class="page-nav-alert-dot" aria-hidden="true"></span>
                <span class="page-nav-label">Home</span>
              </a>
              <a class="page-nav-item page-nav-secondary" href="/company" title="Companies">
                <span class="page-nav-glyph" aria-hidden="true">&#128101;&#65038;</span><span class="page-nav-label">Companies</span>
              </a>
              <a class="page-nav-item active" href="#jobs-container" title="Jobs" aria-current="page">
                <span class="page-nav-glyph" aria-hidden="true">&#128188;&#65038;</span><span class="page-nav-label">Jobs</span>
              </a>
              <button type="button" class="page-nav-item page-nav-secondary" title="Messaging" aria-label="Messaging" onclick="openChatBox()">
                <span class="page-nav-glyph" aria-hidden="true">&#128172;&#65038;</span>
              </button>
              <div class="page-nav-item page-nav-item-static page-nav-live" title="Live job updates">
                <span class="page-nav-glyph" aria-hidden="true">&#128276;&#65038;</span>
                <span class="page-nav-label">Live</span>
                <span class="page-nav-live-indicator" aria-hidden="true"></span>
              </div>
              <div class="page-nav-item page-nav-item-static" title="Profile">
                <img src="/assets/profile-avatar.png" class="page-profile-image" alt="Profile">
                <span class="page-nav-label">Me</span>
              </div>
              <button type="button" class="page-nav-item page-theme-toggle" onclick="toggleTheme()" aria-label="Toggle color theme" title="Toggle color theme">
                <span class="page-nav-glyph" id="theme-icon" aria-hidden="true">&#9788;</span>
                <span class="page-nav-label" id="theme-text">Light</span>
              </button>
              <span class="page-nav-divider page-nav-secondary" aria-hidden="true"></span>
              <a class="page-nav-item page-nav-secondary" href="/company" title="Apps">
                <span class="page-nav-glyph" aria-hidden="true">&#9638;</span><span class="page-nav-label">Apps</span>
              </a>
            </div>
          </div>
        </nav>
      `}


      <div class="container">
        ${useInfiniteScroll ? `
          <div class="filters${isIndexMode ? ' index-filter-toolbar' : ''}">
            ${isIndexMode ? `
              <div class="index-linkedin-filter-row" aria-label="Job filters">
                <a href="/index" class="filter-pill filter-pill-primary">Jobs <span class="filter-chevron" aria-hidden="true"></span></a>
                <button type="button" class="filter-pill ${lastday ? 'applied' : ''}" onclick="openPageFilters('date-filter-section')">
                  <span>${dateFilterLabel}</span><span class="filter-chevron" aria-hidden="true"></span>
                </button>
                <button type="button" class="filter-pill ${companyQuery ? 'applied' : ''}" onclick="openPageFilters('company-filter-section')">
                  <span>${companyQuery ? escapeAttribute(companyQuery) : 'Company'}</span><span class="filter-chevron" aria-hidden="true"></span>
                </button>
                <button type="button" class="filter-pill ${empMax ? 'applied' : ''}" onclick="openPageFilters('size-filter-section')">
                  <span>${empMax ? `Up to ${empMax.toLocaleString()}` : 'Company size'}</span><span class="filter-chevron" aria-hidden="true"></span>
                </button>
                <button type="button" class="filter-pill ${(industries && industries.length) ? 'applied' : ''}" onclick="openPageFilters('industry-filter-section')">
                  <span>${industries && industries.length ? `${industries.length} industries` : 'Industry'}</span><span class="filter-chevron" aria-hidden="true"></span>
                </button>
                <button type="button" class="filter-pill all-filters-pill ${hasActiveFilters ? 'applied' : ''}" onclick="openPageFilters()">
                  All filters${hasActiveFilters ? '<span class="filter-count-dot" aria-hidden="true"></span>' : ''}
                </button>
                ${hasActiveFilters ? '<a class="index-linkedin-reset" href="/index">Reset</a>' : ''}
                <span class="index-filter-result-count job-count" id="job-count">${totalJobs.toLocaleString()} positions</span>
              </div>

              <div class="filter-drawer-backdrop" id="filter-drawer-backdrop" aria-hidden="true" onclick="if (event.target === this) closePageFilters()">
                <aside class="filter-drawer" role="dialog" aria-modal="true" aria-labelledby="filter-drawer-title">
                  <header class="filter-drawer-header">
                    <h2 id="filter-drawer-title">All filters</h2>
                    <button type="button" class="filter-drawer-close" aria-label="Close filters" onclick="closePageFilters()">&times;</button>
                  </header>
                  <form method="get" action="/index" id="filter-form" class="filter-drawer-form">
                    <div class="filter-drawer-body">
                      <section class="drawer-filter-section" id="title-filter-section">
                        <h3>Job title</h3>
                        <input type="text" name="title" value="${escapeAttribute(titleQuery)}" placeholder="Search job titles">
                      </section>
                      <section class="drawer-filter-section" id="location-filter-section">
                        <h3>Location</h3>
                        <input type="text" name="location" value="${escapeAttribute(locationQuery)}" placeholder="City, state, or Remote">
                      </section>
                      <section class="drawer-filter-section" id="company-filter-section">
                        <h3>Company</h3>
                        <input type="text" name="company" value="${escapeAttribute(companyQuery)}" placeholder="Search companies">
                      </section>
                      <section class="drawer-filter-section" id="date-filter-section">
                        <h3>Date posted</h3>
                        <div class="drawer-radio-grid">
                          ${[
                            [0, 'Any time'], [1, 'Past 24 hours'], [3, 'Past 3 days'],
                            [7, 'Past week'], [14, 'Past 2 weeks'], [30, 'Past month']
                          ].map(([value, label]) => `
                            <label class="drawer-choice">
                              <input type="radio" name="lastday" value="${value}" ${lastday == value ? 'checked' : ''}>
                              <span>${label}</span>
                            </label>
                          `).join('')}
                        </div>
                      </section>
                      <section class="drawer-filter-section" id="size-filter-section">
                        <h3>Company size</h3>
                        <label class="drawer-field-label" for="index-drawer-emp">Maximum employees</label>
                        <input type="number" id="index-drawer-emp" name="emp" value="${empMax || ''}" min="1" placeholder="No maximum">
                      </section>
                      <section class="drawer-filter-section" id="industry-filter-section">
                        <div class="drawer-section-heading">
                          <h3>Industry</h3>
                          <div class="industry-mode-switch" aria-label="Industry filter mode">
                            <label><input type="radio" name="industryMode" value="include" ${industryMode === 'include' ? 'checked' : ''}><span>Include</span></label>
                            <label><input type="radio" name="industryMode" value="exclude" ${industryMode === 'exclude' ? 'checked' : ''}><span>Exclude</span></label>
                          </div>
                        </div>
                        <div class="industry-checkboxes" id="industry-checkboxes">
                          <div class="drawer-loading">Loading industries...</div>
                        </div>
                      </section>
                    </div>
                    <footer class="filter-drawer-footer">
                      <a href="/index" class="filter-reset-link">Reset</a>
                      <button type="submit" class="filter-show-results">Show results</button>
                    </footer>
                  </form>
                </aside>
              </div>
            ` : `
              <form class="filter-grid" method="get" action="${jobsPath}" id="filter-form">
                <div class="filter-group">
                  <label for="emp">Company Size</label>
                  <input type="number" id="emp" name="emp" value="${empMax || ""}" min="1" placeholder="Max employees" />
                </div>
                <div class="filter-group">
                  <label for="company">Company Name</label>
                  <input type="text" id="company" name="company" value="${escapeAttribute(companyQuery)}" placeholder="Filter by company" />
                </div>
                <div class="filter-group">
                  <label for="title">Job Title</label>
                  <input type="text" id="title" name="title" value="${escapeAttribute(titleQuery)}" placeholder="Filter by job title" />
                </div>
                <div class="filter-group">
                  <label for="lastday">Within</label>
                  <select id="lastday" name="lastday">
                    <option value="0" ${lastday == 0 ? "selected" : ""}>All time</option>
                    <option value="1" ${lastday == 1 ? "selected" : ""}>Last 24 hours</option>
                    <option value="3" ${lastday == 3 ? "selected" : ""}>Last 3 days</option>
                    <option value="7" ${lastday == 7 ? "selected" : ""}>Last week</option>
                    <option value="14" ${lastday == 14 ? "selected" : ""}>Last 2 weeks</option>
                    <option value="30" ${lastday == 30 ? "selected" : ""}>Last month</option>
                  </select>
                </div>
                <div class="industry-filter">
                  <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem;">Industry Filter</h3>
                  <div class="industry-controls">
                    <div class="industry-mode">
                      <input type="radio" id="include-mode" name="industryMode" value="include" ${industryMode === 'include' ? 'checked' : ''}>
                      <label for="include-mode">Include selected industries</label>
                    </div>
                    <div class="industry-mode">
                      <input type="radio" id="exclude-mode" name="industryMode" value="exclude" ${industryMode === 'exclude' ? 'checked' : ''}>
                      <label for="exclude-mode">Exclude selected industries</label>
                    </div>
                  </div>
                  <div class="industry-checkboxes" id="industry-checkboxes">
                    <div style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading industries...</div>
                  </div>
                </div>
                <div class="filter-actions">
                  <button type="submit" class="search-btn">Filter Jobs</button>
                  ${hasActiveFilters ? `<a href="${jobsPath}" class="clear-btn">Clear All</a>` : ""}
                </div>
              </form>
            `}
          </div>
        ` : `
          <div class="filters page-filter-shell">
            <div class="page-filter-toolbar" aria-label="Job filters">
              <a href="/page" class="filter-pill filter-pill-primary">Jobs</a>
              <button type="button" class="filter-pill ${lastday ? 'applied' : ''}" onclick="openPageFilters('date-filter-section')">
                <span>${dateFilterLabel}</span><span class="filter-chevron" aria-hidden="true"></span>
              </button>
              <button type="button" class="filter-pill ${companyQuery ? 'applied' : ''}" onclick="openPageFilters('company-filter-section')">
                <span>${companyQuery ? escapeAttribute(companyQuery) : 'Company'}</span><span class="filter-chevron" aria-hidden="true"></span>
              </button>
              <button type="button" class="filter-pill ${empMax ? 'applied' : ''}" onclick="openPageFilters('size-filter-section')">
                <span>${empMax ? `Up to ${empMax.toLocaleString()}` : 'Company size'}</span><span class="filter-chevron" aria-hidden="true"></span>
              </button>
              <button type="button" class="filter-pill ${(industries && industries.length) ? 'applied' : ''}" onclick="openPageFilters('industry-filter-section')">
                <span>${industries && industries.length ? `${industries.length} industries` : 'Industry'}</span><span class="filter-chevron" aria-hidden="true"></span>
              </button>
              <button type="button" class="filter-pill all-filters-pill ${hasActiveFilters ? 'applied' : ''}" onclick="openPageFilters()">
                All filters${hasActiveFilters ? '<span class="filter-count-dot" aria-hidden="true"></span>' : ''}
              </button>
              <span class="toolbar-job-count job-count" id="job-count">${totalJobs.toLocaleString()} positions</span>
            </div>

            <div class="filter-drawer-backdrop" id="filter-drawer-backdrop" aria-hidden="true" onclick="if (event.target === this) closePageFilters()">
              <aside class="filter-drawer" role="dialog" aria-modal="true" aria-labelledby="filter-drawer-title">
                <header class="filter-drawer-header">
                  <h2 id="filter-drawer-title">All filters</h2>
                  <button type="button" class="filter-drawer-close" aria-label="Close filters" onclick="closePageFilters()">&times;</button>
                </header>
                <form method="get" action="/page" id="filter-form" class="filter-drawer-form">
                  <div class="filter-drawer-body">
                    <section class="drawer-filter-section" id="title-filter-section">
                      <h3>Job title</h3>
                      <input type="text" name="title" value="${escapeAttribute(titleQuery)}" placeholder="Search job titles">
                    </section>
                    <section class="drawer-filter-section" id="location-filter-section">
                      <h3>Location</h3>
                      <input type="text" name="location" value="${escapeAttribute(locationQuery)}" placeholder="City, state, or country">
                    </section>
                    <section class="drawer-filter-section" id="company-filter-section">
                      <h3>Company</h3>
                      <input type="text" name="company" value="${escapeAttribute(companyQuery)}" placeholder="Search companies">
                    </section>
                    <section class="drawer-filter-section" id="date-filter-section">
                      <h3>Date posted</h3>
                      <div class="drawer-radio-grid">
                        ${[
                          [0, 'Any time'], [1, 'Past 24 hours'], [3, 'Past 3 days'],
                          [7, 'Past week'], [14, 'Past 2 weeks'], [30, 'Past month']
                        ].map(([value, label]) => `
                          <label class="drawer-choice">
                            <input type="radio" name="lastday" value="${value}" ${lastday == value ? 'checked' : ''}>
                            <span>${label}</span>
                          </label>
                        `).join('')}
                      </div>
                    </section>
                    <section class="drawer-filter-section" id="size-filter-section">
                      <h3>Company size</h3>
                      <label class="drawer-field-label" for="drawer-emp">Maximum employees</label>
                      <input type="number" id="drawer-emp" name="emp" value="${empMax || ''}" min="1" placeholder="No maximum">
                    </section>
                    <section class="drawer-filter-section" id="industry-filter-section">
                      <div class="drawer-section-heading">
                        <h3>Industry</h3>
                        <div class="industry-mode-switch" aria-label="Industry filter mode">
                          <label><input type="radio" name="industryMode" value="include" ${industryMode === 'include' ? 'checked' : ''}><span>Include</span></label>
                          <label><input type="radio" name="industryMode" value="exclude" ${industryMode === 'exclude' ? 'checked' : ''}><span>Exclude</span></label>
                        </div>
                      </div>
                      <div class="industry-checkboxes" id="industry-checkboxes">
                        <div class="drawer-loading">Loading industries...</div>
                      </div>
                    </section>
                  </div>
                  <footer class="filter-drawer-footer">
                    <a href="/page" class="filter-reset-link">Reset</a>
                    <button type="submit" class="filter-show-results">Show results</button>
                  </footer>
                </form>
              </aside>
            </div>
          </div>
        `}

        ${useInfiniteScroll ? `
          <div class="jobs-container${isIndexMode ? ' index-job-list' : ''}" id="jobs-container">
            ${jobCards}
          </div>
          <div class="scroll-sentinel" id="scroll-sentinel" role="status" aria-live="polite">
            <span class="loading-spinner" aria-hidden="true"></span>
            <span id="scroll-status"></span>
          </div>
        ` : `
          <div class="job-board-layout">
            <section class="job-list-pane" aria-label="Job results">
              <div class="jobs-container" id="jobs-container">
                ${jobCards}
              </div>
              <section class="job-list-feedback" aria-labelledby="job-feedback-title">
                <div>
                  <strong id="job-feedback-title">Are these results helpful?</strong>
                  <p id="job-feedback-status" aria-live="polite">Your feedback helps improve search results.</p>
                </div>
                <div class="job-feedback-actions" role="group" aria-label="Rate these job results">
                  <button type="button" class="job-feedback-button" data-job-feedback="not-helpful" aria-label="Not helpful" aria-pressed="false" onclick="rateJobResults('not-helpful')">&#128078;&#65038;</button>
                  <button type="button" class="job-feedback-button" data-job-feedback="helpful" aria-label="Helpful" aria-pressed="false" onclick="rateJobResults('helpful')">&#128077;&#65038;</button>
                </div>
              </section>
              <section class="job-list-promo" id="job-list-promo" aria-label="Recent matching jobs">
                <button type="button" class="job-list-promo-close" aria-label="Dismiss" onclick="dismissJobListPromo()">&times;</button>
                <strong>See the newest matching jobs</strong>
                <a class="job-list-promo-action" href="${escapeAttribute(recentJobsUrl)}">Jobs from the past 24 hours</a>
              </section>
              <div class="job-list-pagination" id="pagination-container">${pagination}</div>
              <footer class="job-list-footer">
                <div><span class="job-list-footer-brand">in</span> Job Viewer &copy; ${currentYear}</div>
              </footer>
            </section>
            <aside class="job-detail-panel" id="job-detail-panel" aria-live="polite">
              <div class="job-detail-state">
                <div class="detail-loading-spinner" aria-hidden="true"></div>
                <p>Loading job details...</p>
              </div>
            </aside>
          </div>
        `}
      </div>

      ${useInfiniteScroll ? '' : `
        <aside class="chat-shell collapsed" id="chat-shell" aria-label="Realtime messaging">
          <header class="chat-header">
            <button type="button" class="chat-header-main" onclick="toggleChatBox()" aria-controls="chat-panel" aria-expanded="false">
              <span class="chat-avatar-wrap">
                <img class="chat-avatar" src="/assets/profile-avatar.png" alt="">
                <span class="chat-online-dot" aria-hidden="true"></span>
              </span>
              <span class="chat-header-copy">
                <span class="chat-header-title">Messaging</span>
                <span class="chat-presence" id="chat-presence">Connecting...</span>
              </span>
              <span class="chat-unread" id="chat-unread" hidden>0</span>
            </button>
            <button type="button" class="chat-header-action" aria-label="Edit display name" title="Display name" onclick="toggleChatSettings(event)">&hellip;</button>
            <button type="button" class="chat-header-action" aria-label="Open messaging" title="Open messaging" onclick="toggleChatBox()">
              <span class="chat-toggle-icon" aria-hidden="true">&#8963;</span>
            </button>
          </header>
          <div class="chat-panel" id="chat-panel">
            <form class="chat-settings" id="chat-settings" onsubmit="saveChatDisplayName(event)" hidden>
              <label class="visually-hidden" for="chat-display-name">Display name</label>
              <input type="text" id="chat-display-name" maxlength="60" autocomplete="nickname" placeholder="Display name" required>
              <button type="submit">Save</button>
            </form>
            <div class="chat-connection" id="chat-connection" role="status">Connecting to realtime chat...</div>
            <div class="chat-list-view" id="chat-list-view">
              <div class="chat-user-search">
                <label class="visually-hidden" for="chat-user-search">Search developers</label>
                <input type="search" id="chat-user-search" placeholder="Search developers" oninput="filterChatUsers()">
              </div>
              <div class="chat-user-list" id="chat-user-list" aria-live="polite">
                <div class="chat-empty">No other developers yet.</div>
              </div>
            </div>
          </div>
        </aside>
        <aside class="chat-conversation-shell" id="chat-conversation-shell" aria-label="Direct conversation" hidden>
          <header class="chat-conversation-header">
            <span class="chat-user-avatar" id="chat-conversation-avatar" aria-hidden="true"></span>
            <span class="chat-user-copy">
              <span class="chat-user-name" id="chat-conversation-name"></span>
              <span class="chat-user-status" id="chat-conversation-status"></span>
            </span>
            <button type="button" class="chat-conversation-action" aria-label="Minimize conversation" title="Minimize" onclick="toggleChatConversation()">&#8963;</button>
            <button type="button" class="chat-conversation-action" aria-label="Close conversation" title="Close" onclick="closeChatConversation()">&times;</button>
          </header>
          <div class="chat-conversation-panel" id="chat-conversation-panel">
              <div class="chat-messages" id="chat-messages" aria-live="polite" aria-label="Messages">
                <div class="chat-empty">Select a developer to start messaging.</div>
              </div>
              <form class="chat-composer" id="chat-composer" onsubmit="sendChatMessage(event)">
                <label class="visually-hidden" for="chat-message-input">Message</label>
                <textarea id="chat-message-input" maxlength="1000" rows="1" placeholder="Write a message..." onkeydown="handleChatComposerKeydown(event)" required></textarea>
                <button type="submit" class="chat-send" id="chat-send" aria-label="Send message" title="Send" disabled>&#10148;</button>
              </form>
          </div>
        </aside>
      `}

      ${useInfiniteScroll && !isIndexMode ? `
        <div class="footer">
          <p>LinkedIn Jobs Database - Scraped job listings with advanced filtering</p>
        </div>
      ` : ''}

      ${useInfiniteScroll ? '' : '<script src="/socket.io/socket.io.js"></script>'}
      <script>
        // Theme management
        function getTheme(fallback = 'dark') {
          return localStorage.getItem('theme') || fallback;
        }

        function setTheme(theme) {
          localStorage.setItem('theme', theme);
          document.documentElement.setAttribute('data-theme', theme);
          updateThemeUI(theme);
        }

        function updateThemeUI(theme) {
          const themeIcon = document.getElementById('theme-icon');
          const themeText = document.getElementById('theme-text');
          if (!themeIcon || !themeText) return;

          themeIcon.textContent = String.fromCodePoint(theme === 'light' ? 0x263c : 0x263e);
          themeText.textContent = theme === 'light' ? 'Light' : 'Dark';
        }

        function toggleTheme() {
          const currentTheme = getTheme();
          const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
          setTheme(newTheme);
        }

        const chatSenderIdStorageKey = 'jobChatSenderId';
        const chatSenderNameStorageKey = 'jobChatDisplayName';
        let chatSocket;
        let chatSenderId = '';
        let chatSenderName = '';
        let chatLocationCode = '';
        let chatUnreadCount = 0;
        let chatMessageIds = new Set();
        const chatBufferedMessages = new Map();
        let chatUsers = [];
        let activeChatUser = null;
        const chatUnreadByUser = new Map();

        function getChatIdentity() {
          let senderId = localStorage.getItem(chatSenderIdStorageKey);
          if (!senderId) {
            senderId = window.crypto?.randomUUID?.() ||
              Date.now().toString(36) + Math.random().toString(36).slice(2);
            localStorage.setItem(chatSenderIdStorageKey, senderId);
          }

          const storedName = localStorage.getItem(chatSenderNameStorageKey) || '';
          const senderName = (/^Guest [A-Z0-9]{1,4}$/i.test(storedName) ? '' : storedName)
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 60);
          const locale = Intl.DateTimeFormat().resolvedOptions().locale || navigator.language || '';
          let locationCode = '';
          try {
            locationCode = new Intl.Locale(locale).region || '';
          } catch {
            locationCode = /-US$/i.test(locale) ? 'US' : '';
          }
          return { senderId, senderName, locationCode: locationCode.toUpperCase() };
        }

        function startRealtimeChat() {
          const shell = document.getElementById('chat-shell');
          if (!shell) return;

          ({
            senderId: chatSenderId,
            senderName: chatSenderName,
            locationCode: chatLocationCode
          } = getChatIdentity());
          document.getElementById('chat-display-name').value = chatSenderName;
          document.getElementById('chat-message-input').addEventListener('input', updateChatSendState);

          if (typeof window.io !== 'function') {
            updateChatConnection('Realtime chat is unavailable', false);
            return;
          }

          chatSocket = window.io({
            auth: {
              senderId: chatSenderId,
              senderName: chatSenderName,
              locationCode: chatLocationCode
            }
          });

          chatSocket.on('connect', () => {
            shell.classList.add('connected');
            updateChatConnection('Connected', true);
          });
          chatSocket.on('disconnect', () => {
            shell.classList.remove('connected');
            updateChatConnection('Reconnecting...', false);
          });
          chatSocket.on('connect_error', () => {
            shell.classList.remove('connected');
            updateChatConnection('Unable to connect to realtime chat', false);
          });
          chatSocket.on('chat:presence', data => {
            const count = Number(data?.count) || 0;
            document.getElementById('chat-presence').textContent =
              count + ' participant' + (count === 1 ? '' : 's') + ' online';
          });
          chatSocket.on('chat:identity', identity => {
            chatSenderName = identity?.name || chatSenderName;
            if (!chatSenderName) return;
            localStorage.setItem(chatSenderNameStorageKey, chatSenderName);
            document.getElementById('chat-display-name').value = chatSenderName;
          });
          chatSocket.on('chat:users', users => {
            chatUsers = (Array.isArray(users) ? users : []).filter(user => user.id !== chatSenderId);
            renderChatDeveloperList();
            if (activeChatUser) {
              const updatedUser = chatUsers.find(user => user.id === activeChatUser.id);
              if (updatedUser) updateChatConversationHeader(updatedUser);
            }
          });
          chatSocket.on('chat:history', data => renderChatHistory(data));
          chatSocket.on('chat:message', handleIncomingChatMessage);
          chatSocket.on('chat:error', error => {
            updateChatConnection(error?.message || 'Realtime chat error', false);
          });
        }

        function updateChatConnection(message, connected) {
          const status = document.getElementById('chat-connection');
          if (status) status.textContent = message;
          document.getElementById('chat-shell')?.classList.toggle('connected', connected);
          updateChatSendState();
        }

        function renderChatHistory(data) {
          const container = document.getElementById('chat-messages');
          if (!container) return;

          if (!data?.participant || activeChatUser?.id !== data.participant.id) return;
          activeChatUser = data.participant;
          updateChatConversationHeader(activeChatUser);
          container.innerHTML = '';
          chatMessageIds = new Set();
          (Array.isArray(data?.messages) ? data.messages : []).forEach(message => appendChatMessage(message));
          flushBufferedMessagesForActiveConversation();
          if (container.children.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'chat-empty';
            empty.textContent = 'No messages yet.';
            container.appendChild(empty);
          }
          container.scrollTop = container.scrollHeight;
        }

        function appendChatMessage(message) {
          if (!message?.id || chatMessageIds.has(String(message.id))) return;
          chatMessageIds.add(String(message.id));

          const container = document.getElementById('chat-messages');
          if (!container) return;
          container.querySelector('.chat-empty')?.remove();

          const own = message.senderId === chatSenderId;
          const item = document.createElement('article');
          item.className = 'chat-message' + (own ? ' own' : '');
          item.dataset.messageId = String(message.id);

          const meta = document.createElement('div');
          meta.className = 'chat-message-meta';
          const createdAt = new Date(message.createdAt);
          const time = Number.isNaN(createdAt.getTime()) ? '' : createdAt.toLocaleTimeString([], {
            hour: 'numeric', minute: '2-digit'
          });
          meta.textContent = (own ? 'You' : message.senderName || 'Guest') + (time ? ' · ' + time : '');

          const bubble = document.createElement('div');
          bubble.className = 'chat-message-bubble';
          bubble.textContent = message.text || '';

          item.append(meta, bubble);
          container.appendChild(item);
          while (container.children.length > 150) container.firstElementChild?.remove();
          container.scrollTop = container.scrollHeight;

        }
        function handleIncomingChatMessage(message) {
          const own = message?.senderId === chatSenderId;
          const otherUserId = own ? message?.recipientId : message?.senderId;
          const conversationShell = document.getElementById('chat-conversation-shell');
          const conversationVisible = activeChatUser?.id === otherUserId &&
            conversationShell && !conversationShell.hidden &&
            !conversationShell.classList.contains('collapsed') &&
            document.visibilityState === 'visible';

          if (conversationVisible) {
            appendChatMessage(message);
            return;
          }

          if (!own && otherUserId) {
            const buffered = chatBufferedMessages.get(otherUserId) || [];
            if (!buffered.some(item => item.id === message.id)) buffered.push(message);
            chatBufferedMessages.set(otherUserId, buffered.slice(-100));
            chatUnreadCount += 1;
            chatUnreadByUser.set(otherUserId, (chatUnreadByUser.get(otherUserId) || 0) + 1);
            updateChatUnread();
            renderChatDeveloperList();
          }
        }

        function flushBufferedMessagesForActiveConversation() {
          const shell = document.getElementById('chat-conversation-shell');
          if (!activeChatUser || !shell || shell.hidden ||
              shell.classList.contains('collapsed') || document.visibilityState !== 'visible') return;

          const messages = chatBufferedMessages.get(activeChatUser.id) || [];
          if (messages.length === 0) return;
          chatBufferedMessages.delete(activeChatUser.id);
          const unread = chatUnreadByUser.get(activeChatUser.id) || 0;
          chatUnreadByUser.delete(activeChatUser.id);
          chatUnreadCount = Math.max(0, chatUnreadCount - unread);
          updateChatUnread();
          renderChatDeveloperList();
          messages.forEach(message => appendChatMessage(message));
        }

        function getChatInitials(name) {
          return String(name || 'Developer')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.charAt(0))
            .join('') || 'D';
        }

        function getChatUserStatus(user) {
          if (user.online) return 'Online';
          const lastSeen = new Date(user.lastSeen);
          if (Number.isNaN(lastSeen.getTime())) return 'Offline';
          return 'Last seen ' + lastSeen.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        function renderChatDeveloperList() {
          const container = document.getElementById('chat-user-list');
          const search = document.getElementById('chat-user-search')?.value.trim().toLowerCase() || '';
          if (!container) return;

          container.innerHTML = '';
          const users = chatUsers.filter(user => !search || user.name.toLowerCase().includes(search));
          if (users.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'chat-empty';
            empty.textContent = search ? 'No developers found.' : 'No other developers yet.';
            container.appendChild(empty);
            return;
          }

          users.forEach(user => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-user-button';
            button.addEventListener('click', () => openChatConversation(user.id));

            const avatar = document.createElement('span');
            avatar.className = 'chat-user-avatar' + (user.online ? ' online' : '');
            avatar.textContent = getChatInitials(user.name);

            const copy = document.createElement('span');
            copy.className = 'chat-user-copy';
            const name = document.createElement('span');
            name.className = 'chat-user-name';
            name.textContent = user.name;
            const status = document.createElement('span');
            status.className = 'chat-user-status';
            status.textContent = getChatUserStatus(user);
            copy.append(name, status);

            button.append(avatar, copy);
            const unread = chatUnreadByUser.get(user.id) || 0;
            if (unread > 0) {
              const badge = document.createElement('span');
              badge.className = 'chat-user-unread';
              badge.textContent = String(Math.min(unread, 99));
              button.appendChild(badge);
            }
            container.appendChild(button);
          });
        }

        function filterChatUsers() {
          renderChatDeveloperList();
        }

        function showChatDeveloperList() {
          setChatOpen(true);
          document.getElementById('chat-user-search')?.focus();
        }

        function updateChatConversationHeader(user) {
          activeChatUser = user;
          const avatar = document.getElementById('chat-conversation-avatar');
          avatar.textContent = getChatInitials(user.name);
          avatar.classList.toggle('online', Boolean(user.online));
          document.getElementById('chat-conversation-name').textContent = user.name;
          document.getElementById('chat-conversation-status').textContent = getChatUserStatus(user);
        }

        function openChatConversation(userId) {
          const user = chatUsers.find(candidate => candidate.id === userId);
          if (!user || !chatSocket?.connected) return;

          setChatOpen(true);
          updateChatConversationHeader(user);
          const conversationShell = document.getElementById('chat-conversation-shell');
          conversationShell.hidden = false;
          conversationShell.classList.remove('collapsed');
          const messages = document.getElementById('chat-messages');
          messages.innerHTML = '<div class="chat-empty">Loading conversation...</div>';

          const unread = chatUnreadByUser.get(userId) || 0;
          chatUnreadByUser.delete(userId);
          chatUnreadCount = Math.max(0, chatUnreadCount - unread);
          updateChatUnread();
          renderChatDeveloperList();

          chatSocket.timeout(5000).emit('chat:open', { recipientId: userId }, (error, response) => {
            if (error || !response?.ok) {
              updateChatConnection(response?.error || 'Unable to load conversation', chatSocket.connected);
              closeChatConversation();
              return;
            }
            updateChatSendState();
            document.getElementById('chat-message-input')?.focus();
          });
        }

        function toggleChatConversation() {
          const shell = document.getElementById('chat-conversation-shell');
          if (!shell || shell.hidden) return;
          const collapsed = shell.classList.toggle('collapsed');
          const button = shell.querySelector('.chat-conversation-action');
          button?.setAttribute('aria-label', collapsed ? 'Open conversation' : 'Minimize conversation');
          button?.setAttribute('title', collapsed ? 'Open' : 'Minimize');
          if (!collapsed) {
            const messages = document.getElementById('chat-messages');
            messages.scrollTop = messages.scrollHeight;
            flushBufferedMessagesForActiveConversation();
            document.getElementById('chat-message-input')?.focus();
          }
          updateChatSendState();
        }

        function closeChatConversation() {
          const shell = document.getElementById('chat-conversation-shell');
          if (!shell) return;
          shell.hidden = true;
          shell.classList.remove('collapsed');
          activeChatUser = null;
          chatMessageIds = new Set();
          document.getElementById('chat-messages').innerHTML =
            '<div class="chat-empty">Select a developer to start messaging.</div>';
          document.getElementById('chat-message-input').value = '';
          updateChatSendState();
        }

        function updateChatUnread() {
          const badge = document.getElementById('chat-unread');
          if (!badge) return;
          badge.textContent = String(Math.min(chatUnreadCount, 99));
          badge.hidden = chatUnreadCount === 0;
        }

        function setChatOpen(open) {
          const shell = document.getElementById('chat-shell');
          if (!shell) return;
          shell.classList.toggle('collapsed', !open);
          shell.querySelector('.chat-header-main')?.setAttribute('aria-expanded', open ? 'true' : 'false');
          shell.querySelector('.chat-header-action:last-child')?.setAttribute(
            'aria-label', open ? 'Minimize messaging' : 'Open messaging'
          );
        }

        function openChatBox() {
          showChatDeveloperList();
        }

        function toggleChatBox() {
          const shell = document.getElementById('chat-shell');
          if (!shell) return;
          const willOpen = shell.classList.contains('collapsed');
          setChatOpen(willOpen);
          if (willOpen) document.getElementById('chat-user-search')?.focus();
        }

        function toggleChatSettings(event) {
          event.stopPropagation();
          setChatOpen(true);
          const settings = document.getElementById('chat-settings');
          settings.hidden = !settings.hidden;
          if (!settings.hidden) document.getElementById('chat-display-name')?.focus();
        }

        function saveChatDisplayName(event) {
          event.preventDefault();
          const input = document.getElementById('chat-display-name');
          const value = input.value.replace(/\s+/g, ' ').trim().slice(0, 60);
          if (!value) return;

          chatSenderName = value;
          localStorage.setItem(chatSenderNameStorageKey, value);
          input.value = value;
          document.getElementById('chat-settings').hidden = true;
          if (chatSocket) {
            closeChatConversation();
            chatSocket.auth = {
              senderId: chatSenderId,
              senderName: chatSenderName,
              locationCode: chatLocationCode
            };
            chatSocket.disconnect().connect();
          }
        }

        function updateChatSendState() {
          const input = document.getElementById('chat-message-input');
          const button = document.getElementById('chat-send');
          if (!input || !button) return;
          const conversationShell = document.getElementById('chat-conversation-shell');
          button.disabled = !chatSocket?.connected || !activeChatUser ||
            !conversationShell || conversationShell.hidden ||
            conversationShell.classList.contains('collapsed') || !input.value.trim();
        }

        function sendChatMessage(event) {
          event.preventDefault();
          const input = document.getElementById('chat-message-input');
          const text = input.value.trim();
          if (!text || !chatSocket?.connected) return;

          document.getElementById('chat-send').disabled = true;
          chatSocket.timeout(5000).emit('chat:message', { text }, (error, response) => {
            if (error || !response?.ok) {
              updateChatConnection(response?.error || 'Unable to send message', chatSocket.connected);
              updateChatSendState();
              return;
            }
            input.value = '';
            input.style.height = '';
            updateChatSendState();
          });
        }

        function handleChatComposerKeydown(event) {
          const input = event.currentTarget;
          window.requestAnimationFrame(() => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 96) + 'px';
          });
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            input.form?.requestSubmit();
          }
        }

        const infiniteScrollEnabled = ${useInfiniteScroll};
        const indexModeEnabled = ${isIndexMode};

        // Initialize theme on page load
        document.addEventListener('DOMContentLoaded', function() {
          if (indexModeEnabled) {
            setTheme(getTheme('light'));
          } else if (infiniteScrollEnabled) {
            setTheme(getTheme());
          } else {
            setTheme(getTheme('light'));
          }
          loadVisitedJobs();
          loadIndustries();
          if (infiniteScrollEnabled) startInfiniteScroll();
          if (!infiniteScrollEnabled) {
            localStorage.removeItem('pageAutoRefreshEnabled');
            startJobSelection();
            initializeJobListExtras();
            document.addEventListener('click', closeDetailActionsMenu);
            document.addEventListener('visibilitychange', flushBufferedMessagesForActiveConversation);
            startRealtimeChat();
          }
          startLiveUpdates();
        });

        const initialJobsPage = ${page};
        let currentJobsPage = initialJobsPage;
        let totalJobPages = ${totalPages};
        let hasMoreJobs = currentJobsPage < totalJobPages;
        let loadingMoreJobs = false;
        let infiniteScrollObserver;
        let selectedJobId = null;
        let selectedJobDetails = null;
        let jobDetailRequestId = 0;
        let jobDetailAbortController;

        function buildJobsApiUrl(pageNumber) {
          const url = new URL('/api/jobs', window.location.origin);
          url.search = window.location.search;
          url.searchParams.set('page', String(pageNumber));
          return url;
        }

        async function fetchJobsPage(pageNumber) {
          const response = await fetch(buildJobsApiUrl(pageNumber), {
            cache: 'no-store',
            headers: { Accept: 'application/json' }
          });

          if (!response.ok) throw new Error('Jobs request failed with status ' + response.status);
          return response.json();
        }

        function escapeHTML(value) {
          const escapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          };
          return String(value ?? '').replace(/[&<>"']/g, character => escapes[character]);
        }

        function detailCloseButton() {
          return '<button class="detail-close" type="button" aria-label="Close job details" ' +
            'onclick="closeJobDetail()">&times;</button>';
        }

        function prepareJobCards() {
          document.querySelectorAll('#jobs-container .job-card[data-job-id]').forEach(card => {
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-pressed', card.dataset.jobId === selectedJobId ? 'true' : 'false');
          });
        }

        function restoreJobSelection() {
          prepareJobCards();
          const cards = Array.from(document.querySelectorAll('#jobs-container .job-card[data-job-id]'));
          const selectedCard = cards.find(card => card.dataset.jobId === selectedJobId);

          if (selectedCard) {
            selectedCard.classList.add('selected');
            selectedCard.setAttribute('aria-pressed', 'true');
            return;
          }

          selectedJobId = null;
          if (cards[0]) selectJobCard(cards[0]);
        }

        function startJobSelection() {
          const container = document.getElementById('jobs-container');

          container.addEventListener('click', event => {
            const card = event.target.closest('.job-card[data-job-id]');
            if (!card || event.target.closest('.company-name a')) return;
            event.preventDefault();
            selectJobCard(card, card.dataset.jobId === selectedJobId);
          });

          container.addEventListener('keydown', event => {
            const card = event.target.closest('.job-card[data-job-id]');
            if (!card || !['Enter', ' '].includes(event.key)) return;
            event.preventDefault();
            selectJobCard(card, card.dataset.jobId === selectedJobId);
          });

          restoreJobSelection();
        }

        async function selectJobCard(card, forceReload = false) {
          const jobId = card.dataset.jobId;
          const panel = document.getElementById('job-detail-panel');

          if (!forceReload && selectedJobId === jobId && panel.dataset.state === 'loaded') {
            panel.classList.add('is-open');
            document.body.classList.add('detail-open');
            return;
          }

          selectedJobId = jobId;
          selectedJobDetails = null;
          document.querySelectorAll('#jobs-container .job-card[data-job-id]').forEach(jobCard => {
            const selected = jobCard.dataset.jobId === jobId;
            jobCard.classList.toggle('selected', selected);
            jobCard.setAttribute('aria-pressed', selected ? 'true' : 'false');
          });
          markAsVisited(Number(jobId));

          panel.dataset.state = 'loading';
          panel.classList.add('is-open');
          document.body.classList.add('detail-open');
          panel.innerHTML = detailCloseButton() +
            '<div class="job-detail-state"><div class="detail-loading-spinner" aria-hidden="true"></div>' +
            '<p>Loading job details...</p></div>';

          jobDetailAbortController?.abort();
          jobDetailAbortController = new AbortController();
          const requestId = ++jobDetailRequestId;

          try {
            const response = await fetch('/api/job-description/' + encodeURIComponent(jobId), {
              cache: 'no-store',
              headers: { Accept: 'application/json' },
              signal: jobDetailAbortController.signal
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unable to load job details');
            if (requestId !== jobDetailRequestId) return;
            renderJobDetail(data);
          } catch (error) {
            if (error.name === 'AbortError' || requestId !== jobDetailRequestId) return;
            console.error('Failed to load job description:', error);
            panel.dataset.state = 'error';
            panel.innerHTML = detailCloseButton() +
              '<div class="job-detail-state"><p>' + escapeHTML(error.message) + '</p>' +
              '<button class="detail-retry-btn" type="button" onclick="retrySelectedJob()">Retry</button></div>';
          }
        }

        function renderJobDetail(job) {
          const panel = document.getElementById('job-detail-panel');
          const logo = job.logoUrl
            ? '<img class="detail-company-logo" src="' + escapeHTML(job.logoUrl) + '" alt="">'
            : '<div class="detail-company-logo" aria-hidden="true"></div>';
          const company = job.companyUrl
            ? '<a class="detail-company-name" href="' + escapeHTML(job.companyUrl) +
              '" target="_blank" rel="noopener noreferrer">' + escapeHTML(job.company) + '</a>'
            : '<span class="detail-company-name">' + escapeHTML(job.company) + '</span>';
          const meta = [job.postedTime, job.applicants, job.status]
            .filter(Boolean)
            .map(value => '<span>' + escapeHTML(value) + '</span>')
            .join('');
          const detailTags = job.salary
            ? '<div class="detail-job-tags" aria-label="Job details">' +
                '<span class="detail-job-tag">' + escapeHTML(job.salary) + '</span>' +
              '</div>'
            : '';
          const action = job.jobUrl
            ? '<a class="detail-primary-action" href="' + escapeHTML(job.jobUrl) +
              '" target="_blank" rel="noopener noreferrer">View on LinkedIn</a>'
            : '';
          const headerActions = job.jobUrl
            ? '<div class="detail-header-actions">' +
                '<button type="button" class="detail-icon-button" aria-label="Share job" title="Share" onclick="shareSelectedJob()">&#8618;</button>' +
                '<button type="button" class="detail-icon-button" aria-label="More job actions" title="More" aria-expanded="false" aria-controls="detail-more-menu" onclick="event.stopPropagation(); toggleDetailActionsMenu(this)">&hellip;</button>' +
                '<div class="detail-more-menu" id="detail-more-menu" hidden onclick="event.stopPropagation()">' +
                  '<a href="' + escapeHTML(job.jobUrl) + '" target="_blank" rel="noopener noreferrer">Open on LinkedIn</a>' +
                  '<button type="button" onclick="copySelectedJobLink(); closeDetailActionsMenu()">Copy job link</button>' +
                '</div>' +
                '<div class="detail-action-toast" id="detail-action-status" role="status" aria-live="polite"></div>' +
              '</div>'
            : '';
          const recruiterPanel = job.recruiter?.name
            ? '<section class="job-recruiter" aria-label="Job poster">' +
                '<h2 class="job-recruiter-heading">Meet the hiring team</h2>' +
                '<div class="job-recruiter-row">' +
                  (job.recruiter.imageUrl
                    ? '<img class="job-recruiter-image" src="' + escapeHTML(job.recruiter.imageUrl) +
                      '" alt="Profile photo of ' + escapeHTML(job.recruiter.name) + '">'
                    : '<span class="job-recruiter-image-placeholder" aria-hidden="true"></span>') +
                  '<div class="job-recruiter-info">' +
                    (job.recruiter.profileUrl
                      ? '<a class="job-recruiter-name" href="' + escapeHTML(job.recruiter.profileUrl) +
                        '" target="_blank" rel="noopener noreferrer">' + escapeHTML(job.recruiter.name) + '</a>'
                      : '<span class="job-recruiter-name">' + escapeHTML(job.recruiter.name) + '</span>') +
                    (job.recruiter.title
                      ? '<p class="job-recruiter-title">' + escapeHTML(job.recruiter.title) + '</p>'
                      : '') +
                    '<p class="job-recruiter-label">Job poster</p>' +
                  '</div>' +
                  (job.recruiter.messageUrl
                    ? '<a class="job-recruiter-message" href="' + escapeHTML(job.recruiter.messageUrl) +
                      '" target="_blank" rel="noopener noreferrer" aria-label="Message ' +
                      escapeHTML(job.recruiter.name) + '" title="Message job poster">Message</a>'
                    : '') +
                '</div>' +
              '</section>'
            : '';
          const criteria = (job.criteria || []).map(item =>
            '<div class="job-criterion"><dt>' + escapeHTML(item.label) + '</dt><dd>' +
            escapeHTML(item.value) + '</dd></div>'
          ).join('');

          selectedJobDetails = job;
          panel.dataset.state = 'loaded';
          panel.innerHTML = detailCloseButton() +
            '<header class="job-detail-header">' +
              headerActions +
              '<div class="detail-company-row">' + logo + '<div>' + company + '</div></div>' +
              '<h1 class="job-detail-title">' + escapeHTML(job.title) + '</h1>' +
              '<p class="job-detail-location">' + escapeHTML(job.location) + '</p>' +
              '<div class="job-detail-meta">' + meta + '</div>' + detailTags + action +
            '</header>' +
            recruiterPanel +
            '<div class="job-detail-content">' +
              '<h2>About the job</h2>' +
              '<div class="job-description">' + (job.descriptionHtml || '<p>Description unavailable.</p>') + '</div>' +
              (criteria ? '<dl class="job-criteria">' + criteria + '</dl>' : '') +
            '</div>';
          panel.scrollTop = 0;
        }

        function toggleDetailActionsMenu(button) {
          const menu = document.getElementById('detail-more-menu');
          if (!menu) return;

          const willOpen = menu.hidden;
          menu.hidden = !willOpen;
          button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
          if (willOpen) menu.querySelector('a, button')?.focus();
        }

        function closeDetailActionsMenu() {
          const menu = document.getElementById('detail-more-menu');
          const button = document.querySelector('[aria-controls="detail-more-menu"]');
          if (menu) menu.hidden = true;
          if (button) button.setAttribute('aria-expanded', 'false');
        }

        let detailActionStatusTimer;
        function showDetailActionStatus(message) {
          const status = document.getElementById('detail-action-status');
          if (!status) return;

          window.clearTimeout(detailActionStatusTimer);
          status.textContent = message;
          detailActionStatusTimer = window.setTimeout(() => {
            status.textContent = '';
          }, 2200);
        }

        async function copyTextToClipboard(value) {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return;
          }

          const textArea = document.createElement('textarea');
          textArea.value = value;
          textArea.setAttribute('readonly', '');
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          const copied = document.execCommand('copy');
          textArea.remove();
          if (!copied) throw new Error('Copy failed');
        }

        async function copySelectedJobLink() {
          if (!selectedJobDetails?.jobUrl) return;

          try {
            await copyTextToClipboard(selectedJobDetails.jobUrl);
            showDetailActionStatus('Job link copied');
          } catch (error) {
            console.error('Unable to copy job link:', error);
            showDetailActionStatus('Unable to copy link');
          }
        }

        async function shareSelectedJob() {
          if (!selectedJobDetails?.jobUrl) return;

          if (navigator.share) {
            try {
              await navigator.share({
                title: selectedJobDetails.title || 'Job opportunity',
                text: [selectedJobDetails.title, selectedJobDetails.company].filter(Boolean).join(' at '),
                url: selectedJobDetails.jobUrl
              });
              return;
            } catch (error) {
              if (error.name === 'AbortError') return;
            }
          }

          await copySelectedJobLink();
        }

        function retrySelectedJob() {
          const card = Array.from(document.querySelectorAll('#jobs-container .job-card[data-job-id]'))
            .find(jobCard => jobCard.dataset.jobId === selectedJobId);
          if (card) selectJobCard(card, true);
        }

        function closeJobDetail() {
          document.getElementById('job-detail-panel')?.classList.remove('is-open');
          document.body.classList.remove('detail-open');
        }

        function parseJobCards(jobCards) {
          const template = document.createElement('template');
          template.innerHTML = jobCards.trim();
          return Array.from(template.content.querySelectorAll('.job-card'));
        }

        function appendUniqueJobCards(jobCards) {
          const container = document.getElementById('jobs-container');
          const existingIds = new Set(
            Array.from(container.querySelectorAll('.job-card[data-job-id]'))
              .map(card => card.dataset.jobId)
          );
          const fragment = document.createDocumentFragment();
          let addedJobs = 0;

          parseJobCards(jobCards).forEach(card => {
            if (existingIds.has(card.dataset.jobId)) return;
            existingIds.add(card.dataset.jobId);
            fragment.appendChild(card);
            addedJobs += 1;
          });

          container.appendChild(fragment);
          return addedJobs;
        }

        function mergeLiveJobCards(jobCards) {
          const container = document.getElementById('jobs-container');
          const existingCards = new Map(
            Array.from(container.querySelectorAll('.job-card[data-job-id]'))
              .map(card => [card.dataset.jobId, card])
          );
          const newJobs = document.createDocumentFragment();

          parseJobCards(jobCards).forEach(card => {
            const existingCard = existingCards.get(card.dataset.jobId);
            if (!existingCard) {
              newJobs.appendChild(card);
            } else if (existingCard.dataset.jobUpdated !== card.dataset.jobUpdated) {
              existingCard.replaceWith(card);
            }
          });

          container.prepend(newJobs);
        }

        function updateScrollStatus(message = '') {
          const sentinel = document.getElementById('scroll-sentinel');
          const status = document.getElementById('scroll-status');
          sentinel.classList.toggle('loading', loadingMoreJobs);

          if (message) {
            status.textContent = message;
          } else if (loadingMoreJobs) {
            status.textContent = 'Loading jobs...';
          } else if (!hasMoreJobs) {
            status.textContent = 'All jobs loaded';
          } else {
            status.textContent = '';
          }

          if (!infiniteScrollObserver) return;
          if (hasMoreJobs) {
            infiniteScrollObserver.observe(sentinel);
          } else {
            infiniteScrollObserver.unobserve(sentinel);
          }
        }

        function startInfiniteScroll() {
          const sentinel = document.getElementById('scroll-sentinel');
          infiniteScrollObserver = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) loadMoreJobs();
          }, { rootMargin: '600px 0px' });

          updateScrollStatus();
          if (hasMoreJobs) infiniteScrollObserver.observe(sentinel);
        }

        async function loadMoreJobs() {
          if (loadingMoreJobs || !hasMoreJobs || document.hidden) return;

          loadingMoreJobs = true;
          updateScrollStatus();
          let continueLoading = false;
          let loadError = '';

          try {
            const data = await fetchJobsPage(currentJobsPage + 1);
            const addedJobs = appendUniqueJobCards(data.jobCards);
            currentJobsPage = data.page;
            totalJobPages = data.totalPages;
            hasMoreJobs = data.hasMore;
            document.getElementById('job-count').textContent =
              data.totalJobs.toLocaleString() + ' positions';
            loadVisitedJobs();
            continueLoading = addedJobs === 0 && hasMoreJobs;
          } catch (error) {
            console.error('Failed to load more jobs:', error);
            loadError = 'Unable to load jobs. Retrying...';
            window.setTimeout(loadMoreJobs, 5000);
          } finally {
            loadingMoreJobs = false;
            updateScrollStatus(loadError);
          }

          if (continueLoading) window.setTimeout(loadMoreJobs, 0);
        }

        // Polling works consistently both in the local Express server and on Vercel.
        const liveUpdateIntervalMs = 8 * 60 * 1000;
        let liveUpdateTimer;
        let liveUpdateInFlight = false;
        let latestJobsSnapshot;

        function getVisibleJobVersions() {
          return Array.from(document.querySelectorAll('.job-card[data-job-id]'))
            .map(card => card.dataset.jobId + ':' + card.dataset.jobUpdated);
        }

        function startLiveUpdates() {
          latestJobsSnapshot = JSON.stringify({
            jobVersions: getVisibleJobVersions(),
            totalJobs: ${totalJobs}
          });

          scheduleLiveUpdates();
          document.addEventListener('visibilitychange', function() {
            if (!document.hidden) refreshJobs();
          });
        }

        function scheduleLiveUpdates() {
          window.clearInterval(liveUpdateTimer);
          liveUpdateTimer = window.setInterval(refreshJobs, liveUpdateIntervalMs);
        }

        const jobFeedbackStorageKey = 'pageJobResultsFeedback';
        const jobPromoStorageKey = 'pageRecentJobsPromoDismissed';

        function initializeJobListExtras() {
          const savedFeedback = localStorage.getItem(jobFeedbackStorageKey);
          if (savedFeedback) updateJobFeedbackUI(savedFeedback);

          const promo = document.getElementById('job-list-promo');
          if (promo && localStorage.getItem(jobPromoStorageKey) === 'true') {
            promo.hidden = true;
          }
        }

        function updateJobFeedbackUI(value) {
          document.querySelectorAll('[data-job-feedback]').forEach(button => {
            const selected = button.dataset.jobFeedback === value;
            button.classList.toggle('selected', selected);
            button.setAttribute('aria-pressed', selected ? 'true' : 'false');
          });

          const status = document.getElementById('job-feedback-status');
          if (status) status.textContent = 'Thanks for your feedback.';
        }

        function rateJobResults(value) {
          if (!['helpful', 'not-helpful'].includes(value)) return;
          localStorage.setItem(jobFeedbackStorageKey, value);
          updateJobFeedbackUI(value);
        }

        function dismissJobListPromo() {
          localStorage.setItem(jobPromoStorageKey, 'true');
          const promo = document.getElementById('job-list-promo');
          if (promo) promo.hidden = true;
        }

        let lastFilterTrigger;

        function openPageFilters(sectionId) {
          const backdrop = document.getElementById('filter-drawer-backdrop');
          if (!backdrop) return;

          lastFilterTrigger = document.activeElement;
          backdrop.classList.add('open');
          backdrop.setAttribute('aria-hidden', 'false');
          document.body.classList.add('filters-open');

          window.setTimeout(() => {
            const section = sectionId ? document.getElementById(sectionId) : null;
            if (section) {
              section.scrollIntoView({ block: 'start' });
              section.querySelector('input')?.focus();
            } else {
              backdrop.querySelector('.filter-drawer-close')?.focus();
            }
          }, 250);
        }

        function closePageFilters() {
          const backdrop = document.getElementById('filter-drawer-backdrop');
          if (!backdrop) return;

          backdrop.classList.remove('open');
          backdrop.setAttribute('aria-hidden', 'true');
          document.body.classList.remove('filters-open');
          lastFilterTrigger?.focus();
        }

        document.addEventListener('keydown', event => {
          if (event.key === 'Escape' && document.getElementById('filter-drawer-backdrop')?.classList.contains('open')) {
            closePageFilters();
          }
          if (event.key === 'Escape') closeDetailActionsMenu();
        });

        async function refreshJobs() {
          if (liveUpdateInFlight || document.hidden) return;

          liveUpdateInFlight = true;
          try {
            const data = await fetchJobsPage(initialJobsPage);
            const nextSnapshot = JSON.stringify({
              jobVersions: data.jobVersions,
              totalJobs: data.totalJobs
            });

            if (nextSnapshot === latestJobsSnapshot) return;

            if (infiniteScrollEnabled) {
              mergeLiveJobCards(data.jobCards);
            } else {
              document.getElementById('jobs-container').innerHTML = data.jobCards;
              document.getElementById('pagination-container').innerHTML = data.pagination;
              restoreJobSelection();
            }
            document.getElementById('job-count').textContent =
              data.totalJobs.toLocaleString() + ' positions';
            totalJobPages = data.totalPages;
            hasMoreJobs = currentJobsPage < totalJobPages;
            latestJobsSnapshot = nextSnapshot;
            loadVisitedJobs();
            if (infiniteScrollEnabled) updateScrollStatus();
          } catch (error) {
            console.error('Failed to refresh jobs:', error);
          } finally {
            liveUpdateInFlight = false;
          }
        }

        // Load industries from API
        async function loadIndustries() {
          try {
            const response = await fetch('/api/industries');
            const industries = await response.json();
            renderIndustryCheckboxes(industries);
          } catch (error) {
            console.error('Failed to load industries:', error);
            document.getElementById('industry-checkboxes').innerHTML =
              '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">Failed to load industries</div>';
          }
        }

        // Render industry checkboxes
        function renderIndustryCheckboxes(industries) {
          const container = document.getElementById('industry-checkboxes');
          const selectedIndustries = ${JSON.stringify(industries || [])};

          if (industries.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No industries found</div>';
            return;
          }

          container.innerHTML = industries.map(industry =>
            \`<div class="industry-checkbox">
              <input type="checkbox" id="industry-\${industry.replace(/[^a-zA-Z0-9]/g, '-')}"
                     name="industries" value="\${industry}"
                     \${selectedIndustries.includes(industry) ? 'checked' : ''}>
              <label for="industry-\${industry.replace(/[^a-zA-Z0-9]/g, '-')}">\${industry}</label>
            </div>\`
          ).join('');
        }

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
