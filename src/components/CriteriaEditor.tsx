import React, { useState } from 'react';
import { MapPin, Calendar, Clock, Sparkles, Check, Building2, Flame, AlertCircle, Hash, Plus, X, Layers, Timer, Zap } from 'lucide-react';
import { BookingSettings, ShiftWindow } from '../types';
import { SAUDI_CITIES, DAYS_OF_WEEK, SAUDI_CITY_COORDINATES } from '../data/saudiCities';
import { useLanguage } from '../utils/i18n';

interface CriteriaEditorProps {
  settings: BookingSettings;
  onUpdateSettings: (partial: Partial<BookingSettings>) => void;
}

export const CriteriaEditor: React.FC<CriteriaEditorProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const { t, isAr } = useLanguage();
  const currentCity = SAUDI_CITIES.find((c) => c.id === settings.selectedCity) || SAUDI_CITIES[0];
  const [newTagInput, setNewTagInput] = useState('');

  const currentTags = settings.branchKeywordNumbers || ['#420', '#422', '#495', '#534', '#266'];
  const shiftWindows: ShiftWindow[] = settings.multiShiftWindows || [
    { id: 1, name: 'مناوبة 1 (الفترة الأساسية)', enabled: true, startTime: '08:01', endTime: '23:59' },
    { id: 2, name: 'مناوبة 2 (الفترة الإضافية)', enabled: false, startTime: '12:00', endTime: '23:59' },
    { id: 3, name: 'مناوبة 3 (المسائية/الفجر)', enabled: false, startTime: '00:00', endTime: '08:00' },
  ];

  const handleAddTag = () => {
    let clean = newTagInput.trim();
    if (!clean) return;
    if (!clean.startsWith('#')) clean = `#${clean}`;
    if (!currentTags.includes(clean)) {
      onUpdateSettings({ branchKeywordNumbers: [...currentTags, clean] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    onUpdateSettings({ branchKeywordNumbers: currentTags.filter((t) => t !== tag) });
  };

  const handleUpdateShiftWindow = (id: number, partial: Partial<ShiftWindow>) => {
    const updated = shiftWindows.map((sw) => (sw.id === id ? { ...sw, ...partial } : sw));
    onUpdateSettings({ multiShiftWindows: updated });
  };

  const toggleDistrict = (district: string) => {
    const exists = settings.selectedDistricts.includes(district);
    let updated: string[];
    if (exists) {
      updated = settings.selectedDistricts.filter((d) => d !== district);
    } else {
      updated = [...settings.selectedDistricts, district];
    }
    onUpdateSettings({ selectedDistricts: updated });
  };

  const selectAllDistricts = () => {
    onUpdateSettings({ selectedDistricts: [...currentCity.districts] });
  };

  const clearAllDistricts = () => {
    onUpdateSettings({ selectedDistricts: [] });
  };

  const toggleDay = (day: string) => {
    const exists = settings.selectedDays.includes(day);
    let updated: string[];
    if (exists) {
      updated = settings.selectedDays.filter((d) => d !== day);
    } else {
      updated = [...settings.selectedDays, day];
    }
    onUpdateSettings({ selectedDays: updated });
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 lg:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {t.tabCriteria}
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                {isAr ? 'الفلاتر الدقيقة' : 'Smart Filters'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {isAr ? 'تحديد المدن، المستودعات المظلمة، والحد الأدنى للدوام' : 'Specify cities, dark store hubs, and minimum shift durations'}
            </p>
          </div>
        </div>
      </div>

      {/* 1. Saudi City Selection */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-purple-400" />
          {isAr ? 'اختر المدينة الرئيسية في السعودية:' : 'Select Main Saudi City:'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {SAUDI_CITIES.map((city) => {
            const isSelected = settings.selectedCity === city.id;
            const coords = SAUDI_CITY_COORDINATES[city.id];
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => {
                  onUpdateSettings({
                    selectedCity: city.id,
                    selectedDistricts: [], // reset or select all
                    selectedLatitude: coords ? coords.lat : settings.selectedLatitude,
                    selectedLongitude: coords ? coords.lng : settings.selectedLongitude,
                    selectedLocationLabel: coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : settings.selectedLocationLabel,
                  });
                }}
                className={`min-h-[52px] py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400 text-white font-bold shadow-lg shadow-purple-600/25 ring-1 ring-purple-400/50'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="text-xs font-black">{isAr ? city.name : city.nameEn}</div>
                <div className="text-[10px] text-slate-400 opacity-80 mt-0.5">{isAr ? city.nameEn : city.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Dark Store Hubs / Districts */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-purple-400" />
            {isAr ? `مستودعات وفروع نينجا في (${currentCity.name}):` : `Ninja Hubs & Branches in (${currentCity.nameEn}):`}
            <span className="text-[10px] text-purple-400 font-mono">
              ({settings.selectedDistricts.length === 0 ? (isAr ? 'الكل متاح' : 'All') : `${settings.selectedDistricts.length} ${isAr ? 'محددة' : 'selected'}`})
            </span>
          </label>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={selectAllDistricts}
              className="text-purple-400 hover:text-purple-300 hover:underline text-[11px] cursor-pointer"
            >
              {isAr ? 'تحديد الكل' : 'Select All'}
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={clearAllDistricts}
              className="text-slate-400 hover:text-slate-200 hover:underline text-[11px] cursor-pointer"
            >
              {isAr ? 'مسح الكل' : 'Clear All'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
          {currentCity.districts.map((district) => {
            const isChecked =
              settings.selectedDistricts.length === 0 ||
              settings.selectedDistricts.includes(district);
            const isExplicitlyChecked = settings.selectedDistricts.includes(district);

            return (
              <button
                key={district}
                type="button"
                onClick={() => toggleDistrict(district)}
                className={`flex items-center justify-between min-h-[46px] p-3 rounded-xl border text-right transition-all cursor-pointer active:scale-95 ${
                  isExplicitlyChecked
                    ? 'bg-purple-500/15 border-purple-500/70 text-purple-200'
                    : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span className="text-xs sm:text-sm font-semibold leading-tight">{district}</span>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mr-2 ${
                    isExplicitlyChecked ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/50' : 'border border-slate-600'
                  }`}
                >
                  {isExplicitlyChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Preferred Days */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-purple-400" />
          {isAr ? 'أيام العمل المفضلة:' : 'Preferred Working Days:'}
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const isDaySelected = settings.selectedDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`min-h-[44px] py-2.5 px-2 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  isDaySelected
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400 text-white font-black shadow-md shadow-purple-600/30'
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Duration & Time Window */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Duration */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              {isAr ? 'مدة الشفت:' : 'Shift Duration:'}
            </span>
            <span className="font-mono text-purple-400 font-bold text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
              {settings.minDurationHours} {isAr ? 'إلى' : 'to'} {settings.maxDurationHours} {isAr ? 'ساعات' : 'hrs'}
            </span>
          </div>
          <div className="flex gap-2">
            <select
              value={settings.minDurationHours}
              onChange={(e) => onUpdateSettings({ minDurationHours: Number(e.target.value) })}
              className="w-1/2 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2"
            >
              <option value={2}>{isAr ? 'من 2 ساعة' : 'Min 2 hrs'}</option>
              <option value={3}>{isAr ? 'من 3 ساعات' : 'Min 3 hrs'}</option>
              <option value={4}>{isAr ? 'من 4 ساعات' : 'Min 4 hrs'}</option>
              <option value={5}>{isAr ? 'من 5 ساعات' : 'Min 5 hrs'}</option>
              <option value={6}>{isAr ? 'من 6 ساعات' : 'Min 6 hrs'}</option>
            </select>
            <select
              value={settings.maxDurationHours}
              onChange={(e) => onUpdateSettings({ maxDurationHours: Number(e.target.value) })}
              className="w-1/2 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2"
            >
              <option value={6}>{isAr ? 'حتى 6 ساعات' : 'Up to 6 hrs'}</option>
              <option value={8}>{isAr ? 'حتى 8 ساعات' : 'Up to 8 hrs'}</option>
              <option value={10}>{isAr ? 'حتى 10 ساعات' : 'Up to 10 hrs'}</option>
              <option value={12}>{isAr ? 'حتى 12 ساعة' : 'Up to 12 hrs'}</option>
            </select>
          </div>
        </div>

        {/* Peak Hours Only */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 mt-0.5">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">{isAr ? 'حجز شفتات البونص والذروة فقط (Peak Only)' : 'Peak & Bonus Shifts Only'}</p>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'تخطي أي شفت عادي والتركيز فقط على شفتات الحوافز الإضافية' : 'Skip regular shifts and focus only on high-demand bonus shifts'}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.onlyPeakHours}
            onChange={(e) => onUpdateSettings({ onlyPeakHours: e.target.checked })}
            className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
          />
        </div>
      </div>

      {/* 6. Pro 5 Feature: Branch Hashtag Number Filtering (#422, #420, etc.) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/20 border border-purple-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
            <Hash className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{isAr ? 'فلترة الفروع بأرقام الهاشتاغ (#) المباشرة:' : 'Filter Branches by Direct Hashtags (#):'}</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              {isAr ? 'سرعة فائقة ⚡' : 'Ultra Fast ⚡'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {isAr ? (
            <>
              <strong>سر الاحتراف من فيديو الكليكر:</strong> مطابقة رقم الفرع بالهاشتاغ (مثل <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">#422</code> أو <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">#420</code>) أسرع بـ 10 أضعاف من كتابة الاسم نصياً، ولا تتأثر باختلاف الهمزات أو المسافات في تطبيق نينجا.
            </>
          ) : (
            <>
              <strong>Pro Tip:</strong> Matching branch numbers by hashtag (like <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">#422</code> or <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">#420</code>) is 10x faster than full text search, and immune to typos or Arabic diacritics in Ninja app.
            </>
          )}
        </p>

        {/* Tag Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute right-3.5 top-3 text-slate-500 text-sm font-mono font-bold">#</span>
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder={isAr ? "اكتب رقم الفرع واضغط إضافة (مثال: 422 أو #78)" : "Type branch number and press add (e.g. 422 or #78)"}
              className="w-full min-h-[46px] bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-200 rounded-xl pr-8 pl-3 py-2.5 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleAddTag}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 active:scale-95 shadow-md shadow-purple-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة' : 'Add'}</span>
          </button>
        </div>

        {/* Tags List */}
        <div className="flex flex-wrap gap-2 pt-1">
          {currentTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 text-purple-200 border border-purple-500/30 text-xs sm:text-sm font-mono font-bold shadow-xs"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                aria-label={`إزالة ${tag}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* 7. Pro 5 Feature: Multi-Shift Windows (مناوبة 1، مناوبة 2، مناوبة 3) */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">{isAr ? 'نوافذ المناوبات المتعددة (Shift Windows):' : 'Multi-Shift Windows:'}</h3>
              <p className="text-[11px] text-slate-400">{isAr ? 'تحديد حتى 3 فترات مفضلة في اليوم مع خيار تشغيل/إيقاف مستقل' : 'Configure up to 3 daily shift windows with independent on/off toggles'}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'تلميح: ضع دقيقة إضافية (مثل 08:01 بدلاً من 08:00) لمطابقة نزول الشفتات بدقة' : 'Tip: Set +1 min (e.g. 08:01 instead of 08:00) to match exact drop times'}</span>
          </div>
        </div>

        <div className="space-y-3">
          {shiftWindows.map((sw) => (
            <div
              key={sw.id}
              className={`p-3.5 rounded-xl border transition-all ${
                sw.enabled
                  ? 'bg-slate-950/80 border-purple-500/40 shadow-sm'
                  : 'bg-slate-950/30 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpdateShiftWindow(sw.id, { enabled: !sw.enabled })}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      sw.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {sw.enabled ? (isAr ? 'مفعّل (ARMED)' : 'ARMED') : (isAr ? 'إيقاف (OFF)' : 'OFF')}
                  </button>
                  <span className="text-xs font-bold text-slate-200">{sw.name}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">{isAr ? 'من:' : 'From:'}</span>
                    <input
                      type="time"
                      value={sw.startTime}
                      onChange={(e) => handleUpdateShiftWindow(sw.id, { startTime: e.target.value })}
                      className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                    />
                  </div>

                  <span className="text-slate-500">{isAr ? 'إلى' : 'to'}</span>

                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">{isAr ? 'حتى:' : 'Until:'}</span>
                    <input
                      type="time"
                      value={sw.endTime}
                      onChange={(e) => handleUpdateShiftWindow(sw.id, { endTime: e.target.value })}
                      className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Minute Tolerance Option */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-xs font-bold text-slate-200 block">{isAr ? 'مرونة التوقيت بالدقائق (Tolerance):' : 'Minute Window Tolerance:'}</span>
              <span className="text-[11px] text-slate-400">
                {isAr ? `قبول الشفتات التي تبدأ قبل أو بعد الوقت المحدد بـ ±${settings.minuteTolerance || 5} دقائق` : `Accept shifts starting within ±${settings.minuteTolerance || 5} minutes of set window`}
              </span>
            </div>
          </div>
          <select
            value={settings.minuteTolerance || 5}
            onChange={(e) => onUpdateSettings({ minuteTolerance: Number(e.target.value) })}
            className="bg-slate-900 border border-slate-700 text-xs text-purple-300 font-bold rounded-lg px-3 py-1.5"
          >
            <option value={0}>{isAr ? 'تطابق صارم (0 دقيقة)' : 'Strict match (0 min)'}</option>
            <option value={2}>±2 {isAr ? 'دقيقة' : 'min'}</option>
            <option value={5}>±5 {isAr ? 'دقائق (موصى به)' : 'min (Recommended)'}</option>
            <option value={10}>±10 {isAr ? 'دقائق' : 'min'}</option>
            <option value={15}>±15 {isAr ? 'دقيقة' : 'min'}</option>
          </select>
        </div>
      </div>
    </div>
  );
};
