#!/usr/bin/env node
/** Fill and submit the Muon Space software intern application. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(".");
const PDF = path.join(ROOT, "resumes", "tailored", "muonspace-swe-intern.pdf");
const CODE_FILE = path.join(ROOT, "intern-drop", "state", "muon-code.txt");
const PROOF = path.join(ROOT, "intern-drop", "state", "muon-submission.json");
const URL = "https://job-boards.greenhouse.io/muonspace/jobs/5293973007";

function log(s) {
  console.log(s);
}

async function controlBox(page, id) {
  await page.evaluate((fieldId) => {
    document.querySelector(`#${CSS.escape(fieldId)}`)?.scrollIntoView({ block: "center" });
  }, id);
  await page.waitForTimeout(200);
  return page.evaluate((fieldId) => {
    const el = document.querySelector(`#${CSS.escape(fieldId)}`);
    const control = el?.closest(".select__control");
    if (!control) return null;
    const r = control.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      w: r.width,
      h: r.height,
      value: (control.querySelector(".select__single-value")?.textContent || "").trim(),
    };
  }, id);
}

async function choose(page, id, pattern, typed) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(120);
  const box = await controlBox(page, id);
  if (!box) {
    log(`no control ${id}`);
    return false;
  }
  await page.mouse.click(box.x + Math.max(box.w - 18, 8), box.y + box.h / 2);
  await page.waitForTimeout(350);
  if (typed) {
    await page.locator(`[id="${id}"]`).pressSequentially(typed, { delay: 35 });
    await page.waitForTimeout(800);
  }
  const options = page.locator(".select__option");
  await options.first().waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  const n = await options.count();
  const seen = [];
  for (let i = 0; i < Math.min(n, 40); i++) {
    const text = (await options.nth(i).innerText()).replace(/\s+/g, " ").trim();
    if (!text || /minor|virgin|outlying/i.test(text)) continue;
    seen.push(text);
    if (pattern.test(text)) {
      const ob = await options.nth(i).boundingBox();
      if (ob) await page.mouse.click(ob.x + ob.width / 2, ob.y + Math.min(ob.height / 2, 16));
      else await options.nth(i).click();
      log(`picked ${id}: ${text}`);
      await page.waitForTimeout(200);
      return true;
    }
  }
  log(`miss ${id}: ${seen.slice(0, 12).join(" | ")}`);
  await page.keyboard.press("Escape").catch(() => {});
  return false;
}

if (fs.existsSync(CODE_FILE)) fs.unlinkSync(CODE_FILE);

const browser = await chromium.launch({ headless: false, slowMo: 15 });
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
page.on("response", (res) => {
  if (res.request().method() !== "POST") return;
  const u = res.url();
  if (/greenhouse|grnhse|recaptcha/i.test(u)) log(`POST ${res.status()} ${u.slice(0, 160)}`);
});

let submitted = false;
try {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.locator("#first_name").waitFor();
  await page.locator("#first_name").fill("Sukhman");
  await page.locator("#last_name").fill("Cheema");
  await page.locator("#email").fill("cheemasukh966@gmail.com");
  const countryOk = await choose(page, "country", /United States/i, "United States");
  await page.locator("#phone").click();
  await page.locator("#phone").fill("9168969399");
  const locOk = await choose(page, "candidate-location", /Davis, California, United States/i, "Davis, California");
  await page.locator("#resume").setInputFiles(PDF);
  log("resume attached");
  await page.locator("#question_13417268007").fill("https://www.linkedin.com/in/cheema-s");
  await page.locator("#question_13417269007").fill("https://github.com/Cheemasukh962");
  await page.locator("#question_13417270007").fill("Davis, CA 95616");
  const onsiteOk = await choose(page, "question_13417271007", /^Yes\b/i);
  const personOk = await choose(page, "question_13417272007", /US Citizen/i);
  const grad = page.locator("#question_13417273007");
  if (await controlBox(page, "question_13417273007")) {
    await choose(page, "question_13417273007", /2028/, "June 2028");
  } else {
    await grad.fill("June 2028");
  }

  const selected = await page.evaluate(() =>
    [...document.querySelectorAll(".select__single-value")].map((n) => n.textContent.trim()),
  );
  log(`SELECTED ${JSON.stringify(selected)}`);
  log(`FLAGS country=${countryOk} loc=${locOk} onsite=${onsiteOk} person=${personOk}`);
  if (!countryOk || !locOk || !onsiteOk || !personOk) {
    await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "muon-before.png"), fullPage: true });
    throw new Error("required dropdown missing");
  }

  await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "muon-before.png"), fullPage: true });
  const submit = page.locator("button[type=submit]").first();
  await submit.scrollIntoViewIfNeeded();
  const sb = await submit.boundingBox();
  if (sb) await page.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2);
  else await submit.click();
  log("SUBMIT_CLICKED");

  let codeUsed = "";
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(5000);
    const flat = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    if (/thank you for applying|application has been submitted|we have received your application|thanks for applying/i.test(flat)) {
      submitted = true;
      log("THANK_YOU");
      break;
    }
    const errors = await page.locator("[id$='-error']").allInnerTexts().catch(() => []);
    const errText = errors.map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 8);
    if (i < 3 || errText.length) log(`POLL ${i} errors=${JSON.stringify(errText)} snippet=${flat.slice(0, 240)}`);
    if (!fs.existsSync(CODE_FILE)) {
      if (i === 0) log("WAITING_CODE");
      continue;
    }
    const code = fs.readFileSync(CODE_FILE, "utf8").trim();
    if (!code || code === codeUsed) continue;
    const labeled = page.getByLabel(/security code|verification code/i);
    if (await labeled.count()) await labeled.first().fill(code);
    else {
      const inputs = page.locator("input[type=text], input[type=tel], input:not([type])");
      const n = await inputs.count();
      for (let j = 0; j < n; j++) {
        const meta = await inputs.nth(j).evaluate((el) =>
          `${el.id} ${(el.labels?.[0]?.innerText || "")} ${el.placeholder || ""}`.toLowerCase(),
        );
        if (/security|verification|code/.test(meta)) {
          await inputs.nth(j).fill(code);
          break;
        }
      }
    }
    codeUsed = code;
    log(`CODE_ENTERED ${code}`);
    const again = page.locator("button[type=submit]").first();
    const ab = await again.boundingBox();
    if (ab) await page.mouse.click(ab.x + ab.width / 2, ab.y + ab.height / 2);
    else await again.click();
  }

  await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "muon-after.png"), fullPage: true });
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 1600);
  fs.writeFileSync(PROOF, JSON.stringify({ at: new Date().toISOString(), url: URL, finalUrl: page.url(), resume: PDF, submitted, body }, null, 2));
  log(`DONE submitted=${submitted}`);
  log(body.slice(0, 500));
} catch (err) {
  log(`APPLY_ERROR ${err.stack || err}`);
  try {
    await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "muon-error.png"), fullPage: true });
  } catch {}
}
await browser.close();
log("BROWSER_CLOSED");
