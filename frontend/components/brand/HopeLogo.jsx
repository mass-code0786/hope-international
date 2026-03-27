'use client';

import Logo from '@/components/common/Logo';

export function LogoMark({ size = 32, className = '' }) {
  return <Logo size={size} className={className} imageClassName="object-contain" alt="Hope International" />;
}

export function LogoFull({ size = 40, showText = true, className = '' }) {
  return <Logo size={size} className={className} imageClassName="object-contain" alt={showText ? 'Hope International' : 'Hope'} />;
}