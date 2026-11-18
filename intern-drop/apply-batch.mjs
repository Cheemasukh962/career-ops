#!/usr/bin/env node
/** Submit Greenhouse internships until 7 new thank-you pages, then stop. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(".");
const OUT = path.join(ROOT, "intern-drop", "state", "batch-results.json");
const SOFTWARE = path.join(ROOT, "resumes", "tailored", "lila-software-coop.pdf");
const HARDWARE = path.join(ROOT, "resumes", "tailored", "astranis-embedded-intern.pdf");
const ESSAY =
  "I am a UC Davis electrical and computer engineering student graduating in June 2028. At #INCLUDE I built a React and Next.js registration flow for 200+ users, backed by FastAPI and MySQL, with 10+ pytest tests running in GitHub Actions. At UC Davis I built a Python and SQL ETL pipeline that loaded 35 legacy tables. dAdvisor, first place at ProdCon, is a RAG chatbot over 25,000 academic transcripts. I want an internship where I can ship tested software and work on real systems.";

const JOBS = [
  ["lightmatter", "5473869008", "Hardware Test Engineering, Intern (Summer 2027)", "hardware"],
  ["lightmatter", "5479596008", "Laser Firmware Intern - Summer 2027", "hardware"],
  ["lightmatter", "5474690008", "Product & Test Engineering, Intern Summer 2027", "hardware"],
  ["formlabs", "8374598", "Manufacturing Test Software Intern", "software"],
  ["lunarenergy", "6220078004", "Power Electronics Test Intern", "hardware"],
  ["sharkninjaoperatingllc", "4721651006", "Control Systems & Algorithms Intern", "hardware"],
  ["andurilindustries", "5274037007", "2027 Machine Learning Engineer Intern", "software"],
  ["deeplocal", "8395842", "Engineering Intern", "software"],
  ["arcesiumllc", "5257251007", "AI Transformation Intern", "software"],
  ["nisc", "8372340", "Intern - Test Automation", "software"],
  ["m3", "8201335003", "Intern-Quality Engineering (SDET)", "software"],
  ["riotgames", "8356716", "Data Engineering Intern - Summer 2027", "software"],
  ["enova", "8366036", "Analytics Intern", "software"],
  ["lightmatter", "5474812008", "Quality & Reliability, Intern Summer 2027", "hardware"],
];

function log(s) {
  console.log(s);
}

async function controlBox(page, id) {
  await page.evaluate((fieldId) => {
    document.querySelector(`#${CSS.escape(fieldId)}`)?.scrollIntoView({ block: "center" });
  }, id);
  await page.waitForTimeout(120);
  return page.evaluate((fieldId) => {
    const el = document.querySelector(`#${CSS.escape(fieldId)}`);
    const control = el?.closest(".select__control");
    if (!control) return null;
    const r = control.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, id);
}

async function readOptions(page, id, typed) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(80);
  const box = await controlBox(page, id);
  if (!box) return { plain: true, options: [] };
  if (typed) {
    const input = page.locator(`[id="${id}"]`);
    await input.click({ force: true });
    await input.fill("");
    await input.pressSequentially(typed, { delay: 20 });
    await page.waitForTimeout(1000);
  } else {
    await page.mouse.click(box.x + Math.max(box.w - 16, 8), box.y + box.h / 2);
    await page.waitForTimeout(350);
    if ((await page.locator(".select__option").count()) === 0) {
      await page.locator(`[id="${id}"]`).click({ force: true });
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(500);
    }
  }
  let options = (await page.locator(".select__option").allInnerTexts())
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t && !/minor|virgin|outlying/i.test(t));
  if (options.length === 0) {
    options = (await page.getByRole("option").allInnerTexts())
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter((t) => t && !/minor|virgin|outlying/i.test(t));
  }
  return { plain: false, options };
}

async function clickOption(page, text) {
  const options = page.locator(".select__option");
  const n = await options.count();
  for (let i = 0; i < Math.min(n, 40); i++) {
    const got = (await options.nth(i).innerText()).replace(/\s+/g, " ").trim();
    if (got === text) {
      const ob = await options.nth(i).boundingBox();
      if (ob) await page.mouse.click(ob.x + ob.width / 2, ob.y + Math.min(ob.height / 2, 16));
      else await options.nth(i).click();
      return true;
    }
  }
  const role = page.getByRole("option", { name: text, exact: true });
  if (await role.count()) {
    await role.first().click();
    return true;
  }
  return false;
}

function pickText(options, pattern) {
  return options.find((t) => pattern.test(t)) || "";
}

function ruleFor(label, options) {
  const lab = label.toLowerCase();
  if (/compensation|salary|hourly pay|pay expectation|desired pay/.test(lab)) return { skipJob: "asks for a pay number" };
  if (/reliable transportation|do you have a car|commute/.test(lab)) return { skipJob: "asks about transportation he does not have on file" };
  if (options.some((o) => /already live in or near/i.test(o))) {
    const move = options.find((o) => /relocat|arrange my own|willing to move/i.test(o));
    if (move) return { choice: move };
    return { skipJob: "onsite question only allows already living there" };
  }
  if (/sponsor|visa/.test(lab) && !/opt|cpt/.test(lab)) return { pattern: /^no\b/i };
  if (/opt|cpt/.test(lab)) return { pattern: /^no\b/i };
  if (/non-?compet|non-?solicit|restrict|bound by any contract|subject to any agreement/.test(lab)) return { pattern: /^no\b/i };
  if (/client, partner, or competitor|previously employed|former employee/.test(lab)) return { pattern: /^no\b/i };
  if (/how did you hear|where did you hear|how did you learn/.test(lab)) return { pattern: /job board|online job|internet|linkedin|company website|career site|other/i };
  if (/state/.test(lab) && /resid|permanent|live/.test(lab)) return { pattern: /^California$/i };
  if (/school|university/.test(lab)) return { pattern: /University of California - Davis/i, typed: "Davis" };
  if (/^degree/.test(lab) || /degree\*/.test(lab)) return { pattern: /Bachelor/i, typed: "Bachelor" };
  if (/discipline|major/.test(lab)) return { pattern: /^Engineering$/i, typed: "Engineer" };
  if (/country/.test(lab)) return { pattern: /United States/i, typed: "United States" };
  if (/location|city/.test(lab)) return { pattern: /Davis, California, United States/i, typed: "Davis, California" };
  if (/graduation|graduate/.test(lab)) return { pattern: /2028|June/i, typed: "June 2028", text: "June 2028" };
  if (/gpa/.test(lab)) return { text: "3.5" };
  if (/linkedin/.test(lab)) return { text: "https://www.linkedin.com/in/cheema-s" };
  if (/website|github|portfolio/.test(lab)) return { text: "https://github.com/Cheemasukh962" };
  if (/address/.test(lab)) return { text: "Davis, CA 95616" };
  if (/field of study|degree program|major/.test(lab)) return { text: "Electrical and Computer Engineering" };
  if (/start date|availability to start|when would you be available|available to start/.test(lab)) return { pattern: /May 2027|June 2027|Summer 2027|May\/June/i, text: "May 2027" };
  if (/authorized|eligible to work|legally authorized|18 years|u\.s\. person|us person|citizen|export control/.test(lab)) return { pattern: /^(Yes|US Citizen|I am)\b/i };
  if (/privacy|acknowledge|personal data|consent|agree to the following/.test(lab)) return { pattern: /acknowledge|agree|^yes\b/i };
  if (/relocat|on-?site|in-office|in office|willing to work|able to work|available to work/.test(lab)) return { pattern: /^yes\b/i };
  if (/why |interest|tell us|describe|what do you want|additional/.test(lab)) return { text: ESSAY };
  return null;
}

async function answer(page, id, label) {
  const first = await readOptions(page, id);
  if (first.plain) {
    const rule = ruleFor(label, []);
    if (!rule) return { ok: false, reason: `plain ${label}` };
    if (rule.skipJob) return { skipJob: rule.skipJob };
    if (rule.text) {
      await page.locator(`[id="${id}"]`).fill(rule.text.slice(0, 1500));
      log(`typed ${label.slice(0, 60)}`);
      return { ok: true };
    }
    return { ok: false, reason: `no text rule ${label}` };
  }
  let options = first.options;
  let rule = ruleFor(label, options);
  if (rule?.typed) {
    const again = await readOptions(page, id, rule.typed);
    options = again.options.length ? again.options : options;
    rule = ruleFor(label, options);
  }
  if (!rule) {
    await page.keyboard.press("Escape").catch(() => {});
    return { ok: false, reason: `unknown ${label} :: ${options.slice(0, 6).join(" | ")}` };
  }
  if (rule.skipJob) return { skipJob: rule.skipJob };
  const choice = rule.choice || (rule.pattern ? pickText(options, rule.pattern) : "");
  if (!choice && rule.text && first.plain) return { ok: false, reason: "empty" };
  if (!choice) {
    if (options.length === 0 && rule.pattern && /^yes\\b/i.test("Yes") && rule.pattern.test("Yes")) {
      const input = page.locator(`[id="${id}"]`);
      await input.click({ force: true });
      await input.fill("Yes");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      log(`typed-yes ${label.slice(0, 50)}`);
      return { ok: true, reason: "Yes" };
    }
    await page.keyboard.press("Escape").catch(() => {});
    return { ok: false, reason: `no match ${label} :: ${options.slice(0, 8).join(" | ")}` };
  }
  const clicked = await clickOption(page, choice);
  log(`${clicked ? "picked" : "missed"} ${label.slice(0, 50)}: ${choice}`);
  if (!clicked) await page.keyboard.press("Escape").catch(() => {});
  return { ok: clicked, reason: choice };
}

const results = [];
let confirmed = 0;

for (const [board, id, title, kind] of JOBS) {
  if (confirmed >= 7) break;
  const url = `https://job-boards.greenhouse.io/${board}/jobs/${id}`;
  const resume = kind === "hardware" ? HARDWARE : SOFTWARE;
  log(`\nJOB ${board} ${title}`);
  const browser = await chromium.launch({ headless: false, slowMo: 8 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1200);
    const ready = await page.locator("#first_name").waitFor({ timeout: 12000 }).then(() => true).catch(() => false);
    if (!ready || !page.url().includes("greenhouse.io")) {
      results.push({ board, title, url, finalUrl: page.url(), ok: false, reason: "no greenhouse form" });
      log("SKIP no form");
      continue;
    }
    await page.locator("#first_name").fill("Sukhman");
    await page.locator("#last_name").fill("Cheema");
    await page.locator("#email").fill("cheemasukh966@gmail.com");
    await answer(page, "country", "Country");
    if (await page.locator("#phone").count()) await page.locator("#phone").fill("9168969399");
    if (await page.locator("#candidate-location").count()) await answer(page, "candidate-location", "Location (City)");
    if (await page.locator("#resume").count()) await page.locator("#resume").setInputFiles(resume);
    if (await page.locator("#school--0").count()) await answer(page, "school--0", "School");
    if (await page.locator("#degree--0").count()) await answer(page, "degree--0", "Degree");
    if (await page.locator("#discipline--0").count()) await answer(page, "discipline--0", "Discipline");

    const fields = await page.evaluate(() =>
      [...document.querySelectorAll("input, textarea")]
        .filter((el) => el.id && el.getAttribute("aria-required") === "true")
        .map((el) => ({
          id: el.id,
          tag: el.tagName,
          label: ((el.labels && el.labels[0] && el.labels[0].innerText) || "").replace(/\s+/g, " ").trim(),
          value: el.value || "",
          selected: (el.closest(".select__control")?.querySelector(".select__single-value")?.textContent || "").trim(),
        })),
    );
    let skipped = "";
    for (const field of fields) {
      if (["first_name", "last_name", "email", "phone", "country", "candidate-location", "school--0", "degree--0", "discipline--0"].includes(field.id)) continue;
      if (field.value || field.selected) continue;
      if (field.id.startsWith("g-recaptcha")) continue;
      const result = await answer(page, field.id, field.label || field.id);
      if (result.skipJob) {
        skipped = result.skipJob;
        break;
      }
      if (!result.ok) {
        skipped = result.reason || "unanswered";
        break;
      }
    }
    if (skipped) {
      results.push({ board, title, url, ok: false, reason: skipped });
      log(`SKIP ${skipped}`);
      fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
      continue;
    }
    await page.locator("button[type=submit]").first().click();
    log("SUBMIT_CLICKED");
    let ok = false;
    let body = "";
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(3000);
      body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      if (/thank you for applying|application has been received|we have received your application|thanks for applying/i.test(body)) {
        ok = true;
        break;
      }
    }
    const shot = path.join(ROOT, "intern-drop", "state", `${board}-${id}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    results.push({ board, id, title, url, resume, ok, body: body.slice(0, 300), shot });
    if (ok) {
      confirmed += 1;
      log(`CONFIRMED ${confirmed} ${title}`);
    } else {
      log(`NOT CONFIRMED ${body.slice(0, 180)}`);
    }
  } catch (err) {
    results.push({ board, title, url, ok: false, reason: String(err).split("\n")[0] });
    log(`ERROR ${String(err).split("\n")[0]}`);
  } finally {
    await browser.close().catch(() => {});
  }
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
}

log(`DONE confirmed=${confirmed}`);
