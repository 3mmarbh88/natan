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
  getAutomationStatus(): Promise<NatanAutomationStatus>;
  stopNinjaAutomation(): Promise<NatanAutomationStatus>;
  openAccessibilitySettings(): Promise<void>;
  isAccessibilityEnabled(): Promise<{ enabled: boolean }>;
  getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy: number }>;
  setMockLocation(options: { latitude: number; longitude: number }): Promise<NatanMockLocationStatus>;
  stopMockLocation(): Promise<NatanMockLocationStatus>;
  getMockLocationStatus(): Promise<NatanMockLocationStatus>;
  openMockLocationSettings(): Promise<void>;
}

export const NatanAutomation = registerPlugin<NatanAutomationPlugin>('NatanAutomation');

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
