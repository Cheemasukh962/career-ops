// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { BROWSER_LIKE_USER_AGENT } from './_http.mjs';

// Microsoft careers — public PCSX search API (apply.careers.microsoft.com).

const SEARCH = 'https://apply.careers.microsoft.com/api/pcsx/search';
const PAGE = 50;
const MAX_START = 500;

const DEFAULT_PROFESSIONS = [
  'software engineering',
  'hardware engineering',
  'data and applied sciences',
  'product management',
  'technical program management',
  'it operations',
  'research',
  'design',
  'security engineering',
  'customer support',
];

/** @type {Provider} */
export default {
  id: 'microsoft',

  detect(entry) {
    const url = entry.api || entry.careers_url || '';
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (host.includes('careers.microsoft.com') || host === 'microsoft.com') return { url };
    } catch { /* ignore */ }
    return null;
  },

  async fetch(entry, ctx) {
    const professions = Array.isArray(entry.professions) && entry.professions.length
      ? entry.professions
      : DEFAULT_PROFESSIONS;
    const seniority = entry.seniority || 'Intern';
    const jobs = [];
    const seen = new Set();

    for (const profession of professions) {
      for (let start = 0; start < MAX_START; start += PAGE) {
        const params = new URLSearchParams({
          domain: 'microsoft.com',
          query: typeof entry.query === 'string' ? entry.query : '',
          location: typeof entry.location === 'string' ? entry.location : 'United States',
          start: String(start),
          sort_by: 'timestamp',
          filter_profession: profession,
          filter_seniority: seniority,
        });
        let data;
        try {
          data = await ctx.fetchJson(`${SEARCH}?${params}`, {
            headers: { 'user-agent': BROWSER_LIKE_USER_AGENT, accept: 'application/json' },
            timeoutMs: 20_000,
          });
        } catch (err) {
          console.error(`⚠️  microsoft: ${profession} start=${start} — ${err.message}`);
          break;
        }
        const positions = data?.data?.positions || [];
        if (!positions.length) break;
        for (const p of positions) {
          const id = p.id;
          const title = (p.name || '').trim();
          if (!id || !title || seen.has(String(id))) continue;
          seen.add(String(id));
          const locs = Array.isArray(p.locations)
            ? p.locations.join(', ')
            : (p.locations || p.location || '');
          jobs.push({
            title,
            url: `https://apply.careers.microsoft.com/careers/job/${id}`,
            company: 'Microsoft',
            location: String(locs || '').trim(),
            postedAt: p.postedTs ? Number(p.postedTs) * 1000 : undefined,
          });
        }
        if (positions.length < PAGE) break;
      }
    }

    return jobs;
  },
};
