import { ROLE_LABELS, navItemsFor } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { Link } from 'react-router';

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  const items = navItemsFor(user.role);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="animate-fade-up text-xs font-semibold tracking-widest text-brand uppercase">
        {user.organization?.name ?? 'Platform administration'}
      </p>
      <h1 className="mt-2 animate-fade-up text-3xl font-bold tracking-tight [animation-delay:60ms]">
        Welcome, {user.name.split(' ')[0]}
      </h1>
      <p className="mt-2 animate-fade-up [animation-delay:120ms]">
        You're signed in as <span className="font-medium text-ink">{ROLE_LABELS[user.role]}</span>. Here's what you can
        access.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <Link
            key={item.key}
            to={`/app/${item.key}`}
            className="card group animate-fade-up p-5 transition hover:-translate-y-0.5 hover:shadow-dx"
            style={{ animationDelay: `${180 + i * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold group-hover:text-brand">{item.label}</h2>
              {item.comingInStep && (
                <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                  Step {item.comingInStep}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
