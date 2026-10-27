import { ROLE_LABELS, STAFF_ROLES, inviteStaffInput, type StaffRole, type TeamMember } from '@newreplica/shared';
import { useInviteStaff, useRemoveStaff, useTeam, useUpdateStaff } from '@newreplica/shared/queries';
import { useState, type FormEvent } from 'react';
import { Field, FormError, Modal, Select, Spinner, StatusBadge, fieldErrors, formatDate } from '../../components/ui';

export function TeamTab() {
  const team = useTeam();
  const invite = useInviteStaff();
  const update = useUpdateStaff();
  const remove = useRemoveStaff();
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);

  function onInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data, errors } = fieldErrors(inviteStaffInput, Object.fromEntries(new FormData(e.currentTarget)));
    setErrors(errors);
    if (data) invite.mutate(data, { onSuccess: () => setInviting(false) });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm">People who help run your organisation. Volunteers are managed on the Volunteers page.</p>
        <button
          className="btn-primary shrink-0"
          onClick={() => {
            setErrors(null);
            invite.reset();
            setInviting(true);
          }}
        >
          Invite team member
        </button>
      </div>

      <FormError error={update.error} />

      {team.isPending ? (
        <div className="skeleton h-40" />
      ) : team.isError ? (
        <FormError error={team.error} />
      ) : (
        <div className="card mt-2 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-5 py-3">Person</th>
                <th className="px-5 py-3">Role</th>
                <th className="hidden px-5 py-3 sm:table-cell">Status</th>
                <th className="hidden px-5 py-3 md:table-cell">Last active</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {team.data.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink">
                      {m.name}
                      {m.isYou && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">You</span>}
                    </p>
                    <p className="text-xs text-muted">{m.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {m.isYou ? (
                      ROLE_LABELS[m.role]
                    ) : (
                      <select
                        aria-label={`Role for ${m.name}`}
                        value={m.role}
                        disabled={update.isPending}
                        onChange={(e) => update.mutate({ id: m.id, input: { role: e.target.value as StaffRole } })}
                        className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/10"
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="hidden px-5 py-3.5 sm:table-cell">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="hidden px-5 py-3.5 text-muted md:table-cell">{formatDate(m.lastLoginAt)}</td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    {!m.isYou && (
                      <>
                        <button
                          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-navy-soft hover:text-ink"
                          onClick={() => update.mutate({ id: m.id, input: { status: m.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' } })}
                        >
                          {m.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                        </button>
                        <button
                          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand hover:bg-brand-soft"
                          onClick={() => {
                            remove.reset();
                            setRemoving(m);
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={inviting} onClose={() => setInviting(false)} title="Invite team member">
        {inviting && (
          <form onSubmit={onInvite} noValidate className="space-y-4">
            <Field label="Name" name="name" autoFocus error={errors?.name} />
            <Field label="Email" name="email" type="email" error={errors?.email} />
            <Select label="Role" name="role" defaultValue="COORDINATOR" error={errors?.role}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
            <p className="text-sm text-muted">They’ll get an email and sign in with a one-time code.</p>
            <FormError error={invite.error} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setInviting(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={invite.isPending}>
                {invite.isPending && <Spinner />}
                Send invite
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!removing} onClose={() => setRemoving(null)} title={`Remove ${removing?.name}?`}>
        <p>They’ll lose access to your organisation straight away.</p>
        <FormError error={remove.error} />
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setRemoving(null)}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={remove.isPending}
            onClick={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
          >
            {remove.isPending && <Spinner />}
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
}
