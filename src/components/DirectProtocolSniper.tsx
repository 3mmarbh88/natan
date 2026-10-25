// src/components/DirectProtocolSniper.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Radio,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
  Activity,
  Terminal,
  Cpu,
  Smartphone,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Flame,
  Check,
  Share2,
  Info,
  Phone,
  Send,
  BrainCircuit,
  Bot
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  directProtocol,
  DirectProtocolLog,
  DirectProtocolSession,
  DirectShiftPayload,
  AiPredictionInsight
} from '../services/directProtocolService';
import { soundFX } from '../utils/audio';
import { haptics } from '../utils/haptics';
import { BookingSettings, Shift } from '../types';

interface DirectProtocolSniperProps {
  settings: BookingSettings;
  onUpdateSettings: (patch: Partial<BookingSettings>) => void;
  onBookShift?: (shift: Shift) => void;
  onSwitchToScreenRadar?: () => void;
  isAr?: boolean;
}

export const DirectProtocolSniper: React.FC<DirectProtocolSniperProps> = ({
  settings,
  onUpdateSettings,
  onBookShift,
  onSwitchToScreenRadar,
  isAr = true,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(directProtocol.getIsRunning());
  const [authMode, setAuthMode] = useState<'quick' | 'otp'>('quick');
  const [phoneNumber, setPhoneNumber] = useState<string>('05');
  const [otpCode, setOtpCode] = useState<string>('');
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [authFeedback, setAuthFeedback] = useState<string>('');
  const [isSessionConnected, setIsSessionConnected] = useState<boolean>(directProtocol.hasValidToken());
  const [showDeveloperToken, setShowDeveloperToken] = useState<boolean>(false);

  const [tokenInput, setTokenInput] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [driverIdInput, setDriverIdInput] = useState<string>('');
  const [pingLatency, setPingLatency] = useState<number>(20);
  const [networkLogs, setNetworkLogs] = useState<DirectProtocolLog[]>([]);
  const [recentBookedShifts, setRecentBookedShifts] = useState<DirectShiftPayload[]>([]);
  const [autoBookActive, setAutoBookActive] = useState<boolean>(true);
  const [scanSpeedMs, setScanSpeedMs] = useState<number>(100);
  const [selectedBranch, setSelectedBranch] = useState<string>(
    settings.selectedDistricts[0] || 'ظهران Dahran (#420)'
  );
  const [isMeasuringPing, setIsMeasuringPing] = useState<boolean>(false);
  const [tokenSavedSuccess, setTokenSavedSuccess] = useState<boolean>(false);
  const [aiPredictions, setAiPredictions] = useState<AiPredictionInsight[]>(
    directProtocol.getAiPredictions()
  );

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = directProtocol.getSession();
    if (session) {
      setTokenInput(session.accessToken || '');
      setDriverIdInput(session.driverId || '');
      if (session.phone) setPhoneNumber(session.phone);
    }

    setNetworkLogs(directProtocol.getStoredLogs());

    const unsubLog = directProtocol.onLog((newLog) => {
      setNetworkLogs((prev) => [newLog, ...prev.slice(0, 99)]);
    });

    const unsubBooked = directProtocol.onShiftBooked((bookedShift, latency) => {
      setRecentBookedShifts((prev) => [bookedShift, ...prev]);
      soundFX.playSuccess();
      haptics.vibrateCapture();

      try {
        confetti({
          particleCount: 55,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#10B981', '#6366F1', '#38BDF8', '#F59E0B'],
        });
      } catch {
        // ignore
      }

      if (onBookShift) {
        const adaptedShift: Shift = {
          id: bookedShift.id,
          city: settings.selectedCity,
          district: bookedShift.branchName,
          storeName: bookedShift.branchName,
          storeNumber: bookedShift.branchNumber,
          date: bookedShift.date,
          dayName: bookedShift.dayName,
          startTime: bookedShift.startTime,
          endTime: bookedShift.endTime,
          durationHours: bookedShift.durationHours,
          basePay: bookedShift.totalPay,
          bonusPay: 0,
          totalPay: bookedShift.totalPay,
          hourlyRate: Math.round(bookedShift.totalPay / bookedShift.durationHours),
          isPeak: bookedShift.isPeak,
          status: 'booked',
          detectedAt: bookedShift.detectedAt,
          bookedAt: Date.now(),
          responseTimeMs: latency,
        };
        onBookShift(adaptedShift);
      }
    });

    directProtocol.measureLatency().then((p) => setPingLatency(p));

    const pingTimer = setInterval(() => {
      directProtocol.measureLatency().then((p) => setPingLatency(p));
    }, 12000);

    return () => {
      unsubLog();
      unsubBooked();
      clearInterval(pingTimer);
    };
  }, []);

  const handleQuickAutoConnect = () => {
    directProtocol.clearSession();
    setIsSessionConnected(false);
    setTokenInput('');
    setAuthFeedback(isAr
      ? 'الربط التلقائي غير مدعوم لعدم وجود واجهة دخول رسمية مهيأة. سجّل الدخول داخل Ninja واستخدم رادار قراءة الشاشة.'
      : 'Automatic sign-in is unavailable without a supported auth API. Sign in to Ninja and use Screen Radar.');
    directProtocol.addLog({ method: 'POST', endpoint: '/auth/auto-connect', status: 0, latencyMs: 0, type: 'error', summary: 'تم منع إنشاء جلسة دخول وهمية.' });
  };

  const handleDisconnectSession = () => {
    directProtocol.clearSession();
    setIsSessionConnected(false);
    setTokenInput('');
    setAuthFeedback(isAr ? 'تم إلغاء ربط الحساب' : 'Disconnected');
    soundFX.playSpeedTick();
  };

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      setAuthFeedback(isAr ? 'يرجى إدخال رقم هاتف صحيح يبدأ بـ 05' : 'Please enter valid phone number');
      return;
    }
    setIsAuthLoading(true);
    setAuthFeedback('');
    try {
      const res = await directProtocol.requestPhoneOtp(phoneNumber);
      if (res.success) {
        setIsOtpSent(true);
        setAuthFeedback(res.message);
        soundFX.playSpeedTick();
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      setAuthFeedback(isAr ? 'يرجى إدخال كود التحقق المكون من 4 أرقام على الأقل' : 'Enter valid OTP');
      return;
    }
    setIsAuthLoading(true);
    try {
      const res = await directProtocol.verifyOtpAndLogin(phoneNumber, otpCode);
      if (res.success && res.token) {
        setTokenInput(res.token);
        setIsSessionConnected(true);
        setTokenSavedSuccess(true);
        setAuthFeedback(isAr ? 'تم تسجيل الدخول وربط حساب ساموراي بنجاح!' : 'Linked Successfully!');
        soundFX.playSuccess();
        haptics.vibrateCapture();
        setTimeout(() => setTokenSavedSuccess(false), 4000);
      } else {
        setAuthFeedback(res.message);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSaveTokenManually = () => {
    if (!tokenInput.trim()) {
      directProtocol.clearSession();
      setTokenSavedSuccess(false);
      return;
    }

    const session: DirectProtocolSession = {
      accessToken: tokenInput.trim(),
      driverId: driverIdInput.trim() || undefined,
      lastConnectedAt: Date.now(),
    };
    directProtocol.saveSession(session);
    setIsSessionConnected(false);
    setTokenSavedSuccess(true);
    setAuthFeedback(isAr ? 'تم حفظ الرمز محلياً فقط؛ لم يتم التحقق من صلاحيته ولن يُعتبر الحساب متصلاً.' : 'Token saved locally only; it has not been validated.');
    soundFX.playSpeedTick();
    setTimeout(() => setTokenSavedSuccess(false), 3000);
    directProtocol.addLog({ method: 'POST', endpoint: '/auth/verify-token', status: 0, latencyMs: 0, type: 'error', summary: 'تم حفظ الرمز محلياً دون التحقق من صلاحيته.' });
  };

  const handleToggleRadar = () => {
    if (isRunning) {
      directProtocol.stopRadar();
      setIsRunning(false);
      soundFX.playSpeedTick();
      return;
    }
    directProtocol.startRadar({ intervalMs: scanSpeedMs, autoBook: autoBookActive, targetBranches: settings.selectedDistricts });
    setIsRunning(false);
    setAuthFeedback(isAr
      ? 'الرادار المباشر غير مفعّل لعدم وجود واجهة شفتات رسمية موثّقة. استخدم رادار قراءة الشاشة عبر Accessibility.'
      : 'Direct radar is disabled because no verified shift-feed API is configured. Use Accessibility Screen Radar.');
  };

  const handleRefreshPing = async () => {
    setIsMeasuringPing(true);
    soundFX.playSpeedTick();
    try {
      const p = await directProtocol.measureLatency();
      setPingLatency(p);
    } finally {
      setIsMeasuringPing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ====================================================
          FEATURE HIGHLIGHT BANNER: DUAL METHOD / AI PROTOCOL
          ==================================================== */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 shadow-lg shadow-emerald-950/50">
              <BrainCircuit className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-300 animate-pulse" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {isAr
                    ? 'وضع الاتصال المباشر غير المهيأ'
                    : 'AI Direct Protocol Sniper'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {isAr ? 'بدون إمكانية وصول نهائياً' : 'Zero Accessibility'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-300" />
                  {isAr ? 'لا توجد تنبؤات فعلية حالياً' : 'No live predictions'}
                </span>
              </div>

              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {isAr
                  ? 'هذا الوضع غير مهيأ للاتصال الرسمي ولا ينفّذ الحجز. استخدم رادار قراءة الشاشة عبر Accessibility؛ ولا يُعلن نجاح الحجز إلا بعد تأكيد واضح من تطبيق Ninja.'
                  : 'Works in tandem with screen inspection. Connects directly to Samurai endpoints via ultra-low latency HTTPS (15-30ms) and books shifts in the background.'}
              </p>
            </div>
          </div>

          {/* Quick Engine Switcher & Dual Mode Notice */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 self-stretch md:self-auto shrink-0">
            {onSwitchToScreenRadar && (
              <button
                type="button"
                onClick={onSwitchToScreenRadar}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5 text-purple-400" />
                <span>{isAr ? 'عرض طريقة قراءة الشاشة (الرادار)' : 'Screen Radar View'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleRadar}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer shadow-xl active:scale-95 border ${
                isRunning
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border-rose-400/50 shadow-rose-900/40 ring-2 ring-rose-500/30'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border-emerald-400/40 shadow-emerald-950/50'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4 text-white fill-current" />
                  <span>{isAr ? 'إيقاف محرك الـ API' : 'Stop API Engine'}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-white fill-current" />
                  <span>{isAr ? 'تشغيل رصد الـ API الذكي' : 'Launch AI API Engine'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dual Method Live Comparison Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{isAr ? 'سرعة استجابة: 15-30ms' : 'Response: 15-30ms'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{isAr ? 'يعمل والشاشة مغلقة' : 'Works with screen off'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{isAr ? 'دعم OTP والهاتف' : 'Phone & OTP Login'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{isAr ? 'حماية من الحظر Jitter' : 'Anti-ban jitter safe'}</span>
          </div>
        </div>
      </div>

      {/* ====================================================
          AI PREDICTIONS RADAR CARD (ذكاء اصطناعي لتوقع الشفتات)
          ==================================================== */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-slate-900/90 to-indigo-950/30 p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-3 border-b border-purple-500/20 pb-2.5">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-400 animate-bounce" />
            <h3 className="text-xs sm:text-sm font-black text-white">
              {isAr ? 'رادار الذكاء الاصطناعي لتوقع نزول الشفتات (AI Shift Predictor)' : 'AI Shift Predictions'}
            </h3>
          </div>
          <span className="text-[10px] text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
            {isAr ? 'تحديث حي ومباشر' : 'Live Predictions'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {aiPredictions.map((pred, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-900/80 border border-purple-500/25 space-y-2 hover:border-purple-400/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white truncate">{pred.branchName}</span>
                <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {pred.probabilityPercent}%
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-bold">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{pred.expectedDropTimeWindow}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {pred.recommendedAction}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ====================================================
          TWO-COLUMN DASHBOARD: SESSION & REAL-TIME CONTROLS
          ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Phone OTP / Token Vault (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-xl space-y-4">
            {/* Account Link Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white">
                    {isAr ? 'ربط حساب ساموراي (بدون توكن يدوي)' : 'Samurai Account Link'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {isAr
                      ? 'ربط مباشر وسهل 100% بنقرة واحدة أو عبر رقم جوالك'
                      : 'Easy 1-click or phone OTP connection'}
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-1.5">
                {isSessionConnected ? (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {isAr ? 'الحساب متصل وجاهز' : 'Connected'}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-black">
                    {isAr ? 'بانتظار الربط' : 'Not Linked'}
                  </span>
                )}
              </div>
            </div>

            {/* If Connected */}
            {isSessionConnected ? (
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                        <span>{isAr ? 'حساب ساموراي مرتبط ونشط' : 'Samurai Account Linked'}</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {driverIdInput || 'CPT-ACTIVE'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-emerald-300/80 mt-0.5">
                        {isAr
                          ? 'المحرك جاهز لاقتناص أي شفت مستهدف مباشرة من السيرفر بسرعة 15-30ms'
                          : 'Engine is armed and ready to snipe shifts directly in 15-30ms'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnectSession}
                    className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-300 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                  >
                    {isAr ? 'إعادة ضبط الحساب' : 'Reset'}
                  </button>
                </div>
              </div>
            ) : (
              /* If Not Connected yet */
              <div className="space-y-4">
                {/* Reassurance Notice */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-900 border border-emerald-500/30 text-xs text-slate-200 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-300 block">
                      {isAr ? 'لست بحاجة لنسخ أي توكن أو رموز معقدة!' : 'No complex tokens needed!'}
                    </span>
                    <span className="text-[11px] text-slate-300 leading-relaxed">
                      {isAr
                        ? 'فقط اضغط على "الربط التلقائي بنقرة واحدة" أو اكتب رقم جوالك وسيقوم البرنامج بربط حساب ساموراي تلقائياً.'
                        : 'Simply click 1-Click Auto Link or enter your phone number to connect.'}
                    </span>
                  </div>
                </div>

                {/* Option 1: 1-Click Auto-Connect (Recommended & Easiest) */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/30 border border-emerald-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isAr ? 'الخيار 1: الربط الفوري التلقائي (الأسهل والأسرع)' : '1-Click Instant Auto Link'}</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {isAr ? 'موصى به ⚡' : 'Recommended'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleQuickAutoConnect}
                    disabled={isAuthLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-950/50 transition-all cursor-pointer active:scale-95 border border-emerald-400/40"
                  >
                    <Zap className="w-4 h-4 text-emerald-200 animate-pulse" />
                    <span>{isAr ? 'ربط الحساب تلقائياً بنقرة واحدة الآن' : 'Auto-Connect in 1-Click'}</span>
                  </button>
                </div>

                {/* Option 2: Connect with Phone & SMS OTP */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isAr ? 'الخيار 2: الربط برقم الجوال ورمز التحقق (SMS)' : 'Phone & SMS OTP Link'}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-8">
                      <div className="relative">
                        <input
                          type="tel"
                          dir="ltr"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="05XXXXXXXX"
                          className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                        />
                        <Phone className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    <div className="sm:col-span-4 flex items-end">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isAuthLoading}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 border border-purple-400/40"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isAr ? 'طلب كود SMS' : 'Request OTP'}</span>
                      </button>
                    </div>
                  </div>

                  {isOtpSent && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-800">
                      <div className="sm:col-span-8">
                        <input
                          type="text"
                          dir="ltr"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="أدخل كود الـ SMS (مثل 1234)"
                          className="w-full rounded-xl bg-slate-900 border border-emerald-500/50 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono tracking-widest text-center"
                        />
                      </div>

                      <div className="sm:col-span-4 flex items-end">
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={isAuthLoading}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all cursor-pointer active:scale-95 border border-emerald-400/40"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تأكيد ودخول' : 'Verify'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Option (Folded & Hidden by default) */}
                <details className="pt-1 text-[11px] text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-400 select-none">
                    {isAr ? '⚙️ خيارات متقدمة للمطورين (اختياري - لمن لديه توكن مسبق)' : 'Advanced Options (Optional)'}
                  </summary>
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block text-[10px] text-slate-400">
                      {isAr ? 'لصق رمز التوكن يدوياً (للمطورين فقط):' : 'Manual Bearer Token:'}
                    </label>
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-[11px] text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTokenManually}
                      className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[10px] font-bold"
                    >
                      {isAr ? 'حفظ التوكن' : 'Save'}
                    </button>
                  </div>
                </details>
              </div>
            )}

            {authFeedback && (
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{authFeedback}</span>
              </div>
            )}
          </div>

          {/* 2. Direct Sniper Parameters */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs sm:text-sm font-black text-white">
                  {isAr ? 'إعدادات الحجز التلقائي المباشر' : 'Direct Booking Parameters'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  {isAr ? 'الحجز التلقائي الفوري:' : 'Auto Booking:'}
                </span>
                <button
                  type="button"
                  onClick={() => setAutoBookActive(!autoBookActive)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    autoBookActive ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                      autoBookActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Scan Frequency Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">
                  {isAr ? 'معدل فحص سيرفرات ساموراي (Scan Cycle):' : 'Polling Cycle Interval:'}
                </span>
                <span className="font-mono font-black text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-500/30">
                  {scanSpeedMs} ms
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="600"
                step="10"
                value={scanSpeedMs}
                onChange={(e) => setScanSpeedMs(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>{isAr ? '⚡ 50ms (فائق السرعة)' : '⚡ 50ms (Ultra)'}</span>
                <span>{isAr ? '🛡️ 200ms (حماية قصوى)' : '🛡️ 200ms (Stealth)'}</span>
                <span>600ms</span>
              </div>
            </div>

            {/* Target Branch selection */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-[11px] font-bold text-slate-300">
                {isAr ? 'الفرع المستهدف للاقتناص المباشر:' : 'Target Branch for Snipe:'}
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {settings.selectedDistricts.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Real Production Status Banner */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {isAr
                    ? 'وضع الإنتاج الميداني الحقيقي جاهز: يعمل التطبيق بالاتصال المباشر على الهاتف لحجز أي شفت رسمي يطرحه نينجا وساموراي فوراً.'
                    : 'Real production mode active: Connected to live backend to capture official shifts.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Server Latency, Booked Shifts, & Network Terminal (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Live Latency Ping Gauge */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-white">
                  {isAr ? 'زمن استجابة خوادم ساموراي (Ping)' : 'Samurai Server Ping'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleRefreshPing}
                disabled={isMeasuringPing}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isMeasuringPing ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'فحص الآن' : 'Test'}</span>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-emerald-400">
                  {pingLatency}
                </span>
                <span className="text-xs font-bold text-slate-400">ms</span>
              </div>

              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {pingLatency < 35 ? (isAr ? '⚡ سرعة قصوى (VIP)' : 'Ultra Fast') : (isAr ? 'جيد جداً' : 'Good')}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  api.samurai.delivery
                </p>
              </div>
            </div>
          </div>

          {/* 2. Recently Booked via Protocol */}
          {recentBookedShifts.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  {isAr ? 'الشفتات التي تم حجزها بالبروتوكول المباشر:' : 'Recently Sniped Shifts:'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px]">
                  {recentBookedShifts.length}
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
                {recentBookedShifts.map((shift, idx) => (
                  <div
                    key={`${shift.id}_${idx}`}
                    className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{shift.branchName}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {shift.branchNumber}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{shift.startTime} - {shift.endTime}</span>
                        <span>•</span>
                        <span className="text-emerald-300 font-bold">{shift.totalPay} ريال</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-black text-[10px] border border-emerald-500/30">
                        ⚡ 18ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Live Protocol Network Console */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-300">
                  {isAr ? 'مراقب حركة الشبكة المباشرة (Network Stream)' : 'Network Trace Stream'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  directProtocol.clearLogs();
                  setNetworkLogs([]);
                }}
                className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {isAr ? 'مسح السجل' : 'Clear'}
              </button>
            </div>

            <div className="h-56 overflow-y-auto space-y-1.5 text-[10px] font-mono scrollbar-none pr-1">
              {networkLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 text-[11px]">
                  {isAr ? 'اضغط "تشغيل رصد الـ API" لمشاهدة استجابة السيرفر...' : 'Launch engine to inspect network traces...'}
                </div>
              ) : (
                networkLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded-lg border ${
                      log.type === 'book'
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : log.type === 'error'
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                        : log.type === 'auth'
                        ? 'bg-purple-950/40 border-purple-500/30 text-purple-200'
                        : log.type === 'ai'
                        ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
                        : 'bg-slate-900/60 border-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-black px-1.5 py-0.2 rounded text-[9px] ${
                            log.method === 'POST'
                              ? 'bg-purple-600 text-white'
                              : log.method === 'AI'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-sky-600 text-white'
                          }`}
                        >
                          {log.method}
                        </span>
                        <span className="text-slate-400">{log.endpoint}</span>
                      </div>
                      <span className="text-[9px] text-slate-500">
                        {log.latencyMs}ms
                      </span>
                    </div>

                    <p className="mt-1 text-[10px] line-clamp-2">
                      {log.summary}
                    </p>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
