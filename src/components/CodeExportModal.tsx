import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, FileText, Smartphone, Terminal, BookOpen, Sparkles, CheckCircle2, ShieldAlert, ShieldCheck, MessageCircle, Phone, ExternalLink } from 'lucide-react';
import { CODE_TEMPLATES } from '../data/codeTemplates';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'flutter' | 'kotlin' | 'security' | 'manifest' | 'python' | 'guide'>('flutter');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  let currentCode = '';
  let filename = '';
  let language = '';

  switch (activeTab) {
    case 'flutter':
      currentCode = CODE_TEMPLATES.flutterUpgraded;
      filename = 'main.dart';
      language = 'dart';
      break;
    case 'kotlin':
      currentCode = CODE_TEMPLATES.kotlinService;
      filename = 'NinjaAccessibilityService.kt';
      language = 'kotlin';
      break;
    case 'security':
      currentCode = CODE_TEMPLATES.mainActivitySecurity;
      filename = 'MainActivity.kt';
      language = 'kotlin';
      break;
    case 'manifest':
      currentCode = `${CODE_TEMPLATES.manifestConfig}\n\n${CODE_TEMPLATES.accessibilityXml}`;
      filename = 'AndroidManifest_and_config.xml';
      language = 'xml';
      break;
    case 'python':
      currentCode = CODE_TEMPLATES.pythonApiTurbo;
      filename = 'ninja_turbo_api.py';
      language = 'python';
      break;
    case 'guide':
      currentCode = '';
      filename = 'README.txt';
      language = 'text';
      break;
  }

  const handleCopy = () => {
    if (activeTab === 'guide') return;
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (activeTab === 'guide') return;
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                تحديث الكود والمحرك الأصلي لنظام نينجا
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                  v3.5 جاهز للنشر
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                الأكواد المطورة مع معالجة بطء الاستجابة السابقة ودعم كامل للأندرويد وفلاتر السعودية
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

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 flex items-center gap-2 overflow-x-auto bg-slate-950/60 py-2.5">
          <button
            onClick={() => setActiveTab('flutter')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'flutter'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>كود Flutter المطور (main.dart)</span>
          </button>

          <button
            onClick={() => setActiveTab('kotlin')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'kotlin'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>خدمة Kotlin الأصلية (الأسرع بالمللي ثانية)</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>منع تصوير الشاشة (MainActivity - FLAG_SECURE)</span>
          </button>

          <button
            onClick={() => setActiveTab('manifest')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'manifest'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>ملفات التكوين (AndroidManifest & XML)</span>
          </button>

          <button
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'python'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>سكريبت بايثون السريع (API المباشر)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>دليل التثبيت والحل الشامل</span>
          </button>
        </div>

        {/* Action Toolbar */}
        {activeTab !== 'guide' && (
          <div className="px-6 py-2 bg-slate-950 flex items-center justify-between border-b border-slate-800/60">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {filename} ({language})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ الكود'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل الملف</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/80">
          {activeTab === 'guide' ? (
            <div className="space-y-6 text-slate-200 text-xs sm:text-sm leading-relaxed max-w-4xl mx-auto">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  تفاصيل التحديث الشامل استناداً لفيديوهات تطبيق نينجا (Samurai) الفعلية:
                </h4>
                <p className="text-xs text-amber-300/90 leading-relaxed">
                  تم استخراج جميع العناصر والنصوص والأزرار الحقيقية من فيديوهات شاشة هاتفك وتطبيق نينجا ساموراي ومطابقتها برمجياً بدقة 100%:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-amber-100/90">
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/20">
                    <strong>1. زر الحجز الرئيسي:</strong> نص <code className="text-white bg-black px-1.5 py-0.5 rounded">حجز فترة الدوام</code> وزر القائمة <code className="text-white bg-black px-1.5 py-0.5 rounded">احجز دوام</code>.
                  </div>
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/20">
                    <strong>2. نافذة التأكيد المنبثقة:</strong> الضغط الفوري على زر التأكيد الداخلي <code className="text-white bg-black px-1.5 py-0.5 rounded">حجز فترة الدوام</code> عند ظهور رسالة <em>"هل انت متأكد انك تريد الحجز؟"</em>.
                  </div>
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/20">
                    <strong>3. فروع الشرقية المسجلة:</strong> حبوبة (#495)، ظهران (#420)، ضاحية الملك فهد (#534)، الشاطئ (#266)، والأمل (#532).
                  </div>
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/20">
                    <strong>4. إغلاق تنبيهات الـ GPS:</strong> إغلاق نافذة <em>"توقفت تحديثات الموقع"</em> بالضغط التلقائي على <code className="text-white bg-black px-1.5 py-0.5 rounded">حسناً</code> حتى لا تعطل الفحص.
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  خطوات ترقية تطبيقك في Android Studio أو VS Code:
                </h4>

                <ol className="space-y-4 list-decimal list-inside text-slate-300">
                  <li className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <strong className="text-white block mb-1">1. استبدال كود Flutter:</strong>
                    افتح ملف <code className="text-sky-300 font-mono">lib/main.dart</code> واستبدل محتواه بالكامل بالكود من تبويب <strong>"كود Flutter المطور"</strong>.
                  </li>

                  <li className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <strong className="text-white block mb-1">2. إضافة خدمة الكوتلن السريعة (المحرك الفعلي):</strong>
                    داخل مجلد الأندرويد، أنشئ الملف التالي:
                    <div className="my-1.5 p-2 bg-slate-950 rounded font-mono text-xs text-amber-300">
                      android/app/src/main/kotlin/com/example/natan/accessibility/NinjaAccessibilityService.kt
                    </div>
                    وضع فيه كود الكوتلن من تبويب <strong>"خدمة Kotlin الأصلية"</strong>. هذا الملف هو الذي يتولى الضغط الفوري في أقل من 15ms بمجرد ظهور زر "حجز"!
                  </li>

                  <li className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <strong className="text-white block mb-1">3. تسجيل الخدمة والأذونات في Manifest:</strong>
                    افتح <code className="text-purple-300 font-mono">android/app/src/main/AndroidManifest.xml</code> وأضف أذونات الـ Background Service وWakeLock وملف التكوين.
                  </li>

                  <li className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <strong className="text-white block mb-1">4. تفعيل الخدمة على الهاتف:</strong>
                    بعد تثبيت الـ APK على هاتفك، ادخل إلى:
                    <div className="text-slate-400 text-xs mt-1">
                      الإعدادات (Settings) ⬅️ إمكانية الوصول (Accessibility) ⬅️ الخدمات المثبتة ⬅️ NATAN PRO ⬅️ <strong>تفعيل (ON)</strong>
                    </div>
                  </li>

                  <li className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <strong className="text-white block mb-1">5. إلغاء قيود توفير الطاقة (مهم جداً للاستقرار):</strong>
                    ادخل إلى معلومات التطبيق ⬅️ البطارية ⬅️ اختر <strong>"بلا قيود" (Unrestricted)</strong> حتى لا يقوم نظام أندرويد بقتل التطبيق عندما تنطفئ الشاشة.
                  </li>

                  <li className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-100">
                    <strong className="text-purple-300 block mb-1">6. تجاوز "الإعدادات المقيدة" في أندرويد 13 و 14 (مهم جداً كما بالفيديو):</strong>
                    إذا ظهرت لك رسالة <em>"تم منع التطبيق من الوصول"</em> عند تفعيل إذن الظهور أو إمكانية الوصول:
                    <div className="text-xs space-y-1 mt-1.5 text-slate-300">
                      <div>• اضغط ضغطة مطولة على أيقونة التطبيق في الشاشة الرئيسية ⬅️ اختر <strong>"معلومات التطبيق" (App info)</strong>.</div>
                      <div>• اضغط على <strong>الثلاث نقاط (⋮)</strong> في أعلى الزاوية اليسرى.</div>
                      <div>• اضغط على <strong>«السماح بالإعدادات المقيدة» (Allow restricted settings)</strong> وقم بتأكيد البصمة أو الرمز.</div>
                      <div>• ارجع للبرنامج وستجد أن مفاتيح التفعيل أصبحت قابلة للتشغيل فوراً!</div>
                    </div>
                  </li>

                  <li className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-100">
                    <strong className="text-rose-300 block mb-1">7. حماية الشاشة ومنع التصوير (FLAG_SECURE):</strong>
                    افتح ملف <code className="text-rose-200 font-mono">android/app/src/main/kotlin/.../MainActivity.kt</code> وضع فيه كود تبويب <strong>"منع تصوير الشاشة (FLAG_SECURE)"</strong>. بمجرد تفعيله، سيقوم نظام أندرويد بمنع أي تطبيق آخر من تصوير شاشة نينجا أو تسجيلها أو حفظ لقطات شاشة، كما يحجب شاشة التطبيق في قائمة التطبيقات المفتوحة مؤخراً للحفاظ على الخصوصية التامة.
                  </li>
                </ol>

                {/* WhatsApp Direct Assistance Card */}
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <MessageCircle className="w-5 h-5 fill-emerald-400/20" />
                    <span>هل تحتاج مساعدة فنية في تجميع كود الـ APK أو تشغيل السكربت؟</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    فريق الدعم الفني جاهز لمساعدتك في استخراج التوكن، تجميع ملف الـ APK، أو إعداد بيئة العمل خطوة بخطوة عبر واتساب:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <a
                      href="https://wa.me/97333314353?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%AA%D8%AC%D9%85%D9%8A%D8%B9%20%D8%AA%D8%B7%D8%A8%D9%8A%D9%82%20%D9%86%D9%8A%D9%86%D8%AC%D8%A7%20APK"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageCircle className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                        <div>
                          <div className="text-xs text-white font-bold">محادثة واتساب - الدعم الفني</div>
                          <div className="text-[11px] text-emerald-300/80">انقر للبدء الفوري</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100" />
                    </a>

                    <a
                      href="https://wa.me/97333269372?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%B3%D9%83%D8%B1%D8%A8%D8%AA%20%D9%86%D9%8A%D9%86%D8%AC%D8%A7"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/40 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageCircle className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="text-xs text-white font-bold">محادثة واتساب - خدمة العملاء</div>
                          <div className="text-[11px] text-slate-400">انقر للمحادثة المباشرة</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <pre className="text-[11px] font-mono text-slate-200 leading-relaxed overflow-x-auto selection:bg-sky-600 selection:text-white p-4 rounded-xl bg-slate-900 border border-slate-800/80">
              <code>{currentCode}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
