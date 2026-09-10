import { useEffect, useMemo, useState } from 'react'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { scaleSequential } from 'd3-scale'
import { feature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import { BrandMark } from './BrandMark'
import { assetUrl } from '../lib/assetUrl'
import { formatGrowth } from '../lib/format'

interface StateProps {
  name?: string
}

const FIPS_TO_ABBR: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
  '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
  '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY',
}

const NAME_TO_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA',
  Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI',
  Wyoming: 'WY',
}

/** Relative design-job density for the homepage exhibit. Not a live BLS extract. */
const DESIGN_JOBS: Record<string, number> = {
  CA: 1, TX: 0.92, NY: 0.55, FL: 0.42, IL: 0.4, WA: 0.38, CO: 0.32,
  GA: 0.28, PA: 0.26, MA: 0.24, VA: 0.22, NC: 0.2, AZ: 0.18, NJ: 0.16,
  OH: 0.14, MI: 0.12, MN: 0.12, OR: 0.14, MD: 0.1, UT: 0.1, TN: 0.08,
}

const GROWTH_SPARK = [0.35, 0.22, 0.48, 0.4, 0.55, 0.42, 0.78]
const PAY_SPARK = [0.18, 0.28, 0.4, 0.52, 0.62, 0.78, 0.92]
const GREEN = '#1f8a4c'

export function FieldReportEntryGraphic({ className }: { className?: string }) {
  return (
    <figure
      className={`overflow-hidden rounded-2xl bg-white text-[#111] ring-1 ring-black/10 shadow-[0_18px_50px_rgba(0,0,0,0.22)] ${className ?? ''}`}
    >
      <div className="px-5 pt-5 pb-4 sm:px-7 sm:pt-6 sm:pb-5">
        <BrandMark size="sm" variant="field" forceLight />
        <p className="mt-4 text-[15px] sm:text-base text-[#444]">
          Degree: <span className="font-semibold text-[#111]">Bachelor&apos;s degree, Marketing</span>
        </p>

        <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:gap-8 sm:items-center">
          <div>
            <MiniUsaMap />
            <p className="mt-2 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] text-[#8a8a8a]">
              Design jobs by state
            </p>
          </div>

          <div className="min-w-0">
            <span className="inline-block rounded bg-[#ff5a3d] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
              Recommended for you
            </span>
            <h2 className="mt-3 font-sans text-[1.65rem] sm:text-[1.85rem] font-bold tracking-tight leading-[1.15] text-[#111] text-balance">
              Web &amp; digital interface designers
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Metric
                label="Projected job growth"
                value={formatGrowth(6)}
                points={GROWTH_SPARK}
              />
              <Metric
                label="Entry pay"
                value={formatGrowth(7.3)}
                points={PAY_SPARK}
              />
            </div>
          </div>
        </div>
      </div>

      <figcaption className="border-t border-black/10 px-5 sm:px-7 py-3 text-[11px] text-[#8a8a8a]">
        BLS projections 2025 to 2035 · entry pay from OEWS 2025
      </figcaption>
    </figure>
  )
}

function Metric({
  label,
  value,
  points,
}: {
  label: string
  value: string
  points: number[]
}) {
  return (
    <div>
      <p className="text-[11px] text-[#8a8a8a] leading-snug">{label}</p>
      <p className="mt-1 font-sans text-2xl sm:text-[1.75rem] font-bold tabular-nums tracking-tight" style={{ color: GREEN }}>
        {value}
      </p>
      <Sparkline points={points} />
    </div>
  )
}

function Sparkline({ points }: { points: number[] }) {
  const w = 72
  const h = 22
  const pad = 2
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / (points.length - 1))
  const ys = points.map((p) => pad + (1 - p) * (h - pad * 2))
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1.5 block" aria-hidden>
      <path d={d} fill="none" stroke={GREEN} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function MiniUsaMap() {
  const [topo, setTopo] = useState<FeatureCollection<Geometry, StateProps> | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(assetUrl('us-states-topo.json'), {
        cache: import.meta.env.DEV ? 'no-cache' : 'force-cache',
      })
      const raw = (await res.json()) as Topology<{ states: GeometryCollection }>
      const obj = raw.objects.states ?? Object.values(raw.objects)[0]
      const fc = feature(raw, obj) as unknown as FeatureCollection<Geometry, StateProps>
      if (!cancelled) setTopo(fc)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const paths = useMemo(() => {
    if (!topo) return []
    const projection = geoAlbersUsa().fitSize([960, 560], topo)
    const path = geoPath(projection)
    return topo.features.map((f) => {
      const id = String(f.id ?? '')
      const abbr =
        FIPS_TO_ABBR[id.padStart(2, '0')] ||
        FIPS_TO_ABBR[id] ||
        NAME_TO_ABBR[f.properties?.name ?? ''] ||
        ''
      return { abbr, d: path(f) ?? '' }
    })
  }, [topo])

  const colorScale = useMemo(() => {
    const interpolator = (t: number) => {
      const from = [236, 236, 236]
      const to = [255, 90, 61]
      const r = Math.round(from[0] + t * (to[0] - from[0]))
      const g = Math.round(from[1] + t * (to[1] - from[1]))
      const b = Math.round(from[2] + t * (to[2] - from[2]))
      return `rgb(${r}, ${g}, ${b})`
    }
    return scaleSequential(interpolator).domain([0, 1])
  }, [])

  if (!topo) {
    return <div className="aspect-[960/560] w-full rounded-md bg-[#f3f3f3]" aria-hidden />
  }

  return (
    <svg viewBox="0 0 960 560" className="h-auto w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Design jobs by U.S. state">
      {paths.map((p) => {
        const v = DESIGN_JOBS[p.abbr] ?? 0
        return (
          <path
            key={p.abbr || p.d.slice(0, 24)}
            d={p.d}
            fill={v > 0 ? colorScale(v) : '#ececec'}
            stroke="#fff"
            strokeWidth={0.9}
          />
        )
      })}
    </svg>
  )
}
