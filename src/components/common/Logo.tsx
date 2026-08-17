// Text wordmark — replaces the old vector logo (public/images/brand-logo.svg)
// now that the platform is called PunGuide. Colors match the old mark's accent
// scheme (green + orange highlights on an otherwise dark wordmark).
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      <span>Pun</span>
      <span style={{ color: "var(--color-brand-green)" }}>G</span>
      <span>uid</span>
      <span style={{ color: "var(--color-accent-orange)" }}>e</span>
    </span>
  );
}
