# JavaLabPro — BCB52003 Object Oriented Programming Lab

An enterprise-grade, anti-cheating Java Online Laboratory, Rubric Evaluation, and Automated Examination Platform built for **BCB52003 — Object Oriented Programming Lab** at **Hindustan Institute of Technology and Science (Deemed to be University)**.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Three-Portal Routing Structure](#2-three-portal-routing-structure)
3. [Complete End-to-End Execution Flow](#3-complete-end-to-end-execution-flow)
   - [A. Course Coordinator Workflow (`/#/coordinator`)](#a-course-coordinator-workflow-coordinator)
   - [B. Faculty Management Workflow (`/#/faculty`)](#b-faculty-management-workflow-faculty)
   - [C. Student Examination Workflow (`/#/student`)](#c-student-examination-workflow-student)
   - [D. Code Execution & Evaluation Engine Flow](#d-code-execution--evaluation-engine-flow)
   - [E. Anti-Cheating, Mail ID & Multi-Student Proxy Detection](#e-anti-cheating-mail-id--multi-student-proxy-detection)
   - [F. Practical Lab Record (PDF) Generation Flow](#f-practical-lab-record-pdf-generation-flow)
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
                                     /                  |                  \
                     /#/coordinator /      /#/faculty   |                   \  /#/student
                                   v                    v                    v
      +----------------------------+   +---------------------------+   +---------------------------+
      | Course Coordinator Portal  |   | Faculty Management Portal |   | Student Exam IDE Workspace|
      | - Default Login + Pwd Chg  |   | - Rubric Evaluations (10m)|   | - Java 17 Online Editor   |
      | - Forgot Pwd (Email OTP)   |   | - Exercise Scheduler      |   | - Public/Hidden Evaluator |
      | - Add / Edit Course        |   | - Submissions Hub         |   | - Copy/Paste & FS Guard   |
      |   Handlers (Faculty Tab)   |   | - Mail ID & Proxy Monitor |   | - Mail ID + Device Audit  |
      +----------------------------+   | - Student Roster & CSV    |   | - Practical Record (PDF)  |
                                       +---------------------------+   +---------------------------+
                                     \                  |                  /
                                      \                 v                 /
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
                     |  - CoordinatorAuth    |
                     |  - ExamConfig         |
                     |  - RubricTemplates    |
                     +-----------------------+
```

---

## 2. Three-Portal Routing Structure

The application enforces strict route isolation through client-side hash routing (`window.location.hash`):

| Portal | Direct Access URL | Target Audience | Permissions / Capabilities |
|---|---|---|---|
| **Student Portal** | `https://<host>/#/student` | Enrolled Students | Login with Official Email + RegNo (silent Device ID + optional automatic Google account audit), Java 17 Editor, Public Run, Final Submit, Paste & Fullscreen Proctoring Guard. Automatically displays regular **Lab Exercises** normally and switches strictly to **ESE Practical** questions when Faculty enables **ESE Exam Mode**. |
| **Faculty Portal** | `https://<host>/#/faculty` | Course Teachers | Login with Official Faculty Email authorized in the `Faculty` sheet, **ESE Practical Mode ON/OFF** live switch, customizable **Dynamic Rubrics (`LAB` & `ESE`)**, Question Bank (`LAB` & `ESE`), Auto-Evaluate Pending, Submissions Hub, Multi-Student Proxy & Anti-Cheating Monitor, Dynamic Marksheet CSV Exports. |
| **Course Coordinator Portal** | `https://<host>/#/coordinator` | Course Coordinators | Login with Username/Password (`coordinator` / `Admin@123` default), first-login Change Password + Official Email setup, Email OTP Forgot Password recovery, Add & Edit Course Handlers (`Email`, `Name`, `Department`) in the `Faculty` sheet. |

---

## 3. Complete End-to-End Execution Flow

### A. Course Coordinator Workflow (`/#/coordinator`)
1. **Default Sign-In & First-Time Password Change**:
   - Navigate to `/#/coordinator`.
   - First-time default credentials (stored hashed with SHA-256 in the `CoordinatorAuth` tab):
     - **Username**: `coordinator`
     - **Password**: `Admin@123`
   - Upon first login, the dashboard automatically prompts the Coordinator to **Change Default Password** and register an **Official Email ID** for OTP recovery.
2. **Forgot Password via Official Email OTP**:
   - Click **Forgot Password?** on the Coordinator login screen.
   - Enter the Official Email ID -> Apps Script generates a 10-minute 6-digit OTP in `CoordinatorAuth` and sends it via `MailApp.sendEmail`.
   - Verify the 6-digit OTP and save a new password.
3. **Add & Edit Course Teachers (Handlers)**:
   - Enter **Email**, **Name**, and **Department** and click **Add Course Handler** to save a new teacher directly to the `Faculty` tab of the connected Google Sheet.
   - All existing teachers load from the `Faculty` sheet into the directory table. Click **Edit User** on any row to populate the form, modify details (including email), and save changes back to the exact row in Google Sheets.

### B. Faculty Management Workflow (`/#/faculty`)
1. **Access Faculty Portal**:
   - Faculty navigates to `/#/faculty`.
   - Authenticates via institutional email (`@hindustanuniv.ac.in`) matching the `Faculty` sheet tab.
2. **ESE Practical Mode Toggle (`ExamConfig` tab)**:
   - Use the **Student Exam Visibility Mode** bar at the top of the Faculty Dashboard to toggle **ESE Practical Mode ON / OFF** and customize the exam title (e.g., `BCB52003 End Semester Practical Examination`).
   - When **ESE Mode is ON**, students on `/#/student` keep the same familiar IDE UI but see **only `ESE` questions** (and the Lab Record PDF button is hidden for exam focus).
   - When **ESE Mode is OFF**, students see regular **`LAB` exercises** and the **Generate Lab Record (PDF)** workflow.
3. **Question Bank (`LAB` & `ESE`)**:
   - Click **Add Lab Exercise** or **Add ESE Question** and configure Assessment Type (`LAB` | `ESE`), Title, Description, Category, Difficulty (`Easy`, `Medium`, `Hard`), Open/Close Time, Public Test Case, Private Hidden Test Case, and Starter Code.
   - Upon saving, writes/updates the row in the Google Sheet `Exercises` tab (`POST/GET action=saveExercise`).
4. **Dynamic Rubric Builder & Separate `LAB` / `ESE` Evaluations**:
   - Inside **Rubric Evaluations & Records**, switch between **Lab Exercise Evaluations (`LAB`)** and **ESE Practical Evaluations (`ESE`)**.
   - Click **Configure Rubrics (LAB & ESE)** to customize criterion labels, descriptions, max marks, and auto-scoring rules (`CODE_IMPLEMENTATION`, `OUTPUT_TESTS`, `DOCUMENTATION`, `MANUAL`) saved in the Google Sheet `RubricTemplates` tab.
   - Default templates: **LAB (10 Marks)** (`Concept 5 + Naming 1 + Documentation 1 + Output 3`) and **ESE (50 Marks)** (`Algorithm 10 + Implementation 20 + Execution 15 + Viva 5`).
   - Supports manual slider/numeric grading, **Auto-Evaluate Pending**, **Export CSV Marksheet**, and **Multi-Student Proxy Alert** tracking.
5. **Submissions & Proctoring Auditing**:
   - **Submissions Hub**: Inspect submitted Java code, public/hidden test outputs, and identity audit badges (`Mail ID` & `Device ID`).
   - **Anti-Cheating, Mail ID & Proxy Monitor**: View the **Student Mail ID & Device Login Audit** table plus paste/fullscreen violations and export both CSV reports.

---

### C. Student Examination Workflow (`/#/student`)
1. **Verify Credentials & Silent Device / Google Account Audit**:
   - Student navigates to `/#/student` and opens the profile verification dialog.
   - Enters only:
     1. **Official University Email** (e.g., `2411001@student.hindustanuniv.ac.in`)
     2. **Registration Number** (e.g., `2411001`)
   - Behind the scenes (with zero student-facing telemetry UI), the browser attaches a persistent **Device ID** (`DEV-XXXXXX-XXXX`), and if `VITE_GOOGLE_CLIENT_ID` is configured, prompts Google's account selector to automatically capture the verified Gmail signed in on the student's device without letting students manually type a fake email.
   - Google Apps Script verifies the Official Email & RegNo against the `Students` sheet and logs the event into the `LoginAudit` sheet, flagging if the same Device ID or verified Gmail was used for another Registration Number.
2. **Exercise Selection, Program Toggling & Auto-Save in Java 17**:
   - Active exercises whose window covers the current time load into the editor with their starter code.
   - Students can switch freely between programs using the **Scheduled Questions** sidebar, the **Program** selector dropdown, or **Prev / Next** toggle buttons (`Q1 / N`).
   - Code and test results are **auto-saved per student & exercise** in `localStorage`, alongside an explicit **Save Draft** button with a saved timestamp and `SAVED` / `PASS` question badges so incomplete or failing programs are preserved when toggling between questions.
   - Clicking **Run Public Tests** (or **Custom Input: ON**) displays formatted multiline `Expected Output` vs `Your Output`, and surfaces exact compiler/syntax errors, runtime exceptions, and timeouts (`ERROR` / `TIMEOUT` badges) directly inside **Test Cases Evaluation** and **Execution Console**.
   - Clicking **Submit Code** evaluates both public and hidden test cases.
3. **Grading Matrix**:
   - Both Passed: **100 / 100** (`ALL TEST CASES PASSED`)
   - One Passed: **50 / 100** (`PARTIAL PASS`)
   - Time Limit Exceeded: **0 / 100** (`TIME LIMIT EXCEEDED`)
   - None Passed / Compile Error: **0 / 100** (`FAILED` / `COMPILATION ERROR`)
   - Submissions and any proctoring violations sync silently to Google Sheets (`Submissions` & `Violations` tabs) along with any captured `Recorded Mail ID`, `Device ID`, and `Multi-Student Flag` for faculty review.

---

### D. Code Execution & Evaluation Engine Flow

The platform utilizes a **Dual-Engine Execution Pipeline**:

1. **Remote Execution Container (Render / Docker)**:
   - Client sends `POST` request to `${VITE_RENDER_SERVICE_URL}` with header `x-api-key: ${VITE_API_SECRET}`.
   - Requests execute sequentially (`p-queue` with `concurrency: 1`) inside a non-root OpenJDK 17 sandbox with a 5-second timeout (`timeout 5s java Main < input.txt`).
2. **Built-in Client-Side Engine**:
   - Automatically acts as fallback if the Render container is sleeping or unreachable for standard Scanner/console Java exercises.

---

### E. Anti-Cheating, Mail ID & Multi-Student Proxy Detection

1. **Clipboard & Fullscreen Proctoring**:
   - **Clipboard Paste Interception** (`editor onPaste` -> `PASTE`, Severity: `High`): Copy/paste is blocked inside the code editor and recorded to the `Violations` sheet.
   - **Fullscreen Enforcer** (`fullscreenchange` -> `FULLSCREEN_EXIT`, Severity: `Medium`): Exiting mandatory exam fullscreen mode logs a violation.
2. **Silent Device & Verified Google Account Proxy Monitoring**:
   - Because classmates' official university emails and registration numbers often follow a predictable sequence, students only enter their Official Email and RegNo in the UI while the client silently attaches a persistent **Browser/Device ID** (`DEV-...`).
   - *(Optional Automatic Device Gmail Capture)*: Because browsers block websites from silently reading a Chrome profile's personal email without consent, setting **`VITE_GOOGLE_CLIENT_ID`** enables automatic Google OAuth account-picker verification (`userinfo.email`) so the student's actual Google account on that device is recorded without a manual text input box.
   - Every login (`LoginAudit`), code submission (`Submissions`), violation (`Violations`), and lab record submission (`Evaluations`) cross-checks whether that `Device ID` or captured Google `Mail ID` appears under **more than one Registration Number**, immediately flagging **`FLAGGED: MULTI-STUDENT PROXY`** on the Faculty Dashboard.

---

### F. Practical Lab Record (PDF) Generation Flow

During regular Lab Mode, students click **Generate Lab Record (PDF)** and follow the 3-section workflow:
1. **Section 1 — Preview & Download/Upload Official Logo**:
   - Click **Download Official Logo** (`HITS_LOGO_2025.jpg`) to download the official university banner logo, then click **Upload Hindustan Logo** to embed it cleanly into Page 1 (automatically scaling wide banner logos across the header without duplicating university title text).
   - Preview all A4 pages (**Page 1: Title Page**, **Page 2: Bonafide Certificate**, **Page 3: INDEX Table** with blank `Faculty Sign` cells for hard-copy signing, and **Pages 4+: Experiment Sheets** with editable Procedures, Source Code, and formatted `Input` / `Output Result` / `Evaluation Status` blocks).
2. **Section 2 — Submit Record to Faculty**:
   - Confirm Name and Registration Number and submit the Lab Record to the Google Sheet (`Evaluations` tab) for Faculty rubric grading.
3. **Section 3 — Download & Print Official PDF**:
   - Unlocks automatically once Faculty approves the evaluation. Clicking **Download / Print Official PDF** (or **Print / Save as PDF** in the Faculty inspection modal) exports only the Lab Record A4 pages starting directly at **Page 1 (Title Page)** without capturing the portal UI.

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

You can import the ready-made 10-tab Excel workbook **`/public/JavaLabPro_Database_Template.xls`** directly into Google Sheets (**File > Import > Upload**), or run **`setupAllSheets()`** inside Google Apps Script to auto-create all **10 tabs** with Plain Text (`@`) formatting:

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
| A | `Exercise ID` | Unique ID (e.g., `EX_1`, `ESE_1`) |
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
| M | `Assessment Type` | `LAB` \| `ESE` (controls Student IDE visibility) |

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
| M | `Assessment Type` | `LAB` \| `ESE` |

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
| Q | `Assessment Type` | `LAB` \| `ESE` |
| R | `Rubric Details JSON` | Dynamic criterion breakdown & max total JSON |

### Tab 8: `CoordinatorAuth` *(Course Coordinator Credentials & OTP Recovery)*
| Col | Header | Description |
|---|---|---|
| A | `Username` | Coordinator login username (default: `coordinator`) |
| B | `PasswordHash` | SHA-256 hash of password (default: SHA-256 of `Admin@123`) |
| C | `OfficialEmail` | Official email address used for Forgot Password OTP |
| D | `MustChangePassword` | `TRUE` on first setup; flips to `FALSE` after password update |
| E | `OtpCode` | Temporary 6-digit password-reset OTP |
| F | `OtpExpiry` | Epoch millisecond expiration (10-minute validity) |
| G | `UpdatedAt` | ISO timestamp of last update |

### Tab 9: `ExamConfig` *(Live ESE Practical Mode Switch)*
| Col | Header | Description |
|---|---|---|
| A | `ConfigKey` | `ESE_MODE` \| `ESE_TITLE` |
| B | `ConfigValue` | `FALSE`/`TRUE` or Custom Exam Title string |
| C | `UpdatedBy` | Faculty admin who updated the setting |
| D | `UpdatedAt` | ISO timestamp of update |

### Tab 10: `RubricTemplates` *(Custom Dynamic Rubrics for LAB & ESE)*
| Col | Header | Description |
|---|---|---|
| A | `AssessmentType` | `LAB` \| `ESE` |
| B | `CriterionId` | Criterion key identifier |
| C | `Label` | Display criterion title |
| D | `Description` | Evaluation expectation description |
| E | `MaxMarks` | Numeric max marks for criterion |
| F | `AutoRule` | `CODE_IMPLEMENTATION` \| `OUTPUT_TESTS` \| `DOCUMENTATION` \| `MANUAL` |
| G | `DisplayOrder` | Display sort order |

> **Excel & CSV Templates in `/public/`**:
> - `/public/JavaLabPro_Database_Template.xls` (Complete 10-tab Excel workbook with Text `@` formatting)
> - `/public/Faculty_Template.csv`
> - `/public/Students_Template.csv`
> - `/public/Exercises_Template.csv`
> - `/public/LoginAudit_Template.csv`
> - `/public/Submissions_Template.csv`
> - `/public/Violations_Template.csv`
> - `/public/Evaluations_Template.csv`
> - `/public/ExamConfig_Template.csv`
> - `/public/RubricTemplates_Template.csv`

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
4. In the Apps Script editor toolbar, select **`setupAllSheets`** from the function dropdown and click **Run** once (and **Review Permissions > Allow** if prompted) so all **10 tabs** (`Faculty`, `Students`, `Exercises`, `LoginAudit`, `Submissions`, `Violations`, `Evaluations`, `CoordinatorAuth`, `ExamConfig`, `RubricTemplates`) exist and **`MailApp.sendEmail` email-sending permissions** are authorized for Coordinator Forgot Password OTP emails.
   - *(Note: Upgrading an existing sheet is non-destructive — `Code.gs` auto-appends new columns `Assessment Type` & `Rubric Details JSON` as needed, and running `setupAllSheets()` creates `ExamConfig` & `RubricTemplates` cleanly without overwriting existing rows.)*
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
   - **Course Coordinator Portal**: `https://<username>.github.io/<repo>/#/coordinator`

---

## 7. Directory Structure

```
├── .github/
│   └── workflows/
│       └── deploy.yml                  # Automated GitHub Pages CI/CD workflow
├── apps_script/
│   └── Code.gs                         # Google Apps Script REST API (10 tabs + ESE Mode + Dynamic Rubrics)
├── java-runner/
│   ├── Dockerfile                      # Eclipse Temurin OpenJDK 17 execution container
│   ├── package.json                    # Runner dependencies (express, p-queue)
│   └── server.js                       # Sandboxed execution API server
├── public/
│   ├── 404.html                        # SPA redirect router for GitHub Pages
│   ├── JavaLabPro_Database_Template.xls # Complete 10-sheet Excel template
│   ├── Exercises_Template.csv
│   ├── Faculty_Template.csv
│   ├── Students_Template.csv
│   ├── LoginAudit_Template.csv
│   ├── Submissions_Template.csv
│   ├── Violations_Template.csv
│   ├── Evaluations_Template.csv
│   ├── ExamConfig_Template.csv
│   ├── RubricTemplates_Template.csv
│   ├── assets/aistudio/HITS_LOGO_2025_47293b08.jpg # Official downloadable HITS logo
│   └── hits_logo.svg
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx               # Student & Faculty verification (with silent audit hooks)
│   │   ├── Header.tsx                  # Brand bar with portal indicator
│   │   ├── UserManualModal.tsx         # SOP documentation
│   │   ├── CoordinatorPortal/
│   │   │   ├── CoordinatorAuthCard.tsx # Coordinator Login + Forgot Password Email OTP
│   │   │   └── CoordinatorDashboard.tsx# Password Change + Course Handlers Add/Edit Directory
│   │   ├── FacultyPortal/
│   │   │   ├── AntiCheatingCenter.tsx  # LoginAudit Proxy Monitor + Proctoring Violations
│   │   │   ├── ExerciseManager.tsx     # LAB & ESE Question Bank + Test Cases
│   │   │   ├── ExportResultsModal.tsx
│   │   │   ├── FacultyDashboard.tsx    # ESE Practical Mode Toggle + Portal Tabs
│   │   │   ├── LabRecordEvaluations.tsx # LAB/ESE Rubric Builder + Evaluation Table
│   │   │   ├── RubricEvaluationModal.tsx # Dynamic Criterion Scoring Modal
│   │   │   ├── StudentRoster.tsx
│   │   │   └── SubmissionsHub.tsx
│   │   └── StudentPortal/
│   │       ├── LabRecordModal.tsx      # HITS Official Practical Lab Record PDF Generator
│   │       ├── StudentDashboard.tsx    # Auto-switches between LAB and ESE questions
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
│   │   ├── rubricScoring.ts            # Shared dynamic LAB & ESE rubric scoring helpers
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
