import {
  MEMBER_STATUSES,
  MEMBER_STATUS_LABELS,
  summarizeAvailability,
  updateVolunteerInput,
  volunteerInput,
  type Availability,
  type MemberStatus,
  type Volunteer,
} from '@newreplica/shared';
import { useCreateVolunteer, useDeleteVolunteer, useDepartments, useUpdateVolunteer, useVolunteer } from '@newreplica/shared/queries';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { icons } from '../../components/icons';
import { Field, FormError, Modal, Select, Spinner, StatusBadge, TextArea, Toggle, fieldErrors, formatDate } from '../../components/ui';
import { AvailabilityGrid, DepartmentPicker, SkillsInput } from '../../components/volunteers';

interface FormState {
  name: string;
  email: string;
  phone: string;
  status: MemberStatus;
  skills: string[];
  notes: string;
  availability: Availability;
  departmentIds: string[];
  sendInvite: boolean;
}

const EMPTY: FormState = {
  name: '',
  email: '',
  phone: '',
  status: 'INVITED',
  skills: [],
  notes: '',
  availability: {},
  departmentIds: [],
  sendInvite: true,
};

function fromVolunteer(v: Volunteer): FormState {
  return {
    name: v.name,
    email: v.email,
    phone: v.phone ?? '',
    status: v.status,
    skills: v.skills,
    notes: v.notes ?? '',
    availability: v.availability,
    departmentIds: v.departments.map((d) => d.id),
    sendInvite: false,
  };
}

export function VolunteerFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const volunteer = useVolunteer(id);
  const departments = useDepartments();
  const create = useCreateVolunteer();
  const update = useUpdateVolunteer();
  const remove = useDeleteVolunteer();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (volunteer.data) setForm(fromVolunteer(volunteer.data));
  }, [volunteer.data]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const mutation = isNew ? create : update;
  const identityLocked = !isNew && volunteer.data && !volunteer.data.identityEditable;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (isNew) {
      const { data, errors } = fieldErrors(volunteerInput, form);
      setErrors(errors);
      if (data) create.mutate(data, { onSuccess: (v) => navigate(`/app/volunteers/${v.id}`, { replace: true }) });
    } else {
      const { sendInvite: _ignored, ...rest } = form;
      const { data, errors } = fieldErrors(updateVolunteerInput, rest);
      setErrors(errors);
      if (data) update.mutate({ id: id!, input: data }, { onSuccess: () => setSaved(true) });
    }
  }

  if (!isNew && volunteer.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton h-9 w-60" />
        <div className="skeleton h-96" />
      </div>
    );
  }
  if (!isNew && volunteer.isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <FormError error={volunteer.error} />
        <Link to="/app/volunteers" className="btn-secondary">
          Back to volunteers
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/app/volunteers" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <icons.arrowRight size={14} className="rotate-180" /> Volunteers
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? 'Add volunteer' : volunteer.data!.name}</h1>
          {!isNew && (
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge status={volunteer.data!.status} />
              <span className="text-muted">Added {formatDate(volunteer.data!.createdAt)} · Last active {formatDate(volunteer.data!.lastLoginAt)}</span>
            </p>
          )}
        </div>
        {!isNew && (
          <button className="btn-secondary text-brand" onClick={() => setConfirmDelete(true)}>
            Remove
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold">Contact details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={form.name} onChange={(e) => set('name')(e.target.value)} disabled={!!identityLocked} error={errors?.name} />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              disabled={!!identityLocked}
              error={errors?.email}
            />
            <Field label="Phone" type="tel" value={form.phone} onChange={(e) => set('phone')(e.target.value)} error={errors?.phone} />
            <Select label="Status" value={form.status} onChange={(e) => set('status')(e.target.value as MemberStatus)}>
              {MEMBER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {MEMBER_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          {identityLocked && (
            <p className="rounded-lg bg-navy-soft px-3.5 py-2.5 text-sm">
              {volunteer.data!.name} manages their own name and email now that they have a Replica account.
            </p>
          )}
        </section>

        <section className="card space-y-5 p-6">
          <h2 className="font-semibold">Volunteering</h2>
          <DepartmentPicker departments={departments.data ?? []} value={form.departmentIds} onChange={set('departmentIds')} />
          <SkillsInput value={form.skills} onChange={set('skills')} error={errors?.skills} />
          <div>
            <AvailabilityGrid value={form.availability} onChange={set('availability')} />
            <p className="mt-1.5 text-sm text-muted">{summarizeAvailability(form.availability)}</p>
          </div>
          <TextArea
            label="Notes"
            hint="Only your team can see these."
            value={form.notes}
            onChange={(e) => set('notes')(e.target.value)}
            error={errors?.notes}
          />
        </section>

        {isNew && <Toggle checked={form.sendInvite} onChange={set('sendInvite')} label="Email an invitation to sign in" />}

        <FormError error={mutation.error} />
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex animate-fade-up items-center gap-1.5 text-sm font-medium text-success">
              <icons.check size={16} /> Saved
            </span>
          )}
          <Link to="/app/volunteers" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {isNew ? 'Add volunteer' : 'Save changes'}
          </button>
        </div>
      </form>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Remove volunteer?">
        <p>
          {volunteer.data?.name} will be removed from your organisation. Their account stays if they volunteer elsewhere.
        </p>
        <FormError error={remove.error} />
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={remove.isPending}
            onClick={() => remove.mutate(id!, { onSuccess: () => navigate('/app/volunteers', { replace: true }) })}
          >
            {remove.isPending && <Spinner />}
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
}
