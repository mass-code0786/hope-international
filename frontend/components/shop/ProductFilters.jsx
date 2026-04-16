'use client';

import { Grid3X3, Heart, Sparkles, Pill, Package, ShoppingBasket, Smartphone, Cpu, Shirt } from 'lucide-react';
import { SHOP_FILTER_CATEGORIES } from '@/lib/constants/productCategories';

const categoryIcons = {
  All: Grid3X3,
  Grocery: ShoppingBasket,
  Fashion: Shirt,
  Mobile: Smartphone,
  Gadgets: Cpu,
  Beauty: Heart,
  Health: Pill,
  Physical: Package,
  Digital: Sparkles
};

export function ProductFilters({ activeCategory, setActiveCategory }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {SHOP_FILTER_CATEGORIES.map((label) => {
        const Icon = categoryIcons[label] || Grid3X3;
        const active = activeCategory === label;

        return (
          <button
            key={label}
            type="button"
            onClick={() => setActiveCategory(label)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] font-medium transition ${
              active
                ? 'border-[#0ea5e9] bg-[#0ea5e9] text-white'
                : 'border-slate-200 bg-[#f1f5f9] text-[#334155]'
            }`}
          >
            <Icon size={12} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
