from pathlib import Path

p = Path("src/components/AuthModal.tsx")
s = p.read_text(encoding="utf-8")

start_marker = "  const handleRegister = async (event: FormEvent) => {"
end_marker = "  const handleForgotPassword = async ("

start = s.index(start_marker)
end = s.index(end_marker, start)

new_block = '''  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();

    const cleanUsername =
      normalizeText(registerUsername);

    const cleanFullName =
      normalizeText(fullName);

    const cleanEmail =
      normalizeText(email).toLowerCase();

    const cleanPhone =
      normalizeText(phone);

    setLoading(true);

    try {
      const deviceId =
        await getNatanDeviceId();

      const result =
        await registerNatanUser({
          username:
            cleanUsername,

          fullName:
            cleanFullName,

          email:
            cleanEmail,

          phone:
            cleanPhone,

          password:
            registerPassword,

          confirmPassword,

          deviceId,

          deviceName:
            'NATAN Android',

          platform:
            'android',

          appVersion:
            '1.0.0',
        });

      if (!result?.success) {
        throw new Error(
          result?.message ||
          'تعذر إنشاء حساب NATAN.'
        );
      }

      setSuccessMsg(
        'تم إنشاء حساب NATAN بنجاح. يمكنك تسجيل الدخول الآن، وسيطلب منك التفعيل عند استخدام الميزات المحمية.'
      );

      setActiveTab('login');

    } catch (error: any) {
      setErrorMsg(
        error?.message ||
        'تعذر إنشاء حساب NATAN.'
      );

    } finally {
      setLoading(false);
    }
  };

'''

s = s[:start] + new_block + s[end:]

p.write_text(s, encoding="utf-8")

print("HANDLE_REGISTER_UPDATED")
