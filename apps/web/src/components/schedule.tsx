import { EVENT_STATUS_LABELS, type EventStatus } from '@newreplica/shared';

const EVENT_STATUS_STYLE: Record<EventStatus, string> = {
  DRAFT: 'bg-navy-soft text-muted',
  PUBLISHED: 'bg-success-soft text-success',
  CANCELLED: 'bg-brand-soft text-brand',
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${EVENT_STATUS_STYLE[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {EVENT_STATUS_LABELS[status]}
    </span>
  );
}

// Confirmed places against capacity: red while short, green when full.
export function FillBar({ confirmed, capacity, className = '' }: { confirmed: number; capacity: number; className?: string }) {
  const pct = capacity ? Math.min(100, Math.round((confirmed / capacity) * 100)) : 0;
  const full = capacity > 0 && confirmed >= capacity;
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={capacity}
      aria-valuenow={confirmed}
      aria-label={`${confirmed} of ${capacity} places filled`}
      className={`h-1.5 overflow-hidden rounded-full bg-line-soft ${className}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${full ? 'bg-success' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PlacesLabel({ confirmed, capacity, waitlist }: { confirmed: number; capacity: number; waitlist: number }) {
  const left = Math.max(0, capacity - confirmed);
  return (
    <span className="text-xs font-medium">
      <span className="text-ink">
        {confirmed}/{capacity} filled
      </span>
      {left > 0 ? <span className="text-brand"> · {left} open</span> : <span className="text-success"> · Full</span>}
      {waitlist > 0 && <span className="text-warning"> · {waitlist} waiting</span>}
    </span>
  );
}
