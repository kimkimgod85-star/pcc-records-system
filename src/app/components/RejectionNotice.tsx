import type { ReactNode } from 'react';
import { MessageSquareText, XCircle } from 'lucide-react';
import { ALL_REJECT_REASONS } from '../lib/rejectReasons';

const SEPARATOR = ' — ';

/** Splits a stored reason ("Reason — optional message") back into its two parts. */
export function splitReason(text: string | null | undefined, knownReasons: string[] = ALL_REJECT_REASONS) {
  const value = (text || '').trim();
  if (!value) return { reason: '', message: '' };
  const known = knownReasons.find(r => value === r || value.startsWith(r + SEPARATOR));
  if (known) return { reason: known, message: value.slice(known.length + SEPARATOR.length).trim() };
  const at = value.indexOf(SEPARATOR);
  if (at === -1) return { reason: value, message: '' };
  return { reason: value.slice(0, at).trim(), message: value.slice(at + SEPARATOR.length).trim() };
}

export function RejectionNotice({
  title,
  text,
  knownReasons = ALL_REJECT_REASONS,
  fallback = 'Please contact the Registrar’s Office for details.',
  action,
  compact = false,
  className = '',
}: {
  title: string;
  text?: string | null;
  knownReasons?: string[];
  fallback?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const { reason, message } = splitReason(text, knownReasons);

  return (
    <div className={`rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 overflow-hidden ${className}`}>
      <div className={`flex items-center gap-2.5 bg-red-50 dark:bg-red-900/20 ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'}`}>
        <span className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        </span>
        <p className="text-sm font-semibold text-red-800 dark:text-red-200">{title}</p>
      </div>

      <div className={`${compact ? 'px-3 py-2.5' : 'px-3.5 py-3'} space-y-2.5`}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Reason</p>
          <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5 leading-snug break-words">{reason || fallback}</p>
        </div>

        {message && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border-l-4 border-blue-500">
            <MessageSquareText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Message from the Registrar</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 leading-snug break-words">{message}</p>
            </div>
          </div>
        )}
      </div>

      {action && (
        <div className={`border-t border-red-100 dark:border-red-900/40 ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'}`}>
          {action}
        </div>
      )}
    </div>
  );
}
