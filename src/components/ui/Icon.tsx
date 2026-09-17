import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6.2 6.2l2 2M15.8 15.8l2 2M17.8 6.2l-2 2M8.2 15.8l-2 2" />
    </Svg>
  );
}

export function IconDroplet(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3s6 6.2 6 11a6 6 0 1 1-12 0c0-4.8 6-11 6-11Z" />
    </Svg>
  );
}

export function IconWind(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8h11a3 3 0 1 0-3-3" />
      <path d="M3 12h15a3 3 0 1 1-3 3" />
      <path d="M3 16h8" />
    </Svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" />
    </Svg>
  );
}

export function IconBrush(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m14 4 6 6-8.5 8.5a4 4 0 0 1-5.6-5.6L14 4Z" />
      <path d="m16 6 2 2" />
    </Svg>
  );
}

export function IconWall(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 12h18M12 4v16" />
    </Svg>
  );
}

export function IconPipe(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10h8v4H4zM12 12h5" />
      <path d="M17 8v8M17 8h3M17 16h3" />
    </Svg>
  );
}

export function IconSparkClean(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 18h16" />
      <path d="M7 18V9l5-4 5 4v9" />
      <path d="M10 18v-4h4v4" />
    </Svg>
  );
}

export function IconWrench(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4L15 12l-3-3 2.7-2.7Z" />
    </Svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5h7a3 3 0 0 1 3 3v12a3 3 0 0 0-3-3H4zM20 5h-7a3 3 0 0 0-3 3v12a3 3 0 0 1 3-3h7z" />
    </Svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 19a5 5 0 0 0-6-4.7" />
    </Svg>
  );
}

export function IconMap(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </Svg>
  );
}

export function IconShare(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 13.2 7.6 4.2M15.8 6.6 8.2 10.8" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}

export function IconMinus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 6h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 17H9l-4 3v-3.5A1.5 1.5 0 0 1 5 15.5V7.5A1.5 1.5 0 0 1 5 6Z" />
    </Svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3h4l1 4-2.5 1.5a12 12 0 0 0 6 6L17 12l4 1v4a2 2 0 0 1-2 2A16 16 0 0 1 3 7a2 2 0 0 1 2-2Z" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

export function IconArrow(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export const serviceIcons = {
  "cleaning-services": IconSparkClean,
  "building-maintenance": IconWrench,
  "plumbing-maintenance": IconPipe,
  "electrical-maintenance": IconBolt,
  "ac-maintenance": IconWind,
  "painting-services": IconBrush,
  "wall-maintenance": IconWall,
} as const;

/** Same stroke, same 24px grid — one distinct line icon per visitor parent category. */
export function IconBuilding(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 20.5V9.2L12 4.5l7 4.7V20.5" />
      <path d="M3.5 20.5h17" />
      <path d="M10 20.5v-4.5h4V20.5" />
      <path d="M9 11h2.2M13 11h2.2M9 14.5h2.2M13 14.5h2.2" />
    </Svg>
  );
}

export function IconFaucet(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 10.8V5.6" />
      <path d="M6 5.6h4" />
      <path d="M4.5 11h8.6a2.4 2.4 0 0 1 2.4 2.4V15.2" />
      <path d="M15.5 16c1.1 1.4 1.7 2.3 1.7 3.2a1.7 1.7 0 1 1-3.4 0c0-.9.6-1.8 1.7-3.2Z" />
    </Svg>
  );
}

export function IconClean(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.2 3.4 10.7 7.5 14.8 9 10.7 10.5 9.2 14.6 7.7 10.5 3.6 9 7.7 7.5 9.2 3.4Z" />
      <path d="M17.1 13 17.85 15.2 20 16 17.85 16.8 17.1 19 16.35 16.8 14.2 16 16.35 15.2 17.1 13Z" />
    </Svg>
  );
}

export function IconAcUnit(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4.5" width="18" height="8" rx="1.5" />
      <path d="M6.5 7.6h11M6.5 10h11" />
      <path d="M6 15.8q1.5-1.5 3 0t3 0 3 0 3 0" />
      <path d="M7.2 18.6q1.2-1.1 2.4 0t2.4 0 2.4 0" />
    </Svg>
  );
}

export function IconRoller(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="10.5" height="5" rx="1.6" />
      <path d="M13.5 6.5h3.2a1.6 1.6 0 0 1 1.6 1.6V17" />
      <path d="M18.3 17v3.2" />
    </Svg>
  );
}

export function IconBrickWall(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 4.5h17v15h-17z" />
      <path d="M3.5 9.5h17M3.5 14.5h17" />
      <path d="M9 4.5v5M15 4.5v5M12 9.5v5M9 14.5v5M15 14.5v5" />
    </Svg>
  );
}

export function IconPool(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 9.6c1.6 1 2.7 1 4.2 0s2.6-1 4.2 0 2.6 1 4.2 0 2.6-1 4.2 0" />
      <path d="M4.2 11V18.2a1.5 1.5 0 0 0 1.5 1.5h12.6a1.5 1.5 0 0 0 1.5-1.5V11" />
      <path d="M8 15c1 .5 1.8.5 2.8 0s1.8-.5 2.8 0 1.8.5 2.8 0" />
      <path d="M7 9.6V6.2M9.6 9.6V6.2M7 7.5h2.6" />
    </Svg>
  );
}

export function IconSauna(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 20.5h13" />
      <path d="M7 20.5V11h10v9.5" />
      <path d="M7 14.2h10" />
      <circle cx="9.2" cy="16.8" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16.8" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="16.8" r="0.8" fill="currentColor" stroke="none" />
      <path d="M8.6 9c.55-1 .9-1.5.9-2.2" />
      <path d="M12 8c.55-1.1.9-1.7.9-2.5" />
      <path d="M15.4 9c.55-1 .9-1.5.9-2.2" />
    </Svg>
  );
}

export function IconWaterTank(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="6" rx="6" ry="2.2" />
      <path d="M6 6v11.2c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V6" />
      <path d="M6 13.5c0 1.1 2.7 2 6 2s6-.9 6-2" />
    </Svg>
  );
}

export function IconFridge(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3.5h10A1.5 1.5 0 0 1 18.5 5v15A1.5 1.5 0 0 1 17 21.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M5.5 10.5h13" />
      <path d="M9 6.7v2M9 13.2v2.5" />
    </Svg>
  );
}

export function IconMicrowave(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="6" width="19" height="12.5" rx="1.5" />
      <rect x="5" y="8.3" width="9.2" height="7.8" rx="1" />
      <circle cx="17.5" cy="9.6" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="12.4" r="0.85" fill="currentColor" stroke="none" />
      <path d="M16.3 15.2h2.4" />
    </Svg>
  );
}

export function IconWasher(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="3" width="15" height="18" rx="2" />
      <path d="M4.5 7.4h15" />
      <circle cx="12" cy="14" r="4.1" />
      <circle cx="12" cy="14" r="1.5" />
      <circle cx="8" cy="5.2" r="0.7" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconWaterHeater(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.2 6.2V3.5M13.8 6.2V3.5" />
      <path d="M8.2 6h7.6v14.2H8.2Z" />
      <path d="M8.2 9.2h7.6" />
      <path d="M12 12.2c1 1.15 1.7 2 1.7 3a1.7 1.7 0 1 1-3.4 0c0-1 .7-1.85 1.7-3Z" />
    </Svg>
  );
}

export function IconDishwasher(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M5 7.2h14" />
      <path d="M8 5.15h3.4" />
      <path d="M8 10.6h8M8 13.6h8M8 16.6h8" />
    </Svg>
  );
}

export function IconDumbbell(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 9.2v5.6" />
      <path d="M7.6 6.8v10.4" />
      <path d="M7.6 12h8.8" />
      <path d="M16.4 6.8v10.4" />
      <path d="M19 9.2v5.6" />
    </Svg>
  );
}

export function IconOven(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="3" width="15" height="18" rx="1.5" />
      <path d="M4.5 8h15" />
      <circle cx="8.6" cy="5.55" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="5.55" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="5.55" r="0.7" fill="currentColor" stroke="none" />
      <rect x="7.2" y="10.6" width="9.6" height="6.8" rx="1" />
    </Svg>
  );
}

export function IconHob(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="10" r="1.85" />
      <circle cx="15.5" cy="10" r="1.85" />
      <circle cx="8.5" cy="15" r="1.85" />
      <circle cx="15.5" cy="15" r="1.85" />
    </Svg>
  );
}

/** Category slugs from the visitor nav tree (APPROVED_CATEGORIES). */
export const categoryIcons = {
  electrical: IconBolt,
  "general-maintenance": IconBuilding,
  plumbing: IconFaucet,
  cleaning: IconClean,
  ac: IconAcUnit,
  painting: IconRoller,
  walls: IconBrickWall,
  "swimming-pool": IconPool,
  sauna: IconSauna,
  "water-tank": IconWaterTank,
  refrigerator: IconFridge,
  microwave: IconMicrowave,
  "washing-machine": IconWasher,
  "water-heater": IconWaterHeater,
  dishwasher: IconDishwasher,
  gym: IconDumbbell,
  oven: IconOven,
  "burner-cooker": IconHob,
} as const;
