'use client';

const categories = ['All', 'Digital', 'Physical', 'Health', 'Beauty', 'Courses'];

export function ProductFilters({ search, setSearch, activeCategory, setActiveCategory }) {
  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products"
        className="w-full rounded-2xl border border-white/10 bg-card p-3 text-sm outline-none ring-accent/40 focus:ring"
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs ${activeCategory === cat ? 'bg-accent text-black' : 'bg-white/5 text-muted'}`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
