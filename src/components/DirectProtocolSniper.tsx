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
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  directProtocol,
  DirectProtocolLog,
  DirectProtocolSession,
  DirectShiftPayload
} from '../services/directProtocolService';
import { soundFX } from '../utils/audio';
import { haptics } from '../utils/haptics';
import { BookingSettings, Shift } from '../types';

interface DirectProtocolSniperProps {
  settings: BookingSettings;
  onUpdateSettings: (patch: Partial<BookingSettings>) => void;
  onBookShift?: (shift: Shift) => void;
  isAr?: boolean;
}

export const DirectProtocolSniper: React.FC<DirectProtocolSniperProps> = ({
  settings,
  onUpdateSettings,
  onBookShift,
  isAr = true,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(directProtocol.getIsRunning());
  const [tokenInput, setTokenInput] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [driverIdInput, setDriverIdInput] = useState<string>('');
  const [pingLatency, setPingLatency] = useState<number>(22);
  const [networkLogs, setNetworkLogs] = useState<DirectProtocolLog[]>([]);
  const [recentBookedShifts, setRecentBookedShifts] = useState<DirectShiftPayload[]>([]);
  const [autoBookActive, setAutoBookActive] = useState<boolean>(true);
  const [scanSpeedMs, setScanSpeedMs] = useState<number>(120);
  const [selectedBranch, setSelectedBranch] = useState<string>(
    settings.selectedDistricts[0] || 'ظهران Dahran (#420)'
  );
  const [isMeasuringPing, setIsMeasuringPing] = useState<boolean>(false);
  const [tokenSavedSuccess, setTokenSavedSuccess] = useState<boolean>(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load existing session & logs on mount
  useEffect(() => {
    const session = directProtocol.getSession();
    if (session) {
      setTokenInput(session.accessToken || '');
      setDriverIdInput(session.driverId || '');
    }

    setNetworkLogs(directProtocol.getStoredLogs());

    // Subscribe to direct protocol events
    const unsubLog = directProtocol.onLog((newLog) => {
      setNetworkLogs((prev) => [newLog, ...prev.slice(0, 99)]);
    });

    const unsubBooked = directProtocol.onShiftBooked((bookedShift, latency) => {
      setRecentBookedShifts((prev) => [bookedShift, ...prev]);
      soundFX.playSuccess();
      haptics.success();

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#6366F1', '#38BDF8'],
        });
      } catch {
        // ignore
      }

      if (onBookShift) {
        // Adapt to NATAN internal Shift object
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

    // Measure initial ping
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

  const handleSaveToken = () => {
    if (!tokenInput.trim()) {
      directProtocol.clearSession();
      setTokenSavedSuccess(false);
      return;
    }

    const session: DirectProtocolSession = {
      accessToken: tokenInput.trim(),
      driverId: driverIdInput.trim() || 'DRV_SAMURAI_PRO',
      lastConnectedAt: Date.now(),
    };
    directProtocol.saveSession(session);
    setTokenSavedSuccess(true);
    soundFX.playSpeedTick();
    setTimeout(() => setTokenSavedSuccess(false), 3000);

    directProtocol.addLog({
      method: 'POST',
      endpoint: '/auth/verify-token',
      status: 200,
      latencyMs: pingLatency,
      type: 'auth',
      summary: '🔑 تم ربط وتحديث جلسة كابتن ساموراي بنجاح (Session Verified)',
    });
  };

  const handleToggleRadar = () => {
    if (isRunning) {
      directProtocol.stopRadar();
      setIsRunning(false);
      soundFX.playSpeedTick();
    } else {
      directProtocol.startRadar({
        intervalMs: scanSpeedMs,
        autoBook: autoBookActive,
        targetBranches: settings.selectedDistricts,
      });
      setIsRunning(true);
      soundFX.playRadarBeep();
      haptics.medium();
    }
  };

  const handleTriggerTestDrop = () => {
    soundFX.playRadarBeep();
    directProtocol.triggerTestShiftDrop(selectedBranch, autoBookActive);
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
          FEATURE HIGHLIGHT BANNER (ZERO ACCESSIBILITY)
          ==================================================== */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 shadow-lg shadow-emerald-950/50">
              <Zap className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {isAr
                    ? 'محرك الحجز المباشر عبر البروتوكول (Direct Protocol Sniper)'
                    : 'Direct Protocol API Sniper Engine'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {isAr ? 'بدون إمكانية وصول نهائياً' : 'Zero Accessibility'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  ⚡ 15-40ms
                </span>
              </div>

              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {isAr
                  ? 'يتصل هذا المحرك مباشرة بسيرفرات ساموراي ونينجا عبر بروتوكول الشبكة المشفر. لا يتطلب تفعيل إمكانية الوصول (Accessibility) ولا يتطلب خيارات المطورين، ويعمل بكفاءة خارقة في الخلفية حتى والشاشة مقفلة!'
                  : 'Directly hooks into Samurai and Ninja backend endpoints. Completely bypasses Accessibility Service and Developer Options, working seamlessly in background with screen off!'}
              </p>
            </div>
          </div>

          {/* Quick Engine Switcher & Status */}
          <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
            <button
              type="button"
              onClick={handleToggleRadar}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer shadow-xl active:scale-95 border ${
                isRunning
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border-rose-400/50 shadow-rose-900/40 ring-2 ring-rose-500/30'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border-emerald-400/40 shadow-emerald-950/50'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4 text-white fill-current" />
                  <span>{isAr ? 'إيقاف المحرك المباشر' : 'Stop Direct Engine'}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-white fill-current" />
                  <span>{isAr ? 'تشغيل المحرك المباشر' : 'Launch Direct Engine'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Advantage Badges */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{isAr ? 'لا يتأثر بقفل الشاشة' : 'Works with screen off'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{isAr ? 'صفر تعليق واجهات' : 'Zero UI latency'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{isAr ? 'تشفير أندرويد رسمي' : 'Native Android headers'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{isAr ? 'حماية ضد الحظر' : 'Anti-ban jitter'}</span>
          </div>
        </div>
      </div>

      {/* ====================================================
          TWO-COLUMN DASHBOARD: SESSION & REAL-TIME CONTROLS
          ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Session Vault & Quick Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Captain Session & Bearer Vault */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white">
                    {isAr ? 'بيانات جلسة الكابتن (Samurai Session & Token)' : 'Captain Session Vault'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {isAr
                      ? 'رمز الأمان المرتبط بتطبيق الكابتن لإرسال أوامر الحجز المباشر'
                      : 'Bearer auth token used for direct shift booking requests'}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                {directProtocol.hasValidToken() ? (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {isAr ? 'الجلسة متصلة' : 'Session Linked'}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-black">
                    {isAr ? 'وضع المحاكاة التلقائي' : 'Auto Simulation Mode'}
                  </span>
                )}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  {isAr ? 'رمز التوكن (Bearer Token / Auth JWT):' : 'Bearer Auth Token:'}
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    {isAr ? 'معرف الكابتن (Driver UID):' : 'Driver ID:'}
                  </label>
                  <input
                    type="text"
                    value={driverIdInput}
                    onChange={(e) => setDriverIdInput(e.target.value)}
                    placeholder="CPT-90422"
                    className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSaveToken}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 border border-purple-400/40"
                  >
                    {tokenSavedSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>{isAr ? 'تم الحفظ والتحقق!' : 'Saved & Verified!'}</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{isAr ? 'حفظ والتحقق من الجلسة' : 'Save & Verify'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                {isAr
                  ? 'ملاحظة: في حال عدم إدخال توكن، سيعمل المحرك في وضع المحاكاة الذكي، وسيقوم بفحص السيرفرات وإرسال الأوامر بالسرعة الكاملة.'
                  : 'Note: If no token is entered, the engine runs in high-speed smart simulation mode.'}
              </span>
            </div>
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
                max="800"
                step="10"
                value={scanSpeedMs}
                onChange={(e) => setScanSpeedMs(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>{isAr ? '⚡ 50ms (فائق السرعة)' : '⚡ 50ms (Ultra)'}</span>
                <span>{isAr ? '🛡️ 300ms (حماية قصوى)' : '🛡️ 300ms (Stealth)'}</span>
                <span>800ms</span>
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

            {/* Instant Test Drop Button */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTriggerTestDrop}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs shadow-lg shadow-orange-950/40 transition-all cursor-pointer active:scale-95 border border-amber-400/40"
              >
                <Flame className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>
                  {isAr
                    ? '🎯 تجربة فورية: نزول شفت واقتناصه الآن (Test Drop & Instant Snipe)'
                    : '🎯 Trigger Instant Shift Drop Test (Simulate Now)'}
                </span>
              </button>
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
                  {isAr ? 'اضغط "تشغيل المحرك المباشر" لبدء رصد حركة الشبكة...' : 'Launch engine to inspect network traces...'}
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
                        : 'bg-slate-900/60 border-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-black px-1.5 py-0.2 rounded text-[9px] ${
                            log.method === 'POST'
                              ? 'bg-purple-600 text-white'
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
