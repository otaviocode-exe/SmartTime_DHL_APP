// Clean SVG recreation of the DHL wordmark (red on transparent).
// Bold italic "DHL" with the characteristic three speed lines.
export default function DhlLogo({ height = 24, className = "", color = "#D40511" }) {
  const width = Math.round(height * 3.9);
  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 132 34"
      fill="none"
      className={className}
      role="img"
      aria-label="DHL"
      data-testid="dhl-logo"
    >
      <g fill={color} transform="skewX(-13)">
        <rect x="6" y="7.4" width="21" height="3.4" rx="1.7" />
        <rect x="1" y="15.3" width="27" height="3.4" rx="1.7" />
        <rect x="6" y="23.2" width="21" height="3.4" rx="1.7" />
      </g>
      <text
        x="35"
        y="27.5"
        fontFamily="'Arial Black', Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="31"
        letterSpacing="-1.5"
        fill={color}
      >
        DHL
      </text>
    </svg>
  );
}
