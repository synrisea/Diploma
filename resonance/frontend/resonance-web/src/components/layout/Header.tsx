export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-5">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight text-stone-900">Resonance</span>
        <span className="text-sm text-stone-400">Baku · Torgovy</span>
      </div>
      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-500">
        Community map — early preview
      </span>
    </header>
  );
}
