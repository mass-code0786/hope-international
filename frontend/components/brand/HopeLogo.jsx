'use client';

import { Logo } from '@/components/common/Logo';

export function LogoMark({ size = 32, className = '' }) {
  return <Logo size={size} variant="mark" className={className} imageClassName="p-1.5" />;
}

export function LogoFull({ size = 40, showText = true, className = '' }) {
  return <Logo size={size} variant={showText ? 'full' : 'mark'} className={className} imageClassName={showText ? 'p-2' : 'p-1.5'} />;
}
