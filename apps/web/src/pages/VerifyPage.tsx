import { useAuth } from '@newreplica/shared/auth';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { FormError, Spinner } from '../components/ui';
import { AuthLayout } from '../layouts/AuthLayout';

export function VerifyPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { api, completeSignIn } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);

  const verify = useMutation({
    mutationFn: api.verifyCode,
    onSuccess: async (res) => {
      await completeSignIn(res);
      navigate('/app', { replace: true });
    },
  });

  useEffect(() => {
    // Tokens are single-use; guard against StrictMode's double effect run.
    if (!token || started.current) return;
    started.current = true;
    verify.mutate({ token });
  }, [token, verify]);

  return (
    <AuthLayout title="Signing you in" subtitle="Checking your sign-in link…">
      {!token ? (
        <FormError error={new Error('This sign-in link is incomplete.')} />
      ) : verify.isError ? (
        <div className="space-y-4">
          <FormError error={verify.error} />
          <Link to="/login" className="btn-primary w-full">
            Request a new code
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm">
          <Spinner className="h-5 w-5 text-brand" /> Verifying…
        </div>
      )}
    </AuthLayout>
  );
}
