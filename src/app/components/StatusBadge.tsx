import { REQUEST_STATUS_COLOR, REQUEST_STATUS_DOT, REQUEST_STATUS_LABEL, type RequestStatus } from '../lib/status';

export function StatusBadge({ status, label }: { status: RequestStatus; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ring-1 ring-inset ${REQUEST_STATUS_COLOR[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${REQUEST_STATUS_DOT[status]}`} />
      {label || REQUEST_STATUS_LABEL[status]}
    </span>
  );
}
