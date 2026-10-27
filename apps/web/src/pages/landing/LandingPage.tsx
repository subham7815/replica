import { BeforeAfter } from './sections/BeforeAfter';
import { FaqSection } from './sections/Faq';
import { CoordinatorFeatures, VolunteerFeatures } from './sections/Features';
import { FinalCta } from './sections/FinalCta';
import { Hero } from './sections/Hero';
import { HowItWorks } from './sections/HowItWorks';
import { PainPoints } from './sections/PainPoints';
import { TrustStrip } from './sections/TrustStrip';
import { UseCases } from './sections/UseCases';

export function LandingPage() {
  return (
    <>
      <Hero />
      <PainPoints />
      <CoordinatorFeatures />
      <VolunteerFeatures />
      <HowItWorks />
      <BeforeAfter />
      <UseCases />
      <TrustStrip />
      <FaqSection />
      <FinalCta />
    </>
  );
}
