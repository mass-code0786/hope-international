'use client';

const LOGO_ASPECT_RATIO = 1280 / 853;

export function Logo({
  size = 32,
  variant = 'full',
  className = '',
  imageClassName = '',
  alt = 'Hope International logo'
}) {
  const width = Math.round(size * LOGO_ASPECT_RATIO);
  const paddingClass = variant === 'mark' ? 'p-1.5' : 'p-2';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100/90 ${className}`}
      style={{ height: size, width }}
    >
      <img
        src="/logo.svg"
        alt={alt}
        className={`h-full w-full object-contain ${paddingClass} ${imageClassName}`}
      />
    </span>
  );
}
