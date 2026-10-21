import React, { useState } from 'react';
import { Gauge, Zap, RefreshCw, MousePointerClick, ShieldAlert, Volume2, BatteryCharging, CheckCircle2, Server, ArrowRight, Smartphone, Sliders, ShieldCheck, Vibrate, ExternalLink, Settings as SettingsIcon } from 'lucide-react';
import { BookingSettings } from '../types';
import { haptics } from '../utils/haptics';
import { soundFX } from '../utils/audio';
import { useLanguage } from '../utils/i18n';

interface SpeedEngineConfigProps {
  settings: BookingSettings;
  onUpdateSettings: (partial: Partial<BookingSettings>) => void;
  onNavigateToApiBot?: () => void;
}

export const SpeedEngineConfig: React.FC<SpeedEngineConfigProps> = ({
  settings,
  onUpdateSettings,
  onNavigateToApiBot,
}) => {
  const { t, isAr } = useLanguage();
  const [batteryNotice, setBatteryNotice] = useState<string | null>(null);
  const [isOpeningBattery, setIsOpeningBattery] = useState(false);

  const handleOpenBatterySettings = async () => {
    setIsOpeningBattery(true);
    haptics.vibrateTick();
    soundFX.playSpeedTick();
    try {
      const { openNatanBatterySettings, isNatanNativeAndroid } = await import('../utils/natanAutomation');
      if (isNatanNativeAndroid()) {
        await openNatanBatterySettings();
        setBatteryNotice(isAr ? '⚡ تم فتح إعدادات تحسين البطارية في هاتفك! اختر "غير مقيّد"' : 'Opened Battery Settings on Android! Select "Unrestricted"');
      } else {
        // Fallback for browser/preview
        setBatteryNotice(isAr ? '📱 على هاتف الأندرويد: يفتح شاشة تحسين البطارية فوراً لتعطيل التقييد' : 'On Android device: Opens battery settings directly to disable power restrictions');
      }
    } catch (e) {
      setBatteryNotice(isAr ? '⚠️ تعذر فتح شاشة البطارية تلقائياً؛ يرجى فتح الإعدادات ⇦ التطبيقات ⇦ NATAN ⇦ البطارية ⇦ غير مقيّد' : 'Go to Settings > Apps > NATAN > Battery > Unrestricted');
    } finally {
      setTimeout(() => setIsOpeningBattery(false), 800);
      setTimeout(() => setBatteryNotice(null), 6000);
    }
  };
  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-3.5 sm:p-5 lg:p-6 shadow-xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
            <Gauge className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 sm:gap-2">
              <span>{t.tabSpeed}</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                Turbo Engine
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              {isAr ? 'ضبط تردد الفحص، إيماءات النقر بالمللي ثانية وتفادي حظر البوتات' : 'Configure scan intervals, click gestures in milliseconds, and anti-detection'}
            </p>
          </div>
        </div>
      </div>

      {/* Preset Speed Modes */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 block">
          {isAr ? 'أوضاع السرعة المسبقة:' : 'Speed Presets:'}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onUpdateSettings({ speedMode: 'ultra', scanIntervalMs: 50, humanJitterMs: 10 })}
            className={`p-3.5 sm:p-4 min-h-[64px] rounded-xl border text-right transition-all cursor-pointer active:scale-95 flex flex-col justify-between ${
              settings.speedMode === 'ultra'
                ? 'bg-purple-500/15 border-purple-500 text-purple-300 ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/15'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-black text-xs sm:text-sm text-white">{isAr ? '⚡ فائق (Ultra)' : '⚡ Ultra'}</span>
              <span className="text-[11px] font-mono font-bold bg-purple-500/25 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">50ms</span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">{isAr ? 'أسرع ما يمكن لاقتناص شفتات الفلاش لحظة نزولها.' : 'Maximum speed for capturing instant flash drops.'}</p>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ speedMode: 'turbo', scanIntervalMs: 100, humanJitterMs: 20 })}
            className={`p-3.5 sm:p-4 min-h-[64px] rounded-xl border text-right transition-all cursor-pointer active:scale-95 flex flex-col justify-between ${
              settings.speedMode === 'turbo'
                ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/15'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-black text-xs sm:text-sm text-white">{isAr ? '🚀 توربو (Turbo)' : '🚀 Turbo'}</span>
              <span className="text-[11px] font-mono font-bold bg-indigo-500/25 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">100ms</span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">{isAr ? 'التوازن المثالي بين سرعة الالتقاط وثبات الاتصال.' : 'Ideal balance between capture speed and connection stability.'}</p>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ speedMode: 'stealth', scanIntervalMs: 250, humanJitterMs: 40 })}
            className={`p-3.5 sm:p-4 min-h-[64px] rounded-xl border text-right transition-all cursor-pointer active:scale-95 flex flex-col justify-between ${
              settings.speedMode === 'stealth'
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/15'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-black text-xs sm:text-sm text-white">{isAr ? '🛡️ متخفي (Stealth)' : '🛡️ Stealth'}</span>
              <span className="text-[11px] font-mono font-bold bg-emerald-500/25 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">250ms</span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">{isAr ? 'نظام نقر ذكي بتباين زمني طبيعي لحماية الحساب من الكشف.' : 'Smart click timing variation to protect account safety.'}</p>
          </button>
        </div>
      </div>

      {/* Manual Frequency Tuning */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-purple-400" />
            {isAr ? 'معدل الفحص وتحديث الشاشة بالمللي ثانية (Interval):' : 'Scan & Refresh Interval (ms):'}
          </span>
          <span className="font-mono text-purple-400 font-bold text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
            {settings.scanIntervalMs} ms
          </span>
        </div>
        <input
          type="range"
          min={30}
          max={400}
          step={10}
          value={settings.scanIntervalMs}
          onChange={(e) => onUpdateSettings({ scanIntervalMs: Number(e.target.value) })}
          className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{isAr ? '30ms (خارق - شفتات فورية)' : '30ms (Ultra - Instant)'}</span>
          <span>{isAr ? '150ms (متوسط)' : '150ms (Balanced)'}</span>
          <span>{isAr ? '400ms (هادئ)' : '400ms (Safe)'}</span>
        </div>
      </div>

      {/* Advanced Automation Switches */}
      <div className="space-y-3">
        {/* Auto Confirm */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
              <MousePointerClick className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">{isAr ? 'تأكيد الحجز الفوري التلقائي (Auto-Confirm)' : 'Instant Auto-Confirm'}</p>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'الضغط على زر "تأكيد" أو "موافق" في النافذة المنبثقة خلال أقل من 10ms دون انتظار' : 'Tap confirm dialog in under 10ms with zero manual hesitation'}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.autoConfirmDialog}
            onChange={(e) => onUpdateSettings({ autoConfirmDialog: e.target.checked })}
            className="w-4 h-4 rounded accent-sky-500 cursor-pointer"
          />
        </div>

        {/* Auto Swipe Refresh */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 mt-0.5">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">{isAr ? 'إيماءة السحب للتحديث المستمر (Pull-To-Refresh)' : 'Continuous Pull-To-Refresh Swipe'}</p>
              <p className="text-[11px] text-slate-400">
                {isAr ? `سحب القائمة للأسفل لإجبار تطبيق نينجا على جلب الشفتات المسقطة حديثاً كل ${settings.refreshIntervalSec} ثوانٍ` : `Swipe down to force Ninja app to reload newly dropped shifts every ${settings.refreshIntervalSec}s`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={settings.refreshIntervalSec}
              onChange={(e) => onUpdateSettings({ refreshIntervalSec: Number(e.target.value) })}
              className="bg-slate-900 border border-slate-700 text-[11px] text-slate-300 rounded px-1.5 py-1"
            >
              <option value={2}>{isAr ? 'كل 2 ثانية' : 'Every 2s'}</option>
              <option value={3}>{isAr ? 'كل 3 ثوانٍ' : 'Every 3s'}</option>
              <option value={5}>{isAr ? 'كل 5 ثوانٍ' : 'Every 5s'}</option>
            </select>
            <input
              type="checkbox"
              checked={settings.autoRefresh}
              onChange={(e) => onUpdateSettings({ autoRefresh: e.target.checked })}
              className="w-4 h-4 rounded accent-sky-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Background & Keep-Alive Protection Controls */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <BatteryCharging className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-white">{isAr ? 'التشغيل المستمر في الخلفية (Background Engine)' : 'Continuous Background Engine'}</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isAr ? 'إبقاء المحرك شغالاً في الخلفية ومراقبة تطبيق نينجا أثناء استخدام تطبيقات أخرى أو إغلاق الشاشة' : 'Keep engine running in background and monitor Ninja shifts even when screen is locked'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {isAr ? 'مدعوم بالكامل' : 'Supported'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 cursor-pointer hover:border-slate-600 transition-colors">
              <span className="text-[11px] text-slate-300 font-medium">{isAr ? 'تجاوز توفير البطارية (Ignore Battery Optimizations)' : 'Ignore Battery Optimizations'}</span>
              <input
                type="checkbox"
                checked={settings.bypassBatteryOptimization}
                onChange={(e) => onUpdateSettings({ bypassBatteryOptimization: e.target.checked })}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 cursor-pointer hover:border-slate-600 transition-colors">
              <span className="text-[11px] text-slate-300 font-medium">{isAr ? 'منع المعالج من النوم (WakeLock Background)' : 'WakeLock Keep-Alive'}</span>
              <input
                type="checkbox"
                checked={settings.wakeLockEnabled}
                onChange={(e) => onUpdateSettings({ wakeLockEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Anti-detection Jitter */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">{isAr ? 'تشتيت الإحداثيات (Anti-Ban Jitter)' : 'Anti-Ban Coordinate Jitter'}</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400">{isAr ? 'نشط دائماً' : 'Always Active'}</span>
        </div>

        {/* Sound & Notifications */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">{isAr ? 'التنبيه الصوتي والاهتزاز (Sound & Vibration)' : 'Sound & Vibration Alerts'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                haptics.vibrateCapture();
                soundFX.playSuccess();
              }}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title={isAr ? "تجربة الاهتزاز والصوت على هذا الهاتف" : "Test vibration and sound on this device"}
            >
              <Vibrate className="w-4 h-4 text-purple-300" />
              <span>{isAr ? 'تجربة الاهتزاز' : 'Test Haptic'}</span>
            </button>
            <input
              type="checkbox"
              checked={settings.soundAlert}
              onChange={(e) => onUpdateSettings({ soundAlert: e.target.checked })}
              className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Hardware Volume Keys Control (Pro 5 Feature from Video) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white">{isAr ? 'التحكم بأزرار الصوت المادية (Hardware Volume Keys)' : 'Hardware Volume Keys Control'}</p>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 rounded-full font-bold">
                  {isAr ? 'مكتشف بالفيديو 🎧' : 'From Video 🎧'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isAr ? (
                  <>
                    <strong className="text-purple-300">رفع الصوت (Volume Up):</strong> فتح/إغلاق لوحة الإعدادات العائمة فوق نينجا | <strong className="text-sky-300">خفض الصوت (Volume Down):</strong> تشغيل أو إيقاف السحب التلقائي (Auto-Refresh) فوراً.
                  </>
                ) : (
                  <>
                    <strong className="text-purple-300">Volume Up:</strong> Toggle floating overlay window over Ninja | <strong className="text-sky-300">Volume Down:</strong> Toggle Auto-Refresh instantly.
                  </>
                )}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.volumeKeysControl ?? true}
            onChange={(e) => onUpdateSettings({ volumeKeysControl: e.target.checked })}
            className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Phone Stability, Stealth Mode & Lock in Recents Guide */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>{isAr ? 'مركز الحماية واستقرار الهاتف (Anti-Ban & Stability Center)' : 'Anti-Ban & Phone Stability Center'}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  {isAr ? 'موصى به' : 'Recommended'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'إجراءات أساسية لضمان عمل الرصد في الخلفية لساعات طويلة دون إغلاق وحماية الحساب من الحظر' : 'Essential steps to keep background monitoring alive for hours and prevent account bans'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onUpdateSettings({ speedMode: 'stealth', scanIntervalMs: 250, humanJitterMs: 40 })}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'تطبيق وضع التخفي الآمن (Stealth 250ms)' : 'Apply Safe Stealth Mode (250ms)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Card 1: Disable Battery Optimization */}
          <div className="p-3.5 rounded-xl bg-slate-850 bg-slate-900/90 border border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <BatteryCharging className="w-4 h-4" />
              <span>{isAr ? '1. إلغاء تحسين البطارية' : '1. Disable Battery Saver'}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {isAr ? (
                <>
                  نظام أندرويد يقوم بإنهاء البرامج النشطة في الخلفية لتوفير الطاقة. يجب ضبط NATAN على <strong>"غير مقيّد (Unrestricted)"</strong>.
                </>
              ) : (
                'Android kills background engines to save power. Set NATAN to Unrestricted in battery settings.'
              )}
            </p>
            <div className="text-[10px] text-slate-400 space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <p>• <strong>سامسونج:</strong> الضبط ⇦ التطبيقات ⇦ NATAN ⇦ البطارية ⇦ غير مقيّد</p>
              <p>• <strong>شاومي / ريدمي:</strong> إعدادات التطبيق ⇦ موفر البطارية ⇦ بلا قيود</p>
            </div>
            {batteryNotice && (
              <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-200 leading-tight animate-fadeIn">
                {batteryNotice}
              </div>
            )}

            <button
              type="button"
              onClick={handleOpenBatterySettings}
              disabled={isOpeningBattery}
              className="w-full mt-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/25 to-amber-600/25 hover:from-amber-500/35 hover:to-amber-600/35 active:scale-95 text-amber-200 border border-amber-500/40 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <SettingsIcon className={`w-3.5 h-3.5 text-amber-300 ${isOpeningBattery ? 'animate-spin' : ''}`} />
              <span>{isOpeningBattery ? (isAr ? 'جاري الفتح...' : 'Opening...') : (isAr ? '⚙️ فتح إعدادات بطارية الهاتف' : '⚙️ Open Android Battery Settings')}</span>
              <ExternalLink className="w-3 h-3 text-amber-300 opacity-80" />
            </button>
          </div>

          {/* Card 2: Lock in Recents */}
          <div className="p-3.5 rounded-xl bg-slate-850 bg-slate-900/90 border border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold">
              <Sliders className="w-4 h-4" />
              <span>{isAr ? '2. قفل التطبيق في الحديثة' : '2. Lock in Recents'}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {isAr ? (
                <>
                  لمنع إغلاق NATAN أو تطبيق نينجا عند امتلاء الذاكرة العشوائية (RAM)، قم بوضع <strong>قفل الحماية</strong> في شاشة التطبيقات المفتوحة.
                </>
              ) : (
                'Prevent Android RAM cleaner from killing NATAN or Ninja while scanning.'
              )}
            </p>
            <div className="text-[10px] text-slate-400 space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <p>1. افتح شاشة التطبيقات المفتوحة (Recent Apps).</p>
              <p>2. اضغط مطولاً على أيقونة NATAN ثم اختر <strong>"قفل هذا التطبيق (Lock App 🔒)"</strong>.</p>
              <p>3. كرر نفس القفل على تطبيق نينجا كباتن.</p>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'يضمن بقاء البرنامج شغالاً دون انقطاع' : 'Ensures 24/7 background operation'}</span>
            </div>
          </div>

          {/* Card 3: Anti-Ban & Stealth Rules */}
          <div className="p-3.5 rounded-xl bg-slate-850 bg-slate-900/90 border border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{isAr ? '3. تفادي الحظر وأمان الحساب' : '3. Anti-Ban & Safety Rules'}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {isAr ? (
                <>
                  تم تصميم المحرك بخاصية <strong>Human Jitter</strong> لتوليد فوارق زمنية وإحداثيات نقر ذكية تضمن حماية الحساب من أي كشف أو حظر.
                </>
              ) : (
                'Human Jitter randomizes click coordinates by a few pixels so clicks appear organic and secure.'
              )}
            </p>
            <div className="text-[10px] text-slate-400 space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <p>• <strong>المراقبة الطويلة:</strong> استخدم وضع <strong>متخفي Stealth (250ms)</strong>.</p>
              <p>• <strong>لحظات النزول الحرجة:</strong> حوّل إلى <strong>فائق Ultra (50ms)</strong> لمدة 5 دقائق فقط ثم عد للتخفي.</p>
              <p>• <strong>جلسة رسمية:</strong> لا تقم بمشاركة الحساب أو تسجيل الدخول من أجهزة متعددة في نفس اللحظة.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
