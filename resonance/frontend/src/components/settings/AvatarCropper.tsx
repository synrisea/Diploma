import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const VIEWPORT = 220;
const EXPORT_SIZE = 512;

interface Pan {
  left: number;
  top: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampPan(pan: Pan, displayWidth: number, displayHeight: number): Pan {
  return {
    left: clamp(pan.left, Math.min(0, VIEWPORT - displayWidth), 0),
    top: clamp(pan.top, Math.min(0, VIEWPORT - displayHeight), 0),
  };
}

export function AvatarCropper({
  file,
  onConfirm,
  onCancel,
}: {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ left: 0, top: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{ pointerId: number; startX: number; startY: number; startPan: Pan } | null>(null);

  // Created and revoked together inside the effect (not a lazy useState initializer) so that
  // React StrictMode's dev-mode double-invoke (mount -> cleanup -> mount) can't revoke this URL
  // out from under the <img> before a fresh one is created on the follow-up mount.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setNaturalSize(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!objectUrl || !naturalSize) {
    return (
      <div className="flex w-[220px] flex-col gap-3">
        <img
          ref={imgRef}
          src={objectUrl ?? undefined}
          alt=""
          className="hidden"
          onLoad={(e) => {
            const el = e.currentTarget;
            const baseScale = Math.max(VIEWPORT / el.naturalWidth, VIEWPORT / el.naturalHeight);
            setNaturalSize({ width: el.naturalWidth, height: el.naturalHeight });
            setPan({
              left: (VIEWPORT - el.naturalWidth * baseScale) / 2,
              top: (VIEWPORT - el.naturalHeight * baseScale) / 2,
            });
          }}
        />
        <p className="text-sm text-stone-500">Loading image…</p>
      </div>
    );
  }

  const baseScale = Math.max(VIEWPORT / naturalSize.width, VIEWPORT / naturalSize.height);
  const displayScale = baseScale * zoom;
  const displayWidth = naturalSize.width * displayScale;
  const displayHeight = naturalSize.height * displayScale;

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startPan: pan };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const next = {
      left: drag.startPan.left + (e.clientX - drag.startX),
      top: drag.startPan.top + (e.clientY - drag.startY),
    };
    setPan(clampPan(next, displayWidth, displayHeight));
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === e.pointerId) dragState.current = null;
  };

  const handleZoomChange = (nextZoom: number) => {
    const nextDisplayScale = baseScale * nextZoom;
    const nextDisplayWidth = naturalSize.width * nextDisplayScale;
    const nextDisplayHeight = naturalSize.height * nextDisplayScale;

    const centerNaturalX = (VIEWPORT / 2 - pan.left) / displayScale;
    const centerNaturalY = (VIEWPORT / 2 - pan.top) / displayScale;

    const next = {
      left: VIEWPORT / 2 - centerNaturalX * nextDisplayScale,
      top: VIEWPORT / 2 - centerNaturalY * nextDisplayScale,
    };

    setZoom(nextZoom);
    setPan(clampPan(next, nextDisplayWidth, nextDisplayHeight));
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const sx = -pan.left / displayScale;
    const sy = -pan.top / displayScale;
    const sSize = VIEWPORT / displayScale;

    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, EXPORT_SIZE, EXPORT_SIZE);

    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      'image/jpeg',
      0.92,
    );
  };

  return (
    <div className="flex w-[220px] flex-col gap-3">
      <div
        className="relative h-[220px] w-[220px] overflow-hidden rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          ref={imgRef}
          src={objectUrl}
          alt=""
          draggable={false}
          className="absolute cursor-move select-none"
          style={{
            left: pan.left,
            top: pan.top,
            width: displayWidth,
            height: displayHeight,
            maxWidth: 'none',
            maxHeight: 'none',
          }}
        />
      </div>

      <label className="flex items-center gap-3 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomChange(Number(e.target.value))}
          className="flex-1 accent-brand-500"
        />
      </label>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleConfirm}
          className="rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-600"
        >
          Use photo
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-stone-500 hover:text-stone-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
