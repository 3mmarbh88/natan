import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  Search,
  Download,
  Zap,
  CheckCircle2,
  Eye,
  MapPin,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowDownCircle,
  X,
  Radio,
} from 'lucide-react';
import { LogEntry } from '../types';
import { useLanguage } from '../utils/i18n';
import { soundFX } from '../utils/audio';
import { haptics } from '../utils/haptics';

interface LogViewerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

type FilterCategory = 'all' | 'speed' | 'success' | 'accessibility' | 'gps' | 'error';

export const LogViewer: React.FC<LogViewerProps> = ({ logs, onClearLogs }) => {
  const { isAr } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const logListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top (newest logs are at the top) when logs change
  useEffect(() => {
    if (autoScroll && logListRef.current) {
      logListRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Category Filter
      if (activeCategory === 'speed' && log.type !== 'speed') return false;
      if (activeCategory === 'success' && log.type !== 'success') return false;
      if (activeCategory === 'accessibility' && log.type !== 'accessibility' && !log.message.includes('الوصول') && !log.message.includes('Accessibility') && !log.message.includes('شاشة')) {
        return false;
      }
      if (activeCategory === 'gps' && log.type !== 'gps' && !log.message.includes('GPS') && !log.message.includes('موقع') && !log.message.includes('لوكيشن')) {
        return false;
      }
      if (activeCategory === 'error' && log.type !== 'error' && log.type !== 'warning') {
        return false;
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const msg = (log.message || '').toLowerCase();
        const details = (log.details || '').toLowerCase();
        const ts = (log.timestamp || '').toLowerCase();
        return msg.includes(query) || details.includes(query) || ts.includes(query);
      }

      return true;
    });
  }, [logs, activeCategory, searchQuery]);

  const handleCopyLogs = () => {
    haptics.vibrateTick();
    soundFX.playSpeedTick();
    const text = filteredLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}${
            l.durationMs !== undefined ? ` (+${l.durationMs}ms)` : ''
          }${l.details ? `\n  Details: ${l.details}` : ''}`
      )
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportLogs = () => {
    haptics.vibrateTick();
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}${
            l.durationMs !== undefined ? ` (+${l.durationMs}ms)` : ''
          }${l.details ? `\n  Details: ${l.details}` : ''}`
      )
      .join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `natan-millisecond-trace-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearWithFeedback = () => {
    haptics.vibrateTick();
    onClearLogs();
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-2xl space-y-3 sm:space-y-4 font-mono">
      {/* Header with Live Indicator & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/90 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white font-sans tracking-wide">
                {isAr ? 'سجل العمليات (Millisecond Trace)' : 'Millisecond Operations Trace'}
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans mt-0.5">
              {isAr ? 'تتبع دقيق لتردد الفحص، استجابة الشاشة وأوقات الاقتناص بالمللي ثانية' : 'Microsecond timestamp trace for scan events, screen checks & bookings'}
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5">
          <div className="text-[10px] text-slate-400 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 font-mono">
            <span className="text-white font-bold">{filteredLogs.length}</span> / {logs.length}
          </div>

          <button
            type="button"
            onClick={() => setAutoScroll((prev) => !prev)}
            title={autoScroll ? (isAr ? 'تعطيل التثبيت التلقائي' : 'Disable auto-scroll') : (isAr ? 'تفعيل التثبيت التلقائي' : 'Enable auto-scroll')}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              autoScroll
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopyLogs}
            disabled={filteredLogs.length === 0}
            title={isAr ? 'نسخ السجلات المعروضة' : 'Copy displayed logs'}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors cursor-pointer active:scale-95 disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleExportLogs}
            disabled={logs.length === 0}
            title={isAr ? 'تصدير السجل كملف نصي' : 'Export log file'}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors cursor-pointer active:scale-95 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleClearWithFeedback}
            disabled={logs.length === 0}
            title={isAr ? 'مسح سجل العمليات' : 'Clear all logs'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 transition-colors cursor-pointer active:scale-95 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-sans scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isAr ? 'الكل' : 'All'}
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('speed')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeCategory === 'speed'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-amber-300 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{isAr ? 'السرعة' : 'Speed'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('success')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeCategory === 'success'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{isAr ? 'الحجز' : 'Bookings'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('accessibility')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeCategory === 'accessibility'
                ? 'bg-sky-500/25 text-sky-300 border border-sky-500/50 shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-sky-300 hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3 h-3 text-sky-400" />
            <span>{isAr ? 'خدمة الوصول' : 'Accessibility'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('gps')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeCategory === 'gps'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3 h-3 text-cyan-400" />
            <span>{isAr ? 'اللوكيشن' : 'Location'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('error')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeCategory === 'error'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-rose-300 hover:bg-slate-800'
            }`}
          >
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>{isAr ? 'الأخطاء' : 'Errors'}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} text-slate-500`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث فوري في العمليات (رقم المتجر #495، ms، حبوبة، حجز...)' : 'Search operations by keyword (#495, latency, branch...)'}
            className={`w-full py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 font-sans ${
              isAr ? 'pr-9 pl-8' : 'pl-9 pr-8'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-2.5' : 'right-2.5'} text-slate-500 hover:text-white`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Log Feed Console */}
      <div
        ref={logListRef}
        className="h-64 sm:h-72 overflow-y-auto space-y-1 text-[11px] pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent rounded-xl bg-slate-950/80 p-2 border border-slate-800/80 font-mono"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 text-slate-500 text-xs font-sans space-y-2">
            <Radio className="w-6 h-6 text-slate-600 animate-pulse" />
            <p className="font-bold text-slate-400">
              {searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك في السجل.' : 'No matching trace logs found for your search.')
                : (isAr ? 'لا توجد عمليات مسجلة حالياً.' : 'No operations recorded yet.')}
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              {isAr
                ? 'عند تشغيل الرصد أو قراءة شاشة Ninja أو حجز شفت، سيتم تسجيل كل حركة بدقة المللي ثانية هنا فوراً.'
                : 'All screen checks, booking actions, and latency events will appear here in real-time.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            // Determine type styling & icons
            let badgeBg = 'bg-slate-800 text-slate-400 border border-slate-700/60';
            let IconComponent = Info;
            let iconColor = 'text-slate-400';

            if (log.type === 'speed') {
              badgeBg = 'bg-amber-500/15 text-amber-300 border border-amber-500/40';
              IconComponent = Zap;
              iconColor = 'text-amber-400';
            } else if (log.type === 'success') {
              badgeBg = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold';
              IconComponent = CheckCircle2;
              iconColor = 'text-emerald-400';
            } else if (log.type === 'accessibility') {
              badgeBg = 'bg-sky-500/20 text-sky-300 border border-sky-500/40';
              IconComponent = Eye;
              iconColor = 'text-sky-400';
            } else if (log.type === 'gps') {
              badgeBg = 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40';
              IconComponent = MapPin;
              iconColor = 'text-cyan-400';
            } else if (log.type === 'warning') {
              badgeBg = 'bg-orange-500/20 text-orange-300 border border-orange-500/40';
              IconComponent = AlertTriangle;
              iconColor = 'text-orange-400';
            } else if (log.type === 'error') {
              badgeBg = 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold';
              IconComponent = AlertCircle;
              iconColor = 'text-rose-400';
            }

            const isExpanded = expandedLogId === log.id;

            return (
              <div
                key={log.id}
                className={`py-1.5 px-2 rounded-lg transition-colors border ${
                  log.type === 'success'
                    ? 'bg-emerald-950/25 border-emerald-500/30'
                    : 'border-slate-800/40 hover:bg-slate-900/80 hover:border-slate-700/60'
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Timestamp with Millisecond Precision */}
                  <span className="text-slate-500 shrink-0 text-[10px] font-mono select-all">
                    {log.timestamp}
                  </span>

                  {/* Type Badge with Icon */}
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider shrink-0 flex items-center gap-1 ${badgeBg}`}>
                    <IconComponent className={`w-2.5 h-2.5 ${iconColor}`} />
                    <span>{log.type}</span>
                  </span>

                  {/* Message Content */}
                  <span className="text-slate-200 break-words font-sans text-xs flex-1 leading-snug">
                    {log.message}
                  </span>

                  {/* Millisecond Duration Badge */}
                  {log.durationMs !== undefined && (
                    <span
                      className={`font-mono font-bold text-[10px] shrink-0 px-1.5 py-0.5 rounded border ${
                        log.durationMs <= 30
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : log.durationMs <= 100
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                      title={isAr ? `زمن التنفيذ: ${log.durationMs}ms` : `Execution time: ${log.durationMs}ms`}
                    >
                      +{log.durationMs}ms
                    </span>
                  )}
                </div>

                {/* Optional Expandable Details */}
                {log.details && (
                  <div className="mt-1 mr-7">
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                    >
                      {isExpanded ? (isAr ? 'إخفاء التفاصيل ▲' : 'Hide details ▲') : (isAr ? 'عرض التفاصيل ▼' : 'Show details ▼')}
                    </button>

                    {isExpanded && (
                      <pre className="mt-1 p-2 bg-black/60 rounded-lg text-[10px] text-slate-300 overflow-x-auto border border-slate-800 whitespace-pre-wrap select-all">
                        {log.details}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
