import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DocumentMeta } from '../components/DocumentMeta'
import { RoleRanker } from '../components/RoleRanker'
import { useData } from '../data/DataContext'
import type { Occupation } from '../types'

export function RolePickerPage() {
  const { occupations, loading, error } = useData()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Occupation[]>([])

  useEffect(() => {
    if (!occupations.length || selected.length) return
    const saved = params.getAll('roleSoc').map((soc) => occupations.find((role) => role.soc === soc)).filter((role): role is Occupation => Boolean(role))
    if (saved.length) setSelected(saved.slice(0, 3))
  }, [occupations, params, selected.length])

  function continueToReport() {
    if (!selected.length) return
    const next = new URLSearchParams(params)
    next.delete('roleSoc')
    next.delete('role')
    for (const role of selected) {
      next.append('roleSoc', role.soc)
      next.append('role', role.title)
    }
    navigate(`/v3/roles/report?${next.toString()}`)
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl flex-col justify-center px-4 py-16 sm:px-6">
      <DocumentMeta title="Choose your roles" description="Rank the roles you want Field Report to evaluate." />
      <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-coral">Evaluate your field</p>
      <h1 className="text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">Which roles are you considering?</h1>
      <p className="mx-auto mt-3 max-w-md text-center text-[15px] leading-relaxed text-muted">Choose up to three. Put your first choice at the top and we’ll compare the market for each one.</p>
      <section className="mt-8 rounded-xl bg-surface p-4 sm:p-5" aria-label="Rank target roles">
        {loading ? <p className="py-6 text-center text-sm text-muted">Loading Field Report roles…</p> : null}
        {error ? <p className="py-6 text-center text-sm text-negative">We couldn’t load the role catalog. Try again.</p> : null}
        {!loading && !error ? <RoleRanker occupations={occupations} selected={selected} onChange={setSelected} autoFocus /> : null}
      </section>
      <button type="button" onClick={continueToReport} disabled={!selected.length} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-black px-5 text-sm font-bold text-white hover:bg-coral hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-35">Compare {selected.length || ''} {selected.length === 1 ? 'role' : 'roles'} <span aria-hidden>→</span></button>
      <p className="mt-3 text-center text-xs text-muted">Your ranking is saved to your dearCC profile.</p>
    </main>
  )
}
