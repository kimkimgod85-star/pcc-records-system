import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, X, XCircle } from 'lucide-react';
import { composeReason } from '../lib/requests';

export const REQUEST_REJECT_REASONS = [
  'Incomplete or incorrect information in the request',
  'Student ID or name does not match our school records',
  'Unsettled school account or missing clearance',
  'Missing requirement (valid ID, authorization letter, or clearance)',
  'Duplicate request — you already have an active request for this document',
  'This document cannot be released yet for your record',
];

export const PAYMENT_REJECT_REASONS = [
  'Proof of payment is blurry or unreadable',
  'Amount paid does not match the fee',
  'Reference / OR number not found or does not match',
  'This payment was already used for another request',
  'Wrong recipient or wrong GCash account',
];

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    onConfirm(composeReason(reason, message));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !busy && onCancel()}>
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100 dark:border-slate-700">
          <div className="min-w-0">
            <h2 id="reject-title" className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">{subject}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Reason <span className="text-red-500">*</span>
              <span className="font-normal text-gray-500 dark:text-gray-400"> — the student will see this</span>
            </legend>
            <div className="space-y-1.5">
              {[...reasons, OTHER].map(option => {
                const selected = choice === option;
                return (
                  <label
                    key={option}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      selected
                        ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reject-reason"
                      value={option}
                      checked={selected}
                      onChange={() => setChoice(option)}
                      className="mt-0.5 w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                      {option === OTHER ? 'Other reason (type below)' : option}
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
            <label htmlFor="reject-message" className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Message to the student <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
            </label>
            <textarea
              id="reject-message"
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={400}
              placeholder="e.g. Please visit the Registrar’s Office with your valid ID, then submit a new request."
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-y"
            />
          </div>

          {valid && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Student will see</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 break-words">{composeReason(reason, message)}</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5 pt-1 safe-area-pb">
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
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject and notify
          </button>
        </div>
      </form>
    </div>
  );
}
