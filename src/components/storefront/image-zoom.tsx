import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, RotateCcw, X } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function ImageZoom({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);

  function zoomTo(next: number) {
    const value = clamp(next, MIN_SCALE, MAX_SCALE);
    setScale(value);
    if (value === 1) setOffset({ x: 0, y: 0 });
  }

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [src]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "+" || event.key === "=") zoomTo(scale + 0.5);
      if (event.key === "-") zoomTo(scale - 0.5);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, scale]);

  function onWheel(event: React.WheelEvent) {
    zoomTo(scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
  }

  function onPointerDown(event: React.PointerEvent) {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, current);

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo((pinchStart.current.scale * distance) / pinchStart.current.distance);
      return;
    }
    if (scale > 1) {
      setOffset((value) => ({ x: value.x + current.x - last.x, y: value.y + current.y - last.y }));
    }
  }

  function onPointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Zoomed product image" className="fixed inset-0 z-[100] bg-ink/95">
      <div
        className="absolute inset-0 touch-none select-none overflow-hidden"
        style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => zoomTo(scale > 1 ? 1 : 2.5)}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="h-full w-full object-contain p-4 sm:p-10"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: pointers.current.size ? "none" : "transform 150ms ease-out",
          }}
        />
      </div>

      <button
        type="button"
        aria-label="Close zoom"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink shadow-sm hover:bg-white"
      >
        <X size={18} />
      </button>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/90 p-1 text-ink shadow-sm">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={scale <= MIN_SCALE}
          onClick={() => zoomTo(scale - 0.5)}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-canvas-warm disabled:opacity-40"
        >
          <Minus size={18} />
        </button>
        <span className="min-w-[3.5rem] text-center text-sm tabular-nums">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={scale >= MAX_SCALE}
          onClick={() => zoomTo(scale + 0.5)}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-canvas-warm disabled:opacity-40"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          disabled={scale === 1}
          onClick={() => zoomTo(1)}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-canvas-warm disabled:opacity-40"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
