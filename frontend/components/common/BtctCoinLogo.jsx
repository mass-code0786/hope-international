export function BtctCoinLogo({ size = 20, className = '' }) {
  const pixelSize = Number(size) || 20;

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="btct-coin-fill" x1="12" y1="10" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FEF3C7" />
          <stop offset="0.45" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="btct-coin-ring" x1="16" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFF7ED" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FDE68A" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#btct-coin-fill)" />
      <circle cx="32" cy="32" r="24" stroke="url(#btct-coin-ring)" strokeWidth="2.5" />
      <path
        d="M25 18.5H36.8C42.6 18.5 45.8 21.15 45.8 25.6C45.8 28.85 43.9 31 40.45 31.85C44.55 32.55 47 35 47 39.15C47 44.35 43.15 47.5 36.6 47.5H25V18.5ZM31.4 24.2V29.55H36.25C38.9 29.55 40.2 28.65 40.2 26.75C40.2 24.95 38.9 24.2 36.25 24.2H31.4ZM31.4 34.85V41.8H36.95C40.05 41.8 41.35 40.55 41.35 38.25C41.35 35.95 39.95 34.85 36.85 34.85H31.4Z"
        fill="#7C2D12"
      />
      <path d="M28.7 15V49" stroke="#FFF7ED" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.85" />
      <path d="M37.9 15V49" stroke="#FFF7ED" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.75" />
      <path
        d="M18.5 24.5C21.5 16.85 28.95 11.8 37.2 11.8"
        stroke="#FFFBEB"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.75"
      />
      <circle cx="23.5" cy="19" r="2.2" fill="#FFFBEB" fillOpacity="0.85" />
    </svg>
  );
}

export default BtctCoinLogo;
