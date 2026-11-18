#!/usr/bin/env node
/** Fill and submit the Skydio HIL winter intern application. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(".");
const PDF = path.join(ROOT, "resumes", "tailored", "skydio-hil-intern.pdf");
const PROOF = path.join(ROOT, "intern-drop", "state", "skydio-submission.json");
const URL = "https://jobs.ashbyhq.com/skydio/add7fd86-78e6-483e-98cd-cdfc1029fded/application";

function log(s) {
  console.log(s);
}

const browser = await chromium.launch({ headless: false, slowMo: 15 });
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
page.on("response", (res) => {
  if (res.request().method() !== "POST") return;
  const u = res.url();
  if (/ashby|recaptcha|hcaptcha/i.test(u)) log(`POST ${res.status()} ${u.slice(0, 160)}`);
});

let submitted = false;
try {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
  await page.locator("#_systemfield_name").waitFor({ timeout: 30000 });
  await page.locator("#_systemfield_name").fill("Sukhman Cheema");
  await page.locator("#_systemfield_email").fill("cheemasukh966@gmail.com");
  const phone = page.locator('[id="1ae07aa9-eb08-4213-95b8-99cabe64728a"]');
  if (await phone.count()) await phone.fill("9168969399");
  const fileUploaded = page.waitForResponse(
    (r) => r.url().includes("ApiSetFormValueToFile") && r.ok(),
    { timeout: 30000 },
  );
  await page.locator("#_systemfield_resume").setInputFiles(PDF);
  await page.locator("#be237302-2cb0-4a00-b041-bd4d64429124").fill("https://www.linkedin.com/in/cheema-s");
  await page.locator("#b5113d54-76d1-4c1c-9101-fb7d1d581ac0").fill("https://github.com/Cheemasukh962");

  const boxes = page.getByRole("checkbox");
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    const name = ((await boxes.nth(i).getAttribute("aria-label")) || (await boxes.nth(i).evaluate((el) => el.labels?.[0]?.innerText || el.name || ""))).replace(/\s+/g, " ");
    if (/January 2027|February 2027|acknowledge|privacy|agree/i.test(name)) {
      await boxes.nth(i).check({ force: true });
      log(`checked ${name}`);
    } else {
      log(`checkbox ${name || "(blank)"}`);
    }
  }
  const govPick = await page.evaluate(() => {
    const hit = [...document.querySelectorAll("*")].find((n) => {
      const own = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join("");
      return /Prior US Government\s+Employment/i.test(own);
    });
    if (!hit) return { found: false };
    hit.scrollIntoView({ block: "center" });
    const hr = hit.getBoundingClientRect();
    const candidates = [...document.querySelectorAll("label, button, div, span, p")].filter((n) => {
      const own = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join("").trim();
      return /^No$/.test(own);
    });
    const target = candidates
      .map((n) => ({ n, r: n.getBoundingClientRect() }))
      .filter((x) => x.r.height > 0 && x.r.y >= hr.y - 10 && x.r.y < hr.y + 240)
      .sort((a, b) => a.r.y - b.r.y)[0];
    if (!target) return { found: true, clicked: "", candidates: candidates.length };
    target.n.click();
    const radio = target.n.querySelector("input[type=radio]") || target.n.closest("label")?.querySelector("input");
    return { found: true, clicked: "No", y: Math.round(target.r.y), checked: radio?.checked ?? null };
  });
  log(`government ${JSON.stringify(govPick)}`);
  if (!govPick.clicked) throw new Error("government answer missing");
  await fileUploaded;
  log("resume registered");
  try {
    const declines = page.getByRole("radio", { name: /^Decline to self-identify$/i });
    const dn = await declines.count();
    for (let i = 0; i < dn; i++) await declines.nth(i).check({ force: true });
    const vet = page.getByRole("radio", { name: /decline to self-identify for protected veteran/i });
    if (await vet.count()) await vet.first().check({ force: true });
    log("eeo declined");
  } catch (err) {
    log(`eeo skip ${err.message.split("\n")[0]}`);
  }

  await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "skydio-before.png"), fullPage: true });
  const submit = page.locator("button").filter({ hasText: "Submit application" }).last();
  await submit.scrollIntoViewIfNeeded();
  log(`submit enabled=${await submit.isEnabled()} text=${(await submit.innerText()).trim()}`);
  await submit.click();
  log("SUBMIT_CLICKED");

  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(4000);
    const flat = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    if (/thank you|application has been received|we have received|application submitted/i.test(flat)) {
      submitted = true;
      log("THANK_YOU");
      log(flat.slice(0, 400));
      break;
    }
    if (i < 3) log(`POLL ${i} ${flat.slice(0, 280)}`);
  }
  await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "skydio-after.png"), fullPage: true });
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 1200);
  fs.writeFileSync(PROOF, JSON.stringify({ at: new Date().toISOString(), url: URL, finalUrl: page.url(), resume: PDF, submitted, body }, null, 2));
  log(`DONE submitted=${submitted}`);
} catch (err) {
  log(`APPLY_ERROR ${err.stack || err}`);
  try {
    await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "skydio-error.png"), fullPage: true });
  } catch {}
}
await browser.close();
log("BROWSER_CLOSED");
