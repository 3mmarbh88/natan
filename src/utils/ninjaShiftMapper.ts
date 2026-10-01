// src/utils/ninjaShiftMapper.ts

import type {
  NinjaShift,
} from "../api/ninjaApi";

import type { Shift } from "../types";

/**
 * Convert HH:mm:ss / HH:mm into minutes.
 */
function timeToMinutes(
  value?: string,
): number | null {
  if (!value) {
    return null;
  }

  const parts = value
    .split(":")
    .map(Number);

  if (
    parts.length < 2 ||
    parts.some(
      (part) => Number.isNaN(part),
    )
  ) {
    return null;
  }

  const hours = parts[0];
  const minutes = parts[1];

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Convert Ninja time into NATAN format.
 *
 * Example:
 * 08:30:00 -> 08:30
 */
function normalizeTime(
  value?: string,
): string {
  if (!value) {
    return "--:--";
  }

  const parts =
    value.split(":");

  if (parts.length >= 2) {
    return `${parts[0].padStart(
      2,
      "0",
    )}:${parts[1].padStart(
      2,
      "0",
    )}`;
  }

  return value;
}

/**
 * Calculate shift duration in hours.
 *
 * Supports shifts crossing midnight.
 */
function calculateDurationHours(
  startAt?: string,
  finishAt?: string,
): number {
  const start =
    timeToMinutes(startAt);

  const finish =
    timeToMinutes(finishAt);

  if (
    start === null ||
    finish === null
  ) {
    return 0;
  }

  let difference =
    finish - start;

  if (difference < 0) {
    difference += 24 * 60;
  }

  return Number(
    (difference / 60).toFixed(2),
  );
}

/**
 * Safely convert a value to string.
 */
function safeString(
  value: unknown,
  fallback = "-",
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
}

/**
 * Map Ninja status to NATAN status.
 *
 * Only statuses that can be reasonably mapped
 * are handled explicitly.
 */
function mapStatus(
  status?: string,
): Shift["status"] {
  if (!status) {
    return "available";
  }

  const normalized =
    status
      .trim()
      .toUpperCase();

  switch (normalized) {
    case "BOOKED":
    case "RESERVED":
    case "CURRENTLY_BOOKED":
      return "booked";

    case "MISSED":
      return "missed";

    case "EXPIRED":
    case "FINISHED":
    case "COMPLETED":
      return "expired";

    case "AVAILABLE":
    case "OPEN":
    case "UPCOMING":
    default:
      return "available";
  }
}

/**
 * Convert Ninja dayOfWeek to readable label.
 */
function mapDayName(
  dayOfWeek?: string,
): string {
  if (!dayOfWeek) {
    return "-";
  }

  const normalized =
    dayOfWeek
      .trim()
      .toUpperCase();

  const days: Record<
    string,
    string
  > = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",

    MON: "Monday",
    TUE: "Tuesday",
    WED: "Wednesday",
    THU: "Thursday",
    FRI: "Friday",
    SAT: "Saturday",
    SUN: "Sunday",
  };

  return (
    days[normalized] ??
    dayOfWeek
  );
}

/**
 * Generate NATAN's string ID.
 */
function mapId(
  id?: number,
): string {
  if (
    id === undefined ||
    id === null
  ) {
    return `ninja-${Date.now()}`;
  }

  return String(id);
}

/**
 * Convert Ninja Shift into NATAN Shift.
 */
export function mapNinjaShiftToNatanShift(
  ninjaShift: NinjaShift,
): Shift {
  const startTime =
    normalizeTime(
      ninjaShift.startAt,
    );

  const endTime =
    normalizeTime(
      ninjaShift.finishAt,
    );

  const durationHours =
    calculateDurationHours(
      ninjaShift.startAt,
      ninjaShift.finishAt,
    );

  const zoneName =
    safeString(
      ninjaShift.zone?.name,
    );

  const zoneNameAr =
    safeString(
      ninjaShift.zone?.nameAr,
    );

  const branchName =
    safeString(
      ninjaShift.branch?.name,
    );

  /*
   * The extracted Ninja Shift.Branch model
   * does not contain a city field.
   *
   * Therefore we do not invent the city.
   */
  const district =
    zoneName !== "-"
      ? zoneName
      : zoneNameAr !== "-"
        ? zoneNameAr
        : "-";

  const storeName =
    branchName !== "-"
      ? branchName
      : "Ninja Branch";

  const status =
    mapStatus(
      ninjaShift.status,
    );

  const dayName =
    mapDayName(
      ninjaShift.dayOfWeek,
    );

  /*
   * Only mark the NATAN label as "ظ†ط´ط·"
   * when the Ninja status is explicitly mapped
   * to booked.
   *
   * Otherwise leave it as "ظ‚ط§ط¯ظ…ط©" for the
   * existing NATAN interface.
   */
  const shiftStateLabel = status === "booked" ? "نشط" : "قادمة";

  /*
   * IMPORTANT:
   *
   * The APK exposes:
   *
   * pricingRules[].amount
   * pricingRules[].displayableAmount
   *
   * but the extracted model does NOT prove that
   * either value means:
   *
   * basePay
   * bonusPay
   * totalPay
   *
   * Therefore we do NOT convert those values into
   * NATAN earnings.
   *
   * The original Ninja pricingRules remain available
   * on the API model and can be analyzed separately
   * once we obtain real JSON responses.
   */
  const basePay = 0;

  const bonusPay = 0;

  const totalPay = 0;

  const hourlyRate = 0;

  const result: Shift = {
    id: mapId(
      ninjaShift.id,
    ),

    shiftCode:
      ninjaShift.id !==
      undefined
        ? `NINJA-${ninjaShift.id}`
        : undefined,

    /*
     * City is intentionally unknown.
     */
    city: "-",

    district,

    storeName,

    /*
     * Shift.Branch.id is the confirmed
     * branch identifier.
     *
     * NATAN currently calls this storeNumber,
     * so we expose the identifier there without
     * claiming that it is a human store number.
     */
    storeNumber:
      ninjaShift.branch
        ?.id !== undefined
        ? String(
            ninjaShift.branch.id,
          )
        : undefined,

    /*
     * Ninja Shift contains dayOfWeek,
     * startAt and finishAt, but the extracted
     * model does not contain a calendar date.
     */
    date: "",

    dayName,

    startTime,

    endTime,

    durationHours,

    basePay,

    bonusPay,

    totalPay,

    hourlyRate,

    /*
     * No confirmed isPeak field exists
     * in the extracted Ninja Shift model.
     */
    isPeak: false,

    shiftStateLabel,

    status,

    detectedAt:
      Date.now(),
  };

  return result;
}

/**
 * Convert an array of Ninja shifts.
 */
export function mapNinjaShiftsToNatanShifts(
  ninjaShifts: NinjaShift[],
): Shift[] {
  if (
    !Array.isArray(
      ninjaShifts,
    )
  ) {
    return [];
  }

  return ninjaShifts
    .filter(
      (
        shift,
      ): shift is NinjaShift =>
        shift !== null &&
        typeof shift ===
          "object",
    )
    .map(
      mapNinjaShiftToNatanShift,
    );
}

/**
 * Remove duplicate shifts by ID.
 */
export function deduplicateNatanShifts(
  shifts: Shift[],
): Shift[] {
  const map =
    new Map<
      string,
      Shift
    >();

  for (const shift of shifts) {
    if (
      !map.has(shift.id)
    ) {
      map.set(
        shift.id,
        shift,
      );
    }
  }

  return Array.from(
    map.values(),
  );
}

/**
 * Convert a Ninja API response
 * into NATAN shifts.
 */
export function convertNinjaResponse(
  response: {
    data?: NinjaShift[];
  },
): Shift[] {
  const ninjaShifts =
    Array.isArray(
      response?.data,
    )
      ? response.data
      : [];

  const mapped =
    mapNinjaShiftsToNatanShifts(
      ninjaShifts,
    );

  return deduplicateNatanShifts(
    mapped,
  );
}
