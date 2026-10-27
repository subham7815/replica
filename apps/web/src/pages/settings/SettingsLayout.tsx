import { NavLink, Outlet } from 'react-router';
import { Suspense } from 'react';
import { PageHeader } from '../../components/ui';

const TABS = [
  { to: 'profile', label: 'Profile & branding' },
  { to: 'locations', label: 'Locations' },
  { to: 'departments', label: 'Departments' },
  { to: 'team', label: 'Team' },
  { to: 'roles', label: 'Roles & permissions' },
];

export function SettingsLayout() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Organisation" description="Your organisation’s profile, places, departments and team." />
      <nav aria-label="Settings" className="mt-6 -mx-4 overflow-x-auto px-4">
        <div className="flex min-w-max gap-1 border-b border-line">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full ${
                  isActive ? 'text-brand after:bg-brand' : 'text-muted hover:text-ink after:bg-transparent'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="mt-6 animate-fade-up">
        <Suspense fallback={<div className="skeleton h-64" />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
