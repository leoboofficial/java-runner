# JavaLabPro — BCB52003 Object Oriented Programming Lab

An enterprise-grade, anti-cheating Java Online Laboratory, Rubric Evaluation, and Automated Examination Platform built for **BCB52003 — Object Oriented Programming Lab** at **Hindustan Institute of Technology and Science (Deemed to be University)**.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Dual-Portal Routing Structure](#2-dual-portal-routing-structure)
3. [Complete End-to-End Execution Flow](#3-complete-end-to-end-execution-flow)
   - [A. Faculty Management Workflow](#a-faculty-management-workflow)
   - [B. Student Examination Workflow](#b-student-examination-workflow)
   - [C. Code Execution & Evaluation Engine Flow](#c-code-execution--evaluation-engine-flow)
   - [D. Anti-Cheating, Mail ID & Multi-Student Proxy Detection](#d-anti-cheating-mail-id--multi-student-proxy-detection)
   - [E. Practical Lab Record (PDF) Generation Flow](#e-practical-lab-record-pdf-generation-flow)
4. [Environment Variables & Configuration Paths](#4-environment-variables--configuration-paths)
5. [Database Schema Reference (Google Sheets & Excel `.xls`)](#5-database-schema-reference-google-sheets--excel-xls)
6. [Deployment Guide](#6-deployment-guide)
   - [Step 1: Deploy Docker Execution Runner (Render)](#step-1-deploy-docker-execution-runner-render)
   - [Step 2: Set Up Database & Deploy Google Apps Script (`apps_script/Code.gs`)](#step-2-set-up-database--deploy-google-apps-script-apps_scriptcodegs)
   - [Step 3: Deploy Frontend to GitHub Pages](#step-3-deploy-frontend-to-github-pages)
7. [Directory Structure](#7-directory-structure)

---

## 1. Architecture Overview

```
                                  +------------------------------------------+
                                  |         GitHub Pages / Static Host       |
                                  |       React 19 + Vite + Tailwind CSS     |
                                  +------------------------------------------+
                                       /                                    \
                        /#/faculty   /                                        \   /#/student
                                   v                                            v
               +-----------------------------+                    +-----------------------------+
               |  Faculty Management Portal  |                    |  Student Exam IDE Workspace |
               | - Rubric Evaluations (10m)  |                    | - Java 17 Online Editor     |
               | - Exercise Scheduler        |                    | - Public & Hidden Evaluator |
               | - Submissions Hub           |                    | - Copy/Paste & FS Guard     |
               | - Mail ID & Proxy Monitor   |                    | - Mail ID + Device Audit    |
               | - Student Roster & CSV      |                    | - Practical Record (PDF)    |
               +-----------------------------+                    +-----------------------------+
                                       \                                        /
                                        \                                      /
                                         v                                    v
                              +----------------------------------------------------+
                              |            Environment Variable Bridge             |
                              +----------------------------------------------------+
                                      |                                    |
                    VITE_APPS_SCRIPT_URL |                                    | VITE_RENDER_SERVICE_URL
                                         v                                    v
                     +-----------------------+                    +-----------------------+
                     |  Google Apps Script   |                    | Render Docker Runner  |
                     |  (Headless REST API)  |                    | (OpenJDK 17 Temurin)  |
                     |  - Faculty            |                    | - Non-root Sandbox    |
                     |  - Students           |                    | - Sequential p-queue  |
                     |  - Exercises          |                    | - 5-Second Timeout    |
                     |  - LoginAudit         |                    | - x-api-key Auth      |
                     |  - Submissions        |                    +-----------------------+
                     |  - Violations         |
                     |  - Evaluations        |
                     +-----------------------+
```

---

## 2. Dual-Portal Routing Structure

The application enforces route isolation through client-side hash routing (`window.location.hash`):

| Portal | Direct Access URL | Target Audience | Permissions / Capabilities |
|---|---|---|---|
| **Student Portal** | `https://<host>/#/student` | Enrolled Students | Login with Official Email + RegNo (silent Device ID + optional automatic Google account audit), Java 17 Editor, Public Run, Final Submit, Paste & Fullscreen Proctoring Guard, Lab Record PDF Generator & Submission. |
| **Faculty Portal** | `https://<host>/#/faculty` | Course Instructors | Login with Faculty Email & Name, 10-Mark Rubric Evaluations, Schedule Exercises, Submissions Hub, Multi-Student Proxy & Anti-Cheating Monitor, Marksheet Exports (CSV/JSON). |

---

## 3. Complete End-to-End Execution Flow

### A. Faculty Management Workflow
1. **Access Faculty Portal**:
   - Faculty navigates to `/#/faculty`.
   - Authenticates via institutional email (`@hindustanuniv.ac.in`) matching the `Faculty` sheet tab.
2. **Exercise Scheduling**:
   - Click **Schedule New Exercise** and configure Title, Description, Category, Difficulty (`Easy`, `Medium`, `Hard`), Open/Close Time, Public Test Case, Private Hidden Test Case, and Starter Code.
   - Upon saving, writes/updates the row in the Google Sheet `Exercises` tab (`POST/GET action=saveExercise`).
3. **Lab Record Rubric Evaluations (10 Marks)**:
   - Evaluates students on **Concept Implemented (5)**, **Naming Conventions (1)**, **Documentation (1)**, and **Output (3)**.
   - Displays **Official University Email**, **Recorded Personal Mail ID**, **Browser/Device ID**, and any **Multi-Student Proxy Alert** if the same Mail ID or Device ID was used for another Registration Number.
4. **Submissions & Proctoring Auditing**:
   - **Submissions Hub**: Inspect submitted Java code, public/hidden test outputs, and identity audit badges (`Mail ID` & `Device ID`).
   - **Anti-Cheating, Mail ID & Proxy Monitor**: View the **Student Mail ID & Device Login Audit** table plus paste/fullscreen violations and export both CSV reports.

---

### B. Student Examination Workflow
1. **Verify Credentials & Silent Device / Google Account Audit**:
   - Student navigates to `/#/student` and opens the profile verification dialog.
   - Enters only:
     1. **Official University Email** (e.g., `2411001@student.hindustanuniv.ac.in`)
     2. **Registration Number** (e.g., `2411001`)
   - Behind the scenes (with zero student-facing telemetry UI), the browser attaches a persistent **Device ID** (`DEV-XXXXXX-XXXX`), and if `VITE_GOOGLE_CLIENT_ID` is configured, prompts Google's account selector to automatically capture the verified Gmail signed in on the student's device without letting students manually type a fake email.
   - Google Apps Script verifies the Official Email & RegNo against the `Students` sheet and logs the event into the `LoginAudit` sheet, flagging if the same Device ID or verified Gmail was used for another Registration Number.
2. **Exercise Selection & Coding in Java 17**:
   - Active exercises whose window covers the current time load into the editor with their starter code.
   - Students can test with **Custom Input: ON** or **Run Public Tests**, then click **Submit Code**.
3. **Grading Matrix**:
   - Both Passed: **100 / 100** (`ALL TEST CASES PASSED`)
   - One Passed: **50 / 100** (`PARTIAL PASS`)
   - None Passed / Compile Error: **0 / 100** (`FAILED` / `COMPILATION ERROR`)
   - Submissions and any proctoring violations sync silently to Google Sheets (`Submissions` & `Violations` tabs) along with any captured `Recorded Mail ID`, `Device ID`, and `Multi-Student Flag` for faculty review.

---

### C. Code Execution & Evaluation Engine Flow

The platform utilizes a **Dual-Engine Execution Pipeline**:

1. **Remote Execution Container (Render / Docker)**:
   - Client sends `POST` request to `${VITE_RENDER_SERVICE_URL}` with header `x-api-key: ${VITE_API_SECRET}`.
   - Requests execute sequentially (`p-queue` with `concurrency: 1`) inside a non-root OpenJDK 17 sandbox with a 5-second timeout (`timeout 5s java Main < input.txt`).
2. **Built-in Client-Side Engine**:
   - Automatically acts as fallback if the Render container is sleeping or unreachable for standard Scanner/console Java exercises.

---

### D. Anti-Cheating, Mail ID & Multi-Student Proxy Detection

1. **Clipboard & Fullscreen Proctoring**:
   - **Clipboard Paste Interception** (`editor onPaste` -> `PASTE`, Severity: `High`): Copy/paste is blocked inside the code editor and recorded to the `Violations` sheet.
   - **Fullscreen Enforcer** (`fullscreenchange` -> `FULLSCREEN_EXIT`, Severity: `Medium`): Exiting mandatory exam fullscreen mode logs a violation.
2. **Silent Device & Verified Google Account Proxy Monitoring**:
   - Because classmates' official university emails and registration numbers often follow a predictable sequence, students only enter their Official Email and RegNo in the UI while the client silently attaches a persistent **Browser/Device ID** (`DEV-...`).
   - *(Optional Automatic Device Gmail Capture)*: Because browsers block websites from silently reading a Chrome profile's personal email without consent, setting **`VITE_GOOGLE_CLIENT_ID`** enables automatic Google OAuth account-picker verification (`userinfo.email`) so the student's actual Google account on that device is recorded without a manual text input box.
   - Every login (`LoginAudit`), code submission (`Submissions`), violation (`Violations`), and lab record submission (`Evaluations`) cross-checks whether that `Device ID` or captured Google `Mail ID` appears under **more than one Registration Number**, immediately flagging **`FLAGGED: MULTI-STUDENT PROXY`** on the Faculty Dashboard.

---

### E. Practical Lab Record (PDF) Generation Flow

Students can click **Generate Lab Record (PDF)** to compile Title Page, Bonafide Certificate, 10-Mark Rubrics INDEX Table, and individual experiment pages with editable Procedures, Source Code, and Execution Outputs, and submit the record for Faculty Rubric Evaluation (`Evaluations` sheet).

---

## 4. Environment Variables & Configuration Paths

Configure endpoints via environment variables at build time (no secrets hardcoded in client UI):

| Variable Name | Description | Example Value |
|---|---|---|
| `VITE_APPS_SCRIPT_URL` | Google Apps Script Web App URL ending in `/exec` | `https://script.google.com/macros/s/AKfycbx.../exec` |
| `VITE_RENDER_SERVICE_URL` | Docker OpenJDK 17 runner URL ending in `/execute` | `https://java-runner-xxxx.onrender.com/execute` |
| `VITE_API_SECRET` | Secret key matching `API_SECRET` on Render (`x-api-key`) | `MY_SECURE_LAB_KEY_123` |
| `VITE_GOOGLE_CLIENT_ID` | *(Optional)* Google OAuth 2.0 Web Client ID to automatically read verified Gmail from the student's device | `1234567890-abc.apps.googleusercontent.com` |

- **Local Development**: `/.env` (copy from `/.env.example`)
- **GitHub Pages Build**: **Repository Settings > Secrets and variables > Actions > Variables**

---

## 5. Database Schema Reference (Google Sheets & Excel `.xls`)

You can import the ready-made 7-tab Excel workbook **`/public/JavaLabPro_Database_Template.xls`** directly into Google Sheets (**File > Import > Upload**), or run **`setupAllSheets()`** inside Google Apps Script to auto-create all **7 tabs** with Plain Text (`@`) formatting:

### Tab 1: `Faculty`
| Col | Header | Description |
|---|---|---|
| A | `Email` | Faculty institutional email (`@hindustanuniv.ac.in`) |
| B | `Name` | Faculty Full Name |
| C | `Department` | Department Name |

### Tab 2: `Students`
| Col | Header | Description |
|---|---|---|
| A | `Email` | Official student email (`@student.hindustanuniv.ac.in`) |
| B | `RegNo` | Student Registration Number (e.g., `2411001`) |
| C | `Name` | Student Full Name |
| D | `Department` | Department Name |

### Tab 3: `Exercises`
| Col | Header | Description |
|---|---|---|
| A | `Exercise ID` | Unique ID (e.g., `EX_1`) |
| B | `Title` | Problem Title |
| C | `Description` | Problem statement & constraints |
| D | `Open Time` | ISO start datetime (`2026-01-01T00:00`) |
| E | `Close Time` | ISO expiry datetime (`2027-12-31T23:59`) |
| F | `Public Input` | Public test `System.in` |
| G | `Public Output` | Expected public stdout |
| H | `Private Input` | Hidden grading `System.in` |
| I | `Private Output` | Expected hidden stdout |
| J | `Starter Code` | Initial Java template loaded in IDE |
| K | `Category` | Topic category |
| L | `Difficulty` | `Easy` \| `Medium` \| `Hard` |

### Tab 4: `LoginAudit` *(New — Mail ID & Multi-Student Proxy Tracking)*
| Col | Header | Description |
|---|---|---|
| A | `Timestamp` | ISO timestamp of login |
| B | `Official Email` | University email used to authenticate |
| C | `Reg No` | Student Registration Number |
| D | `Student Name` | Verified student name |
| E | `Recorded Mail ID` | Verified Google account email captured via `VITE_GOOGLE_CLIENT_ID` (blank if not configured) |
| F | `Device ID` | Persistent browser/device identifier (`DEV-...`) |
| G | `Other RegNos Used` | Comma-separated RegNos that shared this Mail ID or Device ID |
| H | `Multi-Student Status` | `CLEAR` or `FLAGGED: MULTI-STUDENT PROXY` |

### Tab 5: `Submissions`
| Col | Header | Description |
|---|---|---|
| A | `Timestamp` | Submission timestamp |
| B | `Official Email` | Official student university email |
| C | `Recorded Mail ID` | Student's Personal Mail ID (Gmail) |
| D | `Reg No` | Student Registration Number |
| E | `Student Name` | Student Full Name |
| F | `Exercise ID` | Exercise identifier |
| G | `Exercise Title` | Problem title |
| H | `Status` | `ALL TEST CASES PASSED` \| `PARTIAL PASS` \| `FAILED` \| `COMPILATION ERROR` |
| I | `Score` | Numeric score (`0`, `50`, `100`) |
| J | `Device ID` | Browser/Device identifier |
| K | `Multi-Student Flag` | `CLEAR` or `FLAGGED: Shared Mail ID / Device...` |
| L | `Source Code` | Full submitted Java source file |

### Tab 6: `Violations`
| Col | Header | Description |
|---|---|---|
| A | `Timestamp` | Incident timestamp |
| B | `Official Email` | Official student university email |
| C | `Recorded Mail ID` | Student's Personal Mail ID (Gmail) |
| D | `Reg No` | Registration Number |
| E | `Student Name` | Student Full Name |
| F | `Exercise ID` | Exercise identifier |
| G | `Violation Type` | `PASTE` \| `FULLSCREEN_EXIT` |
| H | `Details` | Intercepted action details |
| I | `Severity` | `high` \| `medium` \| `low` |
| J | `Device ID` | Browser/Device identifier |

### Tab 7: `Evaluations`
| Col | Header | Description |
|---|---|---|
| A | `Timestamp` | Last update timestamp |
| B | `Official Email` | Official student university email |
| C | `Recorded Mail ID` | Student's Personal Mail ID (Gmail) |
| D | `Reg No` | Registration Number |
| E | `Student Name` | Student Full Name |
| F | `Status` | `PENDING_EVALUATION` \| `EVALUATED_APPROVED` |
| G | `Concept (5)` | Concept rubric marks (max 5) |
| H | `Naming (1)` | Naming conventions rubric marks (max 1) |
| I | `Documentation (1)` | Documentation rubric marks (max 1) |
| J | `Output (3)` | Output accuracy rubric marks (max 3) |
| K | `Total Marks (10)` | Total rubric marks (max 10) |
| L | `Violations Count` | Total logged violations |
| M | `Device ID` | Browser/Device identifier |
| N | `Multi-Student Flag` | `CLEAR` or `FLAGGED: Shared Mail ID / Device...` |
| O | `Faculty Remarks` | Evaluator remarks |
| P | `Evaluated By` | Faculty evaluator name |

> **Excel & CSV Templates in `/public/`**:
> - `/public/JavaLabPro_Database_Template.xls` (Complete 7-tab Excel workbook with Text `@` formatting)
> - `/public/Faculty_Template.csv`
> - `/public/Students_Template.csv`
> - `/public/Exercises_Template.csv`
> - `/public/LoginAudit_Template.csv`
> - `/public/Submissions_Template.csv`
> - `/public/Violations_Template.csv`
> - `/public/Evaluations_Template.csv`

---

## 6. Deployment Guide

### Step 1: Deploy Docker Execution Runner (Render)
1. Ensure `java-runner/` contains `Dockerfile` (`FROM eclipse-temurin:17-jdk-jammy`), `server.js`, and `package.json`.
2. In [Render Dashboard](https://dashboard.render.com/), create **New + > Web Service**:
   - **Runtime**: `Docker`
   - **Root Directory**: `java-runner`
   - **Instance Type**: `Free`
3. Set Environment Variables on Render:
   - `API_SECRET` = `MY_SECURE_LAB_KEY_123` (or your own secret matching `VITE_API_SECRET`)
   - `PORT` = `3000`
4. Deploy and copy your live runner URL ending in `/execute`:
   `https://java-runner-xxxx.onrender.com/execute`

---

### Step 2: Set Up Database & Deploy Google Apps Script (`apps_script/Code.gs`)
1. Open Google Sheets and either:
   - Create a new spreadsheet named `Java_Lab_Database` and import `public/JavaLabPro_Database_Template.xls` (**File > Import > Upload**), **OR**
   - Open your existing `Java_Lab_Database` Google Sheet.
2. Go to **Extensions > Apps Script**.
3. Replace everything in `Code.gs` with the full contents of **`apps_script/Code.gs`** and click **Save**.
4. In the Apps Script editor toolbar, select **`setupAllSheets`** from the function dropdown and click **Run** once (authorizing permissions when prompted) so all **7 tabs** (`Faculty`, `Students`, `Exercises`, `LoginAudit`, `Submissions`, `Violations`, `Evaluations`) exist with the exact updated headers.
   - *(Note: If upgrading an existing sheet that already has older `Submissions`, `Violations`, or `Evaluations` headers, rename or delete those empty/test tabs before running `setupAllSheets()`, or add the new columns so column positions match `Code.gs`.)*
5. Deploy as a Web App:
   - First-time deploy: **Deploy > New deployment** > Type: **Web app** > Execute as: **Me** > Who has access: **Anyone** > **Deploy**.
   - Updating an existing Web App URL: **Deploy > Manage deployments > Edit (pencil icon) > Version: `New version` > Deploy** *(Critical: if you don't select **New version**, Google keeps serving the old script code!)*.
6. Copy the Web App URL ending in `/exec`:
   `https://script.google.com/macros/s/AKfycbx.../exec`

---

### Step 3: Deploy Frontend to GitHub Pages
1. Configure `VITE_APPS_SCRIPT_URL`, `VITE_RENDER_SERVICE_URL`, `VITE_API_SECRET`, and optionally `VITE_GOOGLE_CLIENT_ID` in **Settings > Secrets and variables > Actions > Variables** (and in `.env` for local runs).
   - *(If setting `VITE_GOOGLE_CLIENT_ID`, add your GitHub Pages origin `https://<username>.github.io` under Authorized JavaScript origins in Google Cloud Console > Credentials.)*
2. Under **Settings > Pages > Build and deployment > Source**:
   - Select **GitHub Actions** *(Recommended — uses `.github/workflows/deploy.yml` with `upload-pages-artifact@v4` + `deploy-pages@v4`)*.
   - **Important**: Do **not** set Source to `Deploy from a branch -> / (root)`, because serving the unbuilt root `index.html` causes `main.tsx: 404` in the browser. (If you prefer branch deployment, choose `main` -> `/docs` and add an empty `.nojekyll` file.)
3. Push to `main` (or trigger **Actions > Deploy to GitHub Pages > Run workflow**):
   - **Student Portal**: `https://<username>.github.io/<repo>/#/student`
   - **Faculty Portal**: `https://<username>.github.io/<repo>/#/faculty`

---

## 7. Directory Structure

```
├── .github/
│   └── workflows/
│       └── deploy.yml                  # Automated GitHub Pages CI/CD workflow
├── apps_script/
│   └── Code.gs                         # Google Apps Script REST API (7 tabs + Proxy Audit)
├── java-runner/
│   ├── Dockerfile                      # Eclipse Temurin OpenJDK 17 execution container
│   ├── package.json                    # Runner dependencies (express, p-queue)
│   └── server.js                       # Sandboxed execution API server
├── public/
│   ├── 404.html                        # SPA redirect router for GitHub Pages
│   ├── JavaLabPro_Database_Template.xls # Complete 7-sheet Excel template
│   ├── Exercises_Template.csv
│   ├── Faculty_Template.csv
│   ├── Students_Template.csv
│   ├── LoginAudit_Template.csv
│   ├── Submissions_Template.csv
│   ├── Violations_Template.csv
│   ├── Evaluations_Template.csv
│   └── hits_logo.svg
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx               # Student & Faculty verification (with silent audit hooks)
│   │   ├── Header.tsx                  # Brand bar with portal indicator
│   │   ├── UserManualModal.tsx         # SOP documentation
│   │   ├── FacultyPortal/
│   │   │   ├── AntiCheatingCenter.tsx  # LoginAudit Proxy Monitor + Proctoring Violations
│   │   │   ├── ExerciseManager.tsx
│   │   │   ├── ExportResultsModal.tsx
│   │   │   ├── FacultyDashboard.tsx
│   │   │   ├── LabRecordEvaluations.tsx # 10-Mark Rubric + Mail ID / Device Proxy Audit
│   │   │   ├── RubricEvaluationModal.tsx
│   │   │   ├── StudentRoster.tsx
│   │   │   └── SubmissionsHub.tsx
│   │   └── StudentPortal/
│   │       ├── LabRecordModal.tsx      # HITS Official Practical Lab Record PDF Generator
│   │       ├── StudentDashboard.tsx
│   │       └── StudentIDE.tsx          # Java 17 IDE with paste & fullscreen guards
│   ├── data/
│   │   └── mockData.ts                 # Clean empty initial state
│   ├── services/
│   │   ├── javaRunner.ts               # Dual-engine Java interpreter & REST runner
│   │   └── sheetService.ts             # Google Apps Script REST client
│   ├── types/
│   │   └── index.ts                    # TypeScript interfaces and domain models
│   ├── utils/
│   │   ├── deviceAudit.ts              # Silent Browser/Device ID & session proxy audit helper
│   │   ├── googleAuth.ts               # Optional Google Identity Services device Gmail capture
│   │   └── exportUtils.ts              # CSV and JSON assessment export engines
│   ├── App.tsx                         # Main layout and route controller
│   ├── index.css                       # Tailwind CSS and A4 Print media styles
│   └── main.tsx                        # Entry point
├── .env.example                        # Sample environment variables reference
├── index.html                          # HTML5 entry with metadata
├── package.json                        # Project scripts and dependencies
├── tsconfig.json                       # TypeScript configuration
└── vite.config.ts                      # Vite build configuration
```
