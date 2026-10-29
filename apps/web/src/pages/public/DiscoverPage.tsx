import { useDebouncedValue, useDiscover } from '@newreplica/shared/queries';
import { useState } from 'react';
import { EmptyState, FormError } from '../../components/ui';
import { OpportunityCard } from '../../components/recruitment';

const PAGE_SIZE = 12;

export function DiscoverPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const term = useDebouncedValue(q.trim());
  const list = useDiscover({ q: term || undefined, page, pageSize: PAGE_SIZE });
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <section className="relative border-b border-line">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-[-8%] h-120 w-120 animate-drift rounded-full bg-brand-soft blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="animate-fade-up text-xs font-semibold tracking-widest text-brand uppercase">Find opportunities</p>
          <h1 className="display mt-4 animate-fade-up text-4xl [animation-delay:80ms] sm:text-6xl">Volunteer roles near you</h1>
          <p className="mx-auto mt-5 max-w-2xl animate-fade-up text-lg [animation-delay:160ms]">
            Browse roles from community groups on DexServe and apply in a couple of minutes. No account needed.
          </p>
          <label className="relative mx-auto mt-8 block max-w-xl animate-fade-up [animation-delay:240ms]">
            <span className="sr-only">Search opportunities</span>
            <svg className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by role, organisation or place"
              className="w-full rounded-xl border border-line bg-white py-3.5 pr-4 pl-12 text-ink shadow-dx placeholder:text-faint focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
            />
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {list.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton h-64 rounded-2xl" />
            ))}
          </div>
        ) : list.isError ? (
          <FormError error={list.error} />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            title={term ? 'No roles match your search' : 'No open roles yet'}
            body={term ? 'Try a different word or place.' : 'Check back soon. New roles are added as organisations join.'}
          />
        ) : (
          <>
            <p className="mb-5 text-sm text-muted">
              {list.data.total} open {list.data.total === 1 ? 'role' : 'roles'}
            </p>
            <div className={`grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
              {list.data.items.map((opp, i) => (
                <div key={opp.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <OpportunityCard opp={opp} />
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3 text-sm">
                <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <span className="text-muted">
                  Page {page} of {totalPages}
                </span>
                <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
