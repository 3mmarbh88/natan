import {
  BiometricAuth,
  BiometryType,
  BiometryErrorType,
} from '@aparajita/capacitor-biometric-auth';

import React, {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  Lock,
  User,
  Phone,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  LogIn,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Fingerprint,
  ScanFace,
  X,
  MessageCircle,
  SlidersHorizontal,
  Globe,
} from 'lucide-react';

import type { AppAuthSession } from '../types';
import { soundFX } from '../utils/audio';
import { haptics } from '../utils/haptics';
import { useLanguage } from '../utils/i18n';
import { NatanLogo } from './NatanLogo';
import BiometricPromptModal from './BiometricPromptModal';
import {
  detectBiometrics,
  isBiometricEnrolled,
  getSavedBiometricSession,
  saveBiometricSession,
  BiometricMode,
} from '../utils/biometricAuth';

import {
  loginNatanUser,
  registerNatanUser,
  activateNatanUser,
  forgotNatanPassword,
  getNatanDeviceId,
  getNatanMe,
  NatanActivationRequiredError,
} from '../utils/natanApi';


type AuthTab = 'login' | 'register' | 'activate' | 'forgot';

const BIOMETRIC_ENABLED_KEY = 'natan_biometric_enabled';
const AUTH_SESSION_KEY = 'natan_auth_session';

interface AuthModalProps {
  currentSession: AppAuthSession | null;
  onAuthenticate: (session: AppAuthSession) => void;
  onOpenWhatsApp?: () => void;
  onClose?: () => void;
  initialTab?: AuthTab;
}

function formatExpiry(expiresAt?: number) {
  if (!expiresAt) return 'غير محدد';

  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    return 'غير محدد';
  }

  return date.toLocaleDateString('ar-BH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeCode(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

function convertSession(
  session: any,
  fallbackToken?: string,
): AppAuthSession {
  const user = session?.user ?? session ?? {};
  const token = session?.token ?? fallbackToken ?? '';

  let expiresAt = Number(
    user?.expiresAt ??
      user?.activation_expires_at ??
      user?.expires_at ??
      session?.expiresAt ??
      0,
  );

  if (
    expiresAt > 0 &&
    expiresAt < 100000000000
  ) {
    expiresAt *= 1000;
  }

  if (!expiresAt) {
    expiresAt =
      Date.now() +
      30 * 24 * 60 * 60 * 1000;
  }

  return {
    token,
    userId: String(
      user?.id ??
        session?.userId ??
        '',
    ),
    username: String(
      user?.username ??
        session?.username ??
        '',
    ),
    fullName:
      user?.fullName ??
      user?.full_name ??
      session?.fullName ??
      '',
    email:
      user?.email ??
      session?.email ??
      '',
    phone:
      user?.phone ??
      session?.phone ??
      '',
    isAuthenticated:
      user?.isAuthenticated ??
      session?.isAuthenticated ??
      true,
    isActivated:
      user?.isActivated ??
      user?.is_activated ??
      session?.isActivated ??
      false,
    expiresAt,
    planName:
      user?.planName ??
      user?.plan_name ??
      session?.planName ??
      'NATAN',
    maxDevices: Number(
      user?.maxDevices ??
        user?.max_devices ??
        session?.maxDevices ??
        1,
    ),
    createdAt:
      user?.createdAt ??
      user?.created_at ??
      session?.createdAt,
    activatedAt:
      user?.activatedAt ??
      session?.activatedAt,
    licenseKey:
      user?.licenseKey ??
      session?.licenseKey,
    deviceId:
      user?.deviceId ??
      session?.deviceId,
    boundHardware:
      user?.boundHardware ??
      session?.boundHardware,
  };
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  autoComplete?: string;
  required?: boolean;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  icon,
  disabled = false,
  autoComplete,
  required = true,
}: FieldProps) {
  const { isAr } = useLanguage();
  const [showPassword, setShowPassword] =
    useState(false);

  const isPassword =
    type === 'password';

  return (
    <div className="space-y-1.5">
      <label className="block text-xs sm:text-sm font-semibold text-slate-200">
        {label}
      </label>

      <div className="relative">
        <div
          className={`pointer-events-none absolute inset-y-0 ${
            isAr ? 'right-0 pr-3.5' : 'left-0 pl-3.5'
          } flex items-center text-slate-400`}
        >
          {icon}
        </div>

        <input
          type={
            isPassword && showPassword
              ? 'text'
              : type
          }
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          required={required}
          dir={isAr ? 'rtl' : 'ltr'}
          className={`w-full min-h-[46px] rounded-xl border border-slate-700 bg-slate-900/90 py-3 ${
            isAr ? 'pr-11 pl-11' : 'pl-11 pr-11'
          } text-sm sm:text-base text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (value) => !value,
              )
            }
            className={`absolute inset-y-0 ${
              isAr ? 'left-0 pl-3' : 'right-0 pr-3'
            } flex items-center text-slate-400 hover:text-white transition cursor-pointer min-w-[44px] min-h-[44px] justify-center active:scale-95`}
            tabIndex={-1}
            aria-label={
              showPassword
                ? isAr ? 'إخفاء كلمة المرور' : 'Hide password'
                : isAr ? 'إظهار كلمة المرور' : 'Show password'
            }
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface CodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function CodeField({
  value,
  onChange,
  disabled = false,
}: CodeFieldProps) {
  const { isAr } = useLanguage();
  return (
    <div className="space-y-1.5">
      <label className="block text-xs sm:text-sm font-semibold text-slate-200">
        {isAr ? 'رمز التفعيل' : 'Activation Code'}
      </label>

      <div className="relative">
        <div
          className={`pointer-events-none absolute inset-y-0 ${
            isAr ? 'right-0 pr-3.5' : 'left-0 pl-3.5'
          } flex items-center text-slate-400`}
        >
          <KeyRound size={18} />
        </div>

        <input
          value={value}
          onChange={(e) =>
            onChange(
              normalizeCode(
                e.target.value,
              ),
            )
          }
          placeholder={isAr ? 'أدخل رمز التفعيل' : 'Enter activation code'}
          disabled={disabled}
          required
          dir="ltr"
          inputMode="text"
          autoComplete="one-time-code"
          className={`w-full min-h-[46px] rounded-xl border border-slate-700 bg-slate-900/90 py-3 ${
            isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'
          } text-center text-base font-bold tracking-[0.25em] text-white outline-none transition placeholder:text-slate-500 placeholder:tracking-normal focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
    </div>
  );
}

export default function AuthModal({
  currentSession,
  onAuthenticate,
  onOpenWhatsApp,
  onClose,
  initialTab = 'login',
}: AuthModalProps) {
  const { t, isAr, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] =
    useState<AuthTab>(initialTab);

  const [loginUsername, setLoginUsername] =
    useState('');
  const [loginPassword, setLoginPassword] =
    useState('');

  const [registerUsername, setRegisterUsername] =
    useState('');

  const [fullName, setFullName] =
    useState('');
  const [email, setEmail] =
    useState('');
  const [phone, setPhone] =
    useState('');
  const [registerPassword, setRegisterPassword] =
    useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [activationUsername, setActivationUsername] =
    useState('');
  const [activationCode, setActivationCode] =
    useState('');

  const [forgotUsername, setForgotUsername] =
    useState('');

  const [loading, setLoading] =
    useState(false);
  const [biometricLoading, setBiometricLoading] =
    useState(false);

  const [biometricAvailable, setBiometricAvailable] =
    useState(true);
  const [biometricEnabled, setBiometricEnabled] =
    useState(true);
  const [biometricLabel, setBiometricLabel] =
    useState('بصمة الإصبع والوجه');
  const [showBiometricModal, setShowBiometricModal] =
    useState(false);
  const [biometricModalMode, setBiometricModalMode] =
    useState<BiometricMode>('fingerprint');
  const [autoRememberBiometrics, setAutoRememberBiometrics] =
    useState(true);

  const [errorMsg, setErrorMsg] =
    useState('');
  const [successMsg, setSuccessMsg] =
    useState('');
  const [activationHint, setActivationHint] =
    useState('');

  useEffect(() => {
    let mounted = true;

    const checkBiometric = async () => {
      try {
        const cap = await detectBiometrics();

        if (!mounted) return;

        setBiometricAvailable(cap.isAvailable);
        setBiometricLabel(cap.biometryLabel);

        const enrolled = isBiometricEnrolled() || cap.isAvailable;
        setBiometricEnabled(enrolled);
      } catch {
        if (!mounted) return;
        setBiometricAvailable(true);
        setBiometricEnabled(true);
      }
    };

    void checkBiometric();

    return () => {
      mounted = false;
    };
  }, []);

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const saveSession = (
    session: AppAuthSession,
  ) => {
    localStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify(session),
    );

    onAuthenticate(session);
  };

  const enableBiometricForDevice =
    async () => {
      try {
        const result =
          await BiometricAuth.checkBiometry();

        if (!result?.isAvailable) {
          setBiometricAvailable(
            false,
          );
          return false;
        }

        setBiometricAvailable(
          true,
        );

        localStorage.setItem(
          BIOMETRIC_ENABLED_KEY,
          'true',
        );

        setBiometricEnabled(
          true,
        );

        return true;
      } catch {
        return false;
      }
    };

  const handleBiometricLogin =
    async () => {
      clearMessages();
      setBiometricLoading(true);

      try {
        const result =
          await BiometricAuth.checkBiometry();

        if (!result?.isAvailable) {
          setBiometricAvailable(
            false,
          );
          setBiometricEnabled(
            false,
          );

          throw new Error(
            'المصادقة الحيوية غير متاحة على هذا الجهاز.',
          );
        }

        const enabled =
          localStorage.getItem(
            BIOMETRIC_ENABLED_KEY,
          ) === 'true';

        if (!enabled) {
          throw new Error(
            'لم يتم تفعيل تسجيل الدخول بالبصمة بعد.',
          );
        }

        await BiometricAuth.authenticate({
          reason:
            'تحقق من هويتك للدخول إلى NATAN',
          cancelTitle: 'إلغاء',
          allowDeviceCredential: false,
          androidTitle:
            'تسجيل الدخول إلى NATAN',
          androidSubtitle:
            'استخدم البصمة أو المصادقة الحيوية',
          androidConfirmationRequired:
            true,
        });

        const saved =
          localStorage.getItem(
            AUTH_SESSION_KEY,
          );

        if (!saved) {
          localStorage.removeItem(
            BIOMETRIC_ENABLED_KEY,
          );
          setBiometricEnabled(
            false,
          );

          throw new Error(
            'لا توجد جلسة محفوظة. يرجى تسجيل الدخول بكلمة المرور أولاً.',
          );
        }

        let savedSession: AppAuthSession;

        try {
          savedSession =
            JSON.parse(saved);
        } catch {
          localStorage.removeItem(
            AUTH_SESSION_KEY,
          );

          throw new Error(
            'بيانات جلسة NATAN غير صالحة. يرجى تسجيل الدخول مرة أخرى.',
          );
        }

        if (
          !savedSession.token ||
          !savedSession.userId ||
          !savedSession.isAuthenticated
        ) {
          localStorage.removeItem(
            AUTH_SESSION_KEY,
          );

          throw new Error(
            'جلسة NATAN غير صالحة. يرجى تسجيل الدخول مرة أخرى.',
          );
        }

        if (
          savedSession.expiresAt &&
          savedSession.expiresAt <=
            Date.now()
        ) {
          localStorage.removeItem(
            AUTH_SESSION_KEY,
          );

          throw new Error(
            'انتهت صلاحية جلسة NATAN. يرجى تسجيل الدخول بكلمة المرور.',
          );
        }

        const me =
          await getNatanMe(
            savedSession.token,
          );

        if (
          !me?.success ||
          !me?.user
        ) {
          throw new Error(
            'تعذر التحقق من الجلسة مع NATAN Server. يرجى تسجيل الدخول مرة أخرى.',
          );
        }

        const refreshed =
          convertSession(
            {
              token:
                savedSession.token,
              user: me.user,
            },
            savedSession.token,
          );

        if (
          !refreshed.userId ||
          !refreshed.token
        ) {
          throw new Error(
            'بيانات الحساب غير مكتملة. يرجى تسجيل الدخول مرة أخرى.',
          );
        }

        saveSession(
          refreshed,
        );
      } catch (error: any) {
        const errorCode =
          error?.code;

        if (
          errorCode ===
          BiometryErrorType.userCancel
        ) {
          setErrorMsg(
            'تم إلغاء التحقق بالبصمة.',
          );
        } else if (
          errorCode ===
          BiometryErrorType.userFallback
        ) {
          setErrorMsg(
            'تم اختيار طريقة تسجيل دخول أخرى.',
          );
        } else if (
          errorCode ===
          BiometryErrorType.biometryNotAvailable
        ) {
          setErrorMsg(
            'المصادقة الحيوية غير متاحة على هذا الجهاز.',
          );
        } else if (
          errorCode ===
          BiometryErrorType.biometryNotEnrolled
        ) {
          setErrorMsg(
            'لا توجد بصمة أو مصادقة حيوية مسجلة في الهاتف.',
          );
        } else if (
          error instanceof
          NatanActivationRequiredError
        ) {
          localStorage.removeItem(
            AUTH_SESSION_KEY,
          );
          localStorage.removeItem(
            BIOMETRIC_ENABLED_KEY,
          );

          setBiometricEnabled(
            false,
          );

          setActivationUsername(
            error.username ||
              error.email ||
              error.phone ||
              '',
          );

          setActivationHint(
            'الحساب يحتاج إلى التفعيل قبل تسجيل الدخول.',
          );

          setActiveTab(
            'activate',
          );
        } else {
          setErrorMsg(
            error?.message ||
              'فشل تسجيل الدخول بالبصمة. يرجى استخدام كلمة المرور.',
          );
        }
      } finally {
        setBiometricLoading(false);
      }
    };

  const handleLogin = async (
    event: FormEvent,
  ) => {
    event.preventDefault();
    clearMessages();

    const username =
      normalizeText(
        loginUsername,
      );
    const password =
      loginPassword;

    if (!username) {
      setErrorMsg(
        'أدخل اسم المستخدم أو البريد الإلكتروني أو رقم الهاتف.',
      );
      return;
    }

    if (!password) {
      setErrorMsg(
        'أدخل كلمة المرور.',
      );
      return;
    }

    setLoading(true);

    try {
      const deviceId =
        await getNatanDeviceId();

      const result =
        await loginNatanUser({
          username,
          password,
          deviceId,
          deviceName:
            'NATAN Android',
          platform:
            'android',
          appVersion:
            '1.0.0',
        });

      const converted =
        convertSession(
          result,
        );

      if (
        !converted.token ||
        !converted.userId
      ) {
        throw new Error(
          'تم تسجيل الدخول ولكن بيانات الجلسة غير مكتملة.',
        );
      }

      saveSession(
        converted,
      );

      if (autoRememberBiometrics) {
        saveBiometricSession(converted);
      }

      await enableBiometricForDevice();

      setSuccessMsg(
        'تم تسجيل الدخول بنجاح.',
      );
    } catch (error: any) {
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
      setLoading(false);
    }
  };

   const handleRegister = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    clearMessages();

    const cleanUsername =
      normalizeText(registerUsername);

    const cleanFullName =
      normalizeText(fullName);

    const cleanEmail =
      normalizeText(email).toLowerCase();

    const cleanPhone =
      normalizeText(phone);

    if (!cleanUsername) {
      setErrorMsg(
        'يرجى إدخال اسم المستخدم.',
      );
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMsg(
        'اسم المستخدم يجب أن يكون 3 أحرف على الأقل.',
      );
      return;
    }

    if (
      !/^[a-zA-Z0-9_.-]+$/.test(
        cleanUsername,
      )
    ) {
      setErrorMsg(
        'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام و _ أو - أو . فقط.',
      );
      return;
    }

    if (!cleanFullName) {
      setErrorMsg(
        'يرجى إدخال الاسم الكامل.',
      );
      return;
    }

    if (!cleanEmail) {
      setErrorMsg(
        'يرجى إدخال البريد الإلكتروني.',
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail,
      )
    ) {
      setErrorMsg(
        'يرجى إدخال بريد إلكتروني صحيح.',
      );
      return;
    }

    if (!cleanPhone) {
      setErrorMsg(
        'يرجى إدخال رقم الهاتف.',
      );
      return;
    }

    if (!registerPassword) {
      setErrorMsg(
        'يرجى إدخال كلمة المرور.',
      );
      return;
    }

    if (registerPassword.length < 6) {
      setErrorMsg(
        'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
      );
      return;
    }

    if (
      registerPassword !==
      confirmPassword
    ) {
      setErrorMsg(
        'كلمتا المرور غير متطابقتين.',
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * الحصول على Device ID تلقائيًا.
       */
      const deviceId =
        await getNatanDeviceId();

      if (!deviceId) {
        throw new Error(
          'تعذر الحصول على معرف الجهاز.',
        );
      }

      /*
       * إنشاء الحساب بدون Activation Code.
       */
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
            '4.0.0',
        });

      if (!result?.success) {
        throw new Error(
          result?.message ||
            'تعذر إنشاء حساب NATAN.',
        );
      }

      /*
       * التسجيل نجح.
       *
       * لا نحفظ Session.
       * لا ندخل المستخدم إلى NATAN.
       * لا نحتاج Token من التسجيل.
       */
      setRegisterUsername('');
      setFullName('');
      setEmail('');
      setPhone('');
      setRegisterPassword('');
      setConfirmPassword('');

      /*
       * وضع اسم المستخدم تلقائيًا في شاشة الدخول.
       */
      setLoginUsername(
        cleanUsername,
      );

      setLoginPassword('');

      /*
       * العودة إلى شاشة تسجيل الدخول.
       */
      setActiveTab('login');

      /*
       * إظهار رسالة نجاح.
       */
      setSuccessMsg(
        'تم إنشاء مستخدم جديد بنجاح. يمكنك الآن تسجيل الدخول.',
      );

    } catch (error: any) {
      setErrorMsg(
        error?.message ||
          'تعذر إنشاء حساب NATAN.',
      );
    } finally {
      setLoading(false);
    }
    };

  const handleActivate = async (event: FormEvent) => {
    event.preventDefault();
    clearMessages();

    const identifier = normalizeText(activationUsername);
    const code = normalizeCode(activationCode);

    if (!identifier || !code) {
      setErrorMsg('أدخل بيانات الحساب وكود التفعيل.');
      return;
    }

    setLoading(true);
    try {
      const deviceId = await getNatanDeviceId();
      const result = await activateNatanUser({
        identifier,
        activationCode: code,
        deviceId,
      });
      const converted = convertSession(result);
      if (!converted.token || !converted.userId) {
        throw new Error('تم التفعيل ولكن بيانات الجلسة غير مكتملة.');
      }
      saveSession(converted);
      setSuccessMsg('تم تفعيل الحساب بنجاح.');
      setActiveTab('login');
      setLoginUsername(identifier);
    } catch (error: any) {
      setErrorMsg(error?.message || 'تعذر تفعيل الحساب.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (
  event: FormEvent,
) => {
    event.preventDefault();
    clearMessages();

    const identifier =
      normalizeText(
        forgotUsername,
      );

    if (!identifier) {
      setErrorMsg(
        'أدخل اسم المستخدم أو البريد الإلكتروني.',
      );
      return;
    }

    setLoading(true);

    try {
      await forgotNatanPassword(
        identifier,
      );

      setSuccessMsg(
        'تم إرسال طلب استعادة كلمة المرور إذا كان الحساب موجودًا.',
      );
    } catch (error: any) {
      setErrorMsg(
        error?.message ||
          'تعذر إرسال طلب استعادة كلمة المرور.',
      );
    } finally {
      setLoading(false);
    }
  };

  const goToTab = (
    tab: AuthTab,
  ) => {
    clearMessages();
    setActiveTab(tab);
  };

  const isLicensed =
    !!(
      currentSession &&
      currentSession.isAuthenticated &&
      currentSession.expiresAt >
        Date.now()
    );

  const openSupportWhatsApp = (
    phoneNumber: string,
  ) => {
    const message = encodeURIComponent(
      'السلام عليكم، أحتاج إلى الدعم الفني لبرنامج NATAN.',
    );

    const url =
      `https://wa.me/${phoneNumber}?text=${message}`;

    window.open(
      url,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/90 p-3 sm:p-4 backdrop-blur-sm"
    >
      <div className="relative my-auto sm:my-4 w-full max-w-sm sm:max-w-md overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950 shadow-2xl">
        {/* Language Selection Header Bar - Touch-First for Mobile Phones */}
        <div className="bg-slate-900 border-b border-slate-800/90 px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                haptics.vibrateTick();
                setLanguage('ar');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 min-h-[36px] ${
                isAr
                  ? 'bg-purple-600 text-white shadow-sm font-black ring-1 ring-purple-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇸🇦</span>
              <span>العربية</span>
            </button>

            <button
              type="button"
              onClick={() => {
                haptics.vibrateTick();
                setLanguage('en');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 min-h-[36px] ${
                !isAr
                  ? 'bg-purple-600 text-white shadow-sm font-black ring-1 ring-purple-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇬🇧</span>
              <span>English</span>
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center active:scale-95"
              aria-label={isAr ? 'إغلاق' : 'Close'}
              title={isAr ? 'إغلاق والدخول لشاشة البرنامج' : 'Close and enter app'}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="border-b border-slate-800/80 bg-gradient-to-b from-purple-950/20 via-slate-900/60 to-slate-950 px-5 sm:px-6 pb-4 sm:pb-5 pt-5 sm:pt-6 text-center">
          <div className="mx-auto mb-2.5 sm:mb-3 flex items-center justify-center">
            <NatanLogo size="md" withGlow={true} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white">
            NATAN
          </h1>
        </div>

        <div className="p-4 sm:p-6">
          {(errorMsg || successMsg) && (
            <div
              className={`mb-4 sm:mb-5 flex items-start gap-3 rounded-xl border px-3.5 py-3 text-xs sm:text-sm ${
                errorMsg
                  ? 'border-red-500/30 bg-red-500/10 text-red-200'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {errorMsg ? (
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              ) : (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              )}

              <span>
                {errorMsg ||
                  successMsg}
              </span>
            </div>
          )}

          {activeTab === 'login' && (
            <>
              <div className="mb-4 sm:mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1">
                <button
                  type="button"
                  onClick={() =>
                    goToTab('login')
                  }
                  className="rounded-lg bg-blue-600 px-3 py-2.5 text-xs sm:text-sm font-black text-white min-h-[44px] cursor-pointer shadow-md shadow-blue-600/25 active:scale-95"
                >
                  {isAr ? 'تسجيل الدخول' : 'Sign In'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    goToTab('register')
                  }
                  className="rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-400 transition hover:text-white min-h-[44px] cursor-pointer active:scale-95"
                >
                  {isAr ? 'إنشاء حساب' : 'Create Account'}
                </button>
              </div>

              <form
                onSubmit={
                  handleLogin
                }
                className="space-y-3.5 sm:space-y-4"
              >
                <Field
                  label={isAr ? 'اسم المستخدم / البريد / الهاتف' : 'Username / Email / Phone'}
                  value={
                    loginUsername
                  }
                  onChange={
                    setLoginUsername
                  }
                  placeholder={isAr ? 'أدخل بيانات الحساب' : 'Enter your account'}
                  icon={
                    <User size={18} />
                  }
                  autoComplete="username"
                  disabled={loading}
                />

                <Field
                  label={isAr ? 'كلمة المرور' : 'Password'}
                  value={
                    loginPassword
                  }
                  onChange={
                    setLoginPassword
                  }
                  type="password"
                  placeholder={isAr ? 'أدخل كلمة المرور' : 'Enter your password'}
                  icon={
                    <Lock size={18} />
                  }
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm sm:text-base font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer min-h-[48px] active:scale-95"
                >
                  {loading ? (
                    <RefreshCw
                      size={19}
                      className="animate-spin"
                    />
                  ) : (
                    <LogIn size={19} />
                  )}

                  {loading
                    ? (isAr ? 'جارٍ تسجيل الدخول...' : 'Signing in...')
                    : (isAr ? 'تسجيل الدخول' : 'Sign In')}
                </button>

                {/* Biometric Quick Login Section - Unified Single Action */}
                <div className="pt-2">
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink mx-2 text-[10px] sm:text-[11px] font-bold text-slate-400 bg-slate-950 px-2">
                      {isAr ? 'أو المصادقة الحيوية' : 'Or Biometric Sign In'}
                    </span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>

                  {/* Single Unified Biometric Action */}
                  <button
                    type="button"
                    onClick={() => {
                      haptics.vibrateTick();
                      setBiometricModalMode('fingerprint');
                      setShowBiometricModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 hover:from-emerald-500/25 hover:to-cyan-500/25 text-emerald-300 font-bold text-xs sm:text-sm shadow-sm transition active:scale-[0.98] min-h-[46px] cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Fingerprint className="w-5 h-5 text-emerald-400" />
                      <ScanFace className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="truncate">{isAr ? 'الدخول السريع بالبصمة الحيوية (إصبع / وجه)' : 'Quick Biometric Sign In (Fingerprint & Face ID)'}</span>
                  </button>

                  {/* Biometric toggle checkbox */}
                  <label className="flex items-center gap-2 mt-2.5 cursor-pointer select-none text-[11px] sm:text-xs text-slate-400 hover:text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoRememberBiometrics}
                      onChange={(e) => setAutoRememberBiometrics(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer"
                    />
                    <span>{isAr ? 'تفعيل الدخول التلقائي بالبصمة على هذا الهاتف' : 'Enable auto biometric login on this phone'}</span>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      goToTab('forgot')
                    }
                    className="text-slate-400 transition hover:text-blue-400 cursor-pointer min-h-[38px] flex items-center"
                  >
                    {isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      goToTab('activate')
                    }
                    className="text-slate-400 transition hover:text-emerald-400 cursor-pointer min-h-[38px] flex items-center"
                  >
                    {isAr ? 'لدي رمز تفعيل' : 'I have an activation code'}
                  </button>
                </div>
              </form>
            </>
          )}

          {activeTab === 'register' && (
            <>
              <div className="mb-4 sm:mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1">
                <button
                  type="button"
                  onClick={() =>
                    goToTab('login')
                  }
                  className="rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-400 transition hover:text-white min-h-[44px] cursor-pointer active:scale-95"
                >
                  {isAr ? 'تسجيل الدخول' : 'Sign In'}
                </button>

                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-3 py-2.5 text-xs sm:text-sm font-black text-white min-h-[44px] shadow-md shadow-blue-600/25"
                >
                  {isAr ? 'إنشاء حساب' : 'Create Account'}
                </button>
              </div>

              <form
                onSubmit={
                  handleRegister
                }
                className="space-y-3.5 sm:space-y-4"
              >
                <Field
                  label={isAr ? 'اسم المستخدم' : 'Username'}
                  value={registerUsername}
                  onChange={setRegisterUsername}
                  placeholder={isAr ? 'مثال: natan_user' : 'e.g. natan_user'}
                  icon={
                    <User size={18} />
                  }
                  autoComplete="username"
                  disabled={loading}
                />

                <Field
                  label={isAr ? 'الاسم الكامل' : 'Full Name'}
                  value={fullName}
                  onChange={
                    setFullName
                  }
                  placeholder={isAr ? 'مثال: أحمد محمد' : 'e.g. Ahmed Ali'}
                  icon={
                    <User size={18} />
                  }
                  autoComplete="name"
                  disabled={loading}
                />

                <Field
                  label={isAr ? 'البريد الإلكتروني' : 'Email Address'}
                  value={email}
                  onChange={
                    setEmail
                  }
                  type="email"
                  placeholder="name@example.com"
                  icon={
                    <Mail size={18} />
                  }
                  autoComplete="email"
                  disabled={loading}
                />

                <Field
                  label={isAr ? 'رقم الهاتف' : 'Phone Number'}
                  value={phone}
                  onChange={
                    setPhone
                  }
                  type="tel"
                  placeholder={isAr ? 'رقم الهاتف' : 'Phone number'}
                  icon={
                    <Phone size={18} />
                  }
                  autoComplete="tel"
                  disabled={loading}
                />

                <Field
                  label={isAr ? 'كلمة المرور' : 'Password'}
                  value={
                    registerPassword
                  }
                  onChange={
                    setRegisterPassword
                  }
                  type="password"
                  placeholder={isAr ? '6 أحرف على الأقل' : 'At least 6 characters'}
                  icon={
                    <Lock size={18} />
                  }
                  autoComplete="new-password"
                  disabled={loading}
                />

                <Field
                  label={isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  value={
                    confirmPassword
                  }
                  onChange={
                    setConfirmPassword
                  }
                  type="password"
                  placeholder={isAr ? 'أعد كتابة كلمة المرور' : 'Re-enter your password'}
                  icon={
                    <Lock size={18} />
                  }
                  autoComplete="new-password"
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm sm:text-base font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer min-h-[48px] active:scale-95"
                >
                  {loading ? (
                    <RefreshCw
                      size={19}
                      className="animate-spin"
                    />
                  ) : (
                    <UserPlus
                      size={19}
                    />
                  )}

                  {loading
                    ? (isAr ? 'جارٍ إنشاء الحساب...' : 'Creating account...')
                    : (isAr ? 'إنشاء الحساب' : 'Create Account')}
                </button>

                <p className="text-center text-xs leading-5 text-slate-500">
                  {isAr
                    ? 'يمكنك إنشاء الحساب بدون رمز تفعيل، ويطلب فقط عند الحاجة إلى الميزات المحمية.'
                    : 'You can create an account without an activation code.'}
                </p>
              </form>
            </>
          )}

          {activeTab === 'activate' && (
            <>
              <div className="mb-4 sm:mb-5 text-center">
                <div className="mx-auto mb-2.5 sm:mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <KeyRound size={28} />
                </div>

                <h2 className="text-base sm:text-lg font-black text-white">
                  {isAr ? 'تفعيل الحساب' : 'Account Activation'}
                </h2>

                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  {isAr ? 'أدخل بيانات الحساب ورمز التفعيل' : 'Enter account details and activation code'}
                </p>
              </div>

              {activationHint && (
                <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2.5 text-xs sm:text-sm leading-6 text-amber-200">
                  {activationHint}
                </div>
              )}

              <form
                onSubmit={
                  handleActivate
                }
                className="space-y-3.5 sm:space-y-4"
              >
                <Field
                  label={isAr ? 'اسم المستخدم / البريد / الهاتف' : 'Username / Email / Phone'}
                  value={
                    activationUsername
                  }
                  onChange={
                    setActivationUsername
                  }
                  placeholder={isAr ? 'بيانات الحساب' : 'Account credentials'}
                  icon={
                    <User size={18} />
                  }
                  autoComplete="username"
                  disabled={loading}
                />

                <CodeField
                  value={
                    activationCode
                  }
                  onChange={
                    setActivationCode
                  }
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm sm:text-base font-black text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer min-h-[48px] active:scale-95"
                >
                  {loading ? (
                    <RefreshCw
                      size={19}
                      className="animate-spin"
                    />
                  ) : (
                    <ShieldCheck
                      size={19}
                    />
                  )}

                  {loading
                    ? (isAr ? 'جارٍ التفعيل...' : 'Activating...')
                    : (isAr ? 'تفعيل الحساب' : 'Activate Account')}
                </button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      goToTab('login')
                    }
                    className="text-slate-400 transition hover:text-blue-400 cursor-pointer min-h-[38px] flex items-center"
                  >
                    {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      goToTab('register')
                    }
                    className="text-slate-400 transition hover:text-blue-400 cursor-pointer min-h-[38px] flex items-center"
                  >
                    {isAr ? 'إنشاء حساب' : 'Create Account'}
                  </button>
                </div>
              </form>
            </>
          )}

          {activeTab === 'forgot' && (
            <>
              <div className="mb-4 sm:mb-5 text-center">
                <div className="mx-auto mb-2.5 sm:mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                  <Lock size={28} />
                </div>

                <h2 className="text-base sm:text-lg font-black text-white">
                  {isAr ? 'استعادة كلمة المرور' : 'Reset Password'}
                </h2>

                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  {isAr ? 'أدخل اسم المستخدم أو البريد الإلكتروني' : 'Enter username or email address'}
                </p>
              </div>

              <form
                onSubmit={
                  handleForgotPassword
                }
                className="space-y-3.5 sm:space-y-4"
              >
                <Field
                  label={isAr ? 'اسم المستخدم / البريد الإلكتروني' : 'Username / Email'}
                  value={
                    forgotUsername
                  }
                  onChange={
                    setForgotUsername
                  }
                  placeholder={isAr ? 'بيانات الحساب' : 'Account credentials'}
                  icon={
                    <Mail size={18} />
                  }
                  autoComplete="username"
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm sm:text-base font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer min-h-[48px] active:scale-95 shadow-md shadow-blue-600/25"
                >
                  {loading ? (
                    <RefreshCw
                      size={19}
                      className="animate-spin"
                    />
                  ) : (
                    <KeyRound size={19} />
                  )}

                  {loading
                    ? (isAr ? 'جارٍ الإرسال...' : 'Sending...')
                    : (isAr ? 'إرسال طلب الاستعادة' : 'Send Reset Link')}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    goToTab('login')
                  }
                  className="w-full text-center text-xs text-slate-400 transition hover:text-blue-400 cursor-pointer min-h-[38px] flex items-center justify-center"
                >
                  {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                </button>
              </form>
            </>
          )}

          <div className="mt-5 sm:mt-6 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Smartphone size={15} />
              <span>
                {isAr ? 'مصادقة NATAN Server المشفرة' : 'NATAN Encrypted Server Auth'}
              </span>
            </div>

            {currentSession &&
              isLicensed && (
                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center text-xs text-emerald-300">
                  {isAr ? 'الحساب الحالي صالح حتى' : 'Current account valid until'}{' '}
                  {formatExpiry(
                    currentSession.expiresAt,
                  )}
                </div>
              )}

            {/* WhatsApp Support */}
            <div className="mt-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="mb-1.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-emerald-300">
                <MessageCircle size={16} />
                <span>
                  {isAr ? 'الدعم الفني والتراخيص عبر واتساب' : 'Technical & Licensing Support via WhatsApp'}
                </span>
              </div>

              <p className="mb-2.5 text-center text-[10px] sm:text-[11px] leading-4 text-slate-500">
                {isAr ? 'تواصل مباشرة مع فريق الدعم للمساعدة في التسجيل والتفعيل.' : 'Connect directly with technical support for registration & license assistance.'}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onOpenWhatsApp
                      ? onOpenWhatsApp()
                      : openSupportWhatsApp(
                          '97333314353',
                        )
                  }
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2.5 text-xs font-bold text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/20 active:scale-95 min-h-[46px] cursor-pointer"
                  title="فتح واتساب للدعم الفني"
                >
                  <MessageCircle
                    size={22}
                    className="fill-emerald-400/20"
                  />
                  <span>
                    {isAr ? 'الدعم الفني' : 'Tech Support'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openSupportWhatsApp(
                      '97333269372',
                    )
                  }
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2.5 text-xs font-bold text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/20 active:scale-95 min-h-[46px] cursor-pointer"
                  title="فتح واتساب لخدمة العملاء"
                >
                  <MessageCircle
                    size={22}
                    className="fill-emerald-400/20"
                  />
                  <span>
                    {isAr ? 'خدمة العملاء' : 'Customer Care'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBiometricModal && (
        <BiometricPromptModal
          isOpen={showBiometricModal}
          preferredMode={biometricModalMode}
          currentSession={currentSession}
          onClose={() => setShowBiometricModal(false)}
          onSuccess={(session) => {
            saveSession(session);
            saveBiometricSession(session, biometricModalMode);
            setSuccessMsg('تم تسجيل الدخول بالمصادقة الحيوية بنجاح!');
            setShowBiometricModal(false);
          }}
        />
      )}
    </div>
  );
}




