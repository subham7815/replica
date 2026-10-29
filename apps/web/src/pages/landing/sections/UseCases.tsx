import { icons } from '../../../components/icons';
import { Reveal } from '../../../hooks/useReveal';
import { CATEGORIES, EXAMPLE_ROTAS } from '../content';
import { SectionHeading } from './SectionHeading';

export function UseCases() {
  return (
    <section aria-labelledby="uses-title" className="section-y overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="uses-title"
          eyebrow="Who it’s for"
          title="Built for teams that run on volunteers"
          sub="If your group has a rota, DexServe can run it."
        />
      </div>

      <div className="group relative mt-12 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
        <div className="flex w-max animate-marquee gap-3 group-hover:[animation-play-state:paused]">
          {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
            <span
              key={i}
              aria-hidden={i >= CATEGORIES.length}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium whitespace-nowrap text-ink shadow-dx-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="mt-14 text-center text-xs font-semibold tracking-widest text-faint uppercase">Example rotas</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXAMPLE_ROTAS.map((r, i) => (
            <Reveal key={r.title} delay={i * 80}>
              <div className="card h-full p-6 transition duration-300 hover:-translate-y-1 hover:shadow-dx">
                <h3 className="font-semibold">{r.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed">{r.body}</p>
                <div className="mt-5 flex items-center gap-3 border-t border-line-soft pt-4 text-xs font-medium text-muted">
                  <span className="inline-flex items-center gap-1">
                    <icons.users size={14} /> {r.people} people
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <icons.calendar size={14} /> {r.cadence}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
