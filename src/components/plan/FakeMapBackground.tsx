// A decorative "looks like a real map tile" background — light gray-beige land,
// white roads, soft green parks, a blue river corner. Not tied to any real
// geography; just gives the map panels something more convincing than a flat
// gradient until an actual map provider (Google Maps/Mapbox/Leaflet) is wired up.
export function FakeMapBackground({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 h-full w-full ${className}`}>
      <rect width="400" height="300" fill="#e9e6de" />

      {/* city blocks */}
      <g opacity="0.9">
        <rect x="18" y="24" width="46" height="34" rx="3" fill="#dedad0" />
        <rect x="80" y="18" width="30" height="52" rx="3" fill="#e2ded3" />
        <rect x="150" y="30" width="52" height="40" rx="3" fill="#dedad0" />
        <rect x="230" y="22" width="36" height="48" rx="3" fill="#e2ded3" />
        <rect x="22" y="120" width="40" height="46" rx="3" fill="#e2ded3" />
        <rect x="90" y="140" width="56" height="34" rx="3" fill="#dedad0" />
        <rect x="200" y="130" width="34" height="50" rx="3" fill="#e2ded3" />
        <rect x="300" y="40" width="44" height="60" rx="3" fill="#dedad0" />
        <rect x="60" y="210" width="50" height="38" rx="3" fill="#e2ded3" />
        <rect x="150" y="220" width="60" height="34" rx="3" fill="#dedad0" />
        <rect x="270" y="200" width="40" height="46" rx="3" fill="#e2ded3" />
      </g>

      {/* parks */}
      <ellipse cx="120" cy="100" rx="26" ry="18" fill="#cfe3d4" />
      <ellipse cx="250" cy="150" rx="22" ry="16" fill="#cfe3d4" />
      <ellipse cx="60" cy="185" rx="18" ry="14" fill="#cfe3d4" />

      {/* river */}
      <path
        d="M400 220 C 340 210, 320 250, 260 240 S 160 270, 90 300"
        stroke="#bcd6e6"
        strokeWidth="22"
        fill="none"
        strokeLinecap="round"
      />

      {/* roads (casing + white line for a two-tone look) */}
      <g strokeLinecap="round" fill="none">
        <path d="M0 70 H400" stroke="#d3cfc3" strokeWidth="7" />
        <path d="M0 70 H400" stroke="#ffffff" strokeWidth="4" />
        <path d="M0 180 H400" stroke="#d3cfc3" strokeWidth="7" />
        <path d="M0 180 H400" stroke="#ffffff" strokeWidth="4" />
        <path d="M110 0 V300" stroke="#d3cfc3" strokeWidth="7" />
        <path d="M110 0 V300" stroke="#ffffff" strokeWidth="4" />
        <path d="M270 0 V300" stroke="#d3cfc3" strokeWidth="7" />
        <path d="M270 0 V300" stroke="#ffffff" strokeWidth="4" />
        <path d="M0 20 L400 130" stroke="#d3cfc3" strokeWidth="5" />
        <path d="M0 20 L400 130" stroke="#ffffff" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
