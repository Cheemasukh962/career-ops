/**
 * Applied-job dedup helpers for assist-apply.
 * Blocks the SAME job posting (URL / Greenhouse job id / Ashby UUID).
 * Different roles at the same company are allowed.
 */
import fs from "node:fs";
import path from "node:path";

/** Strip tracking noise; keep board + numeric/uuid job id when present. */
export function canonicalizeJobUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return raw.trim().toLowerCase();
  }
  u.hash = "";
  for (const key of [...u.searchParams.keys()]) {
    if (/^(gh_src|utm_|source|ref|nl|fr)/i.test(key) || key === "t") {
      u.searchParams.delete(key);
    }
  }
  const ghJid = u.searchParams.get("gh_jid");
  let out = u.origin + u.pathname.replace(/\/+$/, "");
  out = out.replace(/\/application$/i, "");
  if (ghJid) out += `?gh_jid=${ghJid}`;
  return out.toLowerCase();
}

export function extractJobKey(raw) {
  const canon = canonicalizeJobUrl(raw);
  let m = canon.match(/\/jobs\/(\d{5,})/i);
  if (m) return `gh:${m[1]}`;
  m = canon.match(/[?&]gh_jid=(\d{5,})/i);
  if (m) return `gh:${m[1]}`;
  m = canon.match(/[?&]token=(\d{5,})/i);
  if (m) return `gh:${m[1]}`;
  m = canon.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (m) return `ashby:${m[1].toLowerCase()}`;
  m = canon.match(/lever\.co\/[^/]+\/([0-9a-f-]{36})/i);
  if (m) return `lever:${m[1].toLowerCase()}`;
  return `url:${canon}`;
}

/**
 * @returns {{ applied: boolean, reason?: string, status?: string, source?: string }}
 */
export function checkAlreadyApplied(root, jobUrl) {
  const key = extractJobKey(jobUrl);
  const canon = canonicalizeJobUrl(jobUrl);

  const logPath = path.join(root, "data", "assist-apply-log.tsv");
  if (fs.existsSync(logPath)) {
    const lines = fs.readFileSync(logPath, "utf8").split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const cols = line.split("\t");
      const status = cols[2] || "";
      const applyUrl = cols[3] || "";
      const confUrl = cols[4] || "";
      if (!/Submitted|Applied/i.test(status)) continue;
      if (extractJobKey(applyUrl) === key || extractJobKey(confUrl) === key) {
        return {
          applied: true,
          reason: `assist-apply-log (${status})`,
          status,
          source: "assist-apply-log.tsv",
        };
      }
      if (
        canonicalizeJobUrl(applyUrl) === canon ||
        canonicalizeJobUrl(confUrl).startsWith(canon)
      ) {
        return {
          applied: true,
          reason: `assist-apply-log URL match (${status})`,
          status,
          source: "assist-apply-log.tsv",
        };
      }
    }
  }

  const trackerPath = path.join(root, "data", "applications.md");
  if (fs.existsSync(trackerPath)) {
    const text = fs.readFileSync(trackerPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!/^\|/.test(line) || /\|\s*#\s*\|/.test(line) || /^\|\s*-+/.test(line)) continue;
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter((_, i, a) => i > 0 && i < a.length - 1);
      if (cells.length < 6) continue;
      const company = cells[2] || "";
      const role = cells[3] || "";
      const status = cells[5] || "";
      const notes = cells[8] || cells[cells.length - 1] || "";
      if (!/Applied|Interview|Offer|Responded|Hired/i.test(status)) continue;
      const urlMatch = notes.match(/https?:\/\/\S+/g) || [];
      for (const u of urlMatch) {
        if (extractJobKey(u) === key) {
          return {
            applied: true,
            reason: `tracker #${cells[0]} ${company} — ${role} (${status})`,
            status,
            source: "applications.md",
          };
        }
      }
    }
  }

  return { applied: false };
}
