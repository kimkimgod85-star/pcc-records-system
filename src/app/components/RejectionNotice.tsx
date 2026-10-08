import type { ReactNode } from 'react';
import { XCircle } from 'lucide-react';
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
    <div className={`flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-900/10 ${compact ? 'p-3' : 'p-3.5'} ${className}`}>
      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-red-800 dark:text-red-200">{title}</p>
        <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 leading-snug break-words">{reason || fallback}</p>
        {message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-snug break-words">
            <span className="font-medium text-gray-700 dark:text-gray-300">Registrar:</span> {message}
          </p>
        )}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}
