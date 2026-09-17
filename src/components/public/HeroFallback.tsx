import Image from "next/image";

/** Composed brand graphic when no published hero image exists. */
export function HeroFallback() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-navy via-navy to-navy-deep">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 30%, rgba(212,175,55,0.35), transparent 55%), radial-gradient(circle at 70% 70%, rgba(197,160,89,0.2), transparent 50%)",
        }}
      />
      <Image
        src="/media/logo.jpg"
        alt="Al Najah Al Daem · Fixpoint Building Maintenance"
        width={320}
        height={320}
        sizes="(max-width: 640px) 70vw, 280px"
        className="relative z-[1] h-auto w-[78%] max-h-[280px] max-w-[280px] object-contain"
      />
    </div>
  );
}
