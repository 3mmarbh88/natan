from pathlib import Path

p = Path("src/utils/natanApi.ts")
s = p.read_text(encoding="utf-8")

old_param = '''    confirmPassword: string;
    activationCode: string;
    city?: string;'''

new_param = '''    confirmPassword: string;
    city?: string;'''

old_activation = '''  const activationCode =
    String(
      params.activationCode ?? ''
    )
      .trim()
      .toUpperCase();

'''

if old_param not in s:
    raise SystemExit("PARAMETER_BLOCK_NOT_FOUND")

if old_activation not in s:
    raise SystemExit("ACTIVATION_VARIABLE_NOT_FOUND")

s = s.replace(old_param, new_param, 1)
s = s.replace(old_activation, "", 1)

old_validation = '''  if (!activationCode) {
    throw new Error(
      'يرجى إدخال رمز التفعيل.'
    );
  }

'''

if old_validation not in s:
    raise SystemExit("ACTIVATION_VALIDATION_NOT_FOUND")

s = s.replace(old_validation, "", 1)

old_body = '''        password,
        activationCode,

        city:'''

new_body = '''        password,

        city:'''

if old_body not in s:
    raise SystemExit("ACTIVATION_BODY_NOT_FOUND")

s = s.replace(old_body, new_body, 1)

p.write_text(s, encoding="utf-8")

print("REGISTER_API_UPDATED_NO_ACTIVATION_CODE")
