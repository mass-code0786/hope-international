import Image from 'next/image';

export default function Logo({
  size = 40,
  className = '',
  imageClassName = '',
  alt = 'Hope International'
}) {
  const frameStyle = { width: size, height: size };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg bg-white shadow-sm dark:bg-neutral-900 ${className}`}
      style={frameStyle}
    >
      <Image
        src="/logo.svg"
        alt={alt}
        width={Math.max(size - 8, 16)}
        height={Math.max(size - 8, 16)}
        priority
        className={`object-contain ${imageClassName}`}
      />
    </div>
  );
}

export { Logo as Logo };