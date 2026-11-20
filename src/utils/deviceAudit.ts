/**
 * Browser/Device & Personal Mail ID Audit Helper
 * Helps faculty detect if the same student (same Mail ID or same Browser/Device)
 * logs in or submits work using multiple Registration Numbers / Official Emails.
 */

const DEVICE_ID_KEY = 'javalab_pro_device_id';
const RECORDED_MAIL_KEY = 'javalab_pro_recorded_mail_id';
const DEVICE_REGS_KEY = 'javalab_pro_device_regnos';

function computeBrowserSignature(): string {
  if (typeof window === 'undefined') return 'SSR';
  const raw = [
    navigator.platform || '',
    navigator.language || '',
    `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    String(navigator.hardwareConcurrency || ''),
  ].join('|');

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'DEV-SERVER';
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const sig = computeBrowserSignature();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const deviceId = `DEV-${sig}-${rand}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch {
    return `DEV-${computeBrowserSignature()}`;
  }
}

export function getSavedPersonalEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(RECORDED_MAIL_KEY) || '';
  } catch {
    return '';
  }
}

export function savePersonalEmail(email: string): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = email.trim().toLowerCase();
    if (clean) {
      localStorage.setItem(RECORDED_MAIL_KEY, clean);
    }
  } catch {}
}

export function getDeviceUsedRegNos(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEVICE_REGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordSessionOnDevice(regNo: string, personalEmail?: string): {
  deviceId: string;
  otherRegNosOnDevice: string[];
} {
  const deviceId = getOrCreateDeviceId();
  if (personalEmail) {
    savePersonalEmail(personalEmail);
  }
  const cleanReg = (regNo || '').trim().toUpperCase();
  const existing = getDeviceUsedRegNos();
  if (cleanReg && !existing.includes(cleanReg)) {
    const updated = [...existing, cleanReg];
    try {
      localStorage.setItem(DEVICE_REGS_KEY, JSON.stringify(updated));
    } catch {}
    return {
      deviceId,
      otherRegNosOnDevice: existing,
    };
  }
  return {
    deviceId,
    otherRegNosOnDevice: existing.filter((r) => r !== cleanReg),
  };
}
