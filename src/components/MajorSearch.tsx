import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Major } from '../types'
import { useData } from '../data/DataContext'
import { searchMajors } from '../lib/majorSearch'
import { pathForCip, traditionalEntry } from '../lib/unobviousPaths'
import { useTheme } from '../lib/theme'

interface MajorSearchProps {
  majors: Major[]
  size?: 'lg' | 'md'
  autoFocus?: boolean
  /** Base path for results, e.g. `/results` or `/v2/results` */
  resultsBase?: string
  placeholder?: string
  /** Noun used in the empty-results line, e.g. "majors" or "degrees". */
  noMatchNoun?: string
  tone?: 'light' | 'dark'
}

export function MajorSearch({
  majors,
  size = 'lg',
  autoFocus = false,
  resultsBase = '/results',
  placeholder = 'Search your major',
  noMatchNoun = 'majors',
  tone,
}: MajorSearchProps) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { isDark } = useTheme()
  const { unobviousByCip, unobviousByCip4, unobviousByCip2, crosswalk, occupationsBySoc } = useData()
  const resolvedTone = tone ?? (isDark ? 'dark' : 'light')
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeRef = useRef(0)

  const results = useMemo(() => searchMajors(majors, query, 10), [majors, query])

  const emptyQuery = query.trim().length === 0
  const showList = open && !emptyQuery
  const hasResults = results.length > 0
  const showEmpty = showList && !hasResults

  useEffect(() => {
    if (!autoFocus) return
    // Don't steal focus / open the keyboard on phones
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (coarse) return
    inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    setActive(0)
    activeRef.current = 0
  }, [query])

  useEffect(() => {
    activeRef.current = active
  }, [active])

  function select(major: Major) {
    // Preserve the umbrella profile handoff so the signup gate can prefill it.
    navigate(`${resultsBase}/${major.cip}${search}`)
    setQuery(major.name)
    setOpen(false)
  }

  function submitActive() {
    const pick = results[activeRef.current] ?? results[0]
    if (pick) select(pick)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (results.length > 0) submitActive()
    else setOpen(true)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (emptyQuery) return
      if (!open) {
        setOpen(true)
        return
      }
      if (!hasResults) return
      setActive((i) => {
        const next = Math.min(i + 1, results.length - 1)
        activeRef.current = next
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!hasResults) return
      setActive((i) => {
        const next = Math.max(i - 1, 0)
        activeRef.current = next
        return next
      })
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const pad =
    size === 'lg'
      ? 'py-3.5 sm:py-4 text-base sm:text-lg pl-11 sm:pl-12 pr-4 min-h-12'
      : 'py-3 sm:py-2.5 text-base sm:text-sm pl-10 pr-3 min-h-11 sm:min-h-0'
  const iconLeft = size === 'lg' ? 'left-3.5 sm:left-4' : 'left-3'
  const activeOptionId = hasResults ? `${listId}-opt-${active}` : undefined

  return (
    <div
      ref={rootRef}
      className={`relative w-full ${size === 'lg' ? 'max-w-2xl' : ''}`}
    >
      <form onSubmit={onSubmit} className="relative">
        <svg
          className={`absolute ${iconLeft} top-1/2 -translate-y-1/2 text-muted pointer-events-none`}
          width={size === 'lg' ? 20 : 16}
          height={size === 'lg' ? 20 : 16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true)
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-lg border-2 bg-card text-ink placeholder:text-muted/70 focus:outline-none focus:border-ink focus:ring-0 transition-colors ${pad} ${
            resolvedTone === 'dark' ? 'border-border-bright' : 'border-ink'
          }`}
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={activeOptionId}
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
        />
      </form>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute z-40 mt-2 w-full max-h-[min(20rem,min(50vh,40dvh))] overflow-auto rounded-lg border border-border ${
            resolvedTone === 'dark' ? 'bg-surface' : 'bg-card'
          }`}
        >
          {hasResults ? (
            results.map((major, i) => {
              const alt = pathForCip(major.cip, unobviousByCip4, unobviousByCip2, unobviousByCip)
              const traditional = alt
                ? traditionalEntry(
                    alt,
                    major.cip,
                    major.name,
                    crosswalk,
                    occupationsBySoc,
                  )
                : undefined
              return (
              <li
                key={major.cip}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
              >
                <button
                  type="button"
                  onMouseEnter={() => {
                    setActive(i)
                    activeRef.current = i
                  }}
                  onClick={() => select(major)}
                  className={`w-full text-left px-4 py-3.5 sm:py-3 min-h-12 sm:min-h-0 rounded-md transition-colors ${
                    i === active ? 'bg-surface-hover text-ink' : 'text-ink hover:bg-surface-hover'
                  }`}
                >
                  <div className="font-semibold text-sm sm:text-base leading-snug">
                    {major.name}
                  </div>
                  <div className="text-xs text-muted mt-0.5 font-mono">
                    {major.category} · CIP {major.cip}
                  </div>
                  {alt ? (
                    <div className="text-xs text-ink mt-1">
                      New path · traditional: {traditional}
                    </div>
                  ) : null}
                </button>
              </li>
              )
            })
          ) : showEmpty ? (
            <li className="px-4 py-4 text-sm text-muted" role="presentation">
              No {noMatchNoun} match “{query.trim()}”. Try a broader term — e.g. Biology,
              Nursing, or Economics.
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
