/** Sticky top bar fill — use with `border-b backdrop-blur-xl` */
export function siteHeaderChrome(isDark: boolean) {
  return isDark ? "border-white/[0.06] bg-neutral-950/80" : "border-neutral-200 bg-white/90";
}

/**
 * Full-viewport background: navy / gold tinted orbs + frosted overlay (StayNEP logo palette).
 */
export function SiteShellBackdrop({ isDark }: { isDark: boolean }) {
  return (
    <>
      <div className={`fixed inset-0 -z-20 ${isDark ? "bg-[#03060c]" : "bg-neutral-100"}`} aria-hidden />
      {isDark && (
        <>
          <div
            className="pointer-events-none fixed top-[-18%] right-[-8%] z-[-10] h-[min(580px,52vw)] w-[min(580px,52vw)] rounded-full bg-[#1e5278]/48 blur-[88px]"
            aria-hidden
          />
          <div
            className="pointer-events-none fixed bottom-[-12%] left-[-8%] z-[-10] h-[min(500px,48vw)] w-[min(500px,48vw)] rounded-full bg-[#eab308]/24 blur-[96px]"
            aria-hidden
          />
          <div
            className="pointer-events-none fixed left-1/2 top-[35%] z-[-10] h-[min(320px,40vw)] w-[min(320px,40vw)] -translate-x-1/2 rounded-full bg-sky-400/14 blur-[100px]"
            aria-hidden
          />
        </>
      )}
      {!isDark && (
        <div
          className="pointer-events-none fixed -right-[5%] top-[18%] z-[-10] h-[min(380px,45vw)] w-[min(380px,45vw)] rounded-full bg-sky-200/55 blur-[80px]"
          aria-hidden
        />
      )}
      <div
        className={`fixed inset-0 -z-[5] backdrop-blur-xl ${isDark ? "bg-neutral-950/62" : "bg-neutral-50/92"}`}
        aria-hidden
      />
    </>
  );
}
