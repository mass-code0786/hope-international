'use client';

function BadgeSvg({ showText = true }) {
  return (
    <svg
      viewBox="0 0 320 320"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Hope International logo"
      className="h-full w-full"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <radialGradient id="hope-bg" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#0f223f" />
          <stop offset="65%" stopColor="#081126" />
          <stop offset="100%" stopColor="#040913" />
        </radialGradient>
        <linearGradient id="hope-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8de9a" />
          <stop offset="45%" stopColor="#d9af58" />
          <stop offset="100%" stopColor="#b9872f" />
        </linearGradient>
      </defs>

      <circle cx="160" cy="160" r="154" fill="url(#hope-bg)" />
      <circle cx="160" cy="160" r="150" fill="none" stroke="url(#hope-gold)" strokeWidth="3" />
      <circle cx="160" cy="160" r="142" fill="none" stroke="#b9872f" strokeOpacity="0.35" strokeWidth="1.5" />

      <g transform="translate(0,-6)" fill="none" stroke="url(#hope-gold)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M117 150h86l-8 60h-70z" strokeWidth="5.5" />
        <path d="M137 150v-14c0-12 10-22 23-22s23 10 23 22v14" strokeWidth="5.5" />
        <path d="M160 92c28 0 50 22 50 50s-22 50-50 50s-50-22-50-50s22-50 50-50z" strokeWidth="4.8" />
        <path d="M110 142h100" strokeWidth="3.8" />
        <path d="M160 92v100" strokeWidth="3.2" />
        <path d="M132 108c9 10 14 22 14 34s-5 24-14 34" strokeWidth="3" />
        <path d="M188 108c-9 10-14 22-14 34s5 24 14 34" strokeWidth="3" />
        <path d="M126 121c10 6 22 9 34 9s24-3 34-9" strokeWidth="3" />
        <path d="M126 163c10-6 22-9 34-9s24 3 34 9" strokeWidth="3" />
      </g>

      {showText ? (
        <g textAnchor="middle">
          <text
            x="160"
            y="228"
            fill="#f1d18a"
            fontSize="15"
            letterSpacing="1.15"
            textLength="216"
            lengthAdjust="spacingAndGlyphs"
            fontFamily="Cinzel, 'Times New Roman', Georgia, serif"
            fontWeight="600"
          >
            HOPE INTERNATIONAL
          </text>
          <text
            x="160"
            y="250"
            fill="#7698c9"
            fontSize="10.5"
            letterSpacing="2.2"
            textLength="166"
            lengthAdjust="spacingAndGlyphs"
            fontFamily="'Times New Roman', Georgia, serif"
            fontWeight="600"
          >
            LUXURY E-COMMERCE
          </text>
        </g>
      ) : null}
    </svg>
  );
}

export function LogoMark({ size = 44, className = '' }) {
  return (
    <span className={`inline-flex shrink-0 ${className}`} style={{ width: size, height: size, lineHeight: 0 }}>
      <BadgeSvg showText={false} />
    </span>
  );
}

export function LogoFull({ size = 168, showText = true, className = '' }) {
  const minSize = Math.round(size * 0.68);

  return (
    <span
      className={`inline-flex shrink-0 ${className}`}
      style={{
        width: `clamp(${minSize}px, 40vw, ${size}px)`,
        height: `clamp(${minSize}px, 40vw, ${size}px)`,
        lineHeight: 0
      }}
    >
      <BadgeSvg showText={showText} />
    </span>
  );
}
