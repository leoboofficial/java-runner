/**
 * Google Identity Services helper for automatically reading the verified
 * Google / Gmail account signed in on the student's browser/device
 * when VITE_GOOGLE_CLIENT_ID is configured.
 */

let gsiLoadPromise: Promise<void> | null = null;

export function isGoogleAuthConfigured(): boolean {
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  return typeof clientId === 'string' && clientId.trim().length > 10;
}

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
  if (gsiLoadPromise) return gsiLoadPromise;

  gsiLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In script.'));
    document.head.appendChild(script);
  });

  return gsiLoadPromise;
}

export async function fetchDeviceGoogleEmail(): Promise<string> {
  const clientId = ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) return '';

  await loadGsiScript();

  return new Promise((resolve, reject) => {
    const oauth2 = (window as any).google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error('Google OAuth client unavailable.'));
      return;
    }

    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/userinfo.email',
      callback: async (tokenResponse: any) => {
        if (tokenResponse?.error || !tokenResponse?.access_token) {
          reject(new Error(tokenResponse?.error_description || 'Google account verification cancelled.'));
          return;
        }
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          });
          if (!res.ok) {
            reject(new Error('Could not read Google account email.'));
            return;
          }
          const profile = await res.json();
          resolve((profile?.email || '').trim().toLowerCase());
        } catch (err: any) {
          reject(new Error(err?.message || 'Failed to fetch Google account info.'));
        }
      },
      error_callback: (err: any) => {
        reject(new Error(err?.message || 'Google Sign-In popup blocked or closed.'));
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
}
