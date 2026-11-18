#!/usr/bin/env node
/** Fill and submit the Addepar Summer 2027 software intern application. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(".");
const PDF = path.join(ROOT, "resumes", "tailored", "addepar-swe-intern.pdf");
const CODE_FILE = path.join(ROOT, "intern-drop", "state", "addepar-code.txt");
const PROOF = path.join(ROOT, "intern-drop", "state", "addepar-submission.json");
const URL = "https://job-boards.greenhouse.io/addepar1/jobs/8927531002";
const ESSAY =
  "I want a summer spent shipping production software with engineers who review the work. At #INCLUDE I built a React and Next.js registration flow for 200+ users, backed by FastAPI and MySQL, and wrote 10+ pytest tests that run in GitHub Actions. At UC Davis I built a Python and SQL ETL pipeline that loaded 35 legacy tables. dAdvisor, first place at ProdCon, is a RAG chatbot over 25,000 academic transcripts. I graduate in June 2028, and this internship is the summer I want on a data platform.";

function log(s) {
  console.log(s);
}

async function controlBox(page, id) {
  await page.evaluate((fieldId) => {
    document.querySelector(`#${CSS.escape(fieldId)}`)?.scrollIntoView({ block: "center" });
  }, id);
  await page.waitForTimeout(180);
  return page.evaluate((fieldId) => {
    const el = document.querySelector(`#${CSS.escape(fieldId)}`);
    const control = el?.closest(".select__control");
    if (!control) return null;
    const r = control.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, id);
}

async function choose(page, id, pattern, typed) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(100);
  const box = await controlBox(page, id);
  if (!box) {
    const plain = page.locator(`[id="${id}"]`);
    if (await plain.count()) {
      await plain.fill(typed || "");
      log(`typed ${id}`);
      return true;
    }
    log(`no control ${id}`);
    return false;
  }
  await page.mouse.click(box.x + Math.max(box.w - 18, 8), box.y + box.h / 2);
  await page.waitForTimeout(300);
  if (typed) {
    await page.locator(`[id="${id}"]`).pressSequentially(typed, { delay: 30 });
    await page.waitForTimeout(1200);
  }
  const options = page.locator(".select__option");
  await options.first().waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  const n = await options.count();
  const seen = [];
  for (let i = 0; i < Math.min(n, 30); i++) {
    const text = (await options.nth(i).innerText()).replace(/\s+/g, " ").trim();
    if (!text || /minor|virgin|outlying/i.test(text)) continue;
    seen.push(text);
    if (pattern.test(text)) {
      const ob = await options.nth(i).boundingBox();
      if (ob) await page.mouse.click(ob.x + ob.width / 2, ob.y + Math.min(ob.height / 2, 16));
      log(`picked ${id}: ${text}`);
      return true;
    }
  }
  log(`miss ${id}: ${seen.slice(0, 10).join(" | ")}`);
  await page.keyboard.press("Escape").catch(() => {});
  return false;
}

if (fs.existsSync(CODE_FILE)) fs.unlinkSync(CODE_FILE);
log(`ESSAY_WORDS ${ESSAY.split(/\s+/).length}`);

const browser = await chromium.launch({ headless: false, slowMo: 12 });
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
page.on("response", (res) => {
  if (res.request().method() !== "POST") return;
  const u = res.url();
  if (/greenhouse|grnhse|recaptcha/i.test(u)) log(`POST ${res.status()} ${u.slice(0, 140)}`);
});

let submitted = false;
try {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1200);
  await page.locator("#first_name").fill("Sukhman");
  await page.locator("#last_name").fill("Cheema");
  await page.locator("#email").fill("cheemasukh966@gmail.com");
  const countryOk = await choose(page, "country", /United States/i, "United States");
  await page.locator("#phone").fill("9168969399");
  const locOk = await choose(page, "candidate-location", /Davis, California, United States/i, "Davis, California");
  await page.locator("#resume").setInputFiles(PDF);
  log("resume attached");
  const schoolOk = await choose(page, "school--0", /University of California - Davis/i, "Davis");
  const degreeOk = await choose(page, "degree--0", /Bachelor/i, "Bachelor");
  let discOk = await choose(page, "discipline--0", /^Engineering$/i, "Engineer");
  await page.locator("#question_39106477002").fill("https://www.linkedin.com/in/cheema-s");
  const ageOk = await choose(page, "question_39106471002", /^Yes\b/i);
  const authOk = await choose(page, "question_39106469002", /^Yes\b/i);
  const sponsorOk = await choose(page, "question_39106470002", /^No\b/i);
  const nycOk = await choose(page, "question_39106472002", /arrange my own relocation/i);
  const uniOk = await choose(page, "question_39182877002", /Davis/i, "University of California, Davis");
  const fieldOk = await choose(page, "question_39106475002", /Electrical|Computer/i, "Electrical and Computer Engineering");
  const gradOk = await choose(page, "question_39106474002", /2028/, "June 2028");
  await page.locator("#question_39106476002").fill(ESSAY);
  const rivalOk = await choose(page, "question_39106478002", /^No\b/i);
  const privacyOk = await choose(page, "question_39106479002", /acknowledge|agree|yes/i);
  const flags = { countryOk, locOk, schoolOk, degreeOk, discOk, ageOk, authOk, sponsorOk, nycOk, uniOk, fieldOk, gradOk, rivalOk, privacyOk };
  log(`FLAGS ${JSON.stringify(flags)}`);
  const selected = await page.evaluate(() => [...document.querySelectorAll(".select__single-value")].map((n) => n.textContent.trim()));
  log(`SELECTED ${JSON.stringify(selected)}`);
  if (Object.values(flags).some((v) => !v)) {
    await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "addepar-before.png"), fullPage: true });
    throw new Error("required answer missing");
  }
  await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "addepar-before.png"), fullPage: true });
  const submit = page.locator("button[type=submit]").first();
  await submit.scrollIntoViewIfNeeded();
  await submit.click();
  log("SUBMIT_CLICKED");

  let codeUsed = "";
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(4000);
    const flat = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    if (/thank you for applying|application has been received|thanks for applying/i.test(flat)) {
      submitted = true;
      log("THANK_YOU");
      break;
    }
    const errors = await page.locator("[id$='-error']").allInnerTexts().catch(() => []);
    const errText = errors.map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 6);
    if (i < 2 || errText.length) log(`POLL ${i} ${JSON.stringify(errText)} ${flat.slice(0, 180)}`);
    if (!fs.existsSync(CODE_FILE)) continue;
    const code = fs.readFileSync(CODE_FILE, "utf8").trim();
    if (!code || code === codeUsed) continue;
    const labeled = page.getByLabel(/security code|verification code/i);
    if (await labeled.count()) await labeled.first().fill(code);
    codeUsed = code;
    log(`CODE_ENTERED ${code}`);
    await page.locator("button[type=submit]").first().click();
  }
  await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "addepar-after.png"), fullPage: true });
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 800);
  fs.writeFileSync(PROOF, JSON.stringify({ at: new Date().toISOString(), url: URL, finalUrl: page.url(), resume: PDF, submitted, body }, null, 2));
  log(`DONE submitted=${submitted}`);
  log(body.slice(0, 400));
} catch (err) {
  log(`APPLY_ERROR ${err.stack || err}`);
  try { await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "addepar-error.png"), fullPage: true }); } catch {}
}
await browser.close();
log("BROWSER_CLOSED");
