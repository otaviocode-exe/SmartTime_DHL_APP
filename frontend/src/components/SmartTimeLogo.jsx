export function SmartTimeIcon({ size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      className={className}
      aria-hidden="true"
      data-testid="smarttime-icon"
    >
      <rect x="0" y="0" width="512" height="512" rx="120" fill="#FFCC00" />
      <circle cx="226" cy="236" r="150" stroke="#D40511" strokeWidth="34" fill="none" />
      <g fill="#D40511">
        <rect x="219" y="107" width="14" height="34" rx="7" />
        <rect x="219" y="331" width="14" height="34" rx="7" />
        <rect x="321" y="229" width="34" height="14" rx="7" />
        <rect x="97" y="229" width="34" height="14" rx="7" />
        <rect x="216" y="112" width="20" height="136" rx="10" />
        <rect x="216" y="150" width="20" height="96" rx="10" transform="rotate(120 226 236)" />
      </g>
      <circle cx="372" cy="378" r="112" fill="#FFCC00" />
      <circle cx="372" cy="378" r="96" fill="#D40511" />
      <g fill="#FFCC00">
        <rect x="324" y="366" width="96" height="24" rx="12" />
        <rect x="360" y="330" width="24" height="96" rx="12" />
      </g>
    </svg>
  );
}

export default function SmartTimeLogo({ size = 40, className = "", wordmarkClass = "", subtitle }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="smarttime-logo">
      <div className="shrink-0">
        <SmartTimeIcon size={size} />
      </div>
      <div className="min-w-0">
        <div className={`font-heading font-extrabold tracking-[-0.02em] leading-none ${wordmarkClass || "text-lg text-[#333333]"}`}>
          Smart<span className="text-[#D40511]">Time!</span>
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
