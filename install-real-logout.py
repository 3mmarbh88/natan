from pathlib import Path
import re

path = Path(r".\src\App.tsx")
text = path.read_text(encoding="utf-8")

# حذف النسخة الحالية من handleLogout إن وجدت
text = re.sub(
    r"\n\s*// تسجيل الخروج من NATAN\s*\n\s*const handleLogout = \(\) => \{[\s\S]*?\n\s*\};\n",
    "\n",
    text,
    count=1
)

# البحث عن مكان updateSettings
marker = """  const updateSettings = (partial: Partial<BookingSettings>) => {"""

logout_code = r'''
  // تسجيل الخروج الفعلي من NATAN
  const handleLogout = () => {
    // 1. حذف جلسة المصادقة المحفوظة نهائياً
    try {
      localStorage.removeItem('natan_auth_session');
    } catch {
      // تجاهل أي خطأ في localStorage
    }

    // 2. إزالة الجلسة من حالة التطبيق
    setAuthSession(null);

    // 3. إيقاف الرصد والحجز الآلي فوراً
    setSettings((prev) => ({
      ...prev,
      monitoring: false,
      autoBooking: false,
    }));

    // 4. إيقاف المحاكاة التلقائية
    setIsAutoSimulating(false);

    // 5. تحرير Wake Lock إن كان مفعلاً
    try {
      void wakeLock.release();
    } catch {
      // safe
    }

    // 6. إعادة المستخدم إلى شاشة تسجيل الدخول
    setShowAuthModal(true);

    // 7. تسجيل الحدث في السجل
    addLog('info', 'تم تسجيل الخروج من NATAN وإيقاف الرصد والحجز الآلي.');
  };
'''

if marker not in text:
    raise SystemExit("ERROR: لم يتم العثور على updateSettings.")

text = text.replace(marker, logout_code + "\n" + marker, 1)

# التأكد من ربط Navbar
old_nav = """        authSession={authSession}
        onOpenLicense={() => setShowAuthModal(true)}
      />"""

new_nav = """        authSession={authSession}
        onOpenLicense={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />"""

if old_nav in text:
    text = text.replace(old_nav, new_nav, 1)
elif "onLogout={handleLogout}" not in text:
    raise SystemExit("ERROR: لم يتم العثور على مكان Navbar لإضافة onLogout.")

path.write_text(text, encoding="utf-8")

print("تم تثبيت تسجيل الخروج الفعلي في App.tsx")
print("")
print("الإجراءات:")
print("1. حذف natan_auth_session")
print("2. setAuthSession(null)")
print("3. إيقاف monitoring")
print("4. إيقاف autoBooking")
print("5. إيقاف المحاكاة")
print("6. تحرير Wake Lock")
print("7. فتح شاشة تسجيل الدخول")
print("8. تسجيل العملية في السجل")
