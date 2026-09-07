import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { scaleSequential } from 'd3-scale'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { FeatureCollection, Geometry } from 'geojson'
import { useData } from '../data/DataContext'
import { BackLink } from '../components/BackLink'
import { DocumentMeta } from '../components/DocumentMeta'
import { InfoTip } from '../components/InfoTip'
import { ShareSheet } from '../components/ShareSheet'
import { formatNumber, formatSalary } from '../lib/format'
import { AI_BAND_COPY, aiBandFromScore } from '../lib/labels'
import { assetUrl } from '../lib/assetUrl'
import { isRealMajor } from '../lib/majorName'
import { useAppPaths } from '../lib/useAppPaths'
import { useTheme } from '../lib/theme'
import type { MapColorBy } from '../types'

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

export function MapPage() {
  const { socCode = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { majors, occupationsBySoc, stateData, loading, loadStateData } =
    useData()
  const { home, resultsBase } = useAppPaths()
  const { isDark } = useTheme()
  const [colorBy, setColorBy] = useState<MapColorBy>('employment')
  const [selected, setSelected] = useState<string | null>(null)
  const [topo, setTopo] = useState<FeatureCollection<Geometry, StateProps> | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const fromCip = searchParams.get('from') ?? ''
  const fromMajor =
    fromCip && isRealMajor(fromCip) ? majors.find((m) => m.cip === fromCip) : undefined
  const backToResults = fromMajor ? `${resultsBase}/${fromMajor.cip}` : home
  const backLabel = fromMajor
    ? `← Back to ${fromMajor.name}`
    : '← Back to search'
  const occupation = occupationsBySoc.get(socCode)

  useEffect(() => {
    void loadStateData()
  }, [loadStateData])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [socCode])

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

  const values = useMemo(() => {
    const map: Record<string, number> = {}
    if (!stateData || !occupation) return map
    const exposure = (occupation.karpathyExposure ?? 0) / 10
    for (const [abbr, state] of Object.entries(stateData)) {
      const cell = state.occupations[socCode]
      if (!cell) continue
      if (colorBy === 'employment') map[abbr] = cell.employment
      else if (colorBy === 'salary') map[abbr] = cell.medianSalary
      else map[abbr] = cell.employment * exposure
    }
    return map
  }, [stateData, occupation, socCode, colorBy])

  const colorScale = useMemo(() => {
    const nums = Object.values(values).filter((v) => v > 0)
    const min = nums.length ? Math.min(...nums) : 0
    const max = nums.length ? Math.max(...nums) : 1
    const from = isDark ? [42, 42, 42] : [226, 226, 226]
    const to = [255, 90, 61]
    const interpolator = (t: number) => {
      const r = Math.round(from[0] + t * (to[0] - from[0]))
      const g = Math.round(from[1] + t * (to[1] - from[1]))
      const b = Math.round(from[2] + t * (to[2] - from[2]))
      return `rgb(${r}, ${g}, ${b})`
    }
    return scaleSequential(interpolator).domain([min, max || 1])
  }, [values, colorBy, isDark])

  const paths = useMemo(() => {
    if (!topo) return []
    const projection = geoAlbersUsa().fitSize([960, 560], topo)
    const path = geoPath(projection)
    return topo.features.map((f) => {
      const id = String(f.id ?? '')
      const abbr =
        FIPS_TO_ABBR[id.padStart(2, '0')] ||
        FIPS_TO_ABBR[id] ||
        guessAbbr(f.properties?.name)
      const d = path(f) ?? ''
      return { abbr, name: f.properties?.name ?? abbr, d }
    })
  }, [topo])

  const ranked = useMemo(() => {
    return Object.entries(values)
      .map(([abbr, value]) => ({
        abbr,
        value,
        name: stateData?.[abbr]?.name ?? abbr,
        employment: stateData?.[abbr]?.occupations[socCode]?.employment ?? 0,
        salary: stateData?.[abbr]?.occupations[socCode]?.medianSalary ?? 0,
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [values, stateData, socCode])

  const rankByAbbr = useMemo(() => {
    const map = new Map<string, number>()
    ranked.forEach((r, i) => map.set(r.abbr, i + 1))
    return map
  }, [ranked])

  const activeAbbr = selected ?? hover
  const active = activeAbbr
    ? {
        abbr: activeAbbr,
        name: stateData?.[activeAbbr]?.name ?? activeAbbr,
        employment: stateData?.[activeAbbr]?.occupations[socCode]?.employment ?? 0,
        salary: stateData?.[activeAbbr]?.occupations[socCode]?.medianSalary ?? 0,
        value: values[activeAbbr] ?? 0,
        rank: rankByAbbr.get(activeAbbr) ?? 0,
      }
    : null

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-10 text-muted">Loading map data...</div>
  }

  if (!occupation) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <DocumentMeta title="Occupation not found" />
        <BackLink to={backToResults}>{backLabel}</BackLink>
        <h1 className="font-sans text-3xl font-bold tracking-tight text-ink">Occupation not found</h1>
      </div>
    )
  }

  const aiBand = aiBandFromScore(occupation.karpathyExposure)
  const aiTip =
    occupation.karpathyRationale ||
    AI_BAND_COPY[aiBand] ||
    'AI exposure is a 0–10 score for how much of this job LLMs can already do.'

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-2 pb-8 sm:pt-3 sm:pb-10">
      <DocumentMeta
        title={occupation.title}
        description={`State map for ${occupation.title} with BLS wages and AI exposure.`}
      />
      <div className="mb-2 flex items-center justify-between gap-3">
        <BackLink to={backToResults} compact>
          {backLabel}
        </BackLink>
        <div className="shrink-0 hidden sm:block">
          <ShareSheet
            quiet
            title={occupation.title}
            summary={`State map for ${occupation.title} with BLS wages and AI exposure, from dearCC Field report.`}
          />
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="font-sans text-xl sm:text-2xl font-bold text-ink tracking-tight text-balance min-w-0">
          {occupation.title}
          <span className="ml-2 align-middle font-mono text-xs font-normal uppercase tracking-wider text-muted">
            SOC {occupation.soc}
          </span>
        </h1>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex flex-1 lg:flex-none flex-nowrap items-center gap-2 text-sm overflow-x-auto overscroll-x-contain scrollbar-none">
            <span className="text-muted shrink-0">Color by:</span>
            {(
              [
                ['employment', 'Employment'],
                ['salary', 'Salary'],
                ['aiImpact', 'AI Impact'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setColorBy(key)}
                className={`shrink-0 rounded-lg px-3 py-2.5 sm:py-1.5 transition-colors min-h-11 sm:min-h-0 whitespace-nowrap ${
                  colorBy === key
                    ? 'bg-ink text-page'
                    : 'text-muted hover:text-ink bg-card border border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="shrink-0 sm:hidden">
            <ShareSheet
              quiet
              title={occupation.title}
              summary={`State map for ${occupation.title} with BLS wages and AI exposure, from dearCC Field report.`}
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-2 sm:p-3 overflow-hidden">
          {!stateData || !topo ? (
            <p className="text-muted py-16 text-center">Loading map data...</p>
          ) : (
            <div
              className="mx-auto w-full"
              style={{
                maxWidth: 'min(100%, calc((100dvh - 15.5rem) * 960 / 560))',
                aspectRatio: '960 / 560',
              }}
            >
              <svg
                viewBox="0 0 960 560"
                className="h-full w-full"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="US map"
              >
                {paths.map((p) => {
                  const v = values[p.abbr] ?? 0
                  const fill = v > 0 ? colorScale(v) : 'var(--color-border)'
                  const isActive = activeAbbr === p.abbr
                  return (
                    <path
                      key={p.abbr || p.name}
                      d={p.d}
                      fill={fill}
                      stroke={isActive ? 'var(--color-ink)' : 'var(--color-card)'}
                      strokeWidth={isActive ? 2 : 0.75}
                      className="cursor-pointer transition-[stroke-width] focus:outline-none focus-visible:stroke-ink"
                      role="button"
                      tabIndex={0}
                      aria-label={p.name}
                      onMouseEnter={() => setHover(p.abbr)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(p.abbr)}
                      onBlur={() => setHover(null)}
                      onClick={() => setSelected(p.abbr)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelected(p.abbr)
                        }
                      }}
                    >
                      <title>{p.name}</title>
                    </path>
                  )
                })}
              </svg>
            </div>
          )}
          <Legend colorBy={colorBy} values={Object.values(values).filter((v) => v > 0)} />
        </div>

        <aside
          className={`bg-card border border-border rounded-xl p-4 sm:p-5 h-fit ${
            active ? '' : 'hidden lg:block'
          }`}
        >
          {active ? (
            <StateDetail active={active} rankedCount={ranked.length} colorBy={colorBy} />
          ) : (
            <p className="text-muted text-sm leading-relaxed">
              Click a state to see employment and salary for{' '}
              {occupation.title.toLowerCase()}.
            </p>
          )}
        </aside>
      </div>

      <div className="lg:hidden mb-6">
        <label htmlFor="state-select" className="sr-only">
          Choose a state
        </label>
        <select
          id="state-select"
          className="w-full min-h-12 rounded-xl border border-border-bright bg-card px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-primary mb-3"
          value={selected ?? ''}
          onChange={(e) => setSelected(e.target.value || null)}
        >
          <option value="">Choose a state…</option>
          {ranked.map((r) => (
            <option key={r.abbr} value={r.abbr}>
              {r.name}
            </option>
          ))}
        </select>

        <ul className="rounded-xl border border-border bg-card divide-y divide-border max-h-[min(40dvh,14rem)] overflow-auto">
          {ranked.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted text-center">
              {!stateData ? 'Loading state data…' : 'No state data for this occupation.'}
            </li>
          ) : (
            ranked.map((r, i) => {
              const isActive = selected === r.abbr
              return (
                <li key={r.abbr}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.abbr)}
                    className={`w-full text-left px-4 py-3 min-h-11 flex items-center justify-between gap-3 transition-colors ${
                      isActive ? 'bg-primary/10' : 'hover:bg-surface'
                    }`}
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-xs font-mono text-muted mr-2">#{i + 1}</span>
                      <span className="font-medium text-ink">{r.name}</span>
                    </span>
                    <span className="shrink-0 font-mono text-sm text-ink/80 tabular-nums">
                      {colorBy === 'salary'
                        ? formatSalary(r.salary)
                        : colorBy === 'aiImpact'
                          ? formatNumber(r.value)
                          : formatNumber(r.employment)}
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2.5 sm:gap-4 text-sm w-full mb-6">
        <Metric label="Entry Salary" value={formatSalary(occupation.entrySalary)} />
        <Metric label="Median Salary" value={formatSalary(occupation.medianSalary)} />
        <Metric label="Total Employment" value={formatNumber(occupation.totalEmployment)} />
        <Metric label="Annual Openings" value={formatNumber(occupation.openPositions)} />
        <Metric
          label="AI exposure"
          value={
            occupation.karpathyExposure != null ? `${occupation.karpathyExposure}/10` : '—'
          }
          tip={aiTip}
        />
      </div>
    </div>
  )
}

function StateDetail({
  active,
  rankedCount,
  colorBy,
}: {
  active: {
    name: string
    employment: number
    salary: number
    value: number
    rank: number
  }
  rankedCount: number
  colorBy: MapColorBy
}) {
  return (
    <>
      <h2 className="font-sans text-2xl font-semibold text-ink">{active.name}</h2>
      <p className="text-xs text-muted font-mono mt-1">
        #{active.rank || '—'} of {rankedCount || '—'}
      </p>
      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="text-muted">Employment</dt>
          <dd className="font-mono text-lg text-ink mt-0.5">
            {formatNumber(active.employment)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Median salary</dt>
          <dd className="font-mono text-lg text-ink mt-0.5">
            {formatSalary(active.salary)}
          </dd>
        </div>
        {colorBy === 'aiImpact' && (
          <div>
            <dt className="text-muted">AI impact</dt>
            <dd className="font-mono text-lg text-ink mt-0.5">
              {formatNumber(active.value)}
            </dd>
            <p className="text-xs text-muted mt-1">state employment × AI exposure / 10</p>
          </div>
        )}
      </dl>
    </>
  )
}

function Metric({
  label,
  value,
  tip,
}: {
  label: string
  value: string
  tip?: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl px-3 sm:px-4 py-3 min-w-0 sm:min-w-[120px] flex-1 sm:flex-none">
      <div className="text-xs text-muted uppercase tracking-wider leading-snug inline-flex items-center min-w-0 max-w-full">
        <span className="truncate">{label}</span>
        {tip && <InfoTip label={label}>{tip}</InfoTip>}
      </div>
      <div className="font-mono text-ink mt-1 text-sm sm:text-base tabular-nums break-words">
        {value}
      </div>
    </div>
  )
}

function Legend({ colorBy, values }: { colorBy: MapColorBy; values: number[] }) {
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const label =
    colorBy === 'salary'
      ? 'Median Salary'
      : colorBy === 'aiImpact'
        ? 'Jobs at AI risk'
        : 'Employment'

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
      <span className="shrink-0">{label}</span>
      <div
        className="h-2 flex-1 min-w-[6rem] max-w-48 rounded-sm"
        style={{
          background: 'linear-gradient(90deg, var(--color-border), var(--color-coral))',
        }}
      />
      <span className="font-mono text-xs tabular-nums">
        {colorBy === 'salary' ? formatSalary(min) : formatNumber(min)} –{' '}
        {colorBy === 'salary' ? formatSalary(max) : formatNumber(max)}
      </span>
    </div>
  )
}

function guessAbbr(name?: string): string {
  if (!name) return ''
  return NAME_TO_ABBR[name] ?? ''
}
