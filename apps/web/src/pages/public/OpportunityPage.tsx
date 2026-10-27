import { applyInput, validateAnswers, type Answers } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useApply, usePublicOpportunity } from '@newreplica/shared/queries';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { icons } from '../../components/icons';
import { OrgMark, QuestionField, SignupModeBadge } from '../../components/recruitment';
import { Field, FormError, Spinner, fieldErrors } from '../../components/ui';

export function OpportunityPage() {
  const { id } = useParams();
  const opp = usePublicOpportunity(id);
  const apply = useApply();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setName((n) => n || user.name);
      setEmail((e) => e || user.email);
    }
  }, [user]);

  useEffect(() => {
    if (opp.data) document.title = `${opp.data.title} · ${opp.data.organization.name} · Replica`;
  }, [opp.data]);

  if (opp.isPending) {
    return (
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="skeleton h-96" />
        <div className="skeleton h-96" />
      </div>
    );
  }
  if (opp.isError) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-24 text-center sm:px-6">
        <FormError error={opp.error} />
        <Link to="/discover" className="btn-secondary">
          Browse open roles
        </Link>
      </div>
    );
  }

  const o = opp.data;
  const brand = o.organization.brandColor;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { errors: base } = fieldErrors(applyInput, { name, email, phone, answers, consent });
    const qErrors = validateAnswers(o.questions, answers);
    const all = { ...(base ?? {}), ...qErrors };
    delete all.answers;
    setErrors(all);
    if (Object.keys(all).length) return;
    apply.mutate({ opportunityId: o.id, input: { name, email, phone, answers, consent: true } });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <Link to={`/o/${o.organization.slug}`} className="inline-flex animate-fade-up items-center gap-3 rounded-xl pr-3 transition hover:bg-white">
        <OrgMark org={o.organization} size={40} />
        <span>
          <span className="block text-sm font-semibold text-ink">{o.organization.name}</span>
          <span className="block text-xs text-muted">See all roles</span>
        </span>
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <article className="animate-fade-up [animation-delay:80ms]">
          <SignupModeBadge mode={o.signupMode} />
          <h1 className="display mt-3 text-4xl sm:text-5xl">{o.title}</h1>
          <p className="mt-4 text-lg leading-relaxed">{o.summary}</p>
          <ul className="mt-6 flex flex-wrap gap-2 text-sm">
            {o.commitment && (
              <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-ink">
                <icons.clock size={14} /> {o.commitment}
              </li>
            )}
            {o.location && (
              <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-ink">
                <icons.calendar size={14} /> {o.location.name}
                {o.location.address ? `, ${o.location.address}` : ''}
              </li>
            )}
            {o.department && (
              <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-ink">
                <icons.users size={14} /> {o.department}
              </li>
            )}
          </ul>
          {o.description && <div className="mt-8 leading-relaxed whitespace-pre-line text-text">{o.description}</div>}
        </article>

        <aside className="animate-fade-up [animation-delay:160ms] lg:sticky lg:top-24 lg:self-start">
          <div className="card relative overflow-hidden p-6">
            <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: brand }} />
            {apply.isSuccess ? (
              <div className="py-6 text-center">
                <span className="mx-auto grid h-14 w-14 animate-pop-in place-items-center rounded-full text-white" style={{ backgroundColor: brand }}>
                  <icons.check size={28} />
                </span>
                <h2 className="mt-5 text-xl font-bold">{o.signupMode === 'OPEN' ? 'You’re signed up!' : 'Application sent'}</h2>
                <p className="mt-2 text-sm leading-relaxed">
                  We’ve emailed <span className="font-medium text-ink">{email}</span>{' '}
                  {o.signupMode === 'OPEN'
                    ? 'with how to sign in and see your shifts.'
                    : `to confirm. ${o.organization.name} will review it and let you know.`}
                </p>
                <Link to="/discover" className="btn-secondary mt-6">
                  Find more roles
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="space-y-4">
                <h2 className="text-lg font-bold">{o.signupMode === 'OPEN' ? 'Sign up' : 'Apply'}</h2>
                <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" error={errors.name} />
                <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" error={errors.email} />
                <Field label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" error={errors.phone} />
                {o.questions.map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(v) =>
                      setAnswers((a) => {
                        const next = { ...a };
                        if (v === undefined) delete next[q.id];
                        else next[q.id] = v;
                        return next;
                      })
                    }
                    error={errors[q.id]}
                  />
                ))}
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand"
                  />
                  <span>
                    {o.organization.name} can store these details and contact me about volunteering.
                    {errors.consent && <span className="mt-1 block text-brand">{errors.consent}</span>}
                  </span>
                </label>
                <FormError error={apply.error} />
                <button type="submit" className="btn w-full py-3 text-base text-white shadow-dx-sm hover:opacity-90" style={{ backgroundColor: brand }} disabled={apply.isPending}>
                  {apply.isPending && <Spinner />}
                  {o.signupMode === 'OPEN' ? 'Sign up' : 'Send application'}
                </button>
                <p className="text-center text-xs text-faint">No account or password needed.</p>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
