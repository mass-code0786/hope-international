'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { initTheme, toggleTheme } from '@/lib/utils/theme';

export function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    setTheme(initTheme());

    const onThemeChange = (event) => {
      if (event?.detail === 'light' || event?.detail === 'dark') {
        setTheme(event.detail);
      }
    };

    window.addEventListener('hope-theme-change', onThemeChange);
    return () => window.removeEventListener('hope-theme-change', onThemeChange);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setTheme((prev) => toggleTheme(prev))}
      className={`rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-700 ${className}`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
