import { Link } from 'react-router';
import { StoreBadges } from '../../../components/StoreBadges';
import { Reveal } from '../../../hooks/useReveal';
import { PAGE_HEROES, VOLUNTEER_STEPS, faqsFor } from '../content';
import { MyShiftsMockup } from '../mockups/MyShiftsMockup';
import { PageHero } from '../PageHero';
import { FaqSection } from '../sections/Faq';
import { VolunteerFeatures } from '../sections/Features';
import { FinalCta } from '../sections/FinalCta';
import { SectionHeading } from '../sections/SectionHeading';
import { Timeline } from '../sections/Timeline';

export function VolunteersPage() {
  return (
    <>
      <PageHero {...PAGE_HEROES.volunteers}>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/login" className="btn-primary px-7 py-3.5 text-base">
            Sign in with your email
          </Link>
        </div>
        <StoreBadges />
      </PageHero>

      <VolunteerFeatures learnMore={false} />

      <section aria-labelledby="steps-title" className="section-y">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionHeading align="left" id="steps-title" eyebrow="Getting started" title="Your first shift in 4 steps" />
            <Timeline steps={VOLUNTEER_STEPS} className="mt-10" />
          </div>
          <Reveal delay={150}>
            <MyShiftsMockup />
          </Reveal>
        </div>
      </section>

      <div className="border-t border-line bg-white">
        <FaqSection title="Questions from volunteers" items={faqsFor('volunteers')} />
      </div>
      <div className="pt-20 sm:pt-28">
        <FinalCta />
      </div>
    </>
  );
}
