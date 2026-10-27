import { Link } from 'react-router';
import { icons } from '../../../components/icons';
import { Reveal } from '../../../hooks/useReveal';
import { STEPS } from '../content';
import { RotaCardMockup } from '../mockups/RotaCardMockup';
import { LearnMore } from './LearnMore';
import { SectionHeading } from './SectionHeading';
import { Timeline } from './Timeline';

export function HowItWorks({ learnMore = true }: { learnMore?: boolean }) {
  return (
    <section aria-labelledby="how-title" className="section-y">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionHeading align="left" id="how-title" eyebrow="How it works" title="Replica fixes this in 3 steps." />
          <Timeline steps={STEPS} className="mt-10" />
          <Reveal className="mt-10 flex flex-wrap items-center gap-6">
            <Link to="/register" className="btn-primary px-6 py-3.5 text-base">
              Create your first rota <icons.arrowRight size={18} />
            </Link>
            {learnMore && <LearnMore to="/how-it-works">See the full walkthrough</LearnMore>}
          </Reveal>
        </div>
        <Reveal delay={150} className="flex justify-center lg:justify-end">
          <RotaCardMockup />
        </Reveal>
      </div>
    </section>
  );
}
