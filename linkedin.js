import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const LINKEDIN_JOB_API = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting';
const CACHE_TTL_MS = 15 * 60 * 1000;
const jobCache = new Map();
const allowedDescriptionTags = new Set([
  'a', 'b', 'br', 'em', 'h3', 'h4', 'i', 'li', 'ol', 'p', 'strong', 'ul'
]);

const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();

const safeUrl = (value) => {
  if (!value) return '';

  try {
    const url = new URL(value, 'https://www.linkedin.com');
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

const sanitizeDescription = ($, element) => {
  const description = $(element).clone();
  description.find('script, style, iframe, object, embed, form, input, button').remove();

  description.find('*').each((_, child) => {
    const tagName = child.tagName?.toLowerCase();

    if (!allowedDescriptionTags.has(tagName)) {
      $(child).replaceWith($(child).contents());
      return;
    }

    const href = tagName === 'a' ? safeUrl($(child).attr('href')) : '';
    for (const attribute of Object.keys(child.attribs || {})) {
      $(child).removeAttr(attribute);
    }

    if (tagName === 'a' && href) {
      $(child).attr({ href, target: '_blank', rel: 'noopener noreferrer' });
    } else if (tagName === 'a') {
      $(child).replaceWith($(child).contents());
    }
  });

  return description.html()?.trim() || '';
};

export const parseLinkedInJobPosting = (html, jobId) => {
  const $ = cheerio.load(html);
  const descriptionElement = $('.show-more-less-html__markup').first();
  const companyElement = $('.topcard__org-name-link').first();
  const logoElement = $('.top-card-layout img').first();
  const recruiterElement = $('.message-the-recruiter').first();
  const criteria = [];

  $('.description__job-criteria-item').each((_, element) => {
    const label = normalizeText($(element).find('.description__job-criteria-subheader').text());
    const value = normalizeText($(element).find('.description__job-criteria-text').text());
    if (label && value) criteria.push({ label, value });
  });

  const descriptionHtml = sanitizeDescription($, descriptionElement);
  const title = normalizeText($('.top-card-layout__title').first().text());
  const salary = normalizeText(
    $('.compensation .compensation__salary, .compensation .salary').first().text()
  );
  const recruiterName = normalizeText(recruiterElement.find('.base-main-card__title').first().text());
  const recruiter = recruiterName ? {
    heading: normalizeText(recruiterElement.children('p').first().text()),
    name: recruiterName,
    title: normalizeText(recruiterElement.find('.base-main-card__subtitle').first().text()),
    imageUrl: safeUrl(
      recruiterElement.find('img').first().attr('data-delayed-url') ||
      recruiterElement.find('img').first().attr('src')
    ),
    profileUrl: safeUrl(recruiterElement.find('.base-card__full-link').first().attr('href')),
    messageUrl: safeUrl(recruiterElement.find('.message-the-recruiter__cta').first().attr('href'))
  } : null;

  if (!title && !descriptionHtml) {
    throw new Error('LinkedIn returned an unrecognized job response');
  }

  return {
    jobId: String(jobId),
    title,
    company: normalizeText(companyElement.text()),
    companyUrl: safeUrl(companyElement.attr('href')),
    logoUrl: safeUrl(logoElement.attr('data-delayed-url') || logoElement.attr('src')),
    location: normalizeText($('.topcard__flavor--bullet').first().text()),
    postedTime: normalizeText($('.posted-time-ago__text').first().text()),
    applicants: normalizeText($('.num-applicants__caption').first().text()),
    status: normalizeText($('.closed-job__flavor--closed').first().text()),
    jobUrl: safeUrl($('.topcard__link').first().attr('href')),
    salary,
    descriptionHtml,
    criteria,
    recruiter
  };
};

export const fetchLinkedInJobPosting = async (jobId) => {
  const cached = jobCache.get(String(jobId));
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${LINKEDIN_JOB_API}/${jobId}`, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
      },
      redirect: 'follow',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`LinkedIn returned HTTP ${response.status}`);
    }

    const data = parseLinkedInJobPosting(await response.text(), jobId);
    jobCache.set(String(jobId), { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } finally {
    clearTimeout(timeout);
  }
};
