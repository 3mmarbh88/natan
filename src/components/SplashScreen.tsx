import React, { useState, useEffect } from 'react';
import {
  Zap,
  ShieldCheck,
  Cpu,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { soundFX } from '../utils/audio';
import { haptics } from '../utils/haptics';

interface SplashScreenProps {
  onFinish: () => void;
  appName?: string;
  isAr?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  appName = 'NATAN Pro',
  isAr = true,
}) => {
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState(
    isAr ? 'تهيئة محرك NATAN الذكي...' : 'Initializing NATAN engine...'
  );

  useEffect(() => {
    // Play initial subtle tick
    soundFX.playSpeedTick();
    haptics.vibrateTick();

    const steps = [
      {
        target: 25,
        text: isAr
          ? 'فحص سرعة الاستجابة ومستشعرات الهاتف...'
          : 'Checking phone sensors & latency...',
      },
      {
        target: 55,
        text: isAr
          ? 'تحميل خوارزميات اقتناص شفتات نينجا (Ultra 40ms)...'
          : 'Loading Ninja shift capture engine (40ms)...',
      },
      {
        target: 85,
        text: isAr
          ? 'تجهيز بوابة الدخول الآمن والحماية...'
          : 'Preparing Secure Entry Gateway...',
      },
      {
        target: 100,
        text: isAr
          ? 'المنظومة جاهزة للعمل والانطلاق!'
          : 'System ready for launch!',
      },
    ];

    let current = 0;
    let stepIndex = 0;

    const timer = setInterval(() => {
      current += 2.2;

      if (stepIndex < steps.length && current >= steps[stepIndex].target) {
        setStepText(steps[stepIndex].text);
        stepIndex++;
      }

      if (current >= 100) {
        current = 100;
        setProgress(100);
        clearInterval(timer);

        haptics.vibrateTick();
        soundFX.playSpeedTick();

        // Hold 100% briefly, then trigger direct transition to Secure Gateway
        setTimeout(() => {
          onFinish();
        }, 180);
      } else {
        setProgress(Math.floor(current));
      }
    }, 35);

    return () => clearInterval(timer);
  }, [isAr, onFinish]);

  const handleSkip = () => {
    haptics.vibrateTick();
    onFinish();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 bg-slate-950 text-slate-100 select-none overflow-hidden"
      style={{ minHeight: '100dvh' }}
    >
      {/* Ambient Cyber Light Effects */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-purple-600/15 blur-[90px] pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-72 h-72 rounded-full bg-cyan-500/15 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-80 h-36 rounded-full bg-blue-600/10 blur-[80px] pointer-events-none" />

      {/* Top Header info */}
      <header className="w-full max-w-sm flex items-center justify-between pt-2 safe-top relative z-10">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-purple-500/30 text-[11px] font-bold text-purple-300">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Ninja KSA Automation</span>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold border border-slate-800 transition active:scale-95 cursor-pointer"
        >
          <span>{isAr ? 'دخول فوري' : 'Skip'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Center Hero: Phone-Optimized Logo & Branding WITHOUT Biometric Buttons */}
      <main className="flex flex-col items-center justify-center text-center max-w-xs w-full my-auto relative z-10">
        {/* Glowing Logo Frame */}
        <div className="relative mb-6">
          {/* Animated Pulse Rings */}
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-purple-500/30 via-cyan-500/30 to-blue-500/30 blur-md animate-pulse" />
          <div className="absolute -inset-1 rounded-3xl border border-purple-500/40 opacity-70 animate-ping duration-1000" />

          {/* Icon Box */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-900 border-2 border-purple-400/50 p-2 shadow-2xl shadow-purple-950/80 flex items-center justify-center overflow-hidden">
            <img
              src="/app-icon.png"
              alt="NATAN Pro"
              className="w-full h-full object-cover rounded-2xl drop-shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/natan-logo.svg';
              }}
            />
          </div>
        </div>

        {/* Titles */}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          <span>{appName}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40">
            PRO
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1 mb-4">
          {isAr
            ? 'نظام حجز شفتات نينجا فائق السرعة'
            : 'Ultra-Fast Ninja Shift Automation'}
        </p>

        {/* System Secure Shield Status (No Biometric Buttons) */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-purple-500/30 text-xs font-bold text-purple-300 mb-4 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>{isAr ? 'بوابة الدخول الآمن 🇸🇦' : 'Secure Entry Gateway 🇸🇦'}</span>
        </div>
      </main>

      {/* Bottom Loading Progress for Phone Viewport */}
      <footer className="w-full max-w-sm safe-bottom relative z-10 pb-4">
        {/* Step Status Text & Loading Indicator */}
        <div className="flex items-center justify-between text-xs font-semibold mb-2 px-1">
          <div className="flex items-center gap-1.5 text-slate-300 truncate max-w-[240px] text-start">
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
            <span className="truncate">{stepText}</span>
          </div>
          <span className="font-mono font-bold text-cyan-400 text-sm">
            {progress}%
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-600 via-cyan-500 to-emerald-400 transition-all duration-100 shadow-[0_0_12px_rgba(34,211,238,0.7)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Micro System Spec Info */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-400" />
            <span>محرك الاستجابة: 40ms</span>
          </span>
          <span>الإصدار 1.0 (PRO Build)</span>
        </div>
      </footer>
    </div>
  );
};
