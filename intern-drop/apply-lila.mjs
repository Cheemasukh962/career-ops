#!/usr/bin/env node
/** Fill and submit the Lila Sciences co-op application. Enter a Greenhouse code from lila-code.txt if it appears. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(".");
const PDF = path.join(ROOT, "resumes", "tailored", "lila-software-coop.pdf");
const CODE_FILE = path.join(ROOT, "intern-drop", "state", "lila-code.txt");
const PROOF = path.join(ROOT, "intern-drop", "state", "lila-submission.json");
const URL = "https://job-boards.greenhouse.io/lilasciences/jobs/4472540009";
const WHY =
  "I am a UC Davis electrical and computer engineering student graduating in June 2028, and I want a software co-op where I can ship data and API work. At #INCLUDE I built a React/Next.js registration flow for 200+ users, backed by FastAPI and MySQL, with 10+ pytest tests running in GitHub Actions. At UC Davis I built a Python and SQL ETL pipeline that loaded 35 legacy tables. dAdvisor, which won first place at ProdCon, is a RAG chatbot over 25,000 academic transcripts using ChromaDB, Python, and TypeScript. That is the same kind of retrieval and platform work this co-op describes.";

function log(s) {
  console.log(s);
}

async function controlBox(page, id) {
  await page.evaluate((fieldId) => {
    const el = document.querySelector(`#${CSS.escape(fieldId)}`);
    el?.scrollIntoView({ block: "center" });
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
  await page.waitForTimeout(150);
  const box = await controlBox(page, id);
  if (!box) {
    log(`no control ${id}`);
    return false;
  }
  await page.mouse.click(box.x + Math.max(box.w - 18, 8), box.y + box.h / 2);
  await page.waitForTimeout(400);
  const input = page.locator(`[id="${id}"]`);
  if (typed) {
    await input.pressSequentially(typed, { delay: 40 });
    await page.waitForTimeout(900);
  }
  const options = page.locator(".select__option");
  await options.first().waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  const n = await options.count();
  const seen = [];
  for (let i = 0; i < Math.min(n, 30); i++) {
    const text = (await options.nth(i).innerText()).replace(/\s+/g, " ").trim();
    if (!text) continue;
    seen.push(text);
    if (pattern.test(text)) {
      const ob = await options.nth(i).boundingBox();
      if (ob) await page.mouse.click(ob.x + ob.width / 2, ob.y + Math.min(ob.height / 2, 18));
      else await options.nth(i).click();
      log(`picked ${id}: ${text}`);
      await page.waitForTimeout(250);
      return true;
    }
  }
  log(`miss ${id}: ${seen.slice(0, 12).join(" | ")}`);
  await page.keyboard.press("Escape").catch(() => {});
  return false;
}

if (fs.existsSync(CODE_FILE)) fs.unlinkSync(CODE_FILE);

const browser = await chromium.launch({ headless: false, slowMo: 20 });
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
page.on("response", (res) => {
  const req = res.request();
  const u = res.url();
  if (req.method() !== "POST") return;
  if (/greenhouse|grnhse|recaptcha|google.com\/recaptcha/i.test(u)) {
    log(`POST ${res.status()} ${u.slice(0, 160)}`);
  }
});

let submitted = false;
try {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.locator("#first_name").waitFor({ timeout: 30000 });

  await page.locator("#first_name").fill("Sukhman");
  await page.locator("#last_name").fill("Cheema");
  await page.locator("#email").fill("cheemasukh966@gmail.com");
  await choose(page, "country", /^United States$/, "United States");
  const phone = page.locator("#phone");
  await phone.click();
  await phone.fill("9168969399");
  await page.locator("#resume").setInputFiles(PDF);
  log("resume attached");
  await page.waitForTimeout(800);

  await choose(page, "candidate-location", /Davis, California, United States/i, "Davis, California");
  await choose(page, "question_8189620009", /^No\b/i);
  await choose(page, "question_8189621009", /^Yes\b/i);
  await choose(page, "question_8189622009", /^Yes\b/i);
  await page.locator("#question_8189623009").scrollIntoViewIfNeeded();
  await page.locator("#question_8189623009").fill(WHY);
  await choose(page, "question_8189624009", /acknowledge|agree|consent|yes/i);

  const selected = await page.evaluate(() =>
    [...document.querySelectorAll(".select__single-value")].map((n) => n.textContent.trim()),
  );
  log(`SELECTED ${JSON.stringify(selected)}`);
  const whyLen = await page.locator("#question_8189623009").inputValue();
  log(`WHY_LEN ${whyLen.length}`);

  await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "lila-before.png"), fullPage: true });

  const submit = page.locator("button[type=submit]").first();
  await submit.scrollIntoViewIfNeeded();
  const sb = await submit.boundingBox();
  if (sb) await page.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2);
  else await submit.click();
  log("SUBMIT_CLICKED");

  let codeUsed = "";
  for (let i = 0; i < 36; i++) {
    await page.waitForTimeout(5000);
    const body = await page.locator("body").innerText();
    const flat = body.replace(/\s+/g, " ");
    if (/thank you for applying|application has been submitted|we have received your application|thanks for applying/i.test(flat)) {
      submitted = true;
      log("THANK_YOU");
      break;
    }
    const errors = await page.locator("[id$='-error'], .field-error, [class*='error']").allInnerTexts().catch(() => []);
    const errText = errors.map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 8);
    if (i === 0 || errText.length) log(`POLL ${i} errors=${JSON.stringify(errText)} snippet=${flat.slice(0, 280)}`);

    if (fs.existsSync(CODE_FILE)) {
      const code = fs.readFileSync(CODE_FILE, "utf8").trim();
      if (code && code !== codeUsed) {
        const labeled = page.getByLabel(/security code|verification code|enter the code/i);
        if (await labeled.count()) {
          await labeled.first().fill(code);
        } else {
          const inputs = page.locator("input[type=text], input[type=tel], input:not([type])");
          const n = await inputs.count();
          for (let j = 0; j < n; j++) {
            const meta = await inputs.nth(j).evaluate((el) =>
              `${el.id} ${(el.labels?.[0]?.innerText || "")} ${el.getAttribute("aria-label") || ""} ${el.placeholder || ""}`.toLowerCase(),
            );
            if (/security|verification|code/.test(meta) && !/country|phone/.test(meta)) {
              await inputs.nth(j).fill(code);
              log(`filled code field ${meta}`);
              break;
            }
          }
        }
        codeUsed = code;
        log(`CODE_ENTERED ${code}`);
        const again = page.locator("button[type=submit]").first();
        await again.scrollIntoViewIfNeeded();
        const ab = await again.boundingBox();
        if (ab) await page.mouse.click(ab.x + ab.width / 2, ab.y + ab.height / 2);
        else await again.click();
      }
    } else if (i === 0) {
      log("WAITING_CODE");
    }
  }

  await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "lila-after.png"), fullPage: true });
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 1800);
  fs.writeFileSync(
    PROOF,
    JSON.stringify({ at: new Date().toISOString(), url: URL, finalUrl: page.url(), resume: PDF, submitted, body }, null, 2),
  );
  log(`DONE submitted=${submitted}`);
  log(body.slice(0, 700));
} catch (err) {
  log(`APPLY_ERROR ${err.stack || err}`);
  try {
    await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "lila-error.png"), fullPage: true });
  } catch {}
}
await browser.close();
log("BROWSER_CLOSED");
