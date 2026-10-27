import { ROLE_LABELS, navItemsFor } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { Suspense, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { Logo } from '../components/Logo';
import { Spinner } from '../components/ui';

function OrgSwitcher() {
  const { user, switchOrganization } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!user?.organization) return null;

  if (user.memberships.length < 2) {
    return <p className="truncate px-5 pt-3 pb-1 text-xs font-semibold tracking-widest text-brand uppercase lg:pt-0">{user.organization.name}</p>;
  }

  return (
    <div className="px-3 pt-3 pb-1 lg:pt-0">
      <label htmlFor="org-switcher" className="sr-only">
        Organisation
      </label>
      <select
        id="org-switcher"
        value={user.organization.id}
        disabled={busy}
        onChange={async (e) => {
          setBusy(true);
          try {
            await switchOrganization(e.target.value);
            navigate('/app');
          } finally {
            setBusy(false);
          }
        }}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/10"
      >
        {user.memberships.map((m) => (
          <option key={m.organization.id} value={m.organization.id}>
            {m.organization.name} · {ROLE_LABELS[m.role]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AppShell() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const items = navItemsFor(user.role);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-soft text-brand' : 'text-text hover:bg-navy-soft hover:text-ink'
    }`;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button className="btn-secondary px-3 py-2" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Menu
        </button>
      </header>

      <aside
        className={`${open ? 'block' : 'hidden'} border-b border-line bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-b-0`}
      >
        <div className="hidden px-5 py-5 lg:block">
          <Logo />
        </div>
        <OrgSwitcher />
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3 lg:py-0" onClick={() => setOpen(false)}>
          <NavLink to="/app" end className={linkClass}>
            Dashboard
          </NavLink>
          {items.map((item) => (
            <NavLink key={item.key} to={`/app/${item.key}`} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <p className="mt-2 inline-block rounded-full bg-navy-soft px-2 py-0.5 text-xs font-medium text-navy">
            {ROLE_LABELS[user.role]}
          </p>
          <button className="btn-secondary mt-3 w-full" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-8 sm:px-8">
        <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner className="h-6 w-6 text-brand" /></div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
