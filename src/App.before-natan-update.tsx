import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar';
import { SpeedEngineConfig } from './components/SpeedEngineConfig';
import { CriteriaEditor } from './components/CriteriaEditor';
import { SimulatorRadar } from './components/SimulatorRadar';
import { LogViewer } from './components/LogViewer';
import { CodeExportModal } from './components/CodeExportModal';
import { AiAdvisor } from './components/AiAdvisor';
import { DirectApiBot } from './components/DirectApiBot';
import { WhatsAppSupport } from './components/WhatsAppSupport';
import AuthModal from './components/AuthModal';
import { Shift, BookingSettings, LogEntry, PerformanceStats, AppAuthSession } from './types';
import { SAUDI_CITIES, DAYS_OF_WEEK } from './data/saudiCities';
import { soundFX } from './utils/audio';
import { haptics } from './utils/haptics';
import { wakeLock } from './utils/wakeLock';
import { findConflictingShift } from './utils/timeConflict';
import { NatanLogo } from './components/NatanLogo';
import { useLanguage } from './utils/i18n';
import { 
  Zap, 
  Radio, 
  Settings, 
  Sparkles, 
  Terminal, 
  SlidersHorizontal,
  Flame,
  AlertCircle,
  Server,
  ShieldCheck,
  ShieldAlert,
  MessageCircle,
  Lock,
  Smartphone
} from 'lucide-react';

const INITIAL_SETTINGS: BookingSettings = {
  autoBooking: true,
  monitoring: true,
  speedMode: 'turbo',
  scanIntervalMs: 80,
  humanJitterMs: 15,
  autoRefresh: true,
  refreshIntervalSec: 3,
  autoConfirmDialog: true,
  bypassBatteryOptimization: true,
  wakeLockEnabled: true,
  secureScreenMode: true, // 🛡️ تفعيل منع تصوير الشاشة (FLAG_SECURE) افتراضياً

  // Pro 5 Enhancements (from Video Insights)
  branchKeywordNumbers: ['#420', '#422', '#495', '#534', '#266', '#78'],
  minuteTolerance: 5,
  volumeKeysControl: true,
  multiShiftWindows: [
    { id: 1, name: 'مناوبة 1 (الفترة الأساسية)', enabled: true, startTime: '08:01', endTime: '23:59' },
    { id: 2, name: 'مناوبة 2 (الفترة الإضافية)', enabled: false, startTime: '12:00', endTime: '23:59' },
    { id: 3, name: 'مناوبة 3 (المسائية/الفجر)', enabled: false, startTime: '00:00', endTime: '08:00' },
  ],
  
  selectedCity: 'dammam_khobar',
  selectedDistricts: ['حبوبة HABOBA (#495)', 'ظهران Dahran (#420)', 'ضاحية الملك فهد King Fahad (#534)', 'الشاطئ Shatie (#266)', 'الأمل Al Amal (#532)'],
  selectedDays: ['الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
  startTime: '00:00',
  endTime: '23:59',
  minDurationHours: 1,
  maxDurationHours: 14,
  onlyPeakHours: false,
  
  soundAlert: true,
  vibrationAlert: true,
};

export default function App() {
  const { t, isAr, language } = useLanguage();
  const [settings, setSettings] = useState<BookingSettings>(INITIAL_SETTINGS);
  const [activeView, setActiveView] = useState<'radar' | 'criteria' | 'engine' | 'code' | 'api_bot'>('radar');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);
  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(true);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  
  // Authentication & Activation License State
  const [authSession, setAuthSession] = useState<AppAuthSession | null>(() => {
    try {
      const saved = localStorage.getItem('natan_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved) as AppAuthSession;
        // Verify expiry
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch {
      // safe fallback
    }
    return null;
  });

  // If not authenticated or expired, modal must be open and locked
  const isLicensed = !!(authSession && authSession.isAuthenticated && authSession.expiresAt > Date.now());
  // Always display the registration / login modal first upon opening the app
  const [showAuthModal, setShowAuthModal] = useState<boolean>(true);

  const handleAuthSuccess = (session: AppAuthSession) => {
    setAuthSession(session);
    try {
      localStorage.setItem('natan_auth_session', JSON.stringify(session));
    } catch {
      // safe
    }
    setShowAuthModal(false);
    addLog('success', `✨ تم تفعيل وترخيص البرنامج بنجاح! [${session.planName}] ينتهي في: ${new Date(session.expiresAt).toLocaleDateString('ar-SA')}`);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
      });
    } catch {
      // safe
    }
  };

  // Shifts Data
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([
    {
      id: 'shift_init_haboba_1',
      shiftCode: 'DMM-HAB001',
      city: 'الدمام والخبر',
      district: 'حبوبة HABOBA (#495)',
      storeName: 'حبوبة HABOBA',
      storeNumber: '#495',
      date: '2026-09-13',
      dayName: 'الأربعاء (اليوم)',
      startTime: '١٢:٠١ م',
      endTime: '١٢:٠٠ ص',
      durationHours: 12,
      basePay: 260,
      bonusPay: 40,
      totalPay: 300,
      hourlyRate: 25,
      isPeak: true,
      shiftStateLabel: 'نشط',
      status: 'available',
      detectedAt: Date.now(),
    },
    {
      id: 'shift_init_dahran_2',
      shiftCode: 'DMM-DHR001',
      city: 'الدمام والخبر',
      district: 'ظهران Dahran (#420)',
      storeName: 'ظهران Dahran',
      storeNumber: '#420',
      date: '2026-09-13',
      dayName: 'الأربعاء (اليوم)',
      startTime: '٠٧:٠١ ص',
      endTime: '٠٧:٠٠ م',
      durationHours: 12,
      basePay: 280,
      bonusPay: 50,
      totalPay: 330,
      hourlyRate: 27.5,
      isPeak: true,
      shiftStateLabel: 'نشط',
      status: 'available',
      detectedAt: Date.now(),
    },
    {
      id: 'shift_init_king_fahad_3',
      shiftCode: 'DMM-FAY001',
      city: 'الدمام والخبر',
      district: 'ضاحية الملك فهد King Fahad (#534)',
      storeName: 'ضاحية الملك فهد',
      storeNumber: '#534',
      date: '2026-09-13',
      dayName: 'الأربعاء (اليوم)',
      startTime: '١٠:٢٥ ص',
      endTime: '١٠:٢٥ م',
      durationHours: 12,
      basePay: 270,
      bonusPay: 40,
      totalPay: 310,
      hourlyRate: 25.8,
      isPeak: false,
      shiftStateLabel: 'نشط',
      status: 'available',
      detectedAt: Date.now(),
    },
  ]);

  const [capturedShifts, setCapturedShifts] = useState<Shift[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log_0',
      timestamp: new Date().toLocaleTimeString('ar-SA'),
      type: 'info',
      message: 'تم تشغيل محرك NATAN PRO v3.5 بنجاح. جاهز لرصد شفتات نينجا السعودية.',
    },
  ]);

  const [stats, setStats] = useState<PerformanceStats>({
    totalScans: 412,
    shiftsDetected: 1,
    shiftsCaptured: 0,
    shiftsMissed: 0,
    avgResponseTimeMs: 0,
    fastestResponseTimeMs: 0,
    successRate: 100,
  });

  // WhatsApp-style Heads-Up Banner Notification state
  const [whatsappBanner, setWhatsappBanner] = useState<{
    show: boolean;
    title: string;
    body: string;
    time: string;
    shiftCode: string;
  } | null>(null);

  const addLog = (type: LogEntry['type'], message: string, durationMs?: number) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    const newEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: timeStr,
      type,
      message,
      durationMs,
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 100)]);
  };

  const updateSettings = (partial: Partial<BookingSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      return updated;
    });
  };

  // Helper to generate a realistic Saudi Ninja shift
  const generateRandomShift = (): Shift => {
    const cityObj = SAUDI_CITIES.find((c) => c.id === settings.selectedCity) || SAUDI_CITIES[0];
    const district = cityObj.districts[Math.floor(Math.random() * cityObj.districts.length)];
    const day = DAYS_OF_WEEK[Math.floor(Math.random() * DAYS_OF_WEEK.length)];
    const duration = Math.floor(Math.random() * 4) + 4; // 4 to 7 hours
    const startHour = Math.floor(Math.random() * 12) + 9;
    const endHour = (startHour + duration) % 24;
    const isPeak = Math.random() > 0.4;
    const hourly = isPeak ? Math.floor(Math.random() * 8) + 26 : Math.floor(Math.random() * 6) + 20;
    const total = hourly * duration;

    const prefix = district.includes('HABOBA') ? 'HAB001' :
      district.includes('Shatie') ? 'SHA001' :
      district.includes('Dahran') ? 'DHR001' :
      district.includes('Amal') ? 'MHA001' :
      district.includes('King Fahad') ? 'FAY001' :
      district.includes('Shulah') ? 'OMR001' :
      district.includes('Almanar') ? 'MAN001' :
      district.includes('Orouba') ? 'MND001' : 'SWD001';

    const code = `DMM-${prefix}`;
    const stateLabel: 'قادمة' | 'نشط' = Math.random() > 0.4 ? 'قادمة' : 'نشط';

    const formatHour = (h: number) => {
      const period = h >= 12 && h < 24 ? 'م' : 'ص';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12.toString().padStart(2, '0')}:00 ${period}`;
    };

    return {
      id: `shift_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      shiftCode: code,
      city: cityObj.name,
      district,
      storeName: district,
      storeNumber: district.match(/#\d+/)?.[0] || '',
      date: new Date().toISOString().split('T')[0],
      dayName: `${day} (اليوم)`,
      startTime: formatHour(startHour),
      endTime: formatHour(endHour),
      durationHours: duration,
      basePay: total - (isPeak ? 30 : 0),
      bonusPay: isPeak ? 30 : 0,
      totalPay: total,
      hourlyRate: hourly,
      isPeak,
      shiftStateLabel: stateLabel,
      status: 'available',
      detectedAt: Date.now(),
    };
  };

  // Manual Trigger Flash Drop
  const triggerInstantDrop = () => {
    const newShift = generateRandomShift();
    setAvailableShifts((prev) => [newShift, ...prev]);
    addLog('warning', `⚡ رصد نزول شفت فلاشي جديد في [${newShift.city} - ${newShift.district}] بمبلغ ${newShift.totalPay} ر.س`);
    haptics.vibrateTick();
    if (settings.soundAlert) {
      soundFX.playSpeedTick();
    }
  };

  // Manual Shift Booking
  const bookShiftManually = (shiftId: string) => {
    const target = availableShifts.find((s) => s.id === shiftId);
    if (!target) return;

    const conflict = findConflictingShift(target, capturedShifts);
    if (conflict) {
      addLog(
        'warning',
        `⚠️ تعارض في الوقت: لا يمكن حجز هذا الشفت لأن لديك شفت محجوز مسبقاً في نفس الفترة (${conflict.startTime} - ${conflict.endTime})`
      );
      haptics.vibrateAlert();
      soundFX.playSpeedTick();
      return;
    }

    executeBooking(target, 45);
  };

  // Manual Delete Available Shift
  const deleteAvailableShift = (shiftId: string) => {
    setAvailableShifts((prev) => prev.filter((s) => s.id !== shiftId));
    addLog('info', '🗑️ تم حذف الشفت من قائمة الشفتات المتاحة بنجاح');
  };

  // Booking Execution Logic
  const executeBooking = (shift: Shift, customLatency?: number) => {
    // 🛡️ Security & Anti-Theft: Program must be activated with valid license key
    if (!isLicensed) {
      setShowAuthModal(true);
      addLog('error', '🔒 تم إيقاف الحجز: البرنامج غير مفعّل أو انتهت صلاحية الترخيص. يرجى إدخال كود التفعيل.');
      return;
    }

    // Prevent booking if overlaps with already captured shift
    const conflict = findConflictingShift(shift, capturedShifts);
    if (conflict) {
      addLog(
        'warning',
        `⚠️ تم إلغاء الحجز: تعارض في الوقت مع الشفت المحجوز سابقاً [${conflict.district}] (${conflict.startTime} - ${conflict.endTime})`
      );
      haptics.vibrateAlert();
      return;
    }

    const jitter = Math.floor(Math.random() * settings.humanJitterMs);
    const latency = customLatency ?? (settings.scanIntervalMs / 2 + 12 + jitter);

    const updatedShift: Shift = {
      ...shift,
      status: 'booked',
      bookedAt: Date.now(),
      responseTimeMs: latency,
    };

    setAvailableShifts((prev) => prev.filter((s) => s.id !== shift.id));
    setCapturedShifts((prev) => [updatedShift, ...prev]);

    // Update Stats
    setStats((prev) => {
      const newCaptured = prev.shiftsCaptured + 1;
      const newAvg = Math.round(
        prev.avgResponseTimeMs === 0 ? latency : (prev.avgResponseTimeMs + latency) / 2
      );
      const fastest =
        prev.fastestResponseTimeMs === 0 ? latency : Math.min(prev.fastestResponseTimeMs, latency);

      return {
        ...prev,
        shiftsCaptured: newCaptured,
        avgResponseTimeMs: newAvg,
        fastestResponseTimeMs: fastest,
      };
    });

    addLog(
      'success',
      `🎉 تم تثبيت وحجز الشفت بنجاح: [${shift.city} - ${shift.district}] | ${shift.totalPay} ر.س (${shift.startTime}-${shift.endTime})`,
      latency
    );

    // 📳 Mobile APK Physical Vibration Alert
    if (settings.vibrationAlert) {
      haptics.vibrateCapture();
    }

    // 🔊 Audio Synthesizer Alert
    if (settings.soundAlert) {
      soundFX.playSuccess();
    }

    // Trigger WhatsApp-style Heads-Up Banner Notification
    setWhatsappBanner({
      show: true,
      title: '🎯 NATAN PRO • تم حجز شفت نينجا الآن!',
      body: `${shift.district} (${shift.shiftCode || 'DMM'}) • الأجر: ${shift.totalPay} ر.س • ${shift.startTime} إلى ${shift.endTime}`,
      time: 'الآن',
      shiftCode: shift.shiftCode || 'DMM-001',
    });

    // Auto dismiss banner after 5 seconds like WhatsApp
    setTimeout(() => {
      setWhatsappBanner((cur) => (cur ? { ...cur, show: false } : null));
    }, 5500);

    // Confetti effect
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // safe
    }
  };

  // Real-time Automated Monitoring Loop
  useEffect(() => {
    if (!isLicensed || !settings.monitoring || !settings.autoBooking) return;

    // Check available shifts against criteria
    if (availableShifts.length > 0) {
      const match = availableShifts.find((s) => {
        // 1. Hashtag (#) & District filter
        const hasHashtags = settings.branchKeywordNumbers && settings.branchKeywordNumbers.length > 0;
        const matchesHashtag = hasHashtags
          ? settings.branchKeywordNumbers!.some((tag) => s.district.includes(tag) || (s.storeNumber && s.storeNumber.includes(tag)))
          : false;

        const matchesDistrict =
          settings.selectedDistricts.length > 0
            ? settings.selectedDistricts.some((d) => s.district.includes(d) || d.includes(s.district))
            : true;

        // إذا كان هناك هاشتاغات محددة، فإن مطابقة الهاشتاغ تعطي أولوية مطلقة
        if (hasHashtags && !matchesHashtag && !matchesDistrict) {
          return false;
        } else if (!hasHashtags && !matchesDistrict) {
          return false;
        }

        // Days filter
        if (settings.selectedDays.length > 0 && !settings.selectedDays.includes(s.dayName)) {
          return false;
        }
        // Duration
        if (s.durationHours < settings.minDurationHours || s.durationHours > settings.maxDurationHours) {
          return false;
        }
        // Peak only
        if (settings.onlyPeakHours && !s.isPeak) {
          return false;
        }
        // Conflict Prevention: No double-booking if shift overlaps with any already captured shift
        const conflict = findConflictingShift(s, capturedShifts);
        if (conflict) {
          return false;
        }
        return true;
      });

      if (match) {
        const timer = setTimeout(() => {
          executeBooking(match);
        }, Math.max(20, settings.scanIntervalMs / 2));
        return () => clearTimeout(timer);
      }
    }
  }, [availableShifts, settings, isLicensed]);

  // Hardware Volume Keys Simulation / Listener (From Pro 5 Video analysis)
  useEffect(() => {
    if (!settings.volumeKeysControl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'AudioVolumeUp' || (e.altKey && e.key === 'ArrowUp')) {
        e.preventDefault();
        setIsCodeModalOpen(true);
        addLog('info', '🎧 [مفتاح رفع الصوت]: تم فتح لوحة الأكواد والتعليمات');
      } else if (e.key === 'AudioVolumeDown' || (e.altKey && e.key === 'ArrowDown')) {
        e.preventDefault();
        setSettings((prev) => {
          const next = !prev.autoRefresh;
          addLog('info', `🎧 [مفتاح خفض الصوت]: ${next ? 'تم تفعيل' : 'تم إيقاف'} السحب التلقائي (Auto-Refresh)`);
          return { ...prev, autoRefresh: next };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.volumeKeysControl]);

  // 📱 Screen WakeLock: منع هاتف أندرويد من النوم وقفل الشاشة أثناء استمرار الرصد
  useEffect(() => {
    if (settings.monitoring && settings.wakeLockEnabled) {
      wakeLock.request().then((success) => {
        if (success) {
          addLog('info', '💡 [WakeLock نشط] تم منع شاشة الهاتف من القفل التلقائي لضمان استمرار صيد الشفتات.');
        }
      }).catch(() => {});
    } else {
      wakeLock.release().catch(() => {});
    }

    return () => {
      wakeLock.release().catch(() => {});
    };
  }, [settings.monitoring, settings.wakeLockEnabled]);

  // 🛡️ FLAG_SECURE: حماية صامتة في الخلفية ضد تصوير الشاشة وطباعتها
  useEffect(() => {
    if (!settings.secureScreenMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // اعتراض زر PrintScreen واختصارات الطباعة والتصوير Ctrl+P / Cmd+P
      if (
        e.key === 'PrintScreen' || 
        ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 's'))
      ) {
        e.preventDefault();
        addLog('warning', '🛡️ [حماية الشاشة] تم حظر محاولة التقاط الشاشة لحماية سرية حسابك والشفتات.');
        if (settings.soundAlert) {
          soundFX.playSpeedTick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.secureScreenMode, settings.soundAlert]);

  // Background Simulation Interval (drops shifts periodically if enabled)
  useEffect(() => {
    if (!isAutoSimulating) return;

    const interval = setInterval(() => {
      // Randomly drop a shift every 14 seconds
      if (Math.random() > 0.35) {
        const newShift = generateRandomShift();
        setAvailableShifts((prev) => [newShift, ...prev.slice(0, 4)]);
        addLog('info', `📡 وصول تحديث شبكي: توفر شفت في [${newShift.district}]`);
      }
    }, 14000);

    return () => clearInterval(interval);
  }, [isAutoSimulating, settings.selectedCity]);

  return (
    <div className="min-h-screen bg-[#090a18] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      {/* Top Ambient Purple Glow from Mascot Crescent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[680px] h-[280px] bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* WhatsApp-Style Heads-Up Floating Banner Notification */}
      {whatsappBanner && whatsappBanner.show && (
        <div className="fixed top-3 left-0 right-0 z-50 flex justify-center px-3 pointer-events-none animate-in slide-in-from-top-4 duration-300">
          <div className="w-full max-w-md bg-slate-900/95 text-white rounded-2xl p-3.5 shadow-2xl border border-purple-500/40 backdrop-blur-md pointer-events-auto flex items-start gap-3 ring-2 ring-purple-500/20">
            {/* Mascot App Icon */}
            <NatanLogo size="sm" withGlow={true} />

            {/* Notification Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-black text-purple-300 truncate">
                  {whatsappBanner.title}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {whatsappBanner.time}
                </span>
              </div>
              <p className="text-xs text-slate-200 font-bold mt-0.5 leading-snug">
                {whatsappBanner.body}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                  ⚡ حجز فوري في الخلفية
                </span>
                <span>اضغط للفتح المباشر</span>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setWhatsappBanner(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        settings={settings}
        onUpdateSettings={updateSettings}
        onOpenCodeModal={() => setIsCodeModalOpen(true)}
        onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
        onOpenWhatsApp={() => setIsWhatsAppModalOpen(true)}
        onTriggerTestDrop={triggerInstantDrop}
        totalCaptured={capturedShifts.length}
        authSession={authSession}
        onOpenLicense={() => setShowAuthModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-6 relative z-10">
        {/* Quick View Switcher Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-slate-800/80">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveView('radar')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeView === 'radar'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/40'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300 shrink-0" />
              <span className="truncate">{t.tabRadar}</span>
            </button>

            <button
              onClick={() => setActiveView('criteria')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeView === 'criteria'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/40'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300 shrink-0" />
              <span className="truncate">{t.tabCriteria}</span>
            </button>

            <button
              onClick={() => setActiveView('engine')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeView === 'engine'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/40'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="truncate">{t.tabEngine} ({settings.scanIntervalMs}ms)</span>
            </button>

            <button
              onClick={() => setActiveView('api_bot')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer relative active:scale-95 ${
                activeView === 'api_bot'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30 border border-purple-400/50'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-purple-500/30'
              }`}
            >
              <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
              <span className="truncate">{t.tabApiBot}</span>
              <span className="hidden sm:inline-block text-[10px] bg-purple-500/30 text-purple-200 px-1.5 py-0.2 rounded-full border border-purple-400/40 font-mono font-bold">
                {t.directApiBadge}
              </span>
            </button>
          </div>

          {/* Quick Engine Status Pill */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 text-xs bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            {/* License Anti-theft Badge */}
            <button
              onClick={() => setShowAuthModal(true)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ${
                isLicensed
                  ? 'bg-purple-950/40 text-purple-300 border-purple-500/30 hover:bg-purple-900/50'
                  : 'bg-rose-950/50 text-rose-300 border-rose-500/40 animate-pulse'
              }`}
              title={isLicensed ? (isAr ? 'الترخيص نشط ومربوط بجهازك' : 'License active and bound to device') : (isAr ? 'البرنامج غير مرخص! انقر للتفعيل' : 'Unlicensed! Click to activate')}
            >
              {isLicensed ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{t.licensedAndEncrypted}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>{t.unlicensedLocked}</span>
                </>
              )}
            </button>

            <div className="h-3 w-px bg-slate-800"></div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium text-[11px] sm:text-xs">{t.autoBookingLabel}</span>
              <span className={`px-2 py-0.5 rounded-full font-black text-[10px] sm:text-[11px] ${
                settings.autoBooking && isLicensed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {settings.autoBooking && isLicensed ? t.autoBookingActive : t.autoBookingManual}
              </span>
            </div>
            
            <div className="h-3 w-px bg-slate-800"></div>

            <span className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px] sm:text-xs">
              <span className={`w-2 h-2 rounded-full ${settings.monitoring && isLicensed ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
              {settings.monitoring && isLicensed ? t.screenWatching : t.monitoringStopped}
            </span>
          </div>
        </div>

        {/* View Layouts */}
        {activeView === 'radar' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              <SimulatorRadar
                settings={settings}
                availableShifts={availableShifts}
                capturedShifts={capturedShifts}
                stats={stats}
                onTriggerInstantDrop={triggerInstantDrop}
                onBookShiftManually={bookShiftManually}
                onDeleteShift={deleteAvailableShift}
                isAutoSimulating={isAutoSimulating}
                onToggleAutoSimulating={() => setIsAutoSimulating(!isAutoSimulating)}
              />
            </div>

            <div className="lg:col-span-5 space-y-6">
              <SpeedEngineConfig
                settings={settings}
                onUpdateSettings={updateSettings}
              />
              <LogViewer logs={logs} onClearLogs={() => setLogs([])} />
            </div>
          </div>
        )}

        {activeView === 'criteria' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <CriteriaEditor
                settings={settings}
                onUpdateSettings={updateSettings}
              />
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
                  <Flame className="w-5 h-5" />
                  <span>تأثير الفلاتر على سرعة مسك الشفت</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  تحديد عدد قليل جداً من الفروع قد يقلل فرصك. للحصول على أعلى عدد شفتات، حدد على الأقل <strong>3 إلى 5 مستودعات</strong> قريبة منك. تذكر دائماً أنه بمجرد حجز شفت في وقت محدد، يقوم النظام تلقائياً باستبعاد وقفل أي شفتات أخرى تتداخل في نفس الوقت لضمان عدم التعارض.
                </p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">الفروع المختارة:</span>
                  <span className="font-bold text-sky-400">
                    {settings.selectedDistricts.length === 0 ? 'الكل متاح' : `${settings.selectedDistricts.length} فرع`}
                  </span>
                </div>
              </div>

              <LogViewer logs={logs} onClearLogs={() => setLogs([])} />
            </div>
          </div>
        )}

        {activeView === 'engine' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <SpeedEngineConfig
                settings={settings}
                onUpdateSettings={updateSettings}
              />
            </div>

            <div className="lg:col-span-5 space-y-6">
              <LogViewer logs={logs} onClearLogs={() => setLogs([])} />
            </div>
          </div>
        )}

        {activeView === 'api_bot' && (
          <DirectApiBot
            settings={settings}
            onUpdateSettings={updateSettings}
            onBookShift={bookShiftManually}
            onTriggerInstantDrop={triggerInstantDrop}
            onAddLog={addLog}
          />
        )}
      </main>

      {/* Professional WhatsApp Support Footer Banner */}
      <footer className="border-t border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950 backdrop-blur-xl py-8 px-4 text-xs text-slate-400 mt-10 relative z-20">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Main WhatsApp Card */}
          <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900/80 to-purple-950/20 border border-emerald-500/25 shadow-xl shadow-emerald-950/20 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3.5 text-right">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner shadow-emerald-500/20 shrink-0">
                <MessageCircle className="w-6 h-6 fill-emerald-400/20 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-white">الدعم الفني المباشر عبر واتساب</h3>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    متواجدون الآن
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  تواصل فوري للمساعدة في تفعيل الحسابات، استخراج التوكن، أو ضبط سرعة اقتناص الشفتات
                </p>
              </div>
            </div>

            {/* Direct WhatsApp Action Buttons with Icons only */}
            <div className="flex items-center gap-3">
              <a
                href="https://wa.me/97333314353?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%B3%D9%83%D8%B1%D8%A8%D8%AA%20%D9%86%D9%8A%D9%86%D8%AC%D8%A7%20(NATAN%20PRO)"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-emerald-400/40"
                title="محادثة واتساب - الدعم الفني"
                aria-label="محادثة واتساب"
              >
                <MessageCircle className="w-6 h-6 fill-white" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                </span>
              </a>

              <a
                href="https://wa.me/97333269372?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%B3%D9%83%D8%B1%D8%A8%D8%AA%20%D9%86%D9%8A%D9%86%D8%AC%D8%A7%20(NATAN%20PRO)"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-800 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-500/60 transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                title="محادثة واتساب - خط الدعم الثاني"
                aria-label="خط واتساب الثاني"
              >
                <MessageCircle className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Sub-footer Brand info */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px] pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">NATAN <span className="text-purple-400">PRO</span> v3.5</span>
              <span>•</span>
              <span>منظومة شفتات نينجا وساموراي الميدانية</span>
            </div>
            <span>خدمة العملاء والدعم الفني متاحة 24/7 عبر قنوات واتساب المعتمدة</span>
          </div>
        </div>
      </footer>

      {/* Code Studio Modal */}
      <CodeExportModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />

      {/* AI Strategy Advisor Modal */}
      <AiAdvisor
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        onApplyPreset={(preset) => {
          updateSettings(preset);
          addLog('info', 'تم تطبيق إعدادات الاستراتيجية الموصى بها من المستشار الذكي');
        }}
      />

      {/* Login & License Activation Modal */}
      {showAuthModal && (
        <AuthModal
          currentSession={authSession}
          onAuthenticate={handleAuthSuccess}
          onOpenWhatsApp={() => setIsWhatsAppModalOpen(true)}
          onClose={isLicensed ? () => setShowAuthModal(false) : undefined}
          initialTab="login"
        />
      )}
    </div>
  );
}
