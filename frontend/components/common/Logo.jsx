import Image from 'next/image';

export default function Logo({
  size = 40,
  className = '',
  imageClassName = '',
  alt = 'Hope International'
}) {
  const frameStyle = { width: size, height: size };
  const imageSize = Math.max(Math.round(size * 0.82), 16);

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={frameStyle}
    >
      <Image
        src="/logo.svg"
        alt={alt}
        width={imageSize}
        height={imageSize}
        priority
        className={`object-contain ${imageClassName}`}
      />
    </div>
  );
}

export { Logo as Logo };
