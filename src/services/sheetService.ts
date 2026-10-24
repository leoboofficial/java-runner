import { Exercise, StudentRecord, Submission, User, Violation } from '../types';

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
    sheetUrl: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    return SheetService.verifyLogin(sheetUrl, email, regNo);
  }

  /**
   * Verify login against Faculty and Students tabs in Google Sheets
   */
  static async verifyLogin(
    sheetUrl: string,
    email: string,
    regNo?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!sheetUrl || !sheetUrl.startsWith('http')) {
      return { success: false, error: 'Google Sheet URL not configured' };
    }
    try {
      const params = new URLSearchParams({
        action: 'login',
        email: email.trim().toLowerCase(),
        regNo: (regNo || '').trim().toUpperCase(),
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
              name: data.name,
              regNo: data.regNo,
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

    // Method 1: Standard POST with text/plain
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
        if (data && data.error) {
          console.warn('Apps Script reported error:', data.error);
        }
      }
    } catch (err) {
      console.warn('POST saveExercise network warning, trying GET fallback:', err);
    }

    // Method 2: GET fallback (bypasses browser POST-redirect CORS restrictions)
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
    try {
      await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'submit',
          payload: {
            email: submission.studentEmail,
            regNo: submission.regNo,
            exerciseId: submission.exerciseId,
            code: submission.code,
            status: submission.status,
            publicLog: submission.publicLog,
            privateLog: submission.privateLog,
            violations: violations.map((v) => ({
              time: v.timestamp,
              type: v.type,
              details: v.details,
            })),
          },
        }),
      });
      return true;
    } catch (err) {
      console.warn('Failed to sync submission to Google Sheet:', err);
      return false;
    }
  }
}
