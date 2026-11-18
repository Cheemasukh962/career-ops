# Sukhman Cheema

Davis, CA 95616 · U.S. Citizen · (916) 896-9399
cheemasukh966@gmail.com · linkedin.com/in/cheema-s · github.com/Cheemasukh962

Source resumes, saved verbatim:

- Product: `resumes/product.tex`
- Software: `resumes/software.tex`
- Automation / embedded-robotics (the paste labeled "More automation?"): `resumes/automation.tex`
- Hardware + software (AeroVironment-targeted): `resumes/hardware.tex`

When tailoring, pick bullets from this file. Do not invent employers, titles, dates, tools, or metrics. If a role is marked CONFLICT, use one source's title, dates, and numbers for that application. Do not splice the competing versions into a single bullet.

## Education

University of California, Davis — B.S. Electrical and Computer Engineering — Davis, CA — Expected June 2028 — GPA 3.5

Seeking internships and co-ops only. Not seeking full-time roles. Graduation is June 2028.

Coursework named on at least one resume:

- Product: Database Systems, Data Structures & Algorithms, Software Engineering, Human-Computer Interaction (HCI), Computer Vision, Operating Systems, Statistics, Accounting
- Software: Data Structures & Algorithms, Operating Systems, Software Engineering, Database Systems, Embedded Systems, Computer Vision, Circuit Analysis II
- Automation: Embedded Systems, Operating Systems, Digital Systems, Circuit Analysis II, Data Structures & Algorithms, Software Engineering, Computer Vision
- Hardware: Embedded Systems, Operating Systems, Computer Architecture, Digital Systems II, Data Structures & Algorithms, Circuit Analysis II

## Conflicts

Same underlying work, different title, dates, or numbers across resumes. Do not merge.

1. **UC Davis BFTV, Nov. 2025 – Present.** Product, software, and automation use the title "BFTV IT Student Assistant." Hardware uses "Hardware Systems & IT Intern." The asset-tracker and ETL bullets are on the first three resumes. The 50+ repairs, 30% downtime, and 40+ RMA bullets are only on the hardware resume.
2. **#INCLUDE, Dec. 2025 – Present, Davis, CA.** Product title: "Product & Software Engineering Lead" at "#INCLUDE (Campus Web Organization)." Software title: "Software Engineer Lead" at "#INCLUDE (Campus Web Club)." Product bullets are PostHog and PRDs/Jira. Software bullets are the React/FastAPI/MySQL build, teaching, and pytest. One role, two framings.
3. **EcoCAR, Davis, CA.** Software and automation: Jan. 2026 – June 2026, with C++ unit tests and a 25% on-track error cut. Hardware: Jan. 2026 – Present, with eye-gaze vectors and steering-lock wording, and no 25% figure. Do not use both end dates.
4. **Aside AI.** Product, software, and automation list it as a hackathon project (1st place, Deepgram track, Berkeley AI Hackathon, GitHub `Da0t/AsideAI`, 1–2 seconds, about 40% fewer API tokens). Hardware lists a job: "Embedded Systems Engineer & Co-Founder," Aside AI (Hardware Wearable), May 2026 – Present, Raspberry Pi 5, latency under 1.5 seconds, 40% fewer inference cycles. Do not combine the hackathon result and the co-founder job into one story, and do not mix 1–2s with 1.5s or API tokens with inference cycles.
5. **Two different six-person robotics leads.** American River Engineering Club (Sacramento, Dec. 2024 – May 2025, 10 robots, treasurer) is only on the hardware resume. IEEE at UC Davis vision-guided rover (Aug. 2026 – Present, YOLO, Hailo) is only on the automation resume. Keep them as separate roles.

## Experience

### UC Davis BFTV Cluster — Davis, CA — Nov. 2025 – Present

Titles: "BFTV IT Student Assistant" (product, software, automation). "Hardware Systems & IT Intern" (hardware). See conflict 1.

Bullets from product, software, and automation:

- Built an equipment lifecycle tracking system for 750+ capital assets ($2.5M), replacing manual spreadsheet audits and cutting audit time by 85% (3 months to 2 weeks); built on a normalized SQL schema, PHP API, and Bootstrap UI. (product, software)
- Built an equipment lifecycle tracking system for 750+ capital assets ($2.5M), designing a normalized SQL schema with foreign-key constraints, serving JSON through a PHP API, and building the Bootstrap front end. (automation; same system, no 85% figure)
- Engineered a Python and SQL ETL pipeline to extract, validate, and ingest 35 legacy data tables into a centralized relational database, with error handling that eliminated manual data entry. (product, software, automation)
- Deployed and maintained Linux and Windows lab workstations across campus facilities, configuring BIOS/firmware, network cabling, and hardware components (RAM/SSD). (software, automation)

Bullets only on the hardware resume:

- Executed component-level hardware diagnostics, teardowns, and board-level repairs across 50+ enterprise Linux, Windows, and macOS systems, isolating physical bus and memory faults.
- Benchmarked NVMe/PCIe SSD and RAM throughput against timing specifications using low-level I/O profiling tools, isolating degradation trends to cut system downtime by 30%.
- Developed Bash and Python automation scripts executed over SSH to poll hardware telemetry and standardize root-cause failure analysis across 40+ hardware RMA evaluations.

### Base44 — Product Growth & Campus Lead — Davis, CA — June 2026 – Present

Source: product only.

- Drove AI platform adoption across 150+ students and 5 student organizations by segmenting engineering, data science, and business user groups and running 3 hands-on product showcases.
- Reduced onboarding friction for new student builders by gathering live user feedback during campus workshops and sending prioritized product recommendations to the core engineering team.

### Develop for Good (Client: Family Hui Non-Profit) — Technology Product Consultant — Remote — Apr. 2026 – Aug. 2026

Source: product only.

- Cut 6 weeks of engineering build time and eliminated $400/year in recurring costs by leading client discovery with non-profit executives and writing a formal ROI business case comparing CMS platforms against custom code.
- Lowered staff support requests by building reusable web components and training non-technical administrators.

### #INCLUDE — Davis, CA — Dec. 2025 – Present

See conflict 2. Use one title per resume.

Product bullets:

- Fixed a 25% signup conversion drop-off across 200+ monthly active users by analyzing behavioral funnels in PostHog and simplifying the event registration flow.
- Shipped a production event platform with CI testing by writing PRDs and running Jira sprints for 10+ engineers and designers.

Software bullets:

- Built the event registration system for a React/Next.js platform serving 200+ active users, wiring the signup form to a FastAPI service that validated and persisted attendees in MySQL and triggered a confirmation email through Resend.
- Led agile sprint development and roadmap planning, teaching React and HTML/CSS/JavaScript fundamentals to a 10-student cohort before authoring PRDs and managing backlog execution to ship a production application for a campus club.
- Wrote 10+ pytest unit and integration tests for the registration service, covering email validation, duplicate-signup handling, and MySQL persistence, that run on every pull request via GitHub Actions.

### IEEE at UC Davis — IEEE Project Lead, Vision-Guided Rover — Davis, CA — August 2026 – Present

Source: automation only. Not the American River club.

- Led a 6-person engineering team building a vision-guided rover with a 3D-printed arm, programming closed-loop PID motor control in C/C++ on Arduino by fusing IMU, encoder, and ultrasonic sensors over UART and I2C.
- Achieved standalone on-rover object detection with zero network dependency by fine-tuning a custom YOLO model and compiling it for a 13-TOPS Hailo AI accelerator on a Raspberry Pi 5.

### UC Davis EcoCAR (DOE EcoCAR EV Challenge) — Embedded Software Engineer, Navigation Team — Davis, CA

See conflict 3.

Software and automation (Jan. 2026 – June 2026):

- Engineered driver-attention monitoring firmware in C++ for an automotive-grade MCU, implementing state-machine debouncing and thresholding so steering-lock intervention stopped false-triggering on routine head movement.
- Wrote C++ unit tests for the threshold logic and revalidated across 5 on-track sessions, cutting on-track errors by 25%.

Hardware resume only (dated Jan. 2026 – Present on that file):

- Engineered driver-attention monitoring firmware in C++ deployed to an automotive-grade MCU, processing continuous eye-gaze tracking vectors to evaluate driver alertness.
- Implemented state-machine debouncing and thresholding logic to govern steering-lock actuation, eliminating false-positive triggers while preserving fail-safe vehicle intervention.

### American River Engineering Club — Robotics Software Lead & Treasurer — Sacramento, CA — Dec. 2024 – May 2025

Source: hardware only.

- Led a 6-engineer team writing embedded C/C++ firmware for 10 semi-autonomous mobile robots, programming closed-loop PID motor velocity control and PWM timers.
- Interfaced ultrasonic distance sensors, IMUs, and optical encoders using I2C/UART hardware interrupts, resolving signal noise.

### Aside AI — see conflict 4 before using any bullet

Hackathon project framing (product, software, automation). GitHub: https://github.com/Da0t/AsideAI. 1st place, Deepgram track, UC Berkeley AI Hackathon. Stack named on those resumes: Python, OpenCV, Redis, QNX, Raspberry Pi.

- Delivered spoken scene descriptions in 1–2 seconds (1st place, Deepgram track) by building an edge-to-cloud wearable POC connecting a Raspberry Pi/QNX camera node to Claude Vision and Deepgram. (product)
- Cut redundant cloud LLM API token usage by 40% by adding on-device OpenCV motion detection and an in-memory Redis cache that skips unchanged video frames. (product)
- Built an end-to-end edge-to-cloud narration pipeline connecting a Raspberry Pi/QNX camera node to Claude Vision, streaming low-latency multimodal scene descriptions to a mobile client in 1–2s. (software)
- Engineered an in-memory Redis contextual caching layer integrated with OpenCV motion detection, cutting redundant API token consumption by 40% while preserving conversation history. (software)
- Built the wearable's Raspberry Pi camera node running QNX (RTOS), capturing frames and streaming them to a cloud vision model for spoken scene descriptions in 1–2s end to end. (automation)
- Added on-device OpenCV motion detection that skips unchanged frames, cutting redundant cloud vision calls (API tokens) by 40%. (automation)

Job framing, hardware resume only. Title: Embedded Systems Engineer & Co-Founder. Org: Aside AI (Hardware Wearable). Davis, CA. May 2026 – Present.

- Architected a real-time embedded capture runtime on a Raspberry Pi 5 running QNX RTOS, configuring POSIX thread scheduling and camera sensor ISRs to keep system latency under 1.5 seconds.
- Mitigated processor thermal throttling and power draw by developing an OpenCV-based motion gating filter, cutting redundant inference compute cycles by 40%.

## Projects

### dAdvisor — AI academic planning platform

GitHub: https://github.com/Pocket-sys32/dAdvisor. 1st place, Systems Integration & AI, ProdCon (UC Davis). Stack named across resumes: TypeScript, React, ChromaDB, Figma, Python, Vercel.

- Won 1st place in Systems Integration & AI for a platform targeting 30,000+ students by running 25+ student discovery interviews and pitching a business case, competitor matrix, and Figma prototype to industry judges. (product)
- Enabled fast degree-requirement search across 25,000+ academic transcripts by building a RAG chatbot using ChromaDB, Python, and React/TypeScript. (product)
- Architected a RAG chatbot indexing 25,000+ academic transcripts and degree requirements in ChromaDB for an advising platform targeting 30k+ UC Davis students. (software, automation)
- Led TypeScript/React frontend development and integration with the containerized Python backend, validating features through 25+ student interviews. (software, automation)

### VitaPal — digital health product strategy

Source: product only. GitHub link on that resume points at https://github.com/Cheemasukh962 (profile, not a project repo). Stack: TypeScript, Figma.

- Identified product gaps for a low-effort micronutrient tracker by benchmarking 3 competitors (MyFitnessPal, Cronometer, Noom) on onboarding steps, logging speed, and user retention.
- Redesigned the daily check-in flow to cut logging friction through 30 user interviews and iterative Figma prototypes.

### Yoga Pose Corrector

Source: software only. Machine Learning Club. GitHub: https://github.com/Cheemasukh962/yoga_pose_corrector. Stack: Python, MediaPipe, TypeScript, TensorFlow, scikit-learn, Pandas. One-line description from that resume: real-time computer-vision app that helps people learn and check their yoga poses.

- Trained a deep dense neural network (MLP) in TensorFlow to classify 40 distinct yoga poses, reaching 82.37% peak accuracy on 132 skeletal landmark features.
- Built a real-time pose-classification pipeline on Google MediaPipe, extracting 33 3D skeletal landmarks per frame to drive live form correction.

### Hardware and circuit labs

Automation resume calls this "Hardware & Circuit Design Labs" (oscilloscopes, multimeters, function generators, LTspice), UC Davis:

- Programmed and debugged digital logic designs on FPGA development boards, utilizing Cadence EDA tools for schematic capture, layout simulation, and timing verification.
- Built and debugged analog/passive filter circuits on breadboards, utilizing oscilloscopes, multimeters, and function generators to isolate wiring faults and signal noise.
- Compared bench measurements against LTspice simulations to check component tolerances and frequency response.

Hardware resume calls a related lab "Circuit Characterization & Hardware Debug Labs (EEC 111)":

- Probed active and passive circuits with digital storage oscilloscopes to locate and resolve signal integrity degradation, high-frequency noise, and wiring faults on physical breadboards.
- Reconciled probe measurements against LTspice theoretical simulations to validate component tolerances, frequency response, and transient stability under load.

EEC 111 is named only on the hardware resume. FPGA/Cadence is named only on the automation resume. Treat them as the lab bullets each resume actually states.

### Fan Safe — closed-loop environmental controller

Source: hardware only. Personal project. Stack: C++, ESP32, FreeRTOS, I2C, Wokwi.

- Programmed bare-metal C++ firmware on an ESP32 microcontroller, utilizing hardware timers and FreeRTOS tasks to drive dynamic PWM fan actuation from live sensor feedback.
- Interfaced digital thermal sensors over an I2C bus interface, implementing bus recovery sequences and validating control loop state logic in Wokwi simulation prior to physical bring-up.

## Skills named on the resumes

Use a skill only if it appears on at least one source resume. Prefer the resume whose bullets also show that skill.

- Product resume: PRDs, epics and user stories, user research, usability testing, KPI and HEART metrics, PostHog, Google Analytics, SWOT, roadmap prioritization, Agile/Scrum, Figma, RAG, ChromaDB, OpenCV, MediaPipe, Claude Vision, Deepgram, Base44, PostgreSQL, MySQL, ETL, Power BI, Excel ROI modeling, Python, TypeScript/JavaScript, C++, FastAPI, React, Next.js, REST APIs, Redis, AWS EC2/S3, Docker, GitHub Actions, Jira, Confluence, ServiceNow.
- Software resume: Python, C++, C, SQL, JavaScript/TypeScript, Java, Bash, HTML/CSS, FastAPI, React, Next.js, Node.js, PyTorch, TensorFlow, scikit-learn, MediaPipe, OpenCV, Pandas, MySQL, PostgreSQL, SQLite, Redis, ChromaDB, QNX, FreeRTOS, ESP32, Raspberry Pi, I2C, UART, SPI, PWM, oscilloscopes, LTspice, Git/GitHub, GitHub Actions, pytest, Docker, AWS EC2/S3, Linux, Jira, ServiceNow.
- Automation resume: C, C++, Python, SQL, JavaScript/TypeScript, Bash, QNX, FreeRTOS, Arduino, ESP32, Raspberry Pi, I2C, UART, SPI, PWM, interrupts, PID motor control, state machines, unit testing, pytest, Git/GitHub, GitHub Actions, Docker, Jira, oscilloscopes, multimeters, function generators, LTspice, OpenCV, YOLO, TensorFlow, PyTorch.
- Hardware resume: C, embedded C++, Python, Bash/Shell, MATLAB, Assembly, QNX, FreeRTOS, embedded Linux, ISRs, POSIX threads, memory management, hardware timers/PWM, ARM Cortex, Raspberry Pi 5, ESP32, automotive microcontrollers, UART, CAN bus, SPI, I2C, GPIO, ADC, oscilloscopes, logic analyzers, multimeters, function generators, signal integrity, hardware bring-up, Git/GitHub, CMake, GDB, Linux CLI, Wokwi, LTspice, HIL testing, unit testing.
