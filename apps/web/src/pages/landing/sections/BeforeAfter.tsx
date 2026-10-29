import { icons } from '../../../components/icons';
import { Reveal } from '../../../hooks/useReveal';
import { AFTER, BEFORE } from '../content';
import { SectionHeading } from './SectionHeading';

export function BeforeAfter() {
  return (
    <section aria-labelledby="ba-title" className="section-y border-y border-line bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading id="ba-title" title="If you manage volunteers, this probably looks familiar." />
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-line bg-surface p-7">
              <p className="text-sm font-semibold tracking-widest text-muted uppercase">Before</p>
              <ul className="mt-5 space-y-4">
                {BEFORE.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-text">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-line-soft text-muted">
                      <icons.x size={14} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="h-full rounded-2xl border border-success/25 bg-success-soft/50 p-7 shadow-dx-sm">
              <p className="text-sm font-semibold tracking-widest text-success uppercase">With DexServe</p>
              <ul className="mt-5 space-y-4">
                {AFTER.map((a) => (
                  <li key={a} className="flex items-start gap-3 font-medium text-ink">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success text-white">
                      <icons.check size={14} />
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
