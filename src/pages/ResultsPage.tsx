import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { DocumentMeta } from '../components/DocumentMeta'
import { HoverTip } from '../components/HoverTip'
import { MajorSearch } from '../components/MajorSearch'
import { WageSparkline } from '../components/WageSparkline'
import {
  formatCompactCount,
  formatGrowth,
  formatNumber,
  formatRatio,
  formatSalary,
  formatSalaryK,
  formatShare,
  sentenceCase,
} from '../lib/format'
import {
  AI_BAND_LIVE_COLORS,
  AI_BAND_LIVE_COPY,
  AI_FLAG_LABEL,
  AOI_ATTRIBUTION,
  COMPETITION_COPY,
  COMPETITION_DOT,
  competitionLevelFromRatio,
  ENTRY_BARRIER_COPY,
  ENTRY_BARRIER_DOT,
  entryBarrierLevel,
  SEVERITY_LEGEND,
  aiBandLive,
} from '../lib/labels'
import { isRealMajor, majorDisplayName } from '../lib/majorName'
import { newPathSocs, pathForCip, traditionalEntry } from '../lib/unobviousPaths'
import { QuietEmailForm, useLetterSubscribe } from '../components/DigestSignup'
import { useAppPaths } from '../lib/useAppPaths'
import type {
  AiImpactScore,
  EntryWageTrend,
  Occupation,
  SortDirection,
  SortField,
  UnobviousPath,
} from '../types'

type TableSort = Extract<
  SortField,
  | 'title'
  | 'entrySalary'
  | 'openPositions'
  | 'graduatesPerOpening'
  | 'karpathyExposure'
  | 'entryBarrier'
>

const SORT_CHIPS: { field: Exclude<TableSort, 'title'>; label: string }[] = [
  { field: 'entrySalary', label: 'Entry salary' },
  { field: 'openPositions', label: 'Openings' },
  { field: 'graduatesPerOpening', label: 'Competition' },
  { field: 'karpathyExposure', label: 'AI exposure' },
  { field: 'entryBarrier', label: 'Entry barrier' },
]

const COLUMNS: {
  field: TableSort
  label: string
  className?: string
  why?: string
}[] = [
  { field: 'title', label: 'Occupation' },
  {
    field: 'entrySalary',
    label: 'Entry salary',
    className: 'text-right',
    why: '25th percentile wage from BLS May 2024 OEWS. Median wage is shown underneath.',
  },
  {
    field: 'openPositions',
    label: 'Openings',
    className: 'text-right',
    why: 'Annual job openings from BLS — includes both new positions and replacements for workers who retire or change careers. The sparkline is the inflation-adjusted entry wage from 2021 to 2025.',
  },
  {
    field: 'graduatesPerOpening',
    label: 'Competition',
    className: 'text-left',
    why: 'Annual degree graduates entering this field divided by annual openings. Lower = easier job market.',
  },
  {
    field: 'karpathyExposure',
    label: 'AI exposure',
    className: 'text-left',
    why: 'Karpathy Digital AI Exposure score (0–10), LLM-scored in 2025. Hover individual rows for the full rationale.',
  },
  {
    field: 'entryBarrier',
    label: 'Entry barrier',
    className: 'text-left',
    why: ENTRY_BARRIER_COPY,
  },
]

const GAMEPLAN_URL = 'https://gameplan.dearcc.org/'

function gameplanHref(roles: readonly string[]): string {
  const list = roles.map((r) => r.trim()).filter(Boolean)
  if (!list.length) return GAMEPLAN_URL
  const params = new URLSearchParams()
  params.set('roles', list.join(','))
  return `${GAMEPLAN_URL}?${params.toString()}`
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full max-w-[4.5rem] bg-inset rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
      />
    </div>
  )
}

function competitionFill(ratio: number | null): number {
  if (ratio == null) return 0
  return Math.min(100, (ratio / 6) * 100)
}

export function ResultsPage() {
  const { cipCode = '' } = useParams()
  const {
    majors,
    occupations,
    occupationsBySoc,
    crosswalk,
    eloundouBySoc,
    aiImpactBySoc,
    wageTrendBySoc,
    unobviousByCip,
    unobviousByCip4,
    unobviousByCip2,
    loading,
  } = useData()
  const { home, mapBase, resultsBase } = useAppPaths()

  const [showAll, setShowAll] = useState(false)
  const [sortField, setSortField] = useState<TableSort>('entrySalary')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedSocs, setSelectedSocs] = useState<Set<string>>(() => new Set())
  const [selectingJobs, setSelectingJobs] = useState(false)

  useEffect(() => {
    setShowAll(false)
    setSortField('entrySalary')
    setSortDirection('desc')
    setSelectedSocs(new Set())
    setSelectingJobs(false)
  }, [cipCode])

  const major = useMemo(() => {
    if (!isRealMajor(cipCode)) return undefined
    return majors.find((m) => m.cip === cipCode)
  }, [majors, cipCode])

  const newPath = useMemo(
    () => pathForCip(cipCode, unobviousByCip4, unobviousByCip2, unobviousByCip),
    [cipCode, unobviousByCip, unobviousByCip4, unobviousByCip2],
  )
  const traditional = useMemo(() => {
    if (!newPath) return undefined
    return traditionalEntry(
      newPath,
      cipCode,
      major?.name,
      crosswalk,
      occupationsBySoc,
    )
  }, [newPath, cipCode, major, crosswalk, occupationsBySoc])
  const altSocs = useMemo(() => newPathSocs(newPath), [newPath])
  const altOccs = useMemo(() => {
    const list: Occupation[] = []
    const seen = new Set<string>()
    for (const job of newPath?.jobs ?? []) {
      if (!job.soc || seen.has(job.soc)) continue
      const occ = occupationsBySoc.get(job.soc)
      if (occ) {
        seen.add(job.soc)
        list.push(occ)
      }
    }
    return list
  }, [newPath, occupationsBySoc])

  const { relevant, other } = useMemo(() => {
    const entry = crosswalk[cipCode]
    if (!occupations.length || !entry) {
      return { relevant: [] as Occupation[], other: occupations }
    }
    const linked = new Set([...entry.primary, ...entry.related])
    const primary = new Set(entry.primary)
    const rel: Occupation[] = []
    const rest: Occupation[] = []
    for (const occ of occupations) {
      if (linked.has(occ.soc)) rel.push(occ)
      else rest.push(occ)
    }
    rel.sort((a, b) => {
      const ap = primary.has(a.soc) ? 0 : 1
      const bp = primary.has(b.soc) ? 0 : 1
      return ap === bp ? b.entrySalary - a.entrySalary : ap - bp
    })
    return { relevant: rel, other: rest }
  }, [occupations, cipCode, crosswalk])

  const visible = useMemo(() => {
    const base = showAll ? [...relevant, ...other] : relevant
    const extras = altOccs.filter((o) => !base.some((b) => b.soc === o.soc))
    return [...extras, ...base]
  }, [showAll, relevant, other, altOccs])

  const sorted = useMemo(() => {
    const list = [...visible]
    list.sort((a, b) => {
      const ap = altSocs.has(a.soc) ? 0 : 1
      const bp = altSocs.has(b.soc) ? 0 : 1
      if (ap !== bp) return ap - bp
      const av = sortValue(a, sortField, aiImpactBySoc, wageTrendBySoc)
      const bv = sortValue(b, sortField, aiImpactBySoc, wageTrendBySoc)
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      const an = typeof av === 'number' ? av : Number.NEGATIVE_INFINITY
      const bn = typeof bv === 'number' ? bv : Number.NEGATIVE_INFINITY
      return sortDirection === 'asc' ? an - bn : bn - an
    })
    return list
  }, [visible, sortField, sortDirection, aiImpactBySoc, wageTrendBySoc, altSocs])

  const selectedRoles = useMemo(
    () => sorted.filter((o) => selectedSocs.has(o.soc)).map((o) => sentenceCase(o.title)),
    [sorted, selectedSocs],
  )

  function toggleSoc(soc: string) {
    setSelectedSocs((prev) => {
      const next = new Set(prev)
      if (next.has(soc)) next.delete(soc)
      else next.add(soc)
      return next
    })
  }

  function toggleAllVisible() {
    setSelectedSocs((prev) => {
      const allOn = sorted.length > 0 && sorted.every((o) => prev.has(o.soc))
      const next = new Set(prev)
      if (allOn) {
        for (const o of sorted) next.delete(o.soc)
      } else {
        for (const o of sorted) next.add(o.soc)
      }
      return next
    })
  }

  const stats = useMemo(() => {
    if (!relevant.length) return null
    const avgSalary = relevant.reduce((s, o) => s + o.entrySalary, 0) / relevant.length
    const totalOpenings = relevant.reduce((s, o) => s + o.openPositions, 0)
    const growthVals = relevant
      .map((o) => o.projectedGrowthRate)
      .filter((v): v is number => v != null && !Number.isNaN(v))
    const avgGrowth =
      growthVals.length > 0 ? growthVals.reduce((s, v) => s + v, 0) / growthVals.length : 0
    const aiVals = relevant
      .map((o) => o.karpathyExposure)
      .filter((v): v is number => v != null && !Number.isNaN(v))
    const avgAi = aiVals.length > 0 ? aiVals.reduce((s, v) => s + v, 0) / aiVals.length : 0
    const withComp = relevant.filter((o) => o.graduatesPerOpening != null)
    const weight = withComp.reduce((s, o) => s + o.openPositions, 0)
    const avgCompetition =
      weight > 0
        ? withComp.reduce((s, o) => s + (o.graduatesPerOpening || 0) * o.openPositions, 0) /
          weight
        : null
    const eloundouVals = relevant
      .map((o) => eloundouBySoc.get(o.soc)?.gptBeta)
      .filter((v): v is number => v != null && !Number.isNaN(v))
    const avgEloundou =
      eloundouVals.length > 0
        ? eloundouVals.reduce((s, v) => s + v, 0) / eloundouVals.length
        : null
    return { avgSalary, totalOpenings, avgGrowth, avgAi, avgCompetition, avgEloundou }
  }, [relevant, eloundouBySoc])

  function onSort(field: TableSort) {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection(field === 'title' ? 'asc' : 'desc')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted animate-pulse">Loading data...</div>
      </div>
    )
  }

  const displayName = major ? majorDisplayName(major.name) : cipCode
  const mapFrom = major ? `?from=${encodeURIComponent(major.cip)}` : ''

  return (
    <div className={selectedRoles.length > 0 ? 'pb-28' : ''}>
      <DocumentMeta
        title={displayName}
        description={`BLS salaries, openings, AI-exposure, and Eloundou β (LLM task exposure) for careers linked to ${displayName}.`}
      />

      <section className="results-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div className="min-w-0">
              <Link
                to={home}
                className="text-sm text-muted hover:text-ink mb-1 inline-flex items-center min-h-11 py-2"
              >
                ← Back
              </Link>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-ink text-balance">
                The job market for {displayName}
              </h1>
              <p className="text-sm text-muted mt-2 font-mono">
                CIP {cipCode}
                {major ? ` · ${major.category}` : ''}
              </p>
            </div>
            <div className="w-full sm:w-72 lg:w-80 shrink-0 sm:pt-10">
              <MajorSearch
                majors={majors}
                size="md"
                resultsBase={resultsBase}
                placeholder="Search your major"
                tone="dark"
              />
            </div>
          </div>

          {stats && <TldrCard majorName={displayName} stats={stats} />}

          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard
                label="Projected openings"
                value={formatCompactCount(stats.totalOpenings)}
                mark={stats.avgGrowth > 0 ? '▲' : stats.avgGrowth < 0 ? '▼' : undefined}
                sublabel={`per year · employment ${formatGrowth(stats.avgGrowth)} by 2034`}
              />
              <MetricCard
                label="Entry salary"
                value={formatSalaryK(stats.avgSalary)}
                mark="→"
                sublabel="25th percentile · BLS, averaged"
              />
              <MetricCard
                label="Competition"
                value={
                  stats.avgCompetition == null ? 'N/A' : `${stats.avgCompetition.toFixed(1)}×`
                }
                sublabel="grads per opening, weighted"
              />
              <MetricCard
                label="Eloundou β"
                value={stats.avgEloundou == null ? '—' : formatShare(stats.avgEloundou)}
                sublabel="LLM task exposure, GPT-4"
              />
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {newPath ? (
        <NewPathStrip
          path={newPath}
          traditional={traditional ?? newPath.not}
          majorName={displayName}
          occupationsBySoc={occupationsBySoc}
          selectedSocs={selectedSocs}
          onToggleSoc={(soc) => {
            setSelectingJobs(true)
            toggleSoc(soc)
          }}
        />
      ) : null}

      <GameplanCta
        title={displayName}
        selectedRoles={selectedRoles}
        sourceRef={cipCode ? `report:${cipCode}` : 'report'}
        onStartSelecting={() => setSelectingJobs(true)}
      />

      <OccupationTable
        occupations={sorted}
        relevantSocs={new Set(relevant.map((o) => o.soc))}
        newPathSocs={altSocs}
        mapBase={mapBase}
        mapFrom={mapFrom}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
        aiImpactBySoc={aiImpactBySoc}
        wageTrendBySoc={wageTrendBySoc}
        selectedSocs={selectedSocs}
        onToggleSoc={toggleSoc}
        onToggleAll={toggleAllVisible}
        selecting={selectingJobs}
      />

      {!showAll && other.length > 0 ? (
        <p className="mt-6">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-sm font-medium text-ink underline underline-offset-2 hover:text-primary"
          >
            Browse all {relevant.length + other.length} occupations →
          </button>
        </p>
      ) : showAll ? (
        <p className="mt-6">
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="text-sm font-medium text-ink underline underline-offset-2 hover:text-primary"
          >
            Show linked occupations only
          </button>
        </p>
      ) : null}

      <SeverityLegend />
      <ColumnDefinitions />
      </div>
    </div>
  )
}

function KeepBeta({ children }: { children: string }) {
  if (!children.includes('β')) return children
  const parts = children.split('β')
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? <span className="normal-case">β</span> : null}
        </span>
      ))}
    </>
  )
}

function MetricCard({
  label,
  value,
  sublabel,
  mark,
}: {
  label: string
  value: string
  sublabel?: string
  mark?: string
}) {
  return (
    <div className="border border-border rounded-lg p-3 sm:p-5 min-w-0">
      <div className="text-[10px] sm:text-xs text-muted font-medium uppercase tracking-wider mb-1.5 sm:mb-2 leading-tight">
        <KeepBeta>{label}</KeepBeta>
      </div>
      <div className="flex items-baseline gap-1.5">
        <div className="text-xl sm:text-3xl font-bold font-mono tabular-nums text-ink">{value}</div>
        {mark ? (
          <span className="text-sm text-muted font-mono" aria-hidden>
            {mark}
          </span>
        ) : null}
      </div>
      {sublabel && <div className="text-[11px] sm:text-xs text-muted mt-1 leading-snug">{sublabel}</div>}
    </div>
  )
}

function TldrStat({ className, children }: { className: string; children: ReactNode }) {
  return (
    <strong className={`font-bold text-[1.4em] leading-none sm:whitespace-nowrap ${className}`}>
      {children}
    </strong>
  )
}

function TldrCard({
  majorName,
  stats,
}: {
  majorName: string
  stats: {
    avgSalary: number
    totalOpenings: number
    avgGrowth: number
    avgAi: number
    avgCompetition: number | null
    avgEloundou: number | null
  }
}) {
  const name = majorName.replace(/,\s*general$/i, '')
  const ratio = stats.avgCompetition
  const growth = stats.avgGrowth
  const ai = stats.avgAi
  const aiLabel = `${Math.round(ai * 10) / 10}/10`

  const competition =
    ratio == null ? (
      <>grads per opening isn't available</>
    ) : ratio < 0.05 ? (
      <>
        far more openings than grads (
        <TldrStat className="text-ink">{ratio.toFixed(2)}×</TldrStat>)
      </>
    ) : ratio < 1 ? (
      <>
        demand exceeds supply at{' '}
        <TldrStat className="text-ink">{ratio.toFixed(1)}×</TldrStat> grads per opening
      </>
    ) : ratio < 1.5 ? (
      <>
        roughly in balance at <TldrStat className="text-ink">{ratio.toFixed(1)}×</TldrStat>{' '}
        grads per opening
      </>
    ) : ratio < 3 ? (
      <>
        competitive at <TldrStat className="text-ink">{ratio.toFixed(1)}×</TldrStat> grads
        per opening
      </>
    ) : (
      <>
        supply is tight at <TldrStat className="text-ink">{ratio.toFixed(1)}×</TldrStat>{' '}
        grads per opening
      </>
    )

  const growthBit =
    growth >= 2 ? (
      <>
        Projected <TldrStat className="text-ink">{formatGrowth(growth)}</TldrStat> by 2034
      </>
    ) : growth >= 0 ? (
      <>
        Projected roughly flat (
        <TldrStat className="text-ink">{formatGrowth(growth)}</TldrStat>)
      </>
    ) : (
      <>
        Projected <TldrStat className="text-ink">{formatGrowth(growth)}</TldrStat> by 2034
      </>
    )

  const aiWord = ai <= 3 ? 'low' : ai <= 5.5 ? 'moderate' : ai <= 7.5 ? 'high' : 'very high'
  const aiBit = (
    <>
      AI threat {aiWord} at <TldrStat className="text-ink">{aiLabel}</TldrStat>
    </>
  )

  const beta = stats.avgEloundou
  const betaLabel = beta == null ? null : formatShare(beta)
  const eloundouBit =
    beta == null || betaLabel == null ? null : (
      <>
        Eloundou β <TldrStat className="text-ink">{betaLabel}</TldrStat>
      </>
    )

  const goods = [
    ratio != null && ratio < 1.5,
    growth >= 2,
    ai <= 4,
    beta != null && beta < 0.25,
  ].filter(Boolean).length
  const bads = [ratio != null && ratio >= 3, growth < 0, ai > 7, beta != null && beta >= 0.65].filter(
    Boolean,
  ).length
  const verdict = goods >= 2 && bads === 0 ? 'Favorable' : bads >= 2 ? 'Not favorable' : 'Mixed'

  return (
    <div className="mb-8 max-w-4xl">
      <p className="text-base sm:text-lg text-ink leading-[1.7]">
        <strong className="font-bold">{verdict}</strong>. {growthBit}. {aiBit}
        {eloundouBit ? <>; {eloundouBit}</> : null}. {name} grads start around{' '}
        <TldrStat className="text-ink">{formatSalaryK(stats.avgSalary)}</TldrStat>. About{' '}
        <TldrStat className="text-ink">{formatCompactCount(stats.totalOpenings)}</TldrStat>{' '}
        openings a year among linked jobs; {competition}.
      </p>
    </div>
  )
}

function EmailReportAction({
  open,
  onOpen,
  idPrefix,
  subscribe,
  autoFocus = false,
}: {
  open: boolean
  onOpen: () => void
  idPrefix: string
  subscribe: ReturnType<typeof useLetterSubscribe>
  autoFocus?: boolean
}) {
  if (open) {
    return <QuietEmailForm idPrefix={idPrefix} autoFocus={autoFocus} {...subscribe} />
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-sm text-muted underline underline-offset-2 hover:text-ink min-h-11 inline-flex items-center bg-transparent border-0 p-0 cursor-pointer"
    >
      Not yet, just email me this report
    </button>
  )
}

function GameplanCta({
  title,
  selectedRoles,
  sourceRef,
  onStartSelecting,
}: {
  title: string
  selectedRoles: string[]
  sourceRef: string
  onStartSelecting: () => void
}) {
  const count = selectedRoles.length
  const planHref = count > 0 ? gameplanHref(selectedRoles) : ''
  const inFlowRef = useRef<HTMLDivElement>(null)
  const [docked, setDocked] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const subscribe = useLetterSubscribe({
    industry: title,
    role: selectedRoles[0] ?? title,
    focusAreas: selectedRoles.length ? selectedRoles : [title],
    sourceRef,
    mailReport: true,
  })

  useEffect(() => {
    if (count === 0) {
      setDocked(false)
      return
    }
    const el = inFlowRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setDocked(!entry.isIntersecting),
      { rootMargin: '-72px 0px 0px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [count])

  return (
    <section className="mb-8 max-w-3xl">
      <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-ink text-balance">
        Map your path into the jobs you want
      </h2>
      <p className="mt-3 text-base sm:text-lg text-muted leading-relaxed">
        Choose one or more occupations below to analyze your fit and generate a
        game plan for your job search.
      </p>
      <div
        ref={inFlowRef}
        className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5"
      >
        {emailOpen ? (
          <>
            {count > 0 ? <AnalyzeFitButton href={planHref} count={count} /> : null}
            <QuietEmailForm idPrefix="cta-inline" autoFocus={!docked} {...subscribe} />
          </>
        ) : (
          <>
            {count > 0 ? (
              <AnalyzeFitButton href={planHref} count={count} />
            ) : (
              <button
                type="button"
                onClick={onStartSelecting}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 min-h-11 text-sm font-bold text-black hover:brightness-110"
              >
                Select target jobs →
              </button>
            )}
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              className="text-sm text-muted underline underline-offset-2 hover:text-ink min-h-11 inline-flex items-center bg-transparent border-0 p-0 cursor-pointer"
            >
              Not yet, just email me this report
            </button>
          </>
        )}
      </div>
      {count > 0 && docked ? (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-page/95 backdrop-blur-sm pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <AnalyzeFitButton href={planHref} count={count} />
            <EmailReportAction
              open={emailOpen}
              onOpen={() => setEmailOpen(true)}
              idPrefix="cta-dock"
              autoFocus={docked}
              subscribe={subscribe}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}

function NewPathStrip({
  path,
  traditional,
  majorName,
  occupationsBySoc,
  selectedSocs,
  onToggleSoc,
}: {
  path: UnobviousPath
  traditional: string
  majorName: string
  occupationsBySoc: Map<string, Occupation>
  selectedSocs: Set<string>
  onToggleSoc: (soc: string) => void
}) {
  return (
    <section className="mb-8 max-w-4xl">
      <p className="text-[11px] font-mono uppercase tracking-wider text-ink">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 align-middle" aria-hidden />
        New path
      </p>
      <h2 className="mt-1 text-2xl sm:text-4xl font-bold tracking-tight text-ink text-balance">
        Traditional entry: {traditional}
      </h2>
      <p className="mt-3 text-base sm:text-lg text-muted leading-relaxed">
        Three other doors a {majorName} grad can walk through. Not the usual first
        job.
      </p>
      <ul className="mt-5 grid gap-3 md:grid-cols-3">
        {path.jobs.map((job) => {
          const occ = job.soc ? occupationsBySoc.get(job.soc) : undefined
          const selected = Boolean(job.soc && selectedSocs.has(job.soc))
          return (
            <li key={job.title}>
              {occ && job.soc ? (
                <button
                  type="button"
                  onClick={() => {
                    onToggleSoc(job.soc as string)
                    document.getElementById('occupations')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                  }}
                  className={`w-full h-full text-left rounded-lg border px-4 py-4 min-h-12 ${
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-ink'
                  }`}
                >
                  <NewPathBadge />
                  <p className="mt-2 font-medium text-ink leading-snug">{job.title}</p>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{job.why}</p>
                  <p className="mt-3 font-mono text-sm tabular-nums text-ink">
                    {formatSalaryK(occ.entrySalary)} entry
                    <span className="text-muted">
                      {' '}
                      · {formatCompactCount(occ.openPositions)} openings
                    </span>
                  </p>
                </button>
              ) : (
                <div className="h-full rounded-lg border border-border px-4 py-4">
                  <NewPathBadge />
                  <p className="mt-2 font-medium text-ink leading-snug">{job.title}</p>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{job.why}</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function NewPathBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink">
      <span className="block w-1.5 h-1.5 rounded-full bg-primary" aria-hidden />
      New
    </span>
  )
}

function AnalyzeFitButton({ href, count }: { href: string; count: number }) {
  return (
    <a
      href={href || undefined}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 min-h-11 text-sm font-bold text-black no-underline hover:brightness-110"
    >
      Analyze my fit
      <span className="inline-flex items-center gap-1 rounded-full bg-black text-white text-xs font-bold px-2 min-h-6">
        {count}
        <span aria-hidden>→</span>
      </span>
    </a>
  )
}

function JobCheck({
  checked,
  label,
  onToggle,
  indeterminate = false,
}: {
  checked: boolean
  label: string
  onToggle: () => void
  indeterminate?: boolean
}) {
  const on = checked && !indeterminate
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`mt-0.5 shrink-0 w-5 h-5 rounded-[4px] border-2 inline-flex items-center justify-center ${
        on || indeterminate ? 'bg-primary border-primary' : 'border-ink/40 bg-page hover:border-ink'
      }`}
    >
      {on ? (
        <svg className="w-3 h-3 text-black" viewBox="0 0 12 12" aria-hidden>
          <path
            d="M2.2 6.2 4.8 8.8 9.8 3.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : indeterminate ? (
        <span className="block w-2.5 h-0.5 rounded-full bg-black" aria-hidden />
      ) : null}
    </button>
  )
}

function SortChevron({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <svg
      className={`w-3 h-3 inline-block ml-0.5 transition-transform ${
        active ? 'text-primary' : 'text-muted/50'
      } ${active && direction === 'asc' ? 'rotate-180' : ''}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden
    >
      <path d="M5 8l5 5 5-5H5z" />
    </svg>
  )
}

function OccupationTable({
  occupations,
  relevantSocs,
  newPathSocs,
  mapBase,
  mapFrom,
  sortField,
  sortDirection,
  onSort,
  aiImpactBySoc,
  wageTrendBySoc,
  selectedSocs,
  onToggleSoc,
  onToggleAll,
  selecting,
}: {
  occupations: Occupation[]
  relevantSocs: Set<string>
  newPathSocs: Set<string>
  mapBase: string
  mapFrom: string
  sortField: TableSort
  sortDirection: SortDirection
  onSort: (f: TableSort) => void
  aiImpactBySoc: Map<string, AiImpactScore>
  wageTrendBySoc: Map<string, EntryWageTrend>
  selectedSocs: Set<string>
  onToggleSoc: (soc: string) => void
  onToggleAll: () => void
  selecting: boolean
}) {
  const selectedCount = occupations.filter((o) => selectedSocs.has(o.soc)).length
  const allSelected = occupations.length > 0 && selectedCount === occupations.length
  const someSelected = selectedCount > 0 && !allSelected

  return (
    <div id="occupations" className="scroll-mt-20">
      {selecting ? (
        <div className="lg:hidden mb-3 flex items-center gap-3">
          <JobCheck
            checked={allSelected}
            indeterminate={someSelected}
            label={allSelected ? 'Clear occupation selection' : 'Select all occupations'}
            onToggle={onToggleAll}
          />
          <span className="text-sm text-muted">
            {selectedCount > 0
              ? `${selectedCount} selected`
              : 'Select the jobs you want'}
          </span>
        </div>
      ) : null}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-3 overflow-x-auto scrollbar-none lg:hidden">
        <div className="flex items-center gap-2 min-w-min pb-1">
          {SORT_CHIPS.map((chip) => {
            const active = sortField === chip.field
            return (
              <button
                key={chip.field}
                type="button"
                onClick={() => onSort(chip.field)}
                className={`shrink-0 inline-flex items-center rounded-lg border px-3 min-h-11 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-ink text-page border-ink'
                    : 'border-border text-muted hover:text-ink hover:border-ink'
                }`}
              >
                {chip.label}
                {active && <SortChevron active direction={sortDirection} />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="lg:hidden space-y-3">
        {occupations.map((occ) => (
          <OccCard
            key={occ.soc}
            occ={occ}
            isRelevant={relevantSocs.has(occ.soc)}
            isNewPath={newPathSocs.has(occ.soc)}
            mapBase={mapBase}
            mapFrom={mapFrom}
            impact={aiImpactBySoc.get(occ.soc)}
            wageTrend={wageTrendBySoc.get(occ.soc)}
            selected={selectedSocs.has(occ.soc)}
            onToggle={() => onToggleSoc(occ.soc)}
            selecting={selecting}
          />
        ))}
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm min-w-[920px]">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((col) => {
                const label = col.why ? (
                  <HoverTip
                    maxWidth={260}
                    content={<p className="text-xs text-muted leading-relaxed">{col.why}</p>}
                  >
                    <span className="border-b border-dashed border-border-bright cursor-help">
                      {col.label}
                    </span>
                  </HoverTip>
                ) : (
                  <span>{col.label}</span>
                )
                return (
                  <th
                    key={col.field}
                    className={`px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-ink transition-colors select-none ${col.className || 'text-left'}`}
                    onClick={() => onSort(col.field)}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      {col.field === 'title' && selecting ? (
                        <JobCheck
                          checked={allSelected}
                          indeterminate={someSelected}
                          label={allSelected ? 'Clear occupation selection' : 'Select all occupations'}
                          onToggle={onToggleAll}
                        />
                      ) : null}
                      <span className="inline-flex items-center gap-0.5">
                        {label}
                        <SortChevron active={sortField === col.field} direction={sortDirection} />
                      </span>
                    </span>
                  </th>
                )
              })}
              <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-left">
                Map
              </th>
            </tr>
          </thead>
          <tbody>
            {occupations.map((occ) => (
              <tr
                key={occ.soc}
                className={`border-b border-border/50 hover:bg-surface-hover transition-colors ${
                  selecting ? 'cursor-pointer' : ''
                } ${selectedSocs.has(occ.soc) ? 'bg-primary/5' : ''} ${
                  relevantSocs.has(occ.soc) ? '' : 'text-ink/70'
                }`}
                onClick={selecting ? () => onToggleSoc(occ.soc) : undefined}
              >
                <td className="px-3 py-3 align-top">
                  <div className="flex items-start gap-3">
                    {selecting ? (
                      <JobCheck
                        checked={selectedSocs.has(occ.soc)}
                        label={`Select ${sentenceCase(occ.title)}`}
                        onToggle={() => onToggleSoc(occ.soc)}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="font-medium text-ink leading-snug">
                        {sentenceCase(occ.title)}
                        {newPathSocs.has(occ.soc) ? (
                          <span className="ml-2 align-middle">
                            <NewPathBadge />
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5 font-mono">SOC {occ.soc}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right align-top">
                  <div className="font-mono tabular-nums text-ink">{formatSalary(occ.entrySalary)}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    median {formatSalary(occ.medianSalary)}
                  </div>
                </td>
                <td className="px-3 py-3 text-right align-top font-mono tabular-nums text-openings">
                  <div className="flex flex-col items-end">
                    <div>{formatNumber(occ.openPositions)}</div>
                    <WageSparkline trend={wageTrendBySoc.get(occ.soc)} />
                  </div>
                </td>
                <td className="px-3 py-3 align-top">
                  <CompetitionCell
                    level={occ.competitionLevel}
                    ratio={occ.graduatesPerOpening}
                  />
                </td>
                <td className="px-3 py-3 align-top">
                  <AiRiskCell occ={occ} />
                </td>
                <td className="px-3 py-3 align-top">
                  <EntryBarrierCell
                    impact={aiImpactBySoc.get(occ.soc)}
                    trend={wageTrendBySoc.get(occ.soc)}
                  />
                </td>
                <td className="px-3 py-3 align-top">
                  <Link
                    to={`${mapBase}/${occ.soc}${mapFrom}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-ink underline underline-offset-2 hover:text-primary text-sm"
                  >
                    Map
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {occupations.length === 0 && (
        <div className="text-center py-12 text-muted">No occupations found</div>
      )}
    </div>
  )
}

function OccCard({
  occ,
  isRelevant,
  isNewPath,
  mapBase,
  mapFrom,
  impact,
  wageTrend,
  selected,
  onToggle,
  selecting,
}: {
  occ: Occupation
  isRelevant: boolean
  isNewPath: boolean
  mapBase: string
  mapFrom: string
  impact?: AiImpactScore
  wageTrend?: EntryWageTrend
  selected: boolean
  onToggle: () => void
  selecting: boolean
}) {
  return (
    <div
      className={`border rounded-lg p-4 ${selecting ? 'cursor-pointer' : ''} ${
        selected ? 'border-primary bg-primary/5' : isRelevant ? 'border-border' : 'border-dashed border-border'
      }`}
      onClick={selecting ? onToggle : undefined}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          {selecting ? (
            <JobCheck checked={selected} label={sentenceCase(occ.title)} onToggle={onToggle} />
          ) : null}
          <div className="min-w-0">
            <div className="font-medium text-ink leading-snug">
              {sentenceCase(occ.title)}
              {isNewPath ? (
                <span className="ml-2 align-middle">
                  <NewPathBadge />
                </span>
              ) : null}
            </div>
            <div className="text-[11px] text-muted mt-0.5 font-mono">SOC {occ.soc}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0 text-sm font-medium">
          <Link
            to={`${mapBase}/${occ.soc}${mapFrom}`}
            onClick={(e) => e.stopPropagation()}
            className="text-ink underline underline-offset-2 min-h-11 inline-flex items-center"
          >
            Map
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <span className="text-muted text-xs">Entry salary</span>
          <div className="font-mono tabular-nums text-ink font-medium">
            {formatSalary(occ.entrySalary)}
          </div>
          <div className="text-[11px] text-muted">median {formatSalary(occ.medianSalary)}</div>
        </div>
        <div>
          <span className="text-muted text-xs">Openings</span>
          <div className="font-mono tabular-nums text-openings">{formatNumber(occ.openPositions)}</div>
          <WageSparkline trend={wageTrend} align="start" />
        </div>
        <div>
          <span className="text-muted text-xs">Competition</span>
          <CompetitionCell level={occ.competitionLevel} ratio={occ.graduatesPerOpening} align="left" />
        </div>
        <div>
          <span className="text-muted text-xs">AI exposure</span>
          <AiRiskCell occ={occ} align="left" />
        </div>
        <div>
          <span className="text-muted text-xs">Entry barrier</span>
          <EntryBarrierCell impact={impact} trend={wageTrend} />
        </div>
      </div>
    </div>
  )
}

function CompetitionCell({
  level,
  ratio,
  align = 'start',
}: {
  level: Occupation['competitionLevel']
  ratio: number | null
  align?: 'start' | 'left'
}) {
  const resolved = competitionLevelFromRatio(ratio) ?? level
  const color = COMPETITION_DOT[resolved || 'Unknown'] || COMPETITION_DOT.Unknown
  const copy = resolved ? COMPETITION_COPY[resolved] : null
  return (
    <HoverTip
      maxWidth={280}
      content={
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs font-semibold text-ink">
              {resolved || 'Unknown'} Competition
            </span>
          </div>
          {ratio != null && (
            <div className="text-xs text-ink mb-1.5 font-mono">
              {formatRatio(ratio)} graduates per opening per year
            </div>
          )}
          <p className="text-xs text-muted leading-relaxed">
            {copy?.blurb || 'Competition data unavailable for this occupation.'}
          </p>
          <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted">
            Based on annual graduates vs. BLS annual openings
          </div>
        </div>
      }
    >
      <div className={`flex flex-col gap-1 cursor-help ${align === 'left' ? 'items-start' : 'items-start'}`}>
        <span className="text-sm font-medium leading-none text-ink">
          {resolved || '—'}
        </span>
        {ratio != null && (
          <span className="text-[11px] text-muted leading-tight">
            {formatRatio(ratio)} grads per opening
          </span>
        )}
        <MiniBar pct={competitionFill(ratio)} color={color} />
      </div>
    </HoverTip>
  )
}

function AiRiskCell({ occ, align = 'start' }: { occ: Occupation; align?: 'start' | 'left' }) {
  const score = occ.karpathyExposure
  const band = aiBandLive(score)
  const color = AI_BAND_LIVE_COLORS[band]
  const rationale = occ.karpathyRationale || AI_BAND_LIVE_COPY[band]
  const pct = score != null ? Math.round((score / 10) * 100) : 0
  const barColor = color

  return (
    <HoverTip
      maxWidth={320}
      content={
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-ink">AI Exposure</span>
            <span className="font-mono text-xs font-bold text-ink">
              {score}/10 · {band}
            </span>
          </div>
          <div className="mt-1.5 mb-2">
            <div className="flex justify-between text-[10px] text-muted mb-0.5">
              <span>Low</span>
              <span>High</span>
            </div>
            <div className="h-1.5 bg-inset rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
          <p className="text-xs text-muted leading-relaxed">{rationale}</p>
          {!occ.karpathyRationale && (
            <p className="text-[10px] text-muted italic mt-1">
              Band-level explanation; no per-title rationale available.
            </p>
          )}
          {occ.aiDisruptionScore != null && (
            <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted">
              Frey &amp; Osborne 2013 baseline: {occ.aiDisruptionScore}/100
              {occ.aiDisruptionLabel ? ` · ${occ.aiDisruptionLabel}` : ''}
            </div>
          )}
        </div>
      }
    >
      <div className={`flex flex-col gap-1 cursor-help ${align === 'left' ? 'items-start' : 'items-start'}`}>
        <span className="font-mono tabular-nums text-sm text-ink leading-none">
          {score != null ? `${Math.round(score)} of 10` : '—'}
        </span>
        <span className="text-[11px] font-medium leading-tight text-ink">
          {band}
        </span>
        {score != null && <MiniBar pct={pct} color={barColor} />}
      </div>
    </HoverTip>
  )
}

function EntryBarrierCell({
  impact,
  trend,
}: {
  impact?: AiImpactScore
  trend?: EntryWageTrend
}) {
  if (!impact) {
    return (
      <HoverTip
        maxWidth={280}
        content={<p className="text-xs text-muted leading-relaxed">{ENTRY_BARRIER_COPY}</p>}
      >
        <span className="text-muted cursor-help">—</span>
      </HoverTip>
    )
  }

  const level = entryBarrierLevel(impact, trend)
  const flag = AI_FLAG_LABEL[impact.flag] ?? impact.flag
  const color = ENTRY_BARRIER_DOT[level || 'Unknown'] || ENTRY_BARRIER_DOT.Unknown

  return (
    <HoverTip
      maxWidth={300}
      content={
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs font-semibold text-ink">{level} barrier</span>
          </div>
          <p className="text-xs text-ink mb-1.5">
            AOI {impact.barrier.toLowerCase()} · {flag}
          </p>
          <p className="text-xs text-muted leading-relaxed">{ENTRY_BARRIER_COPY}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-0.5 cursor-help items-start">
        <span className="text-sm font-medium leading-none text-ink">{level}</span>
        <span className="text-[11px] text-muted leading-tight">{flag}</span>
      </div>
    </HoverTip>
  )
}

function SeverityLegend() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
      <span className="font-medium text-ink">Severity</span>
      {SEVERITY_LEGEND.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}

const COLUMN_DEFINITIONS = [
  {
    term: 'Entry salary',
    body: '25th percentile of all wages in the occupation (BLS), a proxy for entry pay. BLS does not split wages by experience.',
  },
  {
    term: 'Openings',
    body: 'Average openings expected per year through 2034, including replacement hires as people retire or change fields, not just newly created jobs (BLS). The sparkline is the occupation’s inflation-adjusted entry wage from 2021 to 2025, not openings over time.',
  },
  {
    term: 'Competition',
    body: 'New graduates from linked majors competing for each annual opening. Under 1× means more openings than graduates.',
  },
  {
    term: 'AI exposure',
    body: 'How much of this job’s day-to-day work AI can already do or assist, scored 0 to 10 from task-level ratings (Karpathy/BLS, Eloundou et al.). High exposure means the work changes; it does not always mean fewer jobs.',
  },
  {
    term: 'Entry barrier',
    body: 'How hard the door is getting. Rising only when AOI says entry is harder and entry wages are up, or the field is shrinking. Steady is the middle. Falling is AOI’s lower-potential pattern.',
  },
] as const

function ColumnDefinitions() {
  return (
    <section className="mt-12 sm:mt-16 pt-8 border-t border-border">
      <h2 className="font-sans text-lg sm:text-xl font-semibold text-ink mb-5">
        Column definitions
      </h2>
      <dl className="space-y-4 max-w-3xl">
        {COLUMN_DEFINITIONS.map((item) => (
          <div key={item.term} className="text-sm leading-relaxed">
            <dt className="font-semibold text-ink">{item.term}</dt>
            <dd className="text-muted mt-0.5">{item.body}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 text-xs text-muted leading-relaxed max-w-3xl">
        {AOI_ATTRIBUTION}.
      </p>
    </section>
  )
}

function sortValue(
  occ: Occupation,
  field: TableSort,
  aiImpactBySoc: Map<string, AiImpactScore>,
  wageTrendBySoc: Map<string, EntryWageTrend>,
): string | number | null {
  if (field === 'entryBarrier') {
    const level = entryBarrierLevel(aiImpactBySoc.get(occ.soc), wageTrendBySoc.get(occ.soc))
    return level === 'Rising' ? 2 : level === 'Steady' ? 1 : level === 'Falling' ? 0 : null
  }
  const value = occ[field]
  return typeof value === 'number' || typeof value === 'string' ? value : null
}
