// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { BROWSER_LIKE_USER_AGENT } from './_http.mjs';

// Google Careers — HTML listing pages filtered to employment_type=INTERN.
// Titles come from URL slugs; good enough for early notification + sheet dump.

const BASE = 'https://www.google.com/about/careers/applications/jobs/results/';
const MAX_PAGES = 12;
const JOB_RE = /jobs\/results\/(\d+)-([^?"'\s]+)/g;

function slugToTitle(slug) {
  return decodeURIComponent(slug)
    .replace(/-+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** @type {Provider} */
export default {
  id: 'google',

  detect(entry) {
    const url = entry.api || entry.careers_url || '';
    try {
      const u = new URL(url);
      if (u.hostname.includes('google.com') && u.pathname.includes('/careers')) return { url };
    } catch { /* ignore */ }
    return null;
  },

  async fetch(entry, ctx) {
    const jobs = [];
    const seen = new Set();
    const companies = Array.isArray(entry.companies) ? entry.companies : ['Google', 'YouTube', 'Fitbit', 'DeepMind'];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const params = new URLSearchParams();
      params.set('employment_type', 'INTERN');
      for (const c of companies) params.append('company', c);
      if (page > 1) params.set('page', String(page));
      let html;
      try {
        html = await ctx.fetchText(`${BASE}?${params}`, {
          headers: { 'user-agent': BROWSER_LIKE_USER_AGENT, accept: 'text/html' },
          timeoutMs: 20_000,
        });
      } catch (err) {
        console.error(`⚠️  google: page ${page} — ${err.message}`);
        break;
      }
      let match;
      let pageNew = 0;
      JOB_RE.lastIndex = 0;
      while ((match = JOB_RE.exec(html)) !== null) {
        const id = match[1];
        const slug = match[2];
        if (seen.has(id)) continue;
        seen.add(id);
        pageNew++;
        jobs.push({
          title: slugToTitle(slug),
          url: `https://www.google.com/about/careers/applications/jobs/results/${id}-${slug}`,
          company: 'Google',
          location: '',
        });
      }
      if (pageNew === 0) break;
    }

    return jobs;
  },
};
