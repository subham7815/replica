import { Link } from 'react-router';
import { icons } from '../../../components/icons';
import { Reveal } from '../../../hooks/useReveal';
import { BETA_PLAN, PAGE_HEROES, TRUST_BADGES, faqsFor } from '../content';
import { PageHero } from '../PageHero';
import { FaqSection } from '../sections/Faq';
import { FinalCta } from '../sections/FinalCta';

export function PricingPage() {
  return (
    <>
      <PageHero {...PAGE_HEROES.pricing} />

      <section aria-labelledby="plan-title" className="section-y">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border-2 border-brand bg-white p-8 shadow-dx-lg sm:p-10">
              <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 animate-drift rounded-full bg-brand-soft blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="plan-title" className="text-xl font-bold">
                    {BETA_PLAN.name}
                  </h2>
                  <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">Available now</span>
                </div>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="display text-6xl">{BETA_PLAN.price}</span>
                  <span className="text-muted">{BETA_PLAN.period}</span>
                </p>
                <p className="mt-3">{BETA_PLAN.blurb}</p>

                <Link to="/register" className="btn-primary mt-8 w-full py-3.5 text-base">
                  Create your organisation
                </Link>
                <p className="mt-3 text-center text-sm text-muted">No credit card needed.</p>

                <ul className="mt-8 space-y-3 border-t border-line pt-8">
                  {BETA_PLAN.includes.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-ink">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                        <icons.check size={12} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-6 rounded-2xl bg-navy-soft px-5 py-4 text-center text-sm leading-relaxed">{BETA_PLAN.note}</p>
          </Reveal>

          <Reveal delay={180}>
            <ul className="mt-10 flex flex-wrap justify-center gap-3">
              {TRUST_BADGES.map((b) => {
                const Icon = icons[b.icon];
                return (
                  <li
                    key={b.label}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink"
                  >
                    <Icon size={16} className="text-brand" />
                    {b.label}
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </section>

      <div className="border-t border-line bg-white">
        <FaqSection title="Pricing questions" items={faqsFor('pricing')} />
      </div>
      <div className="pt-20 sm:pt-28">
        <FinalCta />
      </div>
    </>
  );
}
