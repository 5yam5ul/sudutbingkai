/**
 * Tactile Haptic Vibration Engine for Analog Camera & Physical Controls
 * Provides realistic mechanical camera sensation (shutter click, winding ratchet, dial notches).
 */

export function triggerHaptic(pattern: number | number[] = 15) {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error on unsupported hardware or disabled permissions
    }
  }
}

/** Pre-tension shutter tap (half-press feel) */
export function hapticShutterPress() {
  triggerHaptic(15);
}

/** Full mechanical analog shutter release slap + film winding ratchet recoil */
export function hapticShutterSlap() {
  triggerHaptic([35, 45, 25]);
}

/** Crisp rotary dial notch click (aspect ratio, film roll switch) */
export function hapticDialClick() {
  triggerHaptic(14);
}

/** Mechanical toggle switch (lens flip, frame snap) */
export function hapticToggle() {
  triggerHaptic(18);
}

/** Double notch pulse (flash mode cycle, warnings) */
export function hapticDoubleTick() {
  triggerHaptic([12, 10, 12]);
}

/** Subtle tactile tap (pills, badges, buttons) */
export function hapticLightTap() {
  triggerHaptic(10);
}
