import type { ReactNode } from 'react';
import { Reveal } from '../../../hooks/useReveal';

export function SectionHeading({
  id,
  eyebrow,
  title,
  sub,
  align = 'center',
  dark = false,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: 'center' | 'left';
  dark?: boolean;
}) {
  return (
    <Reveal className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className={`text-xs font-semibold tracking-widest uppercase ${dark ? 'text-brand-on-dark' : 'text-brand'}`}>{eyebrow}</p>
      )}
      <h2 id={id} className={`display mt-3 text-3xl sm:text-5xl ${dark ? 'text-white' : ''}`}>
        {title}
      </h2>
      {sub && <p className={`mt-4 text-lg leading-relaxed ${dark ? 'text-on-dark' : ''}`}>{sub}</p>}
    </Reveal>
  );
}
