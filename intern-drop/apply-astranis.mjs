#!/usr/bin/env node
/**
 * Apply to Astranis Summer 2027 embedded internship and save the result.
 * Facts come from cv.md. Does not invent employers or metrics.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(".");
const PDF = path.join(ROOT, "resumes", "tailored", "astranis-embedded-intern.pdf");
const PROOF = path.join(ROOT, "intern-drop", "state", "astranis-submission.json");
const URL = "https://job-boards.greenhouse.io/astranis/jobs/4704569006";

const ACCOMPLISHMENT =
  "On UC Davis EcoCAR I wrote C++ firmware for an automotive microcontroller that decides when a driver-attention monitor should lock the steering. The first version false-triggered on normal head movement. I added state-machine debouncing, wrote C++ unit tests, and rechecked it across five on-track sessions. On-track errors fell by 25%.";

const PROJECT =
  "Aside AI won the Deepgram track at the Berkeley AI Hackathon. I built a Raspberry Pi camera node on QNX that streams frames to a cloud vision model and returns spoken scene descriptions in 1-2 seconds. On-device OpenCV motion detection skips unchanged frames and cut redundant cloud vision calls by 40%. I also lead the IEEE vision-guided rover: closed-loop PID motor control in C/C++ on Arduino using IMU, encoder, and ultrasonic sensors over UART and I2C, plus a YOLO model compiled onto a Hailo accelerator on a Raspberry Pi 5.";

function log(s) {
  console.log(s);
}

async function choose(page, input, query) {
  try {
    await page.keyboard.press("Escape").catch(() => {});
    await input.click({ timeout: 8000 });
    await input.fill("");
    await input.pressSequentially(query, { delay: 25 });
    await page.waitForTimeout(700);
    await input.press("ArrowDown");
    await input.press("Enter");
    const value = await input.inputValue().catch(() => "");
    log(`set ${query} -> ${value}`);
  } catch (err) {
    log(`skip ${query}: ${err.message.split("\n")[0]}`);
  }
}

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
const posts = [];
page.on("response", (res) => {
  if (res.request().method() === "POST") posts.push(`${res.status()} ${res.url().slice(0, 160)}`);
});

let submitted = false;
try {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#first_name").waitFor({ timeout: 30000 });
  await page.locator("#candidate-location").waitFor({ timeout: 30000 });
  await page.locator("#first_name").fill("Sukhman");
  await page.locator("#last_name").fill("Cheema");
  await page.locator("#email").fill("cheemasukh966@gmail.com");
  await page.locator("#phone").fill("9168969399");
  await choose(page, page.locator("#candidate-location"), "Davis", /Davis, California/i);
  await page.locator("#resume").setInputFiles(PDF);
  log("resume attached");

  await choose(page, page.locator("#school--0"), "University of California Davis");
  await choose(page, page.locator("#degree--0"), "Bachelor", /Bachelor/i);
  await choose(page, page.locator("#discipline--0"), "Electrical", /Electrical/i);
  await choose(page, page.locator("#start-month--0"), "September", /September/i);
  await page.locator("#start-year--0").fill("2024");
  await choose(page, page.locator("#end-month--0"), "June", /^June/i);
  await page.locator("#end-year--0").fill("2028");

  await choose(page, page.locator("#question_8622703006"), "U.S. Citizen");
  await page.locator("#question_8622704006").fill(ACCOMPLISHMENT);
  await page.locator("#question_8622705006").fill(PROJECT);
  await choose(page, page.locator("#question_8622706006"), "Summer 2027");
  await page.locator("#question_8622707006").fill("June 2027");
  await page.locator("#question_8622708006").fill("August 2027");
  await choose(page, page.locator("#question_8622709006"), "Yes", /^Yes/i);
  await page.locator("#question_8622710006").fill("Online job board");
  await page.locator("#question_8622711006").fill("https://linkedin.com/in/cheema-s/");
  await choose(page, page.locator("#question_8652471006"), "No", /^No/i);
  await choose(page, page.locator("#gender"), "Decline", /Decline|not wish|prefer not/i);
  await choose(page, page.locator("#hispanic_ethnicity"), "Decline", /Decline|not wish|prefer not/i);
  await choose(page, page.locator("#veteran_status"), "I don't wish to answer");

  await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "astranis-before.png"), fullPage: true });
  const submit = page.locator("button[type=submit]").first();
  await submit.scrollIntoViewIfNeeded();
  await submit.click();
  await page.waitForTimeout(7000);
  await page.screenshot({ path: path.join(ROOT, "intern-drop", "state", "astranis-after.png"), fullPage: true });
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  submitted = /thank you|application has been submitted|we have received/i.test(body);
  const proof = {
    at: new Date().toISOString(),
    company: "Astranis",
    role: "Embedded Software Developer, Network/Payload Intern (Summer 2027)",
    url: URL,
    resume: PDF,
    finalUrl: page.url(),
    submitted,
    posts,
    body: body.slice(0, 1500),
  };
  fs.writeFileSync(PROOF, JSON.stringify(proof, null, 2));
  log(`SUBMITTED ${submitted}`);
  log(`URL ${page.url()}`);
  log(`POSTS\n${posts.join("\n")}`);
  log(`BODY ${body.slice(0, 900)}`);
} catch (err) {
  log(`APPLY_ERROR ${err.stack || err}`);
}

if (submitted) {
  await browser.close();
} else {
  log("LEFT_OPEN");
  await new Promise(() => {});
}
