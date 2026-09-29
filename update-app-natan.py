from pathlib import Path

path = Path(r".\src\App.tsx")
text = path.read_text(encoding="utf-8")

# ============================================================
# 1) إصلاح النصوص العربية المشوهة UTF-8 / Latin-1
# ============================================================

def repair_mojibake(value):
    current = value

    for _ in range(3):
        try:
            repaired = current.encode("latin1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break

        bad_before = sum(
            current.count(x)
            for x in ("ط", "ظ", "â", "ð", "Ã", "Â", "ï")
        )

        bad_after = sum(
            repaired.count(x)
            for x in ("ط", "ظ", "â", "ð", "Ã", "Â", "ï")
        )

        if bad_after < bad_before:
            current = repaired
        else:
            break

    return current


text = repair_mojibake(text)

# ============================================================
# 2) إصلاح حالة نافذة تسجيل الدخول عند تشغيل التطبيق
# ============================================================

old_auth_state = """  // Always display the registration / login modal first upon opening the app
  const [showAuthModal, setShowAuthModal] = useState<boolean>(true);"""

new_auth_state = """  // إظهار نافذة الدخول فقط إذا لم توجد جلسة مرخصة صالحة
  const [showAuthModal, setShowAuthModal] = useState<boolean>(() => !isLicensed);"""

if old_auth_state in text:
    text = text.replace(old_auth_state, new_auth_state, 1)
else:
    print("WARNING: showAuthModal block not found.")

# ============================================================
# 3) إصلاح رسالة نجاح تسجيل الدخول/التفعيل
# ============================================================

old_success = """    addLog('success', `✨ تم تفعيل وترخيص البرنامج بنجاح! [${session.planName}] ينتهي في: ${new Date(session.expiresAt).toLocaleDateString('ar-SA')}`);"""

# إذا كان النص قد تم إصلاحه مسبقاً، نتركه.
if old_success not in text:
    # محاولة استبدال السطر القديم المشوه بالاعتماد على addLog
    import re

    text, count = re.subn(
        r"""    addLog\('success', `[^`]*\[\$\{session\.planName\}\][^`]*`\);""",
        old_success,
        text,
        count=1,
    )

    if count:
        print("تم إصلاح رسالة نجاح التفعيل.")
    else:
        print("WARNING: لم يتم العثور على رسالة نجاح التفعيل.")

# ============================================================
# 4) إضافة وظيفة تسجيل الخروج بعد addLog
# ============================================================

logout_function = r'''
  // تسجيل الخروج من NATAN
  const handleLogout = () => {
    try {
      localStorage.removeItem('natan_auth_session');
    } catch {
      // safe
    }

    setAuthSession(null);
    setShowAuthModal(true);

    // إيقاف التشغيل الآلي عند تسجيل الخروج
    setIsAutoSimulating(false);

    addLog('info', 'تم تسجيل الخروج من NATAN بنجاح.');

    try {
      void wakeLock.release();
    } catch {
      // safe
    }
  };
'''

marker = """  const updateSettings = (partial: Partial<BookingSettings>) => {"""

if "const handleLogout = () =>" not in text:
    if marker in text:
        text = text.replace(marker, logout_function + "\n" + marker, 1)
        print("تمت إضافة handleLogout.")
    else:
        raise SystemExit("ERROR: لم يتم العثور على updateSettings لإضافة handleLogout.")

# ============================================================
# 5) ربط تسجيل الخروج مع Navbar
# ============================================================

old_navbar = """        authSession={authSession}
        onOpenLicense={() => setShowAuthModal(true)}
      />"""

new_navbar = """        authSession={authSession}
        onOpenLicense={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />"""

if old_navbar in text:
    text = text.replace(old_navbar, new_navbar, 1)
    print("تم ربط زر تسجيل الخروج مع Navbar.")
else:
    print("WARNING: Navbar props block not found.")

# ============================================================
# 6) إزالة استدعاء WhatsAppSupport غير المستخدم إن لم يكن مستخدماً
# ============================================================

# لا نحذف المكوّن تلقائياً لأنه قد يكون مستخدماً في نسخة المستخدم.
# فقط نتركه كما هو إذا كان موجوداً.

# ============================================================
# 7) إصلاح بعض النصوص المهمة في الواجهة إذا بقيت مشوهة
# ============================================================

replacements = {
    "خدمة الدعم الفني المباشر عبر واتساب": "الدعم الفني المباشر عبر واتساب",
    "متواجدون الآن": "متواجدون الآن",
    "تواصل فوري": "تواصل فوري",
    "NATAN PRO": "NATAN PRO",
    "اضغط للفتح المباشر": "اضغط للفتح المباشر",
    "تم حذف الشفت من قائمة الشفتات المتاحة بنجاح":
        "تم حذف الشفت من قائمة الشفتات المتاحة بنجاح",
}

for old, new in replacements.items():
    text = text.replace(old, new)

# ============================================================
# 8) حفظ الملف
# ============================================================

path.write_text(text, encoding="utf-8")

print()
print("==============================================")
print("تم تعديل App.tsx بنجاح")
print("==============================================")
print()
print("النسخة الاحتياطية:")
print("src\\App.before-natan-update.tsx")
print()
