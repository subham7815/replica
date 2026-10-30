import { formatDay, type EventScope } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useEvents } from '@newreplica/shared/queries';
import { useState } from 'react';
import { Link } from 'react-router';
import { icons } from '../../components/icons';
import { EventStatusBadge, FillBar, PlacesLabel } from '../../components/schedule';
import { EmptyState, FormError, PageHeader } from '../../components/ui';

const SCOPES: { value: EventScope; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past & cancelled' },
];

function dateRange(startsAt: string | null, endsAt: string | null, tz: string) {
  if (!startsAt || !endsAt) return 'No shifts yet';
  const a = formatDay(startsAt, tz);
  const b = formatDay(endsAt, tz);
  return a === b ? a : `${a} – ${b}`;
}

export function SchedulePage() {
  const { can } = useAuth();
  const [scope, setScope] = useState<EventScope>('upcoming');
  const list = useEvents({ scope });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Events & shifts"
        description="Build rotas, watch capacity, and fill gaps when people drop out."
        actions={
          can('programmes:manage') && (
            <Link to="/app/schedule/new" className="btn-primary">
              <icons.calendar size={16} /> New event
            </Link>
          )
        }
      />

      <div role="tablist" className="mt-6 inline-flex rounded-lg bg-navy-soft p-1 text-sm font-medium">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            role="tab"
            aria-selected={scope === s.value}
            onClick={() => setScope(s.value)}
            className={`rounded-md px-3 py-1.5 transition ${scope === s.value ? 'bg-white text-ink shadow-dx-sm' : 'text-muted hover:text-ink'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-6 animate-fade-up">
        {list.isPending ? (
          <div className="skeleton h-48" />
        ) : list.isError ? (
          <FormError error={list.error} />
        ) : list.data.length === 0 ? (
          scope === 'upcoming' ? (
            <EmptyState
              title="No upcoming events"
              body="Create an event, add shifts with the number of people you need, and publish it so volunteers can sign up."
              action={
                can('programmes:manage') && (
                  <Link to="/app/schedule/new" className="btn-primary">
                    Create your first event
                  </Link>
                )
              }
            />
          ) : (
            <EmptyState title="Nothing here yet" body="Finished and cancelled events appear here." />
          )
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {list.data.map((e) => (
              <li key={e.id}>
                <Link
                  to={`/app/schedule/${e.id}`}
                  className="card group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-dx"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold group-hover:text-brand">{e.title}</h3>
                    <EventStatusBadge status={e.status} />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm">
                    <icons.calendar size={14} /> {dateRange(e.startsAt, e.endsAt, e.timezone)}
                  </p>
                  {e.location && <p className="mt-0.5 text-xs text-muted">{e.location.name}</p>}
                  <div className="mt-auto space-y-2 pt-5">
                    <FillBar confirmed={e.confirmedCount} capacity={e.capacity} />
                    <div className="flex items-center justify-between gap-2">
                      <PlacesLabel confirmed={e.confirmedCount} capacity={e.capacity} waitlist={e.waitlistCount} />
                      <span className="text-xs text-muted">
                        {e.shiftCount} shift{e.shiftCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    {e.openSpots > 0 && e.status === 'PUBLISHED' && (
                      <p className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                        <icons.alert size={12} /> {e.openSpots} place{e.openSpots === 1 ? '' : 's'} to fill
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
