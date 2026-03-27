'use client';

import { useEffect, useState } from 'react';
import { initTheme } from '@/lib/utils/theme';

function getPalette(theme) {
  if (theme === 'dark') {
    return {
      text: '#ffffff',
      subtitle: '#cbd5e1',
      globeBlue: '#38bdf8',
      globeGreen: '#4ade80'
    };
  }

  return {
    text: '#0f172a',
    subtitle: '#64748b',
    globeBlue: '#0ea5e9',
    globeGreen: '#22c55e'
  };
}

export function Logo({ size = 32, variant = 'full', className = '' }) {
  const [theme, setTheme] = useState('light');

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

  const palette = getPalette(theme);
  const isMark = variant === 'mark';

  if (isMark) {
    return (
      <span className={`inline-flex items-center ${className}`} style={{ height: size, width: Math.round(size * 3.2), lineHeight: 0 }}>
        <svg viewBox="0 0 192 56" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Hope International logo" className="h-full w-full">
          <g fill={palette.text}>
            <path d="M8 10h11v13h14V10h11v36H33V32H19v14H8z" />
            <path d="M114 10h27v8h-16v6h14v8h-14v14h-11z" />
            <path d="M146 10h30v8h-19v6h17v8h-17v6h19v8h-30z" />
          </g>
          <g transform="translate(47 9)">
            <circle cx="18" cy="19" r="15" fill="none" stroke={palette.globeBlue} strokeWidth="4" />
            <path d="M3 19h30M18 4v30M8 11c5 5 17 5 22 0M8 27c5-5 17-5 22 0" stroke={palette.globeGreen} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center ${className}`} style={{ height: size, width: Math.round(size * 3.8), lineHeight: 0 }}>
      <svg viewBox="0 0 320 84" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Hope International logo" className="h-full w-full">
        <g fill={palette.text}>
          <path d="M10 10h14v17h18V10h14v48H42V38H24v20H10z" />
          <path d="M184 10h35v10h-21v8h18v10h-18v20h-14z" />
          <path d="M226 10h38v10h-24v8h21v10h-21v10h24v10h-38z" />
        </g>

        <g transform="translate(74 8)">
          <circle cx="26" cy="24" r="20" fill="none" stroke={palette.globeBlue} strokeWidth="5" />
          <path d="M6 24h40M26 4v40M12 14c7 7 21 7 28 0M12 34c7-7 21-7 28 0" stroke={palette.globeGreen} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>

        <text x="10" y="77" fill={palette.subtitle} fontFamily="Segoe UI, Arial, sans-serif" fontWeight="600" fontSize="12" letterSpacing="2.8">
          INTERNATIONAL
        </text>
      </svg>
    </span>
  );
}
