import { Link } from 'react-router';
import { Reveal } from '../../../hooks/useReveal';
import { PAGE_HEROES, WALKTHROUGH } from '../content';
import { DashboardMockup } from '../mockups/DashboardMockup';
import { PageHero } from '../PageHero';
import { BeforeAfter } from '../sections/BeforeAfter';
import { FinalCta } from '../sections/FinalCta';
import { HowItWorks } from '../sections/HowItWorks';
import { SectionHeading } from '../sections/SectionHeading';
import { Timeline } from '../sections/Timeline';

export function HowItWorksPage() {
  return (
    <>
      <PageHero {...PAGE_HEROES.howItWorks}>
        <Link to="/register" className="btn-primary px-7 py-3.5 text-base">
          Create your first rota, free
        </Link>
      </PageHero>

      <HowItWorks learnMore={false} />

      <section aria-labelledby="walkthrough-title" className="section-y border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHeading
              align="left"
              id="walkthrough-title"
              eyebrow="The full walkthrough"
              title="What happens from day one"
              sub="Here’s everything DexServe takes off your plate, from first set-up to the end-of-month report."
            />
            <Timeline steps={WALKTHROUGH} className="mt-10" />
          </div>
          <Reveal delay={150} className="lg:sticky lg:top-28 lg:self-start">
            <DashboardMockup />
          </Reveal>
        </div>
      </section>

      <BeforeAfter />
      <div className="pt-20 sm:pt-28">
        <FinalCta />
      </div>
    </>
  );
}
