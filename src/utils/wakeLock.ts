// Screen WakeLock Manager to prevent Android screen sleeping during monitoring
class WakeLockManager {
  private sentinel: any = null;
  private isRequested = false;

  async request() {
    this.isRequested = true;
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      if (!this.sentinel) {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
        this.sentinel.addEventListener('release', () => {
          this.sentinel = null;
          // Re-acquire if still requested and document is visible
          if (this.isRequested && document.visibilityState === 'visible') {
            this.request();
          }
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  async release() {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {
        // safe
      }
      this.sentinel = null;
    }
  }

  isActive() {
    return !!this.sentinel;
  }
}

export const wakeLock = new WakeLockManager();

// Automatically handle Android app switching / tab switching
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wakeLock.isActive()) {
      wakeLock.request();
    }
  });
}
