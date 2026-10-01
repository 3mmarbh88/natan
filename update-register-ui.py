from pathlib import Path

p = Path("src/components/AuthModal.tsx")
s = p.read_text(encoding="utf-8")

old_code_field = '''                <CodeField
                  value={activationCode}
                  onChange={setActivationCode}
                  disabled={loading}
                />

'''

if old_code_field not in s:
    raise SystemExit("REGISTER_CODE_FIELD_NOT_FOUND")

s = s.replace(old_code_field, "", 1)

old_footer = '''                <p className="text-center text-xs leading-5 text-slate-500">
                  لإنشاء الحساب يجب إدخال اسم المستخدم وكلمة المرور ورمز التفعيل.
                </p>
'''

new_footer = '''                <p className="text-center text-xs leading-5 text-slate-500">
                  يمكنك إنشاء الحساب بدون رمز تفعيل. ستحتاج إلى التفعيل عند استخدام الميزات المحمية.
                </p>
'''

if old_footer not in s:
    raise SystemExit("REGISTER_FOOTER_NOT_FOUND")

s = s.replace(old_footer, new_footer, 1)

p.write_text(s, encoding="utf-8")

print("REGISTER_UI_UPDATED_NO_ACTIVATION_CODE")
