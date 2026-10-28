import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Loader2, X, XCircle } from 'lucide-react';
import { composeReason } from '../lib/requests';

export { CASHIER_PAYMENT_REJECT_REASONS, PAYMENT_REJECT_REASONS, REQUEST_REJECT_REASONS } from '../lib/rejectReasons';

const OTHER = '__other__';

const FIELD =
  'w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500';

function ReasonOption({
  label,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`h-full w-full text-left px-3 py-2 rounded-lg border text-[13px] leading-snug transition-colors flex items-start gap-2 ${
        selected
          ? 'border-red-400 bg-red-50 text-red-900 ring-1 ring-red-300 dark:border-red-600 dark:bg-red-900/25 dark:text-red-100 dark:ring-red-700'
          : 'border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:bg-red-50/40 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200 dark:hover:border-red-800 dark:hover:bg-red-900/10'
      }`}
    >
      <span
        className={`mt-px w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-red-500 bg-red-600 text-white' : 'border-gray-300 dark:border-slate-500'
        }`}
      >
        {selected && <Check className="w-2.5 h-2.5" strokeWidth={3.5} />}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  );
}

export function RejectReasonDialog({
  open,
  title,
  subject,
  reasons,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  subject: string;
  reasons: string[];
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [choice, setChoice] = useState('');
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChoice('');
    setCustom('');
    setMessage('');
    setTouched(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const reason = choice === OTHER ? custom.trim() : choice;
  const valid = reason.length >= 3;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    onConfirm(composeReason(reason, message));
  };

  return createPortal(
    <div
      className="fade-in fixed inset-0 z-[70] flex items-end sm:items-start justify-center p-0 sm:px-4 sm:pt-[5vh] sm:pb-4 bg-slate-900/40 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
      onClick={() => !busy && onCancel()}
    >
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        className="pop-in w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[90dvh] flex flex-col bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden"
      >
        <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-slate-700">
          <span className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-[18px] h-[18px] text-red-600 dark:text-red-400" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="reject-title"
              className="font-semibold text-gray-900 dark:text-white leading-tight"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={subject}>{subject}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fits on desktop without scrolling; scrolls only on very small screens */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-3.5">
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Reason <span className="text-red-500">*</span>
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Tap one</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Rejection reason">
              {reasons.map(option => (
                <ReasonOption
                  key={option}
                  label={option}
                  selected={choice === option}
                  disabled={busy}
                  onSelect={() => setChoice(option)}
                />
              ))}
              <ReasonOption
                label="Other reason…"
                selected={choice === OTHER}
                disabled={busy}
                onSelect={() => setChoice(OTHER)}
              />
            </div>

            {choice === OTHER && (
              <input
                type="text"
                autoFocus
                value={custom}
                onChange={e => setCustom(e.target.value)}
                maxLength={200}
                placeholder="Type the reason"
                disabled={busy}
                className={`${FIELD} mt-2`}
              />
            )}

            {touched && !valid && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Choose a reason, or type one under Other.</p>
            )}
          </div>

          <div>
            <label htmlFor="reject-message" className="block text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
              Note to student <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="reject-message"
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={400}
              disabled={busy}
              placeholder="e.g. Please visit the Registrar’s Office with your valid ID."
              className={FIELD}
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-2.5 px-5 py-3 border-t border-gray-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40">
          <p className="hidden sm:block flex-1 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
            The student is notified with this reason.
          </p>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 sm:flex-none sm:w-28 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-600 dark:hover:bg-slate-700 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 sm:flex-none sm:w-32 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
