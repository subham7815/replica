import type { Permission } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Spinner } from './ui';

function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner className="h-6 w-6 text-brand" />
    </div>
  );
}

export function RequireAuth() {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === 'loading') return <FullPageSpinner />;
  if (state.status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function RequireSignedOut() {
  const { state } = useAuth();
  if (state.status === 'loading') return <FullPageSpinner />;
  if (state.status === 'signedIn') return <Navigate to="/app" replace />;
  return <Outlet />;
}

// UI convenience only; the API enforces the same permission on every request.
export function RequirePermission({ permission }: { permission: Permission }) {
  const { can } = useAuth();
  return can(permission) ? <Outlet /> : <Navigate to="/app" replace />;
}
