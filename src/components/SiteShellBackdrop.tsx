/** Sticky top bar — Vapi: transparent over void canvas, pearl hairline */
export function siteHeaderChrome() {
  return "border-pearl-border/30 bg-void-canvas/95";
}

/** Flat void canvas — no gradients, glows, or shadows per Vapi spec */
export function SiteShellBackdrop() {
  return (
    <div className="fixed inset-0 -z-10 bg-void-canvas" aria-hidden />
  );
}
