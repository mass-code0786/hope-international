'use client';

import { Search } from 'lucide-react';

const categories = ['All', 'Digital', 'Physical', 'Health', 'Beauty', 'Courses'];

export function ProductFilters({ search, setSearch, activeCategory, setActiveCategory }) {
  return (
    <div className="space-y-3.5">
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for wellness, beauty, digital products..."
          className="w-full rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
        />
      </label>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition ${
              activeCategory === cat
                ? 'border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 shadow-[0_10px_20px_rgba(217,119,6,0.2)]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
