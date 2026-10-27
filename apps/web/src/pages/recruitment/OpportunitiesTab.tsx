import { SIGNUP_MODE_LABELS } from '@newreplica/shared';
import { useOpportunities } from '@newreplica/shared/queries';
import { useState } from 'react';
import { Link } from 'react-router';
import { icons } from '../../components/icons';
import { OpportunityStatusBadge } from '../../components/recruitment';
import { EmptyState, FormError } from '../../components/ui';

export function publicLink(id: string) {
  return `${window.location.origin}/opportunities/${id}`;
}

export function CopyLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary px-3 py-1.5 text-xs"
      onClick={async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(publicLink(id));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt('Copy this link', publicLink(id));
        }
      }}
    >
      {copied ? <icons.check size={14} /> : <icons.send size={14} />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  );
}

export function OpportunitiesTab() {
  const list = useOpportunities();

  if (list.isPending) return <div className="skeleton h-48" />;
  if (list.isError) return <FormError error={list.error} />;
  if (list.data.length === 0) {
    return (
      <EmptyState
        title="No opportunities yet"
        body="Describe a volunteer role, publish it, and share the link. People can apply without an account."
        action={
          <Link to="/app/recruitment/opportunities/new" className="btn-primary">
            Create your first opportunity
          </Link>
        }
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {list.data.map((o) => (
        <li key={o.id}>
          <Link
            to={`/app/recruitment/opportunities/${o.id}`}
            className="card group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-dx"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold group-hover:text-brand">{o.title}</h3>
              <OpportunityStatusBadge status={o.status} />
            </div>
            <p className="mt-1 line-clamp-2 text-sm">{o.summary}</p>
            <p className="mt-3 text-xs text-muted">
              {SIGNUP_MODE_LABELS[o.signupMode].split(':')[0]} · {o.visibility === 'PUBLIC' ? 'Listed on Discover' : 'Link only'}
              {o.department ? ` · ${o.department.name}` : ''}
            </p>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-line-soft pt-4">
              <div className="flex gap-3 text-xs font-medium">
                <span className={o.pendingCount ? 'text-warning' : 'text-muted'}>{o.pendingCount} waiting</span>
                <span className="text-success">{o.approvedCount} joined</span>
              </div>
              {o.status === 'PUBLISHED' && <CopyLinkButton id={o.id} />}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
