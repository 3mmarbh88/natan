import { Shift } from '../types';

/**
 * Converts Arabic numeral characters (٠-٩) to English standard digits (0-9)
 */
export function convertArabicToEnglishDigits(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString());
}

/**
 * Parses time string (e.g. '06:00', '١٢:٠١ م', '٠٧:٠٠ ص', '14:30', '11:00 PM') into minutes from start of day (0-1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const normalized = convertArabicToEnglishDigits(timeStr).trim();
  const isPM = normalized.includes('م') || normalized.toLowerCase().includes('pm');
  const isAM = normalized.includes('ص') || normalized.toLowerCase().includes('am');

  const match = normalized.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM) {
    if (hours < 12) hours += 12;
  } else if (isAM) {
    if (hours === 12) hours = 0;
  }

  return hours * 60 + minutes;
}

export interface ShiftTimeWindow {
  startMinutes: number;
  endMinutes: number; // if end <= start, end is treated as next day (+ 1440)
}

export function getShiftTimeWindow(shift: { startTime: string; endTime: string }): ShiftTimeWindow {
  const startMinutes = parseTimeToMinutes(shift.startTime);
  let endMinutes = parseTimeToMinutes(shift.endTime);

  // If shift ends at or before start (e.g. 23:00 to 05:00 or 12:01 م to 12:00 ص), it spans midnight
  if (endMinutes <= startMinutes) {
    endMinutes += 1440;
  }

  return { startMinutes, endMinutes };
}

/**
 * Checks if two shifts overlap in time on the same day/date.
 */
export function doShiftsConflict(
  shiftA: { startTime: string; endTime: string; date?: string; dayName?: string },
  shiftB: { startTime: string; endTime: string; date?: string; dayName?: string }
): boolean {
  // If dates are specified and different, they are on different days
  if (shiftA.date && shiftB.date && shiftA.date !== shiftB.date) {
    return false;
  }

  // Check day name if available (e.g. "الأربعاء" vs "الخميس")
  if (shiftA.dayName && shiftB.dayName) {
    const cleanDayA = shiftA.dayName.split(' ')[0];
    const cleanDayB = shiftB.dayName.split(' ')[0];
    if (cleanDayA && cleanDayB && cleanDayA !== cleanDayB) {
      return false;
    }
  }

  const windowA = getShiftTimeWindow(shiftA);
  const windowB = getShiftTimeWindow(shiftB);

  // Overlap between [s1, e1] and [s2, e2]:
  return Math.max(windowA.startMinutes, windowB.startMinutes) < Math.min(windowA.endMinutes, windowB.endMinutes);
}

/**
 * Finds the first captured/booked shift that conflicts with targetShift.
 */
export function findConflictingShift(
  targetShift: Shift,
  bookedShifts: Shift[]
): Shift | null {
  for (const booked of bookedShifts) {
    if (doShiftsConflict(targetShift, booked)) {
      return booked;
    }
  }
  return null;
}
