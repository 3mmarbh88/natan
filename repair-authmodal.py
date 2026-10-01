from pathlib import Path
import re

path = Path(r".\src\components\AuthModal.tsx")

text = path.read_text(encoding="utf-8")

# إصلاح UTF-8 الذي تم تفسيره بترميز Latin-1.
def repair_mojibake(value):
    current = value

    for _ in range(3):
        try:
            repaired = current.encode("latin1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break

        bad_before = sum(
            current.count(x)
            for x in ("ط", "ظ", "â", "ð", "Ã", "Â")
        )
        bad_after = sum(
            repaired.count(x)
            for x in ("ط", "ظ", "â", "ð", "Ã", "Â")
        )

        if bad_after < bad_before:
            current = repaired
        else:
            break

    return current


text = repair_mojibake(text)

# إضافة أيقونة WhatsApp إذا لم تكن موجودة.
text = text.replace(
    "  X,\n} from 'lucide-react';",
    "  X,\n  MessageCircle,\n  ExternalLink,\n} from 'lucide-react';"
)

# استبدال زر إعدادات WhatsApp القديم بدعم فني مباشر.
old_pattern = re.compile(
    r"\s*\{onOpenWhatsApp && \(\s*"
    r"<button[\s\S]*?"
    r"</button>\s*"
    r"\)\}",
    re.MULTILINE,
)

new_block = r"""
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="mb-2 flex items-center justify-center gap-2 text-sm font-bold text-emerald-300">
                <MessageCircle size={17} />
                <span>الدعم الفني والتراخيص عبر واتساب</span>
              </div>

              <p className="mb-3 text-center text-[11px] leading-5 text-slate-500">
                تواصل مباشرة مع الدعم الفني للمساعدة في التسجيل والتفعيل والمشاكل الفنية.
              </p>

              <div className="grid grid-cols-1 gap-2">
                <a
                  href="https://wa.me/97333314353?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D8%A5%D9%84%D9%89%20%D8%A7%D9%84%D8%AF%D8%B9%D9%85%20%D8%A7%D9%84%D9%81%D9%86%D9%8A%20%D9%84%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D8%AC%20NATAN."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/20"
                >
                  <span>+973 3331 4353</span>
                  <ExternalLink size={15} />
                </a>

                <a
                  href="https://wa.me/97333269372?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D8%A5%D9%84%D9%89%20%D8%A7%D9%84%D8%AF%D8%B9%D9%85%20%D8%A7%D9%84%D9%81%D9%86%D9%8A%20%D9%84%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D8%AC%20NATAN."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/20"
                >
                  <span>+973 3326 9372</span>
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>"""

text, replacements = old_pattern.subn(new_block, text, count=1)

if replacements != 1:
    raise SystemExit(
        f"لم يتم العثور على زر WhatsApp القديم. replacements={replacements}"
    )

path.write_text(text, encoding="utf-8")

print("AuthModal.tsx تم إصلاحه وتحديثه بنجاح.")
print(f"WhatsApp block replaced: {replacements}")
print()
print("تم الاحتفاظ بالنسخة الأصلية هنا:")
print("src\\components\\AuthModal.before-repair.tsx")
