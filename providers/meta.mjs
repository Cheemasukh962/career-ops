// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { BROWSER_LIKE_USER_AGENT } from './_http.mjs';

// Meta Careers GraphQL — University Grad / internship teams.
// Meta rotates Relay doc_id tokens; override via portals.yml meta.doc_id if needed.

const ENDPOINT = 'https://www.metacareers.com/graphql';
const DEFAULT_DOC_ID = '29615178951461218';
const DEFAULT_TEAMS = [
  'University Grad - Engineering, Tech & Design',
  'University Grad - Business',
  'Internship - Engineering, Tech & Design',
  'Internship - Business',
];

/** @type {Provider} */
export default {
  id: 'meta',

  detect(entry) {
    const url = entry.api || entry.careers_url || '';
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (host.includes('metacareers.com') || host.includes('meta.com')) return { url };
    } catch { /* ignore */ }
    return null;
  },

  async fetch(entry, ctx) {
    const cfg = entry.meta && typeof entry.meta === 'object' ? entry.meta : {};
    const docId = cfg.doc_id || DEFAULT_DOC_ID;
    const teams = Array.isArray(cfg.teams) && cfg.teams.length ? cfg.teams : DEFAULT_TEAMS;
    const lsd = cfg.lsd || 'AdFL9XlD5sA';

    const body = new URLSearchParams({
      lsd,
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: 'CareersJobSearchResultsDataQuery',
      variables: JSON.stringify({
        search_input: {
          q: cfg.query ?? null,
          divisions: [],
          offices: [],
          roles: [],
          leadership_levels: [],
          saved_jobs: [],
          saved_searches: [],
          sub_teams: [],
          teams,
          is_leadership: false,
          is_remote_only: false,
          sort_by_new: true,
          results_per_page: null,
        },
      }),
      doc_id: String(docId),
    });

    let data;
    try {
      data = await ctx.fetchJson(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': BROWSER_LIKE_USER_AGENT,
          'x-fb-friendly-name': 'CareersJobSearchResultsDataQuery',
          'x-fb-lsd': lsd,
          'x-asbd-id': '359341',
        },
        body: body.toString(),
        timeoutMs: 25_000,
      });
    } catch (err) {
      console.error(`⚠️  meta: graphql failed — ${err.message}`);
      return [];
    }

    const list =
      data?.data?.job_search_with_featured_jobs?.all_jobs ||
      data?.data?.job_search?.all_jobs ||
      [];

    const jobs = [];
    const seen = new Set();
    for (const job of list) {
      const id = job?.id;
      const title = (job?.title || '').trim();
      if (!id || !title || seen.has(String(id))) continue;
      seen.add(String(id));
      const locs = Array.isArray(job.locations) ? job.locations.join(', ') : '';
      jobs.push({
        title,
        url: `https://www.metacareers.com/jobs/${id}`,
        company: 'Meta',
        location: locs,
      });
    }
    return jobs;
  },
};
