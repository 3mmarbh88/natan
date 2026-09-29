export interface SaudiCity {
  id: string;
  name: string;
  nameEn: string;
  region: string;
  districts: string[];
}

export interface Shift {
  id: string;

  shiftCode?: string;
  // Examples:
  // DMM-HAB001
  // DMM-DHR001
  // DMM-SHA001

  city: string;
  district: string;
  storeName: string;

  storeNumber?: string;
  // Examples:
  // #495
  // #420
  // #266

  date: string;
  dayName: string;

  startTime: string;
  endTime: string;

  durationHours: number;

  basePay: number;
  bonusPay: number;
  totalPay: number;
  hourlyRate: number;

  isPeak: boolean;

  shiftStateLabel?: 'قادمة' | 'نشط';

  status:
    | 'available'
    | 'booked'
    | 'missed'
    | 'expired';

  detectedAt?: number;
  bookedAt?: number;
  responseTimeMs?: number;
}

/* =========================================================
   DIRECT API BOT
   ========================================================= */

export interface ApiBotSettings {
  enabled: boolean;

  endpointUrl: string;

  bearerToken: string;

  deviceId: string;

  appVersion: string;

  requestIntervalMs: number;

  telegramAlertEnabled: boolean;

  telegramBotToken: string;

  telegramChatId: string;

  simulateDirectApi: boolean;
}

/* =========================================================
   SHIFT WINDOWS
   ========================================================= */

export interface ShiftWindow {
  id: number;

  name: string;

  enabled: boolean;

  startTime: string;
  // Example: "08:01"

  endTime: string;
  // Example: "23:59"
}

/* =========================================================
   BOOKING SETTINGS
   ========================================================= */

export interface BookingSettings {
  /* -------------------------------------------------------
     Engine
     ------------------------------------------------------- */

  autoBooking: boolean;

  monitoring: boolean;

  speedMode:
    | 'ultra'
    | 'turbo'
    | 'stealth';

  scanIntervalMs: number;

  humanJitterMs: number;

  /* -------------------------------------------------------
     Auto Refresh
     ------------------------------------------------------- */

  autoRefresh: boolean;

  refreshIntervalSec: number;

  autoConfirmDialog: boolean;

  /* -------------------------------------------------------
     Android / Device
     ------------------------------------------------------- */

  bypassBatteryOptimization: boolean;

  wakeLockEnabled: boolean;

  secureScreenMode?: boolean;

  /* -------------------------------------------------------
     Booking Mode
     ------------------------------------------------------- */

  bookingMode?: 'screen' | 'direct_api';

  /* -------------------------------------------------------
     Direct API Bot
     ------------------------------------------------------- */

  apiBot?: ApiBotSettings;

  /* -------------------------------------------------------
     Pro 5 Enhancements
     ------------------------------------------------------- */

  branchKeywordNumbers?: string[];

  minuteTolerance?: number;

  volumeKeysControl?: boolean;

  multiShiftWindows?: ShiftWindow[];

  /* -------------------------------------------------------
     Criteria
     ------------------------------------------------------- */

  selectedCity: string;

  /** Selected map/search point. This does not spoof Android GPS. */
  selectedLatitude?: number;
  selectedLongitude?: number;
  selectedLocationLabel?: string;

  selectedDistricts: string[];

  selectedDays: string[];

  startTime: string;

  endTime: string;

  minDurationHours: number;

  maxDurationHours: number;

  onlyPeakHours: boolean;

  /* -------------------------------------------------------
     Notifications
     ------------------------------------------------------- */

  soundAlert: boolean;

  vibrationAlert: boolean;
}

/* =========================================================
   LOGS
   ========================================================= */

export interface LogEntry {
  id: string;

  timestamp: string;

  type:
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
    | 'speed';

  message: string;

  details?: string;

  durationMs?: number;
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

export interface PerformanceStats {
  totalScans: number;

  shiftsDetected: number;

  shiftsCaptured: number;

  shiftsMissed: number;

  avgResponseTimeMs: number;

  fastestResponseTimeMs: number;

  successRate: number;
}

/* =========================================================
   NATAN AUTHENTICATION SESSION
   =========================================================
   
   هذا النوع يمثل جلسة المستخدم بعد:
   
   1. التسجيل
   2. تسجيل الدخول
   3. التفعيل
   
   الحساب يمكن أن يكون:
   
   isAuthenticated = true
   isActivated = false
   
   وهذا يعني:
   المستخدم داخل البرنامج ولكن يحتاج كود تفعيل
   عند استخدام الميزات المحمية.
   ========================================================= */

export interface AppAuthSession {
  /* -------------------------------------------------------
     Authentication
     ------------------------------------------------------- */

  isAuthenticated: boolean;

  /*
   * false:
   * الحساب مسجل ولكن غير مفعّل.
   *
   * true:
   * الحساب مفعّل ويمكن استخدام الميزات المحمية
   * إذا كان الترخيص لم ينتهِ.
   */
  isActivated: boolean;

  /* -------------------------------------------------------
     Account Identity
     ------------------------------------------------------- */

  username: string;

  fullName?: string;

  email?: string;

  phone?: string;

  userId?: string;

  createdAt?: string;

  /* -------------------------------------------------------
     Device Binding
     ------------------------------------------------------- */

  deviceId?: string;

  boundHardware?: string;

  maxDevices?: number;

  /* -------------------------------------------------------
     License
     ------------------------------------------------------- */

  activatedAt?: number;

  /*
   * وقت انتهاء الترخيص بالـ milliseconds.
   *
   * للحساب غير المفعّل:
   * يجب أن تكون null.
   */
  expiresAt: number | null;

  /*
   * مفتاح/معرف الترخيص إن كان موجوداً.
   */
  licenseKey: string;

  /*
   * اسم الخطة.
   *
   * مثال:
   * "30 Days"
   * "NATAN PRO"
   */
  planName: string;

  /* -------------------------------------------------------
     Server Authentication
     ------------------------------------------------------- */

  /*
   * JWT token الصادر من NATAN Server.
   *
   * مهم جداً:
   * الحساب غير المفعّل أيضاً يحصل على token
   * حتى يستطيع الدخول إلى البرنامج.
   */
  token?: string;
}

/* =========================================================
   OPTIONAL AUTH USER DATA
   =========================================================
   
   يستخدم عند التعامل مع بيانات المستخدم القادمة
   من NATAN Server قبل تحويلها إلى AppAuthSession.
   ========================================================= */

export interface NatanAuthUser {
  id?: string;

  userId?: string;

  username: string;

  full_name?: string;

  fullName?: string;

  email?: string;

  phone?: string;

  is_active?: boolean;

  isActive?: boolean;

  is_activated?: boolean;

  isActivated?: boolean;

  activation_expires_at?: string | null;

  expiresAt?: string | number | null;

  expires_at?: string | number | null;

  activated_at?: string | number | null;

  license_key?: string | null;

  licenseKey?: string | null;

  plan_name?: string | null;

  planName?: string | null;

  device_id?: string | null;

  deviceId?: string | null;

  bound_hardware?: string | null;

  boundHardware?: string | null;

  max_devices?: number | null;

  maxDevices?: number | null;

  created_at?: string | null;

  createdAt?: string | null;
}

/* =========================================================
   NATAN AUTH API RESPONSE
   ========================================================= */

export interface NatanAuthResponse {
  success: boolean;

  message?: string;

  error?: string;

  token?: string;

  accessToken?: string;

  requiresActivation?: boolean;

  alreadyActivated?: boolean;

  expired?: boolean;

  userId?: string;

  username?: string;

  email?: string;

  phone?: string;

  expiresAt?: string | number | null;

  user?: NatanAuthUser;

  data?: unknown;

  plan?: unknown;

  [key: string]: unknown;
}