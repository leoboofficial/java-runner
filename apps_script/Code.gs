// ==============================================================================
// Google Apps Script (Code.gs) for JavaLabPro Headless REST API & Database
// Course: BCB52003 - Object Oriented Programming Lab
// Institution: Hindustan Institute of Technology and Science (Deemed to be University)
// ==============================================================================
//
// DEPLOYMENT CHECKLIST FOR GOOGLE APPS SCRIPT:
// 1. In Google Sheets: Extensions > Apps Script.
// 2. Paste this entire code replacing all existing code in Code.gs.
// 3. Click "Save" (disk icon).
// 4. Click "Deploy" > "Manage deployments".
// 5. Click the Edit (pencil) icon next to your active Web App deployment.
// 6. Under "Version", choose "New version" (CRITICAL: otherwise Google keeps running old code!).
// 7. Under "Execute as", select: "Me" (your Google account).
// 8. Under "Who has access", select: "Anyone" (allows student IDE & faculty portal to sync).
// 9. Click "Deploy". Copy the Web App URL (ends in /exec).
// ==============================================================================

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action) {
      return handleApiGet(e);
    }
    return jsonResponse({
      status: "online",
      message: "JavaLabPro Google Apps Script Headless API is online and ready.",
      endpoints: [
        "?action=getActiveExercises",
        "?action=getStudents",
        "?action=getEvaluations",
        "?action=getLoginAudit",
        "?action=saveExercise&payload=...",
        "?action=addStudent&payload=...",
        "?action=saveEvaluation&payload=...",
        "?action=submitLabRecord&payload=...",
        "?action=login&email=...&regNo=...&portalRole=...&personalEmail=...&deviceId=...",
        "?action=setup"
      ]
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    let action = '';
    let payload = null;
    let email = '';
    let regNo = '';
    let personalEmail = '';
    let deviceId = '';
    let portalRole = '';

    if (e && e.postData && e.postData.contents) {
      try {
        const parsed = JSON.parse(e.postData.contents);
        action = parsed.action;
        payload = parsed.payload;
        email = parsed.email;
        regNo = parsed.regNo;
        personalEmail = parsed.personalEmail;
        deviceId = parsed.deviceId;
        portalRole = parsed.portalRole;
      } catch (parseErr) {
        if (e.parameter) {
          action = e.parameter.action;
          payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : e.parameter;
        }
      }
    } else if (e && e.parameter) {
      action = e.parameter.action;
      payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : e.parameter;
    }

    if (action === 'saveExercise') {
      return jsonResponse(saveExercise(payload));
    }
    if (action === 'addStudent') {
      return jsonResponse(addStudent(payload));
    }
    if (action === 'submit') {
      return jsonResponse(saveSubmissionAndViolations(payload));
    }
    if (action === 'submitLabRecord') {
      return jsonResponse(submitLabRecord(payload));
    }
    if (action === 'saveEvaluation') {
      return jsonResponse(saveEvaluation(payload));
    }
    if (action === 'login') {
      return jsonResponse(
        loginUserManual(
          email || (payload && payload.email),
          regNo || (payload && payload.regNo),
          personalEmail || (payload && payload.personalEmail),
          deviceId || (payload && payload.deviceId),
          portalRole || (payload && payload.portalRole)
        )
      );
    }
    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function handleApiGet(e) {
  const action = e.parameter.action;
  if (action === 'getActiveExercises') {
    return jsonResponse(getActiveExercises());
  }
  if (action === 'getStudents') {
    return jsonResponse(getStudents());
  }
  if (action === 'getEvaluations') {
    return jsonResponse(getEvaluations());
  }
  if (action === 'getLoginAudit') {
    return jsonResponse(getLoginAudit());
  }
  if (action === 'saveExercise') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(saveExercise(payload));
  }
  if (action === 'addStudent') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(addStudent(payload));
  }
  if (action === 'submit') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(saveSubmissionAndViolations(payload));
  }
  if (action === 'submitLabRecord') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(submitLabRecord(payload));
  }
  if (action === 'saveEvaluation') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(saveEvaluation(payload));
  }
  if (action === 'login') {
    return jsonResponse(
      loginUserManual(
        e.parameter.email,
        e.parameter.regNo,
        e.parameter.personalEmail,
        e.parameter.deviceId,
        e.parameter.portalRole
      )
    );
  }
  if (action === 'setup') {
    return jsonResponse(setupAllSheets());
  }
  return jsonResponse({ error: 'Unknown action: ' + action });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

// ==============================================================================
// HELPER: DETECT IF SAME MAIL ID OR DEVICE ID IS USED FOR >1 STUDENT REG NO
// ==============================================================================
function detectMultiStudentProxy(regNo, personalEmail, deviceId) {
  const cleanReg = (regNo || '').toString().trim().toUpperCase();
  const cleanMail = (personalEmail || '').toString().trim().toLowerCase();
  const cleanDev = (deviceId || '').toString().trim();

  const hasValidDev = cleanDev && cleanDev !== 'UNKNOWN';
  if (!cleanMail && !hasValidDev) {
    return { isFlagged: false, otherRegs: [], message: 'CLEAR' };
  }

  const otherRegsSet = {};
  const auditSheet = getSheet('LoginAudit');
  const auditRows = auditSheet.getDataRange().getValues();
  for (let i = 1; i < auditRows.length; i++) {
    const rReg = String(auditRows[i][2] || '').trim().toUpperCase();
    const rMail = String(auditRows[i][4] || '').trim().toLowerCase();
    const rDev = String(auditRows[i][5] || '').trim();
    if (!rReg || rReg === cleanReg) continue;

    if ((cleanMail && rMail && rMail === cleanMail) || (hasValidDev && rDev && rDev !== 'UNKNOWN' && rDev === cleanDev)) {
      otherRegsSet[rReg] = true;
    }
  }

  const subSheet = getSheet('Submissions');
  const subRows = subSheet.getDataRange().getValues();
  for (let i = 1; i < subRows.length; i++) {
    const sReg = String(subRows[i][3] || '').trim().toUpperCase();
    const sMail = String(subRows[i][2] || '').trim().toLowerCase();
    const sDev = String(subRows[i][9] || '').trim();
    if (!sReg || sReg === cleanReg) continue;

    if ((cleanMail && sMail && sMail === cleanMail) || (hasValidDev && sDev && sDev !== 'UNKNOWN' && sDev === cleanDev)) {
      otherRegsSet[sReg] = true;
    }
  }

  const otherRegs = Object.keys(otherRegsSet);
  if (otherRegs.length > 0) {
    return {
      isFlagged: true,
      otherRegs: otherRegs,
      message: 'FLAGGED: Shared Mail ID / Device also used for RegNo(s): ' + otherRegs.join(', ')
    };
  }
  return { isFlagged: false, otherRegs: [], message: 'CLEAR' };
}

// 1. STRICTLY VALIDATE AGAINST GOOGLE SHEET (FACULTY OR STUDENTS TAB)
function loginUserManual(email, regNo, personalEmail, deviceId, portalRole) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanReg = (regNo || '').trim().toUpperCase();
  const cleanPersonalMail = (personalEmail || '').trim().toLowerCase();
  const cleanDeviceId = (deviceId || '').trim();
  const requestedRole = (portalRole || '').toString().trim().toUpperCase();

  if (!cleanEmail) {
    return {
      role: 'UNAUTHORIZED',
      error: 'Access Denied: Email address is required.'
    };
  }

  // 1. Check Faculty Sheet (only when Faculty portal is requested or no specific Student role/regNo provided)
  if (requestedRole === 'FACULTY' || (!requestedRole && !cleanReg)) {
    const facultySheet = getSheet('Faculty');
    const facultyData = facultySheet.getDataRange().getValues();
    if (facultyData.length <= 1) {
      return {
        role: 'UNAUTHORIZED',
        error: 'Access Denied: Faculty Google Sheet is empty. Add your faculty email in the Faculty tab first.'
      };
    }
    for (let i = 1; i < facultyData.length; i++) {
      const fEmail = (facultyData[i][0] || '').toString().trim().toLowerCase();
      if (fEmail && fEmail === cleanEmail) {
        return {
          role: 'FACULTY',
          email: cleanEmail,
          name: facultyData[i][1] || cleanEmail,
          department: facultyData[i][2] || 'Department of Computer Applications'
        };
      }
    }
    if (requestedRole === 'FACULTY') {
      return {
        role: 'UNAUTHORIZED',
        error: 'Access Denied: "' + cleanEmail + '" is not authorized in the Faculty Google Sheet tab.'
      };
    }
  }

  // 2. Check Students Sheet (BOTH official email AND RegNo are strictly required)
  if (!cleanReg) {
    return {
      role: 'UNAUTHORIZED',
      error: 'Access Denied: Registration Number is required for student login.'
    };
  }

  const studentSheet = getSheet('Students');
  const studentData = studentSheet.getDataRange().getValues();
  if (studentData.length <= 1) {
    return {
      role: 'UNAUTHORIZED',
      error: 'Access Denied: Students Google Sheet is empty. Add enrolled students in the Students tab first.'
    };
  }

  for (let i = 1; i < studentData.length; i++) {
    const sEmail = (studentData[i][0] || '').toString().trim().toLowerCase();
    const sReg = (studentData[i][1] || '').toString().trim().toUpperCase();
    if (sEmail && sReg && sEmail === cleanEmail && sReg === cleanReg) {
      const stuName = studentData[i][2] || cleanEmail;
      const stuDept = studentData[i][3] || 'Department of Computer Applications';

      // Check if same Personal Mail ID or Device ID was already used for ANOTHER student!
      const proxyCheck = detectMultiStudentProxy(sReg, cleanPersonalMail, cleanDeviceId);

      // Record this login event in LoginAudit tab
      const auditSheet = getSheet('LoginAudit');
      const auditHeaders = [
        'Timestamp', 'Official Email', 'Reg No', 'Student Name',
        'Recorded Mail ID', 'Device ID', 'Other RegNos Used', 'Multi-Student Status'
      ];
      if (auditSheet.getLastRow() === 0) {
        auditSheet.appendRow(auditHeaders);
        auditSheet.getRange(1, 1, 1, auditHeaders.length).setFontWeight('bold');
      }

      const auditRow = [
        new Date().toISOString(),
        cleanEmail,
        sReg,
        stuName,
        cleanPersonalMail,
        cleanDeviceId || 'UNKNOWN',
        proxyCheck.otherRegs.join(', '),
        proxyCheck.isFlagged ? 'FLAGGED: MULTI-STUDENT PROXY' : 'CLEAR'
      ];
      auditSheet.appendRow(auditRow);
      auditSheet.getRange(auditSheet.getLastRow(), 1, 1, auditRow.length).setNumberFormat('@');

      return {
        role: 'STUDENT',
        email: cleanEmail,
        personalEmail: cleanPersonalMail,
        deviceId: cleanDeviceId,
        multiStudentAlert: proxyCheck.isFlagged ? proxyCheck.message : '',
        regNo: sReg,
        name: stuName,
        department: stuDept
      };
    }
  }

  return {
    role: 'UNAUTHORIZED',
    error: 'Access Denied: Official Email (' + cleanEmail + ') and Reg No (' + cleanReg + ') do not match any record in the Students Google Sheet tab.'
  };
}

// 2. FACULTY: SCHEDULE / UPDATE EXERCISE (WITH STARTER CODE & PLAIN TEXT PROTECTION)
function saveExercise(data) {
  if (!data) return { success: false, error: 'No exercise payload provided' };

  const sheet = getSheet('Exercises');
  const id = (data.id || ('EX_' + Date.now())).toString().trim();

  const standardHeaders = [
    'Exercise ID', 'Title', 'Description', 'Open Time', 'Close Time',
    'Public Input', 'Public Output', 'Private Input', 'Private Output',
    'Starter Code', 'Category', 'Difficulty'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(standardHeaders);
    sheet.getRange(1, 1, 1, standardHeaders.length).setFontWeight('bold');
  } else {
    const currentCols = sheet.getLastColumn();
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(currentCols, 1)).getValues()[0].map(function(h) {
      return String(h || '').trim().toLowerCase();
    });
    
    if (currentHeaders.indexOf('starter code') === -1) {
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue('Starter Code').setFontWeight('bold');
    }
  }

  const rows = sheet.getDataRange().getValues();
  let existingRowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    const rowId = (rows[i][0] || '').toString().trim();
    const rowTitle = (rows[i][1] || '').toString().trim().toLowerCase();
    if (rowId === id || (data.title && rowTitle === data.title.trim().toLowerCase())) {
      existingRowIndex = i + 1;
      break;
    }
  }

  const rowValues = [
    id,
    data.title || '',
    data.description || '',
    data.openTime || '',
    data.closeTime || '',
    data.publicInput !== undefined ? String(data.publicInput) : '',
    data.publicOutput !== undefined ? String(data.publicOutput) : '',
    data.privateInput !== undefined ? String(data.privateInput) : '',
    data.privateOutput !== undefined ? String(data.privateOutput) : '',
    data.starterCode !== undefined ? String(data.starterCode) : '',
    data.category || 'Basic Java & Operators',
    data.difficulty || 'Easy'
  ];

  if (existingRowIndex > 0) {
    const targetRange = sheet.getRange(existingRowIndex, 1, 1, rowValues.length);
    targetRange.setNumberFormat('@');
    targetRange.setValues([rowValues]);
    return { success: true, message: 'Exercise ' + id + ' updated successfully with Starter Code!' };
  } else {
    sheet.appendRow(rowValues);
    const newRowIndex = sheet.getLastRow();
    sheet.getRange(newRowIndex, 1, 1, rowValues.length).setNumberFormat('@');
    return { success: true, message: 'Exercise ' + id + ' scheduled successfully with Starter Code!' };
  }
}

// 3. STUDENT & FACULTY: FETCH ACTIVE EXERCISES (WITH STARTER CODE)
function getActiveExercises() {
  const sheet = getSheet('Exercises');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const headers = rows[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  const idIdx = headers.indexOf('exercise id') !== -1 ? headers.indexOf('exercise id') : 0;
  const titleIdx = headers.indexOf('title') !== -1 ? headers.indexOf('title') : 1;
  const descIdx = headers.indexOf('description') !== -1 ? headers.indexOf('description') : 2;
  const openIdx = headers.indexOf('open time') !== -1 ? headers.indexOf('open time') : 3;
  const closeIdx = headers.indexOf('close time') !== -1 ? headers.indexOf('close time') : 4;
  const pubInIdx = headers.indexOf('public input') !== -1 ? headers.indexOf('public input') : 5;
  const pubOutIdx = headers.indexOf('public output') !== -1 ? headers.indexOf('public output') : 6;
  const privInIdx = headers.indexOf('private input') !== -1 ? headers.indexOf('private input') : 7;
  const privOutIdx = headers.indexOf('private output') !== -1 ? headers.indexOf('private output') : 8;
  const starterIdx = headers.indexOf('starter code') !== -1 ? headers.indexOf('starter code') : 9;
  const catIdx = headers.indexOf('category') !== -1 ? headers.indexOf('category') : 10;
  const diffIdx = headers.indexOf('difficulty') !== -1 ? headers.indexOf('difficulty') : 11;

  const now = new Date().getTime();
  const active = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[idIdx] && !row[titleIdx]) continue;

    const closeTimeVal = row[closeIdx];
    const close = closeTimeVal ? new Date(closeTimeVal).getTime() : Infinity;

    const isExpired = !isNaN(close) && close < now && (now - close > 86400000 * 7);
    if (isExpired) continue;

    active.push({
      id: String(row[idIdx] || ('EX_' + i)),
      title: String(row[titleIdx] || ''),
      description: String(row[descIdx] || ''),
      openTime: row[openIdx] ? String(row[openIdx]) : '',
      closeTime: row[closeIdx] ? String(row[closeIdx]) : '',
      publicInput: row[pubInIdx] !== undefined ? String(row[pubInIdx]) : '',
      publicOutput: row[pubOutIdx] !== undefined ? String(row[pubOutIdx]) : '',
      privateInput: row[privInIdx] !== undefined ? String(row[privInIdx]) : '',
      privateOutput: row[privOutIdx] !== undefined ? String(row[privOutIdx]) : '',
      starterCode: row[starterIdx] !== undefined ? String(row[starterIdx]) : '',
      category: row[catIdx] ? String(row[catIdx]) : 'Basic Java & Operators',
      difficulty: row[diffIdx] ? String(row[diffIdx]) : 'Easy'
    });
  }
  return active;
}

// 4. STUDENT & FACULTY: SAVE SUBMISSIONS & VIOLATIONS (RECORDS OFFICIAL EMAIL, PERSONAL MAIL ID, DEVICE ID)
function saveSubmissionAndViolations(payload) {
  if (!payload) return { success: false, error: 'No payload provided' };

  const sub = payload.submission || payload || {};
  const violations = payload.violations || [];

  const officialEmail = (sub.studentEmail || sub.email || '').toString().trim().toLowerCase();
  const personalMail = (sub.personalEmail || '').toString().trim().toLowerCase();
  const regNo = (sub.regNo || '').toString().trim().toUpperCase();
  const stuName = (sub.studentName || '').toString().trim();
  const deviceId = (sub.deviceId || '').toString().trim();

  const proxyCheck = detectMultiStudentProxy(regNo, personalMail, deviceId);

  const subSheet = getSheet('Submissions');
  const subHeaders = [
    'Timestamp', 'Official Email', 'Recorded Mail ID', 'Reg No', 'Student Name',
    'Exercise ID', 'Exercise Title', 'Status', 'Score', 'Device ID', 'Multi-Student Flag', 'Source Code'
  ];
  if (subSheet.getLastRow() === 0) {
    subSheet.appendRow(subHeaders);
    subSheet.getRange(1, 1, 1, subHeaders.length).setFontWeight('bold');
  }

  const subRow = [
    sub.timestamp || new Date().toISOString(),
    officialEmail,
    personalMail,
    regNo,
    stuName,
    sub.exerciseId || '',
    sub.exerciseTitle || '',
    sub.status || '',
    sub.score !== undefined ? String(sub.score) : '0',
    deviceId || 'UNKNOWN',
    proxyCheck.isFlagged ? proxyCheck.message : 'CLEAR',
    sub.sourceCode || sub.code || ''
  ];
  subSheet.appendRow(subRow);
  subSheet.getRange(subSheet.getLastRow(), 1, 1, subRow.length).setNumberFormat('@');

  if (violations.length > 0) {
    const vioSheet = getSheet('Violations');
    const vioHeaders = [
      'Timestamp', 'Official Email', 'Recorded Mail ID', 'Reg No', 'Student Name',
      'Exercise ID', 'Violation Type', 'Details', 'Severity', 'Device ID'
    ];
    if (vioSheet.getLastRow() === 0) {
      vioSheet.appendRow(vioHeaders);
      vioSheet.getRange(1, 1, 1, vioHeaders.length).setFontWeight('bold');
    }

    for (let i = 0; i < violations.length; i++) {
      const v = violations[i];
      const vRow = [
        v.timestamp || v.time || new Date().toISOString(),
        v.studentEmail || officialEmail,
        v.personalEmail || personalMail,
        v.regNo || regNo,
        v.studentName || stuName,
        v.exerciseId || sub.exerciseId || '',
        v.type || '',
        v.details || '',
        v.severity || 'medium',
        v.deviceId || deviceId || 'UNKNOWN'
      ];
      vioSheet.appendRow(vRow);
      vioSheet.getRange(vioSheet.getLastRow(), 1, 1, vRow.length).setNumberFormat('@');
    }
  }

  return {
    success: true,
    multiStudentAlert: proxyCheck.isFlagged ? proxyCheck.message : '',
    message: 'Submission & violations recorded successfully!'
  };
}

// 5. STUDENT: SUBMIT LAB RECORD FOR FACULTY RUBRIC EVALUATION
function submitLabRecord(payload) {
  if (!payload) return { success: false, error: 'No payload provided' };
  const sheet = getSheet('Evaluations');

  const headers = [
    'Timestamp', 'Official Email', 'Recorded Mail ID', 'Reg No', 'Student Name', 'Status',
    'Concept (5)', 'Naming (1)', 'Documentation (1)', 'Output (3)', 'Total Marks (10)',
    'Violations Count', 'Device ID', 'Multi-Student Flag', 'Faculty Remarks', 'Evaluated By'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  const email = (payload.studentEmail || '').toString().trim().toLowerCase();
  const personalMail = (payload.personalEmail || payload.loggedGmail || '').toString().trim().toLowerCase();
  const regNo = (payload.regNo || '').toString().trim().toUpperCase();
  const name = (payload.studentName || '').toString().trim();
  const deviceId = (payload.deviceId || 'UNKNOWN').toString().trim();
  const violationsCount = payload.antiCheatingViolationsCount !== undefined ? String(payload.antiCheatingViolationsCount) : '0';

  const proxyCheck = detectMultiStudentProxy(regNo, personalMail, deviceId);
  const proxyFlagText = payload.multiStudentAlert || (proxyCheck.isFlagged ? proxyCheck.message : 'CLEAR');

  const rows = sheet.getDataRange().getValues();
  let existingIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const rReg = (rows[i][3] || '').toString().trim().toUpperCase();
    if (regNo && rReg === regNo) {
      existingIndex = i + 1;
      break;
    }
  }

  const rowValues = [
    new Date().toISOString(),
    email,
    personalMail,
    regNo,
    name,
    'PENDING_EVALUATION',
    '', '', '', '', '',
    violationsCount,
    deviceId,
    proxyFlagText,
    'Submitted by student. Awaiting faculty rubric assessment.',
    ''
  ];

  if (existingIndex > 0) {
    const currentStatus = String(rows[existingIndex - 1][5] || '');
    if (currentStatus === 'EVALUATED_APPROVED') {
      return { success: true, message: 'Lab Record already evaluated and approved by faculty!' };
    }
    const range = sheet.getRange(existingIndex, 1, 1, rowValues.length);
    range.setNumberFormat('@');
    range.setValues([rowValues]);
    return { success: true, message: 'Lab Record submitted to faculty for rubric evaluation!' };
  } else {
    sheet.appendRow(rowValues);
    const newIdx = sheet.getLastRow();
    sheet.getRange(newIdx, 1, 1, rowValues.length).setNumberFormat('@');
    return { success: true, message: 'Lab Record submitted to faculty for rubric evaluation!' };
  }
}

// 6. FACULTY: EVALUATE LAB RECORD WITH 10-MARK RUBRIC
function saveEvaluation(payload) {
  if (!payload) return { success: false, error: 'No payload provided' };
  const sheet = getSheet('Evaluations');

  const headers = [
    'Timestamp', 'Official Email', 'Recorded Mail ID', 'Reg No', 'Student Name', 'Status',
    'Concept (5)', 'Naming (1)', 'Documentation (1)', 'Output (3)', 'Total Marks (10)',
    'Violations Count', 'Device ID', 'Multi-Student Flag', 'Faculty Remarks', 'Evaluated By'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  const email = (payload.studentEmail || '').toString().trim().toLowerCase();
  const personalMail = (payload.personalEmail || payload.loggedGmail || '').toString().trim().toLowerCase();
  const regNo = (payload.regNo || '').toString().trim().toUpperCase();
  const name = (payload.studentName || '').toString().trim();
  const deviceId = (payload.deviceId || 'UNKNOWN').toString().trim();
  const rubrics = payload.rubrics || payload.rubric || {};
  const concept = rubrics.conceptImplemented !== undefined ? String(rubrics.conceptImplemented) : '5';
  const naming = rubrics.namingConventions !== undefined ? String(rubrics.namingConventions) : '1';
  const doc = rubrics.documentation !== undefined ? String(rubrics.documentation) : '1';
  const output = rubrics.output !== undefined ? String(rubrics.output) : '3';
  const total = rubrics.total !== undefined ? String(rubrics.total) : (rubrics.totalMarks !== undefined ? String(rubrics.totalMarks) : '10');
  const violCount = payload.antiCheatingViolationsCount !== undefined ? String(payload.antiCheatingViolationsCount) : '0';
  const proxyCheck = detectMultiStudentProxy(regNo, personalMail, deviceId);
  const proxyFlagText = payload.multiStudentAlert || (proxyCheck.isFlagged ? proxyCheck.message : 'CLEAR');
  const remarks = payload.facultyRemarks || 'Verified and approved for final practical record submission.';
  const evalBy = payload.evaluatedBy || 'Faculty Admin';
  const targetStatus =
    payload.status === 'PENDING_EVALUATION' || payload.isVerifiedAndApproved === false
      ? 'PENDING_EVALUATION'
      : 'EVALUATED_APPROVED';

  const rows = sheet.getDataRange().getValues();
  let existingIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const rReg = (rows[i][3] || '').toString().trim().toUpperCase();
    if (regNo && rReg === regNo) {
      existingIndex = i + 1;
      break;
    }
  }

  const rowValues = [
    new Date().toISOString(),
    email,
    personalMail,
    regNo,
    name,
    targetStatus,
    concept,
    naming,
    doc,
    output,
    total,
    violCount,
    deviceId,
    proxyFlagText,
    remarks,
    evalBy
  ];

  if (existingIndex > 0) {
    const range = sheet.getRange(existingIndex, 1, 1, rowValues.length);
    range.setNumberFormat('@');
    range.setValues([rowValues]);
    return { success: true, message: 'Evaluation saved and student record approved!' };
  } else {
    sheet.appendRow(rowValues);
    const newIdx = sheet.getLastRow();
    sheet.getRange(newIdx, 1, 1, rowValues.length).setNumberFormat('@');
    return { success: true, message: 'Evaluation saved and student record approved!' };
  }
}

// 7. FETCH ALL EVALUATIONS FROM SPREADSHEET
function getEvaluations() {
  const sheet = getSheet('Evaluations');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[1] && !row[3]) continue;

    const concept = parseFloat(row[6]) || 0;
    const naming = parseFloat(row[7]) || 0;
    const documentation = parseFloat(row[8]) || 0;
    const output = parseFloat(row[9]) || 0;
    const total = parseFloat(row[10]) || (concept + naming + documentation + output);

    results.push({
      id: 'EVAL_' + i,
      timestamp: String(row[0] || ''),
      studentEmail: String(row[1] || ''),
      personalEmail: String(row[2] || ''),
      regNo: String(row[3] || ''),
      studentName: String(row[4] || ''),
      status: String(row[5] || 'PENDING_EVALUATION'),
      rubrics: {
        conceptImplemented: concept,
        namingConventions: naming,
        documentation: documentation,
        output: output,
        total: total
      },
      antiCheatingViolationsCount: parseInt(row[11], 10) || 0,
      deviceId: String(row[12] || ''),
      multiStudentAlert: String(row[13] || '') === 'CLEAR' ? '' : String(row[13] || ''),
      facultyRemarks: String(row[14] || ''),
      evaluatedBy: String(row[15] || ''),
      isVerifiedAndApproved: String(row[5] || '') === 'EVALUATED_APPROVED'
    });
  }
  return results;
}

// 8. FETCH ALL LOGIN AUDIT RECORDS FOR MULTI-STUDENT MONITORING
function getLoginAudit() {
  const sheet = getSheet('LoginAudit');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[1] && !row[2]) continue;
    results.push({
      id: 'LOGIN_' + i,
      timestamp: String(row[0] || ''),
      officialEmail: String(row[1] || ''),
      regNo: String(row[2] || ''),
      studentName: String(row[3] || ''),
      personalEmail: String(row[4] || ''),
      deviceId: String(row[5] || ''),
      otherRegNos: String(row[6] || ''),
      status: String(row[7] || 'CLEAR')
    });
  }
  return results;
}

// 8b. FETCH & ENROLL STUDENTS FROM STUDENTS SHEET
function getStudents() {
  const sheet = getSheet('Students');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const email = String(rows[i][0] || '').trim().toLowerCase();
    const regNo = String(rows[i][1] || '').trim().toUpperCase();
    if (!email && !regNo) continue;
    results.push({
      email: email,
      regNo: regNo,
      name: String(rows[i][2] || '').trim(),
      department: String(rows[i][3] || 'Department of Computer Applications').trim()
    });
  }
  return results;
}

function addStudent(payload) {
  if (!payload) return { success: false, error: 'No student payload provided' };
  const email = (payload.email || '').toString().trim().toLowerCase();
  const regNo = (payload.regNo || '').toString().trim().toUpperCase();
  const name = (payload.name || '').toString().trim();
  const dept = (payload.department || 'Department of Computer Applications').toString().trim();
  if (!email || !regNo) return { success: false, error: 'Email and RegNo are required' };

  const sheet = getSheet('Students');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Email', 'RegNo', 'Name', 'Department']);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rEmail = String(rows[i][0] || '').trim().toLowerCase();
    const rReg = String(rows[i][1] || '').trim().toUpperCase();
    if (rEmail === email || rReg === regNo) {
      const range = sheet.getRange(i + 1, 1, 1, 4);
      range.setNumberFormat('@');
      range.setValues([[email, regNo, name, dept]]);
      return { success: true, message: 'Student ' + regNo + ' updated in Students sheet!' };
    }
  }

  sheet.appendRow([email, regNo, name, dept]);
  sheet.getRange(sheet.getLastRow(), 1, 1, 4).setNumberFormat('@');
  return { success: true, message: 'Student ' + regNo + ' added to Students sheet!' };
}

// 9. INITIALIZE ALL 7 SHEETS WITH STANDARD HEADERS (NO SAMPLE DATA)
function setupAllSheets() {
  const exSheet = getSheet('Exercises');
  if (exSheet.getLastRow() === 0) {
    exSheet.appendRow([
      'Exercise ID', 'Title', 'Description', 'Open Time', 'Close Time',
      'Public Input', 'Public Output', 'Private Input', 'Private Output',
      'Starter Code', 'Category', 'Difficulty'
    ]);
    exSheet.getRange(1, 1, 1, 12).setFontWeight('bold');
  }

  const facSheet = getSheet('Faculty');
  if (facSheet.getLastRow() === 0) {
    facSheet.appendRow(['Email', 'Name', 'Department']);
    facSheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  }

  const stuSheet = getSheet('Students');
  if (stuSheet.getLastRow() === 0) {
    stuSheet.appendRow(['Email', 'RegNo', 'Name', 'Department']);
    stuSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  const loginSheet = getSheet('LoginAudit');
  if (loginSheet.getLastRow() === 0) {
    loginSheet.appendRow([
      'Timestamp', 'Official Email', 'Reg No', 'Student Name',
      'Recorded Mail ID', 'Device ID', 'Other RegNos Used', 'Multi-Student Status'
    ]);
    loginSheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  const subSheet = getSheet('Submissions');
  if (subSheet.getLastRow() === 0) {
    subSheet.appendRow([
      'Timestamp', 'Official Email', 'Recorded Mail ID', 'Reg No', 'Student Name',
      'Exercise ID', 'Exercise Title', 'Status', 'Score', 'Device ID', 'Multi-Student Flag', 'Source Code'
    ]);
    subSheet.getRange(1, 1, 1, 12).setFontWeight('bold');
  }

  const vioSheet = getSheet('Violations');
  if (vioSheet.getLastRow() === 0) {
    vioSheet.appendRow([
      'Timestamp', 'Official Email', 'Recorded Mail ID', 'Reg No', 'Student Name',
      'Exercise ID', 'Violation Type', 'Details', 'Severity', 'Device ID'
    ]);
    vioSheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }

  const evalSheet = getSheet('Evaluations');
  if (evalSheet.getLastRow() === 0) {
    evalSheet.appendRow([
      'Timestamp', 'Official Email', 'Recorded Mail ID', 'Reg No', 'Student Name', 'Status',
      'Concept (5)', 'Naming (1)', 'Documentation (1)', 'Output (3)', 'Total Marks (10)',
      'Violations Count', 'Device ID', 'Multi-Student Flag', 'Faculty Remarks', 'Evaluated By'
    ]);
    evalSheet.getRange(1, 1, 1, 16).setFontWeight('bold');
  }

  return { success: true, message: 'All 7 Google Sheet tabs initialized cleanly with headers only (no sample data).' };
}