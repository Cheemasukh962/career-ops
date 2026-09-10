#!/usr/bin/env node
/**
 * Intern drop watch — clone this repo, npm ci, then:
 *   node scripts/intern-drop.mjs          # intern lists + tracked companies
 *   node scripts/intern-drop.mjs --full   # also reverse ATS (Greenhouse/Ashby/Lever/Workday/iCIMS)
 *
 * Never applies. Never writes data/pipeline.md (scanners run --dry-run).
 * First run with an empty seen file seeds silently; later runs print NEW jobs only.
 *
 * Output:
 *   intern-drop/state/latest.json
 *   intern-drop/state/slack.md
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractJobKey } from "./applied-jobs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = path.join(ROOT, "intern-drop", "state");
const SEEN_PATH = path.join(STATE, "seen.json");
const LATEST_PATH = path.join(STATE, "latest.json");
const SLACK_PATH = path.join(STATE, "slack.md");
const PORTALS_PATH = path.join(ROOT, "portals.yml");
const PORTALS_TEMPLATE = path.join(ROOT, "templates", "portals-intern.yml");
const ATS_LOCK = path.join(STATE, "ats.lock");
const TICK_LOCK = path.join(STATE, "tick.lock");

const FULL = process.argv.includes("--full");
const CAP = 25;

const internRe =
  /\bintern\b|internship|co-?op\b|early career|undergraduate|university (grad|graduate)|new grad|campus|apprentice|fall 2026|summer 2027|summer 2026|student|summer scholar|summer analyst|summer associate/i;
const junkTitle =
  /\b(mba intern|phd|postdoc|nurse|physician|attorney|paralegal|recruiter|talent acquisition|hr intern|legal intern|sales intern|graphic design intern|social media intern|accounting intern|audit intern|tax intern|real estate intern|municipal|transportation intern|survey intern|land development|public works|site development|sprinkler|hvac|civil intern|roadway|highway design|fleet coordinator|financial aid|corporate affairs|copyright extern|assurance|wealth management|finance intern)\b/i;
const hwRe =
  /\b(hardware|electrical|firmware|embedded|fpga|asic|silicon|pcb|vlsi|\brf\b|radio frequency|analog|mixed[- ]signal|\bdft\b|physical design|\brtl\b|\bsoc\b|chip |semiconductor|mechatronic|ee intern|power electronics|photonic|circuit|board design|robotics|avionics|controls intern|test engineer intern|validation intern|rtl design|verification intern|design verification|optical|coherent|packaging intern)\b/i;
const embeddedMix =
  /\b(embedded|firmware|fpga|asic|vlsi|rtl|soc\b|hardware test|electrical engineer intern|ee intern|robotics (software|controls)|controls engineer intern|avionics)\b/i;
const pmRe =
  /\b(product manager|product management|\bapm\b|associate product|product intern|\bpm intern\b|product owner|product analyst|product operations|product design intern|technical product|product development intern|software product|product strategy intern|product marketing intern)\b/i;
const sweRe =
  /\b(software|sde\b|swe\b|developer|full.?stack|frontend|front-end|backend|platform engineer|site reliability|sre intern|devops intern|mobile intern|ios intern|android intern|ml engineer|machine learning intern|ai engineer|data engineer|applied ai|computer vision intern|systems intern|infrastructure intern|quant(itative)? (dev|developer)|automation software|fullstack|data scientist intern|data intern|research intern|applied science intern|data analytics|data analyst intern)\b/i;
const itRe =
  /\b(it intern|it internship|information technology|it\/digital|digital (&|and) it|it consult|technology consult|management consult|consulting intern|consultant intern|intern\s*[-–—]\s*technology|solutions consulting|consulting analyst|advisory intern|application consultant|business transformation consultant|consultative offerings|technology transformation|enterprise tech strategy|technology controls|package consultant|it support|help ?desk|desktop support|service desk|systems? administrat|sysadmin|it analyst|it technician|it specialist|it operations|tech support intern|technology intern|technology ldp|cybersecurity|information security|network (engineer|admin|intern)|technical (helpdesk|support)|digital consult|tech consult|it tech|technology analyst|business systems|summer scholar)\b/i;
const civilJunk =
  /\b(municipal|transportation|survey|land development|public works|site development|sprinkler|hvac|civil|roadway|highway|construction management|environmental services|air quality|planning & landscape)\b/i;
const blockedCo = /axon|renderatl|axontalentcommunity/i;

const CHANNEL = {
  swe: "intern-swe",
  it: "intern-consulting-it",
  hardware: "intern-hardware",
  product: "intern-product",
  other: "intern-other",
};

export const CONSULTING_WATCHLIST = [
  {
    firm: "IBM",
    url: "https://www.ibm.com/careers/search?field_keyword_08[0]=Internship&field_keyword_18[0]=United%20States",
    hint: "Intern Consulting, Application Consultant Intern, Business Transformation Consultant Intern 2027. Skip Penn State academic-year co-ops and closed IBM Federal listings.",
  },
  {
    firm: "Deloitte",
    url: "https://apply.deloitte.com/careers/SearchJobs/?listFilterMode=1&jobRecordsPerPage=20&",
    hint: "Intern, Summer Scholar, Technology, Consultative Offerings.",
  },
  {
    firm: "Adobe",
    url: "https://adobe.wd5.myworkdayjobs.com/external_experienced",
    hint: "2027 Intern, Solutions Consulting Analyst.",
  },
  {
    firm: "KPMG",
    url: "https://www.kpmguscareers.com/job-search/",
    hint: "Intern Advisory Technology. Prefer the official jobdetail URL, not aggregator mirrors.",
  },
  {
    firm: "Accenture",
    url: "https://www.accenture.com/us-en/careers/jobsearch",
    hint: "Summer Analyst intern / internship. Skip full-time Consultant/Senior.",
  },
  {
    firm: "FTI Consulting",
    url: "https://fticonsulting.wd1.myworkdayjobs.com/FTIConsultingCareers",
    hint: "2027 Intern Technology.",
  },
];

function ensurePortals() {
  if (fs.existsSync(PORTALS_PATH)) return PORTALS_PATH;
  if (!fs.existsSync(PORTALS_TEMPLATE)) {
    console.error("Missing portals.yml and templates/portals-intern.yml");
    process.exit(1);
  }
  fs.copyFileSync(PORTALS_TEMPLATE, PORTALS_PATH);
  console.error("Copied templates/portals-intern.yml → portals.yml");
  return PORTALS_PATH;
}

function pidAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLock(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeLock(file, extra = {}) {
  fs.mkdirSync(STATE, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ pid: process.pid, started: new Date().toISOString(), ...extra }));
}

function clearLock(file) {
  try {
    fs.unlinkSync(file);
  } catch {
    /* ignore */
  }
}

function canadaOnly(loc) {
  const s = String(loc || "").toLowerCase();
  if (!s) return false;
  const hasCanada =
    /\bcanada\b|\b, on\b|\b, qc\b|\b, ab\b|\b, bc\b|\b, mb\b|\btoronto\b|\bmontr[eé]al\b|\bvancouver\b|\bcalgary\b|\bottawa\b|\bwaterloo\b|\bmarkham\b|\boakville\b/.test(
      s,
    );
  const hasUs =
    /united states|\busa\b|\b u\.s\.|\bremote in usa|\bremote, usa/.test(s) ||
    /,\s*(al|ak|az|ar|co|ct|dc|de|fl|ga|hi|ia|id|il|in|ks|ky|la|ma|md|me|mi|mn|mo|ms|mt|nc|nd|ne|nh|nj|nm|nv|ny|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv)\b/.test(
      s,
    ) ||
    /,\s*ca\b/.test(s.replace(/,\s*canada\b/g, ""));
  return hasCanada && !hasUs;
}

function classify(title) {
  const t = String(title || "");
  if (itRe.test(t)) return "it";
  if (pmRe.test(t)) return "product";
  if (embeddedMix.test(t) || hwRe.test(t)) return "hardware";
  if (sweRe.test(t) || /software engineer|software developer/i.test(t)) return "swe";
  if (/\bengineering intern\b|\bengineer intern\b/i.test(t) && !civilJunk.test(t)) return "swe";
  return "other";
}

function keepOffer(o) {
  const title = o.title || "";
  const company = o.company || "";
  const loc = o.location || "";
  const url = o.url || "";
  if (!url || !/^https?:\/\//i.test(url)) return null;
  if (blockedCo.test(company) || blockedCo.test(url)) return null;
  if (!internRe.test(title)) return null;
  if (junkTitle.test(title) || civilJunk.test(title)) return null;
  if (canadaOnly(loc)) return null;
  const track = classify(title);
  return {
    key: extractJobKey(url),
    track,
    channel: CHANNEL[track],
    company,
    title,
    location: loc,
    url,
    source: o.source || null,
  };
}

function loadSeen() {
  try {
    const raw = JSON.parse(fs.readFileSync(SEEN_PATH, "utf8"));
    const keys = Array.isArray(raw.keys) ? raw.keys : Object.keys(raw.keys || {});
    return new Set(keys);
  } catch {
    return new Set();
  }
}

function saveSeen(keys) {
  fs.mkdirSync(STATE, { recursive: true });
  const tmp = `${SEEN_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ keys: [...keys].sort(), updated: new Date().toISOString() }));
  fs.renameSync(tmp, SEEN_PATH);
}

function runNode(args, { outFile, timeoutMs, extraEnv = {} } = {}) {
  return new Promise((resolve) => {
    fs.mkdirSync(STATE, { recursive: true });
    let outFd = "inherit";
    if (outFile) {
      outFd = fs.openSync(outFile, "w");
    }
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: { ...process.env, CAREER_OPS_PORTALS: "portals.yml", ...extraEnv },
      stdio: ["ignore", outFile ? outFd : "inherit", "inherit"],
    });
    let timedOut = false;
    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, timeoutMs)
      : null;
    child.on("exit", (code) => {
      if (timer) clearTimeout(timer);
      if (outFile) {
        try {
          fs.closeSync(outFd);
        } catch {
          /* ignore */
        }
      }
      resolve({ code: code ?? 1, timedOut });
    });
  });
}

function readOffersFile(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Array.isArray(raw.offers)) return raw.offers;
    if (Array.isArray(raw)) return raw;
    return [];
  } catch (err) {
    console.error(`Could not parse ${file}: ${err.message}`);
    return [];
  }
}

function slackBody(newJobs) {
  const by = {};
  for (const j of newJobs) {
    (by[j.channel] ||= []).push(j);
  }
  const parts = [];
  for (const channel of Object.values(CHANNEL)) {
    const rows = by[channel] || [];
    if (!rows.length) continue;
    const shown = rows.slice(0, CAP);
    parts.push(`# ${channel} (${rows.length}${rows.length > CAP ? `, showing ${CAP}` : ""})`);
    for (const j of shown) {
      parts.push(`- ${j.company} — ${j.title} — ${j.location || "n/a"}\n  ${j.url}`);
    }
    parts.push("");
  }
  return parts.join("\n").trim();
}

async function main() {
  fs.mkdirSync(STATE, { recursive: true });
  ensurePortals();

  const tick = readLock(TICK_LOCK);
  if (tick && pidAlive(tick.pid)) {
    console.error(`Skip: intern-drop already running (pid ${tick.pid})`);
    process.exit(0);
  }
  writeLock(TICK_LOCK, { mode: FULL ? "full" : "portals" });

  try {
    const scanJson = path.join(STATE, "scan.json");
    const scan = await runNode(["scan.mjs", "--dry-run", "--json-out", scanJson], {
      timeoutMs: 25 * 60 * 1000,
    });
    if (scan.timedOut) console.error("scan.mjs timed out after 25m — using whatever JSON exists");
    if (scan.code !== 0) console.error(`scan.mjs exit ${scan.code}`);

    const atsJson = path.join(STATE, "ats.json");
    const atsLock = readLock(ATS_LOCK);
    const atsRunning = Boolean(atsLock && pidAlive(atsLock.pid));
    let atsOffers = [];
    if (atsRunning) {
      console.error(`ATS still running (pid ${atsLock.pid}) — not ingesting a partial ats.json`);
    } else {
      atsOffers = readOffersFile(atsJson);
    }

    if (FULL && !atsRunning) {
      const errLog = path.join(STATE, "ats.err.log");
      const outFd = fs.openSync(atsJson, "w");
      const errFd = fs.openSync(errLog, "a");
      const child = spawn(
        process.execPath,
        [
          "scan-ats-full.mjs",
          "--ats",
          "greenhouse,ashby,lever,workday,icims",
          "--since",
          "1",
          "--json",
          "--dry-run",
          "--resume",
        ],
        {
          cwd: ROOT,
          env: { ...process.env, CAREER_OPS_PORTALS: "portals.yml" },
          stdio: ["ignore", outFd, errFd],
          detached: true,
        },
      );
      child.unref();
      writeLock(ATS_LOCK, { pid: child.pid, mode: "ats-full", outFile: atsJson });
      console.error(`Started reverse ATS in background (pid ${child.pid}). Next tick will ingest intern-drop/state/ats.json when it finishes.`);
    }

    const portalOffers = readOffersFile(scanJson);
    const kept = [];
    const seenKeys = new Set();
    for (const o of [...portalOffers, ...atsOffers]) {
      const row = keepOffer(o);
      if (!row || seenKeys.has(row.key)) continue;
      seenKeys.add(row.key);
      kept.push(row);
    }

    const seen = loadSeen();
    const seeding = seen.size === 0;
    const fresh = seeding ? [] : kept.filter((j) => !seen.has(j.key));
    for (const j of kept) seen.add(j.key);
    saveSeen(seen);

    const floodGuard = !seeding && fresh.length > 80;
    const toSlack = floodGuard ? [] : fresh;

    const latest = {
      at: new Date().toISOString(),
      seeding,
      floodGuard,
      full: FULL,
      atsRunning,
      scanned: { portals: portalOffers.length, ats: atsOffers.length, kept: kept.length },
      newCount: toSlack.length,
      suppressed: floodGuard ? fresh.length : 0,
      watchlist: CONSULTING_WATCHLIST,
      newJobs: toSlack,
    };
    fs.writeFileSync(LATEST_PATH, JSON.stringify(latest, null, 2));
    const md = seeding
      ? `Seeded ${kept.length} intern listings. Future ticks post only NEW roles. Silent if zero.`
      : floodGuard
        ? `Ingested ${fresh.length} listings as a baseline (first ATS dump). Not posted to Slack. Next tick posts only NEW roles.`
        : slackBody(toSlack);
    fs.writeFileSync(SLACK_PATH, md ? `${md}\n` : "");

    console.log(JSON.stringify({
      seeding,
      floodGuard,
      newCount: toSlack.length,
      kept: kept.length,
      channels: Object.fromEntries(
        Object.values(CHANNEL).map((ch) => [ch, toSlack.filter((j) => j.channel === ch).length]),
      ),
      slack: SLACK_PATH,
      latest: LATEST_PATH,
      watchlist: CONSULTING_WATCHLIST.length,
    }));
  } finally {
    clearLock(TICK_LOCK);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    clearLock(TICK_LOCK);
    console.error("Fatal:", err);
    process.exit(1);
  });
}
