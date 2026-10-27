import { Link } from 'react-router';
import { icons } from '../../../components/icons';
import { Reveal } from '../../../hooks/useReveal';
import { PAGE_HEROES, ROADMAP } from '../content';
import { PageHero } from '../PageHero';
import { CoordinatorFeatures, VolunteerFeatures } from '../sections/Features';
import { FinalCta } from '../sections/FinalCta';
import { SectionHeading } from '../sections/SectionHeading';

export function FeaturesPage() {
  return (
    <>
      <PageHero {...PAGE_HEROES.features}>
        <Link to="/register" className="btn-primary px-7 py-3.5 text-base">
          Create your first rota, free
        </Link>
      </PageHero>

      <CoordinatorFeatures learnMore={false} />
      <VolunteerFeatures />

      <section aria-labelledby="roadmap-title" className="section-y">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            id="roadmap-title"
            eyebrow="On the roadmap"
            title="What we’re building next"
            sub="These are planned, not available yet. Beta organisations get them first."
          />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROADMAP.map((r, i) => {
              const Icon = icons[r.icon];
              return (
                <Reveal key={r.title} delay={(i % 3) * 80}>
                  <div className="h-full rounded-2xl border border-dashed border-line-strong bg-white/60 p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy-soft text-navy">
                        <Icon size={20} />
                      </span>
                      <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-warning">Planned</span>
                    </div>
                    <h3 className="mt-4 font-semibold">{r.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed">{r.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
