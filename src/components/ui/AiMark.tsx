import { cn } from "@/lib/utils";

export function AiMark({
  id,
  size = 64,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const clip = `${id}-clip`;
  const sparkle = `${id}-sparkle`;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <clipPath id={clip}>
          <text
            x="32"
            y="42"
            textAnchor="middle"
            fontFamily="var(--font-sans), ui-sans-serif, sans-serif"
            fontSize="26"
            fontWeight="800"
            letterSpacing="-0.8"
          >
            AI
          </text>
        </clipPath>
        <pattern id={sparkle} width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="#102a6b" />
          <circle cx="0.6" cy="0.7" r="0.45" fill="#fff" />
          <circle cx="2.1" cy="1.6" r="0.4" fill="#7dd3fc" />
          <circle cx="1.2" cy="2.4" r="0.35" fill="#bfdbfe" />
          <circle cx="2.5" cy="0.4" r="0.3" fill="#fff" />
        </pattern>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="28.5"
        fill="#fff"
        stroke="#67e8f9"
        strokeWidth="1.8"
        strokeDasharray="164 14"
        strokeDashoffset="26"
        transform="rotate(-55 32 32)"
      />
      <rect width="64" height="64" fill={`url(#${sparkle})`} clipPath={`url(#${clip})`} />
    </svg>
  );
}
