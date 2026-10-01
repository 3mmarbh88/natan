
import React, { useState, useEffect } from 'react';
import {
  Zap,
  ShieldCheck,
  Sparkles,
  Play,
  Square,
  User,
  UserPlus,
  LogOut,
} from 'lucide-react';

import {
  BookingSettings,
  AppAuthSession,
} from '../types';

import { NatanLogo } from './NatanLogo';
import { useLanguage } from '../utils/i18n';

interface NavbarProps {
  settings: BookingSettings;
  onUpdateSettings: (
    partial: Partial<BookingSettings>
  ) => void;

  onOpenCodeModal: () => void;
  onOpenAiAdvisor: () => void;
  onTriggerTestDrop: () => void;

  onOpenWhatsApp?: () => void;

  totalCaptured: number;

  authSession?: AppAuthSession | null;

  onOpenLicense?: () => void;

  onLogout?: () => void;
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
  onLogout,
}) => {
  const {
    t,
    isAr,
  } = useLanguage();

  const [saudiTime, setSaudiTime] =
    useState<string>('');

  /*
   * ============================================================
   * SAUDI TIME
   * ============================================================
   */

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

      setSaudiTime(
        new Intl.DateTimeFormat(
          isAr ? 'ar-SA' : 'en-US',
          options
        ).format(now)
      );
    };

    updateTime();

    const interval = setInterval(
      updateTime,
      1000
    );

    return () => {
      clearInterval(interval);
    };
  }, [isAr]);

  /*
   * ============================================================
   * LICENSE STATUS
   * ============================================================
   *
   * الحساب يعتبر مرخصاً فقط إذا:
   *
   * 1. توجد جلسة.
   * 2. المستخدم authenticated.
   * 3. الحساب activated.
   * 4. تاريخ الانتهاء موجود.
   * 5. تاريخ الانتهاء ما زال في المستقبل.
   */

  const isActivated =
    !!(
      authSession &&
      authSession.isAuthenticated &&
      authSession.isActivated
    );

  const hasValidExpiry =
    !!(
      authSession?.expiresAt &&
      authSession.expiresAt > Date.now()
    );

  const isLicensed =
    isActivated &&
    hasValidExpiry;

  /*
   * ============================================================
   * PROFILE / LICENSE
   * ============================================================
   *
   * لا توجد جلسة:
   *   Profile → فتح التفعيل.
   *
   * الحساب غير مفعّل:
   *   Profile → فتح التفعيل.
   *
   * الحساب مفعّل ولكن الترخيص منتهي:
   *   Profile → فتح التفعيل.
   *
   * الحساب مفعّل والترخيص صالح:
   *   Profile → لا شيء.
   */

  const handleProfileClick = () => {
    if (!authSession) {
      onOpenLicense?.();
      return;
    }

    if (!isLicensed) {
      onOpenLicense?.();
      return;
    }

    /*
     * الحساب مفعّل والترخيص صالح.
     *
     * لا نفتح أي نافذة.
     */
  };

  /*
   * ============================================================
   * LICENSE TIME
   * ============================================================
   */

  const hoursLeft =
    isLicensed && authSession?.expiresAt
      ? Math.max(
          0,
          Math.ceil(
            (
              authSession.expiresAt -
              Date.now()
            ) /
            (1000 * 60 * 60)
          )
        )
      : 0;

  const daysLeft =
    isLicensed && authSession?.expiresAt
      ? Math.max(
          0,
          Math.ceil(
            (
              authSession.expiresAt -
              Date.now()
            ) /
            (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  return (
    <header
      className="
        sticky
        top-0
        z-40
        bg-slate-900/95
        backdrop-blur-md
        border-b
        border-slate-800/90
        px-3
        sm:px-4
        lg:px-8
        py-2.5
        sm:py-3
        shadow-2xl
      "
    >
      <div
        className="
          max-w-7xl
          mx-auto
          flex
          flex-col
          md:flex-row
          items-center
          justify-between
          gap-2.5
          sm:gap-3
        "
      >

        {/* ====================================================
            BRAND & PROFILE
            ==================================================== */}

        <div
          className="
            flex
            items-center
            gap-2
            sm:gap-3
            w-full
            md:w-auto
            justify-between
            md:justify-start
          "
        >
          <div
            className="
              flex
              items-center
              gap-2.5
              sm:gap-3
            "
          >

            {/* NATAN LOGO */}

            <NatanLogo
              size="sm"
              withGlow={true}
            />

            <div>

              {/* ==================================================
                  NATAN ONLY
                  ================================================== */}

              <div
                className="
                  flex
                  items-center
                  gap-1.5
                  sm:gap-2
                "
              >
                <span
                  className="
                    font-black
                    text-base
                    sm:text-lg
                    tracking-tight
                    text-white
                  "
                >
                  NATAN
                </span>

                <span
                  className="
                    text-[10px]
                    font-extrabold
                    px-2
                    py-0.5
                    rounded-full
                    bg-purple-500/15
                    text-purple-300
                    border
                    border-purple-500/30
                  "
                >
                  {t.ninjaBadge}
                </span>
              </div>

              {/* ==================================================
                  PROFILE / ACCOUNT
                  ================================================== */}

              {onOpenLicense && (
                <button
                  type="button"
                  onClick={handleProfileClick}
                  className={`
                    mt-0.5
                    sm:mt-1
                    flex
                    items-center
                    gap-1.5
                    px-2.5
                    py-1.5
                    sm:px-3
                    sm:py-1.5
                    min-h-[38px]
                    sm:min-h-[40px]
                    rounded-xl
                    border
                    text-xs
                    font-bold
                    transition-all
                    shadow-sm
                    active:scale-95

                    ${
                      isLicensed
                        ? `
                          bg-emerald-600/10
                          border-emerald-500/30
                          text-emerald-300
                          cursor-default
                        `
                        : `
                          bg-gradient-to-r
                          from-purple-600/30
                          to-indigo-600/30
                          hover:from-purple-600/50
                          hover:to-indigo-600/50
                          text-purple-200
                          border-purple-500/40
                          cursor-pointer
                        `
                    }
                  `}
                  title={
                    isLicensed
                      ? (
                          isAr
                            ? 'الحساب مفعّل'
                            : 'Account activated'
                        )
                      : (
                          isAr
                            ? 'اضغط لتفعيل الحساب'
                            : 'Click to activate your account'
                        )
                  }
                >

                  {authSession ? (
                    <User
                      className={`
                        w-3.5
                        h-3.5
                        ${
                          isLicensed
                            ? 'text-emerald-400'
                            : 'text-purple-400'
                        }
                      `}
                    />
                  ) : (
                    <UserPlus
                      className="
                        w-3.5
                        h-3.5
                        text-purple-400
                      "
                    />
                  )}

                  <span
                    className="
                      truncate
                      max-w-[100px]
                      sm:max-w-none
                    "
                  >
                    {authSession
                      ? (
                          authSession.fullName ||
                          authSession.username ||
                          t.myAccount
                        )
                      : t.myAccount}
                  </span>

                  {/* ==================================================
                      VALID LICENSE TIME
                      ================================================== */}

                  {authSession &&
                    isLicensed && (
                      <span
                        className="
                          text-[10px]
                          bg-purple-500/30
                          text-purple-200
                          px-1.5
                          py-0.5
                          rounded-full
                          font-mono
                          font-bold
                        "
                      >
                        {hoursLeft <= 24
                          ? `${hoursLeft}${isAr ? 'س' : 'h'}`
                          : `${daysLeft}${t.dayUnit}`}
                      </span>
                    )}

                  {/* ==================================================
                      NOT ACTIVATED / INVALID LICENSE
                      ================================================== */}

                  {authSession &&
                    !isLicensed && (
                      <span
                        className="
                          text-[10px]
                          bg-rose-500/20
                          text-rose-300
                          px-1.5
                          py-0.5
                          rounded-full
                          font-bold
                        "
                      >
                        {isAr
                          ? (
                              authSession.isActivated
                                ? 'منتهي'
                                : 'غير مفعّل'
                            )
                          : (
                              authSession.isActivated
                                ? 'Expired'
                                : 'Inactive'
                            )}
                      </span>
                    )}
                </button>
              )}
            </div>
          </div>

          {/* Quick Engine toggle & Logout on Mobile */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  monitoring: !settings.monitoring,
                })
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer ${
                settings.monitoring
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-400/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/30'
              }`}
            >
              {settings.monitoring ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>{t.stopMonitoring}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>{t.startMonitoring}</span>
                </>
              )}
            </button>

            {authSession && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title={isAr ? 'تسجيل الخروج' : 'Logout'}
                className="flex items-center justify-center p-2 min-h-[40px] min-w-[40px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer active:scale-95"
              >
                <LogOut className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* ====================================================
            ROW 2: LIVE CONTROLS (Grid on Mobile, Flex on Desktop)
            ==================================================== */}

        <div
          className="
            grid
            grid-cols-4
            gap-1.5
            w-full
            md:flex
            md:w-auto
            md:items-center
            md:gap-2
          "
        >
          {/* AUTO BOOKING */}
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                autoBooking: !settings.autoBooking,
              })
            }
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 min-h-[42px] rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer border active:scale-95 ${
              settings.autoBooking
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={t.autoBookingLabel}
          >
            <Zap className={`w-3.5 h-3.5 shrink-0 ${settings.autoBooking ? 'text-emerald-400 fill-emerald-400' : 'text-slate-500'}`} />
            <span className="truncate">{isAr ? 'تلقائي' : 'Auto'}</span>
            <span className={`text-[10px] font-black px-1 rounded ${settings.autoBooking ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-700 text-slate-300'}`}>
              {settings.autoBooking ? (isAr ? 'ON' : 'ON') : (isAr ? 'OFF' : 'OFF')}
            </span>
          </button>

          {/* TEST FLASH DROP */}
          <button
            type="button"
            onClick={onTriggerTestDrop}
            title={t.flashShift}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-2 min-h-[42px] rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] sm:text-xs font-black transition-all shadow-md shadow-purple-500/25 cursor-pointer active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
            <span className="truncate">{t.flashShift}</span>
          </button>

          {/* AI ADVISOR */}
          <button
            type="button"
            onClick={onOpenAiAdvisor}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 min-h-[42px] rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer active:scale-95"
            title={t.aiAdvisor}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">{isAr ? 'المستشار' : 'AI'}</span>
          </button>

          {/* BOOKED COUNTER */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 min-h-[42px] rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-[11px] sm:text-xs text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{isAr ? 'محجوز:' : 'Booked:'}</span>
            <span className="font-bold text-emerald-400 font-mono">{totalCaptured}</span>
          </div>

          {/* MAIN ENGINE TOGGLE (Desktop only) */}
          <button
            type="button"
            onClick={() => onUpdateSettings({ monitoring: !settings.monitoring })}
            className={`hidden md:flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-xs font-black transition-all shadow-lg cursor-pointer shrink-0 active:scale-95 ${
              settings.monitoring
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-400/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/30'
            }`}
          >
            {settings.monitoring ? (
              <>
                <Square className="w-4 h-4 fill-white shrink-0" />
                <span className="whitespace-nowrap">{t.stopMonitoring}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white shrink-0" />
                <span className="whitespace-nowrap">{t.startMonitoring}</span>
              </>
            )}
          </button>

          {/* LOGOUT (Desktop only) */}
          {authSession && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title={isAr ? 'تسجيل الخروج' : 'Logout'}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 min-h-[42px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{isAr ? 'تسجيل الخروج' : 'Logout'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
