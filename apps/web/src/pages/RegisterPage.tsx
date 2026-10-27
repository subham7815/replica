import { registerOrganizationInput } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Field, FormError, Spinner, fieldErrors } from '../components/ui';
import { AuthLayout } from '../layouts/AuthLayout';

export function RegisterPage() {
  const { api, completeSignIn } = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const register = useMutation({
    mutationFn: api.registerOrganization,
    onSuccess: async (res) => {
      await completeSignIn(res);
      navigate('/app', { replace: true });
    },
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data, errors } = fieldErrors(registerOrganizationInput, Object.fromEntries(new FormData(e.currentTarget)));
    setErrors(errors);
    if (data) register.mutate(data);
  }

  return (
    <AuthLayout
      title="Create your organisation"
      subtitle={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:text-brand-dark">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Organisation name" name="organizationName" autoFocus error={errors?.organizationName} />
        <Field label="Your name" name="name" autoComplete="name" error={errors?.name} />
        <Field label="Work email" name="email" type="email" autoComplete="email" error={errors?.email} />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          error={errors?.password}
          hint="At least 8 characters."
        />
        <FormError error={register.error} />
        <button type="submit" className="btn-primary w-full" disabled={register.isPending}>
          {register.isPending && <Spinner />}
          Create organisation
        </button>
        <p className="text-center text-xs text-faint">You'll be the organisation admin and can invite your team next.</p>
      </form>
    </AuthLayout>
  );
}
