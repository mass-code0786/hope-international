'use client';

export function BannerImageFrame({
  src,
  alt,
  className = '',
  contentClassName = '',
  imageClassName = '',
  children = null
}) {
  if (!src) return null;

  return (
    <div className={`relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(3,7,18,0.96)_72%)] ${className}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-2xl scale-110 opacity-45"
        style={{ backgroundImage: `url(${src})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.18),rgba(3,7,18,0.38))]" />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`relative z-10 h-full w-full object-contain object-center ${imageClassName}`}
      />
      {children ? (
        <div className={`absolute inset-0 z-20 ${contentClassName}`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
