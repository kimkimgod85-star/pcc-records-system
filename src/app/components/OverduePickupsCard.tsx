import { useState } from 'react';
import { AlarmClock, CalendarClock } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { RescheduleDialog } from './RescheduleDialog';
import { btn } from '../lib/ui';
import { useOverduePickups, type OverduePickup } from '../lib/overduePickups';
import { formatPickup } from '../lib/status';

/** Lists booked pickups whose date passed while the document was still not ready. */
export function OverduePickupsCard({ className = '' }: { className?: string }) {
  const { overdue, schedule, refresh } = useOverduePickups();
  const [active, setActive] = useState<OverduePickup | null>(null);

  if (overdue.length === 0) return null;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/60 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 px-5 py-3.5 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/50">
        <span className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 flex items-center justify-center flex-shrink-0">
          <AlarmClock className="w-[18px] h-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-900 dark:text-red-100" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Overdue pickups · {overdue.length}
          </p>
          <p className="text-xs text-red-800/80 dark:text-red-200/80">
            A pickup date passed, including one you already moved. Students were notified. Set another date.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-gray-100 dark:divide-slate-700 max-h-80 overflow-y-auto overscroll-contain">
        {overdue.map(item => (
          <li key={item.booking.id} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {item.request.studentName}
                <span className="font-normal text-gray-500 dark:text-gray-400"> · {item.request.type}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                <span className="font-mono text-blue-600 dark:text-blue-400">{item.request.id}</span>
                {' · '}Booked {formatPickup(item.booking.date, item.booking.time)}
                {' · '}<span className="font-semibold text-red-600 dark:text-red-400">{item.daysLate} day{item.daysLate === 1 ? '' : 's'} late</span>
              </p>
            </div>
            <span className="hidden sm:block"><StatusBadge status={item.request.status} /></span>
            <button type="button" onClick={() => setActive(item)} className={btn('primary', 'sm')}>
              <CalendarClock className="w-4 h-4" />
              Reschedule again
            </button>
          </li>
        ))}
      </ul>

      <RescheduleDialog
        open={Boolean(active)}
        booking={active?.booking ?? null}
        requestCode={active?.request.id ?? ''}
        requestType={active?.request.type ?? ''}
        studentName={active?.request.studentName ?? ''}
        schedule={schedule}
        onClose={() => setActive(null)}
        onSaved={refresh}
      />
    </div>
  );
}
