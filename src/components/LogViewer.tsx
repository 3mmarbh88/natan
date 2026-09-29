import React, { useState } from 'react';
import { Terminal, Trash2, Copy, Check, Filter } from 'lucide-react';
import { LogEntry } from '../types';
import { useLanguage } from '../utils/i18n';

interface LogViewerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, onClearLogs }) => {
  const { isAr } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'speed' | 'success' | 'warning'>('all');
  const [copied, setCopied] = useState(false);

  const filteredLogs = logs.filter((l) => {
    if (filter === 'all') return true;
    return l.type === filter;
  });

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3 sm:space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-white font-sans truncate">
            {isAr ? 'سجل العمليات (Millisecond Trace)' : 'Operation Logs (Millisecond Trace)'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            ({filteredLogs.length})
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-[10px] font-sans">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded ${filter === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              {isAr ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setFilter('speed')}
              className={`px-2 py-0.5 rounded ${filter === 'speed' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-amber-300'}`}
            >
              {isAr ? 'السرعة' : 'Speed'}
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-2 py-0.5 rounded ${filter === 'success' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-emerald-300'}`}
            >
              {isAr ? 'الحجوزات' : 'Bookings'}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              title={isAr ? "نسخ السجل" : "Copy logs"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onClearLogs}
              title={isAr ? "مسح السجل" : "Clear logs"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Log Feed */}
      <div className="h-56 overflow-y-auto space-y-1.5 text-[11px] pr-1 scrollbar-thin">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-sans">
            {isAr ? 'لا توجد سجلات مسجلة حالياً. قم بتشغيل الرصد أو إسقاط شفت فلاشي لبدء التسجيل.' : 'No logs recorded yet. Start scanning or trigger a flash drop to log.'}
          </div>
        ) : (
          filteredLogs.map((log) => {
            let badgeBg = 'bg-slate-800 text-slate-400';
            if (log.type === 'speed') badgeBg = 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
            if (log.type === 'success') badgeBg = 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold';
            if (log.type === 'warning') badgeBg = 'bg-orange-500/15 text-orange-300 border border-orange-500/30';
            if (log.type === 'error') badgeBg = 'bg-red-500/15 text-red-300 border border-red-500/30';

            return (
              <div
                key={log.id}
                className="flex items-start gap-2 py-1 px-2 rounded hover:bg-slate-800/40 transition-colors"
              >
                <span className="text-slate-500 shrink-0 text-[10px]">{log.timestamp}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider shrink-0 ${badgeBg}`}>
                  {log.type}
                </span>
                <span className="text-slate-300 break-all font-sans text-xs">
                  {log.message}
                </span>
                {log.durationMs !== undefined && (
                  <span className="text-amber-400 font-bold text-[10px] shrink-0 mr-auto">
                    +{log.durationMs}ms
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
