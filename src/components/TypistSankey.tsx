/** Invented marketing split. Not BLS. */
const FLOWS = [
  {
    id: 'data',
    label: 'Data Admin',
    kicker: 'Systems, records, the database',
    share: 0.42,
    seats: '405k',
    pay: '$78k',
    fill: '#ff5a3d',
  },
  {
    id: 'word',
    label: 'Word processing',
    kicker: 'Documents, still',
    share: 0.23,
    seats: '222k',
    pay: '$48k',
    fill: '#e8dcc8',
  },
  {
    id: 'office',
    label: 'Office',
    kicker: 'The floor, the inbox, the calendar',
    share: 0.35,
    seats: '337k',
    pay: '$44k',
    fill: '#5ee0c8',
  },
] as const

const W = 1600
const H = 900
const SRC_X = 430
const DST_X = 1088
const BAR_W = 22
const SRC_Y = 248
const SRC_H = 428
const GAP = 52
const SLICE_GAP = 4
const RIBBON_X0 = SRC_X + BAR_W
const RIBBON_X1 = DST_X

function ribbon(y0: number, h0: number, y1: number, h1: number): string {
  const mx = (RIBBON_X0 + RIBBON_X1) / 2
  return [
    `M${RIBBON_X0},${y0}`,
    `C${mx},${y0} ${mx},${y1} ${RIBBON_X1},${y1}`,
    `L${RIBBON_X1},${y1 + h1}`,
    `C${mx},${y1 + h1} ${mx},${y0 + h0} ${RIBBON_X0},${y0 + h0}`,
    'Z',
  ].join(' ')
}

function layout() {
  const usable = SRC_H - SLICE_GAP * (FLOWS.length - 1)
  const heights = FLOWS.map((f) => f.share * usable)
  const rightH = heights.reduce((a, b) => a + b, 0) + GAP * (FLOWS.length - 1)
  let srcY = SRC_Y
  let dstY = SRC_Y - (rightH - SRC_H) / 2
  return FLOWS.map((flow, i) => {
    const h = heights[i]
    const row = { flow, srcY, dstY, h }
    srcY += h + SLICE_GAP
    dstY += h + GAP
    return row
  })
}

export function TypistSankey({ className }: { className?: string }) {
  const rows = layout()

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-labelledby="exhibit-a-title exhibit-a-desc"
      className={className}
    >
      <title id="exhibit-a-title">Don&apos;t study to be a typist</title>
      <desc id="exhibit-a-desc">
        Invented allocation of a vanished typist field: 42 percent Data Admin, 23
        percent word processing, 35 percent office.
      </desc>

      <rect width={W} height={H} fill="#080808" />
      <rect width={W} height={H} fill="url(#exhibit-a-grain)" opacity="0.45" />

      <defs>
        <filter id="exhibit-a-grain-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0.55 0"
          />
        </filter>
        <pattern
          id="exhibit-a-grain"
          patternUnits="userSpaceOnUse"
          width="1600"
          height="900"
        >
          <rect
            width="1600"
            height="900"
            filter="url(#exhibit-a-grain-filter)"
            fill="#fff"
          />
        </pattern>
        {rows.map(({ flow }) => (
          <linearGradient
            key={flow.id}
            id={`exhibit-a-flow-${flow.id}`}
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="0%" stopColor="#ff5a3d" stopOpacity="0.85" />
            <stop offset="55%" stopColor={flow.fill} stopOpacity="0.82" />
            <stop offset="100%" stopColor={flow.fill} stopOpacity="0.92" />
          </linearGradient>
        ))}
      </defs>

      <text
        x="80"
        y="72"
        fill="#f4f1ea"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="12"
        fontWeight="600"
        letterSpacing="0.28em"
      >
        EXHIBIT A
      </text>
      <text
        x="1520"
        y="72"
        fill="#9a9a9a"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="12"
        fontWeight="600"
        letterSpacing="0.28em"
        textAnchor="end"
      >
        ILLUSTRATION
      </text>
      <line x1="80" y1="92" x2="1520" y2="92" stroke="#2a2a2a" strokeWidth="1" />

      <text
        x="80"
        y="148"
        fill="#f4f1ea"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="48"
        fontWeight="700"
        letterSpacing="-0.04em"
      >
        Don&apos;t study to be a typist.
      </text>
      <text
        x="80"
        y="186"
        fill="#9a9a9a"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="18"
      >
        One dead clerical title. Three living desks.
      </text>

      {rows.map(({ flow, srcY, dstY, h }) => (
        <path
          key={flow.id}
          d={ribbon(srcY, h, dstY, h)}
          fill={`url(#exhibit-a-flow-${flow.id})`}
        />
      ))}

      <rect
        x={SRC_X}
        y={SRC_Y}
        width={BAR_W}
        height={SRC_H}
        fill="#ff5a3d"
        rx="1"
      />

      {rows.map(({ flow, dstY, h }) => (
        <rect
          key={flow.id}
          x={DST_X}
          y={dstY}
          width={BAR_W}
          height={h}
          fill={flow.fill}
          rx="1"
        />
      ))}

      <text
        x={SRC_X - 28}
        y={SRC_Y + SRC_H / 2 - 28}
        fill="#ff5a3d"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="13"
        fontWeight="600"
        letterSpacing="0.22em"
        textAnchor="end"
      >
        DEAD FIELD
      </text>
      <text
        x={SRC_X - 28}
        y={SRC_Y + SRC_H / 2 + 8}
        fill="#f4f1ea"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="44"
        fontWeight="700"
        letterSpacing="-0.04em"
        textAnchor="end"
      >
        Typist
      </text>
      <text
        x={SRC_X - 28}
        y={SRC_Y + SRC_H / 2 + 38}
        fill="#9a9a9a"
        fontFamily="JetBrains Mono, ui-monospace, monospace"
        fontSize="14"
        textAnchor="end"
      >
        1.0M seats at peak
      </text>
      <text
        x={SRC_X - 28}
        y={SRC_Y + SRC_H / 2 + 58}
        fill="#9a9a9a"
        fontFamily="JetBrains Mono, ui-monospace, monospace"
        fontSize="14"
        textAnchor="end"
      >
        36k remain
      </text>

      {rows.map(({ flow, dstY, h }) => {
        const cy = dstY + h / 2
        return (
          <g key={flow.id}>
            <text
              x={DST_X + BAR_W + 28}
              y={cy - 22}
              fill={flow.fill}
              fontFamily="JetBrains Mono, ui-monospace, monospace"
              fontSize="40"
              fontWeight="600"
            >
              {Math.round(flow.share * 100)}
              <tspan fontSize="18" fill="#9a9a9a">
                %
              </tspan>
            </text>
            <text
              x={DST_X + BAR_W + 118}
              y={cy - 22}
              fill="#f4f1ea"
              fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
              fontSize="22"
              fontWeight="600"
              letterSpacing="-0.03em"
            >
              {flow.label}
            </text>
            <text
              x={DST_X + BAR_W + 118}
              y={cy + 4}
              fill="#9a9a9a"
              fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
              fontSize="14"
            >
              {flow.kicker}
            </text>
            <text
              x={DST_X + BAR_W + 118}
              y={cy + 26}
              fill="#6e6e6e"
              fontFamily="JetBrains Mono, ui-monospace, monospace"
              fontSize="13"
            >
              {flow.seats} · {flow.pay} median
            </text>
          </g>
        )
      })}

      <line x1="80" y1="820" x2="1520" y2="820" stroke="#2a2a2a" strokeWidth="1" />
      <text
        x="80"
        y="854"
        fill="#6e6e6e"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="13"
      >
        A field does not disappear. It reallocates.
      </text>
      <text
        x="1520"
        y="854"
        fill="#6e6e6e"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="13"
        textAnchor="end"
      >
        dearCC · invented for the picture
      </text>
    </svg>
  )
}
