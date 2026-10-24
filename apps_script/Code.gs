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
    endpoints: ["?action=getActiveExercises", "?action=login&email=...&regNo=...", "?action=setup"]
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
  if (action === 'setup') {
    return jsonResponse(setupAllSheets());
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
  const facultySheet = getSheet('Faculty');
  const facultyData = facultySheet.getDataRange().getValues();
  for (let i = 1; i < facultyData.length; i++) {
    const fEmail = (facultyData[i][0] || '').toString().trim().toLowerCase();
    if (fEmail === cleanEmail) {
      return { 
        role: 'FACULTY', 
        email: cleanEmail, 
        name: facultyData[i][1] || 'Faculty Member' 
      };
    }
  }

  // Check Students Sheet
  const studentSheet = getSheet('Students');
  const studentData = studentSheet.getDataRange().getValues();
  for (let i = 1; i < studentData.length; i++) {
    const sEmail = (studentData[i][0] || '').toString().trim().toLowerCase();
    const sReg = (studentData[i][1] || '').toString().trim().toUpperCase();
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

// 2. FACULTY: SCHEDULE / UPDATE EXERCISE (WITH STARTER CODE)
function saveExercise(data) {
  const sheet = getSheet('Exercises');
  const id = data.id || ('EX_' + Date.now());

  // Ensure header row exists with Column J = Starter Code
  const headers = [
    'Exercise ID', 'Title', 'Description', 'Open Time', 'Close Time',
    'Public Input', 'Public Output', 'Private Input', 'Private Output',
    'Starter Code', 'Category', 'Difficulty'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    // If existing header row does not have Starter Code in Column 10, update header
    const currentHeader = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 12)).getValues()[0];
    if (!currentHeader[9] || currentHeader[9].toString().trim() === '') {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  const rows = sheet.getDataRange().getValues();
  let existingRowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    const rowId = (rows[i][0] || '').toString().trim();
    const rowTitle = (rows[i][1] || '').toString().trim().toLowerCase();
    if (rowId === id.trim() || (data.title && rowTitle === data.title.trim().toLowerCase())) {
      existingRowIndex = i + 1; // 1-indexed row in SpreadsheetApp
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
    sheet.getRange(existingRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    return { success: true, message: 'Exercise ' + id + ' updated successfully with Starter Code!' };
  } else {
    sheet.appendRow(rowValues);
    return { success: true, message: 'Exercise ' + id + ' scheduled successfully with Starter Code!' };
  }
}

// 3. STUDENT & FACULTY: FETCH ACTIVE EXERCISES (INCLUDES STARTER CODE)
function getActiveExercises() {
  const sheet = getSheet('Exercises');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const now = new Date().getTime();
  const active = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && !row[1]) continue; // skip blank rows

    const openTimeVal = row[3];
    const closeTimeVal = row[4];
    const open = openTimeVal ? new Date(openTimeVal).getTime() : 0;
    const close = closeTimeVal ? new Date(closeTimeVal).getTime() : Infinity;

    // Check if within time window (or if timestamps are not yet specified)
    const isActive = (isNaN(open) || now >= open) && (isNaN(close) || now <= close);

    if (isActive) {
      active.push({
        id: String(row[0] || ('EX_' + i)),
        title: String(row[1] || ''),
        description: String(row[2] || ''),
        openTime: row[3] ? String(row[3]) : '',
        closeTime: row[4] ? String(row[4]) : '',
        publicInput: row[5] !== undefined ? String(row[5]) : '',
        publicOutput: row[6] !== undefined ? String(row[6]) : '',
        privateInput: row[7] !== undefined ? String(row[7]) : '',
        privateOutput: row[8] !== undefined ? String(row[8]) : '',
        starterCode: row[9] !== undefined && row[9] !== null ? String(row[9]) : '',
        category: row[10] ? String(row[10]) : 'Basic Java & Operators',
        difficulty: row[11] ? String(row[11]) : 'Easy'
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

// 5. HELPER: SETUP ALL TAB HEADERS
function setupAllSheets() {
  const exSheet = getSheet('Exercises');
  if (exSheet.getLastRow() === 0) {
    exSheet.appendRow([
      'Exercise ID', 'Title', 'Description', 'Open Time', 'Close Time',
      'Public Input', 'Public Output', 'Private Input', 'Private Output',
      'Starter Code', 'Category', 'Difficulty'
    ]);
  }

  const facSheet = getSheet('Faculty');
  if (facSheet.getLastRow() === 0) {
    facSheet.appendRow(['Email', 'Name', 'Department']);
  }

  const stuSheet = getSheet('Students');
  if (stuSheet.getLastRow() === 0) {
    stuSheet.appendRow(['Email', 'RegNo', 'Name', 'Department']);
  }

  const subSheet = getSheet('Submissions');
  if (subSheet.getLastRow() === 0) {
    subSheet.appendRow(['Timestamp', 'Email', 'RegNo', 'Exercise ID', 'Code', 'Status', 'Public Log', 'Private Log']);
  }

  const vioSheet = getSheet('Violations');
  if (vioSheet.getLastRow() === 0) {
    vioSheet.appendRow(['Timestamp', 'Email', 'RegNo', 'Exercise ID', 'Violation Type', 'Details']);
  }

  return { success: true, message: 'All sheets initialized with standard headers.' };
}
