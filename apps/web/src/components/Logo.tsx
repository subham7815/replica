export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">R</span>
      <span className={`font-semibold ${dark ? 'text-white' : 'text-ink'}`}>Replica</span>
    </span>
  );
}
