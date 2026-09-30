import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Minus, Plus, MapPin, Navigation, Loader2, Smartphone, Square, Settings2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { NatanAutomation } from '../utils/natanAutomation';

type LatLng = { lat: number; lng: number };

interface LocationMapPickerProps {
  value?: LatLng | null;
  onChange: (value: LatLng) => void;
  isAr?: boolean;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
const DEFAULT_CENTER: LatLng = { lat: 26.4207, lng: 50.0888 };

function clampLat(lat: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function project({ lat, lng }: LatLng, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const sin = Math.sin((clampLat(lat) * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function unproject(x: number, y: number, zoom: number): LatLng {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat: clampLat(lat), lng };
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({ value, onChange, isAr = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const centerRef = useRef<LatLng>(value || DEFAULT_CENTER);
  const [center, setCenter] = useState<LatLng>(value || DEFAULT_CENTER);
  const [zoom, setZoom] = useState(11);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [locating, setLocating] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mocking, setMocking] = useState(false);
  const [mockActive, setMockActive] = useState(false);
  const [mockMessage, setMockMessage] = useState('');

  useEffect(() => {
    if (!value) return;
    centerRef.current = value;
    setCenter(value);
  }, [value?.lat, value?.lng]);

  const tiles = useMemo(() => {
    const projected = project(center, zoom);
    const tileX = Math.floor(projected.x / TILE_SIZE);
    const tileY = Math.floor(projected.y / TILE_SIZE);
    const maxTile = 2 ** zoom;
    const items: Array<{ x: number; y: number; left: number; top: number; key: string }> = [];
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const rawX = tileX + dx;
        const y = tileY + dy;
        if (y < 0 || y >= maxTile) continue;
        const x = ((rawX % maxTile) + maxTile) % maxTile;
        items.push({
          x,
          y,
          left: (tileX + dx) * TILE_SIZE - projected.x,
          top: (tileY + dy) * TILE_SIZE - projected.y,
          key: `${zoom}-${rawX}-${y}`,
        });
      }
    }
    return items;
  }, [center, zoom]);

  const moveByPixels = useCallback((dx: number, dy: number) => {
    const p = project(centerRef.current, zoom);
    const next = unproject(p.x - dx, p.y - dy, zoom);
    centerRef.current = next;
    setCenter(next);
  }, [zoom]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = event.clientX - lastPointRef.current.x;
    const dy = event.clientY - lastPointRef.current.y;
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    moveByPixels(dx, dy);
    setDragOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
    setDragOffset({ x: 0, y: 0 });
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (Math.abs(dragOffset.x) + Math.abs(dragOffset.y) > 8) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const p = project(center, zoom);
    const worldX = p.x + (event.clientX - rect.left - rect.width / 2);
    const worldY = p.y + (event.clientY - rect.top - rect.height / 2);
    const next = unproject(worldX, worldY, zoom);
    onChange(next);
    centerRef.current = next;
    setCenter(next);
  };

  const zoomAtCenter = (nextZoom: number) => {
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom)));
  };

  const locateMe = async () => {
    setLocating(true);
    setMapError(false);

    try {
      if (Capacitor.getPlatform() === 'android') {
        const position = await NatanAutomation.getCurrentLocation();
        const next = { lat: position.latitude, lng: position.longitude };
        onChange(next);
        centerRef.current = next;
        setCenter(next);
        setZoom(15);
        setLocating(false);
        return;
      }

      if (!navigator.geolocation) throw new Error('Geolocation unavailable');
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const next = { lat: position.coords.latitude, lng: position.coords.longitude };
            onChange(next);
            centerRef.current = next;
            setCenter(next);
            setZoom(15);
            resolve();
          },
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
        );
      });
    } catch {
      setMapError(true);
    } finally {
      setLocating(false);
    }
  };

  const applyToAndroid = async () => {
    if (Capacitor.getPlatform() !== 'android') {
      setMockMessage(isAr ? 'ميزة تغيير موقع الجهاز متاحة في نسخة Android فقط.' : 'Device location control is available on Android only.');
      return;
    }
    setMocking(true);
    setMockMessage('');
    try {
      const result = await NatanAutomation.setMockLocation({
        latitude: Number(selected.lat.toFixed(6)),
        longitude: Number(selected.lng.toFixed(6)),
      });
      setMockActive(result.active);
      setMockMessage(result.detail || (isAr ? 'تم إرسال الموقع إلى Android.' : 'Location sent to Android.'));
    } catch (error) {
      setMockActive(false);
      setMockMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setMocking(false);
    }
  };

  const openMockSettings = async () => {
    try {
      await NatanAutomation.openMockLocationSettings();
      setMockMessage(isAr
        ? 'من خيارات المطور اختر NATAN كتطبيق Mock Location، ثم ارجع واضغط تطبيق الموقع على الهاتف.'
        : 'In Developer Options, select NATAN as the Mock Location app, then return and apply the location.');
    } catch (error) {
      setMockMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const stopMock = async () => {
    try {
      const result = await NatanAutomation.stopMockLocation();
      setMockActive(false);
      setMockMessage(result.detail || (isAr ? 'تم إيقاف الموقع الوهمي والعودة للموقع الحقيقي.' : 'Mock location stopped.'));
    } catch (error) {
      setMockMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const selected = value || center;
  const selectedPx = project(selected, zoom);
  const centerPx = project(center, zoom);
  const markerLeft = selectedPx.x - centerPx.x;
  const markerTop = selectedPx.y - centerPx.y;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl">
      <div
        ref={containerRef}
        className="relative h-[390px] sm:h-[460px] overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing bg-slate-900"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleMapClick}
      >
        <div className="absolute inset-0">
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
              alt=""
              draggable={false}
              onError={() => setMapError(true)}
              className="absolute w-[256px] h-[256px] max-w-none"
              style={{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)` }}
            />
          ))}
        </div>

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/20" />

        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none transition-transform"
          style={{ transform: `translate(${markerLeft}px, ${markerTop}px) translate(-50%, -100%)` }}
        >
          <div className="relative flex flex-col items-center">
            <div className="w-11 h-11 rounded-full bg-cyan-500/20 border border-cyan-300/40 backdrop-blur-sm flex items-center justify-center shadow-[0_0_28px_rgba(34,211,238,.45)]">
              <MapPin className="w-8 h-8 text-cyan-300 fill-cyan-500/40" />
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,.8)] -mt-1" />
          </div>
        </div>

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-3 pointer-events-none">
          <div className="rounded-xl border border-white/15 bg-slate-950/80 backdrop-blur-xl px-3 py-2 text-xs text-white shadow-xl">
            <div className="font-black flex items-center gap-2">
              <Navigation className="w-4 h-4 text-cyan-300" />
              {isAr ? 'اختيار نقطة اللوكيشن' : 'Choose location point'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isAr ? 'اضغط على الخريطة لوضع العلامة' : 'Tap the map to place the marker'}
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button type="button" onClick={() => zoomAtCenter(zoom + 1)} className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-950/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-xl hover:bg-slate-800 active:scale-95 shadow-lg">
              <Plus className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => zoomAtCenter(zoom - 1)} className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-950/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-xl hover:bg-slate-800 active:scale-95 shadow-lg">
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="absolute bottom-4 right-4 z-10 min-h-[44px] rounded-xl border border-cyan-400/40 bg-slate-950/95 backdrop-blur-xl px-4 py-2.5 text-xs font-black text-cyan-200 flex items-center gap-2 shadow-xl active:scale-95 disabled:opacity-60"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
          {isAr ? 'استخدام موقعي الحالي' : 'Use my current location'}
        </button>

        {mapError && (
          <div className="absolute bottom-4 left-4 max-w-[260px] rounded-xl border border-amber-400/20 bg-slate-950/90 backdrop-blur-xl px-3 py-2 text-[10px] text-amber-200">
            {isAr
              ? 'تعذر الوصول إلى الخرائط أو GPS. يمكنك اختيار النقطة يدويًا بعد تحميل الخريطة.'
              : 'Map or GPS access is unavailable. You can still choose a point manually if tiles load.'}
          </div>
        )}

        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-slate-700 pointer-events-none">
          © OpenStreetMap contributors
        </div>
      </div>

      <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button type="button" onClick={applyToAndroid} disabled={mocking} className="min-h-[48px] rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-3 text-xs sm:text-sm font-black text-cyan-200 flex items-center justify-center gap-2 hover:bg-cyan-500/25 active:scale-95 shadow-md shadow-cyan-500/10 disabled:opacity-60">
            {mocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
            {isAr ? 'تطبيق الموقع على الهاتف' : 'Apply to phone'}
          </button>
          <button type="button" onClick={openMockSettings} className="min-h-[48px] rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-xs sm:text-sm font-black text-amber-200 flex items-center justify-center gap-2 hover:bg-amber-500/25 active:scale-95 shadow-md shadow-amber-500/10">
            <Settings2 className="w-4 h-4" />
            {isAr ? 'إعداد Mock Location' : 'Mock Location setup'}
          </button>
          <button type="button" onClick={stopMock} disabled={!mockActive} className="min-h-[48px] rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 text-xs sm:text-sm font-black text-slate-200 flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-95 disabled:opacity-40">
            <Square className="w-4 h-4" />
            {isAr ? 'إيقاف الموقع' : 'Stop location'}
          </button>
        </div>
        {mockMessage && (
          <div className={`rounded-xl border px-3 py-2 text-[10px] ${mockActive ? 'border-emerald-400/20 bg-emerald-500/5 text-emerald-200' : 'border-amber-400/20 bg-amber-500/5 text-amber-200'}`}>
            {mockMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="text-[10px] text-slate-500">Latitude</div>
          <div className="mt-1 text-sm font-black text-white tabular-nums">{selected.lat.toFixed(6)}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="text-[10px] text-slate-500">Longitude</div>
          <div className="mt-1 text-sm font-black text-white tabular-nums">{selected.lng.toFixed(6)}</div>
        </div>
        </div>
      </div>
    </div>
  );
};
