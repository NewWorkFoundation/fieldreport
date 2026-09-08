import { useId, useMemo, useState } from 'react'
import type { Occupation } from '../types'
import { sentenceCase } from '../lib/format'

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function RoleRanker({ occupations, selected, onChange, max = 3, autoFocus = false }: {
  occupations: Occupation[]
  selected: Occupation[]
  onChange: (roles: Occupation[]) => void
  max?: number
  autoFocus?: boolean
}) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const matches = useMemo(() => {
    const needle = normalize(query)
    if (!needle) return []
    const terms = needle.split(' ')
    return occupations
      .filter((role) => !selected.some((item) => item.soc === role.soc))
      .map((role) => {
        const title = normalize(role.title)
        const priority = title === needle ? 0 : title.startsWith(needle) ? 1 : 2
        return { role, priority, matches: terms.every((term) => title.includes(term)) }
      })
      .filter((item) => item.matches)
      .sort((a, b) => a.priority - b.priority || a.role.title.length - b.role.title.length)
      .slice(0, 8)
      .map((item) => item.role)
  }, [occupations, query, selected])

  function add(role: Occupation) {
    onChange([...selected, role].slice(0, max))
    setQuery('')
    setOpen(false)
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= selected.length) return
    const next = [...selected]
    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
    onChange(next)
  }

  return (
    <div>
      {selected.length > 0 ? (
        <ol className="space-y-2" aria-label="Ranked target roles">
          {selected.map((role, index) => (
            <li key={role.soc} className="grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-white px-3 py-2 text-black">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-coral text-xs font-bold">{index + 1}</span>
              <span className="min-w-0"><strong className="block text-sm leading-snug">{sentenceCase(role.title)}</strong><span className="font-mono text-[10px] text-[#6b6b6b]">SOC {role.soc}</span></span>
              <span className="flex gap-1">
                <RankButton label={`Move ${role.title} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</RankButton>
                <RankButton label={`Move ${role.title} down`} disabled={index === selected.length - 1} onClick={() => move(index, 1)}>↓</RankButton>
                <RankButton label={`Remove ${role.title}`} onClick={() => onChange(selected.filter((item) => item.soc !== role.soc))}>×</RankButton>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      {selected.length < max ? (
        <div className="relative mt-3">
          <label htmlFor={`${listId}-input`} className="mb-1.5 block text-[13px] font-bold text-ink">{selected.length ? 'Add another role' : 'Search all Field Report roles'}</label>
          <input id={`${listId}-input`} type="text" role="combobox" value={query} autoFocus={autoFocus} onChange={(event) => { setQuery(event.target.value); setOpen(true) }} onFocus={() => { if (query) setOpen(true) }} placeholder="Product manager, accountant, developer…" autoComplete="off" aria-label="Search target roles" aria-expanded={open && matches.length > 0} aria-controls={listId} className="w-full rounded-lg border-2 border-ink bg-white px-3 py-3 text-base text-black outline-none placeholder:text-[#8a8a8a] focus:border-coral" />
          {open && matches.length > 0 ? (
            <ul id={listId} role="listbox" className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-white p-1.5 shadow-xl">
              {matches.map((role) => (
                <li role="option" aria-selected="false" key={role.soc}><button type="button" onClick={() => add(role)} className="flex min-h-12 w-full flex-col justify-center rounded-md px-3 py-2 text-left text-black hover:bg-[#f1f1f1] focus:bg-[#f1f1f1] focus:outline-none"><strong className="text-sm leading-snug">{sentenceCase(role.title)}</strong><span className="mt-0.5 font-mono text-[10px] text-[#6b6b6b]">SOC {role.soc}</span></button></li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function RankButton({ label, disabled = false, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: string }) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-base text-[#5c5c5c] hover:bg-[#f1f1f1] hover:text-black focus-visible:outline-2 focus-visible:outline-black disabled:opacity-25">{children}</button>
}
