import { AppAuthSession } from '../types';

// ============================================================
// NATAN API CONFIG
// ============================================================

const API_BASE_URL =
  (import.meta.env.VITE_NATAN_API_URL as string | undefined)
    ?.replace(/\/+$/, '') ||
  'https://natan-server.onrender.com';

// ============================================================
// STORAGE KEYS
// ============================================================

const DEVICE_STORAGE_KEY = 'natan_device_id';
const TOKEN_STORAGE_KEY = 'natan_auth_token';
const AUTH_SESSION_KEY = 'natan_auth_session';
const BIOMETRIC_SESSION_KEY = 'natan_biometric_session';
const BIOMETRIC_ENABLED_KEY = 'natan_biometric_enabled';

// ============================================================
// TYPES
// ============================================================

type ApiResponse<T = any> = {
  success?: boolean;
  message?: string;
  error?: string;

  token?: string;
  accessToken?: string;

  user?: any;
  data?: T;

  plan?: any;

  expiresAt?: string | number | null;
  expires_at?: string | number | null;

  activationExpiresAt?: string | number | null;
  activation_expires_at?: string | number | null;

  requiresActivation?: boolean;
  alreadyActivated?: boolean;
  expired?: boolean;

  isActivated?: boolean;
  is_activated?: boolean;
  activated?: boolean;

  userId?: string;
  user_id?: string;

  username?: string;
  email?: string | null;
  phone?: string | null;

  [key: string]: any;
};

// ============================================================
// SPECIAL AUTH ERROR
// ============================================================

export class NatanActivationRequiredError extends Error {
  requiresActivation = true;

  userId?: string;
  username?: string;
  email?: string | null;
  phone?: string | null;

  constructor(result: ApiResponse) {
    super(
      result?.message ||
        'يجب تفعيل الحساب قبل استخدام الميزات المحمية.'
    );

    this.name = 'NatanActivationRequiredError';

    this.userId =
      result?.userId ??
      result?.user_id ??
      result?.user?.id ??
      result?.user?.user_id;

    this.username =
      result?.username ??
      result?.user?.username;

    this.email =
      result?.email ??
      result?.user?.email;

    this.phone =
      result?.phone ??
      result?.user?.phone;
  }
}

// ============================================================
// REQUEST
// ============================================================

async function request<T = ApiResponse>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,

      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    }
  );

  let result: any = null;

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  // ----------------------------------------------------------
  // HTTP ERROR
  // ----------------------------------------------------------

  if (!response.ok) {
    if (result?.requiresActivation === true) {
      throw new NatanActivationRequiredError(result);
    }

    throw new Error(
      result?.message ||
        result?.error ||
        `خطأ في الخادم: HTTP ${response.status}`
    );
  }

  // ----------------------------------------------------------
  // APPLICATION ERROR
  // ----------------------------------------------------------

  if (result?.success === false) {
    if (result?.requiresActivation === true) {
      throw new NatanActivationRequiredError(result);
    }

    throw new Error(
      result?.message ||
        result?.error ||
        'فشل تنفيذ العملية.'
    );
  }

  return result as T;
}

// ============================================================
// TOKEN HELPERS
// ============================================================

function getTokenFromResponse(
  result: ApiResponse
): string {
  const candidates = [
    result?.token,
    result?.accessToken,

    result?.data?.token,
    result?.data?.accessToken,

    result?.user?.token,
    result?.user?.accessToken,

    result?.data?.user?.token,
    result?.data?.user?.accessToken,
  ];

  for (const value of candidates) {
    const token = String(value ?? '').trim();

    if (token) {
      return token;
    }
  }

  return '';
}

// ============================================================
// USER HELPERS
// ============================================================

function getUserFromResponse(
  result: ApiResponse
): any {
  if (result?.user) {
    return result.user;
  }

  if (result?.data?.user) {
    return result.data.user;
  }

  if (
    result?.data &&
    typeof result.data === 'object' &&
    !Array.isArray(result.data)
  ) {
    return result.data;
  }

  return null;
}

// ============================================================
// BOOLEAN HELPER
// ============================================================

function parseBoolean(
  value: unknown
): boolean | undefined {
  if (value === true || value === 1) {
    return true;
  }

  if (value === false || value === 0) {
    return false;
  }

  if (typeof value === 'string') {
    const normalized = value
      .trim()
      .toLowerCase();

    if (
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'yes'
    ) {
      return true;
    }

    if (
      normalized === 'false' ||
      normalized === '0' ||
      normalized === 'no'
    ) {
      return false;
    }
  }

  return undefined;
}

// ============================================================
// TIMESTAMP PARSER
// ============================================================

function parseTimestamp(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  // ----------------------------------------------------------
  // NUMBER
  // ----------------------------------------------------------

  if (typeof value === 'number') {
    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return null;
    }

    // Seconds -> milliseconds
    if (value < 100000000000) {
      return value * 1000;
    }

    return value;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  // ----------------------------------------------------------
  // NUMERIC STRING
  // ----------------------------------------------------------

  if (/^\d+$/.test(text)) {
    const numeric = Number(text);

    if (
      !Number.isFinite(numeric) ||
      numeric <= 0
    ) {
      return null;
    }

    if (numeric < 100000000000) {
      return numeric * 1000;
    }

    return numeric;
  }

  // ----------------------------------------------------------
  // ISO / DATE STRING
  // ----------------------------------------------------------

  const parsed = new Date(text).getTime();

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

// ============================================================
// SESSION CONVERTER
//
// Accepts:
// 1. User object
// 2. Complete API response user object
//
// Used by:
// - Login
// - Activation
// - Biometric restoration
// - /api/auth/me
// ============================================================

function convertUserToSession(
  user: any,
  token: string,
  apiResult?: ApiResponse
): AppAuthSession {
  const safeUser = user || {};
  const safeResult = apiResult || {};

  const normalizedToken =
    String(token || '').trim();

  // ----------------------------------------------------------
  // ACTIVATION STATUS
  // ----------------------------------------------------------

  const explicitActivation =
    parseBoolean(
      safeUser?.is_activated
    ) ??
    parseBoolean(
      safeUser?.isActivated
    ) ??
    parseBoolean(
      safeUser?.activated
    ) ??
    parseBoolean(
      safeUser?.is_active
    ) ??
    parseBoolean(
      safeResult?.is_activated
    ) ??
    parseBoolean(
      safeResult?.isActivated
    ) ??
    parseBoolean(
      safeResult?.activated
    );

  let isActivated =
    explicitActivation === true;

  // ----------------------------------------------------------
  // SERVER SAYS ACTIVATION IS REQUIRED
  // ----------------------------------------------------------

  if (
    safeResult?.requiresActivation === true
  ) {
    isActivated = false;
  }

  // ----------------------------------------------------------
  // ACTIVATED AT
  // ----------------------------------------------------------

  const activatedAt =
    parseTimestamp(
      safeUser?.activated_at ??
        safeUser?.activatedAt ??
        safeResult?.activated_at ??
        safeResult?.activatedAt
    ) ?? undefined;

  /*
   * إذا لم يرسل الخادم isActivated صراحة،
   * لكن لديه activatedAt، نعتبر الحساب مفعلاً.
   */

  if (
    explicitActivation === undefined &&
    activatedAt
  ) {
    isActivated = true;
  }

  // ----------------------------------------------------------
  // EXPIRY
  // ----------------------------------------------------------

  const rawExpiry =
    safeUser?.activation_expires_at ??
    safeUser?.activationExpiresAt ??
    safeUser?.expires_at ??
    safeUser?.expiresAt ??
    safeResult?.activation_expires_at ??
    safeResult?.activationExpiresAt ??
    safeResult?.expires_at ??
    safeResult?.expiresAt ??
    null;

  /*
   * الحساب غير المفعّل:
   * expiresAt = null
   *
   * لا ننشئ تاريخاً افتراضياً من عندنا.
   */

  const expiresAt =
    isActivated
      ? parseTimestamp(rawExpiry)
      : null;

  // ----------------------------------------------------------
  // MAX DEVICES
  // ----------------------------------------------------------

  const rawMaxDevices =
    safeUser?.max_devices ??
    safeUser?.maxDevices ??
    safeResult?.max_devices ??
    safeResult?.maxDevices ??
    1;

  const parsedMaxDevices =
    Number(rawMaxDevices);

  const maxDevices =
    Number.isFinite(parsedMaxDevices) &&
    parsedMaxDevices > 0
      ? parsedMaxDevices
      : 1;

  // ----------------------------------------------------------
  // CREATED AT
  // ----------------------------------------------------------

  const createdAt =
    safeUser?.created_at ??
    safeUser?.createdAt ??
    safeResult?.created_at ??
    safeResult?.createdAt ??
    undefined;

  // ----------------------------------------------------------
  // USER ID
  // ----------------------------------------------------------

  const userId =
    safeUser?.id ??
    safeUser?.user_id ??
    safeUser?.userId ??
    safeResult?.userId ??
    safeResult?.user_id ??
    undefined;

  // ----------------------------------------------------------
  // USERNAME
  // ----------------------------------------------------------

  const username =
    safeUser?.username ??
    safeUser?.user_name ??
    safeResult?.username ??
    '';

  // ----------------------------------------------------------
  // FULL NAME
  // ----------------------------------------------------------

  const fullName =
    safeUser?.full_name ??
    safeUser?.fullName ??
    safeResult?.fullName ??
    safeResult?.full_name ??
    '';

  // ----------------------------------------------------------
  // EMAIL
  // ----------------------------------------------------------

  const email =
    safeUser?.email ??
    safeResult?.email ??
    undefined;

  // ----------------------------------------------------------
  // PHONE
  // ----------------------------------------------------------

  const phone =
    safeUser?.phone ??
    safeResult?.phone ??
    undefined;

  // ----------------------------------------------------------
  // PLAN
  // ----------------------------------------------------------

  const planObject =
    safeUser?.plan ??
    safeResult?.plan ??
    {};

  const planName =
    safeUser?.plan_name ??
    safeUser?.planName ??
    planObject?.name ??
    safeResult?.planName ??
    'NATAN';

  // ----------------------------------------------------------
  // LICENSE / ACTIVATION CODE
  // ----------------------------------------------------------

  const licenseKey =
    safeUser?.activation_code ??
    safeUser?.activationCode ??
    safeUser?.license_key ??
    safeUser?.licenseKey ??
    safeResult?.activationCode ??
    safeResult?.activation_code ??
    '';

  // ----------------------------------------------------------
  // DEVICE
  // ----------------------------------------------------------

  const deviceId =
    safeUser?.device_id ??
    safeUser?.deviceId ??
    safeResult?.deviceId ??
    undefined;

  // ----------------------------------------------------------
  // HARDWARE BINDING
  // ----------------------------------------------------------

  const boundHardware =
    safeUser?.bound_hardware ??
    safeUser?.boundHardware ??
    (
      maxDevices === 1
        ? 'Locked-to-Single-Device'
        : `${maxDevices} Device(s)`
    );

  // ----------------------------------------------------------
  // AUTHENTICATED
  // ----------------------------------------------------------

  const explicitAuthenticated =
    parseBoolean(
      safeUser?.is_authenticated
    ) ??
    parseBoolean(
      safeUser?.isAuthenticated
    ) ??
    parseBoolean(
      safeResult?.is_authenticated
    ) ??
    parseBoolean(
      safeResult?.isAuthenticated
    );

  const isAuthenticated =
    explicitAuthenticated ??
    !!normalizedToken;

  // ----------------------------------------------------------
  // FINAL SESSION
  // ----------------------------------------------------------

  return {
    isAuthenticated,

    isActivated,

    username:
      String(username || '').trim(),

    fullName:
      String(fullName || '').trim(),

    email:
      email
        ? String(email).trim()
        : undefined,

    phone:
      phone
        ? String(phone).trim()
        : undefined,

    userId:
      userId
        ? String(userId)
        : undefined,

    createdAt,

    activatedAt,

    expiresAt,

    licenseKey:
      String(licenseKey || '').trim(),

    planName:
      String(planName || 'NATAN').trim(),

    deviceId:
      deviceId
        ? String(deviceId)
        : undefined,

    boundHardware,

    maxDevices,

    token:
      normalizedToken || undefined,
  };
}

// ============================================================
// DEVICE ID
// ============================================================

export async function getNatanDeviceId(): Promise<string> {
  try {
    const existing =
      localStorage.getItem(
        DEVICE_STORAGE_KEY
      );

    if (
      existing &&
      existing.trim()
    ) {
      return existing.trim();
    }

    let deviceId = '';

    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      deviceId =
        crypto.randomUUID();
    } else {
      deviceId =
        `natan-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 12)}`;
    }

    localStorage.setItem(
      DEVICE_STORAGE_KEY,
      deviceId
    );

    return deviceId;
  } catch {
    return (
      `natan-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 12)}`
    );
  }
}

// ============================================================
// REGISTER
// ============================================================

export async function registerNatanUser(
  params: {
    username: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    city?: string;
    deviceId?: string;
    deviceName?: string;
    platform?: string;
    appVersion?: string;
  }
): Promise<ApiResponse> {
  const username =
    String(
      params.username ?? ''
    ).trim();

  const fullName =
    String(
      params.fullName ?? ''
    ).trim();

  const email =
    String(
      params.email ?? ''
    )
      .trim()
      .toLowerCase();

  const phone =
    String(
      params.phone ?? ''
    ).trim();

  const password =
    String(
      params.password ?? ''
    );

  const confirmPassword =
    String(
      params.confirmPassword ?? ''
    );

  // ----------------------------------------------------------
  // USERNAME
  // ----------------------------------------------------------

  if (!username) {
    throw new Error(
      'يرجى إدخال اسم المستخدم.'
    );
  }

  if (username.length < 3) {
    throw new Error(
      'اسم المستخدم يجب أن يكون 3 أحرف أو أرقام على الأقل.'
    );
  }

  if (
    !/^[a-zA-Z0-9_.-]+$/.test(
      username
    )
  ) {
    throw new Error(
      'اسم المستخدم يجب أن يحتوي على أحرف أو أرقام أو _ أو - أو . فقط.'
    );
  }

  // ----------------------------------------------------------
  // FULL NAME
  // ----------------------------------------------------------

  if (!fullName) {
    throw new Error(
      'يرجى إدخال الاسم الكامل.'
    );
  }

  // ----------------------------------------------------------
  // EMAIL
  // ----------------------------------------------------------

  if (!email) {
    throw new Error(
      'يرجى إدخال البريد الإلكتروني.'
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw new Error(
      'يرجى إدخال بريد إلكتروني صحيح.'
    );
  }

  // ----------------------------------------------------------
  // PHONE
  // ----------------------------------------------------------

  if (!phone) {
    throw new Error(
      'يرجى إدخال رقم الهاتف.'
    );
  }

  // ----------------------------------------------------------
  // PASSWORD
  // ----------------------------------------------------------

  if (!password) {
    throw new Error(
      'يرجى إدخال كلمة المرور.'
    );
  }

  if (password.length < 6) {
    throw new Error(
      'كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل.'
    );
  }

  if (
    password !==
    confirmPassword
  ) {
    throw new Error(
      'كلمتا المرور غير متطابقتين.'
    );
  }

  // ----------------------------------------------------------
  // DEVICE
  // ----------------------------------------------------------

  const deviceId =
    params.deviceId ||
    await getNatanDeviceId();

  if (!deviceId) {
    throw new Error(
      'تعذر الحصول على معرف الجهاز.'
    );
  }

  // ----------------------------------------------------------
  // REGISTER
  //
  // لا نرسل activationCode هنا.
  //
  // الحساب يسمح له بتسجيل الدخول،
  // لكن الميزات المحمية تحتاج إلى التفعيل.
  // ----------------------------------------------------------

  return request<ApiResponse>(
    '/api/auth/register',
    {
      method: 'POST',

      body: JSON.stringify({
        username,
        fullName,
        email,
        phone,
        password,

        city:
          params.city ||
          undefined,

        deviceId,

        deviceName:
          params.deviceName ||
          'NATAN Android',

        platform:
          params.platform ||
          'android',

        appVersion:
          params.appVersion ||
          '4.0.0',
      }),
    }
  );
}

// ============================================================
// LOGIN
// ============================================================

export async function loginNatanUser(
  params: {
    username: string;
    password: string;
    deviceId?: string;
    deviceName?: string;
    platform?: string;
    appVersion?: string;
  }
): Promise<AppAuthSession> {
  const username =
    String(
      params.username ?? ''
    ).trim();

  const password =
    String(
      params.password ?? ''
    );

  if (!username) {
    throw new Error(
      'يرجى إدخال اسم المستخدم أو البريد الإلكتروني أو رقم الهاتف.'
    );
  }

  if (!password) {
    throw new Error(
      'يرجى إدخال كلمة المرور.'
    );
  }

  // ----------------------------------------------------------
  // DEVICE
  // ----------------------------------------------------------

  const deviceId =
    params.deviceId ||
    await getNatanDeviceId();

  if (!deviceId) {
    throw new Error(
      'تعذر الحصول على معرف الجهاز.'
    );
  }

  // ----------------------------------------------------------
  // LOGIN REQUEST
  // ----------------------------------------------------------

  const result =
    await request<ApiResponse>(
      '/api/auth/login',
      {
        method: 'POST',

        body: JSON.stringify({
          username,
          password,
          deviceId,

          deviceName:
            params.deviceName ||
            'NATAN Android',

          platform:
            params.platform ||
            'android',

          appVersion:
            params.appVersion ||
            '4.0.0',
        }),
      }
    );

  // ----------------------------------------------------------
  // ACTIVATION REQUIRED
  // ----------------------------------------------------------

  if (
    result?.requiresActivation === true
  ) {
    throw new NatanActivationRequiredError(
      result
    );
  }

  // ----------------------------------------------------------
  // TOKEN
  // ----------------------------------------------------------

  const token =
    getTokenFromResponse(
      result
    );

  if (!token) {
    throw new Error(
      result?.message ||
        'لم يتم استلام رمز الدخول من الخادم.'
    );
  }

  // ----------------------------------------------------------
  // USER
  // ----------------------------------------------------------

  const user =
    getUserFromResponse(
      result
    );

  if (!user) {
    throw new Error(
      result?.message ||
        'لم يتم استلام بيانات المستخدم من الخادم.'
    );
  }

  // ----------------------------------------------------------
  // CREATE SESSION
  // ----------------------------------------------------------

  const session =
    convertUserToSession(
      user,
      token,
      result
    );

  if (
    !session.userId
  ) {
    throw new Error(
      'تم تسجيل الدخول ولكن الخادم لم يرجع معرف المستخدم.'
    );
  }

  if (
    !session.token
  ) {
    throw new Error(
      'تم تسجيل الدخول ولكن رمز الجلسة غير موجود.'
    );
  }

  return session;
}

// ============================================================
// ACTIVATION
// ============================================================

export async function activateNatanUser(
  params: {
    username?: string;
    email?: string;
    phone?: string;
    identifier?: string;
    activationCode: string;
    deviceId?: string;
  }
): Promise<AppAuthSession> {
  const identifier =
    String(
      params.identifier ||
        params.username ||
        params.email ||
        params.phone ||
        ''
    ).trim();

  const activationCode =
    String(
      params.activationCode ?? ''
    )
      .trim()
      .toUpperCase();

  if (!identifier) {
    throw new Error(
      'يرجى إدخال اسم المستخدم أو البريد الإلكتروني أو رقم الهاتف.'
    );
  }

  if (!activationCode) {
    throw new Error(
      'يرجى إدخال كود التفعيل.'
    );
  }

  const deviceId =
    params.deviceId ||
    await getNatanDeviceId();

  if (!deviceId) {
    throw new Error(
      'تعذر الحصول على معرف الجهاز.'
    );
  }

  // ----------------------------------------------------------
  // ACTIVATION REQUEST
  // ----------------------------------------------------------

  const result =
    await request<ApiResponse>(
      '/api/auth/activate',
      {
        method: 'POST',

        body: JSON.stringify({
          identifier,
          activationCode,
          deviceId,
        }),
      }
    );

  // ----------------------------------------------------------
  // ACTIVATION RESPONSE
  // ----------------------------------------------------------

  if (
    result?.success === false
  ) {
    throw new Error(
      result?.message ||
        result?.error ||
        'فشل تفعيل الحساب.'
    );
  }

  // ----------------------------------------------------------
  // TOKEN
  // ----------------------------------------------------------

  const token =
    getTokenFromResponse(
      result
    );

  if (!token) {
    throw new Error(
      result?.message ||
        'تمت عملية التفعيل ولكن لم يتم استلام رمز الدخول.'
    );
  }

  // ----------------------------------------------------------
  // USER
  // ----------------------------------------------------------

  const user =
    getUserFromResponse(
      result
    );

  if (!user) {
    throw new Error(
      'تمت عملية التفعيل ولكن لم يتم استلام بيانات المستخدم.'
    );
  }

  // ----------------------------------------------------------
  // EXPIRY
  // ----------------------------------------------------------

  const returnedExpiry =
    user?.expires_at ??
    user?.expiresAt ??
    user?.activation_expires_at ??
    user?.activationExpiresAt ??
    result?.expires_at ??
    result?.expiresAt ??
    result?.activation_expires_at ??
    result?.activationExpiresAt ??
    null;

  // ----------------------------------------------------------
  // CREATE ACTIVATED SESSION
  // ----------------------------------------------------------

  const session =
    convertUserToSession(
      {
        ...user,

        is_activated: true,

        expires_at:
          returnedExpiry,
      },

      token,

      {
        ...result,

        is_activated: true,

        expires_at:
          returnedExpiry,
      }
    );

  // ----------------------------------------------------------
  // SAFETY CHECK
  // ----------------------------------------------------------

  if (
    !session.isActivated
  ) {
    throw new Error(
      'تمت العملية لكن حالة التفعيل لم يتم تأكيدها من الخادم.'
    );
  }

  if (
    !session.expiresAt
  ) {
    throw new Error(
      'تم التفعيل، لكن الخادم لم يرجع تاريخ انتهاء التفعيل بشكل صحيح.'
    );
  }

  if (
    session.expiresAt <=
    Date.now()
  ) {
    throw new Error(
      'تاريخ انتهاء التفعيل الذي أعاده الخادم غير صالح.'
    );
  }

  return session;
}

// ============================================================
// FORGOT PASSWORD
// ============================================================

export async function forgotNatanPassword(
  username: string
) {
  const cleanUsername =
    String(
      username ?? ''
    ).trim();

  if (!cleanUsername) {
    throw new Error(
      'يرجى إدخال اسم المستخدم أو البريد الإلكتروني أو رقم الهاتف.'
    );
  }

  return request<ApiResponse>(
    '/api/auth/forgot-password',
    {
      method: 'POST',

      body: JSON.stringify({
        username:
          cleanUsername,
      }),
    }
  );
}

// ============================================================
// RESET PASSWORD
// ============================================================

export async function resetNatanPassword(
  params: {
    token: string;
    newPassword: string;
  }
) {
  const token =
    String(
      params.token ?? ''
    ).trim();

  const newPassword =
    String(
      params.newPassword ?? ''
    );

  if (!token) {
    throw new Error(
      'رمز استعادة كلمة المرور غير موجود.'
    );
  }

  if (
    newPassword.length < 6
  ) {
    throw new Error(
      'كلمة المرور الجديدة يجب أن تكون 6 أحرف أو أرقام على الأقل.'
    );
  }

  return request<ApiResponse>(
    '/api/auth/reset-password',
    {
      method: 'POST',

      body: JSON.stringify({
        token,
        newPassword,
      }),
    }
  );
}

// ============================================================
// GET CURRENT USER
// ============================================================

export async function getNatanMe(
  token: string
) {
  const cleanToken =
    String(
      token ?? ''
    ).trim();

  if (!cleanToken) {
    throw new Error(
      'رمز الدخول غير موجود.'
    );
  }

  return request<ApiResponse>(
    '/api/auth/me',
    {
      method: 'GET',

      headers: {
        Authorization:
          `Bearer ${cleanToken}`,
      },
    }
  );
}

// ============================================================
// GET CURRENT USER AS SESSION
//
// تستخدم لاستعادة جلسة البصمة.
//
// IMPORTANT:
// لا نعتمد على البيانات القديمة فقط.
// يتم التحقق من JWT مع السيرفر.
// ============================================================

export async function getNatanSession(
  token: string
): Promise<AppAuthSession> {
  const cleanToken =
    String(
      token ?? ''
    ).trim();

  if (!cleanToken) {
    throw new Error(
      'رمز الدخول غير موجود.'
    );
  }

  const result =
    await getNatanMe(
      cleanToken
    );

  if (
    result?.requiresActivation === true
  ) {
    throw new NatanActivationRequiredError(
      result
    );
  }

  if (
    result?.success === false
  ) {
    throw new Error(
      result?.message ||
        result?.error ||
        'تعذر التحقق من جلسة NATAN.'
    );
  }

  const user =
    getUserFromResponse(
      result
    );

  if (!user) {
    throw new Error(
      result?.message ||
        'تعذر الحصول على بيانات المستخدم من الخادم.'
    );
  }

  // ----------------------------------------------------------
  // REBUILD SESSION FROM SERVER
  // ----------------------------------------------------------

  const session =
    convertUserToSession(
      user,
      cleanToken,
      result
    );

  if (
    !session.isAuthenticated
  ) {
    throw new Error(
      'جلسة NATAN غير مصادق عليها.'
    );
  }

  if (
    !session.userId
  ) {
    throw new Error(
      'الخادم لم يرجع معرف المستخدم للجلسة الحالية.'
    );
  }

  if (
    !session.token
  ) {
    throw new Error(
      'الخادم لم يرجع رمز الجلسة.'
    );
  }

  return session;
}

// ============================================================
// SERVER HEALTH
// ============================================================

export async function checkNatanServer() {
  return request<ApiResponse>(
    '/api/health',
    {
      method: 'GET',
    }
  );
}

// ============================================================
// API BASE URL
// ============================================================

export function getNatanApiBaseUrl() {
  return API_BASE_URL;
}

// ============================================================
// TOKEN STORAGE
// ============================================================

export function saveNatanToken(
  token: string
) {
  try {
    const cleanToken =
      String(
        token || ''
      ).trim();

    if (!cleanToken) {
      localStorage.removeItem(
        TOKEN_STORAGE_KEY
      );
      return;
    }

    localStorage.setItem(
      TOKEN_STORAGE_KEY,
      cleanToken
    );
  } catch {
    // Ignore storage errors.
  }
}

export function getSavedNatanToken(): string {
  try {
    return (
      localStorage.getItem(
        TOKEN_STORAGE_KEY
      ) || ''
    ).trim();
  } catch {
    return '';
  }
}

export function clearNatanToken() {
  try {
    localStorage.removeItem(
      TOKEN_STORAGE_KEY
    );
  } catch {
    // Ignore storage errors.
  }
}

// ============================================================
// SAVE COMPLETE SESSION
//
// يحفظ:
// - JWT
// - auth session
// - biometric session
// ============================================================

export function saveNatanSession(
  session: AppAuthSession
) {
  try {
    if (
      !session ||
      !session.isAuthenticated
    ) {
      return;
    }

    const token =
      String(
        session?.token || ''
      ).trim();

    if (!token) {
      return;
    }

    // JWT
    saveNatanToken(
      token
    );

    // Complete session
    const serialized =
      JSON.stringify(
        session
      );

    // Normal authentication session
    localStorage.setItem(
      AUTH_SESSION_KEY,
      serialized
    );

    // Biometric restoration session
    localStorage.setItem(
      BIOMETRIC_SESSION_KEY,
      serialized
    );
  } catch {
    // Ignore storage errors.
  }
}

// ============================================================
// GET SAVED SESSION
// ============================================================

export function getSavedNatanSession():
  AppAuthSession | null {
  try {
    const saved =
      localStorage.getItem(
        AUTH_SESSION_KEY
      );

    if (!saved) {
      return null;
    }

    const session =
      JSON.parse(
        saved
      ) as AppAuthSession;

    if (
      !session ||
      !session.isAuthenticated ||
      !session.token ||
      !session.userId
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

// ============================================================
// GET BIOMETRIC SESSION
// ============================================================

export function getSavedNatanBiometricSession():
  AppAuthSession | null {
  try {
    const saved =
      localStorage.getItem(
        BIOMETRIC_SESSION_KEY
      );

    if (!saved) {
      return null;
    }

    const session =
      JSON.parse(
        saved
      ) as AppAuthSession;

    if (
      !session ||
      !session.isAuthenticated ||
      !session.token ||
      !session.userId
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

// ============================================================
// BIOMETRIC STATUS
// ============================================================

export function isNatanBiometricEnabled(): boolean {
  try {
    return (
      localStorage.getItem(
        BIOMETRIC_ENABLED_KEY
      ) === 'true'
    );
  } catch {
    return false;
  }
}

export function setNatanBiometricEnabled(
  enabled: boolean
) {
  try {
    localStorage.setItem(
      BIOMETRIC_ENABLED_KEY,
      enabled
        ? 'true'
        : 'false'
    );
  } catch {
    // Ignore storage errors.
  }
}

// ============================================================
// LOGOUT
// ============================================================

export function logoutNatan() {
  clearNatanToken();

  try {
    localStorage.removeItem(
      AUTH_SESSION_KEY
    );

    localStorage.removeItem(
      BIOMETRIC_SESSION_KEY
    );

    localStorage.removeItem(
      BIOMETRIC_ENABLED_KEY
    );
  } catch {
    // Ignore storage errors.
  }
}