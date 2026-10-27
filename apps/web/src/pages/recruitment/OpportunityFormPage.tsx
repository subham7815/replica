import {
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_STATUS_LABELS,
  SIGNUP_MODES,
  SIGNUP_MODE_LABELS,
  VISIBILITIES,
  VISIBILITY_LABELS,
  opportunityInput,
  type Opportunity,
  type OpportunityStatus,
  type Question,
  type SignupMode,
  type Visibility,
} from '@newreplica/shared';
import { useDeleteOpportunity, useDepartments, useLocations, useOpportunity, useSaveOpportunity } from '@newreplica/shared/queries';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { icons } from '../../components/icons';
import { Field, FormError, Modal, Select, Spinner, TextArea, fieldErrors } from '../../components/ui';
import { CopyLinkButton } from './OpportunitiesTab';
import { QuestionBuilder } from './QuestionBuilder';

interface FormState {
  title: string;
  summary: string;
  description: string;
  commitment: string;
  locationId: string;
  departmentId: string;
  status: OpportunityStatus;
  signupMode: SignupMode;
  visibility: Visibility;
  questions: Question[];
}

const EMPTY: FormState = {
  title: '',
  summary: '',
  description: '',
  commitment: '',
  locationId: '',
  departmentId: '',
  status: 'DRAFT',
  signupMode: 'APPROVAL',
  visibility: 'PUBLIC',
  questions: [],
};

const fromOpportunity = (o: Opportunity): FormState => ({
  title: o.title,
  summary: o.summary,
  description: o.description ?? '',
  commitment: o.commitment ?? '',
  locationId: o.location?.id ?? '',
  departmentId: o.department?.id ?? '',
  status: o.status,
  signupMode: o.signupMode,
  visibility: o.visibility,
  questions: o.questions,
});

function Choice<T extends string>({ name, value, options, labels, onChange }: { name: string; value: T; options: readonly T[]; labels: Record<T, string>; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const [head, tail] = labels[o].split(': ');
        return (
          <label
            key={o}
            className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition ${value === o ? 'border-brand bg-brand-soft/50' : 'border-line bg-white hover:border-line-strong'}`}
          >
            <input type="radio" name={name} checked={value === o} onChange={() => onChange(o)} className="mt-1 accent-brand" />
            <span>
              <span className="block text-sm font-semibold text-ink">{head}</span>
              {tail && <span className="block text-xs text-muted">{tail}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function OpportunityFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const existing = useOpportunity(id);
  const locations = useLocations();
  const departments = useDepartments();
  const save = useSaveOpportunity();
  const remove = useDeleteOpportunity();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (existing.data) setForm(fromOpportunity(existing.data));
  }, [existing.data]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  const set = <K extends keyof FormState>(key: K) => (v: FormState[K]) => setForm((f) => ({ ...f, [key]: v }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = { ...form, locationId: form.locationId || null, departmentId: form.departmentId || null };
    const { data, errors } = fieldErrors(opportunityInput, payload);
    setErrors(errors);
    if (!data) return;
    save.mutate(
      { id, input: data },
      { onSuccess: (o) => (isNew ? navigate(`/app/recruitment/opportunities/${o.id}`, { replace: true }) : setSaved(true)) },
    );
  }

  if (!isNew && existing.isPending) return <div className="mx-auto max-w-3xl skeleton h-96" />;
  if (!isNew && existing.isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <FormError error={existing.error} />
        <Link to="/app/recruitment/opportunities" className="btn-secondary">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/app/recruitment/opportunities" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <icons.arrowRight size={14} className="rotate-180" /> Recruitment
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="animate-fade-up text-3xl font-bold tracking-tight">{isNew ? 'New opportunity' : existing.data!.title}</h1>
        {!isNew && existing.data!.status === 'PUBLISHED' && (
          <div className="flex gap-2">
            <CopyLinkButton id={id!} />
            <a href={`/opportunities/${id}`} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1.5 text-xs">
              View public page
            </a>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold">The role</h2>
          <Field label="Title" value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="e.g. Saturday food sorting" error={errors?.title} />
          <Field
            label="One-line summary"
            value={form.summary}
            onChange={(e) => set('summary')(e.target.value)}
            hint="Shown on cards in Discover and on your organisation page."
            error={errors?.summary}
          />
          <TextArea label="Description" rows={6} value={form.description} onChange={(e) => set('description')(e.target.value)} error={errors?.description} />
          <Field
            label="Commitment"
            value={form.commitment}
            onChange={(e) => set('commitment')(e.target.value)}
            placeholder="e.g. Saturdays 9:00–12:00, weekly"
            error={errors?.commitment}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Location" value={form.locationId} onChange={(e) => set('locationId')(e.target.value)} error={errors?.locationId}>
              <option value="">No location</option>
              {locations.data?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Select
              label="Department"
              value={form.departmentId}
              onChange={(e) => set('departmentId')(e.target.value)}
              hint="People who join are added to this department."
              error={errors?.departmentId}
            >
              <option value="">No department</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <section className="card space-y-5 p-6">
          <div>
            <h2 className="mb-3 font-semibold">How people join</h2>
            <Choice name="signupMode" value={form.signupMode} options={SIGNUP_MODES} labels={SIGNUP_MODE_LABELS} onChange={set('signupMode')} />
          </div>
          <div>
            <h2 className="mb-3 font-semibold">Who can find it</h2>
            <Choice name="visibility" value={form.visibility} options={VISIBILITIES} labels={VISIBILITY_LABELS} onChange={set('visibility')} />
          </div>
        </section>

        <section className="card p-6">
          <QuestionBuilder value={form.questions} onChange={set('questions')} error={errors?.questions} />
        </section>

        <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="font-semibold">Status</h2>
            <p className="text-sm text-muted">Only published roles accept applications.</p>
          </div>
          <div role="radiogroup" className="inline-flex rounded-lg bg-navy-soft p-1 text-sm font-medium">
            {OPPORTUNITY_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={form.status === s}
                onClick={() => set('status')(s)}
                className={`rounded-md px-3 py-1.5 transition ${form.status === s ? 'bg-white text-ink shadow-dx-sm' : 'text-muted hover:text-ink'}`}
              >
                {OPPORTUNITY_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </section>

        <FormError error={save.error} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isNew ? (
            <button type="button" className="btn-secondary text-brand" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {saved && (
              <span className="inline-flex animate-fade-up items-center gap-1.5 text-sm font-medium text-success">
                <icons.check size={16} /> Saved
              </span>
            )}
            <button type="submit" className="btn-primary" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              {isNew ? 'Create opportunity' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this opportunity?">
        <p>Its applications are deleted too. Volunteers who already joined stay in your volunteer list.</p>
        <FormError error={remove.error} />
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={remove.isPending}
            onClick={() => remove.mutate(id!, { onSuccess: () => navigate('/app/recruitment/opportunities', { replace: true }) })}
          >
            {remove.isPending && <Spinner />}
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
