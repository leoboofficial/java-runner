import { Exercise, StudentRecord, Submission, User, Violation } from '../types';

/**
 * Service to communicate with Google Apps Script Web App (Code.gs)
 * Configured via environment variables (.env) to protect backend from tampering
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
   * Post a new exercise to the Exercises tab
   */
  static async saveExercise(sheetUrl: string, exercise: Exercise): Promise<boolean> {
    if (!sheetUrl || !sheetUrl.startsWith('http')) return false;
    try {
      await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveExercise',
          payload: {
            id: exercise.id,
            title: exercise.title,
            description: exercise.description,
            category: exercise.category || 'Basic Java & Operators',
            difficulty: exercise.difficulty || 'Easy',
            openTime: exercise.openTime,
            closeTime: exercise.closeTime,
            publicInput: exercise.publicInput,
            publicOutput: exercise.publicOutput,
            privateInput: exercise.privateInput,
            privateOutput: exercise.privateOutput,
            starterCode: exercise.starterCode || '',
          },
        }),
      });
      return true;
    } catch (err) {
      console.warn('Failed to sync exercise to Google Sheet:', err);
      return false;
    }
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
