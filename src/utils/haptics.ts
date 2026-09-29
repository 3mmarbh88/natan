// Android APK & Web Haptics Utility
export const haptics = {
  vibrate: (pattern: number | number[] = 50) => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignored if user hasn't interacted or permission denied
      }
    }
  },

  // On Shift Capture (Strong noticeable vibration for field work)
  vibrateCapture: () => {
    haptics.vibrate([250, 100, 250, 100, 400]);
  },

  // On Test Shift Drop or Quick Action
  vibrateTick: () => {
    haptics.vibrate(35);
  },

  // On Warning / Conflict / Error
  vibrateAlert: () => {
    haptics.vibrate([150, 80, 150]);
  },
};
