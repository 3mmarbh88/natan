import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Minus, Plus, MapPin, Navigation, Loader2, Smartphone, Square, Settings2, ExternalLink, Compass, Layers, CheckCircle2, Crosshair, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { NatanAutomation, openNinjaApp } from '../utils/natanAutomation';
import { SAUDI_CITIES, SAUDI_CITY_COORDINATES } from '../data/saudiCities';

type LatLng = { lat: number; lng: number };

interface LocationMapPickerProps {
  value?: LatLng | null;
  onChange: (value: LatLng) => void;
  isAr?: boolean;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
const DEFAULT_CENTER: LatLng = { lat: 24.7136, lng: 46.6753 }; // Riyadh center

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
  const [zoom, setZoom] = useState(13);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [locating, setLocating] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mocking, setMocking] = useState(false);
  const [mockActive, setMockActive] = useState(false);
  const [mockMessage, setMockMessage] = useState('');
  const [mapTheme, setMapTheme] = useState<'dark' | 'standard' | 'satellite'>('dark');
  const [autoBroadcast, setAutoBroadcast] = useState(true);

  // Multi-touch gestures (two-finger pinch to zoom)
  const touchStateRef = useRef<{
    initialDist: number;
    initialZoom: number;
    lastDist: number;
    isPinching: boolean;
  }>({
    initialDist: 0,
    initialZoom: 13,
    lastDist: 0,
    isPinching: false,
  });

  const lastTapTimeRef = useRef(0);

  useEffect(() => {
    if (!value) return;
    centerRef.current = value;
    setCenter(value);
  }, [value?.lat, value?.lng]);

  // Compute visible slippy map tiles
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

  // Send GPS to Android system instantly
  const syncLocationToAndroid = useCallback(async (coords: LatLng) => {
    if (Capacitor.getPlatform() !== 'android') {
      setMockMessage(
        isAr
          ? `📍 تم تحديد النقطة (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}). في تطبيق Android يتم بثها فورياً لنظام الهاتف وتطبيق نينجا.`
          : `📍 Coordinates selected (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}). On Android, this changes the whole device GPS.`
      );
      return;
    }
    setMocking(true);
    try {
      const result = await NatanAutomation.setMockLocation({
        latitude: Number(coords.lat.toFixed(6)),
        longitude: Number(coords.lng.toFixed(6)),
      });
      setMockActive(result.active);
      setMockMessage(
        result.detail ||
          (isAr
            ? `🟢 تم قفل وتثبيت موقع الهاتف بالكامل على (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})! افتح نينجا الآن.`
            : `🟢 Device GPS locked to (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})! Open Ninja now.`)
      );
    } catch (error) {
      setMockActive(false);
      setMockMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setMocking(false);
    }
  }, [isAr]);

  // Set new coordinate and auto-broadcast if enabled
  const updateSelectedPoint = useCallback((coords: LatLng) => {
    onChange(coords);
    centerRef.current = coords;
    setCenter(coords);
    if (autoBroadcast) {
      void syncLocationToAndroid(coords);
    }
  }, [onChange, autoBroadcast, syncLocationToAndroid]);

  // Mouse / Pointer handlers
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return; // Handled by touch events for pinch-to-zoom
    draggingRef.current = true;
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    if (!draggingRef.current) return;
    const dx = event.clientX - lastPointRef.current.x;
    const dy = event.clientY - lastPointRef.current.y;
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    moveByPixels(dx, dy);
    setDragOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    draggingRef.current = false;
    setDragOffset({ x: 0, y: 0 });
  };

  // Two-Finger Pinch to Zoom and Touch Navigation
  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Two fingers: Start Pinch-To-Zoom
      const dist = getTouchDist(e.touches);
      touchStateRef.current = {
        initialDist: dist,
        initialZoom: zoom,
        lastDist: dist,
        isPinching: true,
      };
      draggingRef.current = false;
    } else if (e.touches.length === 1) {
      // Single finger drag
      touchStateRef.current.isPinching = false;
      draggingRef.current = true;
      lastPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setDragOffset({ x: 0, y: 0 });

      // Double tap detector
      const now = Date.now();
      if (now - lastTapTimeRef.current < 320) {
        // Double tap: Zoom in
        zoomAtCenter(zoom + 1);
        lastTapTimeRef.current = 0;
      } else {
        lastTapTimeRef.current = now;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStateRef.current.isPinching) {
      const dist = getTouchDist(e.touches);
      if (touchStateRef.current.initialDist > 0 && dist > 0) {
        const diff = dist - touchStateRef.current.lastDist;
        if (Math.abs(diff) > 28) {
          if (diff > 0 && zoom < MAX_ZOOM) {
            setZoom((z) => Math.min(MAX_ZOOM, z + 1));
            touchStateRef.current.lastDist = dist;
          } else if (diff < 0 && zoom > MIN_ZOOM) {
            setZoom((z) => Math.max(MIN_ZOOM, z - 1));
            touchStateRef.current.lastDist = dist;
          }
        }
      }
    } else if (e.touches.length === 1 && draggingRef.current) {
      const dx = e.touches[0].clientX - lastPointRef.current.x;
      const dy = e.touches[0].clientY - lastPointRef.current.y;
      lastPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      moveByPixels(dx, dy);
      setDragOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current.isPinching = false;
    draggingRef.current = false;
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomAtCenter(zoom + 1);
    } else if (e.deltaY > 0) {
      zoomAtCenter(zoom - 1);
    }
  };

  // Map Click to Teleport / Pick Point
  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (Math.abs(dragOffset.x) + Math.abs(dragOffset.y) > 10) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const p = project(center, zoom);
    const worldX = p.x + (event.clientX - rect.left - rect.width / 2);
    const worldY = p.y + (event.clientY - rect.top - rect.height / 2);
    const next = unproject(worldX, worldY, zoom);
    updateSelectedPoint(next);
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
        updateSelectedPoint(next);
        setZoom(16);
        setLocating(false);
        return;
      }

      if (!navigator.geolocation) throw new Error('Geolocation unavailable');
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const next = { lat: position.coords.latitude, lng: position.coords.longitude };
            updateSelectedPoint(next);
            setZoom(16);
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

  const openMockSettings = async () => {
    try {
      await NatanAutomation.openMockLocationSettings();
      setMockMessage(
        isAr
          ? 'من خيارات المطور اختر NATAN كتطبيق تحديد الموقع الوهمي، ثم ارجع هنا وسيتم البث فورياً.'
          : 'In Developer Options, select NATAN as the Mock Location app, then return here.'
      );
    } catch (error) {
      setMockMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const stopMock = async () => {
    try {
      const result = await NatanAutomation.stopMockLocation();
      setMockActive(false);
      setMockMessage(isAr ? 'تم إيقاف تثبيت الموقع والعودة لموقع GPS الفعلي للهاتف.' : 'GPS location lock released.');
    } catch (error) {
      setMockMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const jumpToCity = (cityId: string) => {
    const coords = SAUDI_CITY_COORDINATES[cityId];
    if (!coords) return;
    updateSelectedPoint(coords);
    setZoom(14);
  };

  const handleLaunchNinja = async () => {
    try {
      await openNinjaApp();
    } catch (e) {
      setMockMessage(isAr ? 'تأكد من تثبيت تطبيق Ninja على هذا الهاتف.' : 'Ensure Ninja app is installed.');
    }
  };

  const selected = value || center;
  const selectedPx = project(selected, zoom);
  const centerPx = project(center, zoom);
  const markerLeft = selectedPx.x - centerPx.x;
  const markerTop = selectedPx.y - centerPx.y;

  // Tile source based on theme
  const getTileUrl = (x: number, y: number, z: number) => {
    if (mapTheme === 'satellite') {
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
    }
    return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-2xl space-y-0">
      {/* Top Header: Saudi Quick Jump & Auto-Sync Switch */}
      <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[11px] font-black text-cyan-400 whitespace-nowrap shrink-0 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            {isAr ? 'انتقال سريع:' : 'Quick Jump:'}
          </span>
          {SAUDI_CITIES.map((c) => {
            const coords = SAUDI_CITY_COORDINATES[c.id];
            const isCurrent = coords && value && Math.hypot(coords.lat - value.lat, coords.lng - value.lng) < 0.18;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => jumpToCity(c.id)}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-sm shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                <span>🇸🇦 {isAr ? c.name : c.nameEn}</span>
              </button>
            );
          })}
        </div>

        {/* Live Auto-Sync Switch */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAutoBroadcast(!autoBroadcast)}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              autoBroadcast
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={isAr ? 'البث التلقائي: أي لمسة على الخريطة تغير لوكيشن الهاتف بالكامل فورياً' : 'Auto-sync GPS on any map tap'}
          >
            <span className={`w-2 h-2 rounded-full ${autoBroadcast ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{isAr ? 'بث تلقائي فوري للـ GPS' : 'Instant Auto-GPS'}</span>
          </button>

          {/* Theme switcher */}
          <div className="flex bg-slate-850 bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setMapTheme('dark')}
              className={`px-2 py-1 rounded-md transition-all ${mapTheme === 'dark' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              {isAr ? 'داكن Pro' : 'Dark'}
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('satellite')}
              className={`px-2 py-1 rounded-md transition-all ${mapTheme === 'satellite' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              {isAr ? 'أقمار' : 'Satellite'}
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('standard')}
              className={`px-2 py-1 rounded-md transition-all ${mapTheme === 'standard' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              {isAr ? 'عادي' : 'Streets'}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Map Canvas with Touch Pinch-To-Zoom */}
      <div
        ref={containerRef}
        className="relative h-[380px] sm:h-[480px] overflow-hidden select-none touch-none cursor-crosshair bg-slate-950"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onClick={handleMapClick}
      >
        {/* Slippy Tile Container */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            mapTheme === 'dark'
              ? 'filter invert-[92%] hue-rotate-[185deg] contrast-[1.12] brightness-[0.88] saturate-[1.2]'
              : ''
          }`}
        >
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={getTileUrl(tile.x, tile.y, zoom)}
              alt=""
              draggable={false}
              onError={() => setMapError(true)}
              className="absolute w-[256px] h-[256px] max-w-none pointer-events-none"
              style={{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)` }}
            />
          ))}
        </div>

        {/* Ambient Dark Grid Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/40" />

        {/* Futuristic Target Reticle Marker at Selected Coordinates */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none transition-transform duration-200"
          style={{ transform: `translate(${markerLeft}px, ${markerTop}px) translate(-50%, -100%)` }}
        >
          <div className="relative flex flex-col items-center">
            {/* Coordinates Badge */}
            <div className="mb-1.5 px-2.5 py-1 rounded-full bg-slate-950/95 border border-cyan-400/60 text-cyan-200 font-mono text-[10px] font-black shadow-lg backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</span>
            </div>

            {/* Glowing Crosshair Pin */}
            <div className="relative w-12 h-12 rounded-full bg-cyan-500/20 border-2 border-cyan-300 backdrop-blur-md flex items-center justify-center shadow-[0_0_35px_rgba(34,211,238,0.7)] animate-pulse">
              <Crosshair className="w-6 h-6 text-cyan-300" />
            </div>
            {/* Ground Point */}
            <div className="w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,1)] -mt-1.5 border border-white ring-4 ring-cyan-500/30" />
          </div>
        </div>

        {/* Top Floating Guide & Controls */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2.5 pointer-events-none">
          <div className="rounded-xl border border-white/20 bg-slate-950/90 backdrop-blur-xl px-3.5 py-2.5 text-xs text-white shadow-2xl max-w-[260px] sm:max-w-sm pointer-events-auto">
            <div className="font-black flex items-center gap-2 text-cyan-300">
              <Navigation className="w-4 h-4 fill-cyan-400/30" />
              <span>{isAr ? 'تثبيت اللوكيشن الفوري (Pinch & Tap)' : 'Instant GPS Lock'}</span>
            </div>
            <div className="text-[10px] text-slate-300 mt-1 leading-relaxed">
              {isAr
                ? '👆 اضغط على أي نقطة لتغيير موقع الهاتف بالكامل فوراً. استخدم إصبعين للتكبير والتصغير 🔍.'
                : '👆 Tap anywhere to change device GPS instantly. Pinch with 2 fingers to zoom 🔍.'}
            </div>
          </div>

          {/* Zoom Buttons with Zoom Level Badge */}
          <div className="flex flex-col gap-1.5 pointer-events-auto items-end">
            <button
              type="button"
              onClick={() => zoomAtCenter(zoom + 1)}
              aria-label="Zoom in"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-slate-950/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-xl hover:bg-slate-800 active:scale-95 shadow-xl cursor-pointer"
            >
              <Plus className="w-5 h-5 text-cyan-300" />
            </button>
            <span className="px-2 py-0.5 rounded-md bg-slate-950/90 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold">
              Z{zoom}
            </span>
            <button
              type="button"
              onClick={() => zoomAtCenter(zoom - 1)}
              aria-label="Zoom out"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-slate-950/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-xl hover:bg-slate-800 active:scale-95 shadow-xl cursor-pointer"
            >
              <Minus className="w-5 h-5 text-cyan-300" />
            </button>
          </div>
        </div>

        {/* My Location Current Button */}
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="absolute bottom-4 right-4 z-10 min-h-[44px] rounded-xl border border-cyan-400/50 bg-slate-950/95 backdrop-blur-xl px-3.5 py-2.5 text-xs font-black text-cyan-200 flex items-center gap-2 shadow-2xl active:scale-95 disabled:opacity-60 cursor-pointer hover:bg-cyan-950/40"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <LocateFixed className="w-4 h-4 text-cyan-400" />}
          <span>{isAr ? 'موقعي الفعلي الحالي' : 'My Current Location'}</span>
        </button>

        {/* Gesture Guidance Pill at bottom center */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 backdrop-blur-md text-[10px] text-slate-400 font-medium">
          {isAr ? '✌️ تكبير/تصغير بإصبعين | نقرة لتثبيت الموقع' : '✌️ Two-finger pinch to zoom | Tap to lock'}
        </div>
      </div>

      {/* Bottom Control Bar: Direct Actions & Live GPS Status */}
      <div className="p-4 bg-slate-950/95 border-t border-slate-800 space-y-3">
        {/* Real-time Status Card */}
        {mockMessage && (
          <div className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold flex items-center justify-between gap-2 shadow-md ${
            mockActive
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
              : 'border-cyan-500/30 bg-slate-900/90 text-cyan-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${mockActive ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`} />
              <span>{mockMessage}</span>
            </div>
            {mockActive && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                {isAr ? 'GPS نشط' : 'GPS Active'}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {/* 1. Apply GPS */}
          <button
            type="button"
            onClick={() => syncLocationToAndroid(selected)}
            disabled={mocking}
            className="min-h-[48px] rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 px-4 py-3 text-xs sm:text-sm font-black text-white flex items-center justify-center gap-2 hover:from-cyan-500 hover:to-blue-500 active:scale-95 shadow-lg shadow-cyan-500/20 disabled:opacity-60 cursor-pointer"
          >
            {mocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
            <span>{isAr ? 'تثبيت الموقع على الهاتف' : 'Set Phone GPS'}</span>
          </button>

          {/* 2. Open Ninja Shortcut */}
          <button
            type="button"
            onClick={handleLaunchNinja}
            className="min-h-[48px] rounded-xl border border-purple-500/50 bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-xs sm:text-sm font-black text-white flex items-center justify-center gap-2 hover:from-purple-500 hover:to-indigo-500 active:scale-95 shadow-lg shadow-purple-500/20 cursor-pointer"
            title={isAr ? 'فتح تطبيق نينجا للتأكد من أن الموقع تم تغييره بنجاح' : 'Open Ninja app to verify GPS'}
          >
            <ExternalLink className="w-4 h-4" />
            <span>{isAr ? 'فتح تطبيق نينجا 🚀' : 'Open Ninja App 🚀'}</span>
          </button>

          {/* 3. Developer Options Setup */}
          <button
            type="button"
            onClick={openMockSettings}
            className="min-h-[48px] rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-3 text-xs font-black text-amber-200 flex items-center justify-center gap-2 hover:bg-amber-500/25 active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer"
          >
            <Settings2 className="w-4 h-4" />
            <span>{isAr ? 'إذن خيارات المطور' : 'Developer Options'}</span>
          </button>

          {/* 4. Release / Reset Location */}
          <button
            type="button"
            onClick={stopMock}
            disabled={!mockActive}
            className="min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-xs font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            <Square className="w-4 h-4 text-slate-400" />
            <span>{isAr ? 'إلغاء التثبيت' : 'Reset GPS'}</span>
          </button>
        </div>

        {/* Selected Coordinates Readout Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
            <div className="text-[10px] text-slate-400 font-bold">خط العرض (Latitude)</div>
            <div className="mt-0.5 text-sm font-black font-mono text-cyan-300 tabular-nums">{selected.lat.toFixed(6)}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
            <div className="text-[10px] text-slate-400 font-bold">خط الطول (Longitude)</div>
            <div className="mt-0.5 text-sm font-black font-mono text-cyan-300 tabular-nums">{selected.lng.toFixed(6)}</div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-bold">{isAr ? 'حالة التزامن' : 'Sync Status'}</div>
              <div className="mt-0.5 text-xs font-black text-emerald-400">
                {autoBroadcast ? (isAr ? '⚡ تزامن فوري نشط' : '⚡ Live Auto-Sync') : (isAr ? 'يدوي' : 'Manual')}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
