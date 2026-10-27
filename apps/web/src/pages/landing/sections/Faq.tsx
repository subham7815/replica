import { icons } from '../../../components/icons';
import { Reveal } from '../../../hooks/useReveal';
import { faqsFor, type FaqItem } from '../content';
import { LearnMore } from './LearnMore';
import { SectionHeading } from './SectionHeading';

export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((f, i) => (
        <Reveal key={f.q} delay={Math.min(i, 6) * 60}>
          <details className="group card overflow-hidden transition-shadow open:shadow-dx">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-ink transition hover:text-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-soft text-ink transition duration-300 group-open:rotate-180 group-open:bg-brand group-open:text-white">
                <icons.chevronDown size={16} />
              </span>
            </summary>
            <p className="px-6 pb-6 leading-relaxed group-open:animate-fade-up">{f.a}</p>
          </details>
        </Reveal>
      ))}
    </div>
  );
}

export function FaqSection({
  title = 'Common questions',
  items = faqsFor('home'),
  learnMore = true,
}: {
  title?: string;
  items?: FaqItem[];
  learnMore?: boolean;
}) {
  return (
    <section aria-labelledby="faq-title" className="section-y">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading id="faq-title" eyebrow="FAQ" title={title} />
        <div className="mt-12">
          <FaqList items={items} />
        </div>
        {learnMore && (
          <Reveal className="mt-10 text-center">
            <LearnMore to="/faq">See all questions</LearnMore>
          </Reveal>
        )}
      </div>
    </section>
  );
}
