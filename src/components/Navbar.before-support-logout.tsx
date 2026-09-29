import React, { useState, useEffect } from 'react';
import { Zap, ShieldCheck, Clock, Sparkles, Play, Square, MessageCircle, KeyRound, User, UserPlus, Globe } from 'lucide-react';
import { BookingSettings, AppAuthSession } from '../types';
import { NatanLogo } from './NatanLogo';
import { useLanguage } from '../utils/i18n';

interface NavbarProps {
  settings: BookingSettings;
  onUpdateSettings: (partial: Partial<BookingSettings>) => void;
  onOpenCodeModal: () => void;
  onOpenAiAdvisor: () => void;
  onTriggerTestDrop: () => void;
  onOpenWhatsApp?: () => void;
  totalCaptured: number;
  authSession?: AppAuthSession | null;
  onOpenLicense?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  onUpdateSettings,
  onOpenCodeModal,
  onOpenAiAdvisor,
  onTriggerTestDrop,
  onOpenWhatsApp,
  totalCaptured,
  authSession,
  onOpenLicense,
}) => {
  const { t, language, toggleLanguage, isAr } = useLanguage();
  const [saudiTime, setSaudiTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Riyadh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      setSaudiTime(new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-US', options).format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isAr]);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/90 px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <NatanLogo size="sm" withGlow={true} />
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-white">{t.brandName.split(' ')[0]} <span className="text-purple-400">{t.brandName.split(' ')[1] || 'PRO'}</span></span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {t.ninjaBadge}
                </span>
              </div>
              {onOpenLicense && (
                <button
                  onClick={onOpenLicense}
                  className="mt-0.5 sm:mt-1 flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-purple-200 border border-purple-500/40 text-[10px] sm:text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                  title={t.myAccount}
                >
                  {authSession ? (
                    <User className="w-3 h-3 text-purple-400" />
                  ) : (
                    <UserPlus className="w-3 h-3 text-purple-400" />
                  )}
                  <span className="truncate max-w-[90px] sm:max-w-none">
                    {authSession ? authSession.username : t.myAccount}
                  </span>
                  {authSession && (() => {
                    const hoursLeft = Math.max(0, Math.ceil((authSession.expiresAt - Date.now()) / (1000 * 60 * 60)));
                    const daysLeft = Math.max(0, Math.ceil((authSession.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
                    return (
                      <span className="text-[9px] sm:text-[10px] bg-purple-500/30 text-purple-200 px-1.5 py-0.2 rounded-full font-mono font-bold">
                        {hoursLeft <= 24 ? `${hoursLeft}${isAr ? 'س' : 'h'}` : `${daysLeft}${t.dayUnit}`}
                      </span>
                    );
                  })()}
                </button>
              )}
            </div>
          </div>

          {/* Quick Auto-Booking Switch Pill on Header */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onUpdateSettings({ autoBooking: !settings.autoBooking })}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer border ${
                settings.autoBooking
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title={t.autoBookingLabel}
            >
              <Zap className={`w-3.5 h-3.5 ${settings.autoBooking ? 'text-emerald-400 fill-emerald-400' : 'text-slate-500'}`} />
              <span className="hidden xs:inline">{t.autoBookingLabel}</span>
              <span className="font-black underline decoration-emerald-400/50">{settings.autoBooking ? (isAr ? 'شغال' : 'ON') : (isAr ? 'معطل' : 'OFF')}</span>
            </button>

            {/* Language Switcher Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-purple-300 hover:text-white border border-purple-500/30 text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              title={isAr ? 'Switch to English' : 'التحويل إلى اللغة العربية'}
            >
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>{isAr ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>

        {/* Live Controls & Status Indicators */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-between md:justify-end overflow-x-auto py-0.5 md:py-0 scrollbar-none">
          {/* Successful Bookings Counter */}
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-[10px] sm:text-xs text-emerald-300 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap">{t.bookedCount}</span>
            <span className="font-bold text-emerald-400 font-mono">{totalCaptured}</span>
          </div>

          {/* Test Flash Drop Trigger */}
          <button
            onClick={onTriggerTestDrop}
            title={t.flashShift}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] sm:text-xs font-black transition-all shadow-md shadow-purple-500/25 cursor-pointer shrink-0 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
            <span className="whitespace-nowrap">{t.flashShift}</span>
          </button>

          {/* AI Strategy Advisor */}
          <button
            onClick={onOpenAiAdvisor}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer shrink-0 active:scale-95"
            title={t.aiAdvisor}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="whitespace-nowrap">{t.aiAdvisor}</span>
          </button>

          {/* Main Desktop/Mobile Engine Toggle */}
          <button
            onClick={() => onUpdateSettings({ monitoring: !settings.monitoring })}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black transition-all shadow-md cursor-pointer shrink-0 active:scale-95 ${
              settings.monitoring
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-400/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/20'
            }`}
          >
            {settings.monitoring ? (
              <>
                <Square className="w-3.5 h-3.5 fill-white shrink-0" />
                <span className="whitespace-nowrap">{t.stopMonitoring}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                <span className="whitespace-nowrap">{t.startMonitoring}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
