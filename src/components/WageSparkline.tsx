import {
  formatGrowth,
  formatNumber,
  formatSalary,
  formatSignedCompactCount,
} from '../lib/format'
import type { EntryWageTrend } from '../types'
import { HoverTip } from './HoverTip'

const COLOR = {
  up: '#2fbf71',
  down: '#ff5a3d',
  flat: '#8a8a8a',
} as const

const W = 56
const H = 18
const PAD = 3
const R = 1.6
/** 20% real change fills the vertical range. */
const FULL_SWING = 0.2

function SparkSvg({ trend }: { trend: EntryWageTrend }) {
  const x0 = PAD
  const x1 = W - PAD
  const mid = H / 2
  const usable = (H - PAD * 2) / 2
  const dy = Math.max(-1, Math.min(1, trend.realChg / FULL_SWING)) * usable
  const y0 = mid + dy * 0.45
  const y1 = mid - dy
  const cx = (x0 + x1) / 2
  const d = `M ${x0} ${y0} C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`
  const color = COLOR[trend.arrow]

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx={x0} cy={y0} r={R} fill={color} />
      <circle cx={x1} cy={y1} r={R} fill={color} />
    </svg>
  )
}

export function JobsArrow({
  now,
  later,
}: {
  now: number
  later: number
}) {
  if (!(now > 0) && !(later > 0)) return null
  const chg = now > 0 ? (later - now) / now : 0
  const arrow: 'up' | 'down' | 'flat' = chg > 0.015 ? 'up' : chg < -0.015 ? 'down' : 'flat'
  const color = COLOR[arrow]
  const mark = arrow === 'up' ? '↗' : arrow === 'down' ? '↘' : '→'
  const delta = later - now
  const label =
    arrow === 'up'
      ? 'Linked employment is projected to rise'
      : arrow === 'down'
        ? 'Linked employment is projected to fall'
        : 'Linked employment is projected to stay roughly flat'

  return (
    <HoverTip
      maxWidth={260}
      content={
        <div>
          <p className="text-xs font-medium text-ink mb-1">{label}</p>
          <p className="text-xs text-ink font-mono tabular-nums">
            {formatNumber(Math.round(now))} → {formatNumber(Math.round(later))}
          </p>
          <p className="text-xs text-muted mt-1.5 leading-relaxed">
            {formatSignedCompactCount(delta)} jobs by 2034. BLS employment × projected growth,
            summed across linked occupations.
          </p>
        </div>
      }
    >
      <span
        role="img"
        aria-label={`${label}. ${formatNumber(Math.round(now))} to ${formatNumber(Math.round(later))} by 2034, ${formatSignedCompactCount(delta)} jobs.`}
        className="inline-flex shrink-0 cursor-help text-3xl sm:text-4xl leading-none font-medium"
        style={{ color }}
      >
        {mark}
      </span>
    </HoverTip>
  )
}

export function WageSparkline({
  trend,
  align = 'end',
}: {
  trend?: EntryWageTrend
  align?: 'end' | 'start'
}) {
  if (!trend) return null

  const realPct = formatGrowth(trend.realChg * 100)
  const nominalPct = formatGrowth(trend.nominalChg * 100)
  const label =
    trend.arrow === 'up'
      ? 'Entry wage rose after inflation'
      : trend.arrow === 'down'
        ? 'Entry wage fell after inflation'
        : 'Entry wage was roughly flat after inflation'

  return (
    <HoverTip
      maxWidth={260}
      content={
        <div>
          <p className="text-xs font-medium text-ink mb-1">{label}</p>
          <p className="text-xs text-ink font-mono tabular-nums">
            {formatSalary(trend.wage2021)} → {formatSalary(trend.wage2025)}
          </p>
          <p className="text-xs text-muted mt-1.5 leading-relaxed">
            Inflation-adjusted {realPct} from 2021 to 2025. Nominal {nominalPct}.
            BLS OEWS 25th percentile.
          </p>
        </div>
      }
    >
      <span
        role="img"
        aria-label={`${label}. ${formatSalary(trend.wage2021)} to ${formatSalary(trend.wage2025)}, inflation-adjusted ${realPct}.`}
        className={`mt-1 inline-flex cursor-help ${align === 'start' ? '' : 'ml-auto'}`}
      >
        <SparkSvg trend={trend} />
      </span>
    </HoverTip>
  )
}
