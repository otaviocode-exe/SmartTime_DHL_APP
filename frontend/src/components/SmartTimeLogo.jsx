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
      <g transform="matrix(1,0,0,-1,0,512)">
        <path
          d="M402 274C402 364.5747 328.5747 438 238 438 147.4253 438 74 364.5747 74 274 74 183.4253 147.4253 110 238 110 328.5747 110 402 183.4253 402 274"
          fill="none"
          stroke="#D40511"
          strokeWidth="28"
        />
        <path d="M238 406V426" fill="none" stroke="#D40511" strokeWidth="18" strokeLinecap="round" />
        <path d="M238 122V142" fill="none" stroke="#D40511" strokeWidth="18" strokeLinecap="round" />
        <path d="M86 274H106" fill="none" stroke="#D40511" strokeWidth="18" strokeLinecap="round" />
        <path d="M370 274H390" fill="none" stroke="#D40511" strokeWidth="18" strokeLinecap="round" />
        <path d="M238 274V366" fill="none" stroke="#D40511" strokeWidth="26" strokeLinecap="round" />
        <path d="M238 274 311 216" fill="none" stroke="#D40511" strokeWidth="26" strokeLinecap="round" />
        <path
          d="M453 137C453 180.0782 418.0782 215 375 215 331.9218 215 297 180.0782 297 137 297 93.92179 331.9218 59 375 59 418.0782 59 453 93.92179 453 137"
          fill="#D40511"
          fillRule="evenodd"
        />
        <path d="M340 137H410" fill="none" stroke="#FFCC00" strokeWidth="24" strokeLinecap="round" />
        <path d="M375 102V172" fill="none" stroke="#FFCC00" strokeWidth="24" strokeLinecap="round" />
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
