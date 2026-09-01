// The folded-map glyph used by แพลนทริป's floating map toggle. Inlined from
// the design export (map.svg) rather than served from /public so it can take
// `currentColor` and inherit the button's text colour; the export ships a
// hardcoded white fill, which would be invisible on anything but the orange
// FAB it was drawn for.
//
// viewBox is the export's own 28×28, so the path is untouched — only the fill
// and the accessibility attributes differ from the file on disk.
export function MapIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="currentColor" aria-hidden className={className}>
      <path d="M18.6667 28L9.33333 24.7333L2.1 27.5333C1.58148 27.7407 1.10185 27.6824 0.661111 27.3583C0.22037 27.0343 0 26.6 0 26.0556V4.27778C0 3.94074 0.0972222 3.64259 0.291667 3.38333C0.486111 3.12407 0.751852 2.92963 1.08889 2.8L9.33333 0L18.6667 3.26667L25.9 0.466667C26.4185 0.259259 26.8981 0.317593 27.3389 0.641667C27.7796 0.965741 28 1.4 28 1.94444V23.7222C28 24.0593 27.9028 24.3574 27.7083 24.6167C27.5139 24.8759 27.2481 25.0704 26.9111 25.2L18.6667 28ZM17.1111 24.1889V5.98889L10.8889 3.81111V22.0111L17.1111 24.1889ZM20.2222 24.1889L24.8889 22.6333V4.2L20.2222 5.98889V24.1889ZM3.11111 23.8L7.77778 22.0111V3.81111L3.11111 5.36667V23.8Z" />
    </svg>
  );
}
