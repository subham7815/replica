import { icons } from '../../../components/icons';
import { Reveal } from '../../../hooks/useReveal';
import { TRUST_BADGES } from '../content';
import { LearnMore } from './LearnMore';

export function TrustStrip({ learnMore = true }: { learnMore?: boolean }) {
  return (
    <section aria-labelledby="pricing-title" className="px-4 sm:px-6">
      <Reveal className="mx-auto max-w-6xl rounded-3xl border border-brand/15 bg-brand-soft px-6 py-12 text-center sm:px-12">
        <p className="text-xs font-semibold tracking-widest text-brand uppercase">Pricing</p>
        <h2 id="pricing-title" className="display mt-3 text-3xl sm:text-4xl">
          Free during beta. Set up in minutes.
        </h2>
        <ul className="mt-8 flex flex-wrap justify-center gap-3">
          {TRUST_BADGES.map((b) => {
            const Icon = icons[b.icon];
            return (
              <li
                key={b.label}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink shadow-dx-sm"
              >
                <Icon size={16} className="text-brand" />
                {b.label}
              </li>
            );
          })}
        </ul>
        {learnMore && (
          <div className="mt-8">
            <LearnMore to="/pricing">See pricing</LearnMore>
          </div>
        )}
      </Reveal>
    </section>
  );
}
