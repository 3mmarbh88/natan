// src/api/ninjaApi.ts

/**
 * Ninja Driver API
 *
 * Base URL extracted from the supplied Ninja Driver APK.
 *
 * IMPORTANT:
 * This module only uses legitimate Ninja session material supplied
 * by the user/integration. It never fabricates authentication.
 *
 * It intentionally does NOT bypass or fabricate:
 * - Play Integrity
 * - Incognia
 * - HMAC request signatures
 * - device/app integrity checks
 *
 * Authenticated requests must use a legitimate session.
 */

export const NINJA_API_BASE =
  "https://api.samurai.delivery/api/v1";

/**
 * APK-verified booking routes. NATAN uses the Ninja UI automation path for
 * the actual booking because the APK contract also depends on authenticated
 * session/integrity state that must not be fabricated here.
 */
export const NINJA_BOOKING_STARTING_POINTS_PATH =
  "/shifts/booking/starting-points";
export const NINJA_BOOKING_PATH_TEMPLATE =
  "/shifts/booking/{shiftId}/book";

/* =========================================================
 * Generic API response
 * ======================================================= */

export interface NinjaDataResponse<T> {
  page: number;
  pageCount: number;
  perPage: number;
  success: boolean;
  totalElements: number;
  message: string;
  data: T[];
}

/* =========================================================
 * API error
 * ======================================================= */

export class NinjaApiError extends Error {
  status: number;
  data: unknown;

  constructor(
    status: number,
    data: unknown,
  ) {
    const message =
      typeof data === "string"
        ? data
        : JSON.stringify(data);

    super(
      `Ninja API ${status}: ${message}`,
    );

    this.name = "NinjaApiError";
    this.status = status;
    this.data = data;
  }
}

/* =========================================================
 * Shift models
 * ======================================================= */

export interface NinjaShiftBranch {
  id?: number;
  name?: string;
  latitude?: string;
  longitude?: string;
}

export interface NinjaShiftZone {
  id?: number;
  name?: string;
  nameAr?: string;
}

export interface NinjaCapability {
  id?: number;
  name?: string;
}

export interface NinjaPricingRule {
  amount?: number;
  displayableAmount?: number;
  message?: string;
  prediction?: string;
  predictionAr?: string;
  messageKey?: string;
  isVisibleToCaptain?: boolean;
  category?: string;
  categoryColor?: string;
  preconditionMessages?: string[];
  capabilities?: NinjaCapability[];
}

export interface NinjaShift {
  id?: number;

  areaType?: string;

  dayOfWeek?: string;

  startAt?: string;

  finishAt?: string;

  status?: string;

  type?: string;

  canLeave?: boolean;

  canTakeBreak?: boolean;

  remainingBreakMillis?: number;

  branch?: NinjaShiftBranch;

  zone?: NinjaShiftZone;

  pricingRules?: NinjaPricingRule[];
}

/* =========================================================
 * User / device information
 * ======================================================= */

export interface NinjaJwt {
  jwtToken?: string;
  jwtTokenExpiryDate?: string;

  refreshToken?: string;
  refreshTokenExpiryDate?: string;
}

export interface NinjaUserInfo {
  captain?: unknown;

  jwt?: NinjaJwt;

  /**
   * HMAC secret returned as part of the legitimate
   * Ninja user/session information.
   *
   * We do not generate or guess this value.
   */
  hmacSecret?: string;

  showBookShifts?: boolean;

  awaitingOrders?: boolean;

  outsideWorkingArea?: boolean;

  requireAttendance?: boolean;

  incogniaTokenRequired?: boolean;

  incogniaEventsEnabled?: boolean;

  activeShiftSummary?: unknown;
}

/* =========================================================
 * Internal request helper
 * ======================================================= */

/**
 * Generic Ninja API request.
 *
 * This helper is intentionally read-only from the current
 * NATAN integration layer.
 *
 * It does NOT fabricate authentication or integrity headers.
 */
export interface NinjaSession {
  accessToken: string;
  refreshToken?: string;
  deviceId?: string;
  hmacSecret?: string;
}

const NINJA_SESSION_KEY = "natan_ninja_session";

export function getNinjaSession(): NinjaSession | null {
  try {
    const raw = localStorage.getItem(NINJA_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as NinjaSession;
    return session?.accessToken ? session : null;
  } catch {
    return null;
  }
}

export function setNinjaSession(session: NinjaSession | null): void {
  if (!session) {
    localStorage.removeItem(NINJA_SESSION_KEY);
    return;
  }
  localStorage.setItem(NINJA_SESSION_KEY, JSON.stringify(session));
}

async function ninjaRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = getNinjaSession();
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": "en",
  };

  if (session?.accessToken) {
    requestHeaders.Authorization = `Bearer ${session.accessToken}`;
  }
  if (session?.deviceId) {
    requestHeaders["installation-uid"] = session.deviceId;
  }

  const response = await fetch(
    `${NINJA_API_BASE}${path}`,
    {
      ...options,

      headers: {
        ...requestHeaders,
        ...(options.headers || {}),
      },
    },
  );

  const text =
    await response.text();

  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new NinjaApiError(
      response.status,
      data,
    );
  }

  return data as T;
}

/* =========================================================
 * SHIFTS
 * ======================================================= */

/**
 * GET
 * /captains/shifts?pageId=<pageId>
 *
 * Verified from Ninja Driver APK.
 */
export async function getNinjaShifts(
  pageId = 0,
): Promise<
  NinjaDataResponse<NinjaShift>
> {
  return ninjaRequest<
    NinjaDataResponse<NinjaShift>
  >(
    `/captains/shifts?pageId=${encodeURIComponent(
      pageId,
    )}`,
  );
}

/**
 * GET
 * /captains/shifts/active?pageId=<pageId>
 *
 * Verified from Ninja Driver APK.
 */
export async function getNinjaActiveShifts(
  pageId = 0,
): Promise<
  NinjaDataResponse<NinjaShift>
> {
  return ninjaRequest<
    NinjaDataResponse<NinjaShift>
  >(
    `/captains/shifts/active?pageId=${encodeURIComponent(
      pageId,
    )}`,
  );
}

/**
 * GET
 * /captains/shifts/summaries?pageId=<pageId>
 *
 * Verified from Ninja Driver APK.
 */
export async function getNinjaShiftSummaries(
  pageId = 0,
): Promise<unknown> {
  return ninjaRequest(
    `/captains/shifts/summaries?pageId=${encodeURIComponent(
      pageId,
    )}`,
  );
}

/* =========================================================
 * DEVICE / USER
 * ======================================================= */

/**
 * GET
 * /devices/me?isAppOpen=<boolean>
 *
 * Verified from AuthViewModel analysis.
 */
export async function getNinjaDeviceInfo(
  isAppOpen = true,
): Promise<NinjaUserInfo> {
  return ninjaRequest<NinjaUserInfo>(
    `/devices/me?isAppOpen=${String(
      isAppOpen,
    )}`,
  );
}

/* =========================================================
 * SHIFT BOOKING SUPPORT DATA
 * ======================================================= */

/**
 * GET
 * /reasons?type=<type>
 */
export async function getNinjaShiftLeaveReasons(
  type = "CAPTAIN_SHIFT_LEAVE",
): Promise<unknown> {
  const params =
    new URLSearchParams({
      type,
    });

  return ninjaRequest(
    `/reasons?${params.toString()}`,
  );
}

/**
 * GET
 * /shifts/booking/starting-points
 */
export async function getNinjaStartingPoints(
  areaType: string,
  areaId: number,
  pageId = 0,
  pageSize = 20,
): Promise<unknown> {
  const params =
    new URLSearchParams({
      areaType,

      areaId: String(
        areaId,
      ),

      pageId: String(
        pageId,
      ),

      pageSize: String(
        pageSize,
      ),
    });

  return ninjaRequest(
    `${NINJA_BOOKING_STARTING_POINTS_PATH}?${params.toString()}`,
  );
}

/* =========================================================
 * BOOKING
 * ======================================================= */

/**
 * Real booking adapter. The exact booking route must be supplied by a
 * verified Ninja API contract; NATAN deliberately refuses to guess it.
 * Set VITE_NINJA_BOOKING_PATH only after the route is verified.
 */
export async function bookNinjaShift(shiftId: string): Promise<unknown> {
  const session = getNinjaSession();
  if (!session?.accessToken) {
    throw new NinjaApiError(401, "Ninja session is not authenticated");
  }

  const bookingPath =
    (import.meta.env.VITE_NINJA_BOOKING_PATH as string | undefined)?.trim();

  if (!bookingPath) {
    throw new NinjaApiError(
      501,
      "Real Ninja booking route is not configured. NATAN will not guess or fabricate a booking endpoint.",
    );
  }

  const path = bookingPath.replace(
    ":shiftId",
    encodeURIComponent(shiftId),
  );

  return ninjaRequest(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ shiftId }),
  });
}

/* =========================================================
 * BRANCHES
 * ======================================================= */

/**
 * GET
 * /branches
 */
export async function getNinjaBranches(
  pageId = 0,
  latitude: number,
  longitude: number,
): Promise<unknown> {
  const params =
    new URLSearchParams({
      pageId: String(
        pageId,
      ),

      latitude: String(
        latitude,
      ),

      longitude: String(
        longitude,
      ),
    });

  return ninjaRequest(
    `/branches?${params.toString()}`,
  );
}

/* =========================================================
 * ZONES
 * ======================================================= */

/**
 * GET
 * /platform/zones
 */
export async function getNinjaZones(
  pageId = 0,
  latitude: number,
  longitude: number,
): Promise<unknown> {
  const params =
    new URLSearchParams({
      pageId: String(
        pageId,
      ),

      latitude: String(
        latitude,
      ),

      longitude: String(
        longitude,
      ),
    });

  return ninjaRequest(
    `/platform/zones?${params.toString()}`,
  );
}