# Auto-Configure Environment Variables & Sniper Enhancements

## Summary
Resolve the blocking environment variable prompt by establishing built-in fallback defaults for `VITE_NATAN_API_URL` and `VITE_NINJA_BOOKING_PATH`, and enhance the Captain automation suite with pull-to-refresh frequency controls and instant haptic/sound notifications on shift booking.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The platform prompted for `VITE_NATAN_API_URL` and `VITE_NINJA_BOOKING_PATH` because they were listed as unfilled variables in `.env.example`.
> - **Default Decision**: Both variables will be configured with self-sufficient in-app defaults (`https://natan-server.onrender.com` for the server, and native Accessibility UI automation for Ninja bookings). `.env.example` will be cleaned so the platform will never interrupt you with this prompt again.
> - **Sniper Enhancement**: Add a pull-to-refresh rate controller and instant sound/haptic alerts when a shift is captured.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Removes mandatory secret variable prompts by utilizing built-in server endpoints and client-side defaults.
  2. Empowers the driver/captain to adjust the pull-to-refresh interval (e.g. 1.0s, 1.5s, 2.5s) to balance shift capture speed and device smoothness.
  3. Provides instant sensory feedback (vibration and chime) upon successful shift reservation.
- **Target Audience**: Drivers and couriers using NATAN on Android and web simulators who need uninterrupted setup and swift shift booking.
- **Key Value**: Frictionless deployment without manual environment entry, paired with higher booking reliability.

---

## 2. User Experience & Visual Design

- **Flow**:
  1. App opens cleanly without any environment variable prompt modal.
  2. On the **Radar & Auto-Booking** tab, the captain sees a refined **"إعدادات سرعة التحديث" (Refresh Speed)** slider/pills.
  3. When auto-booking is active and a shift is caught, an instant gold badge animation appears along with phone vibration and a confirmation toast.
- **Visual Identity**:
  - Deep carbon background (`#0A0D14`) with emerald (`#10B981`) and amber (`#F59E0B`) accents.
  - Crisp Arabic typography, clear badge indicators, and zero cluttered text.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Built-in Defaults vs Required Secrets**
  - *Chosen Approach*: Embed the verified production server endpoint (`https://natan-server.onrender.com`) directly as the default fallback in `src/utils/natanApi.ts`, and clear `.env.example`.
  - *Why*: Eliminates user confusion and unblocks immediate testing and APK builds.
- **Decision 2: Native Android Haptics & Web Audio Fallback**
  - *Chosen Approach*: Use Web Audio API for browser simulation and `android.os.Vibrator` via Capacitor for Android devices.
  - *Why*: Ensures the driver receives immediate notification even if the phone screen is partially dimmed or in hand.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                      NATAN Engine                      │
├──────────────────────────┬─────────────────────────────┤
│   Auto-Config Layer      │   Automation & Gesture      │
│   • API Base URL         │   • Native Pull-to-Refresh  │
│   • Native UI Fallback   │   • Screen Text Parser      │
│   • Zero Required Envs   │   • Haptic & Audio Alerts   │
└────────────┬─────────────┴──────────────┬──────────────┘
             │                            │
             ▼                            ▼
  ┌───────────────────────┐   ┌───────────────────────┐
  │   natan-server Cloud  │   │   Ninja Android App   │
  │   (Auth / Accounts)   │   │   (Direct Booking)    │
  └───────────────────────┘   └───────────────────────┘
```

- **Execution Steps**:
  1. Clean `.env.example` so the hosting environment no longer halts execution for manual secrets.
  2. Ensure `src/utils/natanApi.ts` safely handles any absent environment variable with graceful fallback to `https://natan-server.onrender.com`.
  3. Ensure `src/api/ninjaApi.ts` provides clean feedback when optional direct API endpoints are unassigned.
  4. Add the pull-to-refresh interval control and instant alert feedback to `SimulatorRadar.tsx`.
