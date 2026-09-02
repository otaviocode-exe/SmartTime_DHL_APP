const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

export function SmartTimeIcon({ size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      data-testid="smarttime-icon"
    >
      <defs>
        <linearGradient id="st-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="45%" stopColor="#FFCC00" />
          <stop offset="100%" stopColor="#F0BC00" />
        </linearGradient>
        <linearGradient id="st-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="st-face" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* squircle body */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#st-body)" />
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#st-face)" />
      <path d="M2 18C2 9.2 9.2 2 18 2h28c8.8 0 16 7.2 16 16v6C46 14 18 14 2 24V18Z" fill="url(#st-gloss)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="15.25" stroke="#000000" strokeOpacity="0.08" strokeWidth="1.5" />

      {/* dial ring */}
      <circle cx="32" cy="32" r="22" stroke="#D40511" strokeOpacity="0.18" strokeWidth="1" />

      {/* ticks */}
      {TICKS.map((deg) => (
        <rect
          key={deg}
          x="31.35"
          y={deg % 90 === 0 ? 11.5 : 12.5}
          width="1.3"
          height={deg % 90 === 0 ? 5.5 : 3.5}
          rx="0.65"
          fill="#D40511"
          opacity={deg % 90 === 0 ? 1 : 0.55}
          transform={`rotate(${deg} 32 32)`}
        />
      ))}

      {/* hands (10:10, Apple-like) */}
      <rect x="30.9" y="19" width="2.2" height="14.5" rx="1.1" fill="#D40511" transform="rotate(-45 32 32)" />
      <rect x="31.2" y="14" width="1.6" height="19" rx="0.8" fill="#D40511" transform="rotate(35 32 32)" />

      {/* center pin */}
      <circle cx="32" cy="32" r="3.1" fill="#D40511" />
      <circle cx="32" cy="32" r="1.15" fill="#FFF6D6" />
    </svg>
  );
}

export default function SmartTimeLogo({ size = 40, className = "", wordmarkClass = "", subtitle }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="smarttime-logo">
      <div className="shrink-0 rounded-[14px] shadow-[0_6px_16px_rgba(255,204,0,0.35)]">
        <SmartTimeIcon size={size} />
      </div>
      <div className="min-w-0">
        <div className={`font-heading font-extrabold tracking-[-0.02em] leading-none ${wordmarkClass || "text-lg text-[#333333]"}`}>
          Smart<span className="text-[#D40511]">Time</span>
        </div>
        {subtitle && (
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-slate-400 mt-1 truncate">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
