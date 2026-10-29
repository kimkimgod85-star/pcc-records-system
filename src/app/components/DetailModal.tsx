import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const WIDTH = {
  md: 'sm:max-w-3xl',
  lg: 'sm:max-w-5xl',
};

export function DetailModal({
  open,
  onClose,
  label,
  locked = false,
  size = 'lg',
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  /** Ignore Esc / backdrop clicks, e.g. while a dialog is stacked on top. */
  locked?: boolean;
  size?: keyof typeof WIDTH;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open || locked) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, locked, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fade-in fixed inset-0 z-[60] flex items-end sm:items-start justify-center p-0 sm:px-4 sm:pt-[5vh] sm:pb-4 bg-slate-900/40 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
      onClick={() => { if (!locked) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={e => e.stopPropagation()}
        className={`pop-in w-full ${WIDTH[size]} max-h-[92dvh] sm:max-h-[90dvh] flex flex-col bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Two-column body: details scroll on the left, actions stay visible on the right. */
export const MODAL_BODY = 'flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden overscroll-contain';
export const MODAL_MAIN = 'md:flex-1 md:min-w-0 md:overflow-y-auto overscroll-contain px-5 py-4 space-y-3';
export const MODAL_ASIDE =
  'md:w-80 md:flex-shrink-0 md:overflow-y-auto overscroll-contain px-5 py-4 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/40';
export const MODAL_HEADER = 'flex-shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-700';
