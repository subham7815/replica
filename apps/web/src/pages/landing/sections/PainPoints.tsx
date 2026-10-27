import { icons } from '../../../components/icons';
import { Reveal } from '../../../hooks/useReveal';
import { PAIN_POINTS } from '../content';
import { SectionHeading } from './SectionHeading';

export function PainPoints() {
  return (
    <section aria-labelledby="pain-title" className="section-y border-y border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="pain-title"
          eyebrow="The real problem"
          title={
            <>
              Finding volunteers isn’t the hard part.{' '}
              <span className="text-brand">Keeping the rota stable is.</span>
            </>
          }
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {PAIN_POINTS.map((p, i) => {
            const Icon = icons[p.icon];
            return (
              <Reveal key={p.title} delay={i * 90}>
                <div className="flex h-full gap-5 rounded-2xl border border-line bg-surface p-6 sm:p-7">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-dx-sm">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    <p className="mt-1.5 leading-relaxed">{p.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
