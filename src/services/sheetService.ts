import {
  Exercise,
  StudentRecord,
  Submission,
  User,
  Violation,
  StudentLabRecordSubmission,
  LoginAuditRecord,
} from '../types';

/**
 * Service to communicate with Google Apps Script Web App (Code.gs)
 * Configured via environment variables (.env) or localStorage
 */
export class SheetService {
  /**
   * Fetch active exercises from Google Sheets via Apps Script GET
   */
  static async fetchActiveExercises(sheetUrl: string): Promise<Exercise[]> {
    if (!sheetUrl || !sheetUrl.startsWith('http')) return [];
    try {
      const url = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}action=getActiveExercises&t=${Date.now()}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return data.map((item: any, idx: number) => ({
            id: item.id || `EX_${idx + 1}`,
            title: item.title || `Exercise ${idx + 1}`,
            description: item.description || '',
            category: item.category || 'Basic Java & Operators',
            difficulty: (item.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Easy',
            openTime: item.openTime || new Date(Date.now() - 3600000).toISOString(),
            closeTime: item.closeTime || new Date(Date.now() + 3600000 * 24 * 30).toISOString(),
            publicInput: item.publicInput !== undefined ? String(item.publicInput) : '',
            publicOutput: item.publicOutput !== undefined ? String(item.publicOutput) : '',
            privateInput: item.privateInput !== undefined ? String(item.privateInput) : '',
            privateOutput: item.privateOutput !== undefined ? String(item.privateOutput) : '',
            starterCode: item.starterCode || item.starter_code || item.starter || '',
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch active exercises from Google Sheets:', err);
    }
    return [];
  }

  /**
   * Helper login wrapper for AuthModal
   */
  static async login(
    email: string,
    regNo: string,
    sheetUrl: string,
    personalEmail?: string,
    deviceId?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    return SheetService.verifyLogin(sheetUrl, email, regNo, personalEmail, deviceId);
  }

  /**
   * Verify login against Faculty and Students tabs in Google Sheets,
   * recording Student Personal Mail ID & Device ID in LoginAudit.
   */
  static async verifyLogin(
    sheetUrl: string,
    email: string,
    regNo?: string,
    personalEmail?: string,
    deviceId?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!sheetUrl || !sheetUrl.startsWith('http')) {
      return { success: false, error: 'Google Sheet URL not configured' };
    }
    try {
      const params = new URLSearchParams({
        action: 'login',
        email: email.trim().toLowerCase(),
        regNo: (regNo || '').trim().toUpperCase(),
        personalEmail: (personalEmail || '').trim().toLowerCase(),
        deviceId: (deviceId || '').trim(),
      });
      const url = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}${params.toString()}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.role && data.role !== 'UNAUTHORIZED') {
          return {
            success: true,
            user: {
              role: data.role,
              email: data.email,
              personalEmail: data.personalEmail || personalEmail?.trim().toLowerCase(),
              deviceId: data.deviceId || deviceId,
              multiStudentAlert: data.multiStudentAlert || '',
              name: data.name,
              regNo: data.regNo,
              department: data.department,
            },
          };
        }
        return { success: false, error: data.error || 'Authentication denied by Google Sheet.' };
      }
    } catch (err: any) {
      return { success: false, error: `Connection to Google Sheet failed: ${err.message}` };
    }
    return { success: false, error: 'Unable to reach Google Sheet.' };
  }

  /**
   * Post a new exercise to the Exercises tab (with GET fallback if CORS redirect is blocked)
   */
  static async saveExercise(sheetUrl: string, exercise: Exercise): Promise<{ success: boolean; message?: string }> {
    if (!sheetUrl || !sheetUrl.startsWith('http')) {
      return { success: false, message: 'Google Sheets URL is not configured' };
    }

    const payload = {
      id: exercise.id,
      title: exercise.title,
      description: exercise.description,
      category: exercise.category || 'Basic Java & Operators',
      difficulty: exercise.difficulty || 'Easy',
      openTime: exercise.openTime,
      closeTime: exercise.closeTime,
      publicInput: exercise.publicInput !== undefined ? String(exercise.publicInput) : '',
      publicOutput: exercise.publicOutput !== undefined ? String(exercise.publicOutput) : '',
      privateInput: exercise.privateInput !== undefined ? String(exercise.privateInput) : '',
      privateOutput: exercise.privateOutput !== undefined ? String(exercise.privateOutput) : '',
      starterCode: exercise.starterCode || '',
    };

    try {
      const response = await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveExercise',
          payload,
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.success) {
          return { success: true, message: data.message };
        }
      }
    } catch (err) {
      console.warn('POST saveExercise network warning, trying GET fallback:', err);
    }

    try {
      const encodedPayload = encodeURIComponent(JSON.stringify(payload));
      const getUrl = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}action=saveExercise&payload=${encodedPayload}&t=${Date.now()}`;
      const response = await fetch(getUrl);
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.success) {
          return { success: true, message: data.message };
        }
      }
    } catch (fallbackErr) {
      console.warn('GET fallback saveExercise failed:', fallbackErr);
    }

    return { success: false, message: 'Could not connect to Google Apps Script. Check Web App deployment permissions.' };
  }

  /**
   * Save submission and batch sync proctoring violations to Submissions and Violations tabs
   */
  static async saveSubmission(
    sheetUrl: string,
    submission: Submission,
    violations: Violation[]
  ): Promise<boolean> {
    if (!sheetUrl || !sheetUrl.startsWith('http')) return false;
    const payload = {
      submission: {
        timestamp: submission.timestamp || new Date().toISOString(),
        studentEmail: submission.studentEmail,
        personalEmail: submission.personalEmail || '',
        deviceId: submission.deviceId || '',
        regNo: submission.regNo,
        studentName: submission.studentName || '',
        exerciseId: submission.exerciseId,
        exerciseTitle: submission.exerciseTitle || '',
        status: submission.status,
        score: submission.score,
        sourceCode: submission.code,
      },
      violations: violations.map((v) => ({
        timestamp: v.timestamp,
        studentEmail: v.studentEmail || submission.studentEmail,
        personalEmail: v.personalEmail || submission.personalEmail || '',
        deviceId: v.deviceId || submission.deviceId || '',
        regNo: v.regNo || submission.regNo,
        studentName: v.studentName || submission.studentName || '',
        exerciseId: v.exerciseId || submission.exerciseId,
        type: v.type,
        details: v.details,
        severity: v.severity,
      })),
    };

    try {
      const response = await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'submit',
          payload,
        }),
      });
      if (response.ok) {
        return true;
      }
    } catch (err) {
      console.warn('POST saveSubmission failed, trying GET fallback:', err);
    }

    try {
      const compactPayload = {
        ...payload,
        submission: {
          ...payload.submission,
          sourceCode: (payload.submission.sourceCode || '').slice(0, 1200),
        },
      };
      const encoded = encodeURIComponent(JSON.stringify(compactPayload));
      const getUrl = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}action=submit&payload=${encoded}&t=${Date.now()}`;
      const res = await fetch(getUrl);
      if (res.ok) return true;
    } catch (getErr) {
      console.warn('Failed to sync submission to Google Sheet:', getErr);
    }
    return false;
  }

  /**
   * Student: Submit full Lab Record to Google Sheet for Faculty Rubric Evaluation
   */
  static async submitLabRecord(
    sheetUrl: string,
    record: StudentLabRecordSubmission
  ): Promise<{ success: boolean; message?: string }> {
    if (!sheetUrl || !sheetUrl.startsWith('http')) {
      return { success: false, message: 'Google Sheet URL not configured' };
    }

    const payload = {
      id: record.id,
      studentEmail: record.studentEmail,
      personalEmail: record.personalEmail || record.loggedGmail || '',
      deviceId: record.deviceId || '',
      multiStudentAlert: record.multiStudentAlert || '',
      regNo: record.regNo,
      studentName: record.studentName,
      completedExercisesCount: record.completedExercisesCount,
      totalExercisesCount: record.totalExercisesCount,
      antiCheatingViolationsCount: record.antiCheatingViolationsCount,
      timestamp: record.timestamp || new Date().toISOString(),
    };

    try {
      const response = await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'submitLabRecord', payload }),
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.success) {
          return { success: true, message: data.message };
        }
      }
    } catch (err) {
      console.warn('POST submitLabRecord failed, trying GET fallback:', err);
    }

    try {
      const encoded = encodeURIComponent(JSON.stringify(payload));
      const getUrl = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}action=submitLabRecord&payload=${encoded}&t=${Date.now()}`;
      const response = await fetch(getUrl);
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.success) {
          return { success: true, message: data.message };
        }
      }
    } catch (getErr) {
      console.warn('GET fallback submitLabRecord failed:', getErr);
    }

    return { success: false, message: 'Could not sync record to Google Sheet.' };
  }

  /**
   * Faculty: Save 10-Mark Rubric Evaluation to Google Sheet (Evaluations tab)
   */
  static async saveEvaluation(
    sheetUrl: string,
    evaluation: StudentLabRecordSubmission
  ): Promise<{ success: boolean; message?: string }> {
    if (!sheetUrl || !sheetUrl.startsWith('http')) {
      return { success: false, message: 'Google Sheet URL not configured' };
    }

    const payload = {
      id: evaluation.id,
      studentEmail: evaluation.studentEmail,
      personalEmail: evaluation.personalEmail || evaluation.loggedGmail || '',
      deviceId: evaluation.deviceId || '',
      multiStudentAlert: evaluation.multiStudentAlert || '',
      regNo: evaluation.regNo,
      studentName: evaluation.studentName,
      status: evaluation.status,
      rubrics: evaluation.rubrics,
      antiCheatingViolationsCount: evaluation.antiCheatingViolationsCount,
      facultyRemarks: evaluation.facultyRemarks,
      evaluatedBy: evaluation.evaluatedBy,
      evaluatedAt: evaluation.evaluatedAt || new Date().toISOString(),
    };

    try {
      const response = await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveEvaluation', payload }),
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.success) {
          return { success: true, message: data.message };
        }
      }
    } catch (err) {
      console.warn('POST saveEvaluation failed, trying GET fallback:', err);
    }

    try {
      const encoded = encodeURIComponent(JSON.stringify(payload));
      const getUrl = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}action=saveEvaluation&payload=${encoded}&t=${Date.now()}`;
      const response = await fetch(getUrl);
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.success) {
          return { success: true, message: data.message };
        }
      }
    } catch (getErr) {
      console.warn('GET fallback saveEvaluation failed:', getErr);
    }

    return { success: false, message: 'Failed to record evaluation in Google Sheet.' };
  }

  /**
   * Fetch all rubric evaluations from Google Sheets
   */
  static async fetchEvaluations(sheetUrl: string): Promise<StudentLabRecordSubmission[]> {
    if (!sheetUrl || !sheetUrl.startsWith('http')) return [];
    try {
      const url = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}action=getEvaluations&t=${Date.now()}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch evaluations from Google Sheets:', err);
    }
    return [];
  }

  /**
   * Fetch all student LoginAudit records (Mail ID & Device ID tracking) from Google Sheets
   */
  static async fetchLoginAudit(sheetUrl: string): Promise<LoginAuditRecord[]> {
    if (!sheetUrl || !sheetUrl.startsWith('http')) return [];
    try {
      const url = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}action=getLoginAudit&t=${Date.now()}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch LoginAudit from Google Sheets:', err);
    }
    return [];
  }
}
