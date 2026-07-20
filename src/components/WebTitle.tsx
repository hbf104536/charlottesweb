const RING_RADII = [46, 78, 114, 154, 198];
const SPOKE_COUNT = 14;
const SPOKE_LENGTH = 210;

function jitter(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function ringPath(radius: number, cx: number, cy: number, segments: number, seedBase: number) {
  const points: string[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const wobble = 1 + (jitter(seedBase + i) - 0.5) * 0.05;
    const x = cx + Math.cos(angle) * radius * wobble;
    const y = cy + Math.sin(angle) * radius * wobble;
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

export default function WebTitle() {
  const cx = 300;
  const cy = 150;

  const spokes = Array.from({ length: SPOKE_COUNT }, (_, i) => {
    const angle = (i / SPOKE_COUNT) * Math.PI * 2;
    const x2 = cx + Math.cos(angle) * SPOKE_LENGTH;
    const y2 = cy + Math.sin(angle) * SPOKE_LENGTH;
    return { x1: cx, y1: cy, x2, y2 };
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.35em] text-slate-500">
        Charlotte&rsquo;s Web
      </p>
      <svg
        viewBox="0 0 600 300"
        className="mx-auto h-auto w-full"
        role="img"
        aria-label="America First"
      >
        <defs>
          <filter id="thread-wobble" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.09" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="silk-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g stroke="#7dd3fc" strokeWidth="0.6" opacity="0.28" filter="url(#thread-wobble)">
          {spokes.map((s, i) => (
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
          ))}
          {RING_RADII.map((r, i) => (
            <path key={r} d={ringPath(r, cx, cy, SPOKE_COUNT, i * 17 + 3)} fill="none" />
          ))}
        </g>

        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="52"
          fontWeight={700}
          letterSpacing="2"
          fill="#f8fafc"
          filter="url(#thread-wobble)"
          style={{ paintOrder: "stroke" }}
        >
          AMERICA
        </text>
        <text
          x={cx}
          y={cy + 68}
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="52"
          fontWeight={700}
          letterSpacing="6"
          fill="#f8fafc"
          filter="url(#thread-wobble)"
          style={{ paintOrder: "stroke" }}
        >
          FIRST
        </text>

        <g filter="url(#silk-glow)" opacity="0.5">
          <text x={cx} y={cy + 16} textAnchor="middle" fontFamily="Georgia, serif" fontSize="52" fontWeight={700} letterSpacing="2" fill="#7dd3fc" filter="url(#thread-wobble)">
            AMERICA
          </text>
          <text x={cx} y={cy + 68} textAnchor="middle" fontFamily="Georgia, serif" fontSize="52" fontWeight={700} letterSpacing="6" fill="#7dd3fc" filter="url(#thread-wobble)">
            FIRST
          </text>
        </g>
      </svg>
    </div>
  );
}
