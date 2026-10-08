import { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, Loader2, X, XCircle } from 'lucide-react';
import { composeReason } from '../lib/requests';

export { PAYMENT_REJECT_REASONS, REQUEST_REJECT_REASONS } from '../lib/rejectReasons';

const OTHER = '__other__';

const FIELD = 'w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500';

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

  return (
    <div className="fade-in fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4" onClick={() => !busy && onCancel()}>
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        className="rise-in w-full sm:max-w-md bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 safe-area-pb"
      >
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="reject-title" className="font-semibold text-gray-900 dark:text-white leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subject}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="p-1.5 -mr-1 -mt-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="reject-reason"
                value={choice}
                onChange={e => setChoice(e.target.value)}
                className={`${FIELD} appearance-none pr-9 ${choice ? '' : 'text-gray-400 dark:text-gray-500'}`}
              >
                <option value="" disabled>Choose a reason</option>
                {reasons.map(option => <option key={option} value={option}>{option}</option>)}
                <option value={OTHER}>Other reason…</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            {choice === OTHER && (
              <input
                type="text"
                autoFocus
                value={custom}
                onChange={e => setCustom(e.target.value)}
                maxLength={200}
                placeholder="Type the reason"
                className={`${FIELD} mt-2`}
              />
            )}
            {touched && !valid && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Choose or type a reason.</p>
            )}
          </div>

          <div>
            <label htmlFor="reject-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Message <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="reject-message"
              rows={2}
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={400}
              placeholder="e.g. Please visit the Registrar’s Office with your valid ID."
              className={`${FIELD} resize-none`}
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">The student will be notified with this reason.</p>

          {error && (
            <p className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Reject
          </button>
        </div>
      </form>
    </div>
  );
}
