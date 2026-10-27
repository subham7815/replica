import { Link } from 'react-router';
import { Reveal } from '../../../hooks/useReveal';
import { FAQS, FAQ_GROUPS, PAGE_HEROES } from '../content';
import { PageHero } from '../PageHero';
import { FaqList } from '../sections/Faq';
import { FinalCta } from '../sections/FinalCta';

export function FaqPage() {
  return (
    <>
      <PageHero {...PAGE_HEROES.faq}>
        <nav aria-label="FAQ topics" className="flex flex-wrap justify-center gap-2">
          {FAQ_GROUPS.map((g) => (
            <a
              key={g.key}
              href={`#faq-${g.key}`}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-dx-sm transition hover:border-brand/40 hover:text-brand"
            >
              {g.title}
            </a>
          ))}
        </nav>
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-16 px-4 py-20 sm:px-6 sm:py-28">
        {FAQ_GROUPS.map((g) => (
          <section key={g.key} id={`faq-${g.key}`} aria-labelledby={`faq-${g.key}-title`} className="scroll-mt-24">
            <Reveal>
              <h2 id={`faq-${g.key}-title`} className="mb-6 text-2xl font-bold tracking-tight">
                {g.title}
              </h2>
            </Reveal>
            <FaqList items={FAQS.filter((f) => f.group === g.key)} />
          </section>
        ))}

        <Reveal>
          <p className="rounded-2xl bg-navy-soft px-6 py-5 text-center">
            Still stuck?{' '}
            <Link to="/login" className="font-semibold text-brand hover:text-brand-dark">
              Sign in
            </Link>{' '}
            and ask your coordinator, or{' '}
            <Link to="/register" className="font-semibold text-brand hover:text-brand-dark">
              create your organisation
            </Link>{' '}
            and try it yourself.
          </p>
        </Reveal>
      </div>

      <FinalCta />
    </>
  );
}
