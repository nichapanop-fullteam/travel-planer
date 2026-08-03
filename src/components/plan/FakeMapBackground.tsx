// A decorative "looks like a real map tile" background — warm beige land, a
// pale river band with a place label, a slightly rotated grid of city blocks
// with thin single-line roads, and an overlapping park. Not tied to any real
// geography; just gives the map panels something more convincing than a flat
// gradient until an actual map provider (Google Maps/Mapbox/Leaflet) is wired up.
export function FakeMapBackground({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 h-full w-full ${className}`}>
      <rect width="400" height="300" fill="#ece7dd" />

      {/* river */}
      <path
        d="M0 0 H400 V58 C 310 80, 250 48, 185 66 C 118 82, 62 58, 0 70 Z"
        fill="#d7e9f1"
      />
      <text x="150" y="40" fontSize="9" fontWeight="600" fill="#6f95ab">
        แม่น้ำโขง
      </text>

      {/* road + block grid, rotated slightly so it reads less like a rigid diagram */}
      <g transform="rotate(-7 200 150)">
        <g opacity="0.9" fill="#dedad0">
          <rect x="20" y="60" width="34" height="26" rx="3" />
          <rect x="62" y="60" width="34" height="26" rx="3" />
          <rect x="104" y="60" width="26" height="26" rx="3" />
          <rect x="20" y="94" width="34" height="26" rx="3" />
          <rect x="62" y="94" width="34" height="26" rx="3" />
          <rect x="104" y="94" width="26" height="26" rx="3" />
          <rect x="20" y="128" width="34" height="26" rx="3" />
          <rect x="62" y="128" width="34" height="26" rx="3" />
          <rect x="20" y="162" width="26" height="22" rx="3" />
          <rect x="54" y="162" width="26" height="22" rx="3" />

          <rect x="225" y="55" width="30" height="28" rx="3" />
          <rect x="263" y="55" width="30" height="28" rx="3" />
          <rect x="301" y="55" width="30" height="28" rx="3" />
          <rect x="345" y="50" width="26" height="24" rx="3" />
          <rect x="378" y="48" width="22" height="26" rx="3" />
          <rect x="225" y="91" width="30" height="28" rx="3" />
          <rect x="263" y="91" width="30" height="28" rx="3" />
          <rect x="301" y="91" width="30" height="28" rx="3" />
          <rect x="225" y="127" width="30" height="24" rx="3" />
          <rect x="263" y="127" width="30" height="24" rx="3" />
          <rect x="301" y="127" width="30" height="24" rx="3" />
        </g>

        <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none">
          <path d="M-20 60 H420" />
          <path d="M-20 155 H420" />
          <path d="M20 20 V270" />
          <path d="M105 15 V270" />
          <path d="M188 10 V270" />
          <path d="M262 10 V270" />
          <path d="M345 10 V270" />
        </g>
      </g>

      {/* park */}
      <ellipse cx="60" cy="235" rx="58" ry="46" fill="#c9dfc2" opacity="0.85" />
      <ellipse cx="42" cy="258" rx="52" ry="42" fill="#bcd6b4" opacity="0.75" />
      <path d="M95 195 L28 275" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
