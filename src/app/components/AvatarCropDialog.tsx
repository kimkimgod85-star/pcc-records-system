import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { btn } from '../lib/ui';
import { saveAvatar } from '../lib/avatar';

const VIEW = 280;

function layout(image: HTMLImageElement, zoom: number, ox: number, oy: number, view = VIEW) {
  const fit = Math.max(view / image.naturalWidth, view / image.naturalHeight) * zoom;
  const dw = image.naturalWidth * fit;
  const dh = image.naturalHeight * fit;
  const maxX = Math.max(0, (dw - view) / 2);
  const maxY = Math.max(0, (dh - view) / 2);
  return {
    dw,
    dh,
    ox: Math.min(maxX, Math.max(-maxX, ox)),
    oy: Math.min(maxY, Math.max(-maxY, oy)),
  };
}

function exportSquare(image: HTMLImageElement, zoom: number, ox: number, oy: number, view = VIEW) {
  const placed = layout(image, zoom, ox, oy, view);
  const size = 512;
  const scale = size / view;
  const left = (view - placed.dw) / 2 + placed.ox;
  const top = (view - placed.dh) / 2 + placed.oy;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the photo.');
  ctx.drawImage(image, left * scale, top * scale, placed.dw * scale, placed.dh * scale);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not prepare the photo.'))), 'image/jpeg', 0.9);
  });
}

export function AvatarCropDialog({
  open,
  userId,
  onClose,
  onSaved,
}: {
  open: boolean;
  userId: string;
  onClose: () => void;
  onSaved: (url: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(VIEW);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ zoom: number; ox: number; oy: number; dist: number; midX: number; midY: number; x: number; y: number } | null>(null);
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [src, setSrc] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSrc('');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError('');
    setBusy(false);
    imageRef.current = null;
    pointers.current.clear();
    gesture.current = null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setView(Math.max(1, Math.round(node.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, src]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  zoomRef.current = zoom;
  offsetRef.current = offset;

  const apply = (nextZoom: number, ox: number, oy: number) => {
    const image = imageRef.current;
    const clampedZoom = Math.min(3, Math.max(1, nextZoom));
    if (!image) {
      setZoom(clampedZoom);
      setOffset({ x: ox, y: oy });
      return;
    }
    const next = layout(image, clampedZoom, ox, oy, view);
    setZoom(clampedZoom);
    setOffset({ x: next.ox, y: next.oy });
  };

  if (!open) return null;

  const placed = imageRef.current ? layout(imageRef.current, zoom, offset.x, offset.y, view) : null;

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose a photo (JPG or PNG).');
      return;
    }
    setError('');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const reader = new FileReader();
    reader.onload = () => setSrc(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    const image = imageRef.current;
    if (!image) {
      setError('Choose a photo first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const blob = await exportSquare(image, zoom, offset.x, offset.y, view);
      const url = await saveAvatar(userId, blob);
      onSaved(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the photo.');
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-start justify-center sm:pt-[6vh] bg-slate-900/50 backdrop-blur-md p-3" onClick={() => { if (!busy) onClose(); }}>
      <div
        role="dialog"
        aria-labelledby="avatar-crop-title"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden"
        onClick={event => event.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 text-center">
          <h2 id="avatar-crop-title" className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.15rem', fontWeight: 600 }}>
            Profile photo
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Drag to center your face. Pinch with two fingers to zoom.
          </p>
        </div>

        <div className="px-5 pb-5 flex flex-col items-center">
          <div
            ref={stageRef}
            className="relative w-full max-w-[280px] aspect-square rounded-2xl bg-slate-900 overflow-hidden touch-none"
            onPointerDown={event => {
              if (!src) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              const points = [...pointers.current.values()];
              if (points.length >= 2) {
                gesture.current = {
                  zoom: zoomRef.current,
                  ox: offsetRef.current.x,
                  oy: offsetRef.current.y,
                  dist: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1,
                  midX: (points[0].x + points[1].x) / 2,
                  midY: (points[0].y + points[1].y) / 2,
                  x: event.clientX,
                  y: event.clientY,
                };
              } else {
                gesture.current = {
                  zoom: zoomRef.current,
                  ox: offsetRef.current.x,
                  oy: offsetRef.current.y,
                  dist: 0,
                  midX: event.clientX,
                  midY: event.clientY,
                  x: event.clientX,
                  y: event.clientY,
                };
              }
            }}
            onPointerMove={event => {
              if (!pointers.current.has(event.pointerId) || !gesture.current) return;
              pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              const points = [...pointers.current.values()];
              const start = gesture.current;
              if (points.length >= 2) {
                const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1;
                const midX = (points[0].x + points[1].x) / 2;
                const midY = (points[0].y + points[1].y) / 2;
                apply(start.zoom * (dist / start.dist), start.ox + midX - start.midX, start.oy + midY - start.midY);
              } else {
                apply(start.zoom, start.ox + event.clientX - start.x, start.oy + event.clientY - start.y);
              }
            }}
            onPointerUp={event => {
              pointers.current.delete(event.pointerId);
              const points = [...pointers.current.values()];
              if (points.length === 1) {
                gesture.current = {
                  zoom: zoomRef.current,
                  ox: offsetRef.current.x,
                  oy: offsetRef.current.y,
                  dist: 0,
                  midX: points[0].x,
                  midY: points[0].y,
                  x: points[0].x,
                  y: points[0].y,
                };
              } else if (points.length === 0) {
                gesture.current = null;
              }
            }}
            onPointerCancel={event => {
              pointers.current.delete(event.pointerId);
              gesture.current = null;
            }}
          >
            {src && (
              <img
                src={src}
                alt=""
                draggable={false}
                onLoad={event => { imageRef.current = event.currentTarget; setOffset(current => ({ ...current })); }}
                className="absolute max-w-none select-none"
                style={placed ? {
                  width: placed.dw,
                  height: placed.dh,
                  left: (view - placed.dw) / 2 + placed.ox,
                  top: (view - placed.dh) / 2 + placed.oy,
                } : { opacity: 0 }}
              />
            )}
            <div className="pointer-events-none absolute inset-[8%] rounded-full border-2 border-white shadow-[0_0_0_999px_rgba(7,16,40,0.55)]" />
            {!src && (
              <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-white/80">
                Choose a photo to start
              </p>
            )}
          </div>

          <label className="mt-4 w-full max-w-[280px] text-xs text-gray-500 dark:text-gray-400">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              disabled={!src}
              onChange={event => setZoom(Number(event.target.value))}
              className="mt-1 w-full accent-blue-600"
            />
          </label>

          {error && <p className="mt-3 text-sm text-center text-red-600 dark:text-red-400">{error}</p>}

          <div className="mt-4 grid grid-cols-2 gap-2 w-full max-w-[280px]">
            <button type="button" className={btn('secondary')} disabled={busy} onClick={() => fileRef.current?.click()}>
              Choose photo
            </button>
            <button type="button" className={btn('primary')} disabled={busy || !src} onClick={() => void save()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </button>
            <button type="button" className={`${btn('ghost')} col-span-2`} disabled={busy} onClick={onClose}>
              Cancel
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={event => {
              choose(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
