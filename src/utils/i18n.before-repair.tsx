import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

export interface Translations {
  // Common & Branding
  brandName: string;
  ninjaBadge: string;
  myAccount: string;
  license: string;
  licensedAndEncrypted: string;
  unlicensedLocked: string;
  autoBookingLabel: string;
  autoBookingActive: string;
  autoBookingManual: string;
  screenWatching: string;
  monitoringStopped: string;
  bookedCount: string;
  flashShift: string;
  aiAdvisor: string;
  startMonitoring: string;
  stopMonitoring: string;
  daysRemaining: string;
  dayUnit: string;

  // Tabs
  tabRadar: string;
  tabCriteria: string;
  tabEngine: string;
  tabCode: string;
  tabApiBot: string;
  directApiBadge: string;

  // Metrics
  metricsTotalScans: string;
  metricsDetected: string;
  metricsCaptured: string;
  metricsSuccessRate: string;
  metricsAvgResponse: string;
  metricsFastest: string;

  // Auth Modal
  authModalTitle: string;
  authModalSubtitle: string;
  tabRegister: string;
  tabLogin: string;
  tabActivation: string;
  tabForgot: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  cityLabel: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  forgotPasswordLink: string;
  activationKeyLabel: string;
  activationKeyPlaceholder: string;
  registerAndActivateBtn: string;
  loginAndContinueBtn: string;
  confirmActivationBtn: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;
  expiredAlertTitle: string;
  expiredAlertDesc: string;
  quickDemoCodes: string;
  clickToApply: string;
  backToRegister: string;
  requestViaWhatsapp: string;
  resetPasswordTitle: string;
  resetPasswordDesc: string;
  resetPasswordBtn: string;
  resetSuccessMsg: string;
  verifying: string;
  activating: string;

  // Radar Simulator
  radarTitle: string;
  radarSubtitle: string;
  autoDropToggle: string;
  instantDropBtn: string;
  noShiftsAvailable: string;
  bookShiftNow: string;
  bookedStatus: string;
  missedStatus: string;
  peakHourBadge: string;
  basePay: string;
  bonusPay: string;
  totalPay: string;
  hourlyRate: string;
  durationHours: string;
  deleteShift: string;

  // Criteria
  criteriaTitle: string;
  criteriaSubtitle: string;
  citySelectorTitle: string;
  districtsSelectorTitle: string;
  selectAll: string;
  clearAll: string;
  daysSelectorTitle: string;
  timeAndDurationTitle: string;
  earliestStart: string;
  latestEnd: string;
  minDuration: string;
  maxDuration: string;
  minuteTolerance: string;
  branchKeywordNumbersTitle: string;
  branchKeywordPlaceholder: string;
  addBranch: string;
  peakHoursOnly: string;
  soundAlerts: string;
  vibrationAlerts: string;
  secureScreenMode: string;
  volumeKeysControl: string;

  // Speed Engine
  engineTitle: string;
  engineSubtitle: string;
  speedModeTitle: string;
  ultraTitle: string;
  ultraDesc: string;
  turboTitle: string;
  turboDesc: string;
  stealthTitle: string;
  stealthDesc: string;
  scanIntervalTitle: string;
  humanJitterTitle: string;
  humanJitterDesc: string;
  bypassBatteryTitle: string;
  bypassBatteryDesc: string;
  autoRefreshTitle: string;
  autoRefreshDesc: string;
  wakeLockTitle: string;
  wakeLockDesc: string;

  // Direct API Bot
  apiBotTitle: string;
  apiBotSubtitle: string;
  endpointUrl: string;
  bearerToken: string;
  deviceId: string;
  appVersion: string;
  testConnection: string;
  telegramAlerts: string;
  telegramBotToken: string;
  telegramChatId: string;
  simulateDirectApi: string;

  // Logs
  logsTitle: string;
  logsClear: string;
  logsEmpty: string;
  logsSpeed: string;
  logsSuccess: string;
  logsInfo: string;
  logsError: string;

  // Convenience and component-specific keys
  close: string;
  cancel: string;
  authModalDesc: string;
  regNewAccount: string;
  loginTab: string;
  activationTab: string;
  workCityLabel: string;
  registerBtn: string;
  usernameOrPhoneLabel: string;
  loginBtn: string;
  noAccountRegister: string;
  activationHeader: string;
  activationInfo: string;
  demoCodesLabel: string;
  activateBtn: string;
  requestKeyWhatsApp: string;
  whatsappSupport: string;
  continuousSim: string;
  fastestBooking: string;
  avgSpeed: string;
  shiftsCaptured: string;
  successRate: string;
  availableShiftsLive: string;
  bookShiftBtn: string;
  tabSpeed: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    brandName: 'NATAN PRO',
    ninjaBadge: 'نينجا 🇸🇦',
    myAccount: 'حسابي / ترخيص',
    license: 'الترخيص',
    licensedAndEncrypted: 'مرخّص ومشفّر 🛡️',
    unlicensedLocked: 'غير مفعّل (مغلق)',
    autoBookingLabel: 'الحجز الآلي:',
    autoBookingActive: '⚡ شغال فوراً',
    autoBookingManual: 'يدوي',
    screenWatching: 'يراقب الشاشة',
    monitoringStopped: 'متوقف',
    bookedCount: 'محجوز:',
    flashShift: 'شفت فلاشي',
    aiAdvisor: 'المستشار الذكي',
    startMonitoring: 'بدء الرصد',
    stopMonitoring: 'إيقاف',
    daysRemaining: 'يوم متبقي',
    dayUnit: 'ي',

    tabRadar: 'رادار الشفتات',
    tabCriteria: 'شروط الفروع',
    tabEngine: 'سرعة المحرك',
    tabCode: 'كود الأندرويد',
    tabApiBot: 'Direct API Bot',
    directApiBadge: '⚡ مباشر',

    metricsTotalScans: 'إجمالي عمليات الفحص',
    metricsDetected: 'شفتات مرصودة',
    metricsCaptured: 'شفتات محجوزة',
    metricsSuccessRate: 'نسبة النجاح',
    metricsAvgResponse: 'متوسط الاستجابة',
    metricsFastest: 'أسرع نقرة',

    authModalTitle: 'NATAN PRO نينجا 🇸🇦',
    authModalSubtitle: 'شاشة التسجيل وإدارة الحسابات والترخيص',
    tabRegister: 'تسجيل جديد',
    tabLogin: 'تسجيل الدخول',
    tabActivation: 'كود التفعيل',
    tabForgot: 'استعادة المرور',
    fullNameLabel: 'الاسم الثلاثي',
    fullNamePlaceholder: 'مثال: عمار محمد الشمري',
    phoneLabel: 'رقم الجوال المسجل بنينجا',
    phonePlaceholder: '05xxxxxxxx',
    cityLabel: 'المدينة الرئيسية',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    forgotPasswordLink: 'نسيت كلمة المرور؟',
    activationKeyLabel: 'كود تفعيل البرنامج (License Key)',
    activationKeyPlaceholder: 'مثال: 3MMAR-2026-NINJA أو NATAN-VIP-30D',
    registerAndActivateBtn: 'تسجيل الحساب وتفعيل البرنامج 🚀',
    loginAndContinueBtn: 'تسجيل الدخول ومتابعة التفعيل',
    confirmActivationBtn: 'تأكيد التفعيل وبدء تشغيل البرنامج',
    alreadyHaveAccount: 'لديك حساب مسجل بالفعل؟ تسجيل الدخول',
    dontHaveAccount: 'ليس لديك حساب؟ سجّل حسابك الجديد الآن',
    expiredAlertTitle: 'انتهت فترة التفعيل السابقة!',
    expiredAlertDesc: 'لقد انتهى تاريخ صلاحية ترخيص البرنامج. يرجى إدخال كود تفعيل جديد للاستمرار.',
    quickDemoCodes: 'أكواد تجريبية سريعة جاهزة:',
    clickToApply: 'انقر للتطبيق',
    backToRegister: 'العودة للتسجيل',
    requestViaWhatsapp: 'طلب كود عبر واتساب',
    resetPasswordTitle: 'استعادة كلمة المرور',
    resetPasswordDesc: 'أدخل رقم جوالك المسجل وسنرسل لك كود التحقق لاستعادة الحساب.',
    resetPasswordBtn: 'إرسال رابط إعادة التعيين',
    resetSuccessMsg: 'تم إرسال تعليمات استعادة الحساب بنجاح إلى رقم جوالك!',
    verifying: 'جارٍ التحقق...',
    activating: 'جارٍ تفعيل الترخيص...',

    radarTitle: 'رادار الرصد الحي وتجربة الالتقاط الفوري',
    radarSubtitle: 'يحاكي ظهور شفتات تطبيق نينجا كابتن الحقيقية وسرعة التقاطها بالملي ثانية',
    autoDropToggle: 'المحاكاة التلقائية',
    instantDropBtn: 'إنزال شفت فوري ⚡',
    noShiftsAvailable: 'لا توجد شفتات متاحة حالياً. اضغط على "إنزال شفت فوري" لتجربة السرعة!',
    bookShiftNow: 'حجز فوري',
    bookedStatus: 'تم الحجز بنجاح',
    missedStatus: 'فاتك الشفت',
    peakHourBadge: 'ساعة ذروة 🔥',
    basePay: 'الأجر الأساسي:',
    bonusPay: 'بونص إضافي:',
    totalPay: 'المجموع:',
    hourlyRate: 'س/ساعة',
    durationHours: 'ساعات',
    deleteShift: 'حذف',

    criteriaTitle: 'شروط وفلاتر الحجز الذكي',
    criteriaSubtitle: 'تحديد المدن والفروع وأوقات الشفتات المسموح بالتقاطها آلياً',
    citySelectorTitle: 'المدينة والمنطقة',
    districtsSelectorTitle: 'الأحياء والمستودعات المستهدفة',
    selectAll: 'تحديد الكل',
    clearAll: 'إلغاء التحديد',
    daysSelectorTitle: 'أيام العمل المرغوبة',
    timeAndDurationTitle: 'نطاق ساعات العمل ومدتها',
    earliestStart: 'أبكر وقت للبدء',
    latestEnd: 'أقصى وقت للانتهاء',
    minDuration: 'أدنى مدة (ساعات)',
    maxDuration: 'أقصى مدة (ساعات)',
    minuteTolerance: 'هامش التسامح الزمني (± دقائق)',
    branchKeywordNumbersTitle: 'أرقام الفروع والمتاجر ذات الأولوية',
    branchKeywordPlaceholder: 'مثال: #495, #266, #420',
    addBranch: 'إضافة',
    peakHoursOnly: 'شفتات الذروة والمكافآت فقط',
    soundAlerts: 'تنبيه صوتي فوري عند الحجز',
    vibrationAlerts: 'تنبيه بالاهتزاز',
    secureScreenMode: 'حماية الشاشة من الرصد (FLAG_SECURE)',
    volumeKeysControl: 'التحكم بأزرار الصوت (رفع/خفض)',

    engineTitle: 'إعدادات محرك السرعة ونمط الاستجابة',
    engineSubtitle: 'ضبط فترات الفحص بالملي ثانية والتمويه ضد خوارزميات الكشف',
    speedModeTitle: 'نمط السرعة الفائقة',
    ultraTitle: 'خارق (Ultra) - 50ms',
    ultraDesc: 'أقصى سرعة لالتقاط الشفتات النادرة خلال أجزاء من الثانية.',
    turboTitle: 'توربو (Turbo) - 120ms',
    turboDesc: 'معدل سرعة متوازن ومناسب للاستخدام اليومي المستمر.',
    stealthTitle: 'شبح خفي (Stealth) - 300ms',
    stealthDesc: 'تمويه عالي وتأخير بشري آمن لتقليل معدل الطلبات.',
    scanIntervalTitle: 'فترة الفحص بين كل مسح (ms)',
    humanJitterTitle: 'التأخير البشري العشوائي (Human Jitter)',
    humanJitterDesc: 'إضافة تباين عشوائي في زمن النقر لمحاكاة الأصابع البشرية ومنع الكشف.',
    bypassBatteryTitle: 'تخطي تحسينات البطارية في أندرويد',
    bypassBatteryDesc: 'ضمان استمرار عمل محرك الحجز في الخلفية حتى مع إغلاق الشاشة.',
    autoRefreshTitle: 'التحديث التلقائي للشاشة',
    autoRefreshDesc: 'محاكاة السحب لأسفل لتحديث قائمة الشفتات دورياً.',
    wakeLockTitle: 'إبقاء الشاشة نشطة (WakeLock)',
    wakeLockDesc: 'منع هاتف الأندرويد من الدخول في وضع السكون أثناء الرصد.',

    apiBotTitle: 'Direct API Bot (حجز مباشر عبر السيرفر)',
    apiBotSubtitle: 'إرسال طلبات الحجز مباشرة عبر ترويسات ومسارات الـ API بدون الحاجة للنقر على الشاشة',
    endpointUrl: 'رابط خادم نينجا (Ninja API Endpoint)',
    bearerToken: 'رمز المصادقة (Bearer Token)',
    deviceId: 'معرّف الجهاز (Device ID)',
    appVersion: 'إصدار التطبيق (App Version)',
    testConnection: 'فحص الاتصال بالخادم (Ping API)',
    telegramAlerts: 'تنبيهات تيليجرام الفورية',
    telegramBotToken: 'توكن بوت تيليجرام (Telegram Bot Token)',
    telegramChatId: 'معرّف المحادثة (Telegram Chat ID)',
    simulateDirectApi: 'تفعيل وضع المحاكاة المباشرة للـ API',

    logsTitle: 'سجل العمليات والتقاط الشفتات الحي',
    logsClear: 'مسح السجل',
    logsEmpty: 'لا توجد سجلات حتى الآن. قم بتشغيل الرادار لمشاهدة الحركة الحية.',
    logsSpeed: 'سرعة',
    logsSuccess: 'نجاح',
    logsInfo: 'معلومات',
    logsError: 'خطأ',

    close: 'إغلاق',
    cancel: 'إلغاء',
    authModalDesc: 'سجل حسابك وفعّل ترخيص نينجا للبدء في خطف الشفتات فورياً',
    regNewAccount: 'إنشاء حساب جديد',
    loginTab: 'تسجيل الدخول',
    activationTab: 'تفعيل الترخيص',
    workCityLabel: 'مدينة العمل الأساسية في السعودية',
    registerBtn: 'إنشاء الحساب والمتابعة للتفعيل 🚀',
    usernameOrPhoneLabel: 'رقم الجوال أو اسم المستخدم',
    loginBtn: 'تسجيل الدخول ومتابعة العمل',
    noAccountRegister: 'ليس لديك حساب؟ سجّل حساباً جديداً الآن',
    activationHeader: 'تفعيل ترخيص البرنامج (License Activation)',
    activationInfo: 'أدخل كود التفعيل السري المخصص لجهازك لتشغيل كافة ميزات الخطف الآلي والرادار وفلاتر الذروة.',
    demoCodesLabel: 'أكواد تجريبية جاهزة للاستخدام الفوري:',
    activateBtn: 'تأكيد التفعيل وتشغيل البرنامج ⚡',
    requestKeyWhatsApp: 'طلب كود تفعيل فوري عبر واتساب',
    whatsappSupport: 'الدعم الفني والاشتراكات عبر واتساب',
    continuousSim: 'محاكاة مستمرة',
    fastestBooking: 'أسرع حجز',
    avgSpeed: 'متوسط السرعة',
    shiftsCaptured: 'الشفتات المحجوزة',
    successRate: 'نسبة النجاح',
    availableShiftsLive: 'الشفتات المتاحة الحية',
    bookShiftBtn: 'احجز الشفت الآن',
    tabSpeed: 'محرك السرعة والاستقرار',
  },
  en: {
    brandName: 'NATAN PRO',
    ninjaBadge: 'Ninja 🇸🇦',
    myAccount: 'Account / License',
    license: 'License',
    licensedAndEncrypted: 'Licensed & Encrypted 🛡️',
    unlicensedLocked: 'Unlicensed (Locked)',
    autoBookingLabel: 'Auto Booking:',
    autoBookingActive: '⚡ Instant Active',
    autoBookingManual: 'Manual',
    screenWatching: 'Scanning Screen',
    monitoringStopped: 'Stopped',
    bookedCount: 'Booked:',
    flashShift: 'Flash Shift',
    aiAdvisor: 'AI Advisor',
    startMonitoring: 'Start Radar',
    stopMonitoring: 'Stop',
    daysRemaining: 'days left',
    dayUnit: 'd',

    tabRadar: 'Shift Radar',
    tabCriteria: 'Branch Rules',
    tabEngine: 'Speed Engine',
    tabCode: 'Android Code',
    tabApiBot: 'Direct API Bot',
    directApiBadge: '⚡ Direct',

    metricsTotalScans: 'Total Scans',
    metricsDetected: 'Shifts Detected',
    metricsCaptured: 'Shifts Booked',
    metricsSuccessRate: 'Success Rate',
    metricsAvgResponse: 'Avg Response',
    metricsFastest: 'Fastest Click',

    authModalTitle: 'NATAN PRO Ninja 🇸🇦',
    authModalSubtitle: 'Registration, Account Management & Device Licensing',
    tabRegister: 'Register',
    tabLogin: 'Login',
    tabActivation: 'Activation Key',
    tabForgot: 'Forgot Password',
    fullNameLabel: 'Full Name',
    fullNamePlaceholder: 'e.g. Ammar M. Al-Shammari',
    phoneLabel: 'Registered Ninja Mobile Number',
    phonePlaceholder: '05xxxxxxxx',
    cityLabel: 'Primary City',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    forgotPasswordLink: 'Forgot password?',
    activationKeyLabel: 'Software Activation Key (License Key)',
    activationKeyPlaceholder: 'e.g. 3MMAR-2026-NINJA or NATAN-VIP-30D',
    registerAndActivateBtn: 'Register Account & Activate 🚀',
    loginAndContinueBtn: 'Sign In & Proceed to Activation',
    confirmActivationBtn: 'Confirm Activation & Start Program',
    alreadyHaveAccount: 'Already have an account? Sign In',
    dontHaveAccount: "Don't have an account? Register Now",
    expiredAlertTitle: 'License Period Expired!',
    expiredAlertDesc: 'Your software license has expired. Please enter a new activation key to continue.',
    quickDemoCodes: 'Ready Demo Activation Keys:',
    clickToApply: 'Click to apply',
    backToRegister: 'Back to Register',
    requestViaWhatsapp: 'Get Key via WhatsApp',
    resetPasswordTitle: 'Reset Password',
    resetPasswordDesc: 'Enter your registered phone number to receive account recovery instructions.',
    resetPasswordBtn: 'Send Reset Link',
    resetSuccessMsg: 'Password recovery instructions sent to your registered phone number!',
    verifying: 'Verifying...',
    activating: 'Activating license...',

    radarTitle: 'Live Radar & Instant Capture Simulator',
    radarSubtitle: 'Simulates Ninja Captain real shift drops and millisecond auto-booking capture',
    autoDropToggle: 'Auto Simulation',
    instantDropBtn: 'Instant Shift Drop ⚡',
    noShiftsAvailable: 'No shifts currently available. Click "Instant Shift Drop" to test speed!',
    bookShiftNow: 'Book Now',
    bookedStatus: 'Successfully Booked',
    missedStatus: 'Shift Missed',
    peakHourBadge: 'Peak Hour 🔥',
    basePay: 'Base Pay:',
    bonusPay: 'Bonus Pay:',
    totalPay: 'Total:',
    hourlyRate: 'SAR/hr',
    durationHours: 'hrs',
    deleteShift: 'Delete',

    criteriaTitle: 'Smart Booking Filters & Criteria',
    criteriaSubtitle: 'Specify target cities, stores, and allowed shift working hours',
    citySelectorTitle: 'City & Region',
    districtsSelectorTitle: 'Target Stores & Hubs',
    selectAll: 'Select All',
    clearAll: 'Clear All',
    daysSelectorTitle: 'Desired Working Days',
    timeAndDurationTitle: 'Time Windows & Shift Duration',
    earliestStart: 'Earliest Start Time',
    latestEnd: 'Latest End Time',
    minDuration: 'Min Duration (Hours)',
    maxDuration: 'Max Duration (Hours)',
    minuteTolerance: 'Minute Tolerance (± mins)',
    branchKeywordNumbersTitle: 'Priority Branch & Store Numbers',
    branchKeywordPlaceholder: 'e.g. #495, #266, #420',
    addBranch: 'Add',
    peakHoursOnly: 'Peak & Bonus Hours Only',
    soundAlerts: 'Instant Audio Alert on Booking',
    vibrationAlerts: 'Vibration Alert',
    secureScreenMode: 'Anti-Detection Flag (FLAG_SECURE)',
    volumeKeysControl: 'Hardware Volume Keys Control (Up/Down)',

    engineTitle: 'Speed Engine & Response Mode',
    engineSubtitle: 'Tune millisecond scan intervals and anti-detection human jitter',
    speedModeTitle: 'Ultra Speed Profile',
    ultraTitle: 'Ultra (50ms)',
    ultraDesc: 'Maximum capture speed for rare competitive shifts within fractions of a second.',
    turboTitle: 'Turbo (120ms)',
    turboDesc: 'Balanced high-speed mode ideal for continuous daily operation.',
    stealthTitle: 'Stealth (300ms)',
    stealthDesc: 'High stealth mode with natural human-like jitter to prevent detection.',
    scanIntervalTitle: 'Scan Interval Between Screen Cycles (ms)',
    humanJitterTitle: 'Randomized Human Jitter (ms)',
    humanJitterDesc: 'Adds random millisecond variance to touch coordinates and timing.',
    bypassBatteryTitle: 'Bypass Android Battery Optimization',
    bypassBatteryDesc: 'Keeps background accessibility service running smoothly when screen dims.',
    autoRefreshTitle: 'Auto Swipe-to-Refresh',
    autoRefreshDesc: 'Periodically triggers pull-to-refresh to fetch newly released shifts.',
    wakeLockTitle: 'Keep Screen Awake (WakeLock)',
    wakeLockDesc: 'Prevents phone display from sleeping while actively monitoring.',

    apiBotTitle: 'Direct API Bot (Direct Server Booking)',
    apiBotSubtitle: 'Send bookings directly via HTTP headers and API endpoints without screen clicks',
    endpointUrl: 'Ninja API Endpoint URL',
    bearerToken: 'Authorization Bearer Token',
    deviceId: 'Hardware Device ID',
    appVersion: 'Client App Version',
    testConnection: 'Ping Ninja API Server',
    telegramAlerts: 'Instant Telegram Alerts',
    telegramBotToken: 'Telegram Bot Token',
    telegramChatId: 'Telegram Chat ID',
    simulateDirectApi: 'Enable Direct API Simulation Mode',

    logsTitle: 'Live Real-Time Operations Log',
    logsClear: 'Clear Log',
    logsEmpty: 'No log records yet. Start monitoring to observe live operations.',
    logsSpeed: 'Speed',
    logsSuccess: 'Success',
    logsInfo: 'Info',
    logsError: 'Error',

    close: 'Close',
    cancel: 'Cancel',
    authModalDesc: 'Register your account and activate your Ninja license to start grabbing shifts instantly',
    regNewAccount: 'Create New Account',
    loginTab: 'Sign In',
    activationTab: 'Activate License',
    workCityLabel: 'Primary Working City in Saudi Arabia',
    registerBtn: 'Create Account & Proceed to Activation 🚀',
    usernameOrPhoneLabel: 'Mobile Number or Username',
    loginBtn: 'Sign In & Continue',
    noAccountRegister: "Don't have an account? Create one now",
    activationHeader: 'Software License Activation',
    activationInfo: 'Enter your dedicated license activation key to unlock ultra-fast auto-booking, radar, and peak filters.',
    demoCodesLabel: 'Quick Demo Keys (Click to Apply):',
    activateBtn: 'Confirm Activation & Start Program ⚡',
    requestKeyWhatsApp: 'Request Instant License via WhatsApp',
    whatsappSupport: 'WhatsApp Support & Licensing',
    continuousSim: 'Continuous Simulation',
    fastestBooking: 'Fastest Booking',
    avgSpeed: 'Average Speed',
    shiftsCaptured: 'Shifts Booked',
    successRate: 'Success Rate',
    availableShiftsLive: 'Live Available Shifts',
    bookShiftBtn: 'Book Shift Now',
    tabSpeed: 'Speed & Stability Engine',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
  isAr: boolean;
  isEn: boolean;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('natan_lang');
      if (saved === 'en' || saved === 'ar') {
        return saved;
      }
    } catch {
      // safe fallback
    }
    return 'ar';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('natan_lang', lang);
    } catch {
      // safe
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t: translations[language],
    isAr: language === 'ar',
    isEn: language === 'en',
    dir: language === 'ar' ? 'rtl' : 'ltr',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
