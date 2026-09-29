import React, { useState } from 'react';
import { Sparkles, X, Lightbulb, Clock, ShieldCheck, Flame, ChevronRight, Check } from 'lucide-react';
import { BookingSettings } from '../types';

interface AiAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (partial: Partial<BookingSettings>) => void;
}

export const AiAdvisor: React.FC<AiAdvisorProps> = ({ isOpen, onClose, onApplyPreset }) => {
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const strategies = [
    {
      title: 'استراتيجية ذروة عطلة نهاية الأسبوع (الرياض وجدة)',
      badge: 'أعلى دخل (180-260 ر.س)',
      description: 'التركيز على شفتات المساء في الخميس والجمعة والسبت ذات البونص الإضافي مع فحص فائق السرعة (60ms) وسحب تحديث سريع.',
      settings: {
        scanIntervalMs: 60,
        speedMode: 'ultra' as const,
        onlyPeakHours: true,
        minDurationHours: 5,
        selectedDays: ['الخميس', 'الجمعة', 'السبت'],
        autoConfirmDialog: true,
        autoRefresh: true,
        refreshIntervalSec: 3,
      }
    },
    {
      title: 'استراتيجية صيد الشفتات المسقطة فجأة (Drop Hunter)',
      badge: 'سرعة خاطفة (40ms)',
      description: 'مخصصة للقبض على الشفتات التي يتم إلغاؤها في اللحظات الأخيرة. يتم تشغيل سحب الشاشة التلقائي كل ثانيتين وتأكيد الحجز الفوري.',
      settings: {
        scanIntervalMs: 40,
        speedMode: 'ultra' as const,
        onlyPeakHours: false,
        minDurationHours: 3,
        autoConfirmDialog: true,
        autoRefresh: true,
        refreshIntervalSec: 2,
      }
    },
    {
      title: 'استراتيجية الاستقرار وتفادي الحظر (Stealth Safe)',
      badge: 'أمان 100%',
      description: 'معدل فحص متزن بنقرات ذات إحداثيات بشرية مشتتة (Jitter) وتأخير طفيف لمنع اكتشاف الحساب عند المراقبة لساعات طويلة.',
      settings: {
        scanIntervalMs: 180,
        speedMode: 'stealth' as const,
        onlyPeakHours: false,
        minDurationHours: 4,
        autoConfirmDialog: true,
        autoRefresh: true,
        refreshIntervalSec: 5,
      }
    }
  ];

  const handleApply = (idx: number, settings: Partial<BookingSettings>) => {
    onApplyPreset(settings);
    setAppliedIndex(idx);
    setTimeout(() => setAppliedIndex(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                المستشار الذكي لشفتات نينجا في السعودية
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                  AI Shift Optimizer
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                توصيات مبنية على مواعيد نزول الشفتات وتوزيع العمل في مدن المملكة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Pro Tips Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Clock className="w-4 h-4" />
                <span>أهم أوقات نزول الشفتات في نينجا:</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                عادة ما تُطرح الشفتات الأسبوعية في أوقات محددة (مثل الساعة <strong>12:00 ظهراً</strong> أو <strong>3:00 عصراً</strong> أو <strong>منتصف الليل</strong>). اضبط المحرك على <strong>وضع فائق (Ultra 40ms)</strong> قبل الموعد بـ 3 دقائق لضمان أسبقية الحجز!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>سر الاستقرار وعدم فقدان الحساب:</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                خاصية <strong>Human Jitter</strong> تضمن أن النقرات لا تقع في نفس البكسل الرياضي بدقة 100%، مما يجعل خوارزميات نينجا تقرأ نقراتك كلحظات إنسانية سريعة جداً.
              </p>
            </div>
          </div>

          {/* Strategy Presets */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-purple-400" />
              اختر خطة العمل لتطبيق إعداداتها بنقرة واحدة:
            </h4>

            <div className="space-y-3">
              {strategies.map((strat, idx) => (
                <div
                  key={strat.title}
                  className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-purple-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{strat.title}</span>
                      <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                        {strat.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                      {strat.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleApply(idx, strat.settings)}
                    className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer"
                  >
                    {appliedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>تم التطبيق!</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>تطبيق الإعدادات</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
