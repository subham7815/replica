import { departmentInput, locationInput, type Department, type Location } from '@newreplica/shared';
import { useDeleteDepartment, useDeleteLocation, useDepartments, useLocations, useSaveDepartment, useSaveLocation } from '@newreplica/shared/queries';
import { useState, type FormEvent } from 'react';
import { icons } from '../../components/icons';
import { EmptyState, Field, FormError, Modal, Spinner, TextArea, fieldErrors } from '../../components/ui';

type Editing<T> = { mode: 'new' } | { mode: 'edit'; item: T } | null;

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-navy-soft hover:text-ink" onClick={onEdit} aria-label="Edit">
        <icons.edit size={16} />
      </button>
      <button className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-brand" onClick={onDelete} aria-label="Delete">
        <icons.x size={16} />
      </button>
    </div>
  );
}

function ConfirmDelete({ name, open, onClose, onConfirm, pending, error, extra }: {
  name: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: unknown;
  extra?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={`Delete ${name}?`}>
      <p>This can’t be undone.{extra ? ` ${extra}` : ''}</p>
      <FormError error={error} />
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" onClick={onConfirm} disabled={pending}>
          {pending && <Spinner />}
          Delete
        </button>
      </div>
    </Modal>
  );
}

// ---------- locations ----------

export function LocationsTab() {
  const list = useLocations();
  const save = useSaveLocation();
  const del = useDeleteLocation();
  const [editing, setEditing] = useState<Editing<Location>>(null);
  const [deleting, setDeleting] = useState<Location | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);

  const open = (e: Editing<Location>) => {
    setErrors(null);
    save.reset();
    setEditing(e);
  };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data, errors } = fieldErrors(locationInput, Object.fromEntries(new FormData(e.currentTarget)));
    setErrors(errors);
    if (data) save.mutate({ id: editing?.mode === 'edit' ? editing.item.id : undefined, input: data }, { onSuccess: () => setEditing(null) });
  }

  const item = editing?.mode === 'edit' ? editing.item : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm">Places where shifts happen.</p>
        <button className="btn-primary" onClick={() => open({ mode: 'new' })}>
          Add location
        </button>
      </div>
      {list.isPending ? (
        <div className="skeleton h-32" />
      ) : list.isError ? (
        <FormError error={list.error} />
      ) : list.data.length === 0 ? (
        <EmptyState title="No locations yet" body="Add the halls, warehouses or venues where your volunteers work." />
      ) : (
        <ul className="card divide-y divide-line-soft">
          {list.data.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium text-ink">{l.name}</p>
                {l.address && <p className="text-sm">{l.address}</p>}
                {l.notes && <p className="mt-1 text-xs text-muted">{l.notes}</p>}
              </div>
              <RowActions onEdit={() => open({ mode: 'edit', item: l })} onDelete={() => (del.reset(), setDeleting(l))} />
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={item ? 'Edit location' : 'Add location'}>
        {editing && (
          <form key={item?.id ?? 'new'} onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label="Name" name="name" defaultValue={item?.name} autoFocus error={errors?.name} />
            <Field label="Address" name="address" defaultValue={item?.address ?? ''} error={errors?.address} />
            <TextArea label="Notes" name="notes" defaultValue={item?.notes ?? ''} hint="Parking, access codes, where to report…" error={errors?.notes} />
            <FormError error={save.error} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={save.isPending}>
                {save.isPending && <Spinner />}
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDelete
        name={deleting?.name ?? ''}
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        pending={del.isPending}
        error={del.error}
      />
    </div>
  );
}

// ---------- departments ----------

export function DepartmentsTab() {
  const list = useDepartments();
  const save = useSaveDepartment();
  const del = useDeleteDepartment();
  const [editing, setEditing] = useState<Editing<Department>>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);

  const open = (e: Editing<Department>) => {
    setErrors(null);
    save.reset();
    setEditing(e);
  };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data, errors } = fieldErrors(departmentInput, Object.fromEntries(new FormData(e.currentTarget)));
    setErrors(errors);
    if (data) save.mutate({ id: editing?.mode === 'edit' ? editing.item.id : undefined, input: data }, { onSuccess: () => setEditing(null) });
  }

  const item = editing?.mode === 'edit' ? editing.item : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm">Group volunteers by team or area of work.</p>
        <button className="btn-primary" onClick={() => open({ mode: 'new' })}>
          Add department
        </button>
      </div>
      {list.isPending ? (
        <div className="skeleton h-32" />
      ) : list.isError ? (
        <FormError error={list.error} />
      ) : list.data.length === 0 ? (
        <EmptyState title="No departments yet" body="For example: Warehouse, Front desk, Deliveries." />
      ) : (
        <ul className="card divide-y divide-line-soft">
          {list.data.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {d.name}
                  <span className="ml-2 rounded-full bg-navy-soft px-2 py-0.5 text-xs font-medium text-muted">
                    {d.memberCount} {d.memberCount === 1 ? 'person' : 'people'}
                  </span>
                </p>
                {d.description && <p className="text-sm">{d.description}</p>}
              </div>
              <RowActions onEdit={() => open({ mode: 'edit', item: d })} onDelete={() => (del.reset(), setDeleting(d))} />
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={item ? 'Edit department' : 'Add department'}>
        {editing && (
          <form key={item?.id ?? 'new'} onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label="Name" name="name" defaultValue={item?.name} autoFocus error={errors?.name} />
            <TextArea label="Description" name="description" defaultValue={item?.description ?? ''} error={errors?.description} />
            <FormError error={save.error} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={save.isPending}>
                {save.isPending && <Spinner />}
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDelete
        name={deleting?.name ?? ''}
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        pending={del.isPending}
        error={del.error}
        extra={deleting?.memberCount ? `${deleting.memberCount} people will be taken out of this department, but stay in your organisation.` : undefined}
      />
    </div>
  );
}
