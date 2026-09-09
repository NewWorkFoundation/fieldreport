import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { DocumentMeta } from '../components/DocumentMeta'
import { HoverTip } from '../components/HoverTip'
import { MajorSearch } from '../components/MajorSearch'
import { JobsArrow, WageSparkline } from '../components/WageSparkline'
import {
  formatCompactCount,
  formatNumber,
  formatSignedCompactCount,
  formatRatio,
  formatSalary,
  formatSalaryK,
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
import { newPathSocs, pathForCip } from '../lib/unobviousPaths'
import { QuietEmailForm, useLetterSubscribe } from '../components/DigestSignup'
import { useAppPaths } from '../lib/useAppPaths'
import type {
  AiImpactScore,
  EntryWageTrend,
  Occupation,
  SortDirection,
  SortField,
  UnobviousJob,
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
  { field: 'entrySalary', label: 'Entry-level salary' },
  { field: 'openPositions', label: 'Job openings' },
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
    label: 'Entry-level salary (average)',
    className: 'text-right',
    why: 'We infer entry-level pay from the BLS 25th-percentile wage (May 2024 OEWS), because BLS does not split wages by experience. Median wage is shown underneath.',
  },
  {
    field: 'openPositions',
    label: 'Job openings',
    className: 'text-right',
    why: 'Annual job openings from BLS — includes both new positions and replacements for workers who retire or change careers. Default sort puts accelerating employment ahead of declining, then BLS projected growth (2024–2034), then opening count. The sparkline is the inflation-adjusted entry wage from 2021 to 2025.',
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
const TOO_NEW_TO_CALCULATE = 'Too new to calculate'
const METRIC_COL_COUNT = 5

/** Favorable if linked jobs add at least this many positions by 2034. */
const JOBS_FAVORABLE_MIN = 10_000
const JOBS_STRONG_MIN = 100_000

/** Absolute 2024–34 job change: employment × projected growth rate. */
function projectedJobsIncrease(occupations: Occupation[]): number {
  let jobs = 0
  for (const occ of occupations) {
    const rate = occ.projectedGrowthRate
    const weight = occ.totalEmployment
    if (rate == null || Number.isNaN(rate) || !weight) continue
    jobs += weight * (rate / 100)
  }
  return jobs
}

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

function StatusArrow({ tone }: { tone: 'up' | 'flat' | 'down' }) {
  const mark = tone === 'up' ? '↗' : tone === 'down' ? '↘' : '→'
  return (
    <span className="font-mono text-[12px] leading-none opacity-80" aria-hidden>
      {mark}
    </span>
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
    aiImpactBySoc,
    wageTrendBySoc,
    unobviousByCip,
    unobviousByCip4,
    unobviousByCip2,
    loading,
  } = useData()
  const { home, mapBase, resultsBase } = useAppPaths()

  const [showAll, setShowAll] = useState(false)
  const [sortField, setSortField] = useState<TableSort>('openPositions')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedSocs, setSelectedSocs] = useState<Set<string>>(() => new Set())
  const [selectedOrphans, setSelectedOrphans] = useState<Set<string>>(() => new Set())
  const [selectingJobs, setSelectingJobs] = useState(false)

  useEffect(() => {
    setShowAll(false)
    setSortField('openPositions')
    setSortDirection('desc')
    setSelectedSocs(new Set())
    setSelectedOrphans(new Set())
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
  const whyBySoc = useMemo(() => {
    const map = new Map<string, string>()
    for (const job of newPath?.jobs ?? []) {
      if (job.soc) map.set(job.soc, job.why)
    }
    return map
  }, [newPath])
  const orphanJobs = useMemo(
    () =>
      (newPath?.jobs ?? []).filter(
        (job) => !job.soc || !occupationsBySoc.has(job.soc),
      ),
    [newPath, occupationsBySoc],
  )

  const { relevant, other } = useMemo(() => {
    const entry = crosswalk[cipCode]
    if (!occupations.length || !entry) {
      return { relevant: [] as Occupation[], other: occupations }
    }
    const linked = new Set([...entry.primary, ...entry.related])
    const rel: Occupation[] = []
    const rest: Occupation[] = []
    for (const occ of occupations) {
      if (linked.has(occ.soc)) rel.push(occ)
      else rest.push(occ)
    }
    rel.sort((a, b) => compareOpeningsRising(a, b, 'desc'))
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
      if (sortField === 'openPositions') {
        const rising = compareOpeningsRising(a, b, sortDirection)
        if (rising !== 0) return rising
        return Number(altSocs.has(b.soc)) - Number(altSocs.has(a.soc))
      }
      const av = sortValue(a, sortField, aiImpactBySoc, wageTrendBySoc)
      const bv = sortValue(b, sortField, aiImpactBySoc, wageTrendBySoc)
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      const an = typeof av === 'number' ? av : Number.NEGATIVE_INFINITY
      const bn = typeof bv === 'number' ? bv : Number.NEGATIVE_INFINITY
      if (an !== bn) return sortDirection === 'asc' ? an - bn : bn - an
      return 0
    })
    return list
  }, [visible, sortField, sortDirection, aiImpactBySoc, wageTrendBySoc, altSocs])

  const selectedRoles = useMemo(() => {
    const fromOccs = sorted
      .filter((o) => selectedSocs.has(o.soc))
      .map((o) => sentenceCase(o.title))
    const fromOrphans = orphanJobs
      .filter((job) => selectedOrphans.has(job.title))
      .map((job) => job.title)
    return [...fromOccs, ...fromOrphans]
  }, [sorted, selectedSocs, orphanJobs, selectedOrphans])

  function toggleSoc(soc: string) {
    setSelectedSocs((prev) => {
      const next = new Set(prev)
      if (next.has(soc)) next.delete(soc)
      else next.add(soc)
      return next
    })
  }

  function toggleOrphan(title: string) {
    setSelectedOrphans((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  function toggleAllVisible() {
    const occsAllOn = sorted.length > 0 && sorted.every((o) => selectedSocs.has(o.soc))
    const orphansAllOn =
      orphanJobs.length === 0 || orphanJobs.every((job) => selectedOrphans.has(job.title))
    const allOn = occsAllOn && orphansAllOn && sorted.length + orphanJobs.length > 0
    setSelectedSocs((prev) => {
      const next = new Set(prev)
      if (allOn) {
        for (const o of sorted) next.delete(o.soc)
      } else {
        for (const o of sorted) next.add(o.soc)
      }
      return next
    })
    setSelectedOrphans((prev) => {
      const next = new Set(prev)
      if (allOn) {
        for (const job of orphanJobs) next.delete(job.title)
      } else {
        for (const job of orphanJobs) next.add(job.title)
      }
      return next
    })
  }

  const stats = useMemo(() => {
    if (!relevant.length) return null
    const avgSalary = relevant.reduce((s, o) => s + o.entrySalary, 0) / relevant.length
    const totalOpenings = relevant.reduce((s, o) => s + o.openPositions, 0)
    const jobsIncrease = projectedJobsIncrease(relevant)
    const employmentNow = relevant.reduce((s, o) => s + (o.totalEmployment || 0), 0)
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
    return { avgSalary, totalOpenings, jobsIncrease, employmentNow, avgAi, avgCompetition }
  }, [relevant])

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
        description={`BLS salaries, openings, and AI exposure for careers linked to ${displayName}.`}
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
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <MetricCard
                  label="Projected openings"
                  value={formatCompactCount(stats.totalOpenings)}
                  sublabel={`per year · ${formatSignedCompactCount(stats.jobsIncrease)} jobs by 2034`}
                  spark={
                    <JobsArrow
                      now={stats.employmentNow}
                      later={stats.employmentNow + stats.jobsIncrease}
                    />
                  }
                />
                <MetricCard
                  label="Entry-level salary (average)"
                  value={formatSalaryK(stats.avgSalary)}
                  mark="→"
                  footnote={{ id: 'entry-salary-method', mark: '1' }}
                />
                <MetricCard
                  label="Competition"
                  value={
                    stats.avgCompetition == null ? 'N/A' : `${stats.avgCompetition.toFixed(1)}×`
                  }
                  sublabel="grads per opening, weighted"
                />
              </div>
              <p
                id="entry-salary-method"
                className="mt-3 text-xs text-muted leading-relaxed max-w-3xl"
              >
                <sup>1</sup> Entry-level salary is inferred from the BLS 25th-percentile
                wage, then averaged across occupations on this page. BLS does not publish
                wages by years of experience.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
        whyBySoc={whyBySoc}
        orphanJobs={orphanJobs}
        mapBase={mapBase}
        mapFrom={mapFrom}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
        aiImpactBySoc={aiImpactBySoc}
        wageTrendBySoc={wageTrendBySoc}
        selectedSocs={selectedSocs}
        selectedOrphans={selectedOrphans}
        onToggleSoc={toggleSoc}
        onToggleOrphan={toggleOrphan}
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
  spark,
  footnote,
}: {
  label: string
  value: string
  sublabel?: string
  mark?: string
  spark?: ReactNode
  footnote?: { id: string; mark: string }
}) {
  return (
    <div className="border border-border rounded-lg p-3 sm:p-5 min-w-0">
      <div className="text-[10px] sm:text-xs text-muted font-medium uppercase tracking-wider mb-1.5 sm:mb-2 leading-tight">
        <KeepBeta>{label}</KeepBeta>
        {footnote ? (
          <a
            href={`#${footnote.id}`}
            className="ml-0.5 normal-case tracking-normal text-muted hover:text-ink no-underline"
            aria-label={`Footnote ${footnote.mark}: how entry-level salary is inferred`}
          >
            <sup>{footnote.mark}</sup>
          </a>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <div className="text-xl sm:text-3xl font-bold font-mono tabular-nums text-ink">{value}</div>
            {mark ? (
              <span className="text-sm text-muted font-mono" aria-hidden>
                {mark}
              </span>
            ) : null}
          </div>
          {sublabel && (
            <div className="text-[11px] sm:text-xs text-muted mt-1 leading-snug">{sublabel}</div>
          )}
        </div>
        {spark}
      </div>
    </div>
  )
}

function TldrCard({
  stats,
}: {
  majorName: string
  stats: {
    jobsIncrease: number
    avgAi: number
  }
}) {
  const jobs = stats.jobsIncrease
  const ai = stats.avgAi
  const aiWord = ai <= 3 ? 'low' : ai <= 5.5 ? 'moderate' : ai <= 7.5 ? 'high' : 'very high'

  const verdict =
    jobs < 0 ? 'Not favorable' : jobs >= JOBS_FAVORABLE_MIN ? 'Favorable' : 'Mixed'

  const jobsBecause =
    jobs >= JOBS_STRONG_MIN
      ? 'job growth is strong'
      : jobs >= JOBS_FAVORABLE_MIN
        ? 'jobs are rising'
        : jobs >= 0
          ? 'there is little job growth'
          : 'jobs are declining'
  const aiHelps = ai <= 4
  const aiHurts = ai > 5.5
  const why =
    verdict === 'Favorable'
      ? aiHurts
        ? `because ${jobsBecause}, in spite of ${aiWord} AI exposure`
        : aiHelps
          ? `because ${jobsBecause} and AI exposure is ${aiWord}`
          : `because ${jobsBecause}`
      : aiHurts
        ? `because ${jobsBecause} and AI exposure is ${aiWord}`
        : aiHelps
          ? `because ${jobsBecause}, in spite of ${aiWord} AI exposure`
          : `because ${jobsBecause}`

  return (
    <div className="mb-8 max-w-4xl">
      <p className="text-base sm:text-lg text-ink leading-[1.7]">
        <strong className="font-bold">{verdict}</strong> {why}.
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
    includeReport: true,
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

function AdjacencyChip() {
  return (
    <span className="inline-flex items-center rounded-full bg-adjacency/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-adjacency">
      Emerging career pathway
    </span>
  )
}

function adjacentRowClass({
  isAdjacent,
  selecting,
  selected,
  isRelevant,
}: {
  isAdjacent: boolean
  selecting: boolean
  selected: boolean
  isRelevant: boolean
}) {
  const bits = ['border-b border-border/50 transition-colors']
  if (selecting) bits.push('cursor-pointer')
  if (selected) bits.push('bg-primary/5')
  if (!isRelevant && !isAdjacent) bits.push('text-ink/70')
  if (isAdjacent && !selected) bits.push('bg-adjacency/[0.08] hover:bg-adjacency/[0.14]')
  else if (!selected) bits.push('hover:bg-surface-hover')
  return bits.join(' ')
}

function OccupationName({
  title,
  soc,
  why,
  isAdjacent,
}: {
  title: string
  soc?: string
  why?: string
  isAdjacent: boolean
}) {
  return (
    <div className="min-w-0">
      <div className="font-medium text-ink leading-snug flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{title}</span>
        {isAdjacent ? <AdjacencyChip /> : null}
      </div>
      {isAdjacent && why ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted max-w-xs">{why}</p>
      ) : null}
      {soc ? (
        <div className="text-[11px] text-muted mt-0.5 font-mono">SOC {soc}</div>
      ) : null}
    </div>
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

function TooNewCell({ colSpan }: { colSpan: number }) {
  return (
    <td colSpan={colSpan} className="px-3 py-3 align-middle text-center text-muted">
      {TOO_NEW_TO_CALCULATE}
    </td>
  )
}

function OccupancyRow({
  occ,
  why,
  isAdjacent,
  isRelevant,
  mapBase,
  mapFrom,
  impact,
  wageTrend,
  selected,
  onToggle,
  selecting,
}: {
  occ: Occupation
  why?: string
  isAdjacent: boolean
  isRelevant: boolean
  mapBase: string
  mapFrom: string
  impact?: AiImpactScore
  wageTrend?: EntryWageTrend
  selected: boolean
  onToggle: () => void
  selecting: boolean
}) {
  return (
    <tr
      className={adjacentRowClass({
        isAdjacent,
        selecting,
        selected,
        isRelevant,
      })}
      onClick={selecting ? onToggle : undefined}
    >
      <td className="px-3 py-3 align-top">
        <div className="flex items-start gap-3">
          {selecting ? (
            <JobCheck
              checked={selected}
              label={`Select ${sentenceCase(occ.title)}`}
              onToggle={onToggle}
            />
          ) : null}
          <OccupationName
            title={sentenceCase(occ.title)}
            soc={occ.soc}
            why={why}
            isAdjacent={isAdjacent}
          />
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
          <WageSparkline trend={wageTrend} />
        </div>
      </td>
      <td className="px-3 py-3 align-top">
        <CompetitionCell level={occ.competitionLevel} ratio={occ.graduatesPerOpening} />
      </td>
      <td className="px-3 py-3 align-top">
        <AiRiskCell occ={occ} />
      </td>
      <td className="px-3 py-3 align-top">
        <EntryBarrierCell impact={impact} trend={wageTrend} />
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
  )
}

function OrphanRow({
  job,
  selected,
  onToggle,
  selecting,
}: {
  job: UnobviousJob
  selected: boolean
  onToggle: () => void
  selecting: boolean
}) {
  return (
    <tr
      className={adjacentRowClass({
        isAdjacent: true,
        selecting,
        selected,
        isRelevant: false,
      })}
      onClick={selecting ? onToggle : undefined}
    >
      <td className="px-3 py-3 align-top">
        <div className="flex items-start gap-3">
          {selecting ? (
            <JobCheck
              checked={selected}
              label={`Select ${job.title}`}
              onToggle={onToggle}
            />
          ) : null}
          <OccupationName title={job.title} why={job.why} isAdjacent />
        </div>
      </td>
      <TooNewCell colSpan={METRIC_COL_COUNT + 1} />
    </tr>
  )
}

function OccupationTable({
  occupations,
  relevantSocs,
  newPathSocs,
  whyBySoc,
  orphanJobs,
  mapBase,
  mapFrom,
  sortField,
  sortDirection,
  onSort,
  aiImpactBySoc,
  wageTrendBySoc,
  selectedSocs,
  selectedOrphans,
  onToggleSoc,
  onToggleOrphan,
  onToggleAll,
  selecting,
}: {
  occupations: Occupation[]
  relevantSocs: Set<string>
  newPathSocs: Set<string>
  whyBySoc: Map<string, string>
  orphanJobs: UnobviousJob[]
  mapBase: string
  mapFrom: string
  sortField: TableSort
  sortDirection: SortDirection
  onSort: (f: TableSort) => void
  aiImpactBySoc: Map<string, AiImpactScore>
  wageTrendBySoc: Map<string, EntryWageTrend>
  selectedSocs: Set<string>
  selectedOrphans: Set<string>
  onToggleSoc: (soc: string) => void
  onToggleOrphan: (title: string) => void
  onToggleAll: () => void
  selecting: boolean
}) {
  const selectedCount =
    occupations.filter((o) => selectedSocs.has(o.soc)).length +
    orphanJobs.filter((job) => selectedOrphans.has(job.title)).length
  const selectableCount = occupations.length + orphanJobs.length
  const allSelected = selectableCount > 0 && selectedCount === selectableCount
  const someSelected = selectedCount > 0 && !allSelected
  const displayRows = tableDisplayRows(occupations, orphanJobs, newPathSocs)

  function occRow(occ: Occupation) {
    return (
      <OccupancyRow
        key={occ.soc}
        occ={occ}
        why={whyBySoc.get(occ.soc)}
        isAdjacent={newPathSocs.has(occ.soc)}
        isRelevant={relevantSocs.has(occ.soc)}
        mapBase={mapBase}
        mapFrom={mapFrom}
        impact={aiImpactBySoc.get(occ.soc)}
        wageTrend={wageTrendBySoc.get(occ.soc)}
        selected={selectedSocs.has(occ.soc)}
        onToggle={() => onToggleSoc(occ.soc)}
        selecting={selecting}
      />
    )
  }

  function occCard(occ: Occupation) {
    return (
      <OccCard
        key={occ.soc}
        occ={occ}
        isRelevant={relevantSocs.has(occ.soc)}
        isNewPath={newPathSocs.has(occ.soc)}
        why={whyBySoc.get(occ.soc)}
        mapBase={mapBase}
        mapFrom={mapFrom}
        impact={aiImpactBySoc.get(occ.soc)}
        wageTrend={wageTrendBySoc.get(occ.soc)}
        selected={selectedSocs.has(occ.soc)}
        onToggle={() => onToggleSoc(occ.soc)}
        selecting={selecting}
      />
    )
  }

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
        {displayRows.map((row) =>
          row.kind === 'orphan' ? (
            <OrphanCard
              key={row.key}
              job={row.job}
              selected={selectedOrphans.has(row.job.title)}
              onToggle={() => onToggleOrphan(row.job.title)}
              selecting={selecting}
            />
          ) : (
            occCard(row.occ)
          ),
        )}
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
            {displayRows.map((row) =>
              row.kind === 'orphan' ? (
                <OrphanRow
                  key={row.key}
                  job={row.job}
                  selected={selectedOrphans.has(row.job.title)}
                  onToggle={() => onToggleOrphan(row.job.title)}
                  selecting={selecting}
                />
              ) : (
                occRow(row.occ)
              ),
            )}
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
  why,
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
  why?: string
  mapBase: string
  mapFrom: string
  impact?: AiImpactScore
  wageTrend?: EntryWageTrend
  selected: boolean
  onToggle: () => void
  selecting: boolean
}) {
  const adjacentFrame =
    isNewPath && !selected
      ? 'border-border bg-adjacency/[0.08]'
      : selected
        ? 'border-primary bg-primary/5'
        : isRelevant
          ? 'border-border'
          : 'border-dashed border-border'

  const body = (
    <>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          {selecting ? (
            <JobCheck checked={selected} label={sentenceCase(occ.title)} onToggle={onToggle} />
          ) : null}
          <OccupationName
            title={sentenceCase(occ.title)}
            soc={occ.soc}
            why={why}
            isAdjacent={isNewPath}
          />
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
          <span className="text-muted text-xs">Entry-level salary (average)</span>
          <div className="font-mono tabular-nums text-ink font-medium">
            {formatSalary(occ.entrySalary)}
          </div>
          <div className="text-[11px] text-muted">median {formatSalary(occ.medianSalary)}</div>
        </div>
        <div>
          <span className="text-muted text-xs">Job openings</span>
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
    </>
  )

  return (
    <div
      className={`border rounded-lg p-4 ${selecting ? 'cursor-pointer' : ''} ${adjacentFrame}`}
      onClick={selecting ? onToggle : undefined}
    >
      {body}
    </div>
  )
}

function OrphanCard({
  job,
  selected,
  onToggle,
  selecting,
}: {
  job: UnobviousJob
  selected: boolean
  onToggle: () => void
  selecting: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${selecting ? 'cursor-pointer' : ''} ${
        selected ? 'border-primary bg-primary/5' : 'border-border bg-adjacency/[0.08]'
      }`}
      onClick={selecting ? onToggle : undefined}
    >
      <div className="flex items-start gap-3">
        {selecting ? (
          <JobCheck checked={selected} label={job.title} onToggle={onToggle} />
        ) : null}
        <OccupationName title={job.title} why={job.why} isAdjacent />
      </div>
      <p className="mt-3 text-sm text-muted">{TOO_NEW_TO_CALCULATE}</p>
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
        <span
          className="text-sm font-medium leading-none inline-flex items-center gap-1"
          style={{ color: resolved ? color : undefined }}
        >
          {resolved || '—'}
          {resolved === 'High' ? (
            <StatusArrow tone="up" />
          ) : resolved === 'Low' ? (
            <StatusArrow tone="down" />
          ) : resolved === 'Moderate' ? (
            <StatusArrow tone="flat" />
          ) : null}
        </span>
        <span className="text-[11px] text-muted leading-tight">
          {ratio != null ? `${formatRatio(ratio)} grads per opening` : 'no data'}
        </span>
        {ratio != null && <MiniBar pct={competitionFill(ratio)} color={color} />}
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
        <span className="flex flex-col gap-0.5 cursor-help items-start">
          <span className="text-sm font-medium leading-none text-muted">—</span>
          <span className="text-[11px] text-muted leading-tight">no data</span>
        </span>
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
        <span
          className="text-sm font-medium leading-none inline-flex items-center gap-1"
          style={{ color }}
        >
          {level}
          {level === 'Rising' ? (
            <StatusArrow tone="up" />
          ) : level === 'Falling' ? (
            <StatusArrow tone="down" />
          ) : (
            <StatusArrow tone="flat" />
          )}
        </span>
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
    term: 'Entry-level salary (average)',
    body: 'Inferred from the BLS 25th-percentile wage, a proxy for entry pay because BLS does not split wages by experience. The summary figure averages those entry wages across occupations on this page. Median wage is shown underneath each row.',
  },
  {
    term: 'Job openings',
    body: 'Average openings expected per year through 2034, including replacement hires as people retire or change fields, not just newly created jobs (BLS). The sparkline is the occupation’s inflation-adjusted entry wage from 2021 to 2025, not openings over time.',
  },
  {
    term: 'Competition',
    body: 'New graduates from linked majors competing for each annual opening. Under 1× means more openings than graduates.',
  },
  {
    term: 'AI exposure',
    body: 'How much of this job’s day-to-day work AI can already do or assist, scored 0 to 10 from task-level ratings (Karpathy/BLS). High exposure means the work changes; it does not always mean fewer jobs.',
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

type TableDisplayRow =
  | { key: string; kind: 'orphan'; job: UnobviousJob }
  | { key: string; kind: 'occ'; occ: Occupation }

/** Sit orphans with accelerating adjacent jobs, never above a declining row. */
function tableDisplayRows(
  occupations: Occupation[],
  orphanJobs: UnobviousJob[],
  adjacentSocs: Set<string>,
): TableDisplayRow[] {
  const rows: TableDisplayRow[] = []
  let orphansPlaced = false
  const placeOrphans = () => {
    if (orphansPlaced) return
    orphansPlaced = true
    for (const job of orphanJobs) {
      rows.push({ key: `orphan-${job.title}`, kind: 'orphan', job })
    }
  }
  for (const occ of occupations) {
    if (momentumRank(occ) < 2) placeOrphans()
    rows.push({ key: occ.soc, kind: 'occ', occ })
    if (adjacentSocs.has(occ.soc) && momentumRank(occ) === 2) placeOrphans()
  }
  placeOrphans()
  return rows
}

function growthRate(occ: Occupation): number {
  return typeof occ.projectedGrowthRate === 'number' && !Number.isNaN(occ.projectedGrowthRate)
    ? occ.projectedGrowthRate
    : Number.NEGATIVE_INFINITY
}

const YOY_NOISE = 0.5

/** 2 = accelerating, 1 = flat, 0 = declining. Year-over-year employment wins over 10-year outlook. */
function momentumRank(occ: Occupation): 0 | 1 | 2 {
  const yoy = occ.yoyEmploymentChange
  if (typeof yoy === 'number' && !Number.isNaN(yoy)) {
    if (yoy > YOY_NOISE) return 2
    if (yoy < -YOY_NOISE) return 0
    return 1
  }
  const growth = growthRate(occ)
  if (growth === Number.NEGATIVE_INFINITY) return 1
  if (growth > 1) return 2
  if (growth < -1) return 0
  return 1
}

/** Positive if `a` is more accelerating than `b`. */
function compareMomentum(a: Occupation, b: Occupation): number {
  return momentumRank(a) - momentumRank(b)
}

/** Accelerating first, then BLS projected growth, then annual openings. */
function compareOpeningsRising(
  a: Occupation,
  b: Occupation,
  direction: SortDirection,
): number {
  const momentum = compareMomentum(a, b)
  if (momentum !== 0) return direction === 'asc' ? momentum : -momentum
  const ag = growthRate(a)
  const bg = growthRate(b)
  if (ag !== bg) return direction === 'asc' ? ag - bg : bg - ag
  return direction === 'asc'
    ? a.openPositions - b.openPositions
    : b.openPositions - a.openPositions
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
  if (field === 'openPositions') return growthRate(occ)
  const value = occ[field]
  return typeof value === 'number' || typeof value === 'string' ? value : null
}
