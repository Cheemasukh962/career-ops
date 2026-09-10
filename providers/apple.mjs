// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { BROWSER_LIKE_USER_AGENT } from './_http.mjs';

// Apple Careers — public JSON search API.
// Prefer Internship postingType filter so we get campus roles early.

const SEARCH_URL = 'https://jobs.apple.com/api/role/search';
const MAX_PAGES = 15;

function headers() {
  return {
    'content-type': 'application/json',
    accept: 'application/json',
    'user-agent': BROWSER_LIKE_USER_AGENT,
  };
}

function mapJob(job) {
  const id = job.positionId || job.postingId || job.id;
  const title = job.postingTitle || job.title || job.roleTitle || '';
  if (!id || !title) return null;
  const locs = Array.isArray(job.locations)
    ? job.locations.map((l) => l?.name || l?.displayName || l).filter(Boolean).join(', ')
    : (job.location || '');
  const posted = job.postingDate || job.postedDate;
  const postedAt = posted ? Date.parse(posted) : undefined;
  return {
    title: String(title).trim(),
    url: `https://jobs.apple.com/en-us/details/${id}`,
    company: 'Apple',
    location: String(locs || '').trim(),
    postedAt: Number.isFinite(postedAt) ? postedAt : undefined,
  };
}

/** @type {Provider} */
export default {
  id: 'apple',

  detect(entry) {
    const url = entry.api || entry.careers_url || '';
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (host === 'jobs.apple.com' || host.endsWith('.apple.com')) return { url };
    } catch { /* ignore */ }
    return null;
  },

  async fetch(entry, ctx) {
    const query = typeof entry.query === 'string' ? entry.query : 'intern';
    const jobs = [];
    const seen = new Set();

    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const data = await ctx.fetchJson(SEARCH_URL, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            query,
            locale: 'en-us',
            filters: {
              postingpostLocation: ['postLocation-USA'],
              // Some Apple tenants expose team/posting filters; query+USA still works if absent.
            },
            page,
          }),
          timeoutMs: 20_000,
        });
        const results = data?.searchResults || data?.res?.searchResults || [];
        if (!results.length) break;
        for (const raw of results) {
          const j = mapJob(raw);
          if (!j || seen.has(j.url)) continue;
          if (!/intern|co-?op|student|university|campus|step|explore|apprentice/i.test(j.title)) continue;
          seen.add(j.url);
          jobs.push(j);
        }
        const total = Number(data?.totalRecords || 0);
        if (total && jobs.length >= total) break;
        if (results.length < 10) break;
      } catch (err) {
        console.error(`⚠️  apple: role/search page ${page} failed — ${err.message}`);
        break;
      }
    }

    return jobs;
  },
};
