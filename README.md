# JavaLabPro — BCB52003 Object Oriented Programming Lab

An enterprise-grade, anti-cheating Java Online Laboratory and Automated Examination Platform built for **BCB52003 — Object Oriented Programming Lab** at **Hindustan Institute of Technology and Science (Deemed to be University)**.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Dual-Portal Routing Structure](#2-dual-portal-routing-structure)
3. [Complete End-to-End Execution Flow](#3-complete-end-to-end-execution-flow)
   - [A. Faculty Management Workflow](#a-faculty-management-workflow)
   - [B. Student Examination Workflow](#b-student-examination-workflow)
   - [C. Code Execution & Evaluation Engine Flow](#c-code-execution--evaluation-engine-flow)
   - [D. Anti-Cheating & Proctoring Flow](#d-anti-cheating--proctoring-flow)
   - [E. Practical Lab Record (PDF) Generation Flow](#e-practical-lab-record-pdf-generation-flow)
4. [Environment Variables & Configuration Paths](#4-environment-variables--configuration-paths)
5. [Database Schema Reference (Google Sheets)](#5-database-schema-reference-google-sheets)
6. [Deployment Guide](#6-deployment-guide)
   - [Step 1: Deploy Docker Execution Runner (Render)](#step-1-deploy-docker-execution-runner-render)
   - [Step 2: Deploy Google Apps Script Web App](#step-2-deploy-google-apps-script-web-app)
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
               | - Exercise Scheduler        |                    | - Java 17 Online Editor     |
               | - Submissions Hub           |                    | - Public & Hidden Evaluator |
               | - Anti-Cheating Monitor     |                    | - Proctoring HUD            |
               | - Student Roster            |                    | - Class Leaderboard         |
               | - Marksheet CSV Exporter    |                    | - Practical Record (PDF)    |
               +-----------------------------+                    +-----------------------------+
                                       \                                        /
                                        \                                      /
                                         v                                    v
                              +----------------------------------------------------+
                              |          Method B: Environment Variable Bridge      |
                              |               (No In-App UI Tampering)             |
                              +----------------------------------------------------+
                                      |                                    |
                    VITE_APPS_SCRIPT_URL |                                    | VITE_RENDER_SERVICE_URL
                                         v                                    v
                     +-----------------------+                    +-----------------------+
                     |  Google Apps Script   |                    | Render Docker Runner  |
                     |  (Headless REST API)  |                    | (OpenJDK 17 Temurin)  |
                     |  - Exercises Tab      |                    | - Non-root Sandbox    |
                     |  - Submissions Tab    |                    | - Sequential p-queue  |
                     |  - Violations Tab     |                    | - 5-Second Timeout    |
                     |  - Students/Faculty   |                    | - x-api-key Auth      |
                     +-----------------------+                    +-----------------------+
```

---

## 2. Dual-Portal Routing Structure

The applet enforces strict route isolation through client-side hash routing (`window.location.hash`):

| Portal | Direct Access URL | Target Audience | Permissions / Capabilities |
|---|---|---|---|
| **Student Portal** | `https://<host>/#/student` | Enrolled Students | Java 17 Editor, Public Run, Final Submit, Proctoring Guard, Class Leaderboard, Lab Record Generator. **Faculty controls are completely hidden.** |
| **Faculty Portal** | `https://<host>/#/faculty` | Course Instructors | Schedule Exercises, Audit Submissions, Inspect Source Code, Live Proctoring Flags, Marksheet Exports (CSV/JSON), Lab Record Preview. |

---

## 3. Complete End-to-End Execution Flow

### A. Faculty Management Workflow
1. **Access Faculty Portal**:
   - Faculty navigates to `/#/faculty`.
   - Default administrator role is authenticated via institutional email (`@hindustanuniv.ac.in`).
2. **Exercise Scheduling**:
   - Click **Schedule New Exercise**.
   - Input: **Title**, **Description & Constraints**, **Category**, **Difficulty** (`Easy`, `Medium`, `Hard`), and **Time Window** (`OpenTime` & `CloseTime`).
   - Define **Public Test Case**: Sample standard input (`System.in`) and expected output for student testing.
   - Define **Private Hidden Test Case**: Hidden input and output evaluated only on official final submission.
   - Enter **Starter Code**: Boilerplate provided to students.
   - Click **Test Solution on Both Cases** to verify before publishing.
   - Upon saving, appends a new row to the Google Sheet `Exercises` tab via `POST { action: 'saveExercise' }`.
3. **Submissions Auditing**:
   - Submissions Hub displays incoming student attempts in real time.
   - Each submission records: Timestamp, Student Name, Reg No, Exercise ID, Status (`ALL TEST CASES PASSED`, `PARTIAL PASS`, `FAILED`), and Score.
   - Faculty can click **View Code** to inspect the student's exact Java file, verify public test logs, and hidden test logs.
   - Faculty can click **Re-Run Sandbox Test** to re-evaluate student code on-demand.
4. **Proctoring Incident Center**:
   - Chronological incident stream of tab switches, clipboard paste blocks, and fullscreen escapes.
   - Automatic risk flagging for candidates with 2 or more violations.
5. **Assessment Results Export**:
   - **Consolidated Marksheet (CSV)**: Aggregated per student with Reg No, Name, Email, per-exercise best scores, total points, percentage, and remarks (formatted with UTF-8 BOM for Microsoft Excel).
   - **Detailed Submissions Log (CSV)**: Complete audit trail of all test executions.
   - **Proctoring Audit (CSV)**: Chronological incident export.
   - **Full Database Archive (JSON)**: Complete programmatic backup.

---

### B. Student Examination Workflow
1. **Access Student Workspace**:
   - Student navigates to `/#/student`.
   - Clicks profile badge to verify credentials with University Email (`@student.hindustanuniv.ac.in`) and Registration Number (e.g. `21BCE0450`).
2. **Exercise Selection**:
   - Left sidebar lists active exercises whose current time falls between `OpenTime` and `CloseTime`.
   - Clicking an exercise loads the problem statement, time remaining, and starter boilerplate into the editor.
3. **Coding in Java 17**:
   - The editor is preset with standard structure:
     ```java
     import java.util.Scanner;

     public class Main {
         public static void main(String[] args) {
             Scanner sc = new Scanner(System.in);
             // Solution implementation
         }
     }
     ```
4. **Public Testing & Custom Input**:
   - Student can toggle **Custom Input: ON** to feed custom test data into `System.in`.
   - Clicking **Run Public Tests** compiles and runs against the sample test case with immediate console feedback.
5. **Official Final Submission**:
   - Student clicks **Submit Code**.
   - Code is sent sequentially to the execution engine against both:
     - **Test Case 1 (Public)**
     - **Test Case 2 (Hidden Edge Case)**
   - **Grading Matrix**:
     - Both Passed: **100 / 100** (`ALL TEST CASES PASSED`)
     - One Passed: **50 / 100** (`PARTIAL PASS`)
     - None Passed / Compile Error: **0 / 100** (`FAILED`)
   - Submissions and local proctoring incidents sync to the Google Sheet via `POST { action: 'submit' }`.
6. **Class Leaderboard & Rankings**:
   - Live scoreboard sorted by highest total score, highest completed exercises, lowest violations, and alphabetical name.

---

### C. Code Execution & Evaluation Engine Flow

The platform utilizes a **Dual-Engine Execution Pipeline**:

```
                              Student Code Submission
                                        |
                 +----------------------+----------------------+
                 |                                             |
         Remote Docker Available?                       Fallback Engine
        (VITE_RENDER_SERVICE_URL)                              |
                 |                                             v
                 v                                   +-------------------+
        +------------------+                         | Built-in Client   |
        | Send HTTP POST   |                         | JVM Sandbox       |
        | to Render Runner |                         | - AST parser      |
        +------------------+                         | - Scanner bridge  |
                 |                                   | - Console output  |
                 v                                   +-------------------+
        +------------------+
        | OpenJDK 17 Linux |
        | Container (Exec) |
        +------------------+
```

1. **Remote Execution Container (Render / Docker)**:
   - Client sends POST request to `${VITE_RENDER_SERVICE_URL}` with `x-api-key: ${VITE_API_SECRET}`.
   - Request enters an in-memory sequential queue (`pQueue({ concurrency: 1 })`).
   - Runner writes code to `/tmp/<run_id>/Main.java` and input to `/tmp/<run_id>/input.txt`.
   - Executes non-root sandboxed process:
     ```bash
     su - sandbox -c "cd /tmp/<run_id> && javac Main.java && timeout 5s java Main < input.txt"
     ```
   - Returns execution output, error status, and runtime duration (ms).
2. **Built-in Client-Side Engine**:
   - If Render service is cold, sleeping, or not configured, falls back to the client-side JVM emulator for standard algorithms, arithmetic, strings, Scanner inputs, and arrays.

---

### D. Anti-Cheating & Proctoring Flow

During examination mode, client-side event listeners actively monitor exam integrity:

| Proctoring Guard | Event Triggered | Violation Type | Severity |
|---|---|---|---|
| **Tab Switch Detector** | `window.addEventListener('blur')` | `TAB_SWITCH` | High |
| **Fullscreen Enforcer** | `document.addEventListener('fullscreenchange')` | `FULLSCREEN_EXIT` | Medium |
| **Clipboard Interceptor** | `editor.addEventListener('paste')` | `PASTE` | High |

- Violations are buffered in local state and flushed in batch to the Google Sheet upon test submission.

---

### E. Practical Lab Record (PDF) Generation Flow

Students can click **Generate Lab Record (PDF)** at any time to produce the official practical record matching the HITS university template:

1. **Page 1: Title Page**:
   - **University Header in Words**:
     ```
     HINDUSTAN
     INSTITUTE OF TECHNOLOGY & SCIENCE
     (DEEMED TO BE UNIVERSITY)
     ```
   - **Logo Space**: Blank dashed box where students can click to upload their custom logo image or leave it empty to paste physically after printing.
   - **Course Code & Title**: `BCB52003 — Object Oriented Programming`
   - **Report Title**: `PRACTICAL REPORT`
   - **Student Identity**: Clean `Name` and `Registration Number` (without `<< >>` brackets).
   - **Month & Year**: `Nov 2026`
2. **Page 2: Bonafide Certificate**:
   - Official completion text for `MCA Computer Applications` degree during `2026-2027`.
   - Subject-in-Charge: **Dr. Sathish Kumar M, Asst Prof**, Department of Computer Applications.
   - Examination date line and signature blocks for **Internal Examiner** and **External Examiner**.
3. **Page 3: Formatted INDEX Table**:
   - `S.No`, `Date` (from exercise or submission), `Program Title`.
   - **Rubrics Columns** (Left clean and empty for faculty manual evaluation):
     - `Concept Implemented (5)`
     - `Naming Conventions (1)`
     - `Documentation (1)`
     - `Output (3)`
     - `Total (10)`
   - `Page No` and `Faculty Sign` column.
4. **Pages 4+: Formatted Experiment Sheets (1 Page per Program)**:
   - Header with Date and Experiment number.
   - `Aim`: Program objective.
   - **Student-Editable Procedure / Algorithm Textarea**: Interactive box where students can write, edit, or customize their own step-by-step logic (prints as formal serif publication text).
   - `Coding`: Syntax-formatted Java program.
   - `Output`: Console test output result.
   - `Result`: Conclusion statement.
   - Footer with Page number and Staff Signature line.
5. **Print & PDF Engine**:
   - Multi-strategy printing: **Print / Save as PDF** (`window.print()`) and **Print via Frame** (isolated hidden iframe).
   - Formatted for exact A4 portrait dimensions with `@page { size: A4 portrait; margin: 12mm 15mm; }`.

---

## 4. Environment Variables & Configuration Paths

### A. Environment Architecture (Method B)
To protect the backend from tampering by students and eliminate the risk of app crashes, all backend endpoints are configured via environment variables at build time:

| Variable Name | Description | Example / Default Value |
|---|---|---|
| `VITE_APPS_SCRIPT_URL` | Google Apps Script Web App URL ending in `/exec` | `https://script.google.com/macros/s/AKfycbx.../exec` |
| `VITE_RENDER_SERVICE_URL` | Docker OpenJDK 17 runner URL ending in `/execute` | `https://java-runner-xxxx.onrender.com/execute` |
| `VITE_API_SECRET` | Secret authentication key (`x-api-key` header) | `MY_SECURE_LAB_KEY_123` |

### B. Configuration File Paths
- **Local Development**: `/.env` or `/.env.example`
- **Production Build**: `/.env.production`
- **GitHub Actions Deployment**: Configured in GitHub Repository under:
  - **Settings** > **Secrets and variables** > **Actions** > **Variables** (or **Secrets**)
  - `VITE_APPS_SCRIPT_URL`
  - `VITE_RENDER_SERVICE_URL`
  - `VITE_API_SECRET`

---

## 5. Database Schema Reference (Google Sheets)

Create a Google Spreadsheet named `Java_Lab_Database` with the following 5 sheets and exact column headers:

### Sheet 1: `Exercises`
| Col | Header | Description |
|---|---|---|
| A | `ID` | Unique identifier (e.g. `EX_101`) |
| B | `Title` | Problem Title |
| C | `Description` | Problem description and constraints |
| D | `OpenTime` | Start datetime (ISO string, e.g. `2026-01-01T08:00`) |
| E | `CloseTime` | Expiry datetime (ISO string, e.g. `2027-12-31T23:59`) |
| F | `PublicInput` | Input fed into Scanner for public test |
| G | `PublicOutput` | Expected output for public test |
| H | `PrivateInput` | Hidden grading input |
| I | `PrivateOutput` | Hidden grading output |

### Sheet 2: `Submissions`
| Col | Header | Description |
|---|---|---|
| A | `Timestamp` | Submission date and time |
| B | `StudentEmail` | Institutional email |
| C | `RegNo` | Student registration number |
| D | `ExerciseID` | Exercise identifier |
| E | `Code` | Source Java code |
| F | `Status` | `ALL TEST CASES PASSED` \| `PARTIAL PASS` \| `FAILED` |
| G | `PublicResult` | Public execution output |
| H | `PrivateResult` | Hidden execution output |

### Sheet 3: `Violations`
| Col | Header | Description |
|---|---|---|
| A | `Timestamp` | Time of incident |
| B | `StudentEmail` | Student email |
| C | `RegNo` | Registration number |
| D | `ExerciseID` | Exercise identifier |
| E | `ViolationType` | `TAB_SWITCH` \| `FULLSCREEN_EXIT` \| `PASTE` |
| F | `Details` | Description of intercepted action |

### Sheet 4: `Students`
| Col | Header | Description |
|---|---|---|
| A | `Email` | Student email (`@student.hindustanuniv.ac.in`) |
| B | `RegNo` | Registration number (e.g. `21BCE0450`) |
| C | `Name` | Student Full Name |

### Sheet 5: `Faculty`
| Col | Header | Description |
|---|---|---|
| A | `Email` | Faculty institutional email (`@hindustanuniv.ac.in`) |
| B | `Name` | Faculty Full Name and Designation |

---

## 6. Deployment Guide

### Step 1: Deploy Docker Execution Runner (Render)
1. In your GitHub repository, ensure the `java-runner/` directory contains:
   - `Dockerfile` (using `FROM eclipse-temurin:17-jdk-jammy`)
   - `server.js` (Express + `p-queue`)
   - `package.json`
2. Go to [Render Dashboard](https://dashboard.render.com/) > **New +** > **Web Service**.
3. Select your repository and set:
   - **Root Directory**: `java-runner`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
4. Set Environment Variables on Render:
   - `API_SECRET` = `MY_SECURE_LAB_KEY_123`
   - `PORT` = `3000`
5. Click **Deploy Web Service** and copy the live URL ending in `/execute`:
   ```
   https://java-runner-xxxx.onrender.com/execute
   ```

---

### Step 2: Deploy Google Apps Script Web App
1. Open your Google Spreadsheet (`Java_Lab_Database`).
2. Navigate to **Extensions** > **Apps Script**.
3. Paste the contents of `apps_script/Code.gs` into the editor.
4. Click **Deploy** > **New deployment**:
   - **Type**: `Web app`
   - **Execute as**: `Me (<your-email>@gmail.com)` *(Critical: gives script permissions to edit the sheet)*
   - **Who has access**: `Anyone` *(Critical: allows cross-origin requests from GitHub Pages)*
5. Click **Deploy**, authorize permissions, and copy the Web App URL ending in `/exec`:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

---

### Step 3: Deploy Frontend to GitHub Pages
1. Push this repository to GitHub.
2. In your repository on GitHub:
   - Go to **Settings** > **Secrets and variables** > **Actions** > **Variables**.
   - Add `VITE_APPS_SCRIPT_URL` with your Google Apps Script URL.
   - Add `VITE_RENDER_SERVICE_URL` with your Render runner URL.
   - Add `VITE_API_SECRET` with your API secret key.
3. In **Settings** > **Pages**:
   - Under **Build and deployment** > **Source**, choose **GitHub Actions**.
4. The workflow at `.github/workflows/deploy.yml` will automatically build the React application and deploy it to:
   - **Student Workspace**: `https://<username>.github.io/<repo>/#/student`
   - **Faculty Management**: `https://<username>.github.io/<repo>/#/faculty`

---

## 7. Directory Structure

```
├── .github/
│   └── workflows/
│       └── deploy.yml              # Automated GitHub Pages CI/CD workflow
├── apps_script/
│   └── Code.gs                     # Google Apps Script Headless REST API database code
├── java-runner/
│   ├── Dockerfile                  # Eclipse Temurin OpenJDK 17 execution container
│   ├── package.json                # Runner dependencies (express, p-queue)
│   └── server.js                   # Sandboxed execution API server
├── public/
│   ├── 404.html                    # SPA redirect router for GitHub Pages
│   └── hits_logo.svg               # Vector graphics
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx           # Student & Faculty verification dialog
│   │   ├── Header.tsx              # Brand bar with portal indicator
│   │   ├── UserManualModal.tsx     # SOP documentation
│   │   ├── FacultyPortal/
│   │   │   ├── AntiCheatingCenter.tsx
│   │   │   ├── ExerciseManager.tsx
│   │   │   ├── ExportResultsModal.tsx
│   │   │   ├── FacultyDashboard.tsx
│   │   │   ├── StudentRoster.tsx
│   │   │   └── SubmissionsHub.tsx
│   │   └── StudentPortal/
│   │       ├── LabRecordModal.tsx  # HITS Official Practical Lab Record PDF Generator
│   │       ├── StudentDashboard.tsx
│   │       ├── StudentIDE.tsx      # Java 17 IDE with proctoring guards
│   │       └── StudentLeaderboard.tsx
│   ├── data/
│   │   └── mockData.ts             # Initial clean data state
│   ├── services/
│   │   ├── javaRunner.ts           # Dual-engine Java interpreter & REST runner
│   │   └── sheetService.ts         # Google Apps Script REST client
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces and domain models
│   ├── utils/
│   │   └── exportUtils.ts          # CSV and JSON assessment export engines
│   ├── App.tsx                     # Main layout and route controller
│   ├── index.css                   # Tailwind CSS and A4 Print media styles
│   └── main.tsx                    # Entry point
├── .env.example                    # Sample environment variables reference
├── index.html                      # HTML5 entry with metadata
├── package.json                    # Project scripts and dependencies
├── tsconfig.json                   # TypeScript configuration
└── vite.config.ts                  # Vite build configuration
```
