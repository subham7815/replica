import {
  addDays,
  formatDay,
  formatTimeRange,
  shiftInput,
  todayIn,
  type EventDetail,
  type RosterEntry,
  type StaffShift,
} from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import {
  useAssignToShift,
  useCancelEvent,
  useCoverCandidates,
  useDebouncedValue,
  useDeleteEvent,
  useDeleteShift,
  useEvent,
  useRemoveAssignment,
  useSaveEvent,
  useSaveShift,
  useVolunteers,
} from '@newreplica/shared/queries';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { icons } from '../../components/icons';
import { EventStatusBadge, FillBar, PlacesLabel } from '../../components/schedule';
import { EmptyState, Field, FormError, Modal, Spinner, TextArea, Toggle, fieldErrors } from '../../components/ui';

type Dialog =
  | { kind: 'shift'; shift?: StaffShift }
  | { kind: 'deleteShift'; shift: StaffShift }
  | { kind: 'assign'; shift: StaffShift }
  | { kind: 'remove'; entry: RosterEntry; shift: StaffShift }
  | { kind: 'cancelEvent' }
  | { kind: 'deleteEvent' };

export function EventDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const event = useEvent(id);
  const publish = useSaveEvent();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  if (event.isPending) return <div className="mx-auto max-w-5xl skeleton h-96" />;
  if (event.isError) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <FormError error={event.error} />
        <Link to="/app/schedule" className="btn-secondary">
          Back
        </Link>
      </div>
    );
  }

  const e = event.data;
  const live = e.status !== 'CANCELLED';
  const canEditEvent = can('programmes:manage');
  const days = groupByDate(e.shifts);

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/app/schedule" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <icons.arrowRight size={14} className="rotate-180" /> Events & shifts
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="animate-fade-up">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{e.title}</h1>
            <EventStatusBadge status={e.status} />
          </div>
          <p className="mt-1.5 text-sm">
            {[e.location?.name, e.department?.name, `Times in ${e.timezone.replace(/_/g, ' ')}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        {canEditEvent && (
          <div className="flex flex-wrap gap-2">
            {live && (
              <Link to={`/app/schedule/${e.id}/edit`} className="btn-secondary">
                <icons.edit size={16} /> Edit
              </Link>
            )}
            {live && (
              <button className="btn-secondary text-brand" onClick={() => setDialog({ kind: 'cancelEvent' })}>
                <icons.ban size={16} /> Cancel event
              </button>
            )}
            <button className="btn-secondary" onClick={() => setDialog({ kind: 'deleteEvent' })}>
              Delete
            </button>
          </div>
        )}
      </div>

      {e.description && <p className="mt-4 max-w-3xl whitespace-pre-line">{e.description}</p>}

      {e.status === 'DRAFT' && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3">
          <p className="text-sm text-warning">
            <strong>Draft.</strong> Volunteers can’t see this event or sign up until you publish it.
          </p>
          {canEditEvent && (
            <button
              className="btn-primary px-3 py-1.5 text-sm"
              disabled={publish.isPending || e.shifts.length === 0}
              title={e.shifts.length === 0 ? 'Add a shift first' : undefined}
              onClick={() => publish.mutate({ id: e.id, input: { title: e.title, status: 'PUBLISHED' } })}
            >
              {publish.isPending && <Spinner />}
              Publish
            </button>
          )}
        </div>
      )}
      {publish.error && (
        <div className="mt-3">
          <FormError error={publish.error} />
        </div>
      )}
      {e.status === 'CANCELLED' && (
        <div className="mt-6 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand-deep">
          This event was cancelled{e.cancelledAt ? ` on ${formatDay(e.cancelledAt, e.timezone)}` : ''}. Everyone with a place was emailed.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Places filled" value={`${e.confirmedCount}/${e.capacity}`} />
        <Stat label="Open places" value={e.openSpots} tone={e.openSpots > 0 && live ? 'brand' : undefined} />
        <Stat label="On waitlists" value={e.waitlistCount} tone={e.waitlistCount ? 'warning' : undefined} />
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Shifts</h2>
        {live && (
          <button className="btn-primary" onClick={() => setDialog({ kind: 'shift' })}>
            <icons.clock size={16} /> Add shift
          </button>
        )}
      </div>

      {e.shifts.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No shifts yet"
            body="Add a shift for each role and time slot, with how many people you need."
            action={
              live && (
                <button className="btn-primary" onClick={() => setDialog({ kind: 'shift' })}>
                  Add the first shift
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-4 space-y-8">
          {days.map(([date, shifts]) => (
            <section key={date}>
              <h3 className="mb-3 text-sm font-semibold tracking-widest text-muted uppercase">{formatDay(shifts[0]!.startsAt, e.timezone)}</h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {shifts.map((s) => (
                  <ShiftCard key={s.id} shift={s} event={e} live={live} onDialog={setDialog} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {dialog?.kind === 'shift' && <ShiftFormModal event={e} shift={dialog.shift} onClose={close} />}
      {dialog?.kind === 'deleteShift' && <DeleteShiftModal shift={dialog.shift} onClose={close} />}
      {dialog?.kind === 'assign' && <AssignModal shift={dialog.shift} event={e} onClose={close} />}
      {dialog?.kind === 'remove' && <RemoveModal entry={dialog.entry} shift={dialog.shift} onClose={close} />}
      {dialog?.kind === 'cancelEvent' && <CancelEventModal event={e} onClose={close} />}
      {dialog?.kind === 'deleteEvent' && <DeleteEventModal event={e} onClose={close} />}
    </div>
  );
}

function groupByDate(shifts: StaffShift[]) {
  const map = new Map<string, StaffShift[]>();
  for (const s of shifts) map.set(s.date, [...(map.get(s.date) ?? []), s]);
  return [...map.entries()];
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'brand' | 'warning' }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold tracking-widest text-muted uppercase">{label}</p>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${tone === 'brand' ? 'text-brand' : tone === 'warning' ? 'text-warning' : 'text-ink'}`}>{value}</p>
    </div>
  );
}

function ShiftCard({ shift, event, live, onDialog }: { shift: StaffShift; event: EventDetail; live: boolean; onDialog: (d: Dialog) => void }) {
  const [showCancelled, setShowCancelled] = useState(false);
  const confirmed = shift.roster.filter((r) => r.status === 'CONFIRMED');
  const waitlist = shift.roster.filter((r) => r.status === 'WAITLISTED');
  const cancelled = shift.roster.filter((r) => r.status === 'CANCELLED');
  const finished = new Date(shift.endsAt) < new Date();
  const editable = live && !finished;

  return (
    <article className={`card flex flex-col p-5 ${shift.spotsLeft > 0 && editable ? 'border-brand/25' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-ink">{shift.title}</h4>
          <p className="text-sm tabular-nums">{formatTimeRange(shift.startsAt, shift.endsAt, event.timezone)}</p>
        </div>
        {live && (
          <div className="flex gap-1">
            <IconButton label="Edit shift" onClick={() => onDialog({ kind: 'shift', shift })}>
              <icons.edit size={16} />
            </IconButton>
            <IconButton label="Delete shift" onClick={() => onDialog({ kind: 'deleteShift', shift })}>
              <icons.x size={16} />
            </IconButton>
          </div>
        )}
      </div>
      {shift.notes && <p className="mt-2 text-sm text-muted">{shift.notes}</p>}

      <div className="mt-4 space-y-1.5">
        <FillBar confirmed={shift.confirmedCount} capacity={shift.capacity} />
        <PlacesLabel confirmed={shift.confirmedCount} capacity={shift.capacity} waitlist={shift.waitlistCount} />
      </div>

      <ul className="mt-4 divide-y divide-line-soft">
        {confirmed.map((r) => (
          <RosterRow key={r.id} entry={r} onRemove={editable ? () => onDialog({ kind: 'remove', entry: r, shift }) : undefined} />
        ))}
        {confirmed.length === 0 && <li className="py-2 text-sm text-muted">Nobody confirmed yet.</li>}
      </ul>

      {waitlist.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold tracking-widest text-warning uppercase">Waitlist</p>
          <ul className="mt-1 divide-y divide-line-soft">
            {waitlist.map((r) => (
              <RosterRow key={r.id} entry={r} onRemove={editable ? () => onDialog({ kind: 'remove', entry: r, shift }) : undefined} />
            ))}
          </ul>
        </div>
      )}

      {cancelled.length > 0 && (
        <div className="mt-3">
          <button className="text-xs font-semibold text-muted hover:text-ink" onClick={() => setShowCancelled((v) => !v)} aria-expanded={showCancelled}>
            {showCancelled ? 'Hide' : 'Show'} {cancelled.length} cancellation{cancelled.length === 1 ? '' : 's'}
          </button>
          {showCancelled && (
            <ul className="mt-1 divide-y divide-line-soft">
              {cancelled.map((r) => (
                <RosterRow key={r.id} entry={r} />
              ))}
            </ul>
          )}
        </div>
      )}

      {editable && (
        <div className="mt-auto pt-4">
          <button className={`${shift.spotsLeft > 0 ? 'btn-primary' : 'btn-secondary'} w-full`} onClick={() => onDialog({ kind: 'assign', shift })}>
            <icons.userPlus size={16} />
            {shift.spotsLeft > 0 ? `Find cover (${shift.spotsLeft} open)` : 'Add to waitlist'}
          </button>
        </div>
      )}
    </article>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-navy-soft hover:text-ink">
      {children}
    </button>
  );
}

function RosterRow({ entry, onRemove }: { entry: RosterEntry; onRemove?: () => void }) {
  const tags = [
    entry.waitlistPosition && `#${entry.waitlistPosition}`,
    entry.source === 'STAFF' && 'Added by staff',
    entry.promotedAt && 'From waitlist',
    entry.lateCancel && 'Late',
  ].filter(Boolean) as string[];
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${entry.status === 'CANCELLED' ? 'text-muted line-through' : 'text-ink'}`}>
          <Link to={`/app/volunteers/${entry.volunteerId}`} className="hover:text-brand">
            {entry.name}
          </Link>
        </p>
        <p className="truncate text-xs text-muted">
          {entry.status === 'CANCELLED' && entry.cancelReason ? entry.cancelReason : [entry.phone, entry.email].filter(Boolean).join(' · ')}
        </p>
      </div>
      {tags.map((t) => (
        <span key={t} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t === 'Late' ? 'bg-brand-soft text-brand' : 'bg-navy-soft text-navy'}`}>
          {t}
        </span>
      ))}
      {onRemove && (
        <button className="text-xs font-semibold text-muted hover:text-brand" onClick={onRemove}>
          Remove
        </button>
      )}
    </li>
  );
}

// ---------- dialogs ----------

interface ShiftForm {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: string;
  waitlistEnabled: boolean;
  notes: string;
}

function ShiftFormModal({ event, shift, onClose }: { event: EventDetail; shift?: StaffShift; onClose: () => void }) {
  const save = useSaveShift();
  const last = event.shifts.at(-1);
  const [form, setForm] = useState<ShiftForm>(() =>
    shift
      ? { title: shift.title, date: shift.date, startTime: shift.startTime, endTime: shift.endTime, capacity: String(shift.capacity), waitlistEnabled: shift.waitlistEnabled, notes: shift.notes ?? '' }
      : { title: '', date: last?.date ?? addDays(todayIn(event.timezone), 1), startTime: last?.endTime ?? '09:00', endTime: '', capacity: '4', waitlistEnabled: true, notes: '' },
  );
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const set = (key: keyof ShiftForm) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const overnight = form.endTime && form.startTime && form.endTime < form.startTime;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { data, errors } = fieldErrors(shiftInput, form);
    setErrors(errors);
    if (data) save.mutate({ eventId: event.id, id: shift?.id, input: data }, { onSuccess: onClose });
  }

  return (
    <Modal open title={shift ? 'Edit shift' : 'Add a shift'} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Role" value={form.title} onChange={set('title')} placeholder="e.g. Sorting, Front desk, Driver" error={errors?.title} autoFocus />
        <Field label="Date" type="date" value={form.date} onChange={set('date')} error={errors?.date} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts" type="time" value={form.startTime} onChange={set('startTime')} error={errors?.startTime} />
          <Field label="Ends" type="time" value={form.endTime} onChange={set('endTime')} error={errors?.endTime} hint={overnight ? 'Ends the next day' : undefined} />
        </div>
        <Field
          label="People needed"
          type="number"
          min={1}
          max={500}
          inputMode="numeric"
          value={form.capacity}
          onChange={set('capacity')}
          error={errors?.capacity}
          hint={shift && shift.confirmedCount ? `${shift.confirmedCount} already confirmed. Raising this moves people up from the waitlist.` : undefined}
        />
        <Toggle checked={form.waitlistEnabled} onChange={(v) => setForm((f) => ({ ...f, waitlistEnabled: v }))} label="Let people join a waitlist when it’s full" />
        <TextArea label="Notes for volunteers" rows={2} value={form.notes} onChange={set('notes')} error={errors?.notes} />
        <p className="text-xs text-muted">Times are in {event.timezone.replace(/_/g, ' ')}. If you change the time, people on the shift are emailed.</p>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            {shift ? 'Save shift' : 'Add shift'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteShiftModal({ shift, onClose }: { shift: StaffShift; onClose: () => void }) {
  const remove = useDeleteShift();
  const people = shift.confirmedCount + shift.waitlistCount;
  return (
    <Modal open title={`Delete “${shift.title}”?`} onClose={onClose}>
      <p>{people ? `${people} ${people === 1 ? 'person is' : 'people are'} on this shift. They’ll be emailed that it’s cancelled.` : 'Nobody has signed up yet.'}</p>
      <FormError error={remove.error} />
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Keep it
        </button>
        <button className="btn-primary" disabled={remove.isPending} onClick={() => remove.mutate(shift.id, { onSuccess: onClose })}>
          {remove.isPending && <Spinner />}
          Delete shift
        </button>
      </div>
    </Modal>
  );
}

function AssignModal({ shift, event, onClose }: { shift: StaffShift; event: EventDetail; onClose: () => void }) {
  const [tab, setTab] = useState<'suggested' | 'search'>('suggested');
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q.trim());
  const candidates = useCoverCandidates(shift.id);
  const search = useVolunteers({ q: query || undefined, pageSize: 10 });
  const assign = useAssignToShift();
  const [added, setAdded] = useState<string[]>([]);
  const onShift = new Set([...shift.roster.filter((r) => r.status !== 'CANCELLED').map((r) => r.volunteerId), ...added]);

  const add = (volunteerId: string) =>
    assign.mutate({ shiftId: shift.id, input: { volunteerId } }, { onSuccess: () => setAdded((a) => [...a, volunteerId]) });

  return (
    <Modal open wide title={`${shift.title} · ${formatDay(shift.startsAt, event.timezone)}, ${formatTimeRange(shift.startsAt, shift.endsAt, event.timezone)}`} onClose={onClose}>
      <p className="text-sm">
        {shift.spotsLeft > 0
          ? `${shift.spotsLeft} place${shift.spotsLeft === 1 ? '' : 's'} open. People you add are confirmed and emailed.`
          : 'This shift is full. People you add join the waitlist.'}
      </p>
      <div role="tablist" className="mt-4 inline-flex rounded-lg bg-navy-soft p-1 text-sm font-medium">
        {(
          [
            ['suggested', 'Suggested cover'],
            ['search', 'Search all volunteers'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 transition ${tab === key ? 'bg-white text-ink shadow-dx-sm' : 'text-muted hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <FormError error={assign.error} />
      </div>

      {tab === 'suggested' ? (
        candidates.isPending ? (
          <div className="skeleton mt-3 h-40" />
        ) : candidates.isError ? (
          <FormError error={candidates.error} />
        ) : candidates.data.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Everyone is already on this shift or busy at that time.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft">
            {candidates.data.map((c) => (
              <PersonRow
                key={c.volunteerId}
                name={c.name}
                detail={[c.phone, c.email].filter(Boolean).join(' · ')}
                tags={[c.available && 'Usually free then', c.inDepartment && event.department?.name, `${c.upcomingShifts} upcoming`].filter(Boolean) as string[]}
                done={onShift.has(c.volunteerId)}
                busy={assign.isPending && assign.variables?.input.volunteerId === c.volunteerId}
                onAdd={() => add(c.volunteerId)}
              />
            ))}
          </ul>
        )
      ) : (
        <div className="mt-3">
          <Field label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or phone" autoFocus />
          {search.isPending ? (
            <div className="skeleton mt-3 h-40" />
          ) : search.isError ? (
            <FormError error={search.error} />
          ) : (
            <ul className="mt-3 divide-y divide-line-soft">
              {search.data.items.map((v) => (
                <PersonRow
                  key={v.id}
                  name={v.name}
                  detail={[v.phone, v.email].filter(Boolean).join(' · ')}
                  tags={v.status === 'ACTIVE' || v.status === 'INVITED' ? [] : [v.status === 'SUSPENDED' ? 'Suspended' : 'Inactive']}
                  done={onShift.has(v.id)}
                  busy={assign.isPending && assign.variables?.input.volunteerId === v.id}
                  onAdd={() => add(v.id)}
                />
              ))}
              {search.data.items.length === 0 && <li className="py-3 text-sm text-muted">No volunteers match.</li>}
            </ul>
          )}
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button className="btn-secondary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}

function PersonRow({ name, detail, tags, done, busy, onAdd }: { name: string; detail: string; tags: string[]; done: boolean; busy: boolean; onAdd: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="truncate text-xs text-muted">{detail}</p>
      </div>
      {tags.map((t) => (
        <span key={t} className="rounded-full bg-navy-soft px-2 py-0.5 text-[11px] font-semibold text-navy">
          {t}
        </span>
      ))}
      {done ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
          <icons.check size={14} /> On shift
        </span>
      ) : (
        <button className="btn-secondary px-3 py-1.5 text-xs" disabled={busy} onClick={onAdd}>
          {busy && <Spinner className="h-3 w-3" />}
          Add
        </button>
      )}
    </li>
  );
}

function RemoveModal({ entry, shift, onClose }: { entry: RosterEntry; shift: StaffShift; onClose: () => void }) {
  const remove = useRemoveAssignment();
  const [reason, setReason] = useState('');
  const promotes = entry.status === 'CONFIRMED' && shift.waitlistCount > 0;
  return (
    <Modal open title={`Remove ${entry.name}?`} onClose={onClose}>
      <p>
        They’ll be emailed that they’re off this shift.
        {promotes && ' The first person on the waitlist will be confirmed in their place.'}
      </p>
      <div className="mt-4">
        <TextArea label="Message (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} hint="Included in the email." />
      </div>
      <FormError error={remove.error} />
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Keep
        </button>
        <button className="btn-primary" disabled={remove.isPending} onClick={() => remove.mutate({ id: entry.id, input: { reason } }, { onSuccess: onClose })}>
          {remove.isPending && <Spinner />}
          Remove
        </button>
      </div>
    </Modal>
  );
}

function CancelEventModal({ event, onClose }: { event: EventDetail; onClose: () => void }) {
  const cancel = useCancelEvent();
  const [reason, setReason] = useState('');
  const people = event.confirmedCount + event.waitlistCount;
  return (
    <Modal open title={`Cancel “${event.title}”?`} onClose={onClose}>
      <p>
        {people
          ? `${people} ${people === 1 ? 'person' : 'people'} with a place will be emailed. The event stays in your list as cancelled.`
          : 'Nobody has signed up yet. The event stays in your list as cancelled.'}
      </p>
      <div className="mt-4">
        <TextArea label="Message to volunteers (optional)" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The hall is closed for repairs." />
      </div>
      <FormError error={cancel.error} />
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Keep event
        </button>
        <button className="btn-primary" disabled={cancel.isPending} onClick={() => cancel.mutate({ id: event.id, input: { reason } }, { onSuccess: onClose })}>
          {cancel.isPending && <Spinner />}
          Cancel event
        </button>
      </div>
    </Modal>
  );
}

function DeleteEventModal({ event, onClose }: { event: EventDetail; onClose: () => void }) {
  const remove = useDeleteEvent();
  const navigate = useNavigate();
  const people = event.status === 'CANCELLED' ? 0 : event.confirmedCount + event.waitlistCount;
  return (
    <Modal open title={`Delete “${event.title}”?`} onClose={onClose}>
      <p>
        This removes the event, its shifts and its rota history for good.
        {people > 0 && ` The ${people} ${people === 1 ? 'person' : 'people'} signed up will be emailed.`} To keep a record, cancel it instead.
      </p>
      <FormError error={remove.error} />
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Keep
        </button>
        <button className="btn-primary" disabled={remove.isPending} onClick={() => remove.mutate(event.id, { onSuccess: () => navigate('/app/schedule', { replace: true }) })}>
          {remove.isPending && <Spinner />}
          Delete for good
        </button>
      </div>
    </Modal>
  );
}
