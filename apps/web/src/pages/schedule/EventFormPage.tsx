import { eventInput } from '@newreplica/shared';
import { useDepartments, useEvent, useLocations, useSaveEvent } from '@newreplica/shared/queries';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { icons } from '../../components/icons';
import { Field, FormError, Select, Spinner, TextArea, fieldErrors } from '../../components/ui';

interface FormState {
  title: string;
  description: string;
  locationId: string;
  departmentId: string;
}

const EMPTY: FormState = { title: '', description: '', locationId: '', departmentId: '' };

export function EventFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const existing = useEvent(id);
  const locations = useLocations();
  const departments = useDepartments();
  const save = useSaveEvent();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const e = existing.data;
    if (e) setForm({ title: e.title, description: e.description ?? '', locationId: e.location?.id ?? '', departmentId: e.department?.id ?? '' });
  }, [existing.data]);

  const set = (key: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { data, errors } = fieldErrors(eventInput, { ...form, locationId: form.locationId || null, departmentId: form.departmentId || null });
    setErrors(errors);
    if (data) save.mutate({ id, input: data }, { onSuccess: (ev) => navigate(`/app/schedule/${ev.id}`, { replace: true }) });
  }

  if (!isNew && existing.isPending) return <div className="mx-auto max-w-2xl skeleton h-96" />;
  if (!isNew && existing.isError) return <FormError error={existing.error} />;
  const back = isNew ? '/app/schedule' : `/app/schedule/${id}`;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={back} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <icons.arrowRight size={14} className="rotate-180" /> {isNew ? 'Events & shifts' : existing.data!.title}
      </Link>
      <h1 className="mt-3 animate-fade-up text-3xl font-bold tracking-tight">{isNew ? 'New event' : 'Edit event'}</h1>
      {isNew && <p className="mt-1.5">Start with the basics. You’ll add shifts on the next screen.</p>}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <section className="card space-y-4 p-6">
          <Field label="Title" value={form.title} onChange={set('title')} placeholder="e.g. Saturday food sorting" error={errors?.title} />
          <TextArea
            label="Description"
            rows={4}
            value={form.description}
            onChange={set('description')}
            hint="Volunteers see this when they sign up. Mention what to wear or bring."
            error={errors?.description}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Location" value={form.locationId} onChange={set('locationId')} error={errors?.locationId}>
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
              onChange={set('departmentId')}
              hint="Its volunteers are suggested first for cover."
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

        <FormError error={save.error} />
        <div className="flex justify-end gap-3">
          <Link to={back} className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            {isNew ? 'Create and add shifts' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
