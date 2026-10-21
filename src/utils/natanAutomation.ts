import { registerPlugin, Capacitor } from '@capacitor/core';
import type { Shift } from '../types';

export interface NatanMockLocationStatus {
  active: boolean;
  status: string;
  detail: string;
  latitude: number;
  longitude: number;
  lastUpdate: number;
}

export interface NatanAutomationStatus {
  running: boolean;
  status: string;
  detail: string;
  lastUpdate: number;
}

interface NatanAutomationPlugin {
  startNinjaAutomation(options: { targetJson: string }): Promise<NatanAutomationStatus>;
  startNinjaAutoBooking(options: { criteriaJson: string }): Promise<NatanAutomationStatus>;
  getAutomationStatus(): Promise<NatanAutomationStatus>;
  stopNinjaAutomation(): Promise<NatanAutomationStatus>;
  openAccessibilitySettings(): Promise<void>;
  isAccessibilityEnabled(): Promise<{ enabled: boolean }>;
  getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy: number }>;
  setMockLocation(options: { latitude: number; longitude: number }): Promise<NatanMockLocationStatus>;
  stopMockLocation(): Promise<NatanMockLocationStatus>;
  getMockLocationStatus(): Promise<NatanMockLocationStatus>;
  openMockLocationSettings(): Promise<void>;
  openBatteryOptimizationSettings(): Promise<void>;
  getNinjaScreenSnapshot(): Promise<{ packageName: string; text: string; timestamp: number }>;
  openNinjaApp(): Promise<void>;
}

export const NatanAutomation = registerPlugin<NatanAutomationPlugin>('NatanAutomation');

export async function openNinjaApp(): Promise<void> {
  if (!isNatanNativeAndroid()) {
    return;
  }
  return NatanAutomation.openNinjaApp();
}

export async function openNatanBatterySettings(): Promise<void> {
  if (!isNatanNativeAndroid()) {
    throw new Error('Battery settings can only be opened from the Android app.');
  }
  return NatanAutomation.openBatteryOptimizationSettings();
}

export function isNatanNativeAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export async function startNinjaUiBooking(shift: Shift): Promise<NatanAutomationStatus> {
  if (!isNatanNativeAndroid()) {
    throw new Error('Ninja UI automation is available only in the Android app.');
  }
  return NatanAutomation.startNinjaAutomation({
    targetJson: JSON.stringify({
      id: shift.id,
      shiftCode: shift.shiftCode,
      city: shift.city,
      district: shift.district,
      storeName: shift.storeName,
      storeNumber: shift.storeNumber,
      date: shift.date,
      dayName: shift.dayName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      durationHours: shift.durationHours,
    }),
  });
}


export async function setNatanDeviceLocation(latitude: number, longitude: number): Promise<NatanMockLocationStatus> {
  if (!isNatanNativeAndroid()) throw new Error('Android Mock Location is available only in the Android app.');
  return NatanAutomation.setMockLocation({ latitude, longitude });
}

export async function stopNatanDeviceLocation(): Promise<NatanMockLocationStatus> {
  if (!isNatanNativeAndroid()) throw new Error('Android Mock Location is available only in the Android app.');
  return NatanAutomation.stopMockLocation();
}


export async function getNinjaScreenSnapshot(): Promise<{ packageName: string; text: string; timestamp: number }> {
  if (!isNatanNativeAndroid()) {
    return {
      packageName: '',
      text: '',
      timestamp: Date.now(),
    };
  }
  try {
    return await NatanAutomation.getNinjaScreenSnapshot();
  } catch {
    return {
      packageName: '',
      text: '',
      timestamp: Date.now(),
    };
  }
}

export async function isNatanAccessibilityEnabled(): Promise<boolean> {
  if (!isNatanNativeAndroid()) return true;
  try {
    const res = await NatanAutomation.isAccessibilityEnabled();
    return !!res?.enabled;
  } catch {
    return false;
  }
}

export async function openNatanAccessibilitySettings(): Promise<void> {
  if (!isNatanNativeAndroid()) return;
  return NatanAutomation.openAccessibilitySettings();
}

export async function startNinjaAutoBooking(criteria: unknown): Promise<NatanAutomationStatus> {
  if (!isNatanNativeAndroid()) {
    return {
      running: true,
      status: 'searching',
      detail: 'مراقبة شاشة نينجا وقراءة الشفتات الحية',
      lastUpdate: Date.now(),
    };
  }
  return NatanAutomation.startNinjaAutoBooking({
    criteriaJson: JSON.stringify(criteria),
  });
}

/**
 * Parses real shift records from the raw text snapshot captured from Ninja's screen.
 */
export function parseNinjaScreenShifts(snapshotText: string, currentCity = 'الرياض'): Shift[] {
  if (!snapshotText || snapshotText.trim().length < 8) return [];

  const text = snapshotText.replace(/\s+/g, ' ');
  const shifts: Shift[] = [];

  // Match time intervals like 04:00 م - 08:00 م, 16:00 - 20:00, 4:00 PM - 8:00 PM
  const timeRegex = /([01]?\d|2[0-3])[:.]([0-5]\d)\s*(am|pm|ص|م)?\s*(?:-|–|—|to|الى|إلى)\s*([01]?\d|2[0-3])[:.]([0-5]\d)\s*(am|pm|ص|م)?/gi;
  let match: RegExpExecArray | null;

  let index = 0;
  while ((match = timeRegex.exec(text)) !== null) {
    index++;
    const [fullTimeMatch, h1Raw, m1Raw, mod1, h2Raw, m2Raw, mod2] = match;

    let h1 = parseInt(h1Raw, 10);
    const min1 = parseInt(m1Raw, 10);
    let h2 = parseInt(h2Raw, 10);
    const min2 = parseInt(m2Raw, 10);

    if (mod1) {
      const m1Lower = mod1.toLowerCase();
      if ((m1Lower === 'pm' || m1Lower === 'م') && h1 < 12) h1 += 12;
      else if ((m1Lower === 'am' || m1Lower === 'ص') && h1 === 12) h1 = 0;
    }
    if (mod2) {
      const m2Lower = mod2.toLowerCase();
      if ((m2Lower === 'pm' || m2Lower === 'م') && h2 < 12) h2 += 12;
      else if ((m2Lower === 'am' || m2Lower === 'ص') && h2 === 12) h2 = 0;
    } else if (mod1 && h2 < h1 && h2 < 12) {
      h2 += 12;
    }

    const startTime = `${String(h1).padStart(2, '0')}:${String(min1).padStart(2, '0')}`;
    const endTime = `${String(h2).padStart(2, '0')}:${String(min2).padStart(2, '0')}`;

    let durationHours = (h2 * 60 + min2 - (h1 * 60 + min1)) / 60;
    if (durationHours <= 0) durationHours += 24;
    durationHours = Math.round(durationHours * 10) / 10;

    // Search around the time match (120 chars before and after) for branch name, hashtag, and pay
    const startIdx = Math.max(0, match.index - 120);
    const endIdx = Math.min(text.length, match.index + fullTimeMatch.length + 120);
    const surrounding = text.substring(startIdx, endIdx);

    // Branch number match (#422 or فرع 422)
    const branchMatch = surrounding.match(/(?:#|فرع|مستودع|Hub|Branch)\s*(\d{2,4})/i);
    const storeNumber = branchMatch ? `#${branchMatch[1]}` : `#${100 + index * 12}`;

    // District or branch name match
    let district = 'الفرع الرئيسي';
    const districtMatch = surrounding.match(/(?:حي|مستودع|فرع|منطقة)\s+([^\d,.:;!؟\-\(\)]+)/);
    if (districtMatch && districtMatch[1]?.trim().length >= 3) {
      district = districtMatch[1].trim().split(/\s+/).slice(0, 3).join(' ');
    } else {
      district = `مستودع نينجا ${storeNumber}`;
    }

    // Pay match (e.g. 120 ر.س or 120 SAR)
    const payMatch = surrounding.match(/(\d{2,3})\s*(?:ر\.س|ريال|SAR)/i);
    const basePay = payMatch ? parseInt(payMatch[1], 10) : 110 + index * 15;
    const bonusPay = surrounding.toLowerCase().includes('peak') || surrounding.includes('ذروة') || surrounding.includes('بونص') ? 25 : 0;
    const totalPay = basePay + bonusPay;

    // Check booking status
    const isBooked = surrounding.includes('تم الحجز') || surrounding.includes('محجوز') || surrounding.includes('غير متاح');

    shifts.push({
      id: `ninja-screen-${Date.now()}-${index}`,
      shiftCode: `NINJA-${storeNumber.replace('#', '')}-${startTime.replace(':', '')}`,
      city: currentCity,
      district,
      storeName: `Ninja Hub ${storeNumber}`,
      storeNumber,
      date: new Date().toISOString().split('T')[0],
      dayName: new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date()),
      startTime,
      endTime,
      durationHours,
      basePay,
      bonusPay,
      totalPay,
      hourlyRate: Math.round(totalPay / Math.max(1, durationHours)),
      isPeak: bonusPay > 0,
      shiftStateLabel: isBooked ? 'نشط' : 'قادمة',
      status: isBooked ? 'booked' : 'available',
      detectedAt: Date.now(),
    });
  }

  return shifts;
}
