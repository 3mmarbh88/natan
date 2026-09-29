import React, { useState } from 'react';
import { Radio, Zap, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, Clock, MapPin, Trash2, Flame, Sparkles, Lock, X, Ban, Server } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Shift, BookingSettings, PerformanceStats } from '../types';
import { soundFX } from '../utils/audio';
import { findConflictingShift } from '../utils/timeConflict';
import { NatanLogo } from './NatanLogo';
import { useLanguage } from '../utils/i18n';

interface SimulatorRadarProps {
  settings: BookingSettings;
  availableShifts: Shift[];
  capturedShifts: Shift[];
  stats: PerformanceStats;
  onTriggerInstantDrop: () => void;
  onBookShiftManually: (shiftId: string) => void;
  onDeleteShift?: (shiftId: string) => void;
  isAutoSimulating: boolean;
  onToggleAutoSimulating: () => void;
  onNavigateToApiBot?: () => void;
}

export const SimulatorRadar: React.FC<SimulatorRadarProps> = ({
  settings,
  availableShifts,
  capturedShifts,
  stats,
  onTriggerInstantDrop,
  onBookShiftManually,
  onDeleteShift,
  isAutoSimulating,
  onToggleAutoSimulating,
  onNavigateToApiBot,
}) => {
  const { t, isAr } = useLanguage();
  const [modalShift, setModalShift] = useState<Shift | null>(null);

  const handleTestDrop = () => {
    // Production: simulated drops are disabled.
    onTriggerInstantDrop();
  };

  const handleManualClick = (shift: Shift) => {
    const conflict = findConflictingShift(shift, capturedShifts);
    if (conflict) {
      soundFX.playSpeedTick();
      return;
    }

    if (settings.autoConfirmDialog) {
      // Auto confirm directly
      onBookShiftManually(shift.id);
    } else {
      // Show confirmation dialog matching video
      setModalShift(shift);
    }
  };

  const handleConfirmBooking = () => {
    if (modalShift) {
      const conflict = findConflictingShift(modalShift, capturedShifts);
      if (!conflict) {
        onBookShiftManually(modalShift.id);
      }
      setModalShift(null);
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-3.5 sm:p-5 lg:p-6 shadow-xl space-y-4 sm:space-y-6">
      {/* Header with Live Signal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3 sm:pb-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative shrink-0">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <NatanLogo size="xs" withGlow={false} />
            </div>
            {settings.monitoring && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span>{t.tabRadar}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black ${
                settings.monitoring
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {settings.monitoring ? (isAr ? '⚡ الرصد شغال' : '⚡ Radar Active') : (isAr ? 'متوقف' : 'Stopped')}
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              {isAr ? 'مراقبة شفتات Ninja الحقيقية فقط. لا توجد شفتات تجريبية في نسخة الإنتاج.' : 'Monitoring real Ninja shifts only. No simulated shifts are used in production.'}
            </p>
          </div>
        </div>

        {/* Production status: simulation controls intentionally removed. */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11px] sm:text-xs font-bold">
            <Server className="w-3.5 h-3.5" />
            <span>{isAr ? 'مصدر حقيقي: Ninja API' : 'Real source: Ninja API'}</span>
          </div>
        </div>
      </div>

      {/* Auto Booking Status Banner */}
      <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        settings.autoBooking
          ? 'bg-emerald-950/30 border-emerald-600/40 text-emerald-300'
          : 'bg-slate-900 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            settings.autoBooking ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
          }`}>
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">{t.autoBookingLabel}:</span>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                settings.autoBooking ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {settings.autoBooking ? t.autoBookingActive : t.autoBookingManual}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {settings.autoBooking 
                ? (isAr ? `المحرك سيفحص شروطك ويضغط "حجز فترة الدوام" فوراً في أقل من ${settings.scanIntervalMs}ms!` : `Engine checks your criteria and clicks "Book Shift Window" immediately in under ${settings.scanIntervalMs}ms!`)
                : (isAr ? 'لن يتم حجز أي شفت تلقائياً، يمكنك الضغط يدوياً على زر حجز فترة الدوام.' : 'No shift booked automatically; you can manually click the Book button.')}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <span className="text-[11px] text-slate-400 block">{isAr ? 'زمن الاستجابة المبرمج' : 'Target Interval'}</span>
          <span className="font-mono text-sm font-black text-purple-400">~{settings.scanIntervalMs} ms</span>
        </div>
      </div>

      {/* Speed Benchmark Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-right">
          <div className="text-[11px] text-slate-400">{t.fastestBooking}</div>
          <div className="text-lg font-black font-mono text-purple-400 mt-0.5">
            {stats.fastestResponseTimeMs > 0 ? `${stats.fastestResponseTimeMs} ms` : '—'}
          </div>
          <div className="text-[10px] text-slate-500">{isAr ? 'من لحظة الظهور للتأكيد' : 'From drop to confirmation'}</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-right">
          <div className="text-[11px] text-slate-400">{t.avgSpeed}</div>
          <div className="text-lg font-black font-mono text-sky-400 mt-0.5">
            {stats.avgResponseTimeMs > 0 ? `${stats.avgResponseTimeMs} ms` : '—'}
          </div>
          <div className="text-[10px] text-slate-500">{isAr ? 'معدل تنفيذ الأوامر' : 'Average execution time'}</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-right">
          <div className="text-[11px] text-slate-400">{t.shiftsCaptured}</div>
          <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
            {stats.shiftsCaptured}
          </div>
          <div className="text-[10px] text-slate-500">{isAr ? 'تم حجزها بنجاح' : 'Successfully booked'}</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-right">
          <div className="text-[11px] text-slate-400">{t.successRate}</div>
          <div className="text-lg font-black font-mono text-purple-400 mt-0.5">
            {stats.successRate}%
          </div>
          <div className="text-[10px] text-slate-500">{isAr ? 'تجاوز المنافسين' : 'Outpaced competitors'}</div>
        </div>
      </div>

      {/* Available Live Shifts Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-bold text-slate-200">{t.availableShiftsLive} ({availableShifts.length})</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {settings.autoBooking ? (isAr ? '⚡ الحجز الآلي سيقتنص الشفت المطابق فوراً' : '⚡ Auto-booking captures matches instantly') : (isAr ? '⚠️ الحجز اليدوي فقط' : '⚠️ Manual booking only')}
          </span>
        </div>

        {availableShifts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-800/20 border border-dashed border-slate-800 space-y-2">
            <Radio className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
            <p className="text-xs font-medium text-slate-300">{t.noShiftsAvailable}</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              {isAr ? 'اضغط على زر "شفت فلاشي" بالأعلى لمحاكاة نزول شفت واختبار سرعة استجابة المحرك بنسبة 100%!' : 'Click "Flash Shift" above to drop a test shift and verify engine speed!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableShifts.map((shift) => {
              const conflict = findConflictingShift(shift, capturedShifts);
              return (
                <div
                  key={shift.id}
                  className={`p-4 rounded-2xl border transition-all shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    conflict
                      ? 'bg-slate-950/60 border-rose-950/60 opacity-90'
                      : 'bg-slate-950 border-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  <div className="space-y-2.5 flex-1">
                    {/* Top Row: Shift Code & Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black font-mono text-white tracking-wide">
                          {shift.shiftCode || 'DMM-HAB001'}
                        </span>
                        {shift.shiftStateLabel && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            shift.shiftStateLabel === 'نشط'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {shift.shiftStateLabel}
                          </span>
                        )}
                        {shift.isPeak && (
                          <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Flame className="w-3 h-3 text-rose-400" />
                            شفت ذروة
                          </span>
                        )}
                      </div>
                      
                      <span className="text-xs text-slate-400 font-medium">
                        {shift.dayName}
                      </span>
                    </div>

                    {/* Store & Location */}
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-white">{shift.district}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{shift.city}</span>
                    </div>

                    {/* Start & End times */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-slate-400">يبدأ:</span>
                        <span className="font-bold text-white font-mono">{shift.startTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span className="text-slate-400">ينتهي:</span>
                        <span className="font-bold text-white font-mono">{shift.endTime}</span>
                      </div>
                    </div>

                    {/* Conflict Alert Warning */}
                    {conflict && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>
                          <strong>تعارض زمني:</strong> لديك شفت محجوز مسبقاً في نفس الفترة ({conflict.startTime} - {conflict.endTime} في {conflict.district})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ninja Styled Button "حجز فترة الدوام" & Delete Action */}
                  <div className="flex items-center gap-2 justify-end">
                    {onDeleteShift && (
                      <button
                        type="button"
                        onClick={() => onDeleteShift(shift.id)}
                        title="حذف هذا الشفت من القائمة"
                        className="p-3 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-rose-950/50 hover:border-rose-500/50 text-slate-500 hover:text-rose-400 transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!!conflict}
                      onClick={() => !conflict && handleManualClick(shift)}
                      className={`w-full md:w-auto min-w-[180px] px-5 py-3 rounded-xl text-xs font-bold border transition-all shadow-md flex items-center justify-center gap-2.5 ${
                        conflict
                          ? 'bg-slate-900/60 border-rose-900/40 text-rose-400/80 cursor-not-allowed opacity-80'
                          : 'bg-slate-900 hover:bg-purple-950/40 text-white border-slate-700 hover:border-purple-500/70 hover:shadow-lg hover:shadow-purple-500/15 cursor-pointer group'
                      }`}
                      title={conflict ? `فترتك محجوزة مسبقاً (${conflict.startTime} - ${conflict.endTime}) ولا يمكن الحجز المزدوج` : undefined}
                    >
                      {conflict ? (
                        <>
                          <Ban className="w-4 h-4 text-rose-400" />
                          <span className="text-sm font-black text-rose-300">{isAr ? 'الوقت محجوز مسبقاً' : 'Time Slot Taken'}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-black group-hover:text-purple-200 transition-colors">{t.bookShiftBtn}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Captured Shifts Section */}
      {capturedShifts.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              {isAr ? `الشفتات التي تم تثبيتها وحجزها بنجاح (${capturedShifts.length}):` : `Successfully Secured Shifts (${capturedShifts.length}):`}
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {capturedShifts.map((shift) => (
              <div
                key={shift.id}
                className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white">
                      {shift.city} - {shift.district}
                    </span>
                    <span className="text-slate-400 mx-2">|</span>
                    <span className="text-slate-300 font-mono">
                      {shift.startTime} - {shift.endTime} ({shift.dayName})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-400">{shift.totalPay} {isAr ? 'ر.س' : 'SAR'}</span>
                  {shift.responseTimeMs && (
                    <span className="font-mono text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      ⚡ {shift.responseTimeMs} ms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Samurai Exact Video Confirmation Dialog */}
      {modalShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-2xl shadow-2xl p-6 text-center space-y-4 border border-purple-100">
            <div className="flex justify-center">
              <NatanLogo size="sm" withGlow={false} />
            </div>
            <h3 className="text-lg font-black text-slate-900">{t.bookShiftBtn}</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isAr ? 'هل انت متأكد انك تريد الحجز؟' : 'Are you sure you want to book this shift?'}
              <br />
              <span className="text-slate-500 text-[11px]">
                {isAr ? 'قد تطبق العقوبات عن عدم القدوم لفترة الدوام المحجوزة' : 'Penalties may apply for no-shows on booked shifts'}
              </span>
            </p>

            <div className="p-2.5 rounded-xl bg-purple-50 text-xs font-mono font-bold text-purple-950 border border-purple-100">
              {modalShift.district} • {modalShift.startTime} - {modalShift.endTime}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalShift(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmBooking}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-purple-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{t.bookShiftBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
