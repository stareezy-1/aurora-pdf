import { useCallback, useEffect, useRef } from "react";

/**
 * Extracts {x, y} coordinates from either a MouseEvent or a TouchEvent.
 * For touch events, uses the first touch point (touches[0]).
 */
export function getEventCoords(e: MouseEvent | TouchEvent): {
  x: number;
  y: number;
} {
  if ("touches" in e) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

export interface DragOverlayOptions {
  /** Called on every move event with the delta from the drag start position. */
  onDrag: (delta: { dx: number; dy: number }) => void;
  /** Called when the drag gesture ends (mouseup / touchend). */
  onDragEnd?: () => void;
}

export interface DragOverlayHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

/**
 * Generic drag hook that reports deltas from the drag-start position.
 * Works for both position (drag) and size (resize) operations.
 *
 * Registers mousemove/mouseup and touchmove/touchend on `window` during a
 * drag so the gesture continues even when the pointer leaves the element.
 * All touch handlers call event.preventDefault() to suppress scroll.
 * Window listeners are cleaned up on drag end and on unmount.
 *
 * Usage:
 *   const { onMouseDown, onTouchStart } = useDragOverlay({ onDrag, onDragEnd });
 *   <div onMouseDown={onMouseDown} onTouchStart={onTouchStart} />
 */
export function useDragOverlay({
  onDrag,
  onDragEnd,
}: DragOverlayOptions): DragOverlayHandlers {
  // Stores the {x, y} at the moment the drag started
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // Keep stable references to the callbacks so window listeners always call
  // the latest version without needing to re-register.
  const onDragRef = useRef(onDrag);
  const onDragEndRef = useRef(onDragEnd);
  useEffect(() => {
    onDragRef.current = onDrag;
  }, [onDrag]);
  useEffect(() => {
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd]);

  // ── Shared move / end logic ──────────────────────────────────────────────

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!startRef.current) return;
    const { x, y } = getEventCoords(e);
    onDragRef.current({
      dx: x - startRef.current.x,
      dy: y - startRef.current.y,
    });
  }, []);

  const handleEnd = useCallback(() => {
    startRef.current = null;
    window.removeEventListener("mousemove", handleMove);
    window.removeEventListener("mouseup", handleEnd);
    window.removeEventListener("touchmove", handleMove);
    window.removeEventListener("touchend", handleEnd);
    onDragEndRef.current?.();
  }, [handleMove]);

  // ── Start handlers (attached to the element) ────────────────────────────

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      startRef.current = { x: e.clientX, y: e.clientY };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
    },
    [handleMove, handleEnd],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault(); // suppress scroll
      startRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      const touchMove = (ev: TouchEvent) => {
        ev.preventDefault(); // suppress scroll during move
        handleMove(ev);
      };
      const touchEnd = (ev: TouchEvent) => {
        ev.preventDefault();
        handleEnd();
        window.removeEventListener("touchmove", touchMove);
        window.removeEventListener("touchend", touchEnd);
      };
      window.addEventListener("touchmove", touchMove, { passive: false });
      window.addEventListener("touchend", touchEnd, { passive: false });
    },
    [handleMove, handleEnd],
  );

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      // Touch listeners registered per-gesture are cleaned up in touchEnd,
      // but we also clean up the shared ones just in case.
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [handleMove, handleEnd]);

  return { onMouseDown, onTouchStart };
}
