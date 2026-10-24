// ==============================================================================
// Google Apps Script (Code.gs) for JavaLabPro Headless REST API & Database
// Course: BCB52003 - Object Oriented Programming Lab
// Institution: Hindustan Institute of Technology and Science (Deemed to be University)
// ==============================================================================

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleApiGet(e);
  }
  return jsonResponse({
    status: "online",
    message: "JavaLabPro Google Apps Script Headless API is online.",
    endpoints: ["?action=getActiveExercises", "?action=login&email=...&regNo=..."]
  });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    if (action === 'saveExercise') {
      const res = saveExercise(data.payload);
      return jsonResponse(res);
    }
    if (action === 'submit') {
      const res = saveSubmissionAndViolations(data.payload);
      return jsonResponse(res);
    }
    if (action === 'login') {
      const res = loginUserManual(data.email, data.regNo);
      return jsonResponse(res);
    }
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function handleApiGet(e) {
  const action = e.parameter.action;
  if (action === 'getActiveExercises') {
    return jsonResponse(getActiveExercises());
  }
  if (action === 'login') {
    return jsonResponse(loginUserManual(e.parameter.email, e.parameter.regNo));
  }
  return jsonResponse({ error: 'Unknown action' });
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

// 1. VERIFY DETAILS & AUTHENTICATION
function loginUserManual(email, regNo) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanReg = (regNo || '').trim().toUpperCase();

  // Check Faculty Sheet
  const facultyData = getSheet('Faculty').getDataRange().getValues();
  for (let i = 1; i < facultyData.length; i++) {
    const fEmail = facultyData[i][0].toString().trim().toLowerCase();
    if (fEmail === cleanEmail) {
      return { 
        role: 'FACULTY', 
        email: cleanEmail, 
        name: facultyData[i][1] || 'Faculty Member' 
      };
    }
  }

  // Check Students Sheet
  const studentData = getSheet('Students').getDataRange().getValues();
  for (let i = 1; i < studentData.length; i++) {
    const sEmail = studentData[i][0].toString().trim().toLowerCase();
    const sReg = studentData[i][1].toString().trim().toUpperCase();
    if (sEmail === cleanEmail && (!cleanReg || sReg === cleanReg)) {
      return { 
        role: 'STUDENT', 
        email: cleanEmail, 
        regNo: sReg, 
        name: studentData[i][2] || 'Student' 
      };
    }
  }

  return { 
    role: 'UNAUTHORIZED', 
    error: 'Access Denied: Email (' + cleanEmail + ') or Reg No mismatch. Please check your credentials in the Google Sheet.' 
  };
}

// 2. FACULTY: SCHEDULE EXERCISE
function saveExercise(data) {
  const sheet = getSheet('Exercises');
  const id = 'EX_' + Date.now();
  sheet.appendRow([
    id, data.title, data.description,
    data.openTime, data.closeTime,
    data.publicInput, data.publicOutput,
    data.privateInput, data.privateOutput
  ]);
  return { success: true, message: 'Exercise ' + id + ' scheduled successfully!' };
}

// 3. STUDENT: FETCH ACTIVE EXERCISES
function getActiveExercises() {
  const rows = getSheet('Exercises').getDataRange().getValues();
  const now = new Date().getTime();
  const active = [];
  for (let i = 1; i < rows.length; i++) {
    const open = new Date(rows[i][3]).getTime();
    const close = new Date(rows[i][4]).getTime();
    if (now >= open && now <= close) {
      active.push({
        id: rows[i][0],
        title: rows[i][1],
        description: rows[i][2],
        openTime: rows[i][3],
        closeTime: rows[i][4],
        publicInput: rows[i][5],
        publicOutput: rows[i][6],
        privateInput: rows[i][7],
        privateOutput: rows[i][8]
      });
    }
  }
  return active;
}

// 4. SUBMIT CODE & BATCH SYNC PROCTORING VIOLATIONS
function saveSubmissionAndViolations(payload) {
  const email = payload.email || 'student@student.hindustanuniv.ac.in';

  // 1. Record Submission
  getSheet('Submissions').appendRow([
    new Date(), email, payload.regNo, payload.exerciseId,
    payload.code, payload.status, payload.publicLog, payload.privateLog
  ]);

  // 2. Batch Record Proctoring Violations
  if (payload.violations && payload.violations.length > 0) {
    const violSheet = getSheet('Violations');
    payload.violations.forEach(v => {
      violSheet.appendRow([
        new Date(v.time || new Date()), 
        email, 
        payload.regNo, 
        payload.exerciseId, 
        v.type, 
        v.details
      ]);
    });
  }
  return { success: true };
}
