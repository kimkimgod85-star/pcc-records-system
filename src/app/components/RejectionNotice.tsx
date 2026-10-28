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
    <div className={`flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 ${compact ? 'p-3' : 'p-3.5'} ${className}`}>
      <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-red-900 dark:text-red-100">{title}</p>
        <p className="text-sm text-red-950/80 dark:text-red-50/90 mt-0.5 leading-snug break-words">{reason || fallback}</p>
        {message && (
          <p className="text-sm text-red-900/70 dark:text-red-100/70 mt-1.5 leading-snug break-words">
            <span className="font-semibold">Note:</span> {message}
          </p>
        )}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}
