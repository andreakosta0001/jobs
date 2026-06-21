import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from 'cheerio';
import { generateHTML } from './templates.js';

const queryParams = {
  page: 1,
  empMax: null,
  companyQuery: '',
  titleQuery: '',
  locationQuery: '',
  lastday: 0,
  industries: [],
  industryMode: 'include'
};

const render = pageVariant => generateHTML({
  page: 1,
  totalJobs: 42,
  totalPages: 3,
  jobCards: '<article class="job-card">Role</article>',
  useInfiniteScroll: true,
  pageVariant,
  queryParams
});

const renderPage = () => generateHTML({
  page: 1,
  totalJobs: 42,
  totalPages: 3,
  jobCards: '<article class="job-card">Role</article>',
  pagination: '<nav class="pagination"></nav>',
  useInfiniteScroll: false,
  pageVariant: 'page',
  queryParams
});

test('/index variant uses the isolated themed workspace', () => {
  const document = load(render('index'));

  assert.equal(document('body').hasClass('index-mode'), true);
  assert.equal(document('.index-navbar').length, 1);
  assert.equal(document('.index-brand-mark').text(), 'in');
  assert.match(document('.index-brand-copy').text(), /LinkedIn Job Board\s+Remote US roles/);
  assert.equal(document('.index-theme-toggle').length, 1);
  assert.equal(document('.index-results-header').length, 0);
  assert.equal(document('.index-view-link').length, 0);
  assert.equal(document('.footer').length, 0);
  assert.equal(document('.index-filter-toolbar').length, 1);
  assert.equal(document('#index-primary-search').length, 0);
  assert.equal(document('.index-filter-toolbar input[type="search"]').length, 0);
  assert.equal(document('.index-linkedin-filter-row').length, 1);
  assert.equal(document('.index-linkedin-filter-row .filter-pill').length, 6);
  assert.equal(document('.filter-drawer').length, 1);
  assert.equal(document('#filter-form input[name="location"]').length, 1);
  assert.equal(document('#jobs-container').hasClass('index-job-list'), true);
  assert.equal(document('#filter-form').attr('action'), '/index');
  document('script:not([src])').each((index, script) => {
    new Function(document(script).html() || '');
  });
});

test('/view variant keeps the original scroll view', () => {
  const document = load(render('view'));

  assert.equal(document('body').hasClass('index-mode'), false);
  assert.equal(document('.index-navbar').length, 0);
  assert.equal(document('.theme-toggle').length, 1);
  assert.equal(document('.index-filter-toolbar').length, 0);
  assert.equal(document('#filter-form input[name="location"]').length, 0);
  assert.equal(document('#jobs-container').hasClass('index-job-list'), false);
  assert.equal(document('#filter-form').attr('action'), '/view');
});

test('/page includes the persisted light and dark mode control', () => {
  const document = load(renderPage());

  assert.equal(document('body').hasClass('paged-mode'), true);
  assert.equal(document('.page-theme-toggle').length, 1);
  assert.equal(document('.page-theme-toggle').attr('onclick'), 'toggleTheme()');
  assert.equal(document('.page-theme-toggle #theme-icon').length, 1);
  assert.equal(document('.page-theme-toggle #theme-text').length, 1);
  document('script:not([src])').each((index, script) => {
    new Function(document(script).html() || '');
  });
});
