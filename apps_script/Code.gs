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
        "?action=getSubmissions",
        "?action=getViolations",
        "?action=getStudents",
        "?action=getFaculty",
        "?action=getEvaluations",
        "?action=getLoginAudit",
        "?action=getExamConfig",
        "?action=getRubricTemplates",
        "?action=saveExercise&payload=...",
        "?action=saveExamConfig&payload=...",
        "?action=saveRubricTemplates&payload=...",
        "?action=addStudent&payload=...",
        "?action=saveFaculty&payload=...",
        "?action=saveEvaluation&payload=...",
        "?action=submitLabRecord&payload=...",
        "?action=coordinatorLogin&payload=...",
        "?action=coordinatorChangePassword&payload=...",
        "?action=coordinatorSendOtp&payload=...",
        "?action=coordinatorVerifyOtp&payload=...",
        "?action=coordinatorResetPassword&payload=...",
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
    if (action === 'saveExamConfig') {
      return jsonResponse(saveExamConfig(payload));
    }
    if (action === 'saveRubricTemplates') {
      return jsonResponse(saveRubricTemplates(payload));
    }
    if (action === 'addStudent') {
      return jsonResponse(addStudent(payload));
    }
    if (action === 'saveFaculty') {
      return jsonResponse(saveFaculty(payload));
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
    if (action === 'coordinatorLogin') {
      return jsonResponse(coordinatorLogin(payload));
    }
    if (action === 'coordinatorChangePassword') {
      return jsonResponse(coordinatorChangePassword(payload));
    }
    if (action === 'coordinatorSendOtp') {
      return jsonResponse(coordinatorSendOtp(payload));
    }
    if (action === 'coordinatorVerifyOtp') {
      return jsonResponse(coordinatorVerifyOtp(payload));
    }
    if (action === 'coordinatorResetPassword') {
      return jsonResponse(coordinatorResetPassword(payload));
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
  if (action === 'getSubmissions') {
    return jsonResponse(getSubmissions());
  }
  if (action === 'getViolations') {
    return jsonResponse(getViolations());
  }
  if (action === 'getStudents') {
    return jsonResponse(getStudents());
  }
  if (action === 'getFaculty') {
    return jsonResponse(getFaculty());
  }
  if (action === 'getEvaluations') {
    return jsonResponse(getEvaluations());
  }
  if (action === 'getLoginAudit') {
    return jsonResponse(getLoginAudit());
  }
  if (action === 'getExamConfig') {
    return jsonResponse(getExamConfig());
  }
  if (action === 'getRubricTemplates') {
    return jsonResponse(getRubricTemplates());
  }
  if (action === 'saveExamConfig') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(saveExamConfig(payload));
  }
  if (action === 'saveRubricTemplates') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(saveRubricTemplates(payload));
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
  if (action === 'saveFaculty') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(saveFaculty(payload));
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
  if (action === 'coordinatorLogin') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(coordinatorLogin(payload));
  }
  if (action === 'coordinatorChangePassword') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(coordinatorChangePassword(payload));
  }
  if (action === 'coordinatorSendOtp') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(coordinatorSendOtp(payload));
  }
  if (action === 'coordinatorVerifyOtp') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(coordinatorVerifyOtp(payload));
  }
  if (action === 'coordinatorResetPassword') {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (pErr) { payload = e.parameter; }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(coordinatorResetPassword(payload));
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
        error: 'Access Denied: Official Email (' + cleanEmail + ') is not authorized. The Faculty sheet is currently empty.'
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
        error: 'Access Denied: Official Email (' + cleanEmail + ') is not authorized in the Faculty sheet. Please contact the administrator.'
      };
    }
  }

  // 2. Check Students Sheet (BOTH official email AND RegNo are strictly required)
  if (!cleanReg) {
    return {
      role: 'UNAUTHORIZED',
      error: 'Access Denied: Reg No is required. Please check credentials with your course teacher.'
    };
  }

  const studentSheet = getSheet('Students');
  const studentData = studentSheet.getDataRange().getValues();
  if (studentData.length <= 1) {
    return {
      role: 'UNAUTHORIZED',
      error: 'Access Denied: Official Email (' + cleanEmail + ') or Reg No (' + cleanReg + ') not found. Please check credentials with your course teacher.'
    };
  }

  let emailFoundInStudents = false;
  let regFoundInStudents = false;

  for (let i = 1; i < studentData.length; i++) {
    const sEmail = (studentData[i][0] || '').toString().trim().toLowerCase();
    const sReg = (studentData[i][1] || '').toString().trim().toUpperCase();
    if (sEmail && sEmail === cleanEmail) emailFoundInStudents = true;
    if (sReg && sReg === cleanReg) regFoundInStudents = true;

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

  if (emailFoundInStudents) {
    return {
      role: 'UNAUTHORIZED',
      error: 'Access Denied: Reg No (' + cleanReg + ') mismatch for Official Email (' + cleanEmail + '). Please check credentials with your course teacher.'
    };
  }
  if (regFoundInStudents) {
    return {
      role: 'UNAUTHORIZED',
      error: 'Access Denied: Official Email (' + cleanEmail + ') mismatch for Reg No (' + cleanReg + '). Please check credentials with your course teacher.'
    };
  }

  return {
    role: 'UNAUTHORIZED',
    error: 'Access Denied: Official Email (' + cleanEmail + ') or Reg No (' + cleanReg + ') mismatch. Please check credentials with your course teacher.'
  };
}

// 2. FACULTY: SCHEDULE / UPDATE EXERCISE (WITH STARTER CODE, ASSESSMENT TYPE & PLAIN TEXT PROTECTION)
function saveExercise(data) {
  if (!data) return { success: false, error: 'No exercise payload provided' };

  const sheet = getSheet('Exercises');
  const id = (data.id || ('EX_' + Date.now())).toString().trim();

  const standardHeaders = [
    'Exercise ID', 'Title', 'Description', 'Open Time', 'Close Time',
    'Public Input', 'Public Output', 'Private Input', 'Private Output',
    'Starter Code', 'Category', 'Difficulty', 'Assessment Type'
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
    const refreshedHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(function(h) {
      return String(h || '').trim().toLowerCase();
    });
    if (refreshedHeaders.indexOf('assessment type') === -1) {
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue('Assessment Type').setFontWeight('bold');
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

  const assessmentType = String(data.assessmentType || 'LAB').trim().toUpperCase() === 'ESE' ? 'ESE' : 'LAB';

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
    data.difficulty || 'Easy',
    assessmentType
  ];

  if (existingRowIndex > 0) {
    const targetRange = sheet.getRange(existingRowIndex, 1, 1, rowValues.length);
    targetRange.setNumberFormat('@');
    targetRange.setValues([rowValues]);
    return { success: true, message: assessmentType + ' question ' + id + ' updated successfully!' };
  } else {
    sheet.appendRow(rowValues);
    const newRowIndex = sheet.getLastRow();
    sheet.getRange(newRowIndex, 1, 1, rowValues.length).setNumberFormat('@');
    return { success: true, message: assessmentType + ' question ' + id + ' scheduled successfully!' };
  }
}

// 3. STUDENT & FACULTY: FETCH ACTIVE EXERCISES (WITH STARTER CODE & ASSESSMENT TYPE)
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
  const typeIdx = headers.indexOf('assessment type') !== -1 ? headers.indexOf('assessment type') : 12;

  const now = new Date().getTime();
  const active = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!String(row[idIdx] || '').trim() && !String(row[titleIdx] || '').trim()) continue;

    const closeTimeVal = row[closeIdx];
    const close = closeTimeVal ? new Date(closeTimeVal).getTime() : Infinity;

    const isExpired = !isNaN(close) && close < now && (now - close > 86400000 * 7);
    if (isExpired) continue;

    const rawType = row[typeIdx] ? String(row[typeIdx]).trim().toUpperCase() : 'LAB';

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
      difficulty: row[diffIdx] ? String(row[diffIdx]) : 'Easy',
      assessmentType: rawType === 'ESE' ? 'ESE' : 'LAB'
    });
  }
  return active;
}

// 4. STUDENT & FACULTY: SAVE SUBMISSIONS & VIOLATIONS (RECORDS OFFICIAL EMAIL, PERSONAL MAIL ID, DEVICE ID, ASSESSMENT TYPE)
function saveSubmissionAndViolations(payload) {
  if (!payload) return { success: false, error: 'No payload provided' };

  const sub = payload.submission || payload || {};
  const violations = payload.violations || [];

  const officialEmail = (sub.studentEmail || sub.email || '').toString().trim().toLowerCase();
  const personalMail = (sub.personalEmail || '').toString().trim().toLowerCase();
  const regNo = (sub.regNo || '').toString().trim().toUpperCase();
  const stuName = (sub.studentName || '').toString().trim();
  const deviceId = (sub.deviceId || '').toString().trim();
  const assessmentType = String(sub.assessmentType || 'LAB').trim().toUpperCase() === 'ESE' ? 'ESE' : 'LAB';

  const proxyCheck = detectMultiStudentProxy(regNo, personalMail, deviceId);

  const subSheet = getSheet('Submissions');
  const subHeaders = [
    'Timestamp', 'Official Email', 'Recorded Mail ID', 'Reg No', 'Student Name',
    'Exercise ID', 'Exercise Title', 'Status', 'Score', 'Device ID', 'Multi-Student Flag', 'Source Code', 'Assessment Type'
  ];
  if (subSheet.getLastRow() === 0) {
    subSheet.appendRow(subHeaders);
    subSheet.getRange(1, 1, 1, subHeaders.length).setFontWeight('bold');
  } else if (subSheet.getLastColumn() < 13) {
    subSheet.getRange(1, 13).setValue('Assessment Type').setFontWeight('bold');
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
    sub.sourceCode || sub.code || '',
    assessmentType
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

function getSubmissions() {
  const sheet = getSheet('Submissions');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const officialEmail = String(row[1] || '').trim();
    const regNo = String(row[3] || '').trim();
    if (!officialEmail && !regNo) continue;
    const score = parseFloat(row[8]) || 0;
    const rawType = String(row[12] || 'LAB').trim().toUpperCase();
    results.push({
      id: 'SUB_SHEET_' + i,
      timestamp: String(row[0] || ''),
      studentEmail: officialEmail,
      personalEmail: String(row[2] || '').trim(),
      regNo: regNo,
      studentName: String(row[4] || '').trim(),
      exerciseId: String(row[5] || '').trim(),
      exerciseTitle: String(row[6] || '').trim(),
      status: String(row[7] || 'PENDING').trim(),
      score: score,
      publicPassed: score >= 50,
      privatePassed: score === 100,
      publicLog: '',
      privateLog: '',
      deviceId: String(row[9] || '').trim(),
      multiStudentAlert: String(row[10] || '').trim() === 'CLEAR' ? '' : String(row[10] || '').trim(),
      code: String(row[11] || ''),
      assessmentType: rawType === 'ESE' ? 'ESE' : 'LAB'
    });
  }
  return results.reverse();
}

function getViolations() {
  const sheet = getSheet('Violations');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const officialEmail = String(row[1] || '').trim();
    const regNo = String(row[3] || '').trim();
    const vType = String(row[6] || '').trim();
    if (!officialEmail && !regNo && !vType) continue;
    const rawSeverity = String(row[8] || 'medium').trim().toLowerCase();
    const severity = (rawSeverity === 'low' || rawSeverity === 'high') ? rawSeverity : 'medium';
    results.push({
      id: 'VIO_SHEET_' + i,
      timestamp: String(row[0] || ''),
      studentEmail: officialEmail,
      personalEmail: String(row[2] || '').trim(),
      regNo: regNo,
      studentName: String(row[4] || '').trim(),
      exerciseId: String(row[5] || '').trim(),
      type: vType || 'TAB_SWITCH',
      details: String(row[7] || ''),
      severity: severity,
      deviceId: String(row[9] || '').trim()
    });
  }
  return results.reverse();
}

// 5. STUDENT: SUBMIT LAB RECORD FOR FACULTY RUBRIC EVALUATION
function submitLabRecord(payload) {
  if (!payload) return { success: false, error: 'No payload provided' };
  const sheet = getSheet('Evaluations');

  const headers = [
    'Timestamp', 'Official Email', 'Recorded Mail ID', 'Reg No', 'Student Name', 'Status',
    'Concept (5)', 'Naming (1)', 'Documentation (1)', 'Output (3)', 'Total Marks (10)',
    'Violations Count', 'Device ID', 'Multi-Student Flag', 'Faculty Remarks', 'Evaluated By',
    'Assessment Type', 'Rubric Details JSON'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  } else if (sheet.getLastColumn() < 18) {
    if (sheet.getLastColumn() < 17) sheet.getRange(1, 17).setValue('Assessment Type').setFontWeight('bold');
    sheet.getRange(1, 18).setValue('Rubric Details JSON').setFontWeight('bold');
  }

  const email = (payload.studentEmail || '').toString().trim().toLowerCase();
  const personalMail = (payload.personalEmail || payload.loggedGmail || '').toString().trim().toLowerCase();
  const regNo = (payload.regNo || '').toString().trim().toUpperCase();
  const name = (payload.studentName || '').toString().trim();
  const deviceId = (payload.deviceId || 'UNKNOWN').toString().trim();
  const violationsCount = payload.antiCheatingViolationsCount !== undefined ? String(payload.antiCheatingViolationsCount) : '0';
  const assessmentType = String(payload.assessmentType || 'LAB').trim().toUpperCase() === 'ESE' ? 'ESE' : 'LAB';

  const proxyCheck = detectMultiStudentProxy(regNo, personalMail, deviceId);
  const proxyFlagText = payload.multiStudentAlert || (proxyCheck.isFlagged ? proxyCheck.message : 'CLEAR');

  const rows = sheet.getDataRange().getValues();
  let existingIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const rReg = (rows[i][3] || '').toString().trim().toUpperCase();
    const rType = String(rows[i][16] || 'LAB').trim().toUpperCase();
    if (regNo && rReg === regNo && rType === assessmentType) {
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
    '',
    assessmentType,
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

// 6. FACULTY: EVALUATE LAB RECORD OR ESE PRACTICAL WITH DYNAMIC RUBRICS
function saveEvaluation(payload) {
  if (!payload) return { success: false, error: 'No payload provided' };
  const sheet = getSheet('Evaluations');

  const headers = [
    'Timestamp', 'Official Email', 'Recorded Mail ID', 'Reg No', 'Student Name', 'Status',
    'Concept (5)', 'Naming (1)', 'Documentation (1)', 'Output (3)', 'Total Marks (10)',
    'Violations Count', 'Device ID', 'Multi-Student Flag', 'Faculty Remarks', 'Evaluated By',
    'Assessment Type', 'Rubric Details JSON'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  } else if (sheet.getLastColumn() < 18) {
    if (sheet.getLastColumn() < 17) sheet.getRange(1, 17).setValue('Assessment Type').setFontWeight('bold');
    sheet.getRange(1, 18).setValue('Rubric Details JSON').setFontWeight('bold');
  }

  const email = (payload.studentEmail || '').toString().trim().toLowerCase();
  const personalMail = (payload.personalEmail || payload.loggedGmail || '').toString().trim().toLowerCase();
  const regNo = (payload.regNo || '').toString().trim().toUpperCase();
  const name = (payload.studentName || '').toString().trim();
  const deviceId = (payload.deviceId || 'UNKNOWN').toString().trim();
  const assessmentType = String(payload.assessmentType || 'LAB').trim().toUpperCase() === 'ESE' ? 'ESE' : 'LAB';
  const rubrics = payload.rubrics || payload.rubric || {};
  const dynamicScores = payload.dynamicScores || {};
  const maxTotalMarks = payload.maxTotalMarks !== undefined ? Number(payload.maxTotalMarks) : (assessmentType === 'ESE' ? 50 : 10);

  let dynamicSum = 0;
  const dynKeys = Object.keys(dynamicScores);
  for (let k = 0; k < dynKeys.length; k++) {
    dynamicSum += Number(dynamicScores[dynKeys[k]]) || 0;
  }

  const concept = rubrics.conceptImplemented !== undefined ? String(rubrics.conceptImplemented) : String(dynamicScores.conceptImplemented !== undefined ? dynamicScores.conceptImplemented : '');
  const naming = rubrics.namingConventions !== undefined ? String(rubrics.namingConventions) : String(dynamicScores.namingConventions !== undefined ? dynamicScores.namingConventions : '');
  const doc = rubrics.documentation !== undefined ? String(rubrics.documentation) : String(dynamicScores.documentation !== undefined ? dynamicScores.documentation : '');
  const output = rubrics.output !== undefined ? String(rubrics.output) : String(dynamicScores.output !== undefined ? dynamicScores.output : '');
  const total = rubrics.total !== undefined
    ? String(rubrics.total)
    : (rubrics.totalMarks !== undefined ? String(rubrics.totalMarks) : String(Number(dynamicSum.toFixed(1))));

  const violCount = payload.antiCheatingViolationsCount !== undefined ? String(payload.antiCheatingViolationsCount) : '0';
  const proxyCheck = detectMultiStudentProxy(regNo, personalMail, deviceId);
  const proxyFlagText = payload.multiStudentAlert || (proxyCheck.isFlagged ? proxyCheck.message : 'CLEAR');
  const remarks = payload.facultyRemarks || 'Verified and approved.';
  const evalBy = payload.evaluatedBy || 'Faculty Admin';
  const targetStatus =
    payload.status === 'PENDING_EVALUATION' || payload.isVerifiedAndApproved === false
      ? 'PENDING_EVALUATION'
      : 'EVALUATED_APPROVED';

  const detailsJson = JSON.stringify({
    assessmentType: assessmentType,
    maxTotalMarks: maxTotalMarks,
    dynamicScores: dynamicScores
  });

  const rows = sheet.getDataRange().getValues();
  let existingIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const rReg = (rows[i][3] || '').toString().trim().toUpperCase();
    const rType = String(rows[i][16] || 'LAB').trim().toUpperCase();
    if (regNo && rReg === regNo && rType === assessmentType) {
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
    evalBy,
    assessmentType,
    detailsJson
  ];

  if (existingIndex > 0) {
    const range = sheet.getRange(existingIndex, 1, 1, rowValues.length);
    range.setNumberFormat('@');
    range.setValues([rowValues]);
    return { success: true, message: assessmentType + ' evaluation saved and approved!' };
  } else {
    sheet.appendRow(rowValues);
    const newIdx = sheet.getLastRow();
    sheet.getRange(newIdx, 1, 1, rowValues.length).setNumberFormat('@');
    return { success: true, message: assessmentType + ' evaluation saved and approved!' };
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
    if (!String(row[1] || '').trim() && !String(row[3] || '').trim()) continue;

    const concept = parseFloat(row[6]) || 0;
    const naming = parseFloat(row[7]) || 0;
    const documentation = parseFloat(row[8]) || 0;
    const output = parseFloat(row[9]) || 0;
    const total = parseFloat(row[10]) || (concept + naming + documentation + output);
    const assessmentType = String(row[16] || 'LAB').trim().toUpperCase() === 'ESE' ? 'ESE' : 'LAB';

    let dynamicScores = null;
    let maxTotalMarks = assessmentType === 'ESE' ? 50 : 10;
    if (row[17]) {
      try {
        const parsedDetails = JSON.parse(String(row[17]));
        if (parsedDetails && parsedDetails.dynamicScores) {
          dynamicScores = parsedDetails.dynamicScores;
        }
        if (parsedDetails && parsedDetails.maxTotalMarks) {
          maxTotalMarks = Number(parsedDetails.maxTotalMarks) || maxTotalMarks;
        }
      } catch (jsonErr) {}
    }

    if (!dynamicScores && assessmentType === 'LAB' && String(row[5] || '') === 'EVALUATED_APPROVED') {
      dynamicScores = {
        conceptImplemented: concept,
        namingConventions: naming,
        documentation: documentation,
        output: output
      };
    }

    results.push({
      id: 'EVAL_' + i,
      timestamp: String(row[0] || ''),
      assessmentType: assessmentType,
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
      dynamicScores: dynamicScores || undefined,
      maxTotalMarks: maxTotalMarks,
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
    if (!String(row[1] || '').trim() && !String(row[2] || '').trim()) continue;
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

// ==============================================================================
// 8c. COURSE COORDINATOR: FACULTY / COURSE HANDLERS MANAGEMENT & OTP AUTH
// ==============================================================================
function hashCoordinatorPassword(plain) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(plain || ''), Utilities.Charset.UTF_8);
  let hex = '';
  for (let i = 0; i < raw.length; i++) {
    let b = (raw[i] & 0xff).toString(16);
    if (b.length === 1) b = '0' + b;
    hex += b;
  }
  return hex;
}

function ensureCoordinatorAuthRow() {
  const sheet = getSheet('CoordinatorAuth');
  const headers = ['Username', 'PasswordHash', 'OfficialEmail', 'MustChangePassword', 'OtpCode', 'OtpExpiry', 'UpdatedAt'];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    const defaultRow = [
      'coordinator',
      hashCoordinatorPassword('Admin@123'),
      '',
      'TRUE',
      '',
      '',
      new Date().toISOString()
    ];
    sheet.appendRow(defaultRow);
    sheet.getRange(sheet.getLastRow(), 1, 1, defaultRow.length).setNumberFormat('@');
  }
  const refreshed = sheet.getDataRange().getValues();
  return { sheet: sheet, rowIndex: 2, row: refreshed[1] };
}

function coordinatorLogin(payload) {
  const p = payload || {};
  const username = String(p.username || '').trim().toLowerCase();
  const password = String(p.password || '');
  if (!username || !password) {
    return { success: false, error: 'Username and password are required.' };
  }

  const info = ensureCoordinatorAuthRow();
  const storedUsername = String(info.row[0] || 'coordinator').trim().toLowerCase();
  const storedHash = String(info.row[1] || '').trim();
  const storedEmail = String(info.row[2] || '').trim().toLowerCase();
  const mustChange = String(info.row[3] || 'TRUE').trim().toUpperCase() === 'TRUE';

  if (username !== storedUsername || hashCoordinatorPassword(password) !== storedHash) {
    return { success: false, error: 'Access Denied: Invalid Coordinator username or password.' };
  }

  return {
    success: true,
    role: 'COORDINATOR',
    username: storedUsername,
    email: storedEmail || (storedUsername + '@hindustanuniv.ac.in'),
    officialEmail: storedEmail,
    name: 'Course Coordinator',
    department: 'Course Administration',
    mustChangePassword: mustChange,
    verifiedViaSheet: true
  };
}

function coordinatorChangePassword(payload) {
  const p = payload || {};
  const currentPassword = String(p.currentPassword || '');
  const newPassword = String(p.newPassword || '');
  const officialEmail = String(p.officialEmail || '').trim().toLowerCase();

  if (!currentPassword || !newPassword) {
    return { success: false, error: 'Current password and new password are required.' };
  }
  if (newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters.' };
  }

  const info = ensureCoordinatorAuthRow();
  const storedHash = String(info.row[1] || '').trim();
  if (hashCoordinatorPassword(currentPassword) !== storedHash) {
    return { success: false, error: 'Current password is incorrect.' };
  }

  const updatedEmail = officialEmail || String(info.row[2] || '').trim().toLowerCase();
  info.sheet.getRange(info.rowIndex, 2).setNumberFormat('@').setValue(hashCoordinatorPassword(newPassword));
  if (updatedEmail) {
    info.sheet.getRange(info.rowIndex, 3).setNumberFormat('@').setValue(updatedEmail);
  }
  info.sheet.getRange(info.rowIndex, 4).setNumberFormat('@').setValue('FALSE');
  info.sheet.getRange(info.rowIndex, 7).setNumberFormat('@').setValue(new Date().toISOString());

  return {
    success: true,
    officialEmail: updatedEmail,
    message: 'Coordinator password updated successfully in Google Sheet!'
  };
}

function coordinatorSendOtp(payload) {
  const p = payload || {};
  const cleanEmail = String(p.email || '').trim().toLowerCase();
  if (!cleanEmail || cleanEmail.indexOf('@') === -1) {
    return { success: false, error: 'Please enter a valid official email address.' };
  }

  const info = ensureCoordinatorAuthRow();
  const storedEmail = String(info.row[2] || '').trim().toLowerCase();

  if (storedEmail && cleanEmail !== storedEmail) {
    return {
      success: false,
      error: 'Access Denied: Entered email does not match the registered Coordinator Official Email.'
    };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = String(Date.now() + 10 * 60 * 1000);

  info.sheet.getRange(info.rowIndex, 3).setNumberFormat('@').setValue(cleanEmail);
  info.sheet.getRange(info.rowIndex, 5).setNumberFormat('@').setValue(otp);
  info.sheet.getRange(info.rowIndex, 6).setNumberFormat('@').setValue(expiry);
  info.sheet.getRange(info.rowIndex, 7).setNumberFormat('@').setValue(new Date().toISOString());

  try {
    MailApp.sendEmail({
      to: cleanEmail,
      subject: 'JavaLabPro - Course Coordinator Password Reset OTP',
      body:
        'Hello Course Coordinator,\n\n' +
        'Your One-Time Password (OTP) to reset your JavaLabPro Course Coordinator password is:\n\n' +
        '    ' + otp + '\n\n' +
        'This OTP is valid for 10 minutes.\n\n' +
        'If you did not request this reset, please ignore this email.\n\n' +
        'Regards,\nJavaLabPro Portal'
    });
  } catch (mailErr) {
    return {
      success: false,
      error: 'Failed to send OTP email: ' + mailErr.toString() + '. Run setupAllSheets() in Apps Script to authorize email sending and redeploy a New version.'
    };
  }

  return {
    success: true,
    message: 'A 6-digit OTP has been sent to ' + cleanEmail + '. Please check your inbox.'
  };
}

function coordinatorVerifyOtp(payload) {
  const p = payload || {};
  const cleanEmail = String(p.email || '').trim().toLowerCase();
  const cleanOtp = String(p.otp || '').trim();

  if (!cleanEmail || !cleanOtp) {
    return { success: false, error: 'Official email and 6-digit OTP are required.' };
  }

  const info = ensureCoordinatorAuthRow();
  const storedEmail = String(info.row[2] || '').trim().toLowerCase();
  const storedOtp = String(info.row[4] || '').trim();
  const storedExpiry = Number(info.row[5] || 0);

  if (!storedOtp || (storedEmail && cleanEmail !== storedEmail)) {
    return { success: false, error: 'Invalid OTP request. Please request a new OTP.' };
  }
  if (Date.now() > storedExpiry) {
    return { success: false, error: 'OTP has expired. Please request a new OTP.' };
  }
  if (cleanOtp !== storedOtp) {
    return { success: false, error: 'Invalid OTP code. Please verify and try again.' };
  }

  return {
    success: true,
    message: 'OTP verified successfully. Enter your new password below.'
  };
}

function coordinatorResetPassword(payload) {
  const p = payload || {};
  const cleanEmail = String(p.email || '').trim().toLowerCase();
  const cleanOtp = String(p.otp || '').trim();
  const newPassword = String(p.newPassword || '');

  if (!cleanEmail || !cleanOtp || !newPassword) {
    return { success: false, error: 'Email, OTP, and new password are required.' };
  }
  if (newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters.' };
  }

  const verified = coordinatorVerifyOtp({ email: cleanEmail, otp: cleanOtp });
  if (!verified.success) {
    return verified;
  }

  const info = ensureCoordinatorAuthRow();
  info.sheet.getRange(info.rowIndex, 2).setNumberFormat('@').setValue(hashCoordinatorPassword(newPassword));
  info.sheet.getRange(info.rowIndex, 4).setNumberFormat('@').setValue('FALSE');
  info.sheet.getRange(info.rowIndex, 5).setNumberFormat('@').setValue('');
  info.sheet.getRange(info.rowIndex, 6).setNumberFormat('@').setValue('');
  info.sheet.getRange(info.rowIndex, 7).setNumberFormat('@').setValue(new Date().toISOString());

  return {
    success: true,
    message: 'Password reset successfully! You can now sign in with your new password.'
  };
}

function getFaculty() {
  const sheet = getSheet('Faculty');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const email = String(rows[i][0] || '').trim().toLowerCase();
    const name = String(rows[i][1] || '').trim();
    const department = String(rows[i][2] || 'Department of Computer Applications').trim();
    if (!email && !name) continue;
    results.push({
      email: email,
      name: name,
      department: department
    });
  }
  return results;
}

function saveFaculty(payload) {
  if (!payload) return { success: false, error: 'No course handler payload provided.' };
  const cleanEmail = String(payload.email || '').trim().toLowerCase();
  const cleanName = String(payload.name || '').trim();
  const cleanDept = String(payload.department || 'Department of Computer Applications').trim();
  const originalEmail = String(payload.originalEmail || '').trim().toLowerCase();

  if (!cleanEmail || !cleanName || !cleanDept) {
    return { success: false, error: 'Email, Name, and Department are all required.' };
  }

  const sheet = getSheet('Faculty');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Email', 'Name', 'Department']);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  }

  const rows = sheet.getDataRange().getValues();
  const lookupEmail = originalEmail || cleanEmail;
  let targetRowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    const rowEmail = String(rows[i][0] || '').trim().toLowerCase();
    if (rowEmail === lookupEmail) {
      targetRowIndex = i + 1;
      break;
    }
  }

  if (originalEmail && originalEmail !== cleanEmail) {
    for (let i = 1; i < rows.length; i++) {
      const rowEmail = String(rows[i][0] || '').trim().toLowerCase();
      if (rowEmail === cleanEmail && (i + 1) !== targetRowIndex) {
        return { success: false, error: 'Another course teacher already uses email: ' + cleanEmail };
      }
    }
  }

  if (targetRowIndex > 0) {
    const range = sheet.getRange(targetRowIndex, 1, 1, 3);
    range.setNumberFormat('@');
    range.setValues([[cleanEmail, cleanName, cleanDept]]);
    return { success: true, message: 'Updated course teacher "' + cleanName + '" in Faculty sheet!' };
  }

  sheet.appendRow([cleanEmail, cleanName, cleanDept]);
  sheet.getRange(sheet.getLastRow(), 1, 1, 3).setNumberFormat('@');
  return { success: true, message: 'Added course teacher "' + cleanName + '" to Faculty sheet!' };
}

// ==============================================================================
// 8d. EXAM MODE CONFIG (LAB vs ESE) & DYNAMIC RUBRIC TEMPLATES
// ==============================================================================
function ensureExamConfig() {
  const sheet = getSheet('ExamConfig');
  const headers = ['ConfigKey', 'ConfigValue', 'UpdatedBy', 'UpdatedAt'];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  const rows = sheet.getDataRange().getValues();
  const hasMode = rows.some(function(r, idx) { return idx > 0 && String(r[0] || '').trim() === 'ESE_MODE'; });
  const hasTitle = rows.some(function(r, idx) { return idx > 0 && String(r[0] || '').trim() === 'ESE_TITLE'; });

  if (!hasMode) {
    sheet.appendRow(['ESE_MODE', 'FALSE', 'System', new Date().toISOString()]);
    sheet.getRange(sheet.getLastRow(), 1, 1, 4).setNumberFormat('@');
  }
  if (!hasTitle) {
    sheet.appendRow(['ESE_TITLE', 'End Semester Practical Examination', 'System', new Date().toISOString()]);
    sheet.getRange(sheet.getLastRow(), 1, 1, 4).setNumberFormat('@');
  }
  return sheet;
}

function getExamConfig() {
  const sheet = ensureExamConfig();
  const rows = sheet.getDataRange().getValues();
  let eseEnabled = false;
  let eseTitle = 'End Semester Practical Examination';
  let updatedBy = '';
  let updatedAt = '';

  for (let i = 1; i < rows.length; i++) {
    const key = String(rows[i][0] || '').trim();
    const val = String(rows[i][1] || '').trim();
    if (key === 'ESE_MODE') {
      eseEnabled = val.toUpperCase() === 'TRUE';
      updatedBy = String(rows[i][2] || '');
      updatedAt = String(rows[i][3] || '');
    } else if (key === 'ESE_TITLE' && val) {
      eseTitle = val;
    }
  }

  return {
    eseEnabled: eseEnabled,
    eseTitle: eseTitle,
    updatedBy: updatedBy,
    updatedAt: updatedAt
  };
}

function saveExamConfig(payload) {
  const p = payload || {};
  const sheet = ensureExamConfig();
  const eseEnabledStr = p.eseEnabled ? 'TRUE' : 'FALSE';
  const eseTitle = String(p.eseTitle || 'End Semester Practical Examination').trim();
  const updatedBy = String(p.updatedBy || 'Faculty Admin').trim();
  const nowStr = new Date().toISOString();

  const rows = sheet.getDataRange().getValues();
  let modeRow = -1;
  let titleRow = -1;
  for (let i = 1; i < rows.length; i++) {
    const key = String(rows[i][0] || '').trim();
    if (key === 'ESE_MODE') modeRow = i + 1;
    if (key === 'ESE_TITLE') titleRow = i + 1;
  }

  if (modeRow > 0) {
    const r1 = sheet.getRange(modeRow, 1, 1, 4);
    r1.setNumberFormat('@');
    r1.setValues([['ESE_MODE', eseEnabledStr, updatedBy, nowStr]]);
  } else {
    sheet.appendRow(['ESE_MODE', eseEnabledStr, updatedBy, nowStr]);
    sheet.getRange(sheet.getLastRow(), 1, 1, 4).setNumberFormat('@');
  }

  if (titleRow > 0) {
    const r2 = sheet.getRange(titleRow, 1, 1, 4);
    r2.setNumberFormat('@');
    r2.setValues([['ESE_TITLE', eseTitle, updatedBy, nowStr]]);
  } else {
    sheet.appendRow(['ESE_TITLE', eseTitle, updatedBy, nowStr]);
    sheet.getRange(sheet.getLastRow(), 1, 1, 4).setNumberFormat('@');
  }

  return {
    success: true,
    eseEnabled: Boolean(p.eseEnabled),
    eseTitle: eseTitle,
    message: p.eseEnabled
      ? 'ESE Practical Mode ENABLED. Students now view ESE questions.'
      : 'ESE Practical Mode DISABLED. Students now view regular Lab Exercises.'
  };
}

function ensureRubricTemplates() {
  const sheet = getSheet('RubricTemplates');
  const headers = ['AssessmentType', 'CriterionId', 'Label', 'Description', 'MaxMarks', 'AutoRule', 'DisplayOrder'];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    const defaults = [
      ['LAB', 'conceptImplemented', 'Concept Implemented', 'Correct Java OOP logic, Scanner, and control structures', '5', 'CODE_IMPLEMENTATION', '1'],
      ['LAB', 'namingConventions', 'Naming Conventions', 'Standard camelCase variables and PascalCase classes', '1', 'DOCUMENTATION', '2'],
      ['LAB', 'documentation', 'Documentation', 'Comments, Aim, and written algorithm / procedure', '1', 'DOCUMENTATION', '3'],
      ['LAB', 'output', 'Output Accuracy', 'Public and hidden test case execution passes', '3', 'OUTPUT_TESTS', '4'],
      ['ESE', 'algorithm', 'Algorithm & Problem Analysis', 'Logical approach, edge case handling, and class structure', '10', 'DOCUMENTATION', '1'],
      ['ESE', 'implementation', 'Program Implementation', 'Java 17 syntax, OOP design, and modular code quality', '20', 'CODE_IMPLEMENTATION', '2'],
      ['ESE', 'execution', 'Execution & Test Output', 'Public and hidden private test case verification', '15', 'OUTPUT_TESTS', '3'],
      ['ESE', 'viva', 'Viva-Voce & Explanation', 'Oral examination and code defense during practical exam', '5', 'MANUAL', '4']
    ];
    for (let i = 0; i < defaults.length; i++) {
      sheet.appendRow(defaults[i]);
      sheet.getRange(sheet.getLastRow(), 1, 1, 7).setNumberFormat('@');
    }
  }
  return sheet;
}

function getRubricTemplates() {
  const sheet = ensureRubricTemplates();
  const rows = sheet.getDataRange().getValues();
  const lab = [];
  const ese = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const type = String(r[0] || 'LAB').trim().toUpperCase();
    const id = String(r[1] || ('crit_' + i)).trim();
    const label = String(r[2] || '').trim();
    if (!label) continue;
    const item = {
      id: id,
      label: label,
      description: String(r[3] || '').trim(),
      maxMarks: Number(r[4]) || 0,
      autoRule: String(r[5] || 'MANUAL').trim()
    };
    if (type === 'ESE') {
      ese.push(item);
    } else {
      lab.push(item);
    }
  }

  return { LAB: lab, ESE: ese };
}

function saveRubricTemplates(payload) {
  const p = payload || {};
  const labList = Array.isArray(p.LAB) ? p.LAB : [];
  const eseList = Array.isArray(p.ESE) ? p.ESE : [];

  const sheet = ensureRubricTemplates();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 7).clearContent();
  }

  const allRows = [];
  for (let i = 0; i < labList.length; i++) {
    const c = labList[i];
    allRows.push([
      'LAB',
      String(c.id || ('lab_' + (i + 1))),
      String(c.label || 'Criterion'),
      String(c.description || ''),
      String(c.maxMarks || 0),
      String(c.autoRule || 'MANUAL'),
      String(i + 1)
    ]);
  }
  for (let j = 0; j < eseList.length; j++) {
    const e = eseList[j];
    allRows.push([
      'ESE',
      String(e.id || ('ese_' + (j + 1))),
      String(e.label || 'Criterion'),
      String(e.description || ''),
      String(e.maxMarks || 0),
      String(e.autoRule || 'MANUAL'),
      String(j + 1)
    ]);
  }

  if (allRows.length > 0) {
    const targetRange = sheet.getRange(2, 1, allRows.length, 7);
    targetRange.setNumberFormat('@');
    targetRange.setValues(allRows);
  }

  return {
    success: true,
    message: 'LAB and ESE rubric criteria saved to RubricTemplates sheet!'
  };
}

// 9. INITIALIZE ALL 10 SHEETS WITH STANDARD HEADERS (NO SAMPLE COURSE DATA)
function setupAllSheets() {
  const exSheet = getSheet('Exercises');
  if (exSheet.getLastRow() === 0) {
    exSheet.appendRow([
      'Exercise ID', 'Title', 'Description', 'Open Time', 'Close Time',
      'Public Input', 'Public Output', 'Private Input', 'Private Output',
      'Starter Code', 'Category', 'Difficulty', 'Assessment Type'
    ]);
    exSheet.getRange(1, 1, 1, 13).setFontWeight('bold');
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
      'Exercise ID', 'Exercise Title', 'Status', 'Score', 'Device ID', 'Multi-Student Flag', 'Source Code', 'Assessment Type'
    ]);
    subSheet.getRange(1, 1, 1, 13).setFontWeight('bold');
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
      'Violations Count', 'Device ID', 'Multi-Student Flag', 'Faculty Remarks', 'Evaluated By',
      'Assessment Type', 'Rubric Details JSON'
    ]);
    evalSheet.getRange(1, 1, 1, 18).setFontWeight('bold');
  }

  ensureCoordinatorAuthRow();
  ensureExamConfig();
  ensureRubricTemplates();

  return { success: true, message: 'All 10 Google Sheet tabs initialized cleanly (including ExamConfig & RubricTemplates).' };
}