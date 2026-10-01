import React, { useState } from 'react';
import { MessageCircle, ExternalLink, Headphones, X } from 'lucide-react';

interface WhatsAppSupportProps {
  isOpenModal?: boolean;
  onCloseModal?: () => void;
  onOpenModal?: () => void;
}

export const CONTACT_NUMBERS = [
  {
    label: 'الدعم الفني والاستفسارات',
    cleanNumber: '97333314353',
    isPrimary: true,
  },
  {
    label: 'خدمة العملاء والتشغيل',
    cleanNumber: '97333269372',
    isPrimary: false,
  },
];

export const WhatsAppSupport: React.FC<WhatsAppSupportProps> = ({
  isOpenModal,
  onCloseModal,
  onOpenModal,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = isOpenModal !== undefined ? isOpenModal : internalOpen;

  const toggleOpen = () => {
    if (isOpen) {
      if (onCloseModal) {
        onCloseModal();
      } else {
        setInternalOpen(false);
      }
    } else {
      if (onOpenModal) {
        onOpenModal();
      } else {
        setInternalOpen(true);
      }
    }
  };

  const closeSelf = () => {
    if (onCloseModal) {
      onCloseModal();
    } else {
      setInternalOpen(false);
    }
  };

  const getWhatsAppUrl = (cleanNum: string) => {
    const text = encodeURIComponent(
      'السلام عليكم، أحتاج مساعدة بخصوص برنامج NATAN.'
    );

    return `https://wa.me/${cleanNum}?text=${text}`;
  };

  const openWhatsApp = (cleanNum: string) => {
    window.location.href = getWhatsAppUrl(cleanNum);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-4 left-4 sm:bottom-5 sm:left-5 z-40 flex flex-col items-start gap-2 max-w-[calc(100vw-2rem)]">
        {isOpen && (
          <div className="mb-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-2xl bg-slate-900/98 border border-emerald-500/40 shadow-2xl shadow-emerald-950/60 backdrop-blur-xl p-4 animate-in fade-in slide-in-from-bottom-5 duration-200 ring-1 ring-emerald-500/20">

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MessageCircle className="w-5 h-5 fill-emerald-400/20" />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>تواصل معنا عبر واتساب</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h4>

                  <p className="text-[11px] text-slate-400">
                    فريق الدعم الفني والمساعدة المباشرة
                  </p>
                </div>
              </div>

              <button
                onClick={closeSelf}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="إغلاق"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="py-3 space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                هل تحتاج مساعدة في تشغيل NATAN أو حجز فترات الدوام؟
                تواصل مباشرة مع فريق الدعم عبر واتساب.
              </p>

              <div className="space-y-2.5">
                {CONTACT_NUMBERS.map((contact) => (
                  <div
                    key={contact.cleanNumber}
                    className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-600/30">
                          <MessageCircle className="w-5 h-5 text-white" />
                        </div>

                        <div>
                          <div className="text-xs font-bold text-white">
                            {contact.label}
                          </div>

                          <div className="text-[10px] text-slate-400 mt-0.5">
                            تواصل عبر WhatsApp
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openWhatsApp(contact.cleanNumber)}
                        className="shrink-0 w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95"
                        title={`فتح واتساب - ${contact.label}`}
                        aria-label={`فتح واتساب - ${contact.label}`}
                      >
                        <MessageCircle className="w-5 h-5 fill-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="pt-2 border-t border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Headphones className="w-3 h-3 text-emerald-400" />
                متاحون للرد السريع وتقديم الدعم الفني لمستخدمي NATAN
              </span>
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={toggleOpen}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full font-bold text-xs shadow-2xl transition-all cursor-pointer ${
            isOpen
              ? 'bg-slate-800 text-slate-200 border border-slate-700'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/40 hover:shadow-emerald-500/50 scale-100 hover:scale-105 active:scale-95 ring-2 ring-emerald-400/40'
          }`}
          title="تواصل معنا عبر واتساب"
          aria-label="تواصل معنا عبر واتساب"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 fill-white" />

            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white" />
          </div>

          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-black">
              واتساب الدعم الفني
            </span>

            <span className="text-[9px] opacity-90">
              اضغط للتواصل مباشرة
            </span>
          </div>
        </button>
      </div>
    </>
  );
};
