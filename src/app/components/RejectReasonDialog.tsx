import { useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, PenLine, X, XCircle } from 'lucide-react';
import { composeReason } from '../lib/requests';
import { RejectionNotice } from './RejectionNotice';

export { PAYMENT_REJECT_REASONS, REQUEST_REJECT_REASONS } from '../lib/rejectReasons';

const OTHER = '__other__';

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
  const isPayment = /payment/i.test(title);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    onConfirm(composeReason(reason, message));
  };

  return (
    <div className="fade-in fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-0 sm:p-4" onClick={() => !busy && onCancel()}>
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        className="rise-in w-full sm:max-w-lg max-h-[92dvh] flex flex-col bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="sm:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1 rounded-full bg-gray-300 dark:bg-slate-600" />
        </div>

        <div className="flex items-start gap-3 px-5 pt-4 sm:pt-5 pb-4 border-b border-gray-100 dark:border-slate-700">
          <span className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="reject-title" className="font-semibold text-gray-900 dark:text-white leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">{subject}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="p-1.5 -mr-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <fieldset>
            <legend className="flex items-baseline justify-between w-full mb-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Reason <span className="text-red-500">*</span>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Student will see this</span>
            </legend>
            <div className="rounded-xl border border-gray-200 dark:border-slate-600 divide-y divide-gray-100 dark:divide-slate-700 overflow-hidden">
              {[...reasons, OTHER].map(option => {
                const selected = choice === option;
                return (
                  <label
                    key={option}
                    className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                      selected ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reject-reason"
                      value={option}
                      checked={selected}
                      onChange={() => setChoice(option)}
                      className="sr-only"
                    />
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected ? 'border-red-600 bg-red-600' : 'border-gray-300 dark:border-slate-500'
                    }`}>
                      {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className={`text-sm leading-snug ${selected ? 'text-red-900 dark:text-red-100 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
                      {option === OTHER
                        ? <span className="inline-flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> Other reason</span>
                        : option}
                    </span>
                  </label>
                );
              })}
            </div>
            {choice === OTHER && (
              <input
                type="text"
                autoFocus
                value={custom}
                onChange={e => setCustom(e.target.value)}
                maxLength={200}
                placeholder="Type the reason"
                className="mt-2 w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            )}
            {touched && !valid && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">Choose or type a reason.</p>
            )}
          </fieldset>

          <div>
            <label htmlFor="reject-message" className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Message to the student</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Optional</span>
            </label>
            <textarea
              id="reject-message"
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={400}
              placeholder="e.g. Please visit the Registrar’s Office with your valid ID, then submit a new request."
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <p className="mt-1 text-right text-[11px] text-gray-400">{message.length}/400</p>
          </div>

          {valid && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Preview: what the student sees</p>
              <RejectionNotice
                compact
                title={isPayment ? 'Payment not verified' : 'Request not approved'}
                text={composeReason(reason, message)}
                knownReasons={[reason]}
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-3.5 border-t border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800 safe-area-pb">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-600 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject and notify
          </button>
        </div>
      </form>
    </div>
  );
}
