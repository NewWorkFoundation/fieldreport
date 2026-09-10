import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DocumentMeta } from '../components/DocumentMeta'
import { useData } from '../data/DataContext'
import { formatNumber, formatSalary, sentenceCase } from '../lib/format'
import { useAppPaths } from '../lib/useAppPaths'
import type { Occupation } from '../types'

const GAMEPLAN_URL = (
  (import.meta.env.VITE_GAMEPLAN_URL as string | undefined) ?? 'https://gameplan.dearcc.org'
).replace(/\/+$/, '')

function exposureLabel(value: number | null) {
  if (value == null) return 'Not available'
  if (value < 3.5) return 'Low'
  if (value < 6) return 'Moderate'
  if (value < 8) return 'High'
  return 'Very high'
}

export function RoleReportPage() {
  const { occupations, aiImpactBySoc, loading, error } = useData()
  const { mapBase } = useAppPaths()
  const [params] = useSearchParams()
  const fromChecklist = params.get('checklist') === '1'
  const selected = useMemo(() => params.getAll('roleSoc').map((soc) => occupations.find((role) => role.soc === soc)).filter((role): role is Occupation => Boolean(role)).slice(0, 3), [occupations, params])
  const gameplanHref = useMemo(() => {
    const next = new URLSearchParams(params)
    next.delete('roleSoc')
    next.delete('role')
    const profileRoles = (next.get('profileRoles') ?? '').split(';').map((role) => role.trim()).filter(Boolean)
    next.delete('profileRoles')
    const combinedRoles = [...profileRoles, ...selected.map((role) => sentenceCase(role.title))]
      .filter((role, index, roles) => roles.findIndex((candidate) => candidate.toLowerCase() === role.toLowerCase()) === index)
      .slice(0, 6)
    next.set('roles', combinedRoles.join(';'))
    return `${GAMEPLAN_URL}/?${next.toString()}`
  }, [params, selected])

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-muted">Loading your report…</div>
  if (!selected.length && params.has('roleSoc') && error) return <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center"><h1 className="text-3xl font-bold text-ink">Your saved report is still here</h1><p className="mt-3 text-muted">The role catalog didn’t finish loading. Retry without choosing your roles again.</p><button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-bold text-white">Retry report →</button></main>
  if (!selected.length) return <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center"><h1 className="text-3xl font-bold text-ink">Choose roles for your report</h1><p className="mt-3 text-muted">Your report needs at least one target role.</p><Link to={`/v3/roles?${params.toString()}`} className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-bold text-white no-underline">Choose roles →</Link></main>

  const first = selected[0]
  const bestOpenings = [...selected].sort((a, b) => b.openPositions - a.openPositions)[0]
  const bestGrowth = [...selected].sort((a, b) => (b.projectedGrowthRate ?? -Infinity) - (a.projectedGrowthRate ?? -Infinity))[0]

  return (
    <div>
      <DocumentMeta title="Your field report" description="A market comparison of your ranked target roles." />
      <section className="results-hero"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link to={`/v3/roles?${params.toString()}`} className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink">← Edit roles</Link>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-coral">Your field report</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-ink sm:text-5xl">How your target roles compare</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">Your ranking leads with {sentenceCase(first.title)}. The data below shows where demand, pay, growth, and AI exposure strengthen or challenge that choice.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2"><Insight label="Most annual openings" value={sentenceCase(bestOpenings.title)} detail={`${formatNumber(bestOpenings.openPositions)} openings per year`} /><Insight label="Strongest projected growth" value={sentenceCase(bestGrowth.title)} detail={`${(bestGrowth.projectedGrowthRate ?? 0).toFixed(1)}% projected growth through 2034`} /></div>
      </div></section>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <ol className="space-y-4">{selected.map((role, index) => {
          const impact = aiImpactBySoc.get(role.soc)
          return <li key={role.soc} className="rounded-xl border border-border bg-card p-4 sm:p-6"><div className="flex items-start gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-bold text-black">{index + 1}</span>
            <div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><h2 className="text-xl font-bold text-ink sm:text-2xl">{sentenceCase(role.title)}</h2><p className="mt-1 font-mono text-xs text-muted">SOC {role.soc}</p></div><Link to={`${mapBase}/${role.soc}`} className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-2 hover:text-coral">View market map →</Link></div>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-border pt-5 sm:grid-cols-4"><Metric label="Entry salary" value={formatSalary(role.entrySalary)} /><Metric label="Annual openings" value={formatNumber(role.openPositions)} /><Metric label="Projected growth" value={`${(role.projectedGrowthRate ?? 0).toFixed(1)}%`} /><Metric label="AI exposure" value={exposureLabel(role.karpathyExposure)} detail={impact?.flag} /></dl>
            </div>
          </div></li>
        })}</ol>
        <section className="mt-8 border-t border-border pt-8">
          {fromChecklist ? <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-coral">Next checklist step</p> : null}
          <h2 className="mt-2 text-2xl font-bold text-ink">{fromChecklist ? 'Build your game plan' : 'Turn the comparison into a plan'}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Game Plan will start with these ranked roles, so you can focus your positioning and next actions.</p>
          <a href={gameplanHref} className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg bg-black px-6 text-sm font-bold text-white no-underline hover:bg-coral hover:text-black">Build your game plan →</a>
        </section>
      </main>
    </div>
  )
}

function Insight({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-lg border border-border-bright p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p><strong className="mt-2 block text-base text-ink">{value}</strong><p className="mt-1 text-xs text-muted">{detail}</p></div> }
function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) { return <div><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</dt><dd className="mt-1 text-base font-bold text-ink">{value}</dd>{detail ? <dd className="mt-1 text-[11px] text-muted">{detail}</dd> : null}</div> }
