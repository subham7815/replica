import { useApplications } from '@newreplica/shared/queries';
import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { icons } from '../../components/icons';
import { PageHeader } from '../../components/ui';

export function RecruitmentLayout() {
  const pending = useApplications({ status: 'PENDING', pageSize: 1 });
  const count = pending.data?.pendingTotal ?? 0;

  const tabs = [
    { to: 'applications', label: 'Applications', badge: count },
    { to: 'opportunities', label: 'Opportunities', badge: 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Recruitment"
        description="Publish roles, share them, and review who wants to join."
        actions={
          <>
            <a href="/discover" target="_blank" rel="noreferrer" className="btn-secondary">
              View Discover
            </a>
            <Link to="/app/recruitment/opportunities/new" className="btn-primary">
              <icons.note size={16} /> New opportunity
            </Link>
          </>
        }
      />
      <nav aria-label="Recruitment" className="mt-6 flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full ${
                isActive ? 'text-brand after:bg-brand' : 'text-muted after:bg-transparent hover:text-ink'
              }`
            }
          >
            {t.label}
            {t.badge > 0 && <span className="rounded-full bg-brand px-1.5 py-0.5 text-[11px] leading-none font-bold text-white">{t.badge}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6 animate-fade-up">
        <Suspense fallback={<div className="skeleton h-64" />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
