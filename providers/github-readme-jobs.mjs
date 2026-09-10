// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { BROWSER_LIKE_USER_AGENT } from './_http.mjs';

/**
 * Parse internship tables from community GitHub README lists
 * (SpeedyApply, vanshb03 forks, Jobright-style markdown tables).
 *
 * Configure:
 *   provider: github-readme-jobs
 *   readmes:
 *     - https://raw.githubusercontent.com/speedyapply/2027-SWE-College-Jobs/main/README.md
 */

const ROW_RE = /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/;

function extractLinks(cell) {
  const links = [];
  const md = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  let m;
  while ((m = md.exec(cell)) !== null) links.push(m[2]);
  if (!links.length) {
    const bare = cell.match(/https?:\/\/[^\s<>|"']+/);
    if (bare) links.push(bare[0]);
  }
  return links;
}

function cleanCell(s) {
  return String(s || '')
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @type {Provider} */
export default {
  id: 'github-readme-jobs',

  detect() {
    return null;
  },

  async fetch(entry, ctx) {
    const readmes = Array.isArray(entry.readmes)
      ? entry.readmes
      : (entry.api || entry.careers_url ? [entry.api || entry.careers_url] : []);
    if (!readmes.length) {
      throw new Error('github-readme-jobs: set readmes: [raw github urls]');
    }

    const jobs = [];
    const seen = new Set();

    for (const url of readmes) {
      let md;
      try {
        md = await ctx.fetchText(url, {
          headers: { 'user-agent': BROWSER_LIKE_USER_AGENT, accept: 'text/plain' },
          timeoutMs: 60_000,
        });
      } catch (err) {
        console.error(`⚠️  github-readme-jobs: ${url} — ${err.message}`);
        continue;
      }

      for (const line of md.split('\n')) {
        if (!line.startsWith('|')) continue;
        if (/^\|\s*-+/.test(line) || /\bCompany\b/i.test(line)) continue;
        const m = line.match(ROW_RE);
        if (!m) continue;
        const company = cleanCell(m[1]);
        const title = cleanCell(m[2]);
        const location = cleanCell(m[3]);
        const links = extractLinks(m[4]);
        if (!company || !title || !links.length) continue;
        // Skip closed / inactive markers
        if (/❌|closed|inactive/i.test(line) && !/✅|apply/i.test(m[4])) continue;
        const applyUrl = links[links.length - 1];
        if (seen.has(applyUrl)) continue;
        seen.add(applyUrl);
        jobs.push({
          title,
          url: applyUrl,
          company,
          location,
          note: `readme:${url.split('/').slice(3, 5).join('/')}`,
        });
      }
    }

    return jobs;
  },
};
