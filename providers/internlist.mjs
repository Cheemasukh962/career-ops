// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { BROWSER_LIKE_USER_AGENT } from './_http.mjs';

/**
 * InternList.org / Intern-List.com (Jobright) — best-effort HTML extract.
 * Jobright has no public jobs list API; their GitHub + site point at the same
 * internship corpus. We scrape public HTML cards/links when present and always
 * recommend pairing with provider: simplify-github (higher coverage).
 *
 * Configure:
 *   provider: internlist
 *   pages: [https://internlist.org/, https://intern-list.com/]
 */

const DEFAULT_PAGES = [
  'https://internlist.org/',
  'https://www.intern-list.com/',
];

const HREF_RE = /href="(https?:\/\/[^"]+)"[^>]*>([^<]{3,120})</gi;
const CARD_RE = /(?:company|role|title)[^>]*>\s*([^<]{3,100})/gi;

function looksLikeJobUrl(url) {
  try {
    const u = new URL(url);
    if (/internlist\.org|intern-list\.com|jobright\.ai|simplify\.jobs|linkedin\.com\/company/i.test(u.hostname)) {
      return false;
    }
    return /job|career|greenhouse|lever|ashby|myworkday|oraclecloud|icims|smartrecruiters|boards\./i.test(url);
  } catch {
    return false;
  }
}

/** @type {Provider} */
export default {
  id: 'internlist',

  detect(entry) {
    const url = entry.api || entry.careers_url || '';
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (host.includes('internlist') || host.includes('intern-list')) return { url };
    } catch { /* ignore */ }
    return null;
  },

  async fetch(entry, ctx) {
    const pages = Array.isArray(entry.pages) && entry.pages.length
      ? entry.pages
      : DEFAULT_PAGES;
    const jobs = [];
    const seen = new Set();

    for (const page of pages) {
      let html;
      try {
        html = await ctx.fetchText(page, {
          headers: {
            'user-agent': BROWSER_LIKE_USER_AGENT,
            accept: 'text/html',
          },
          timeoutMs: 45_000,
        });
      } catch (err) {
        console.error(`⚠️  internlist: ${page} — ${err.message}`);
        continue;
      }

      // Anchor tags that look like apply links
      let m;
      HREF_RE.lastIndex = 0;
      while ((m = HREF_RE.exec(html)) !== null) {
        const url = m[1];
        const text = m[2].replace(/\s+/g, ' ').trim();
        if (!looksLikeJobUrl(url) || seen.has(url)) continue;
        if (text.length < 4 || /^(apply|here|link|view|click)$/i.test(text)) continue;
        seen.add(url);
        jobs.push({
          title: text,
          url,
          company: entry.name || 'InternList',
          location: '',
          note: `internlist:${page}`,
        });
      }

      // Fallback: simplify.jobs apply links embedded in page
      const simp = html.matchAll(/href="(https:\/\/simplify\.jobs\/p\/[^"]+)"/g);
      for (const sm of simp) {
        const url = sm[1];
        if (seen.has(url)) continue;
        seen.add(url);
        jobs.push({
          title: 'Internship (InternList / Simplify link)',
          url,
          company: entry.name || 'InternList',
          location: '',
          note: `internlist-simplify:${page}`,
        });
      }
    }

    if (!jobs.length) {
      console.error('⚠️  internlist: no extractable jobs — rely on simplify-github provider for full coverage');
    }
    return jobs;
  },
};
