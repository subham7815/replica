import { Link } from 'react-router';
import { icons } from '../../../components/icons';
import { Reveal } from '../../../hooks/useReveal';
import { COORDINATOR_FEATURES, VOLUNTEER_FEATURES } from '../content';
import { DashboardMockup } from '../mockups/DashboardMockup';
import { LearnMore } from './LearnMore';
import { SectionHeading } from './SectionHeading';

export function CoordinatorFeatures({ learnMore = true }: { learnMore?: boolean }) {
  return (
    <section aria-labelledby="features-title" className="section-y">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="features-title"
          eyebrow="For coordinators"
          title="Built for the people running the rota"
          sub="Know who’s coming, refill drop-outs without the group-chat scramble, and get hours logged automatically."
        />

        <Reveal className="mx-auto mt-14 max-w-4xl">
          <DashboardMockup />
        </Reveal>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COORDINATOR_FEATURES.map((f, i) => {
            const Icon = icons[f.icon];
            return (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <div className="card group h-full p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-dx">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed">{f.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-12 flex flex-wrap items-center justify-center gap-6">
          <Link to="/register" className="btn-primary px-6 py-3.5 text-base">
            Create your first rota <icons.arrowRight size={18} />
          </Link>
          {learnMore && <LearnMore to="/features">See all features</LearnMore>}
        </Reveal>
      </div>
    </section>
  );
}

export function VolunteerFeatures({ learnMore = true }: { learnMore?: boolean }) {
  return (
    <section aria-labelledby="volunteers-title" className="section-y relative overflow-hidden bg-navy-deep">
      <div aria-hidden className="pointer-events-none absolute -right-32 -bottom-40 h-120 w-120 animate-drift rounded-full bg-brand/25 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          dark
          id="volunteers-title"
          eyebrow="For volunteers"
          title="Sign up in seconds. Skip in one tap."
          sub="No app download required and no password to remember. Reminders arrive before every shift."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {VOLUNTEER_FEATURES.map((f, i) => {
            const Icon = icons[f.icon];
            return (
              <Reveal key={f.title} delay={i * 100}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/10">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-on-dark">{f.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        {learnMore && (
          <Reveal className="mt-12 text-center">
            <LearnMore to="/volunteers" onDark>
              More for volunteers
            </LearnMore>
          </Reveal>
        )}
      </div>
    </section>
  );
}
