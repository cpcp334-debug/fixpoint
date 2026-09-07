export function HeroFallback() {
  return (
    <svg viewBox="0 0 640 480" className="h-full w-full" aria-hidden>
      <rect width="640" height="480" fill="#071525" />
      <rect x="40" y="220" width="180" height="220" fill="#0b1f3a" />
      <rect x="80" y="140" width="140" height="300" fill="#123050" />
      <rect x="250" y="90" width="160" height="350" fill="#0e2a48" />
      <rect x="430" y="160" width="170" height="280" fill="#123050" />
      <rect x="100" y="180" width="28" height="40" fill="#1a7a6d" opacity="0.45" />
      <rect x="140" y="180" width="28" height="40" fill="#b8923a" opacity="0.35" />
      <rect x="280" y="130" width="28" height="40" fill="#1a7a6d" opacity="0.4" />
      <rect x="320" y="130" width="28" height="40" fill="#ffffff" opacity="0.12" />
      <rect x="460" y="200" width="28" height="40" fill="#b8923a" opacity="0.3" />
      <path d="M0 400h640" stroke="#b8923a" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}
