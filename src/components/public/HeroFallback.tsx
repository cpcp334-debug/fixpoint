export function HeroFallback() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-navy-deep">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 30%, rgba(212,175,55,0.35), transparent 45%), radial-gradient(circle at 70% 70%, rgba(197,160,89,0.2), transparent 40%)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/media/logo.jpg" alt="" className="relative z-[1] h-[70%] w-[70%] rounded-full object-cover ring-2 ring-gold/40" />
    </div>
  );
}
