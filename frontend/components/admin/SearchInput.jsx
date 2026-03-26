export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm outline-none ring-accent/40 focus:ring"
    />
  );
}
