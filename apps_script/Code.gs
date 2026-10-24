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
        "?action=saveExercise&payload=...",
        "?action=login&email=...&regNo=...",
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

    if (e && e.postData && e.postData.contents) {
      try {
        const parsed = JSON.parse(e.postData.contents);
        action = parsed.action;
        payload = parsed.payload;
        email = parsed.email;
        regNo = parsed.regNo;
      } catch (parseErr) {
        // Fallback for form-encoded post
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
      const res = saveExercise(payload);
      return jsonResponse(res);
    }
    if (action === 'submit') {
      const res = saveSubmissionAndViolations(payload);
      return jsonResponse(res);
    }
    if (action === 'login') {
      const res = loginUserManual(email || (payload && payload.email), regNo || (payload && payload.regNo));
      return jsonResponse(res);
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
  if (action === 'saveExercise') {
    let payload = {};
    if (e.parameter.payload) {
      try {
        payload = JSON.parse(e.parameter.payload);
      } catch (pErr) {
        payload = e.parameter;
      }
    } else {
      payload = e.parameter;
    }
    return jsonResponse(saveExercise(payload));
  }
  if (action === 'login') {
    return jsonResponse(loginUserManual(e.parameter.email, e.parameter.regNo));
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
    error: 'Access Denied: Email (' + cleanEmail + ') or Reg No mismatch. Please check credentials in Google Sheet.' 
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

  // Initialize header row if empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(standardHeaders);
    sheet.getRange(1, 1, 1, standardHeaders.length).setFontWeight('bold');
  } else {
    // Check if Starter Code column exists in existing header
    const currentCols = sheet.getLastColumn();
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(currentCols, 1)).getValues()[0].map(function(h) {
      return String(h || '').trim().toLowerCase();
    });
    
    // Ensure all 12 standard columns exist
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
      existingRowIndex = i + 1; // 1-indexed row
      break;
    }
  }

  // Format inputs & starter code safely as strings
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
    targetRange.setNumberFormat('@'); // Force Plain Text so inputs like '10 3' won't convert to dates
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

  // Parse header map
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
    if (!row[idIdx] && !row[titleIdx]) continue; // skip blank rows

    const closeTimeVal = row[closeIdx];
    const close = closeTimeVal ? new Date(closeTimeVal).getTime() : Infinity;

    // Do NOT hide exercises if close time is in future or open time is scheduled
    // This ensures students see scheduled exercises regardless of UTC vs IST server timezones
    const isExpired = !isNaN(close) && close < now && (now - close > 86400000 * 7); // keep for 7 days after close
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
      starterCode: row[starterIdx] !== undefined && row[starterIdx] !== null ? String(row[starterIdx]) : '',
      category: row[catIdx] ? String(row[catIdx]) : 'Basic Java & Operators',
      difficulty: row[diffIdx] ? String(row[diffIdx]) : 'Easy'
    });
  }
  return active;
}

// 4. SUBMIT CODE & BATCH SYNC PROCTORING VIOLATIONS
function saveSubmissionAndViolations(payload) {
  if (!payload) return { success: false, error: 'No submission payload' };
  const email = payload.email || 'student@student.hindustanuniv.ac.in';

  // 1. Record Submission
  getSheet('Submissions').appendRow([
    new Date(), email, payload.regNo || '', payload.exerciseId || '',
    payload.code || '', payload.status || '', payload.publicLog || '', payload.privateLog || ''
  ]);

  // 2. Batch Record Proctoring Violations
  if (payload.violations && payload.violations.length > 0) {
    const violSheet = getSheet('Violations');
    payload.violations.forEach(function(v) {
      violSheet.appendRow([
        new Date(v.time || new Date()), 
        email, 
        payload.regNo || '', 
        payload.exerciseId || '', 
        v.type || 'UNKNOWN', 
        v.details || ''
      ]);
    });
  }
  return { success: true };
}

// 5. INITIALIZE ALL SHEETS WITH STANDARD HEADERS
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
    facSheet.appendRow(['faculty@hindustanuniv.ac.in', 'Dr. Faculty Admin', 'Department of Computer Applications']);
  }

  const stuSheet = getSheet('Students');
  if (stuSheet.getLastRow() === 0) {
    stuSheet.appendRow(['Email', 'RegNo', 'Name', 'Department']);
    stuSheet.appendRow(['student@student.hindustanuniv.ac.in', '2411001', 'Sample Student', 'Department of Computer Applications']);
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
