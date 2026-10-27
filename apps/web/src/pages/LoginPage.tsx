import { loginInput, requestCodeInput, verifyCodeInput, type RequestCodeResponse } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Field, FormError, Spinner, fieldErrors } from '../components/ui';
import { AuthLayout } from '../layouts/AuthLayout';

type Mode = 'password' | 'code';

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('password');
  return (
    <AuthLayout
      title="Sign in"
      subtitle={
        <>
          New organisation?{' '}
          <Link to="/register" className="font-semibold text-brand hover:text-brand-dark">
            Create an account
          </Link>
        </>
      }
    >
      <div role="tablist" className="mb-6 grid grid-cols-2 rounded-lg bg-navy-soft p-1 text-sm font-medium">
        {(
          [
            ['password', 'Password'],
            ['code', 'Email me a code'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`rounded-md px-3 py-2 transition ${
              mode === key ? 'bg-white text-ink shadow-dx-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'password' ? <PasswordForm /> : <CodeForm />}
    </AuthLayout>
  );
}

function useAfterSignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return () => navigate(from?.startsWith('/app') ? from : '/app', { replace: true });
}

function PasswordForm() {
  const { api, completeSignIn } = useAuth();
  const done = useAfterSignIn();
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const login = useMutation({
    mutationFn: api.login,
    onSuccess: async (res) => {
      await completeSignIn(res);
      done();
    },
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const { data, errors } = fieldErrors(loginInput, form);
    setErrors(errors);
    if (data) login.mutate(data);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" autoFocus error={errors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" error={errors?.password} />
      <FormError error={login.error} />
      <button type="submit" className="btn-primary w-full" disabled={login.isPending}>
        {login.isPending && <Spinner />}
        Sign in
      </button>
    </form>
  );
}

function CodeForm() {
  const { api, completeSignIn } = useAuth();
  const done = useAfterSignIn();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<RequestCodeResponse | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);

  const request = useMutation({ mutationFn: api.requestCode, onSuccess: setSent });
  const verify = useMutation({
    mutationFn: api.verifyCode,
    onSuccess: async (res) => {
      await completeSignIn(res);
      done();
    },
  });

  function onRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data, errors } = fieldErrors(requestCodeInput, { email });
    setErrors(errors);
    if (data) request.mutate(data);
  }

  function onVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code') ?? '');
    const { data, errors } = fieldErrors(verifyCodeInput, { email, code });
    setErrors(errors && { code: 'Enter the 6-digit code' });
    if (data) verify.mutate(data);
  }

  if (!sent) {
    return (
      <form onSubmit={onRequest} noValidate className="space-y-4">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors?.email}
          hint="We'll email you a 6-digit code and a sign-in link. No password needed."
        />
        <FormError error={request.error} />
        <button type="submit" className="btn-primary w-full" disabled={request.isPending}>
          {request.isPending && <Spinner />}
          Send code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onVerify} noValidate className="space-y-4">
      <p className="text-sm">
        If <span className="font-medium text-ink">{email}</span> has an account, a code is on its way. It expires in 15
        minutes.
      </p>
      {sent.dev && <DevCodeHint code={sent.dev.code} token={sent.dev.token} />}
      <Field
        label="6-digit code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        className="tracking-[0.5em]"
        error={errors?.code}
      />
      <FormError error={verify.error} />
      <button type="submit" className="btn-primary w-full" disabled={verify.isPending}>
        {verify.isPending && <Spinner />}
        Verify and sign in
      </button>
      <button
        type="button"
        className="btn-secondary w-full"
        onClick={() => {
          setSent(null);
          verify.reset();
        }}
      >
        Use a different email
      </button>
    </form>
  );
}

function DevCodeHint({ code, token }: { code: string; token: string }) {
  return (
    <div className="rounded-lg border border-dashed border-warning/40 bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
      <span className="font-semibold">Dev mode:</span> code <span className="font-mono font-semibold">{code}</span> ·{' '}
      <Link className="underline" to={`/auth/verify?token=${encodeURIComponent(token)}`}>
        open magic link
      </Link>
    </div>
  );
}
