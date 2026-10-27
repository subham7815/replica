import { MEMBER_STATUSES, MEMBER_STATUS_LABELS, type MemberStatus } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useDebouncedValue, useDepartments, useVolunteers } from '@newreplica/shared/queries';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { icons } from '../../components/icons';
import { EmptyState, FormError, PageHeader, Spinner, StatusBadge, formatDate } from '../../components/ui';
import { downloadText } from '../../lib/download';
import { ImportDialog } from './ImportDialog';

const PAGE_SIZE = 25;

export function VolunteersPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<MemberStatus | ''>('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);

  const filters = { q: useDebouncedValue(q.trim()) || undefined, status: status || undefined, departmentId: departmentId || undefined };
  const list = useVolunteers({ ...filters, page, pageSize: PAGE_SIZE });
  const departments = useDepartments();
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;
  const filtered = !!(filters.q || filters.status || filters.departmentId);

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      downloadText(`volunteers-${new Date().toISOString().slice(0, 10)}.csv`, await api.exportVolunteersCsv(filters));
    } catch (err) {
      setExportError(err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Volunteers"
        description={list.data ? `${list.data.total} ${list.data.total === 1 ? 'volunteer' : 'volunteers'}${filtered ? ' match your filters' : ''}` : ' '}
        actions={
          <>
            <button className="btn-secondary" onClick={() => setImporting(true)}>
              <icons.download size={16} className="rotate-180" /> Import CSV
            </button>
            <button className="btn-secondary" onClick={exportCsv} disabled={exporting}>
              {exporting ? <Spinner /> : <icons.download size={16} />} Export CSV
            </button>
            <Link to="/app/volunteers/new" className="btn-primary">
              <icons.userPlus size={16} /> Add volunteer
            </Link>
          </>
        }
      />
      {exportError ? (
        <div className="mt-4">
          <FormError error={exportError} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_180px_200px]">
        <label className="relative">
          <span className="sr-only">Search volunteers</span>
          <svg className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, phone or skill"
            className="w-full rounded-lg border border-line bg-white py-2.5 pr-3.5 pl-10 text-ink shadow-dx-sm placeholder:text-faint focus:outline-none focus-visible:border-ink/40 focus-visible:ring-4 focus-visible:ring-ink/10"
          />
        </label>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as MemberStatus | '');
            setPage(1);
          }}
          className="rounded-lg border border-line bg-white px-3 py-2.5 text-ink shadow-dx-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/10"
        >
          <option value="">All statuses</option>
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MEMBER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by department"
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-line bg-white px-3 py-2.5 text-ink shadow-dx-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/10"
        >
          <option value="">All departments</option>
          {departments.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        {list.isPending ? (
          <div className="card space-y-3 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton h-10" />
            ))}
          </div>
        ) : list.isError ? (
          <FormError error={list.error} />
        ) : list.data.items.length === 0 ? (
          filtered ? (
            <EmptyState title="No volunteers match" body="Try a different search or clear the filters." />
          ) : (
            <EmptyState
              title="No volunteers yet"
              body="Add people one at a time, or import a spreadsheet of your existing volunteers."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <button className="btn-secondary" onClick={() => setImporting(true)}>
                    Import CSV
                  </button>
                  <Link to="/app/volunteers/new" className="btn-primary">
                    Add volunteer
                  </Link>
                </div>
              }
            />
          )
        ) : (
          <div className={`card overflow-hidden transition-opacity ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3">Volunteer</th>
                  <th scope="col" className="hidden px-5 py-3 md:table-cell">Phone</th>
                  <th scope="col" className="hidden px-5 py-3 lg:table-cell">Departments</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="hidden px-5 py-3 sm:table-cell">Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {list.data.items.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/app/volunteers/${v.id}`)}
                    className="cursor-pointer transition hover:bg-brand-soft/40"
                  >
                    <td className="px-5 py-3.5">
                      <Link to={`/app/volunteers/${v.id}`} className="font-medium text-ink hover:text-brand" onClick={(e) => e.stopPropagation()}>
                        {v.name}
                      </Link>
                      <p className="truncate text-xs text-muted">{v.email}</p>
                    </td>
                    <td className="hidden px-5 py-3.5 md:table-cell">{v.phone ?? <span className="text-faint">—</span>}</td>
                    <td className="hidden px-5 py-3.5 lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {v.departments.length ? (
                          v.departments.map((d) => (
                            <span key={d.id} className="rounded-full bg-navy-soft px-2 py-0.5 text-xs text-ink">
                              {d.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="hidden px-5 py-3.5 text-muted sm:table-cell">{formatDate(v.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
                <span className="text-muted">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </button>
                  <button className="btn-secondary px-3 py-1.5" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ImportDialog open={importing} onClose={() => setImporting(false)} />
    </div>
  );
}
