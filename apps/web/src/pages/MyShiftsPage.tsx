import { LATE_CANCEL_HOURS, formatDay, formatTimeRange, isLateCancel, type MyShift, type OpenEvent, type OpenShift } from '@newreplica/shared';
import { useCancelMyShift, useMyShifts, useOpenShifts, useSignUpForShift } from '@newreplica/shared/queries';
import { useState } from 'react';
import { icons } from '../components/icons';
import { EmptyState, FormError, Modal, PageHeader, Spinner, TextArea } from '../components/ui';

type Target = { shiftId: string; title: string; when: string; status: 'CONFIRMED' | 'WAITLISTED'; startsAt: string };

export function MyShiftsPage() {
  const mine = useMyShifts();
  const open = useOpenShifts();
  const [cancelling, setCancelling] = useState<Target | null>(null);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="My shifts" description="Your upcoming shifts, and open shifts you can sign up for." />

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Coming up</h2>
        <div className="mt-4 animate-fade-up">
          {mine.isPending ? (
            <div className="skeleton h-28" />
          ) : mine.isError ? (
            <FormError error={mine.error} />
          ) : mine.data.length === 0 ? (
            <EmptyState title="No shifts booked" body="Pick one below and you’ll get a confirmation email." />
          ) : (
            <ul className="space-y-3">
              {mine.data.map((m) => (
                <MyShiftRow key={m.assignmentId} item={m} onCancel={setCancelling} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Sign up for a shift</h2>
        <div className="mt-4 animate-fade-up">
          {open.isPending ? (
            <div className="skeleton h-48" />
          ) : open.isError ? (
            <FormError error={open.error} />
          ) : open.data.length === 0 ? (
            <EmptyState title="No open shifts right now" body="When your organisation publishes new shifts, they’ll appear here." />
          ) : (
            <div className="space-y-5">
              {open.data.map((e) => (
                <OpenEventCard key={e.id} event={e} onCancel={setCancelling} />
              ))}
            </div>
          )}
        </div>
      </section>

      {cancelling && <CancelModal target={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
}

function StatusPill({ status, position }: { status: 'CONFIRMED' | 'WAITLISTED'; position: number | null }) {
  return status === 'CONFIRMED' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">
      <icons.check size={12} /> Confirmed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning">
      <icons.clock size={12} /> Waitlist{position ? ` #${position}` : ''}
    </span>
  );
}

function MyShiftRow({ item, onCancel }: { item: MyShift; onCancel: (t: Target) => void }) {
  const { shift, event, timezone } = item;
  const when = `${formatDay(shift.startsAt, timezone)}, ${formatTimeRange(shift.startsAt, shift.endsAt, timezone)}`;
  const started = new Date(shift.startsAt) <= new Date();
  return (
    <li className="card flex flex-wrap items-center gap-4 p-4">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-soft text-center text-brand">
        <span className="text-[11px] leading-none font-semibold uppercase">{formatDay(shift.startsAt, timezone).split(' ')[0]}</span>
        <span className="text-xl leading-none font-bold">{shift.date.slice(8).replace(/^0/, '')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">
          {event.title} · {shift.title}
        </p>
        <p className="text-sm tabular-nums">{when}</p>
        {event.location && <p className="text-xs text-muted">{event.location.name}{event.location.address ? `, ${event.location.address}` : ''}</p>}
      </div>
      <StatusPill status={item.status} position={item.waitlistPosition} />
      {!started && (
        <button
          className="btn-secondary px-3 py-1.5 text-sm"
          onClick={() => onCancel({ shiftId: shift.id, title: `${event.title} · ${shift.title}`, when, status: item.status, startsAt: shift.startsAt })}
        >
          {item.status === 'CONFIRMED' ? 'Can’t make it' : 'Leave waitlist'}
        </button>
      )}
    </li>
  );
}

function OpenEventCard({ event, onCancel }: { event: OpenEvent; onCancel: (t: Target) => void }) {
  return (
    <article className="card p-5">
      <h3 className="text-lg font-semibold">{event.title}</h3>
      <p className="text-sm text-muted">{[event.location?.name, event.department?.name].filter(Boolean).join(' · ')}</p>
      {event.description && <p className="mt-2 line-clamp-3 text-sm whitespace-pre-line">{event.description}</p>}
      <ul className="mt-4 divide-y divide-line-soft border-t border-line-soft">
        {event.shifts.map((s) => (
          <OpenShiftRow key={s.id} shift={s} event={event} onCancel={onCancel} />
        ))}
      </ul>
    </article>
  );
}

function OpenShiftRow({ shift, event, onCancel }: { shift: OpenShift; event: OpenEvent; onCancel: (t: Target) => void }) {
  const signUp = useSignUpForShift();
  const when = `${formatDay(shift.startsAt, event.timezone)}, ${formatTimeRange(shift.startsAt, shift.endsAt, event.timezone)}`;
  const full = shift.spotsLeft === 0;

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{shift.title}</p>
        <p className="text-sm tabular-nums">{when}</p>
        {shift.notes && <p className="text-xs text-muted">{shift.notes}</p>}
      </div>
      {shift.myStatus ? (
        <>
          <StatusPill status={shift.myStatus} position={shift.myWaitlistPosition} />
          <button
            className="text-xs font-semibold text-muted hover:text-brand"
            onClick={() => onCancel({ shiftId: shift.id, title: `${event.title} · ${shift.title}`, when, status: shift.myStatus!, startsAt: shift.startsAt })}
          >
            {shift.myStatus === 'CONFIRMED' ? 'Cancel' : 'Leave'}
          </button>
        </>
      ) : (
        <>
          <span className={`text-xs font-medium ${full ? 'text-warning' : 'text-success'}`}>
            {full ? (shift.waitlistEnabled ? `Full · ${shift.waitlistCount} waiting` : 'Full') : `${shift.spotsLeft} place${shift.spotsLeft === 1 ? '' : 's'} left`}
          </span>
          {(!full || shift.waitlistEnabled) && (
            <button className={full ? 'btn-secondary px-3 py-1.5 text-sm' : 'btn-primary px-3 py-1.5 text-sm'} disabled={signUp.isPending} onClick={() => signUp.mutate(shift.id)}>
              {signUp.isPending && <Spinner />}
              {full ? 'Join waitlist' : 'Sign up'}
            </button>
          )}
        </>
      )}
      {signUp.error && (
        <div className="w-full">
          <FormError error={signUp.error} />
        </div>
      )}
    </li>
  );
}

function CancelModal({ target, onClose }: { target: Target; onClose: () => void }) {
  const cancel = useCancelMyShift();
  const [reason, setReason] = useState('');
  const late = target.status === 'CONFIRMED' && isLateCancel(target.startsAt);
  return (
    <Modal open title={target.status === 'CONFIRMED' ? 'Cancel this shift?' : 'Leave the waitlist?'} onClose={onClose}>
      <p className="font-medium text-ink">{target.title}</p>
      <p className="text-sm">{target.when}</p>
      {late && (
        <div className="mt-4 rounded-lg border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
          This shift starts in less than {LATE_CANCEL_HOURS} hours, so it’s recorded as a late cancellation. If nobody on the waitlist can take your place, the organisers are emailed.
        </div>
      )}
      {target.status === 'CONFIRMED' && (
        <div className="mt-4">
          <TextArea label="Reason (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} hint="Only the organisers see this." />
        </div>
      )}
      <FormError error={cancel.error} />
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Keep my place
        </button>
        <button className="btn-primary" disabled={cancel.isPending} onClick={() => cancel.mutate({ shiftId: target.shiftId, input: { reason } }, { onSuccess: onClose })}>
          {cancel.isPending && <Spinner />}
          {target.status === 'CONFIRMED' ? 'Cancel shift' : 'Leave waitlist'}
        </button>
      </div>
    </Modal>
  );
}
