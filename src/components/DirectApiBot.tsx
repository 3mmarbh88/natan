import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Terminal,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Globe,
  ShieldCheck,
  Smartphone,
  Sliders,
  MapPin,
  ChevronDown,
  MapPinned,
} from "lucide-react";

import {
  BookingSettings,
  Shift,
} from "../types";

import { soundFX } from "../utils/audio";

import {
  NINJA_API_BASE,
  NinjaApiError,
  getNinjaShifts,
  getNinjaActiveShifts,
  getNinjaShiftSummaries,
} from "../api/ninjaApi";

import {
  mapNinjaShiftsToNatanShifts,
} from "../utils/ninjaShiftMapper";

import {
  SAUDI_CITIES,
} from "../data/saudiCities";


interface DirectApiBotProps {
  settings: BookingSettings;

  onUpdateSettings: (
    newSettings: Partial<BookingSettings>,
  ) => void;

  onBookShift: (shift: Shift) => void;

  onTriggerInstantDrop: () => void;

  onAddLog: (
    type:
      | "info"
      | "success"
      | "warning"
      | "error"
      | "speed",
    message: string,
    details?: string,
    durationMs?: number,
  ) => void;

  /*
   * Sends real Ninja shifts to App.tsx.
   *
   * The shifts are read-only at this stage.
   * No booking request is performed here.
   */
  onShiftsUpdated: (
    shifts: Shift[],
  ) => void;
  onNavigateToLocation?: () => void;
}


interface NetworkLog {
  id: string;
  time: string;
  method: "GET" | "POST";
  endpoint: string;
  status: number;
  latencyMs: number;
  responseSnippet: string;
  type:
    | "poll"
    | "book"
    | "auth"
    | "error";
}


export const DirectApiBot: React.FC<
  DirectApiBotProps
> = ({
  settings,
  onUpdateSettings,
  onAddLog,
  onShiftsUpdated,
  onNavigateToLocation,
}) => {

  const [isBotRunning, setIsBotRunning] =
    useState(false);

  const [pollIntervalMs, setPollIntervalMs] =
    useState(
      settings.apiBot?.requestIntervalMs || 3000,
    );

  const [endpointUrl, setEndpointUrl] =
    useState(
      settings.apiBot?.endpointUrl ||
        NINJA_API_BASE,
    );

  const [networkLogs, setNetworkLogs] =
    useState<NetworkLog[]>([]);

  const [totalRequests, setTotalRequests] =
    useState(0);

  const [fastestLatency, setFastestLatency] =
    useState(0);

  const [lastLatency, setLastLatency] =
    useState(0);

  const [activeTab, setActiveTab] =
    useState<
      "console" | "params" | "guide"
    >("console");

  const [lastShiftCount, setLastShiftCount] =
    useState(0);

  const [isLoading, setIsLoading] =
    useState(false);

  const [connectionStatus, setConnectionStatus] =
    useState<
      "idle" | "checking" | "connected" | "error"
    >("idle");

  const logsEndRef =
    useRef<HTMLDivElement>(null);


  /*
   * -------------------------------------------------------
   * Selected location
   * -------------------------------------------------------
   */

  const selectedCity =
    SAUDI_CITIES.find(
      (city) =>
        city.id === settings.selectedCity,
    ) ||
    SAUDI_CITIES[0];

  const selectedDistricts =
    settings.selectedDistricts || [];


  /*
   * Scroll network console automatically.
   */

  useEffect(() => {
    if (activeTab === "console") {
      logsEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [
    networkLogs,
    activeTab,
  ]);


  /*
   * -------------------------------------------------------
   * Location helpers
   * -------------------------------------------------------
   */

  const handleCityChange = (
    cityId: string,
  ) => {
    const city =
      SAUDI_CITIES.find(
        (item) =>
          item.id === cityId,
      );

    if (!city) {
      return;
    }

    /*
     * When a city is selected:
     *
     * - If it has known districts:
     *   select all of them.
     *
     * - If it has no district list:
     *   keep the district list empty.
     *
     * Empty district list means that the city
     * itself is the selected location.
     */

    const nextDistricts =
      city.districts?.length
        ? [...city.districts]
        : [];

    onUpdateSettings({
      selectedCity: city.id,
      selectedDistricts:
        nextDistricts,
    });

    onAddLog(
      "info",
      `📍 تم تغيير موقع NATAN إلى ${city.name}`,
      city.nameEn
        ? `Location: ${city.nameEn}`
        : undefined,
    );
  };


  const toggleDistrict = (
    district: string,
  ) => {
    const exists =
      selectedDistricts.includes(
        district,
      );

    const nextDistricts =
      exists
        ? selectedDistricts.filter(
            (item) =>
              item !== district,
          )
        : [
            ...selectedDistricts,
            district,
          ];

    onUpdateSettings({
      selectedDistricts:
        nextDistricts,
    });
  };


  const selectAllDistricts = () => {
    if (!selectedCity) {
      return;
    }

    onUpdateSettings({
      selectedDistricts:
        selectedCity.districts
          ? [
              ...selectedCity.districts,
            ]
          : [],
    });

    onAddLog(
      "info",
      "📍 تم اختيار جميع فروع المدينة الحالية",
    );
  };


  const clearDistricts = () => {
    onUpdateSettings({
      selectedDistricts: [],
    });

    onAddLog(
      "info",
      "📍 تم إلغاء تحديد الفروع",
      "سيتم استخدام المدينة فقط كمعيار للموقع.",
    );
  };


  /*
   * -------------------------------------------------------
   * Network logging
   * -------------------------------------------------------
   */

  const addNetworkLog = (
    method: "GET" | "POST",
    endpoint: string,
    status: number,
    latencyMs: number,
    responseSnippet: string,
    type:
      | "poll"
      | "book"
      | "auth"
      | "error",
  ) => {

    const entry: NetworkLog = {
      id: `${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString(
        "ar-SA",
      ),
      method,
      endpoint,
      status,
      latencyMs,
      responseSnippet,
      type,
    };

    setNetworkLogs(
      (prev) => [
        ...prev.slice(-24),
        entry,
      ],
    );

    setTotalRequests(
      (prev) =>
        prev + 1,
    );

    setLastLatency(
      latencyMs,
    );

    setFastestLatency(
      (previous) => {
        if (
          previous === 0 ||
          latencyMs < previous
        ) {
          return latencyMs;
        }

        return previous;
      },
    );
  };


  /*
   * -------------------------------------------------------
   * Error helper
   * -------------------------------------------------------
   */

  const getErrorDetails = (
    error: unknown,
  ) => {

    if (
      error instanceof NinjaApiError
    ) {
      return {
        status: error.status,
        message: error.message,
      };
    }

    if (
      error instanceof Error
    ) {
      return {
        status: 0,
        message: error.message,
      };
    }

    return {
      status: 0,
      message: String(error),
    };
  };


  /*
   * -------------------------------------------------------
   * Location filtering
   * -------------------------------------------------------
   *
   * IMPORTANT:
   *
   * This filter works on the NATAN mapped Shift object.
   * It does NOT modify the HTTP request sent to Ninja.
   *
   * The actual Ninja API currently receives:
   *
   * GET /captains/shifts?pageId=0
   *
   * without a city parameter.
   *
   * Therefore location selection here controls which
   * returned shifts NATAN accepts/display/processes.
   */

  const matchesSelectedLocation = (
    shift: Shift,
  ) => {

    if (!selectedCity) {
      return true;
    }

    /*
     * If the Ninja shift does not contain a city,
     * do not reject it here.
     *
     * This prevents the location filter from hiding
     * all real shifts if the mapper/API does not expose
     * the city field yet.
     */

    if (!shift.city) {
      return true;
    }

    const shiftCity =
      String(
        shift.city,
      ).trim();

    const cityAr =
      String(
        selectedCity.name || "",
      ).trim();

    const cityEn =
      String(
        selectedCity.nameEn || "",
      ).trim();

    const cityMatches =
      shiftCity === cityAr ||
      shiftCity === cityEn ||
      shiftCity.includes(cityAr) ||
      shiftCity.includes(cityEn) ||
      cityAr.includes(shiftCity) ||
      cityEn.includes(shiftCity);

    if (!cityMatches) {
      return false;
    }

    /*
     * If no districts are selected,
     * city-only filtering is used.
     */

    if (
      selectedDistricts.length === 0
    ) {
      return true;
    }

    /*
     * If Shift has no district,
     * do not reject it.
     */

    if (!shift.district) {
      return true;
    }

    const shiftDistrict =
      String(
        shift.district,
      ).trim();

    return selectedDistricts.some(
      (district) => {

        const value =
          String(
            district,
          ).trim();

        return (
          shiftDistrict === value ||
          shiftDistrict.includes(
            value,
          ) ||
          value.includes(
            shiftDistrict,
          )
        );
      },
    );
  };


  /*
   * Apply the selected location to real
   * mapped Ninja shifts.
   */

  const filterShiftsByLocation = (
    shifts: Shift[],
  ) => {

    if (
      !selectedCity
    ) {
      return shifts;
    }

    return shifts.filter(
      matchesSelectedLocation,
    );
  };


  /*
   * -------------------------------------------------------
   * Real Ninja shifts
   * -------------------------------------------------------
   *
   * Read real Ninja shifts.
   *
   * This is intentionally read-only.
   *
   * The current ninjaApi.ts helper does not
   * fabricate Play Integrity / Incognia /
   * HMAC headers.
   */

  const fetchRealNinjaShifts =
    async () => {

      if (isLoading) {
        return;
      }

      setIsLoading(true);
      setConnectionStatus(
        "checking",
      );

      const started =
        performance.now();

      try {

        const response =
          await getNinjaShifts(
            0,
          );

        const latency =
          Math.round(
            performance.now() -
              started,
          );

        const shifts =
          Array.isArray(
            response?.data,
          )
            ? response.data
            : [];

        setLastShiftCount(
          shifts.length,
        );

        addNetworkLog(
          "GET",
          "/captains/shifts?pageId=0",
          200,
          latency,
          JSON.stringify({
            success:
              response?.success,
            page:
              response?.page,
            pageCount:
              response?.pageCount,
            totalElements:
              response?.totalElements,
            dataCount:
              shifts.length,
          }),
          "poll",
        );

        setConnectionStatus(
          "connected",
        );

        onAddLog(
          "success",
          `تمت قراءة واجهة Ninja الحقيقية: ${shifts.length} شفت`,
          `GET ${NINJA_API_BASE}/captains/shifts?pageId=0 — ${latency}ms`,
          latency,
        );

        /*
         * Convert the real Ninja API model
         * into the NATAN Shift model.
         */

        const mapped =
          mapNinjaShiftsToNatanShifts(
            shifts,
          );

        /*
         * Apply selected location.
         */

        const locationFiltered =
          filterShiftsByLocation(
            mapped,
          );

        /*
         * Send the filtered real shifts
         * to App.tsx.
         */

        onShiftsUpdated(
          locationFiltered,
        );

        onAddLog(
          "info",
          `تم إرسال ${locationFiltered.length} شفت إلى NATAN`,
          `الموقع: ${
            selectedCity?.name ||
            "غير محدد"
          } — الشفتات الأصلية: ${mapped.length}`,
        );

      } catch (error) {

        const latency =
          Math.round(
            performance.now() -
              started,
          );

        const details =
          getErrorDetails(
            error,
          );

        addNetworkLog(
          "GET",
          "/captains/shifts?pageId=0",
          details.status,
          latency,
          details.message,
          "error",
        );

        setConnectionStatus(
          "error",
        );

        onAddLog(
          "error",
          "تعذر قراءة API الخاص بـ Ninja",
          details.message,
        );

      } finally {

        setIsLoading(
          false,
        );
      }
    };


  /*
   * -------------------------------------------------------
   * Active shifts
   * -------------------------------------------------------
   */

  const fetchActiveShifts =
    async () => {

      if (isLoading) {
        return;
      }

      setIsLoading(true);
      setConnectionStatus(
        "checking",
      );

      const started =
        performance.now();

      try {

        const response =
          await getNinjaActiveShifts(
            0,
          );

        const latency =
          Math.round(
            performance.now() -
              started,
          );

        const shifts =
          Array.isArray(
            response?.data,
          )
            ? response.data
            : [];

        addNetworkLog(
          "GET",
          "/captains/shifts/active?pageId=0",
          200,
          latency,
          JSON.stringify({
            success:
              response?.success,
            dataCount:
              shifts.length,
          }),
          "poll",
        );

        setConnectionStatus(
          "connected",
        );

        /*
         * Active shifts are also mapped.
         */

        const mapped =
          mapNinjaShiftsToNatanShifts(
            shifts,
          );

        /*
         * Apply location filter.
         */

        const locationFiltered =
          filterShiftsByLocation(
            mapped,
          );

        onShiftsUpdated(
          locationFiltered,
        );

        setLastShiftCount(
          shifts.length,
        );

        onAddLog(
          "success",
          `تم فحص الشفتات النشطة: ${shifts.length}`,
          `تم تمرير ${locationFiltered.length} شفت حسب الموقع المحدد — ${NINJA_API_BASE}/captains/shifts/active?pageId=0 — ${latency}ms`,
          latency,
        );

      } catch (error) {

        const latency =
          Math.round(
            performance.now() -
              started,
          );

        const details =
          getErrorDetails(
            error,
          );

        addNetworkLog(
          "GET",
          "/captains/shifts/active?pageId=0",
          details.status,
          latency,
          details.message,
          "error",
        );

        setConnectionStatus(
          "error",
        );

        onAddLog(
          "error",
          "تعذر قراءة الشفتات النشطة",
          details.message,
        );

      } finally {

        setIsLoading(
          false,
        );
      }
    };


  /*
   * -------------------------------------------------------
   * Shift summaries
   * -------------------------------------------------------
   */

  const fetchShiftSummaries =
    async () => {

      if (isLoading) {
        return;
      }

      setIsLoading(
        true,
      );

      const started =
        performance.now();

      try {

        const response =
          await getNinjaShiftSummaries(
            0,
          );

        const latency =
          Math.round(
            performance.now() -
              started,
          );

        addNetworkLog(
          "GET",
          "/captains/shifts/summaries?pageId=0",
          200,
          latency,
          typeof response ===
          "string"
            ? response.slice(
                0,
                300,
              )
            : JSON.stringify(
                response,
              ).slice(
                0,
                300,
              ),
          "poll",
        );

        onAddLog(
          "success",
          "تم جلب ملخصات الشفتات من Ninja",
          `GET ${NINJA_API_BASE}/captains/shifts/summaries?pageId=0 — ${latency}ms`,
          latency,
        );

      } catch (error) {

        const latency =
          Math.round(
            performance.now() -
              started,
          );

        const details =
          getErrorDetails(
            error,
          );

        addNetworkLog(
          "GET",
          "/captains/shifts/summaries?pageId=0",
          details.status,
          latency,
          details.message,
          "error",
        );

        onAddLog(
          "error",
          "تعذر جلب ملخصات الشفتات",
          details.message,
        );

      } finally {

        setIsLoading(
          false,
        );
      }
    };


  /*
   * -------------------------------------------------------
   * Read-only monitoring
   * -------------------------------------------------------
   */

  useEffect(() => {

    if (!isBotRunning) {
      return;
    }

    let cancelled =
      false;

    const run =
      async () => {

        if (cancelled) {
          return;
        }

        await fetchRealNinjaShifts();
      };

    run();

    const timer =
      window.setInterval(
        run,
        Math.max(
          pollIntervalMs,
          1000,
        ),
      );

    return () => {

      cancelled =
        true;

      window.clearInterval(
        timer,
      );
    };

  }, [
    isBotRunning,
    pollIntervalMs,
    settings.selectedCity,
    JSON.stringify(
      settings.selectedDistricts || [],
    ),
  ]);


  /*
   * -------------------------------------------------------
   * Bot toggle
   * -------------------------------------------------------
   */

  const handleToggleBot =
    () => {

      soundFX.playClick();

      const nextState =
        !isBotRunning;

      setIsBotRunning(
        nextState,
      );

      if (nextState) {

        soundFX.playSuccess();

        onAddLog(
          "info",
          "تم تشغيل فاحص Ninja API الحقيقي",
          `GET /captains/shifts?pageId=0 كل ${pollIntervalMs}ms`,
        );

      } else {

        onAddLog(
          "info",
          "تم إيقاف فاحص Ninja API",
        );
      }
    };


  /*
   * -------------------------------------------------------
   * Manual API test
   * -------------------------------------------------------
   */

  const handleManualApiTest =
    async () => {

      soundFX.playClick();

      await fetchRealNinjaShifts();
    };


  /*
   * -------------------------------------------------------
   * Save API settings
   * -------------------------------------------------------
   */

  const handleSaveApiSettings =
    () => {

      soundFX.playClick();

      onUpdateSettings({

        bookingMode:
          "direct_api",

        apiBot: {

          enabled:
            isBotRunning,

          endpointUrl:
            endpointUrl ||
            NINJA_API_BASE,

          /*
           * Kept empty intentionally.
           * The app does not accept or store a
           * manually entered real Bearer token.
           */

          bearerToken:
            "",

          deviceId:
            settings.apiBot?.deviceId ||
            "",

          appVersion:
            settings.apiBot?.appVersion ||
            "1.12.131",

          requestIntervalMs:
            pollIntervalMs,

          telegramAlertEnabled:
            settings.apiBot
              ?.telegramAlertEnabled ??
            false,

          telegramBotToken:
            settings.apiBot
              ?.telegramBotToken ||
            "",

          telegramChatId:
            settings.apiBot
              ?.telegramChatId ||
            "",

          simulateDirectApi:
            false,
        },
      });

      onAddLog(
        "success",
        "تم حفظ إعدادات Ninja API",
        "وضع القراءة والفحص فقط مفعّل حاليًا.",
      );
    };


  /*
   * -------------------------------------------------------
   * Connection status
   * -------------------------------------------------------
   */

  const statusText =
    connectionStatus ===
    "connected"
      ? "تم الاتصال"
      : connectionStatus ===
          "checking"
        ? "جارٍ الفحص"
        : connectionStatus ===
            "error"
          ? "خطأ / يحتاج مصادقة"
          : "جاهز للفحص";


  const statusClass =
    connectionStatus ===
    "connected"
      ? "bg-emerald-400"
      : connectionStatus ===
          "checking"
        ? "bg-amber-400 animate-pulse"
        : connectionStatus ===
            "error"
          ? "bg-rose-400"
          : "bg-slate-500";


  /*
   * -------------------------------------------------------
   * Render
   * -------------------------------------------------------
   */

  return (

    <div className="space-y-6">

      {/* =====================================================
          Header
          ===================================================== */}

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950/40 to-indigo-950/30 border border-purple-500/30 p-5 sm:p-6 shadow-2xl">

        <div className="absolute -top-16 -left-16 w-56 h-56 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">

          <div className="flex items-start gap-4">

            <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shrink-0">

              <Server className="w-7 h-7" />

            </div>

            <div className="space-y-1">

              <div className="flex items-center gap-2.5 flex-wrap">

                <h2 className="text-xl font-black text-white tracking-tight">
                  Ninja API
                </h2>

                <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-0.5 rounded-full border border-purple-500/40 font-mono font-bold">
                  Real API
                </span>

              </div>

              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                ربط NATAN مع واجهة Ninja الحقيقية
                لقراءة الشفتات والبيانات من السيرفر.
                مرحلة الحجز المباشر غير مفعلة حاليًا.
              </p>

              <div className="flex items-center gap-2 pt-2">

                <Globe className="w-3.5 h-3.5 text-purple-400" />

                <code className="text-[10px] sm:text-xs text-purple-300 font-mono break-all">
                  {NINJA_API_BASE}
                </code>

              </div>

            </div>
          </div>


          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">

            <button
              onClick={
                handleToggleBot
              }
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] rounded-xl text-xs sm:text-sm font-black transition-all shadow-lg active:scale-95 w-full sm:w-auto ${
                isBotRunning
                  ? "bg-rose-500 hover:bg-rose-600 text-white"
                  : "bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white"
              } disabled:opacity-50`}
            >

              {isBotRunning ? (
                <>
                  <Square className="w-4 h-4 fill-white" />
                  إيقاف الفحص
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  تشغيل API
                </>
              )}

            </button>


            <button
              onClick={
                handleManualApiTest
              }
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs sm:text-sm font-bold disabled:opacity-50 active:scale-95 w-full sm:w-auto"
            >

              <RefreshCw
                className={`w-4 h-4 ${
                  isLoading
                    ? "animate-spin"
                    : ""
                }`}
              />

              اختبار API الحقيقي

            </button>

          </div>
        </div>


        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">

            <span className="text-[11px] text-slate-400 block">
              حالة الاتصال
            </span>

            <div className="flex items-center gap-2 mt-1">

              <span
                className={`w-2 h-2 rounded-full ${statusClass}`}
              />

              <span className="font-bold text-xs text-white">
                {statusText}
              </span>

            </div>
          </div>


          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">

            <span className="text-[11px] text-slate-400 block">
              آخر استجابة
            </span>

            <span className="font-mono font-black text-sm text-purple-400">
              {lastLatency
                ? `${lastLatency} ms`
                : "--"}
            </span>

          </div>


          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">

            <span className="text-[11px] text-slate-400 block">
              عدد الشفتات
            </span>

            <span className="font-mono font-black text-sm text-emerald-400">
              {lastShiftCount}
            </span>

          </div>


          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">

            <span className="text-[11px] text-slate-400 block">
              إجمالي الطلبات
            </span>

            <span className="font-mono font-black text-sm text-indigo-400">
              {totalRequests}
            </span>

          </div>

        </div>

      </div>


      {/* =====================================================
          Current Location
          ===================================================== */}

      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-slate-900/80 to-indigo-950/20 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 shrink-0">
              <MapPin className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">
                  خريطة اللوكيشن & Mock Location
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {selectedCity ? selectedCity.name : 'متزامن مع الخريطة'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {typeof settings.selectedLatitude === 'number' && typeof settings.selectedLongitude === 'number'
                  ? `الإحداثيات الحالية: (${settings.selectedLatitude.toFixed(4)}, ${settings.selectedLongitude.toFixed(4)}) — الفروع المحددة: ${selectedDistricts.length || 'الكل'}`
                  : 'حدد نقطة على الخريطة أو استخدم موقع الهاتف لتطبيق Mock Location الرسمي'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToLocation && (
              <button
                type="button"
                onClick={onNavigateToLocation}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 cursor-pointer"
              >
                <MapPinned className="w-4 h-4" />
                <span>فتح خريطة اللوكيشن 🗺️</span>
              </button>
            )}
          </div>
        </div>


        {/* Districts */}

        {selectedCity && (
          <div className="mt-5 pt-5 border-t border-slate-800">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">

              <div>

                <h4 className="text-xs font-black text-white">
                  فروع {selectedCity.name}
                </h4>

                <p className="text-[10px] text-slate-500 mt-1">
                  حدد الفروع التي تريد أن يستخدمها
                  NATAN كمعيار للبحث.
                </p>

              </div>


              {selectedCity.districts?.length >
                0 && (

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={
                      selectAllDistricts
                    }
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-bold hover:bg-cyan-500/20"
                  >
                    اختيار الكل
                  </button>

                  <button
                    type="button"
                    onClick={
                      clearDistricts
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold hover:bg-slate-700"
                  >
                    إلغاء الكل
                  </button>

                </div>

              )}

            </div>


            {selectedCity.districts?.length >
            0 ? (

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">

                {selectedCity.districts.map(
                  (district) => {

                    const checked =
                      selectedDistricts.includes(
                        district,
                      );

                    return (

                      <label
                        key={district}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          checked
                            ? "bg-cyan-500/10 border-cyan-500/40"
                            : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                        }`}
                      >

                        <input
                          type="checkbox"
                          checked={
                            checked
                          }
                          onChange={() =>
                            toggleDistrict(
                              district,
                            )
                          }
                          className="w-4 h-4 accent-cyan-500"
                        />

                        <span
                          className={`text-[11px] font-bold ${
                            checked
                              ? "text-cyan-300"
                              : "text-slate-300"
                          }`}
                        >
                          {district}
                        </span>

                      </label>

                    );
                  },
                )}

              </div>

            ) : (

              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4">

                <div className="flex items-center gap-2">

                  <MapPin className="w-4 h-4 text-slate-500" />

                  <span className="text-[11px] text-slate-400">
                    لا توجد قائمة فروع محددة لهذه
                    المدينة في ملف بيانات NATAN حاليًا.
                  </span>

                </div>

                <p className="text-[10px] text-slate-500 mt-2">
                  سيتم استخدام اسم المدينة كمعيار
                  للموقع عندما تكون بيانات المدينة
                  موجودة في نموذج الشفت.
                </p>

              </div>

            )}

          </div>
        )}

      </div>


      {/* =====================================================
          Security / current connection status
          ===================================================== */}

      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">

        <div className="flex items-start gap-3">

          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />

          <div className="space-y-1">

            <h3 className="text-sm font-bold text-amber-300">
              حالة الربط الحالية
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">

              تم استخراج الـ API الحقيقي من تطبيق Ninja،
              لكن طلبات Ninja المصادق عليها تستخدم أيضًا
              Authorization و installation-uid و Integrity headers
              وتوقيع HMAC، بالإضافة إلى Play Integrity / Incognia
              في بعض العمليات.
              لذلك هذا الإصدار يقرأ طبقة الـ API فقط عندما يسمح
              السيرفر بذلك، ولا يحاول تجاوز آليات الحماية.

            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          Tabs
          ===================================================== */}

      <div className="flex items-center justify-between border-b border-slate-800 pb-2">

        <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">

          <button
            onClick={() =>
              setActiveTab(
                "console",
              )
            }
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold ${
              activeTab ===
              "console"
                ? "bg-purple-600 text-white"
                : "bg-slate-900 text-slate-300 border border-slate-800"
            }`}
          >

            <Terminal className="w-3.5 h-3.5" />

            Console

          </button>


          <button
            onClick={() =>
              setActiveTab(
                "params",
              )
            }
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold ${
              activeTab ===
              "params"
                ? "bg-purple-600 text-white"
                : "bg-slate-900 text-slate-300 border border-slate-800"
            }`}
          >

            <Sliders className="w-3.5 h-3.5" />

            الإعدادات

          </button>


          <button
            onClick={() =>
              setActiveTab(
                "guide",
              )
            }
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold ${
              activeTab ===
              "guide"
                ? "bg-purple-600 text-white"
                : "bg-slate-900 text-slate-300 border border-slate-800"
            }`}
          >

            <ShieldCheck className="w-3.5 h-3.5" />

            معلومات API

          </button>

        </div>

      </div>


      {/* =====================================================
          Console
          ===================================================== */}

      {activeTab ===
        "console" && (

        <div className="space-y-4">

          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 font-mono text-xs shadow-2xl overflow-hidden">

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">

              <div className="flex items-center gap-2">

                <div className="flex gap-1.5">

                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />

                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />

                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />

                </div>

                <span className="text-slate-400 text-[11px]">
                  natan@ninja-api: ~/traffic
                </span>

              </div>


              <button
                onClick={() =>
                  setNetworkLogs(
                    [],
                  )
                }
                className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 text-[10px]"
              >
                مسح السجل
              </button>

            </div>


            <div className="max-h-[400px] overflow-y-auto space-y-1.5 pr-1">

              {networkLogs.length ===
              0 ? (

                <div className="py-12 text-center text-slate-500 font-sans">

                  لا توجد طلبات حتى الآن.

                  <div className="mt-3">

                    اضغط

                    <span className="text-purple-400 mx-1">
                      اختبار API الحقيقي
                    </span>

                    لبدء أول طلب.

                  </div>

                </div>

              ) : (

                networkLogs.map(
                  (log) => (

                    <div
                      key={
                        log.id
                      }
                      className={`flex items-start justify-between gap-2 p-2 rounded-lg ${
                        log.type ===
                        "error"
                          ? "bg-rose-950/30 border border-rose-500/20"
                          : "hover:bg-slate-800/50"
                      }`}
                    >

                      <div className="flex items-start gap-2 overflow-hidden">

                        <span className="text-slate-500 shrink-0 text-[10px]">
                          {log.time}
                        </span>


                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                            log.method ===
                            "POST"
                              ? "bg-purple-600 text-white"
                              : "bg-slate-800 text-sky-300"
                          }`}
                        >
                          {log.method}
                        </span>


                        <span className="font-bold truncate text-[11px] text-slate-300">
                          {log.endpoint}
                        </span>


                        <span className="text-slate-500 hidden sm:inline truncate">
                          {
                            log.responseSnippet
                          }
                        </span>

                      </div>


                      <div className="flex items-center gap-2 shrink-0">

                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            log.status >=
                              200 &&
                            log.status <
                              300
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {log.status ||
                            "ERR"}
                        </span>


                        <span className="text-purple-400 font-bold text-[10px]">
                          {
                            log.latencyMs
                          }ms
                        </span>

                      </div>

                    </div>

                  ),
                )

              )}


              <div
                ref={
                  logsEndRef
                }
              />

            </div>

          </div>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            <button
              onClick={
                fetchRealNinjaShifts
              }
              disabled={
                isLoading
              }
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-left disabled:opacity-50"
            >

              <div className="flex items-center gap-2">

                <RefreshCw className="w-4 h-4 text-purple-400" />

                <span className="text-xs font-bold text-white">
                  captains/shifts
                </span>

              </div>

              <p className="text-[10px] text-slate-400 mt-2">
                GET /captains/shifts?pageId=0
              </p>

            </button>


            <button
              onClick={
                fetchActiveShifts
              }
              disabled={
                isLoading
              }
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-left disabled:opacity-50"
            >

              <div className="flex items-center gap-2">

                <Zap className="w-4 h-4 text-emerald-400" />

                <span className="text-xs font-bold text-white">
                  Active Shifts
                </span>

              </div>

              <p className="text-[10px] text-slate-400 mt-2">
                GET /captains/shifts/active
              </p>

            </button>


            <button
              onClick={
                fetchShiftSummaries
              }
              disabled={
                isLoading
              }
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-left disabled:opacity-50"
            >

              <div className="flex items-center gap-2">

                <Terminal className="w-4 h-4 text-sky-400" />

                <span className="text-xs font-bold text-white">
                  Summaries
                </span>

              </div>

              <p className="text-[10px] text-slate-400 mt-2">
                GET /captains/shifts/summaries
              </p>

            </button>

          </div>

        </div>

      )}


      {/* =====================================================
          Parameters
          ===================================================== */}

      {activeTab ===
        "params" && (

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <div className="lg:col-span-8 space-y-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">

            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3">

              <Server className="w-4 h-4 text-purple-400" />

              إعدادات Ninja API

            </div>


            <div className="space-y-2">

              <label className="text-xs font-semibold text-slate-300">
                عنوان API
              </label>

              <input
                type="text"
                value={
                  endpointUrl
                }
                onChange={(e) =>
                  setEndpointUrl(
                    e.target.value,
                  )
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
              />

            </div>


            {/* Location inside API parameters */}

            <div className="rounded-xl bg-slate-950/60 border border-cyan-500/20 p-4">

              <div className="flex items-center justify-between gap-3">

                <div className="flex items-center gap-2">

                  <MapPin className="w-4 h-4 text-cyan-400" />

                  <span className="text-xs font-bold text-white">
                    موقع البحث
                  </span>

                </div>

                <span className="text-[10px] text-cyan-300 font-bold">
                  {selectedCity?.name ||
                    "غير محدد"}
                </span>

              </div>


              <div className="mt-3 text-[10px] text-slate-400 leading-relaxed">

                <div>
                  المدينة:
                  <span className="text-slate-200 mr-1">
                    {selectedCity?.name ||
                      "--"}
                  </span>
                </div>

                <div className="mt-1">
                  الفروع المحددة:
                  <span className="text-cyan-300 mr-1">
                    {selectedDistricts.length ||
                      "كل الفروع"}
                  </span>
                </div>

              </div>


              <p className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed">

                ملاحظة: الموقع هنا معيار داخل NATAN
                لتصفية الشفتات بعد قراءتها من API.
                طلب GET الحالي إلى Ninja لا يحتوي
                على معامل city/district حتى الآن.

              </p>

            </div>


            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4">

              <div className="flex items-center gap-2">

                <ShieldCheck className="w-4 h-4 text-purple-400" />

                <span className="text-xs font-bold text-white">
                  المصادقة
                </span>

              </div>

              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">

                لا يتم إدخال Bearer Token يدويًا هنا.
                تطبيق Ninja يستخدم بالإضافة إلى Authorization
                متطلبات أخرى مثل installation-uid وIntegrity headers
                وتوقيع HMAC، وبعض العمليات تستخدم Play Integrity
                وIncognia.

              </p>

            </div>


            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">

              <div className="flex justify-between items-center">

                <span className="text-xs font-semibold text-slate-300">
                  فترة فحص الشفتات
                </span>

                <span className="font-mono text-purple-400 font-bold text-xs">
                  {pollIntervalMs} ms
                </span>

              </div>


              <input
                type="range"
                min={1000}
                max={30000}
                step={500}
                value={
                  pollIntervalMs
                }
                onChange={(e) =>
                  setPollIntervalMs(
                    Number(
                      e.target.value,
                    ),
                  )
                }
                className="w-full accent-purple-500"
              />


              <div className="flex justify-between text-[10px] text-slate-500">

                <span>
                  1 ثانية
                </span>

                <span>
                  3 ثوانٍ
                </span>

                <span>
                  30 ثانية
                </span>

              </div>

            </div>


            <div className="flex justify-end">

              <button
                type="button"
                onClick={
                  handleSaveApiSettings
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black"
              >

                <CheckCircle2 className="w-4 h-4" />

                حفظ إعدادات API

              </button>

            </div>

          </div>


          <div className="lg:col-span-4 space-y-4">

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">

              <h4 className="text-xs font-bold text-purple-300 flex items-center gap-2">

                <ShieldCheck className="w-4 h-4 text-purple-400" />

                ما تم اكتشافه

              </h4>


              <ul className="mt-3 text-[11px] text-slate-300 space-y-2 leading-relaxed">

                <li>
                  • Base URL الحقيقي
                </li>

                <li>
                  • GET /captains/shifts
                </li>

                <li>
                  • GET /captains/shifts/active
                </li>

                <li>
                  • GET /captains/shifts/summaries
                </li>

                <li>
                  • صيغة DataResponse
                </li>

                <li>
                  • نموذج Shift
                </li>

              </ul>

            </div>


            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">

              <h4 className="text-xs font-bold text-sky-300 flex items-center gap-2">

                <Smartphone className="w-4 h-4 text-sky-400" />

                ما لم يتم تفعيله بعد

              </h4>


              <ul className="mt-3 text-[11px] text-slate-300 space-y-2 leading-relaxed">

                <li>
                  • المصادقة الرسمية الكاملة
                </li>

                <li>
                  • installation-uid
                </li>

                <li>
                  • Integrity headers
                </li>

                <li>
                  • HMAC request signature
                </li>

                <li>
                  • الحجز المباشر
                </li>

              </ul>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          Guide
          ===================================================== */}

      {activeTab ===
        "guide" && (

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">

          <div className="border-b border-slate-800 pb-4">

            <h3 className="text-base font-black text-white flex items-center gap-2">

              <Smartphone className="w-5 h-5 text-purple-400" />

              حالة استخراج API

            </h3>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">

              تم بالفعل تحديد الـ endpoints الأساسية من تطبيق
              Ninja Driver. الخطوة الحالية هي ربط NATAN بطبقة
              البيانات الحقيقية بدون استخدام بيانات وهمية.

            </p>

          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">

              <div className="flex items-center gap-2">

                <CheckCircle2 className="w-5 h-5 text-emerald-400" />

                <h4 className="text-xs font-bold text-white">
                  تم اكتشافه
                </h4>

              </div>


              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">

                السيرفر:
                <br />

                <code className="text-purple-300">
                  {NINJA_API_BASE}
                </code>

                <br />
                <br />

                الشفتات:
                <br />

                <code className="text-purple-300">
                  GET /captains/shifts?pageId=0
                </code>

              </p>

            </div>


            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">

              <div className="flex items-center gap-2">

                <AlertTriangle className="w-5 h-5 text-amber-400" />

                <h4 className="text-xs font-bold text-white">
                  يحتاج خطوة لاحقة
                </h4>

              </div>


              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">

                تطبيق Ninja لا يعتمد على Bearer Token وحده.
                من التحليل تبين وجود installation-uid وIntegrity
                headers وتوقيع HMAC، وبعض عمليات المصادقة تستخدم
                Play Integrity وIncognia.

              </p>

            </div>

          </div>


          {/* Location information */}

          <div className="rounded-xl bg-cyan-950/20 border border-cyan-500/20 p-4">

            <div className="flex items-center gap-2">

              <MapPin className="w-5 h-5 text-cyan-400" />

              <h4 className="text-xs font-black text-cyan-300">
                موقع NATAN الحالي
              </h4>

            </div>


            <p className="text-xs text-slate-300 mt-3 leading-relaxed">

              المدينة:

              <strong className="text-white mr-1">
                {selectedCity?.name ||
                  "--"}
              </strong>

              {selectedCity?.nameEn && (
                <>
                  {" "}
                  (
                  {selectedCity.nameEn}
                  )
                </>
              )}

              <br />

              الفروع المحددة:

              <strong className="text-cyan-300 mr-1">
                {selectedDistricts.length > 0
                  ? selectedDistricts.length
                  : "كل الفروع"}
              </strong>

            </p>


            <p className="text-[10px] text-slate-500 mt-3">

              تغيير هذا الموقع يؤثر حاليًا على
              فلترة الشفتات داخل NATAN بعد وصولها
              من API. ربط المدينة مباشرة بمعامل
              في طلب Ninja يحتاج أولًا إلى تحديد
              طريقة إرسال الموقع في API الحقيقي.

            </p>

          </div>


          <div className="rounded-xl bg-purple-950/20 border border-purple-500/20 p-4">

            <p className="text-xs text-purple-200 leading-relaxed">

              <strong>
                الخطوة الحالية:
              </strong>{" "}

              نجعل NATAN يرى البيانات الحقيقية التي يرجعها
              Ninja API، ثم نقارن نموذج البيانات الحقيقي مع نموذج
              NATAN. بعد نجاح القراءة نحدد طريقة التكامل الرسمي
              للمصادقة، بدون تجاوز آليات الحماية.

            </p>

          </div>

        </div>

      )}

    </div>
  );
};