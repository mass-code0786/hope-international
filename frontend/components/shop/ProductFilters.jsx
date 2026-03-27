'use client';

import { Grid3X3, Heart, Sparkles, Apple, Pill, BadgeHelp, ShoppingBasket, Smartphone, Cpu, Shirt } from 'lucide-react';

const categories = [
  { label: 'All', icon: Grid3X3 },
  { label: 'Digital', icon: Sparkles },
  { label: 'Physical', icon: BadgeHelp },
  { label: 'Health', icon: Pill },
  { label: 'Beauty', icon: Heart },
  { label: 'Courses', icon: Apple },
  { label: 'Grocery / Rashan', icon: ShoppingBasket },
  { label: 'Mobile', icon: Smartphone },
  { label: 'Gadgets', icon: Cpu },
  { label: 'Fashion', icon: Shirt }
];

export function ProductFilters({ activeCategory, setActiveCategory }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const active = activeCategory === cat.label;

        return (
          <button
            key={cat.label}
            type="button"
            onClick={() => setActiveCategory(cat.label)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] font-medium transition ${
              active
                ? 'border-sky-300 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <Icon size={12} />
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
