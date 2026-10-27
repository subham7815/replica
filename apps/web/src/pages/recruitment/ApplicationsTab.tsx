import type { Application, ApplicationStatus } from '@newreplica/shared';
import { useApplication, useApplications, useOpportunities, useReviewApplication } from '@newreplica/shared/queries';
import { useState } from 'react';
import { Link } from 'react-router';
import { ApplicationStatusBadge } from '../../components/recruitment';
import { EmptyState, FormError, Modal, Spinner, formatDate } from '../../components/ui';

const FILTERS: { value: ApplicationStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Waiting' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Declined' },
  { value: 'ALL', label: 'All' },
];

const PAGE_SIZE = 20;

export function ApplicationsTab() {
  const [status, setStatus] = useState<ApplicationStatus | 'ALL'>('PENDING');
  const [opportunityId, setOpportunityId] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const opportunities = useOpportunities();
  const list = useApplications({ status: status === 'ALL' ? undefined : status, opportunityId: opportunityId || undefined, page, pageSize: PAGE_SIZE });
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex rounded-lg bg-navy-soft p-1 text-sm font-medium">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={status === f.value}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 transition ${status === f.value ? 'bg-white text-ink shadow-dx-sm' : 'text-muted hover:text-ink'}`}
            >
              {f.label}
              {f.value === 'PENDING' && list.data ? ` (${list.data.pendingTotal})` : ''}
            </button>
          ))}
        </div>
        <select
          aria-label="Filter by opportunity"
          value={opportunityId}
          onChange={(e) => {
            setOpportunityId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink shadow-dx-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/10"
        >
          <option value="">All opportunities</option>
          {opportunities.data?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        {list.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : list.isError ? (
          <FormError error={list.error} />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            title={status === 'PENDING' ? 'Nothing waiting for review' : 'No applications here'}
            body={status === 'PENDING' ? 'New applications for roles that need approval appear here.' : 'Try a different filter.'}
          />
        ) : (
          <ul className={`space-y-3 transition-opacity ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
            {list.data.items.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => setOpenId(a.id)}
                  className="card flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-dx sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{a.name}</p>
                    <p className="truncate text-sm text-muted">
                      {a.opportunity.title} · applied {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <ApplicationStatusBadge status={a.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between text-sm">
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

      <ApplicationModal id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ApplicationModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useApplication(id ?? undefined);
  const review = useReviewApplication();
  const [note, setNote] = useState('');

  function close() {
    setNote('');
    review.reset();
    onClose();
  }

  const a: Application | undefined = detail.data;
  const decide = (decision: 'approve' | 'reject') => a && review.mutate({ id: a.id, decision, input: { note } }, { onSuccess: () => setNote('') });

  return (
    <Modal open={!!id} onClose={close} title={a ? a.name : 'Application'}>
      {detail.isPending ? (
        <div className="skeleton h-48" />
      ) : detail.isError ? (
        <FormError error={detail.error} />
      ) : a ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <ApplicationStatusBadge status={a.status} />
            <span className="text-sm text-muted">
              for <span className="font-medium text-ink">{a.opportunity.title}</span> · {formatDate(a.createdAt)}
            </span>
          </div>
          <dl className="grid gap-3 rounded-xl bg-surface p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Email</dt>
              <dd className="font-medium break-all text-ink">
                <a href={`mailto:${a.email}`} className="hover:text-brand">
                  {a.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Phone</dt>
              <dd className="font-medium text-ink">{a.phone ?? '—'}</dd>
            </div>
          </dl>
          {a.answers.length > 0 && (
            <div className="space-y-3">
              {a.answers.map((ans) => (
                <div key={ans.question}>
                  <p className="text-xs font-semibold text-muted">{ans.question}</p>
                  <p className="mt-0.5 whitespace-pre-line text-ink">{ans.answer}</p>
                </div>
              ))}
            </div>
          )}

          {a.status !== 'PENDING' && (a.reviewedBy || a.reviewNote) && (
            <p className="rounded-lg bg-navy-soft px-3.5 py-2.5 text-sm">
              {a.reviewedBy ? `${a.status === 'APPROVED' ? 'Approved' : 'Declined'} by ${a.reviewedBy} on ${formatDate(a.reviewedAt)}.` : 'Joined automatically.'}
              {a.reviewNote ? ` “${a.reviewNote}”` : ''}
            </p>
          )}

          {a.status === 'APPROVED' && a.volunteerId && (
            <Link to={`/app/volunteers/${a.volunteerId}`} className="btn-secondary w-full" onClick={close}>
              Open volunteer record
            </Link>
          )}

          {a.status !== 'APPROVED' && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Message to applicant (optional)</span>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Included in the email we send them"
                  className="block w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink shadow-dx-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/10"
                />
              </label>
              <FormError error={review.error} />
              <div className="flex justify-end gap-2">
                {a.status === 'PENDING' && (
                  <button className="btn-secondary" disabled={review.isPending} onClick={() => decide('reject')}>
                    Decline
                  </button>
                )}
                <button className="btn-primary" disabled={review.isPending} onClick={() => decide('approve')}>
                  {review.isPending && <Spinner />}
                  Approve
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
