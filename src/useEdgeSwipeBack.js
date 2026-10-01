import { useEffect, useRef } from "react";

// iOS-style edge-swipe-back: a rightward drag starting within a thin strip
// at the left edge of the screen triggers onBack. Scoped to the edge (not
// the whole screen) so it never fights normal scrolling or horizontal
// scroll rails (e.g. the journey strip).
export function useEdgeSwipeBack(onBack, enabled = true) {
  const startRef = useRef(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const EDGE = 24;
    const THRESHOLD = 70;
    const MAX_VERTICAL = 60;

    const onTouchStart = (e) => {
      const t = e.touches[0];
      startRef.current = t.clientX <= EDGE ? { x: t.clientX, y: t.clientY } : null;
      firedRef.current = false;
    };
    const onTouchMove = (e) => {
      if (!startRef.current || firedRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = Math.abs(t.clientY - startRef.current.y);
      if (dy > MAX_VERTICAL) {
        startRef.current = null;
        return;
      }
      if (dx > THRESHOLD) {
        firedRef.current = true;
        onBack();
      }
    };
    const onTouchEnd = () => {
      startRef.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onBack, enabled]);
}
