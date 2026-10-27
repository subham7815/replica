import { NAV_ITEMS, can } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { Link, Navigate, useParams } from 'react-router';

export function ModulePage() {
  const { module } = useParams();
  const { user } = useAuth();
  const item = NAV_ITEMS.find((i) => i.key === module);
  if (!item || !can(user?.role, item.permission)) return <Navigate to="/app" replace />;

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      <h1 className="text-3xl font-bold tracking-tight">{item.label}</h1>
      <p className="mt-2">{item.description}</p>
      <div className="card mt-8 grid place-items-center px-6 py-16 text-center">
        <div className="h-1 w-40 overflow-hidden rounded-full bg-line-soft">
          <div className="h-full origin-left animate-progress bg-brand" />
        </div>
        <p className="mt-6 font-semibold text-ink">
          {item.comingInStep ? `Arrives in build step ${item.comingInStep}` : 'Coming soon'}
        </p>
        <p className="mt-1 text-sm">Your access to this module is already wired up for your role.</p>
        <Link to="/app" className="btn-secondary mt-6">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
