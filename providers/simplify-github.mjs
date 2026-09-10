// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { BROWSER_LIKE_USER_AGENT } from './_http.mjs';

/**
 * SimplifyJobs GitHub internship lists.
 * Public listings.json from Pitt CSC / Simplify repos — same data Simplify
 * pushes to GitHub (often earlier than aggregator UIs).
 *
 * Configure:
 *   provider: simplify-github
 *   repos:                # optional override
 *     - SimplifyJobs/Summer2027-Internships
 *     - SimplifyJobs/Summer2026-Internships
 *   branch: dev           # optional, default dev
 *   active_only: true     # default true
 */

const DEFAULT_REPOS = [
  'SimplifyJobs/Summer2027-Internships',
  'SimplifyJobs/Summer2026-Internships',
];

function listingsUrl(repo, branch) {
  return `https://raw.githubusercontent.com/${repo}/${branch}/.github/scripts/listings.json`;
}

function toEpochMs(value) {
  if (value == null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Simplify uses unix seconds
    return value < 1e12 ? value * 1000 : value;
  }
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** @type {Provider} */
export default {
  id: 'simplify-github',

  detect(entry) {
    const url = entry.api || entry.careers_url || '';
    if (/SimplifyJobs\/.*Internships/i.test(url) || /listings\.json/i.test(url)) {
      return { url };
    }
    return null;
  },

  async fetch(entry, ctx) {
    const repos = Array.isArray(entry.repos) && entry.repos.length
      ? entry.repos
      : DEFAULT_REPOS;
    const branch = typeof entry.branch === 'string' && entry.branch ? entry.branch : 'dev';
    const activeOnly = entry.active_only !== false;
    const jobs = [];
    const seen = new Set();

    for (const repo of repos) {
      const url = listingsUrl(repo, branch);
      let data;
      try {
        data = await ctx.fetchJson(url, {
          headers: { 'user-agent': BROWSER_LIKE_USER_AGENT, accept: 'application/json' },
          timeoutMs: 60_000,
        });
      } catch (err) {
        console.error(`⚠️  simplify-github: ${repo} — ${err.message}`);
        continue;
      }
      if (!Array.isArray(data)) {
        console.error(`⚠️  simplify-github: ${repo} — expected array`);
        continue;
      }

      for (const row of data) {
        if (!row || typeof row !== 'object') continue;
        if (activeOnly && row.active === false) continue;
        if (row.is_visible === false) continue;
        const title = typeof row.title === 'string' ? row.title.trim() : '';
        const applyUrl = typeof row.url === 'string' ? row.url.trim() : '';
        if (!title || !/^https?:\/\//i.test(applyUrl)) continue;
        if (seen.has(applyUrl)) continue;
        seen.add(applyUrl);

        const locs = Array.isArray(row.locations)
          ? row.locations.filter((l) => typeof l === 'string').join(', ')
          : '';
        const company = typeof row.company_name === 'string' && row.company_name.trim()
          ? row.company_name.trim()
          : (entry.name || 'Simplify');
        const terms = Array.isArray(row.terms) ? row.terms.join(', ') : '';
        const category = typeof row.category === 'string' ? row.category : '';
        const noteBits = [category, terms, `simplify:${repo}`].filter(Boolean);

        jobs.push({
          title,
          url: applyUrl,
          company,
          location: locs,
          postedAt: toEpochMs(row.date_posted || row.date_updated),
          note: noteBits.join(' · '),
          description: typeof row.sponsorship === 'string' ? row.sponsorship : undefined,
        });
      }
    }

    return jobs;
  },
};
