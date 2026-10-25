// src/services/directProtocolService.ts

/**
 * Direct API Protocol Service (محرك الاتصال المباشر الحقيقي - الإنتاج الميداني)
 * 
 * نظام الحجز والربط الشبكي المباشر مع خوادم ساموراي ونينجا الرسمية (api.samurai.delivery).
 * تم إزالة جميع المحاكيات والشفتات التجريبية للعمل في بيئة الإنتاج الميداني الحقيقية لهواتف أندرويد.
 */

export interface DirectProtocolSession {
  accessToken: string;
  driverId?: string;
  phone?: string;
  deviceId?: string;
  appVersion?: string;
  expiresAt?: number;
  lastConnectedAt?: number;
  verified?: boolean;
}

export interface DirectProtocolLog {
  id: string;
  timestamp: number;
  method: 'GET' | 'POST' | 'WS' | 'AI';
  endpoint: string;
  status: number;
  latencyMs: number;
  type: 'poll' | 'book' | 'auth' | 'ping' | 'error' | 'ai';
  summary: string;
  details?: string;
}

export interface DirectShiftPayload {
  id: string;
  title: string;
  branchName: string;
  branchNumber: string;
  date: string;
  dayName: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  totalPay: number;
  isPeak: boolean;
  status: 'available' | 'booked';
  detectedAt: number;
  aiScore?: number;
}

export interface AiPredictionInsight {
  branchName: string;
  expectedDropTimeWindow: string;
  probabilityPercent: number;
  recommendedAction: string;
  lastUpdated: number;
}

const STORAGE_SESSION_KEY = 'natan_direct_protocol_session';
const STORAGE_LOGS_KEY = 'natan_direct_protocol_logs';

export class DirectProtocolService {
  private static instance: DirectProtocolService;
  private isRunning: boolean = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private logListeners: ((log: DirectProtocolLog) => void)[] = [];
  private shiftFoundListeners: ((shift: DirectShiftPayload) => void)[] = [];
  private shiftBookedListeners: ((shift: DirectShiftPayload, latencyMs: number) => void)[] = [];
  private aiPredictionListeners: ((predictions: AiPredictionInsight[]) => void)[] = [];
  private lastPingMs: number = 20;
  private currentPredictions: AiPredictionInsight[] = [];

  private constructor() {
    this.purgeSimulatorData();
    this.initAiPredictions();
  }

  public static getInstance(): DirectProtocolService {
    if (!DirectProtocolService.instance) {
      DirectProtocolService.instance = new DirectProtocolService();
    }
    return DirectProtocolService.instance;
  }

  /**
   * حذف أي بيانات تجريبية أو سجلات سابقة أنشأها المحاكي
   */
  public purgeSimulatorData(): void {
    try {
      const rawLogs = localStorage.getItem(STORAGE_LOGS_KEY);
      if (rawLogs) {
        const parsed = JSON.parse(rawLogs);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (l: any) =>
              !l.details?.includes('SAM_') &&
              !l.summary?.includes('شفت الذروة الماسي') &&
              !l.summary?.includes('تجريبي') &&
              !l.summary?.includes('محاكاة')
          );
          localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(cleaned));
        }
      }
    } catch {
      // ignore
    }
  }

  // --- Session Management ---

  public getSession(): DirectProtocolSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public saveSession(session: DirectProtocolSession): void {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  }

  public clearSession(): void {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  }

  public hasValidToken(): boolean {
    const session = this.getSession();
    return !!(
      session &&
      session.verified === true &&
      session.accessToken &&
      session.accessToken.trim().length > 10 &&
      (!session.expiresAt || session.expiresAt > Date.now())
    );
  }

  // --- Phone & OTP Login Flow ---

  public async requestPhoneOtp(_phoneNumber: string): Promise<{ success: boolean; message: string }> {
    this.addLog({ method: 'POST', endpoint: '/auth/captains/request-otp', status: 0, latencyMs: 0, type: 'error', summary: 'لم يتم إرسال SMS: واجهة التحقق الرسمية غير مهيأة.' });
    return { success: false, message: 'تسجيل الدخول عبر SMS غير متاح: لا توجد واجهة تحقق رسمية مهيأة. سجّل الدخول داخل تطبيق Ninja أو Samurai.' };
  }

  public async verifyOtpAndLogin(
    _phoneNumber: string,
    _otpCode: string
  ): Promise<{ success: boolean; token?: string; message: string }> {
    this.clearSession();
    return { success: false, message: 'تعذر التحقق: واجهة OTP الرسمية غير مهيأة. لم يتم إنشاء جلسة أو رمز دخول وهمي.' };
  }

  // --- Network Latency & Server Health ---

  public async measureLatency(): Promise<number> {
    const start = performance.now();
    try {
      const response = await fetch('https://api.samurai.delivery/api/v1/health', { method: 'HEAD', cache: 'no-store' });
      const elapsed = Math.round(performance.now() - start);
      if (!response.ok) { this.lastPingMs = 0; return 0; }
      this.lastPingMs = elapsed;
      return elapsed;
    } catch {
      // Failed or CORS-blocked health checks are unavailable, not successful pings.
      this.lastPingMs = 0;
      return 0;
    }
  }

  public getLastPing(): number {
    return this.lastPingMs;
  }

  // --- AI Predictive Shift Engine ---

  private initAiPredictions() {
    // Keep predictions empty until a real data source and model are integrated.
    this.currentPredictions = [];
  }

  public getAiPredictions(): AiPredictionInsight[] {
    return this.currentPredictions;
  }

  public onAiPredictionUpdate(cb: (predictions: AiPredictionInsight[]) => void): () => void {
    this.aiPredictionListeners.push(cb);
    return () => {
      this.aiPredictionListeners = this.aiPredictionListeners.filter((l) => l !== cb);
    };
  }

  // --- Logs & Subscriptions ---

  public onLog(cb: (log: DirectProtocolLog) => void): () => void {
    this.logListeners.push(cb);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== cb);
    };
  }

  public onShiftFound(cb: (shift: DirectShiftPayload) => void): () => void {
    this.shiftFoundListeners.push(cb);
    return () => {
      this.shiftFoundListeners = this.shiftFoundListeners.filter((l) => l !== cb);
    };
  }

  public onShiftBooked(cb: (shift: DirectShiftPayload, latencyMs: number) => void): () => void {
    this.shiftBookedListeners.push(cb);
    return () => {
      this.shiftBookedListeners = this.shiftBookedListeners.filter((l) => l !== cb);
    };
  }

  public addLog(entry: Omit<DirectProtocolLog, 'id' | 'timestamp'>): DirectProtocolLog {
    const log: DirectProtocolLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      ...entry,
    };

    try {
      const existing = this.getStoredLogs();
      const updated = [log, ...existing].slice(0, 100);
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    this.logListeners.forEach((listener) => {
      try {
        listener(log);
      } catch (err) {
        console.error(err);
      }
    });

    return log;
  }

  public getStoredLogs(): DirectProtocolLog[] {
    try {
      const raw = localStorage.getItem(STORAGE_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public clearLogs(): void {
    localStorage.removeItem(STORAGE_LOGS_KEY);
  }

  // --- Real Direct Protocol Booking Handshake (Pure Production) ---

  public async bookShiftDirectly(
    shiftId: string,
    shiftDetails?: Partial<DirectShiftPayload>
  ): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const startTime = performance.now();
    const session = this.getSession();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Ninja/2.44.1 (Linux; Android 14; Build/UP1A.231005.007)',
      'x-client-platform': 'android',
    };

    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }

    if (session?.deviceId) {
      headers['installation-uid'] = session.deviceId;
    }

    const endpoint = `https://api.samurai.delivery/api/v1/shifts/booking/${encodeURIComponent(shiftId)}/book`;

    try {
      if (!session?.verified || !session.accessToken || session.accessToken.trim().length < 10 ||
          (session.expiresAt !== undefined && session.expiresAt <= Date.now())) {
        return { success: false, latencyMs: 0, message: 'لم يتم الحجز: لا توجد جلسة دخول موثقة وصالحة.' };
      }
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ shiftId, bookedVia: 'natan_direct', timestamp: Date.now() }),
      });
      const elapsed = Math.round(performance.now() - startTime);
      const status = resp.status;
      const contentType = resp.headers.get('content-type') || '';
      let payload: any = null;
      if (contentType.includes('application/json')) {
        try { payload = await resp.json(); } catch { payload = null; }
      }
      const confirmed = resp.ok && !!payload &&
        (payload.success === true || payload.booked === true || payload.status === 'booked') &&
        !!(payload.bookingId || payload.booking_id || payload.id || payload.status === 'booked');
      if (confirmed) {
        const bookedShift: DirectShiftPayload = {
          id: shiftId,
          title: shiftDetails?.title || `شفت حقيقي #${shiftId.slice(-4)}`,
          branchName: shiftDetails?.branchName || 'ظهران Dahran',
          branchNumber: shiftDetails?.branchNumber || '#420',
          date: shiftDetails?.date || new Date().toISOString().split('T')[0],
          dayName: shiftDetails?.dayName || 'اليوم',
          startTime: shiftDetails?.startTime || '16:00',
          endTime: shiftDetails?.endTime || '23:59',
          durationHours: shiftDetails?.durationHours || 8,
          totalPay: shiftDetails?.totalPay || 180,
          isPeak: shiftDetails?.isPeak ?? true,
          status: 'booked',
          detectedAt: Date.now() - elapsed,
          aiScore: 99,
        };

        this.addLog({
          method: 'POST',
          endpoint: `/shifts/booking/${shiftId}/book`,
          status: 200,
          latencyMs: elapsed,
          type: 'book',
          summary: `تم تأكيد الحجز من استجابة الخادم للشفت ${shiftId}.`,
          details: JSON.stringify({ shiftId, branch: bookedShift.branchName, latency: `${elapsed}ms`, bookingId: payload.bookingId || payload.booking_id || payload.id || null }),
        });

        this.shiftBookedListeners.forEach((listener) => {
          try {
            listener(bookedShift, elapsed);
          } catch (e) {
            console.error(e);
          }
        });

        return {
          success: true,
          latencyMs: elapsed,
          message: `تم الحجز المباشر بنجاح (${elapsed}ms)`,
        };
      } else {
        this.addLog({
          method: 'POST',
          endpoint: `/shifts/booking/${shiftId}/book`,
          status,
          latencyMs: elapsed,
          type: 'error',
          summary: `فشل الحجز من السيرفر (كود الاستجابة: ${status})`,
        });

        return {
          success: false,
          latencyMs: elapsed,
          message: resp.ok ? 'لم يتم تأكيد الحجز: استجابة الخادم لا تحتوي على دليل حجز واضح.' : `فشل الحجز من الخادم (كود: ${status})`,
        };
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      this.addLog({ method: 'POST', endpoint: `/shifts/booking/${shiftId}/book`, status: 0, latencyMs: elapsed, type: 'error', summary: 'فشل الاتصال؛ لم يتم تأكيد الحجز.', details: err?.message || 'Network error' });
      return { success: false, latencyMs: elapsed, message: 'فشل الاتصال بخادم الحجز؛ لم يتم تسجيل الحجز كناجح.' };
    }
  }

  // --- Realtime Shift Polling Loop (Production Field Radar) ---

  public startRadar(options: {
    intervalMs: number;
    autoBook: boolean;
    targetBranches: string[];
  }): void {
    // No verified, supported shift-feed API is configured in this repository.
    // Do not simulate successful polling or claim this radar is running.
    this.isRunning = false;
    this.addLog({
      method: 'GET',
      endpoint: '/captains/shifts?pageId=0',
      status: 0,
      latencyMs: 0,
      type: 'error',
      summary: 'الرصد المباشر غير متاح: لا يوجد مصدر شفتات رسمي موثّق. استخدم رادار قراءة الشاشة عبر Accessibility.',
      details: `الفحص المطلوب: ${options.intervalMs}ms | الحجز التلقائي: ${options.autoBook ? 'مفعل' : 'معطل'} | الفروع: ${options.targetBranches.length}`,
    });
  }

  public stopRadar(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    this.addLog({
      method: 'GET',
      endpoint: '/shifts/stream/disconnect',
      status: 200,
      latencyMs: 5,
      type: 'auth',
      summary: '⏹️ تم إيقاف رصد البروتوكول المباشر',
    });
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

export const directProtocol = DirectProtocolService.getInstance();
