import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

import { Navbar } from './components/Navbar';
import { SpeedEngineConfig } from './components/SpeedEngineConfig';
import { CriteriaEditor } from './components/CriteriaEditor';
import { LocationMapPicker } from './components/LocationMapPicker';
import { LogViewer } from './components/LogViewer';
import { CodeExportModal } from './components/CodeExportModal';
import { AiAdvisor } from './components/AiAdvisor';
import { DirectApiBot } from './components/DirectApiBot';
import { WhatsAppSupport } from './components/WhatsAppSupport';
import AuthModal from './components/AuthModal';
import { SimulatorRadar } from './components/SimulatorRadar';

import {
  Shift,
  BookingSettings,
  LogEntry,
  PerformanceStats,
  AppAuthSession,
} from './types';

import {
  SAUDI_CITIES,
  DAYS_OF_WEEK,
  SAUDI_CITY_COORDINATES,
  getClosestSaudiCity,
} from './data/saudiCities';

import { soundFX } from './utils/audio';
import { bookNinjaShift } from './api/ninjaApi';
import { haptics } from './utils/haptics';
import { wakeLock } from './utils/wakeLock';
import { findConflictingShift } from './utils/timeConflict';
import { NatanLogo } from './components/NatanLogo';
import { useLanguage } from './utils/i18n';

import {
  activateNatanUser,
  getNatanDeviceId,
} from './utils/natanApi';

import {
  Zap,
  Radio,
  SlidersHorizontal,
  Flame,
  Server,
  ShieldCheck,
  MessageCircle,
  Lock,
  MapPin,
  MapPinned,
  Check,
  Navigation,
  LocateFixed,
  Fingerprint,
  ScanFace,
} from 'lucide-react';

// Prevent duplicate direct-API booking requests for the same shift.
const directApiBookingInFlight = new Set<string>();

/*
 * ============================================================
 * INITIAL SETTINGS
 * ============================================================
 */

const INITIAL_SETTINGS: BookingSettings = {
  autoBooking: true,
  monitoring: true,

  speedMode: 'turbo',
  scanIntervalMs: 80,
  humanJitterMs: 15,

  autoRefresh: true,
  refreshIntervalSec: 3,

  autoConfirmDialog: true,
  bypassBatteryOptimization: true,
  wakeLockEnabled: true,
  secureScreenMode: true,

  branchKeywordNumbers: [
    '#420',
    '#422',
    '#495',
    '#534',
    '#266',
    '#78',
  ],

  minuteTolerance: 5,
  volumeKeysControl: true,

  multiShiftWindows: [
    {
      id: 1,
      name: 'منـاوبة 1 (الفترة الأساسية)',
      enabled: true,
      startTime: '08:01',
      endTime: '23:59',
    },
    {
      id: 2,
      name: 'مناوبة 2 (الفترة الإضافية)',
      enabled: false,
      startTime: '12:00',
      endTime: '23:59',
    },
    {
      id: 3,
      name: 'مناوبة 3 (المسائية/الفجر)',
      enabled: false,
      startTime: '00:00',
      endTime: '08:00',
    },
  ],

  selectedCity: 'dammam_khobar',
  selectedLatitude: 26.4207,
  selectedLongitude: 50.0888,
  selectedLocationLabel: 'Dammam / Khobar',

  selectedDistricts: [
    'حبوبة HABOBA (#495)',
    'ظهران Dahran (#420)',
    'ضاحية الملك فهد King Fahad (#534)',
    'الشاطئ Shatie (#266)',
    'الأمل Al Amal (#532)',
  ],

  selectedDays: [
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
    'الأحد',
  ],

  startTime: '00:00',
  endTime: '23:59',

  minDurationHours: 1,
  maxDurationHours: 14,

  onlyPeakHours: false,

  soundAlert: true,
  vibrationAlert: true,
};

/*
 * ============================================================
 * APP
 * ============================================================
 */

export default function App() {
  const { t, isAr, setLanguage } = useLanguage();

  /*
   * ============================================================
   * SETTINGS
   * ============================================================
   */

  const [settings, setSettings] =
    useState<BookingSettings>(() => {
      const base: BookingSettings = {
        ...INITIAL_SETTINGS,
        branchKeywordNumbers: [
          ...INITIAL_SETTINGS.branchKeywordNumbers,
        ],
        selectedDistricts: [
          ...INITIAL_SETTINGS.selectedDistricts,
        ],
        selectedDays: [
          ...INITIAL_SETTINGS.selectedDays,
        ],
        multiShiftWindows:
          INITIAL_SETTINGS.multiShiftWindows.map(
            (window) => ({
              ...window,
            })
          ),
      };

      try {
        const savedCity =
          localStorage.getItem(
            'natan_selected_city'
          );

        const savedDistricts =
          localStorage.getItem(
            'natan_selected_districts'
          );

        const savedLatitude = localStorage.getItem('natan_selected_latitude');
        const savedLongitude = localStorage.getItem('natan_selected_longitude');
        const savedLocationLabel = localStorage.getItem('natan_selected_location_label');

        if (savedLatitude && savedLongitude) {
          const lat = Number(savedLatitude);
          const lng = Number(savedLongitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            base.selectedLatitude = lat;
            base.selectedLongitude = lng;
          }
        }
        if (savedLocationLabel) {
          base.selectedLocationLabel = savedLocationLabel;
        }

        /*
         * Restore city.
         */

        if (
          savedCity &&
          SAUDI_CITIES.some(
            (city) =>
              city.id === savedCity
          )
        ) {
          base.selectedCity =
            savedCity;

          /*
           * Restore selected branches.
           */

          if (savedDistricts) {
            try {
              const parsed =
                JSON.parse(
                  savedDistricts
                );

              if (
                Array.isArray(parsed)
              ) {
                base.selectedDistricts =
                  parsed.filter(
                    (
                      item
                    ): item is string =>
                      typeof item ===
                      'string'
                  );
              }
            } catch {
              /*
               * Ignore invalid
               * saved branches.
               */
            }
          } else {
            /*
             * If no branch selection
             * was saved, select all
             * known branches for city.
             */

            const city =
              SAUDI_CITIES.find(
                (item) =>
                  item.id ===
                  savedCity
              );

            if (
              city &&
              city.districts.length >
                0
            ) {
              base.selectedDistricts =
                [
                  ...city.districts,
                ];
            }
          }
        }
      } catch {
        /*
         * Safe fallback to
         * INITIAL_SETTINGS.
         */
      }

      return base;
    });

  const [activeView, setActiveView] =
    useState<
      | 'radar'
      | 'criteria'
      | 'location'
      | 'engine'
      | 'code'
      | 'api_bot'
    >('radar');

  const [isCodeModalOpen, setIsCodeModalOpen] =
    useState<boolean>(false);

  const [isAiAdvisorOpen, setIsAiAdvisorOpen] =
    useState<boolean>(false);

  // Production build: shift data comes only from the authenticated Ninja source.

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] =
    useState<boolean>(false);

  /*
   * ============================================================
   * SELECTED LOCATION
   * ============================================================
   */

  const selectedCity =
    SAUDI_CITIES.find(
      (city) =>
        city.id === settings.selectedCity
    ) || SAUDI_CITIES[0];

  /*
   * ============================================================
   * AUTHENTICATION / LICENSE
   * ============================================================
   */

  const [authSession, setAuthSession] =
    useState<AppAuthSession | null>(() => {
      try {
        const saved =
          localStorage.getItem(
            'natan_auth_session'
          );

        if (!saved) {
          return null;
        }

        const parsed =
          JSON.parse(
            saved
          ) as AppAuthSession;

        // Never allow the old development/direct-access session to bypass login.
        if (parsed.token === 'natan-direct-access') {
          localStorage.removeItem('natan_auth_session');
          return null;
        }

        if (
          parsed.isAuthenticated &&
          (
            !parsed.isActivated ||
            !parsed.expiresAt ||
            parsed.expiresAt >
              Date.now()
          )
        ) {
          return parsed;
        }
      } catch {
        /*
         * Ignore invalid
         * saved session.
         */
      }

      return null;
    });

  const isAuthenticated =
    !!authSession?.isAuthenticated;

  const isLicensed =
    !!(
      authSession &&
      authSession.isAuthenticated &&
      authSession.isActivated &&
      authSession.expiresAt &&
      authSession.expiresAt >
        Date.now()
    );

  const [showAuthModal, setShowAuthModal] =
    useState<boolean>(() => !authSession?.isAuthenticated);

  const [showActivationModal, setShowActivationModal] =
    useState<boolean>(false);

  const [activationCode, setActivationCode] =
    useState<string>('');

  const [activationLoading, setActivationLoading] =
    useState<boolean>(false);

  const [activationError, setActivationError] =
    useState<string>('');

  /*
   * ============================================================
   * ACTIVATION MODAL
   * ============================================================
   */

  const openActivationModal = () => {
    setActivationError('');
    setActivationCode('');
    setShowActivationModal(true);
  };

  /*
   * ============================================================
   * ACTIVATION REQUEST
   * ============================================================
   */

  const handleProtectedActivation =
    async () => {
      const cleanCode =
        activationCode
          .trim()
          .toUpperCase();

      if (!cleanCode) {
        setActivationError(
          isAr
            ? 'يرجى إدخال كود التفعيل.'
            : 'Please enter the activation code.'
        );

        return;
      }

      if (!authSession?.username) {
        setActivationError(
          isAr
            ? 'تعذر تحديد حساب NATAN الحالي.'
            : 'Unable to determine the current NATAN account.'
        );

        return;
      }

      setActivationLoading(true);
      setActivationError('');

      try {
        const deviceId =
          await getNatanDeviceId();

        if (!deviceId) {
          throw new Error(
            isAr
              ? 'تعذر الحصول على معرف الجهاز.'
              : 'Unable to get the device ID.'
          );
        }

        const session =
          await activateNatanUser({
            identifier:
              authSession.username,

            activationCode:
              cleanCode,

            deviceId,
          });

        if (
          !session?.isAuthenticated ||
          !session?.isActivated
        ) {
          throw new Error(
            isAr
              ? 'تعذر تفعيل الحساب. يرجى التحقق من كود التفعيل.'
              : 'Account activation failed. Please check the activation code.'
          );
        }

        try {
          localStorage.setItem(
            'natan_auth_session',
            JSON.stringify(session)
          );
        } catch {
          /*
           * safe
           */
        }

        setAuthSession(session);

        setActivationCode('');
        setActivationError('');
        setShowActivationModal(false);

        addLog(
          'success',
          isAr
            ? `🔑 تم تفعيل حساب NATAN بنجاح. الترخيص: ${
                session.planName ||
                'NATAN'
              }`
            : `🔑 NATAN account activated successfully. Plan: ${
                session.planName ||
                'NATAN'
              }`
        );

        try {
          confetti({
            particleCount: 100,
            spread: 75,
            origin: {
              y: 0.5,
            },
          });
        } catch {
          /*
           * safe
           */
        }
      } catch (error: any) {
        setActivationError(
          error?.message ||
          (
            isAr
              ? 'فشل تفعيل حساب NATAN.'
              : 'NATAN account activation failed.'
          )
        );
      } finally {
        setActivationLoading(false);
      }
    };

  /*
   * ============================================================
   * AUTH SUCCESS
   * ============================================================
   */

  const handleAuthSuccess = (
    session: AppAuthSession
  ) => {
    if (
      !session?.isAuthenticated
    ) {
      return;
    }

    setAuthSession(session);

    try {
      localStorage.setItem(
        'natan_auth_session',
        JSON.stringify(session)
      );
    } catch {
      /*
       * safe
       */
    }

    setShowAuthModal(false);

    

    if (
      session.isActivated &&
      session.expiresAt
    ) {
      addLog(
        'success',
        isAr
          ? `✨ تم تسجيل الدخول بنجاح والترخيص نشط! [${
              session.planName ||
              'NATAN'
            }] ينتهي في: ${
              new Date(
                session.expiresAt
              ).toLocaleDateString(
                'ar-SA'
              )}`
          : `✨ Login successful and license is active! [${
              session.planName ||
              'NATAN'
            }] Expires: ${
              new Date(
                session.expiresAt
              ).toLocaleDateString(
                'en-US'
              )}`
      );
    } else {
      addLog(
        'success',
        isAr
          ? '✅ تم تسجيل الدخول بنجاح. الحساب غير مفعّل حالياً، ويمكنك استخدام البرنامج وسيُطلب التفعيل عند استخدام الميزات المحمية.'
          : '✅ Login successful. Your account is not activated yet. You can use the program, and activation will be required for protected features.'
      );
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: {
          y: 0.5,
        },
      });
    } catch {
      /*
       * safe
       */
    }
  };

  /*
   * ============================================================
   * SHIFTS DATA
   * ============================================================
   */

  const [availableShifts, setAvailableShifts] =
    useState<Shift[]>([]);

  const [capturedShifts, setCapturedShifts] =
    useState<Shift[]>([]);

  const [logs, setLogs] =
    useState<LogEntry[]>([
      {
        id: 'log_0',
        timestamp:
          new Date().toLocaleTimeString(
            isAr
              ? 'ar-SA'
              : 'en-US'
          ),
        type: 'info',
        message:
          isAr
            ? 'تم تشغيل محرك NATAN بنجاح. جاهز لرصد شفتات نينجا السعودية.'
            : 'NATAN engine started successfully. Ready to monitor Ninja Saudi shifts.',
      },
    ]);

  const [stats, setStats] =
    useState<PerformanceStats>({
      totalScans: 0,
      shiftsDetected: 0,
      shiftsCaptured: 0,
      shiftsMissed: 0,
      avgResponseTimeMs: 0,
      fastestResponseTimeMs: 0,
      successRate: 100,
    });

  /*
   * ============================================================
   * WHATSAPP-STYLE NOTIFICATION
   * ============================================================
   */

  const [whatsappBanner, setWhatsappBanner] =
    useState<{
      show: boolean;
      title: string;
      body: string;
      time: string;
      shiftCode: string;
    } | null>(null);

  /*
   * ============================================================
   * LOGGING
   * ============================================================
   */

  const addLog = (
    type: LogEntry['type'],
    message: string,
    durationMsOrDetails?: number | string,
    maybeDurationMs?: number
  ) => {
    const details = typeof durationMsOrDetails === 'string' ? durationMsOrDetails : undefined;
    const durationMs = typeof durationMsOrDetails === 'number' ? durationMsOrDetails : maybeDurationMs;

    const now = new Date();

    const timeStr =
      `${now
        .getHours()
        .toString()
        .padStart(2, '0')}:` +
      `${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:` +
      `${now
        .getSeconds()
        .toString()
        .padStart(2, '0')}.` +
      `${now
        .getMilliseconds()
        .toString()
        .padStart(3, '0')}`;

    const newEntry: LogEntry = {
      id:
        `log_${Date.now()}_` +
        Math.random()
          .toString(36)
          .substring(2, 5),

      timestamp: timeStr,
      type,
      message,
      details,
      durationMs,
    };

    setLogs((prev) => [
      newEntry,
      ...prev.slice(0, 100),
    ]);
  };

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  const handleLogout = () => {
    try {
      localStorage.removeItem(
        'natan_auth_session'
      );
    } catch {
      /*
       * safe
       */
    }

    setAuthSession(null);

    setSettings((prev) => ({
      ...prev,
      monitoring: false,
      autoBooking: false,
    }));

    

    setShowActivationModal(false);
    setActivationCode('');
    setActivationError('');

    try {
      void wakeLock.release();
    } catch {
      /*
       * safe
       */
    }

    setShowAuthModal(true);

    addLog(
      'info',
      isAr
        ? 'تم تسجيل الخروج من NATAN وإيقاف الرصد والحجز الآلي.'
        : 'Logged out of NATAN. Monitoring and automatic booking have been stopped.'
    );
  };

  /*
   * ============================================================
   * SETTINGS
   * ============================================================
   */

  const updateSettings = (
    partial: Partial<BookingSettings>
  ) => {
    setSettings((prev) => ({
      ...prev,
      ...partial,
    }));
  };

  /*
   * ============================================================
   * LOCATION PERSISTENCE
   * ============================================================
   */

  useEffect(() => {
    try {
      localStorage.setItem(
        'natan_selected_city',
        settings.selectedCity
      );

      localStorage.setItem(
        'natan_selected_districts',
        JSON.stringify(
          settings.selectedDistricts
        )
      );

      if (typeof settings.selectedLatitude === 'number') {
        localStorage.setItem('natan_selected_latitude', String(settings.selectedLatitude));
      }
      if (typeof settings.selectedLongitude === 'number') {
        localStorage.setItem('natan_selected_longitude', String(settings.selectedLongitude));
      }
      if (settings.selectedLocationLabel) {
        localStorage.setItem('natan_selected_location_label', settings.selectedLocationLabel);
      }
    } catch {
      /*
       * Safe.
       */
    }
  }, [
    settings.selectedCity,
    settings.selectedDistricts,
    settings.selectedLatitude,
    settings.selectedLongitude,
    settings.selectedLocationLabel,
  ]);

  /*
   * ============================================================
   * CHANGE LOCATION
   * ============================================================
   */

  const handleMapLocationChange = (location: { lat: number; lng: number }) => {
    const closestCity = getClosestSaudiCity(location.lat, location.lng);
    const districts = closestCity && closestCity.districts.length > 0 ? [...closestCity.districts] : [];

    updateSettings({
      selectedLatitude: Number(location.lat.toFixed(6)),
      selectedLongitude: Number(location.lng.toFixed(6)),
      selectedLocationLabel: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
      selectedCity: closestCity ? closestCity.id : settings.selectedCity,
      selectedDistricts: districts,
    });

    addLog(
      'success',
      isAr
        ? `📍 تم تطبيق اللوكيشن من الخريطة: (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}) — المدينة: ${closestCity?.name || ''}`
        : `📍 Map Location applied: (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}) — City: ${closestCity?.nameEn || ''}`
    );

    if (settings.vibrationAlert) {
      try {
        haptics.vibrateTick();
      } catch {
        /* safe */
      }
    }
  };

  const handleChangeLocation = (
    cityId: string
  ) => {
    const city =
      SAUDI_CITIES.find(
        (item) =>
          item.id === cityId
      );

    if (!city) {
      return;
    }

    const districts =
      city.districts.length > 0
        ? [...city.districts]
        : [];

    const coords = SAUDI_CITY_COORDINATES[city.id];

    updateSettings({
      selectedCity: city.id,
      selectedDistricts: districts,
      selectedLatitude: coords ? coords.lat : settings.selectedLatitude,
      selectedLongitude: coords ? coords.lng : settings.selectedLongitude,
      selectedLocationLabel: coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : settings.selectedLocationLabel,
    });

    addLog(
      'success',
      isAr
        ? `📍 تم تحديث اللوكيشن إلى ${city.name} (${coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : ''})`
        : `📍 Location updated to ${city.nameEn}`
    );

    /*
     * Use the same safe alert
     * pattern as the rest of the app.
     */

    if (settings.vibrationAlert) {
      try {
        haptics.vibrateTick();
      } catch {
        /*
         * safe
         */
      }
    }

    if (settings.soundAlert) {
      try {
        soundFX.playSpeedTick();
      } catch {
        /*
         * safe
         */
      }
    }
  };

  /*
   * ============================================================
   * TOGGLE LOCATION DISTRICT
   * ============================================================
   */

  const toggleLocationDistrict = (
    district: string
  ) => {
    setSettings((prev) => {
      const exists =
        prev.selectedDistricts.includes(
          district
        );

      return {
        ...prev,

        selectedDistricts:
          exists
            ? prev.selectedDistricts.filter(
                (item) =>
                  item !== district
              )
            : [
                ...prev.selectedDistricts,
                district,
              ],
      };
    });
  };

  /*
   * ============================================================
   * SELECT ALL LOCATION DISTRICTS
   * ============================================================
   */

  const selectAllLocationDistricts =
    () => {
      if (!selectedCity) {
        return;
      }

      updateSettings({
        selectedDistricts: [
          ...selectedCity.districts,
        ],
      });

      addLog(
        'info',
        isAr
          ? `📍 تم تحديد جميع فروع ${selectedCity.name}`
          : `📍 All branches selected for ${selectedCity.nameEn}`
      );
    };

  /*
   * ============================================================
   * CLEAR LOCATION DISTRICTS
   * ============================================================
   */

  const clearLocationDistricts = () => {
    updateSettings({
      selectedDistricts: [],
    });

    addLog(
      'info',
      isAr
        ? '📍 تم إلغاء تحديد فروع اللوكيشن.'
        : '📍 Location branch selection cleared.'
    );
  };

  /*
   * ============================================================
   * NINJA API → NATAN SHIFTS
   * ============================================================
   *
   * يستقبل الشفتات التي تم جلبها من Ninja API
   * ويضيفها إلى Radar داخل NATAN.
   *
   * ملاحظة:
   * هذا الجزء لا ينفذ Booking على Ninja.
   * الحجز الحقيقي ما زال منفصلاً عن جلب البيانات.
   */

  const handleNinjaShiftsUpdated = (
    ninjaShifts: Shift[]
  ) => {
    if (
      !Array.isArray(
        ninjaShifts
      )
    ) {
      return;
    }

    if (
      ninjaShifts.length === 0
    ) {
      addLog(
        'info',
        isAr
          ? '📡 تم الاتصال بمصدر Ninja API، ولم يتم العثور على شفتات في النتيجة الحالية.'
          : '📡 Ninja API responded successfully, but no shifts were returned.'
      );

      setStats((prev) => ({
        ...prev,
        totalScans:
          prev.totalScans + 1,
      }));

      return;
    }

    let newShiftsCount = 0;

    setAvailableShifts(
      (prev) => {
        const existingById =
          new Map<string, Shift>(
            prev.map(
              (shift) => [
                String(shift.id),
                shift,
              ]
            )
          );

        for (
          const shift of ninjaShifts
        ) {
          const id =
            shift?.id
              ? String(
                  shift.id
                )
              : '';

          if (!id) {
            continue;
          }

          const previous =
            existingById.get(
              id
            );

          if (!previous) {
            newShiftsCount += 1;
          }

          existingById.set(
            id,
            {
              ...(previous || {}),
              ...shift,
              id,
              detectedAt:
                previous?.detectedAt ??
                Date.now(),
            } as Shift
          );
        }

        return Array.from(
          existingById.values()
        );
      }
    );

    setStats((prev) => ({
      ...prev,
      totalScans:
        prev.totalScans + 1,
      shiftsDetected:
        prev.shiftsDetected +
        newShiftsCount,
    }));

    addLog(
      'success',
      isAr
        ? `📡 تم جلب ${ninjaShifts.length} شفت من Ninja API. الشفتات الجديدة: ${newShiftsCount}`
        : `📡 ${ninjaShifts.length} shifts fetched from Ninja API. New shifts: ${newShiftsCount}`
    );
  };

  /*
   * ============================================================
   * PRODUCTION SHIFT SOURCE
   * ============================================================
   */

  const bookShiftManually = (shift: Shift) => {
    void executeBooking(shift);
  };

  /* Production: only verified Ninja shifts are accepted. */
  const triggerInstantDrop = () => {
    addLog(
      'warning',
      isAr
        ? '🚫 المحاكاة معطلة في نسخة Production. NATAN يستخدم شفتات Ninja الحقيقية فقط.'
        : '🚫 Simulation is disabled in Production. NATAN uses real Ninja shifts only.'
    );
  };

  /*
   * ============================================================
   * PROTECTED BOOKING
   * ============================================================
   */

  const executeBooking = async (
    shift: Shift,
    customLatency?: number
  ) => {
    if (!isLicensed) {
      openActivationModal();

      addLog(
        'error',
        isAr
          ? '🔒 هذه الميزة تتطلب تفعيل الحساب. يرجى إدخال كود التفعيل.'
          : '🔒 This feature requires an activated account. Please enter the activation code.'
      );

      return;
    }

    const conflict =
      findConflictingShift(
        shift,
        capturedShifts
      );

    if (conflict) {
      addLog(
        'warning',
        isAr
          ? `⚠️ تم إلغاء الحجز: تعارض في الوقت مع الشفت المحجوز سابقاً [${conflict.district}] (${conflict.startTime} - ${conflict.endTime})`
          : `⚠️ Booking cancelled: time conflict with previously booked shift [${conflict.district}] (${conflict.startTime} - ${conflict.endTime})`
      );

      haptics.vibrateAlert();

      return;
    }

    // Direct API mode: use only a legitimate Ninja session already
    // stored by the integration. No token, installation UID, HMAC,
    // or integrity value is fabricated by NATAN.
    if (settings.bookingMode === 'direct_api') {
      const shiftKey = String(shift.id);
      if (directApiBookingInFlight.has(shiftKey)) {
        return;
      }
      directApiBookingInFlight.add(shiftKey);

      const requestStartedAt = performance.now();
      try {
        addLog(
          'info',
          isAr
            ? `⚡ محاولة الحجز المباشر للشفت ${shift.id}...`
            : `⚡ Direct API booking attempt for shift ${shift.id}...`,
        );

        const result = await bookNinjaShift(String(shift.id));
        const latency = Math.round(performance.now() - requestStartedAt);

        addLog(
          'success',
          isAr
            ? `✅ تم قبول طلب الحجز المباشر للشفت ${shift.id}`
            : `✅ Direct API booking accepted for shift ${shift.id}`,
          typeof result === 'string' ? result : JSON.stringify(result),
          latency,
        );

        haptics.vibrateAlert();
        setCapturedShifts((prev) => {
          if (prev.some((item) => item.id === shift.id)) return prev;
          return [...prev, { ...shift, status: 'booked', bookedAt: Date.now(), responseTimeMs: latency }];
        });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addLog(
          'error',
          isAr
            ? `❌ فشل الحجز المباشر للشفت ${shift.id}: ${message}`
            : `❌ Direct API booking failed for shift ${shift.id}: ${message}`,
        );
        // Do not fall back automatically to UI booking here. A failed
        // direct request must not unexpectedly trigger a second booking path.
        return;
      } finally {
        directApiBookingInFlight.delete(shiftKey);
      }
    }

    const requestStartedAt = performance.now();

    try {
      /*
       * Production booking path: use the real Ninja application
       * through Android Accessibility. NATAN never marks a shift
       * as booked until the Ninja UI reports an explicit success.
       */
      const { startNinjaUiBooking, NatanAutomation, isNatanNativeAndroid } =
        await import('./utils/natanAutomation');

      if (!isNatanNativeAndroid()) {
        throw new Error(
          isAr
            ? 'الحجز الحقيقي عبر تطبيق Ninja متاح من نسخة Android فقط.'
            : 'Real Ninja UI booking is available from the Android app only.'
        );
      }

      const started = await startNinjaUiBooking(shift);

      if (started.status === 'accessibility_required') {
        addLog(
          'warning',
          isAr
            ? '⚙️ فعّل خدمة إمكانية الوصول الخاصة بـ NATAN ثم أعد الحجز.'
            : '⚙️ Enable NATAN Accessibility Service, then retry booking.'
        );
        await NatanAutomation.openAccessibilitySettings();
        return;
      }

      if (started.status === 'ninja_not_installed') {
        throw new Error(
          isAr
            ? 'تطبيق Ninja غير مثبت على الهاتف.'
            : 'Ninja is not installed on this phone.'
        );
      }

      addLog(
        'info',
        isAr
          ? '🤖 بدأ NATAN تنفيذ الحجز داخل تطبيق Ninja الحقيقي...'
          : '🤖 NATAN started the real booking flow inside Ninja...',
      );

      const deadline = Date.now() + 45000;
      let finalStatus = started;

      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        finalStatus = await NatanAutomation.getAutomationStatus();

        if (finalStatus.status === 'success') break;
        if (
          finalStatus.status === 'failed' ||
          finalStatus.status === 'timeout' ||
          finalStatus.status === 'stopped'
        ) break;
      }

      if (finalStatus.status !== 'success') {
        throw new Error(
          finalStatus.detail ||
            (isAr ? 'لم يؤكد تطبيق Ninja نجاح الحجز.' : 'Ninja did not confirm booking success.')
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(
        'error',
        isAr
          ? `❌ لم يتم تأكيد الحجز من Ninja: ${message}`
          : `❌ Ninja did not confirm the booking: ${message}`,
      );
      return;
    }

    const latency = Math.max(1, Math.round(performance.now() - requestStartedAt));

    const updatedShift: Shift = {
      ...shift,
      status: 'booked',
      bookedAt: Date.now(),
      responseTimeMs: latency,
    };

    setAvailableShifts(
      (prev) =>
        prev.filter(
          (s) =>
            s.id !==
            shift.id
        )
    );

    setCapturedShifts(
      (prev) => [
        updatedShift,
        ...prev,
      ]
    );

    setStats((prev) => {
      const newCaptured =
        prev.shiftsCaptured +
        1;

      const newAvg =
        Math.round(
          prev.avgResponseTimeMs ===
            0
            ? latency
            : (
                prev.avgResponseTimeMs +
                latency
              ) / 2
        );

      const fastest =
        prev.fastestResponseTimeMs ===
          0
          ? latency
          : Math.min(
              prev.fastestResponseTimeMs,
              latency
            );

      return {
        ...prev,

        shiftsCaptured:
          newCaptured,

        avgResponseTimeMs:
          newAvg,

        fastestResponseTimeMs:
          fastest,
      };
    });

    addLog(
      'success',
      isAr
        ? `🎉 تم تثبيت وحجز الشفت بنجاح: [${
            shift.city
          } - ${
            shift.district
          }] | ${
            shift.totalPay
          } ر.س (${
            shift.startTime
          }-${
            shift.endTime
          })`
        : `🎉 Shift booked successfully: [${
            shift.city
          } - ${
            shift.district
          }] | ${
            shift.totalPay
          } SAR (${
            shift.startTime
          }-${
            shift.endTime
          })`,
      latency
    );

    if (
      settings.vibrationAlert
    ) {
      haptics.vibrateCapture();
    }

    if (
      settings.soundAlert
    ) {
      soundFX.playSuccess();
    }

    setWhatsappBanner({
      show: true,

      title:
        isAr
          ? '🎯 NATAN • تم حجز شفت نينجا الآن!'
          : '🎯 NATAN • Ninja shift booked!',

      body:
        isAr
          ? `${
              shift.district
            } (${
              shift.shiftCode ||
              'DMM'
            }) • الأجر: ${
              shift.totalPay
            } ر.س • ${
              shift.startTime
            } إلى ${
              shift.endTime
            }`
          : `${
              shift.district
            } (${
              shift.shiftCode ||
              'DMM'
            }) • Pay: ${
              shift.totalPay
            } SAR • ${
              shift.startTime
            } to ${
              shift.endTime
            }`,

      time:
        isAr
          ? 'الآن'
          : 'Now',

      shiftCode:
        shift.shiftCode ||
        'DMM-001',
    });

    setTimeout(() => {
      setWhatsappBanner(
        (cur) =>
          cur
            ? {
                ...cur,
                show: false,
              }
            : null
      );
    }, 5500);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          y: 0.6,
        },
      });
    } catch {
      /*
       * safe
       */
    }
  };

  /*
   * ============================================================
   * NATIVE NINJA AUTO BOOKER
   * ============================================================
   * This path does not copy Ninja credentials or call protected
   * Ninja APIs. It uses the user's normal Ninja session and the
   * Android Accessibility service to inspect and operate the UI.
   */
  useEffect(() => {
    if (!isLicensed || !settings.monitoring || !settings.autoBooking) return;
    if (settings.bookingMode === 'direct_api') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      try {
        const { startNinjaAutoBooking, NatanAutomation, isNatanNativeAndroid } =
          await import('./utils/natanAutomation');
        if (!isNatanNativeAndroid() || cancelled) return;

        const city = SAUDI_CITIES.find((c) => c.id === settings.selectedCity);
        const criteria = {
          cityLabel: city ? `${city.name}|${city.nameEn}` : '',
          districts: settings.selectedDistricts.join('|'),
          branchNumbers: (settings.branchKeywordNumbers || []).join('|'),
          days: settings.selectedDays.join('|'),
          startTime: settings.startTime || '00:00',
          endTime: settings.endTime || '23:59',
          minDurationHours: settings.minDurationHours,
          maxDurationHours: settings.maxDurationHours,
          onlyPeakHours: settings.onlyPeakHours,
          autoConfirmDialog: settings.autoConfirmDialog,
        };

        const status = await NatanAutomation.getAutomationStatus();
        if (!status.running) {
          const started = await startNinjaAutoBooking(criteria);
          if (started.status === 'accessibility_required') {
            addLog('warning', isAr ? '⚙️ فعّل خدمة إمكانية الوصول في NATAN لتشغيل الحجز الآلي.' : '⚙️ Enable NATAN Accessibility Service to start auto booking.');
            return;
          }
          if (started.status === 'ninja_not_installed') {
            addLog('error', isAr ? '❌ تطبيق Ninja غير مثبت.' : '❌ Ninja is not installed.');
            return;
          }
          addLog('info', isAr ? '🤖 Auto Booker يعمل داخل Ninja وفق الشروط المحددة.' : '🤖 Auto Booker is running inside Ninja using the configured criteria.');
        }
      } catch (e) {
        if (!cancelled) addLog('error', `Auto Booker: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    void run();
    timer = setInterval(() => { void run(); }, Math.max(3000, settings.refreshIntervalSec * 1000));

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [isLicensed, settings.monitoring, settings.autoBooking, settings.bookingMode, settings.selectedCity, settings.selectedDistricts, settings.branchKeywordNumbers, settings.selectedDays, settings.startTime, settings.endTime, settings.minDurationHours, settings.maxDurationHours, settings.onlyPeakHours, settings.autoConfirmDialog, settings.refreshIntervalSec, isAr]);

  /*
   * ============================================================
   * AUTOMATIC MONITORING
   * ============================================================
   */

  useEffect(() => {
    if (
      !isLicensed ||
      !settings.monitoring ||
      !settings.autoBooking
    ) {
      return;
    }

    if (
      availableShifts.length ===
      0
    ) {
      return;
    }

    const selectedCityObj =
      SAUDI_CITIES.find(
        (city) =>
          city.id ===
          settings.selectedCity
      );

    const match =
      availableShifts.find(
        (s) => {
          /*
           * ----------------------------------------------------
           * CITY / LOCATION FILTER
           * ----------------------------------------------------
           */

          if (
            selectedCityObj &&
            s.city
          ) {
            const shiftCity =
              String(
                s.city
              )
                .trim()
                .toLowerCase();

            const cityArabic =
              String(
                selectedCityObj.name ||
                  ''
              )
                .trim()
                .toLowerCase();

            const cityEnglish =
              String(
                selectedCityObj.nameEn ||
                  ''
              )
                .trim()
                .toLowerCase();

            const matchesCity =
              shiftCity ===
                cityArabic ||
              shiftCity ===
                cityEnglish ||
              shiftCity.includes(
                cityArabic
              ) ||
              shiftCity.includes(
                cityEnglish
              ) ||
              cityArabic.includes(
                shiftCity
              ) ||
              cityEnglish.includes(
                shiftCity
              );

            if (!matchesCity) {
              return false;
            }
          }

          /*
           * ----------------------------------------------------
           * BRANCH FILTER
           * ----------------------------------------------------
           */

          const hasHashtags =
            !!(
              settings.branchKeywordNumbers &&
              settings
                .branchKeywordNumbers
                .length > 0
            );

          const matchesHashtag =
            hasHashtags
              ? settings
                  .branchKeywordNumbers!
                  .some(
                    (tag) =>
                      s.district.includes(
                        tag
                      ) ||
                      (
                        s.storeNumber &&
                        s.storeNumber.includes(
                          tag
                        )
                      )
                  )
              : false;

          const matchesDistrict =
            settings.selectedDistricts
              .length > 0
              ? settings.selectedDistricts.some(
                  (d) =>
                    s.district.includes(
                      d
                    ) ||
                    d.includes(
                      s.district
                    )
                )
              : true;

          if (
            hasHashtags &&
            !matchesHashtag &&
            !matchesDistrict
          ) {
            return false;
          }

          if (
            !hasHashtags &&
            !matchesDistrict
          ) {
            return false;
          }

          /*
           * ----------------------------------------------------
           * DAY FILTER
           * ----------------------------------------------------
           *
           * Remove "(اليوم)" when
           * comparing generated shifts.
           */

          if (
            settings.selectedDays
              .length > 0
          ) {
            const cleanDay =
              String(
                s.dayName || ''
              ).replace(
                /\s*\(.*?\)\s*/g,
                ''
              );

            if (
              !settings.selectedDays.includes(
                cleanDay
              )
            ) {
              return false;
            }
          }

          /*
           * ----------------------------------------------------
           * DURATION FILTER
           * ----------------------------------------------------
           */

          if (
            s.durationHours <
              settings.minDurationHours ||
            s.durationHours >
              settings.maxDurationHours
          ) {
            return false;
          }

          /*
           * ----------------------------------------------------
           * PEAK FILTER
           * ----------------------------------------------------
           */

          if (
            settings.onlyPeakHours &&
            !s.isPeak
          ) {
            return false;
          }

          /*
           * ----------------------------------------------------
           * TIME CONFLICT
           * ----------------------------------------------------
           */

          const conflict =
            findConflictingShift(
              s,
              capturedShifts
            );

          if (conflict) {
            return false;
          }

          return true;
        }
      );

    if (!match) {
      return;
    }

    const timer =
      setTimeout(
        () => {
          executeBooking(
            match
          );
        },
        Math.max(
          20,
          settings.scanIntervalMs /
            2
        )
      );

    return () =>
      clearTimeout(timer);

  }, [
    availableShifts,
    settings,
    isLicensed,
    capturedShifts,
  ]);

  /*
   * ============================================================
   * VOLUME KEYS
   * ============================================================
   */

  useEffect(() => {
    if (
      !settings.volumeKeysControl
    ) {
      return;
    }

    const handleKeyDown =
      (
        e: KeyboardEvent
      ) => {
        if (
          e.key ===
            'AudioVolumeUp' ||
          (
            e.altKey &&
            e.key ===
              'ArrowUp'
          )
        ) {
          e.preventDefault();

          setIsCodeModalOpen(
            true
          );

          addLog(
            'info',
            isAr
              ? '🎧 [مفتاح رفع الصوت]: تم فتح لوحة الأكواد والتعليمات'
              : '🎧 [Volume Up]: Code and instructions panel opened.'
          );

        } else if (
          e.key ===
            'AudioVolumeDown' ||
          (
            e.altKey &&
            e.key ===
              'ArrowDown'
          )
        ) {
          e.preventDefault();

          setSettings((prev) => {
            const next =
              !prev.autoRefresh;

            addLog(
              'info',
              isAr
                ? `🎧 [مفتاح خفض الصوت]: تم ${
                    next
                      ? 'تفعيل'
                      : 'إيقاف'
                  } السحب التلقائي (Auto-Refresh)`
                : `🎧 [Volume Down]: Auto-refresh ${
                    next
                      ? 'enabled'
                      : 'disabled'
                  }.`
            );

            return {
              ...prev,
              autoRefresh:
                next,
            };
          });
        }
      };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

  }, [
    settings.volumeKeysControl,
    isAr,
  ]);

  /*
   * ============================================================
   * WAKE LOCK
   * ============================================================
   */

  useEffect(() => {
    if (
      settings.monitoring &&
      settings.wakeLockEnabled &&
      isAuthenticated
    ) {
      wakeLock
        .request()
        .then(
          (
            success
          ) => {
            if (success) {
              addLog(
                'info',
                isAr
                  ? '💡 [WakeLock نشط] تم منع شاشة الهاتف من القفل التلقائي لضمان استمرار صيد الشفتات.'
                  : '💡 [WakeLock active] Automatic screen locking is prevented while monitoring.'
              );
            }
          }
        )
        .catch(
          () => {}
        );
    } else {
      wakeLock
        .release()
        .catch(
          () => {}
        );
    }

    return () => {
      wakeLock
        .release()
        .catch(
          () => {}
        );
    };

  }, [
    settings.monitoring,
    settings.wakeLockEnabled,
    isAuthenticated,
    isAr,
  ]);

  /*
   * ============================================================
   * SCREEN SECURITY
   * ============================================================
   */

  useEffect(() => {
    if (
      !settings.secureScreenMode
    ) {
      return;
    }

    const handleKeyDown =
      (
        e: KeyboardEvent
      ) => {
        if (
          e.key ===
            'PrintScreen' ||
          (
            (e.ctrlKey ||
              e.metaKey) &&
            (
              e.key.toLowerCase() ===
                'p' ||
              e.key.toLowerCase() ===
                's'
            )
          )
        ) {
          e.preventDefault();

          addLog(
            'warning',
            isAr
              ? '🛡️ [حماية الشاشة] تم حظر محاولة التقاط الشاشة لحماية سرية حسابك والشفتات.'
              : '🛡️ [Screen Security] A screenshot attempt was blocked to protect your account and shifts.'
          );

          if (
            settings.soundAlert
          ) {
            soundFX.playSpeedTick();
          }
        }
      };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

  }, [
    settings.secureScreenMode,
    settings.soundAlert,
    isAr,
  ]);

  /*
   * ============================================================
   * PRODUCTION: NO SIMULATED SHIFTS
   * ============================================================
   */

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div
      dir={
        isAr
          ? 'rtl'
          : 'ltr'
      }
      lang={
        isAr
          ? 'ar'
          : 'en'
      }
      className="
        min-h-screen
        bg-[#090a18]
        text-slate-100
        flex
        flex-col
        font-sans
        selection:bg-purple-600
        selection:text-white
        relative
        overflow-x-hidden
      "
    >

      {/* Ambient Glow */}

      <div
        className="
          absolute
          top-0
          left-1/2
          -translate-x-1/2
          w-[680px]
          h-[280px]
          bg-purple-600/10
          blur-[120px]
          pointer-events-none
          rounded-full
        "
      />

      {/* ======================================================
          WHATSAPP BANNER
          ====================================================== */}

      {whatsappBanner &&
        whatsappBanner.show && (
          <div
            className="
              fixed
              top-3
              left-0
              right-0
              z-50
              flex
              justify-center
              px-3
              pointer-events-none
              animate-in
              slide-in-from-top-4
              duration-300
            "
          >
            <div
              className="
                w-full
                max-w-md
                bg-slate-900/95
                text-white
                rounded-2xl
                p-3.5
                shadow-2xl
                border
                border-purple-500/40
                backdrop-blur-md
                pointer-events-auto
                flex
                items-start
                gap-3
                ring-2
                ring-purple-500/20
              "
            >
              <NatanLogo
                size="sm"
                withGlow={true}
              />

              <div
                className="
                  flex-1
                  min-w-0
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-1
                  "
                >
                  <span
                    className="
                      text-xs
                      font-black
                      text-purple-300
                      truncate
                    "
                  >
                    {
                      whatsappBanner.title
                    }
                  </span>

                  <span
                    className="
                      text-[10px]
                      text-slate-400
                      shrink-0
                      font-mono
                    "
                  >
                    {
                      whatsappBanner.time
                    }
                  </span>
                </div>

                <p
                  className="
                    text-xs
                    text-slate-200
                    font-bold
                    mt-0.5
                    leading-snug
                  "
                >
                  {
                    whatsappBanner.body
                  }
                </p>

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    mt-1.5
                    text-[10px]
                    text-slate-400
                  "
                >
                  <span
                    className="
                      px-1.5
                      py-0.5
                      rounded
                      bg-purple-500/20
                      text-purple-300
                      font-mono
                      font-bold
                    "
                  >
                    ⚡{' '}
                    {isAr
                      ? 'حجز فوري في الخلفية'
                      : 'Instant background booking'}
                  </span>

                  <span>
                    {isAr
                      ? 'اضغط للإغلاق'
                      : 'Tap to close'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setWhatsappBanner(
                    null
                  )
                }
                className="
                  text-slate-400
                  hover:text-white
                  p-1
                  rounded-lg
                  hover:bg-slate-800
                  transition-colors
                  cursor-pointer
                "
              >
                ✕
              </button>
            </div>
          </div>
        )}

      {/* ======================================================
          NAVBAR
          ====================================================== */}

      <Navbar
        settings={settings}
        onUpdateSettings={
          updateSettings
        }
        onOpenCodeModal={() =>
          setIsCodeModalOpen(
            true
          )
        }
        onOpenAiAdvisor={() =>
          setIsAiAdvisorOpen(
            true
          )
        }
        onOpenWhatsApp={() =>
          setIsWhatsAppModalOpen(
            true
          )
        }
        onTriggerTestDrop={
          triggerInstantDrop
        }
        totalCaptured={
          capturedShifts.length
        }
        authSession={
          authSession
        }
        onOpenLicense={() => {
          if (!authSession || !authSession.isAuthenticated) {
            setShowAuthModal(true);
          } else if (!isLicensed) {
            openActivationModal();
          }
        }}
        onLogout={
          handleLogout
        }
      />

      {/* ======================================================
          MAIN
          ====================================================== */}

      <main
        className="
          flex-1
          max-w-7xl
          w-full
          mx-auto
          px-3
          sm:px-4
          lg:px-8
          py-3
          sm:py-6
          space-y-4
          sm:space-y-6
          relative
          z-10
          pb-24
          md:pb-8
        "
      >

        {/* ====================================================
            QUICK VIEW TABS
            ==================================================== */}

        <div
          className="
            flex
            flex-col
            sm:flex-row
            items-stretch
            sm:items-center
            justify-between
            gap-2.5
            sm:gap-3
            pb-2.5
            sm:pb-3
            border-b
            border-slate-800/80
          "
        >

          {/* Main 5 Navigation Tabs - Responsive Grid on Mobile, Flex Row on Desktop */}
          <div
            className="
              grid
              grid-cols-5
              gap-1.5
              sm:flex
              sm:items-center
              sm:gap-2
              w-full
              sm:w-auto
              p-1.5
              sm:p-0
              bg-slate-950/80
              sm:bg-transparent
              rounded-2xl
              sm:rounded-none
              border
              sm:border-0
              border-slate-800/80
            "
          >
            {/* 1. Radar */}
            <button
              type="button"
              onClick={() => setActiveView('radar')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2 sm:py-2.5 rounded-xl min-h-[46px] text-[10px] sm:text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeView === 'radar'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/40'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800'
              }`}
            >
              <Radio className="w-4 h-4 text-purple-300 shrink-0" />
              <span className="hidden sm:inline truncate">{t.tabRadar}</span>
              <span className="sm:hidden leading-tight font-black">{isAr ? 'الرادار' : 'Radar'}</span>
            </button>

            {/* 2. Criteria */}
            <button
              type="button"
              onClick={() => setActiveView('criteria')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2 sm:py-2.5 rounded-xl min-h-[46px] text-[10px] sm:text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeView === 'criteria'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/40'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-purple-300 shrink-0" />
              <span className="hidden sm:inline truncate">{t.tabCriteria}</span>
              <span className="sm:hidden leading-tight font-black">{isAr ? 'الشروط' : 'Filters'}</span>
            </button>

            {/* 3. LOCATION MAP */}
            <button
              type="button"
              onClick={() => setActiveView('location')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2 sm:py-2.5 rounded-xl min-h-[46px] text-[10px] sm:text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeView === 'location'
                  ? 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/40'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline truncate">{isAr ? 'خريطة اللوكيشن' : 'Location Map'}</span>
              <span className="sm:hidden leading-tight font-black">{isAr ? 'الخريطة' : 'Map'}</span>
            </button>

            {/* 4. Engine */}
            <button
              type="button"
              onClick={() => setActiveView('engine')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2 sm:py-2.5 rounded-xl min-h-[46px] text-[10px] sm:text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeView === 'engine'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/40'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="hidden sm:inline truncate">{t.tabEngine} ({settings.scanIntervalMs}ms)</span>
              <span className="sm:hidden leading-tight font-black">{isAr ? 'السرعة' : 'Speed'}</span>
            </button>

            {/* 5. API Bot */}
            <button
              type="button"
              onClick={() => setActiveView('api_bot')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2 sm:py-2.5 rounded-xl min-h-[46px] text-[10px] sm:text-xs font-black transition-all cursor-pointer relative active:scale-95 ${
                activeView === 'api_bot'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30 border border-purple-400/50'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-purple-500/30 ring-1 ring-purple-500/20'
              }`}
            >
              <div className="relative shrink-0">
                <Server className="w-4 h-4 text-purple-400" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <span className="hidden sm:inline truncate">{t.tabApiBot}</span>
              <span className="sm:hidden leading-tight font-black text-purple-200">API Bot</span>
              <span className="hidden sm:inline-block text-[10px] bg-purple-500/30 text-purple-200 px-1.5 py-0.2 rounded-full border border-purple-400/40 font-mono font-bold">
                {t.directApiBadge}
              </span>
            </button>
          </div>

          {/* Engine status */}

          <div
            className="
              flex
              items-center
              justify-between
              sm:justify-end
              gap-2
              sm:gap-3
              text-xs
              bg-slate-900/80
              px-3
              py-2
              rounded-xl
              border
              border-slate-800
              shrink-0
              w-full
              sm:w-auto
              overflow-x-auto
              scrollbar-none
            "
          >

            {/* License */}

            <button
              type="button"
              onClick={() => {
                if (!authSession || !authSession.isAuthenticated) {
                  setShowAuthModal(true);
                } else if (!isLicensed) {
                  openActivationModal();
                }
              }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ${
                isLicensed
                  ? 'bg-purple-950/40 text-purple-300 border-purple-500/30'
                  : 'bg-rose-950/50 text-rose-300 border-rose-500/40 animate-pulse'
              }`}
              title={
                isLicensed
                  ? (
                      isAr
                        ? 'الترخيص نشط'
                        : 'License active'
                    )
                  : (
                      isAr
                        ? 'البرنامج غير مفعّل - انقر للتفعيل'
                        : 'Program is not activated - click to activate'
                    )
              }
            >
              {isLicensed ? (
                <>
                  <ShieldCheck
                    className="
                      w-3
                      h-3
                      text-emerald-400
                    "
                  />

                  <span>
                    {
                      t.licensedAndEncrypted
                    }
                  </span>
                </>
              ) : (
                <>
                  <Lock
                    className="
                      w-3
                      h-3
                      text-rose-400
                    "
                  />

                  <span>
                    {
                      t.unlicensedLocked
                    }
                  </span>
                </>
              )}
            </button>

            <div
              className="
                h-3
                w-px
                bg-slate-800
              "
            />

            {/* Auto booking */}

            <div
              className="
                flex
                items-center
                gap-1.5
              "
            >
              <span
                className="
                  text-slate-400
                  font-medium
                  text-[11px]
                  sm:text-xs
                "
              >
                {
                  t.autoBookingLabel
                }
              </span>

              <span
                className={`px-2 py-0.5 rounded-full font-black text-[10px] sm:text-[11px] ${
                  settings.autoBooking
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {
                  settings.autoBooking
                    ? t.autoBookingActive
                    : t.autoBookingManual
                }
              </span>
            </div>

            <div
              className="
                h-3
                w-px
                bg-slate-800
              "
            />

            {/* Monitoring */}

            <span
              className="
                flex
                items-center
                gap-1.5
                text-slate-300
                font-medium
                text-[11px]
                sm:text-xs
              "
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.monitoring
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-slate-600'
                }`}
              />

              {
                settings.monitoring
                  ? t.screenWatching
                  : t.monitoringStopped
              }
            </span>
          </div>
        </div>

        {/* ====================================================
            RADAR
            ==================================================== */}

        {activeView ===
          'radar' && (
          <div
            className="
              grid
              grid-cols-1
              lg:grid-cols-12
              gap-6
            "
          >
            <div
              className="
                lg:col-span-7
                space-y-4
                sm:space-y-6
              "
            >
              <SimulatorRadar
                settings={settings}
                availableShifts={availableShifts}
                capturedShifts={capturedShifts}
                stats={stats}
                onTriggerInstantDrop={triggerInstantDrop}
                onBookShiftManually={bookShiftManually}
                onDeleteShift={(shiftId) =>
                  setAvailableShifts((prev) =>
                    prev.filter((s) => s.id !== shiftId)
                  )
                }
                isAutoSimulating={false}
                onToggleAutoSimulating={() => {}}
                onNavigateToApiBot={() => setActiveView('api_bot')}
              />
            </div>

            <div
              className="
                lg:col-span-5
                space-y-6
              "
            >
              <SpeedEngineConfig
                settings={settings}
                onUpdateSettings={
                  updateSettings
                }
              />

              <LogViewer
                logs={logs}
                onClearLogs={() =>
                  setLogs([])
                }
              />
            </div>
          </div>
        )}

        {/* ====================================================
            CRITERIA
            ==================================================== */}

        {activeView ===
          'criteria' && (
          <div
            className="
              grid
              grid-cols-1
              lg:grid-cols-12
              gap-6
            "
          >
            <div
              className="
                lg:col-span-8
              "
            >
              <CriteriaEditor
                settings={settings}
                onUpdateSettings={
                  updateSettings
                }
              />
            </div>

            <div
              className="
                lg:col-span-4
                space-y-6
              "
            >
              <div
                className="
                  bg-slate-900/80
                  border
                  border-slate-800
                  rounded-2xl
                  p-5
                  space-y-4
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2.5
                    text-amber-400
                    font-bold
                    text-sm
                  "
                >
                  <Flame
                    className="
                      w-5
                      h-5
                    "
                  />

                  <span>
                    {isAr
                      ? 'تأثير الفلاتر على سرعة مسك الشفت'
                      : 'How filters affect shift capture speed'}
                  </span>
                </div>

                <p
                  className="
                    text-xs
                    text-slate-300
                    leading-relaxed
                  "
                >
                  {isAr ? (
                    <>
                      تحديد عدد قليل جداً من
                      الفروع قد يقلل فرصك.
                      للحصول على عدد أكبر من
                      الشفتات، حدد على الأقل{' '}
                      <strong>
                        3 إلى 5 مستودعات
                      </strong>{' '}
                      قريبة منك. بمجرد حجز شفت
                      في وقت محدد، يقوم النظام
                      تلقائياً باستبعاد الشفتات
                      الأخرى المتداخلة.
                    </>
                  ) : (
                    <>
                      Selecting too few branches
                      may reduce available
                      opportunities. For more
                      shifts, consider selecting{' '}
                      <strong>
                        3 to 5 nearby branches
                      </strong>
                      . Once a shift is booked,
                      overlapping shifts are
                      automatically excluded.
                    </>
                  )}
                </p>

                <div
                  className="
                    pt-2
                    border-t
                    border-slate-800
                    flex
                    items-center
                    justify-between
                    text-xs
                  "
                >
                  <span
                    className="
                      text-slate-400
                    "
                  >
                    {isAr
                      ? 'الفروع المختارة:'
                      : 'Selected branches:'}
                  </span>

                  <span
                    className="
                      font-bold
                      text-sky-400
                    "
                  >
                    {
                      settings
                        .selectedDistricts
                        .length ===
                      0
                        ? (
                            isAr
                              ? 'الكل متاح'
                              : 'All available'
                          )
                        : isAr
                          ? `${settings.selectedDistricts.length} فرع`
                          : `${settings.selectedDistricts.length} branches`
                    }
                  </span>
                </div>
              </div>

              <LogViewer
                logs={logs}
                onClearLogs={() =>
                  setLogs([])
                }
              />
            </div>
          </div>
        )}

        {/* ====================================================
            LOCATION
            ==================================================== */}

        {activeView ===
          'location' && (
          <div
            className="
              grid
              grid-cols-1
              lg:grid-cols-12
              gap-5
              sm:gap-6
            "
          >
            {/* =================================================
                PROFESSIONAL MAP LOCATION PICKER
                ================================================= */}

            <div className="lg:col-span-8">
              <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-4 sm:p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2.5 sm:p-3 shrink-0">
                      <MapPinned className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-300" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        {isAr ? 'خريطة اللوكيشن' : 'Location Map'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {isAr
                          ? 'حدد نقطة على الخريطة أو استخدم موقع الهاتف الحالي. يمكنك تطبيق النقطة على Android عبر Mock Location الرسمي ليستخدمها NATAN والتطبيقات الأخرى التي تقبل المواقع الوهمية.'
                          : "Choose a point on the map or use the phone location. You can publish it through Android's official Mock Location mechanism for apps that accept mock locations."}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[10px] font-bold text-emerald-300 flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)] animate-pulse" />
                    {isAr ? 'تحديد يدوي + GPS' : 'Manual + GPS selection'}
                  </div>
                </div>

                <LocationMapPicker
                  value={
                    typeof settings.selectedLatitude === 'number' && typeof settings.selectedLongitude === 'number'
                      ? { lat: settings.selectedLatitude, lng: settings.selectedLongitude }
                      : null
                  }
                  onChange={handleMapLocationChange}
                  isAr={isAr}
                />
              </div>
            </div>

            {/* =================================================
                CURRENT LOCATION / BRANCHES
                ================================================= */}

            <div
              className="
                lg:col-span-4
              "
            >
              <div
                className="
                  rounded-2xl
                  border
                  border-cyan-500/20
                  bg-slate-900/70
                  p-5
                  sm:p-6
                  space-y-5
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      rounded-xl
                      bg-cyan-500/10
                      p-2.5
                    "
                  >
                    <MapPin
                      size={22}
                      className="
                        text-cyan-400
                      "
                    />
                  </div>

                  <div>
                    <h3
                      className="
                        font-bold
                        text-white
                      "
                    >
                      {isAr
                        ? 'اللوكيشن الحالي'
                        : 'Current Location'}
                    </h3>

                    <p
                      className="
                        text-[11px]
                        text-slate-500
                        mt-0.5
                      "
                    >
                      {isAr
                        ? 'إعداد البحث الحالي'
                        : 'Current search configuration'}
                    </p>
                  </div>
                </div>

                {selectedCity ? (
                  <>
                    {/* Selected city */}

                    <div
                      className="
                        rounded-2xl
                        bg-slate-800
                        border
                        border-slate-700
                        p-4
                      "
                    >
                      <div
                        className="
                          flex
                          items-center
                          justify-between
                          gap-3
                        "
                      >
                        <div>
                          <div
                            className="
                              text-xl
                              font-black
                              text-cyan-400
                            "
                          >
                            {isAr
                              ? selectedCity.name
                              : selectedCity.nameEn}
                          </div>

                          <div
                            className="
                              text-sm
                              text-slate-400
                              mt-1
                            "
                          >
                            {
                              selectedCity.region
                            }
                          </div>

                          <div className="mt-2 text-xs font-mono font-black text-cyan-300 flex items-center gap-1.5">
                            <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>
                              {typeof settings.selectedLatitude === 'number' && typeof settings.selectedLongitude === 'number'
                                ? `${settings.selectedLatitude.toFixed(6)}, ${settings.selectedLongitude.toFixed(6)}`
                                : (isAr ? 'اضغط على الخريطة لتحديد الإحداثيات' : 'Tap map to set coordinates')}
                            </span>
                          </div>
                        </div>

                        <div
                          className="
                            rounded-xl
                            bg-cyan-500/10
                            border
                            border-cyan-500/20
                            p-3
                          "
                        >
                          <MapPinned
                            className="
                              w-6
                              h-6
                              text-cyan-400
                            "
                          />
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">{isAr ? 'محاكاة الموقع الرسمي:' : 'Official Mock Location:'}</span>
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          {isAr ? 'مدعوم على Android' : 'Supported on Android'}
                        </span>
                      </div>
                    </div>

                    {/* Branch selection header */}

                    <div>
                      <div
                        className="
                          flex
                          items-center
                          justify-between
                          gap-3
                          mb-3
                        "
                      >
                        <div>
                          <div
                            className="
                              text-sm
                              font-bold
                              text-white
                            "
                          >
                            {isAr
                              ? 'الفروع التي سيتم مراقبتها'
                              : 'Branches to monitor'}
                          </div>

                          <div
                            className="
                              text-[11px]
                              text-slate-500
                              mt-1
                            "
                          >
                            {settings
                              .selectedDistricts
                              .length}{' '}
                            {isAr
                              ? 'محدد'
                              : 'selected'}
                          </div>
                        </div>

                        <div
                          className="
                            flex
                            gap-2
                          "
                        >
                          <button
                            type="button"
                            onClick={
                              selectAllLocationDistricts
                            }
                            disabled={
                              selectedCity
                                .districts
                                .length ===
                              0
                            }
                            className="
                              rounded-lg
                              border
                              border-cyan-500/20
                              bg-cyan-500/5
                              px-2.5
                              py-1.5
                              text-[10px]
                              font-bold
                              text-cyan-300
                              hover:bg-cyan-500/10
                              disabled:opacity-40
                              disabled:cursor-not-allowed
                            "
                          >
                            {isAr
                              ? 'الكل'
                              : 'All'}
                          </button>

                          <button
                            type="button"
                            onClick={
                              clearLocationDistricts
                            }
                            className="
                              rounded-lg
                              border
                              border-slate-700
                              bg-slate-800
                              px-2.5
                              py-1.5
                              text-[10px]
                              font-bold
                              text-slate-400
                              hover:text-white
                              hover:bg-slate-700
                            "
                          >
                            {isAr
                              ? 'مسح'
                              : 'Clear'}
                          </button>
                        </div>
                      </div>

                      {selectedCity
                        .districts
                        .length ===
                      0 ? (
                        <div
                          className="
                            rounded-xl
                            border
                            border-slate-800
                            bg-slate-950/50
                            p-4
                            text-sm
                            text-slate-400
                            leading-relaxed
                          "
                        >
                          {isAr
                            ? 'لا توجد قائمة فروع لهذه المدينة في بيانات NATAN حالياً. يمكننا إضافتها لاحقاً.'
                            : 'No branch list is configured for this city in NATAN yet. It can be added later.'}
                        </div>
                      ) : (
                        <div
                          className="
                            max-h-[420px]
                            overflow-y-auto
                            space-y-2
                            pr-1
                          "
                        >
                          {selectedCity
                            .districts
                            .map(
                              (
                                district
                              ) => {
                                const checked =
                                  settings
                                    .selectedDistricts
                                    .includes(
                                      district
                                    );

                                return (
                                  <label
                                    key={
                                      district
                                    }
                                    className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                                      checked
                                        ? 'border-cyan-500/30 bg-cyan-500/5'
                                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/70'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        checked
                                      }
                                      onChange={() =>
                                        toggleLocationDistrict(
                                          district
                                        )
                                      }
                                      className="
                                        h-4
                                        w-4
                                        accent-cyan-500
                                        shrink-0
                                      "
                                    />

                                    <span
                                      className={`text-sm ${
                                        checked
                                          ? 'text-white font-semibold'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {
                                        district
                                      }
                                    </span>
                                  </label>
                                );
                              }
                            )}
                        </div>
                      )}
                    </div>

                    {/* Location status */}

                    <div
                      className="
                        rounded-xl
                        border
                        border-slate-800
                        bg-slate-950/60
                        p-4
                      "
                    >
                      <div
                        className="
                          flex
                          items-center
                          justify-between
                          gap-3
                        "
                      >
                        <span
                          className="
                            text-xs
                            text-slate-400
                          "
                        >
                          {isAr
                            ? 'حالة اللوكيشن'
                            : 'Location status'}
                        </span>

                        <span
                          className="
                            flex
                            items-center
                            gap-1.5
                            rounded-full
                            bg-emerald-500/10
                            border
                            border-emerald-500/20
                            px-2.5
                            py-1
                            text-[10px]
                            font-bold
                            text-emerald-300
                          "
                        >
                          <span
                            className="
                              w-1.5
                              h-1.5
                              rounded-full
                              bg-emerald-400
                            "
                          />

                          {isAr
                            ? 'جاهز للرصد'
                            : 'Ready to monitor'}
                        </span>
                      </div>

                      <div
                        className="
                          mt-3
                          text-[11px]
                          text-slate-500
                          leading-relaxed
                        "
                      >
                        {isAr
                          ? 'سيستخدم NATAN المدينة والفروع المحددة عند تطبيق الفلاتر على الشفتات الواردة.'
                          : 'NATAN will use the selected city and branches when applying filters to incoming shifts.'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    className="
                      rounded-xl
                      bg-slate-800/60
                      p-4
                      text-sm
                      text-slate-400
                    "
                  >
                    {isAr
                      ? 'لم يتم تحديد مدينة.'
                      : 'No city selected.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            ENGINE
            ==================================================== */}

        {activeView ===
          'engine' && (
          <div
            className="
              grid
              grid-cols-1
              lg:grid-cols-12
              gap-6
            "
          >
            <div
              className="
                lg:col-span-7
              "
            >
              <SpeedEngineConfig
                settings={settings}
                onUpdateSettings={
                  updateSettings
                }
              />
            </div>

            <div
              className="
                lg:col-span-5
                space-y-6
              "
            >
              <LogViewer
                logs={logs}
                onClearLogs={() =>
                  setLogs([])
                }
              />
            </div>
          </div>
        )}

        {/* ====================================================
            API BOT
            ==================================================== */}

        {activeView ===
          'api_bot' && (
          <DirectApiBot
            settings={settings}
            onUpdateSettings={
              updateSettings
            }
            onBookShift={
              bookShiftManually
            }
            onTriggerInstantDrop={
              triggerInstantDrop
            }
            onAddLog={
              addLog
            }
            onShiftsUpdated={
              handleNinjaShiftsUpdated
            }
            onNavigateToLocation={() =>
              setActiveView('location')
            }
          />
        )}
      </main>

      {/* ======================================================
          MOBILE BOTTOM NAVIGATION (Touch-First Native Bar)
          ====================================================== */}
      <nav
        aria-label="التنقل الرئيسي للهاتف"
        className="
          md:hidden
          fixed
          bottom-0
          left-0
          right-0
          z-40
          bg-slate-950/95
          backdrop-blur-xl
          border-t
          border-slate-800/90
          px-2
          py-1.5
          safe-bottom
          shadow-[0_-4px_25px_rgba(0,0,0,0.6)]
        "
      >
        <div className="grid grid-cols-5 items-center h-14">
          {/* 1. Radar */}
          <button
            type="button"
            onClick={() => {
              haptics.vibrateTick();
              setActiveView('radar');
            }}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full relative cursor-pointer active:scale-95 transition-transform ${
              activeView === 'radar'
                ? 'text-purple-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Radio className={`w-5 h-5 ${activeView === 'radar' ? 'text-purple-400 stroke-[2.5]' : ''}`} />
              {settings.monitoring && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <span className="text-[10px] leading-none truncate max-w-[62px]">{isAr ? 'الرادار' : 'Radar'}</span>
            {activeView === 'radar' && <span className="w-1.5 h-1 rounded-full bg-purple-400 -mt-0.5" />}
          </button>

          {/* 2. Criteria */}
          <button
            type="button"
            onClick={() => {
              haptics.vibrateTick();
              setActiveView('criteria');
            }}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full relative cursor-pointer active:scale-95 transition-transform ${
              activeView === 'criteria'
                ? 'text-purple-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className={`w-5 h-5 ${activeView === 'criteria' ? 'text-purple-400 stroke-[2.5]' : ''}`} />
            <span className="text-[10px] leading-none truncate max-w-[62px]">{isAr ? 'الشروط' : 'Criteria'}</span>
            {activeView === 'criteria' && <span className="w-1.5 h-1 rounded-full bg-purple-400 -mt-0.5" />}
          </button>

          {/* 3. Location */}
          <button
            type="button"
            onClick={() => {
              haptics.vibrateTick();
              setActiveView('location');
            }}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full relative cursor-pointer active:scale-95 transition-transform ${
              activeView === 'location'
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className={`w-5 h-5 ${activeView === 'location' ? 'text-cyan-400 stroke-[2.5]' : ''}`} />
            <span className="text-[10px] leading-none truncate max-w-[62px]">{isAr ? 'الخريطة' : 'Location'}</span>
            {activeView === 'location' && <span className="w-1.5 h-1 rounded-full bg-cyan-400 -mt-0.5" />}
          </button>

          {/* 4. Engine */}
          <button
            type="button"
            onClick={() => {
              haptics.vibrateTick();
              setActiveView('engine');
            }}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full relative cursor-pointer active:scale-95 transition-transform ${
              activeView === 'engine'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className={`w-5 h-5 ${activeView === 'engine' ? 'text-amber-400 stroke-[2.5]' : ''}`} />
            <span className="text-[10px] leading-none truncate max-w-[62px]">{isAr ? 'السرعة' : 'Engine'}</span>
            {activeView === 'engine' && <span className="w-1.5 h-1 rounded-full bg-amber-400 -mt-0.5" />}
          </button>

          {/* 5. API Bot */}
          <button
            type="button"
            onClick={() => {
              haptics.vibrateTick();
              setActiveView('api_bot');
            }}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full relative cursor-pointer active:scale-95 transition-transform ${
              activeView === 'api_bot'
                ? 'text-purple-300 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Server className={`w-5 h-5 ${activeView === 'api_bot' ? 'text-purple-400 stroke-[2.5]' : 'text-purple-400/70'}`} />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <span className="text-[10px] leading-none font-black text-purple-200 whitespace-nowrap">API Bot ⚡</span>
            {activeView === 'api_bot' && <span className="w-1.5 h-1 rounded-full bg-purple-400 -mt-0.5" />}
          </button>
        </div>
      </nav>

      {/* ======================================================
          FOOTER / WHATSAPP SUPPORT
          ====================================================== */}

      <footer
        className="
          border-t
          border-slate-800/80
          bg-gradient-to-b
          from-slate-900/90
          via-slate-950/95
          to-slate-950
          backdrop-blur-xl
          py-8
          px-4
          text-xs
          text-slate-400
          mt-10
          relative
          z-20
        "
      >
        <div
          className="
            max-w-7xl
            mx-auto
            space-y-6
          "
        >
          <div
            className="
              p-4
              sm:p-6
              rounded-2xl
              bg-gradient-to-r
              from-emerald-950/30
              via-slate-900/80
              to-purple-950/20
              border
              border-emerald-500/25
              shadow-xl
              shadow-emerald-950/20
              flex
              flex-col
              md:flex-row
              items-center
              justify-between
              gap-5
            "
          >
            <div
              className="
                flex
                items-center
                gap-3.5
                text-right
              "
            >
              <div
                className="
                  w-12
                  h-12
                  rounded-2xl
                  bg-emerald-500/15
                  border
                  border-emerald-500/30
                  flex
                  items-center
                  justify-center
                  text-emerald-400
                  shadow-inner
                  shadow-emerald-500/20
                  shrink-0
                "
              >
                <MessageCircle
                  className="
                    w-6
                    h-6
                    fill-emerald-400/20
                    animate-pulse
                  "
                />
              </div>

              <div>
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <h3
                    className="
                      text-sm
                      sm:text-base
                      font-black
                      text-white
                    "
                  >
                    {isAr
                      ? 'الدعم الفني المباشر عبر واتساب'
                      : 'Live WhatsApp Support'}
                  </h3>

                  <span
                    className="
                      flex
                      items-center
                      gap-1
                      text-[10px]
                      font-bold
                      px-2
                      py-0.5
                      rounded-full
                      bg-emerald-500/20
                      text-emerald-300
                      border
                      border-emerald-500/30
                    "
                  >
                    <span
                      className="
                        w-1.5
                        h-1.5
                        rounded-full
                        bg-emerald-400
                        animate-ping
                      "
                    />

                    {isAr
                      ? 'متواجدون الآن'
                      : 'Online now'}
                  </span>
                </div>

                <p
                  className="
                    text-[11px]
                    sm:text-xs
                    text-slate-400
                    mt-0.5
                  "
                >
                  {isAr
                    ? 'تواصل فوري للمساعدة في تفعيل الحسابات وضبط NATAN'
                    : 'Instant support for account activation and NATAN setup'}
                </p>
              </div>
            </div>

            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <a
                href="https://wa.me/97333314353"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group
                  relative
                  flex
                  items-center
                  justify-center
                  w-12
                  h-12
                  rounded-2xl
                  bg-emerald-600
                  hover:bg-emerald-500
                  text-white
                  transition-all
                  shadow-lg
                  shadow-emerald-600/30
                  hover:shadow-emerald-500/50
                  hover:scale-105
                  active:scale-95
                  cursor-pointer
                  ring-2
                  ring-emerald-400/40
                "
                title={
                  isAr
                    ? 'محادثة واتساب - الدعم الفني'
                    : 'WhatsApp technical support'
                }
                aria-label="WhatsApp support"
              >
                <MessageCircle
                  className="
                    w-6
                    h-6
                    fill-white
                  "
                />

                <span
                  className="
                    absolute
                    -top-1
                    -right-1
                    flex
                    h-3
                    w-3
                  "
                >
                  <span
                    className="
                      animate-ping
                      absolute
                      inline-flex
                      h-full
                      w-full
                      rounded-full
                      bg-emerald-300
                      opacity-75
                    "
                  />

                  <span
                    className="
                      relative
                      inline-flex
                      rounded-full
                      h-3
                      w-3
                      bg-emerald-400
                    "
                  />
                </span>
              </a>

              <a
                href="https://wa.me/97333269372"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group
                  flex
                  items-center
                  justify-center
                  w-12
                  h-12
                  rounded-2xl
                  bg-slate-800/90
                  hover:bg-slate-800
                  text-emerald-400
                  hover:text-white
                  border
                  border-emerald-500/30
                  hover:border-emerald-500/60
                  transition-all
                  shadow-md
                  hover:scale-105
                  active:scale-95
                  cursor-pointer
                "
                title={
                  isAr
                    ? 'محادثة واتساب - خط الدعم الثاني'
                    : 'WhatsApp support line 2'
                }
                aria-label="WhatsApp support line 2"
              >
                <MessageCircle
                  className="
                    w-6
                    h-6
                  "
                />
              </a>
            </div>
          </div>

          <div
            className="
              flex
              flex-col
              sm:flex-row
              items-center
              justify-between
              gap-3
              text-slate-500
              text-[11px]
              pt-2
              border-t
              border-slate-800/60
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <span
                className="
                  font-bold
                  text-slate-300
                "
              >
                NATAN v4.0
              </span>

              <span>•</span>

              <span>
                {isAr
                  ? 'منظومة شفتات نينجا'
                  : 'Ninja Shift System'}
              </span>
            </div>

            <span>
              {isAr
                ? 'خدمة العملاء والدعم الفني متاحة عبر قنوات واتساب'
                : 'Customer and technical support is available through WhatsApp'}
            </span>
          </div>
        </div>
      </footer>

      {/* ======================================================
          CODE MODAL
          ====================================================== */}

      <CodeExportModal
        isOpen={
          isCodeModalOpen
        }
        onClose={() =>
          setIsCodeModalOpen(
            false
          )
        }
      />

      {/* ======================================================
          AI ADVISOR
          ====================================================== */}

      <AiAdvisor
        isOpen={
          isAiAdvisorOpen
        }
        onClose={() =>
          setIsAiAdvisorOpen(
            false
          )
        }
        onApplyPreset={(
          preset
        ) => {
          updateSettings(
            preset
          );

          addLog(
            'info',
            isAr
              ? 'تم تطبيق إعدادات الاستراتيجية الموصى بها من المستشار الذكي'
              : 'Recommended strategy settings applied.'
          );
        }}
      />

      {/* ======================================================
          ACTIVATION MODAL
          ====================================================== */}

      {showActivationModal && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/70
            backdrop-blur-sm
            p-4
          "
          dir={
            isAr
              ? 'rtl'
              : 'ltr'
          }
        >
          <div
            className="
              w-full
              max-w-md
              rounded-3xl
              border
              border-purple-500/30
              bg-slate-900
              p-6
              shadow-2xl
            "
          >
            <div
              className="
                mb-5
                flex
                items-center
                gap-3
              "
            >
              <NatanLogo
                size="sm"
                withGlow={true}
              />

              <div>
                <h2
                  className="
                    text-lg
                    font-bold
                    text-white
                  "
                >
                  {isAr
                    ? '🔑 تفعيل NATAN'
                    : '🔑 Activate NATAN'}
                </h2>

                <p
                  className="
                    mt-1
                    text-sm
                    text-slate-400
                  "
                >
                  {isAr
                    ? 'أدخل كود التفعيل لفتح الميزات المحمية.'
                    : 'Enter your activation code to unlock protected features.'}
                </p>
              </div>
            </div>

            <input
              type="text"
              value={
                activationCode
              }
              onChange={(e) => {
                setActivationCode(
                  e.target.value.toUpperCase()
                );

                setActivationError(
                  ''
                );
              }}
              placeholder="NATAN-XXXX-XXXX"
              className="
                w-full
                rounded-2xl
                border
                border-slate-700
                bg-slate-950
                px-4
                py-3
                text-center
                font-mono
                text-lg
                tracking-widest
                text-white
                outline-none
                transition
                focus:border-purple-500
              "
              autoCapitalize="characters"
              autoComplete="off"
              disabled={
                activationLoading
              }
            />

            {activationError && (
              <div
                className="
                  mt-3
                  rounded-xl
                  border
                  border-red-500/30
                  bg-red-500/10
                  px-3
                  py-2
                  text-sm
                  text-red-300
                "
              >
                {
                  activationError
                }
              </div>
            )}

            <div
              className="
                mt-5
                flex
                gap-3
              "
            >
              <button
                type="button"
                onClick={() => {
                  if (
                    activationLoading
                  ) {
                    return;
                  }

                  setShowActivationModal(
                    false
                  );

                  setActivationError(
                    ''
                  );

                  setActivationCode(
                    ''
                  );
                }}
                disabled={
                  activationLoading
                }
                className="
                  flex-1
                  rounded-2xl
                  border
                  border-slate-700
                  bg-slate-800
                  px-4
                  py-3
                  font-semibold
                  text-slate-300
                  transition
                  hover:bg-slate-700
                  disabled:opacity-50
                "
              >
                {isAr
                  ? 'إغلاق'
                  : 'Close'}
              </button>

              <button
                type="button"
                onClick={
                  handleProtectedActivation
                }
                disabled={
                  activationLoading ||
                  !activationCode.trim()
                }
                className="
                  flex-1
                  rounded-2xl
                  bg-purple-600
                  px-4
                  py-3
                  font-bold
                  text-white
                  transition
                  hover:bg-purple-500
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {
                  activationLoading
                    ? isAr
                      ? 'جاري التفعيل...'
                      : 'Activating...'
                    : isAr
                      ? 'تفعيل الحساب'
                      : 'Activate Account'
                }
              </button>
            </div>

            <div
              className="
                mt-5
                border-t
                border-slate-800
                pt-4
              "
            >
              <p
                className="
                  mb-3
                  text-center
                  text-xs
                  text-slate-500
                "
              >
                {isAr
                  ? 'تحتاج إلى كود تفعيل؟ تواصل مع الدعم الفني'
                  : 'Need an activation code? Contact technical support.'}
              </p>

              <div
                className="
                  flex
                  gap-3
                "
              >
                <a
                  href="https://wa.me/97333314353"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    flex
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    border
                    border-emerald-500/30
                    bg-emerald-500/10
                    px-3
                    py-3
                    text-sm
                    font-semibold
                    text-emerald-400
                    transition
                    hover:bg-emerald-500/20
                  "
                >
                  <MessageCircle
                    className="
                      h-5
                      w-5
                    "
                  />

                  {isAr
                    ? 'الدعم 1'
                    : 'Support 1'}
                </a>

                <a
                  href="https://wa.me/97333269372"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    flex
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    border
                    border-emerald-500/30
                    bg-emerald-500/10
                    px-3
                    py-3
                    text-sm
                    font-semibold
                    text-emerald-400
                    transition
                    hover:bg-emerald-500/20
                  "
                >
                  <MessageCircle
                    className="
                      h-5
                      w-5
                    "
                  />

                  {isAr
                    ? 'الدعم 2'
                    : 'Support 2'}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          AUTH MODAL
          ====================================================== */}

      {showAuthModal && (
        <AuthModal
          currentSession={
            authSession
          }
          onAuthenticate={
            handleAuthSuccess
          }
          onOpenWhatsApp={() =>
            setIsWhatsAppModalOpen(
              true
            )
          }
          initialTab="login"
        />
      )}

      {/* ======================================================
          WHATSAPP SUPPORT MODAL
          ====================================================== */}

      {isWhatsAppModalOpen && (
        <WhatsAppSupport
          isOpen={
            isWhatsAppModalOpen
          }
          onClose={() =>
            setIsWhatsAppModalOpen(
              false
            )
          }
        />
      )}

    </div>
  );
}

