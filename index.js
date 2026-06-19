import express from 'express';
import { createServer } from 'node:http';
import fetch from 'node-fetch';
import { Server as SocketIOServer } from 'socket.io';
import { Job, ChatUser, connectDatabase } from './database.js';
import { generateJobCard, generatePagination, generateHTML } from './templates.js';
import { generateCompanyCard, generateCompanyPagination, generateCompanyHTML, generateCompanyJobsHTML, generateCompanyJobsPagination } from './company_templates.js';
import { fetchLinkedInJobPosting } from './linkedin.js';
import { registerChatHandlers } from './chat.js';

await connectDatabase();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  transports: ['websocket', 'polling']
});
const PORT = process.env.PORT || 3000;
const JOBS_PER_PAGE = 20;

app.use(express.json());
app.use('/assets', express.static('assets'));

registerChatHandlers(io, { ChatUser });
app.get('/test', (req, res) => {
  res.json({ msg: "Successfully deployed" });
});

app.get('/location', async (req, res) => {
  try {
    const response = await fetch('https://ipinfo.io/json');
    const locationData = await response.json();
    res.json(locationData);
  } catch (error) {
    console.error('Location fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch location data' });
  }
});

app.get('/api/industries', async (req, res) => {
  try {
    const industries = await Job.distinct('designation', { designation: { $exists: true, $ne: null, $ne: '' } });
    res.json(industries.sort());
  } catch (error) {
    console.error('Industries fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch industries' });
  }
});

app.get('/api/companies', async (req, res) => {
  try {
    const companies = await Job.aggregate([
      { $match: { company: { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: '$company', count: { $sum: 1 }, companyLink: { $first: '$companyLink' } } },
      { $sort: { count: -1 } }
    ]);
    res.json(companies);
  } catch (error) {
    console.error('Companies fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

app.get('/api/job-description/:jobId', async (req, res) => {
  const { jobId } = req.params;
  if (!/^\d{6,20}$/.test(jobId)) {
    return res.status(400).json({ error: 'Invalid LinkedIn job ID' });
  }

  try {
    const job = await fetchLinkedInJobPosting(jobId);
    res.set('Cache-Control', 'no-store');
    res.json(job);
  } catch (error) {
    console.error(`LinkedIn job ${jobId} fetch error:`, error.message);
    res.status(502).json({ error: 'Unable to load this job description from LinkedIn' });
  }
});

const validateQueryParams = (queryParams) => {
  const { page, empMax, lastday } = queryParams;
  const errors = [];
  
  if (page && (isNaN(page) || page < 1)) {
    errors.push('Page must be a positive number');
  }
  
  if (empMax && (isNaN(empMax) || empMax < 1)) {
    errors.push('Employee count must be a positive number');
  }
  
  if (lastday && (isNaN(lastday) || lastday < 0 || lastday > 30)) {
    errors.push('Last day must be between 0 and 30');
  }
  
  return errors;
};

const buildJobFilter = (queryParams) => {
  const { empMax, companyQuery, titleQuery, locationQuery, lastday, industries, industryMode } = queryParams;
  const filter = {};
  
  if (empMax && empMax > 0) filter.e_count = { $gte: 1, $lte: empMax };
  if (companyQuery && companyQuery.trim()) filter.company = { $regex: companyQuery.trim(), $options: "i" };
  if (titleQuery && titleQuery.trim()) filter.title = { $regex: titleQuery.trim(), $options: "i" };
  if (locationQuery && locationQuery.trim()) filter.location = { $regex: locationQuery.trim(), $options: "i" };
  if (lastday > 0) {
    const lastdate = new Date(Date.now() - (lastday * 24 * 60 * 60 * 1000));
    filter.postedtime = { $gte: lastdate.toISOString() };
  }
  
  // Industry filtering logic
  if (industries && industries.length > 0) {
    if (industryMode === 'exclude') {
      // Exclude selected industries
      filter.designation = { $nin: industries };
    } else {
      // Include only selected industries (default)
      filter.designation = { $in: industries };
    }
  }
  
  return filter;
};

const parseJobQuery = (query) => {
  const page = parseInt(query.page, 10) || 1;
  const lastday = parseInt(query.lastday, 10) || 0;
  const empMax = parseInt(query.emp, 10) || null;
  const companyQuery = query.company || "";
  const titleQuery = query.title || "";
  const locationQuery = query.location || "";
  const industries = query.industries
    ? (Array.isArray(query.industries) ? query.industries : query.industries.split(','))
    : [];
  const industryMode = query.industryMode || 'include';

  return { page, empMax, companyQuery, titleQuery, locationQuery, lastday, industries, industryMode };
};

const loadJobPage = async (queryParams) => {
  const skip = (queryParams.page - 1) * JOBS_PER_PAGE;
  const filter = buildJobFilter(queryParams);

  const [jobs, totalJobs] = await Promise.all([
    Job.find(filter)
      .sort({ postedtime: -1, _id: -1 })
      .skip(skip)
      .limit(JOBS_PER_PAGE)
      .exec(),
    Job.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalJobs / JOBS_PER_PAGE);

  return {
    jobs,
    totalJobs,
    totalPages,
    jobCards: jobs.map(generateJobCard).join("")
  };
};

app.get('/api/jobs', async (req, res) => {
  try {
    const queryParams = parseJobQuery(req.query);
    const validationErrors = validateQueryParams(queryParams);

    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const { jobs, totalJobs, totalPages, jobCards } = await loadJobPage(queryParams);

    res.set('Cache-Control', 'no-store');
    res.json({
      jobVersions: jobs.map(job =>
        `${job.postId}:${job.updatedAt ? job.updatedAt.toISOString() : ''}`
      ),
      page: queryParams.page,
      totalPages,
      hasMore: queryParams.page < totalPages,
      totalJobs,
      jobCards,
      pagination: generatePagination(queryParams.page, totalPages, queryParams, '/page')
    });
  } catch (error) {
    console.error('Jobs API error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

const renderJobsPage = (useInfiniteScroll) => async (req, res) => {
  try {
    const queryParams = parseJobQuery(req.query);

    const validationErrors = validateQueryParams(queryParams);
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const { totalJobs, totalPages, jobCards } = await loadJobPage(queryParams);
    const pagination = useInfiniteScroll
      ? ''
      : generatePagination(queryParams.page, totalPages, queryParams, '/page');

    const html = generateHTML({
      page: queryParams.page,
      totalJobs,
      totalPages,
      jobCards,
      pagination,
      useInfiniteScroll,
      queryParams
    });

    res.set('Cache-Control', 'no-store');
    res.send(html);

  } catch (error) {
    console.error('Jobs page error:', error);
    res.status(500).send("Internal Server Error");
  }
};

app.get('/view', renderJobsPage(true));
app.get('/page', renderJobsPage(false));

app.get('/company', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    
    const [companies, totalCompanies] = await Promise.all([
      Job.aggregate([
        { $match: { company: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { 
          _id: '$company', 
          count: { $sum: 1 }, 
          companyLink: { $first: '$companyLink' },
          companylog: { $first: '$companylog' }
        }},
        { $sort: { count: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]),
      Job.aggregate([
        { $match: { company: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$company' } },
        { $count: 'total' }
      ])
    ]);
    
    const totalPages = Math.ceil((totalCompanies[0]?.total || 0) / limit);
    const companyCards = companies.map(company => generateCompanyCard(company)).join('');
    const pagination = generateCompanyPagination(page, totalPages);
    
    const html = generateCompanyHTML({
      page,
      totalCompanies: totalCompanies[0]?.total || 0,
      companyCards,
      pagination
    });
    
    res.send(html);
  } catch (error) {
    console.error('Company list error:', error);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/company/:companyName', async (req, res) => {
  try {
    const companyName = decodeURIComponent(req.params.companyName);
    const page = parseInt(req.query.page) || 1;
    const limit = JOBS_PER_PAGE;
    const skip = (page - 1) * limit;
    
    const [jobs, totalJobs, companyInfo] = await Promise.all([
      Job.find({ company: companyName })
        .sort({ postedtime: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Job.countDocuments({ company: companyName }),
      Job.findOne({ company: companyName }).select('company companyLink companylog')
    ]);
    
    const totalPages = Math.ceil(totalJobs / limit);
    const jobCards = jobs.map(generateJobCard).join('');
    const pagination = generateCompanyJobsPagination(page, totalPages, companyName);
    
    const html = generateCompanyJobsHTML({
      companyName,
      companyInfo,
      page,
      totalJobs,
      jobCards,
      pagination
    });
    
    res.send(html);
  } catch (error) {
    console.error('Company jobs error:', error);
    res.status(500).send("Internal Server Error");
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

