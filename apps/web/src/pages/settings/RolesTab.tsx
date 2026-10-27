import { ORG_ROLES, PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS, ROLE_PERMISSIONS } from '@newreplica/shared';
import { icons } from '../../components/icons';

const ORG_PERMISSIONS = PERMISSIONS.filter((p) => p !== 'tenants:manage');

export function RolesTab() {
  return (
    <div>
      <p className="mb-4 text-sm">
        What each role can do. Every action is checked on the server, so hiding a button is never the only protection.
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line bg-surface">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted uppercase">
                Permission
              </th>
              {ORG_ROLES.map((r) => (
                <th key={r} scope="col" className="px-3 py-3 text-center text-xs font-semibold text-ink">
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {ORG_PERMISSIONS.map((p) => (
              <tr key={p}>
                <th scope="row" className="px-4 py-3 text-left font-normal text-text">
                  {PERMISSION_LABELS[p]}
                </th>
                {ORG_ROLES.map((r) => {
                  const has = ROLE_PERMISSIONS[r].includes(p);
                  return (
                    <td key={r} className="px-3 py-3 text-center">
                      {has ? (
                        <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-success-soft text-success" aria-label="Allowed">
                          <icons.check size={14} />
                        </span>
                      ) : (
                        <span className="text-line-strong" aria-label="Not allowed">
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted">Roles are fixed for now. Limiting access by location or programme is planned.</p>
    </div>
  );
}
