'use client';

import { Grid3X3, Heart, Sparkles, Pill, Package, ShoppingBasket, Smartphone, Cpu, Shirt } from 'lucide-react';

const categories = [
  { label: 'All', icon: Grid3X3 },
  { label: 'Grocery', icon: ShoppingBasket },
  { label: 'Fashion', icon: Shirt },
  { label: 'Mobile', icon: Smartphone },
  { label: 'Gadgets', icon: Cpu },
  { label: 'Beauty', icon: Heart },
  { label: 'Health', icon: Pill },
  { label: 'Physical', icon: Package },
  { label: 'Digital', icon: Sparkles }
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
                ? 'border-[#0ea5e9] bg-[#0ea5e9] text-white'
                : 'border-slate-200 bg-[#f1f5f9] text-[#334155]'
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
