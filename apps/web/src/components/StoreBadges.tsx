// Store URLs go here once the apps are published; until then the badges render as "Coming soon".
const APP_STORE_URL: string | null = null;
const PLAY_STORE_URL: string | null = null;

function Badge({ href, label, store, children }: { href: string | null; label: string; store: string; children: React.ReactNode }) {
  const body = (
    <>
      {children}
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-medium tracking-wide text-white/80">{label}</span>
        <span className="mt-0.5 text-[17px] font-semibold tracking-tight">{store}</span>
      </span>
    </>
  );
  const cls = 'inline-flex h-12 items-center gap-2.5 rounded-xl bg-ink px-4 text-white ring-1 ring-white/10';
  return href ? (
    <a href={href} className={`${cls} transition hover:bg-navy`} target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    <span className={`${cls} cursor-default`} aria-label={`${store}, coming soon`}>
      {body}
    </span>
  );
}

export function StoreBadges({ onDark = false }: { onDark?: boolean }) {
  const soon = !APP_STORE_URL && !PLAY_STORE_URL;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge href={APP_STORE_URL} label="Download on the" store="App Store">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
          <path d="M16.37 1.43c0 1.14-.49 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.21-2.98.8-.94 2.14-1.64 3.25-1.68.03.13.05.28.05.43zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8C3.96 18.38 2.93 15.57 2.93 12.92c0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.68.95 3.6.95.87 0 2.22-1.01 3.9-1.01.61 0 2.89.06 4.37 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.96 4.45z" />
        </svg>
      </Badge>
      <Badge href={PLAY_STORE_URL} label="GET IT ON" store="Google Play">
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
          <path d="M3.6 2.2 13.5 12l-9.9 9.8c-.36-.2-.6-.6-.6-1.1V3.3c0-.5.24-.9.6-1.1z" fill="#2196f3" />
          <path d="M16.8 8.7 13.5 12 3.6 2.2c.1-.06.22-.1.35-.12.3-.04.6.02.88.18z" fill="#4caf50" />
          <path d="M16.8 15.3 4.83 21.94c-.28.16-.58.22-.88.18a1 1 0 0 1-.35-.12L13.5 12z" fill="#f44336" />
          <path d="m20.4 13.3-3.6 2L13.5 12l3.3-3.3 3.6 2c.94.53.94 2.07 0 2.6z" fill="#ffc107" />
        </svg>
      </Badge>
      {soon && (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            onDark ? 'bg-white/15 text-white' : 'bg-warning-soft text-warning'
          }`}
        >
          Coming soon
        </span>
      )}
    </div>
  );
}
