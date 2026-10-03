/**
 * Official Ninja authentication adapter.
 *
 * Uses only the documented/observed API contract present in the supplied
 * Ninja Android application. It does not fabricate integrity/HMAC values
 * and does not bypass Play Integrity or other server controls.
 */

import {
  NINJA_API_BASE,
  getNinjaSession,
  setNinjaSession,
  type NinjaSession,
} from '../api/ninjaApi';

const INSTALLATION_UID_KEY = 'natan_ninja_installation_uid';

export interface NinjaLoginResult {
  authenticated: boolean;
  requiresOtpVerification: boolean;
  otpVerificationId?: string;
  message?: string;
  session?: NinjaSession;
  raw?: any;
}

function randomUuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function getNinjaInstallationUid(): string {
  try {
    const existing = localStorage.getItem(INSTALLATION_UID_KEY)?.trim();
    if (existing) return existing;
    const id = randomUuid();
    localStorage.setItem(INSTALLATION_UID_KEY, id);
    return id;
  } catch {
    return randomUuid();
  }
}

function pick(obj: any, ...keys: string[]): any {
  for (const key of keys) {
    const value = key.split('.').reduce((v, part) => v?.[part], obj);
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

function normalizeResponse(raw: any): any {
  return raw?.data ?? raw?.result ?? raw ?? {};
}

async function post(path: string, body: any): Promise<{ status: number; data: any }> {
  const response = await fetch(`${NINJA_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': 'en',
      'installation-uid': getNinjaInstallationUid(),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data };
}

function saveSession(raw: any): NinjaSession | null {
  const root = normalizeResponse(raw);
  const jwt = root?.jwt ?? root?.tokens ?? root?.data?.jwt ?? {};
  const accessToken = String(pick(root,
    'accessToken', 'jwtToken', 'token', 'jwt.accessToken', 'jwt.jwtToken', 'data.accessToken', 'data.jwtToken'
  ) ?? '').trim();
  const refreshToken = String(pick(root,
    'refreshToken', 'jwt.refreshToken', 'data.refreshToken'
  ) ?? '').trim();

  if (!accessToken) return null;

  const session: NinjaSession = {
    accessToken,
    refreshToken: refreshToken || undefined,
    deviceId: getNinjaInstallationUid(),
    hmacSecret: undefined,
  };
  setNinjaSession(session);
  return session;
}

export async function loginNinja(email: string, password: string): Promise<NinjaLoginResult> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !password) throw new Error('Ninja email and password are required.');

  const result = await post('/captains/login', {
    email: cleanEmail,
    password,
  });

  const root = normalizeResponse(result.data);
  const requiresOtp = Boolean(pick(root, 'requiresOtpVerification', 'data.requiresOtpVerification'));
  const otpVerificationId = pick(root, 'otpVerificationId', 'data.otpVerificationId');
  const session = saveSession(result.data);

  if (result.status >= 200 && result.status < 300 && session) {
    return { authenticated: true, requiresOtpVerification: false, session, raw: result.data };
  }

  if (requiresOtp || otpVerificationId) {
    return {
      authenticated: false,
      requiresOtpVerification: true,
      otpVerificationId: otpVerificationId ? String(otpVerificationId) : undefined,
      message: pick(root, 'message', 'error'),
      raw: result.data,
    };
  }

  throw new Error(String(pick(root, 'message', 'error') ?? `Ninja login failed (HTTP ${result.status}).`));
}

export async function verifyNinjaOtp(otpVerificationId: string, otp: string): Promise<NinjaLoginResult> {
  const id = otpVerificationId.trim();
  const code = otp.trim();
  if (!id || !code) throw new Error('OTP verification ID and OTP are required.');

  const result = await post(`/otp_verifications/${encodeURIComponent(id)}`, { otp: code });
  const session = saveSession(result.data);
  const root = normalizeResponse(result.data);

  if (result.status >= 200 && result.status < 300 && session) {
    return { authenticated: true, requiresOtpVerification: false, session, raw: result.data };
  }

  throw new Error(String(pick(root, 'message', 'error') ?? `Ninja OTP verification failed (HTTP ${result.status}).`));
}

export async function refreshNinjaToken(): Promise<NinjaSession> {
  const current = getNinjaSession();
  if (!current?.refreshToken) throw new Error('No Ninja refresh token is available.');

  const result = await post('/captains/token/refresh', {
    refreshToken: current.refreshToken,
  });
  const session = saveSession(result.data);
  if (!session) {
    throw new Error(`Ninja token refresh failed (HTTP ${result.status}).`);
  }
  return session;
}

export function logoutNinja(): void {
  setNinjaSession(null);
}
