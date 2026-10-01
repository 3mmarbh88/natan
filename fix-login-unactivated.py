from pathlib import Path

p = Path("src/components/AuthModal.tsx")
s = p.read_text(encoding="utf-8")

s = s.replace(
"""      alert('BEFORE_DEVICE_ID');

      const deviceId =
        await getNatanDeviceId();

      alert('DEVICE_ID: ' + deviceId);
""",
"""      const deviceId =
        await getNatanDeviceId();
"""
)

old = """    } catch (error: any) {
      if (
        error instanceof
        NatanActivationRequiredError
      ) {
        setActivationUsername(
          error.username ||
            error.email ||
            error.phone ||
            username,
        );

        setActivationCode('');
        setActivationHint(
          'هذا الحساب غير مفعّل. أدخل رمز التفعيل الذي أعطاك إياه مسؤول NATAN.',
        );

        setActiveTab(
          'activate',
        );

        setSuccessMsg(
          'تم العثور على الحساب. يحتاج إلى التفعيل قبل الدخول.',
        );
      } else {
        setErrorMsg(
          error?.message ||
            'اسم المستخدم أو كلمة المرور غير صحيحة.',
        );
      }
    } finally {
"""

new = """    } catch (error: any) {
      setErrorMsg(
        error?.message ||
          'اسم المستخدم أو كلمة المرور غير صحيحة.',
      );
    } finally {
"""

if old not in s:
    raise SystemExit("LOGIN_CATCH_BLOCK_NOT_FOUND")

s = s.replace(old, new, 1)

p.write_text(s, encoding="utf-8")

print("LOGIN_ALLOW_UNACTIVATED_FIXED")
