import { FieldReportSignupPrompt } from '../../components/FieldReportSignupPrompt'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { BrandMark } from '../../components/BrandMark'
import { DocumentMeta } from '../../components/DocumentMeta'
import { MajorSearch } from '../../components/MajorSearch'
import { useData } from '../../data/DataContext'
import { formatNumber } from '../../lib/format'
import { useAppPaths } from '../../lib/useAppPaths'
import { fetchLiveFieldReport, loadPlaces } from '../../lib/v3/data'
import type { FieldReport } from '../../lib/v3/types'
import { EmployerTable } from './EmployerTable'

export function V3HomePage() {
  const { majors, loading, error } = useData()
  const { resultsBase } = useAppPaths()

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 sm:pt-24 pb-16 sm:pb-20">
      <DocumentMeta title="Field Report v3 — Employers" />
      <div className="text-center max-w-3xl mx-auto">
        <BrandMark size="lg" as="h1" variant="dearcc" />
        <p className="mt-5 sm:mt-6 text-lg sm:text-2xl text-ink/70 font-light leading-snug px-1">
          Who hires your major — where you live
        </p>
        <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted max-w-xl mx-auto leading-relaxed">
          Rated early-career employers, five-year pathways, and whether AI is
          closing the door — powered by AOI / WYWM data.
        </p>
        <p className="mt-3 text-xs font-mono uppercase tracking-wider text-muted">
          v3 employer layer
        </p>
      </div>

      <div className="mt-8 sm:mt-12 flex justify-center">
        {loading ? (
          <p className="text-muted">Loading data…</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <MajorSearch
            majors={majors}
            size="lg"
            autoFocus
            resultsBase={resultsBase}
            placeholder="Search a major…"
          />
        )}
      </div>

      <p className="mt-10 text-center text-sm text-muted max-w-lg mx-auto leading-relaxed">
        Pick any U.S. major, then a ZIP. Employer ratings and pathways load live
        from AOI / WYWM for that field and metro.
      </p>
    </div>
  )
}

export function V3ZipPromptPage() {
  const { cipCode = '' } = useParams()
  const navigate = useNavigate()
  const { resultsBase, home } = useAppPaths()
  const { majors } = useData()
  const [zip, setZip] = useState('')
  const [places, setPlaces] = useState<{ zip: string; cbsaName: string }[]>([])
  const [zipError, setZipError] = useState(false)

  const major = majors.find((m) => m.cip === cipCode)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const p = await loadPlaces()
      if (cancelled) return
      setPlaces(
        p.filter((x) => x.seed).map((x) => ({ zip: x.zip, cbsaName: x.cbsaName })),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const cleaned = zip.replace(/\D/g, '').slice(0, 5)
    if (!/^\d{5}$/.test(cleaned)) {
      setZipError(true)
      return
    }
    setZipError(false)
    navigate(`${resultsBase}/${cipCode}/${cleaned}`)
  }

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 pt-8 sm:pt-16 pb-20">
      <DocumentMeta
        title={
          major
            ? `${major.name} — pick a metro`
            : 'Pick a metro — Field Report'
        }
      />
      <BackLink to={`${resultsBase}/${cipCode}`}>← Back to major</BackLink>
      <h1 className="font-sans font-bold tracking-tight text-3xl sm:text-4xl text-ink leading-tight">
        {major?.name || cipCode}
      </h1>
      <p className="mt-3 text-muted leading-relaxed">
        Enter a ZIP so we can show employers hiring people with your degree in
        that metro. Any U.S. ZIP works — major metros resolve to CBSA hiring;
        others fall back to nationwide rated employers.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col sm:flex-row gap-3">
        <label className="sr-only" htmlFor="zip">
          ZIP code
        </label>
        <input
          id="zip"
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="\d{5}"
          maxLength={5}
          value={zip}
          onChange={(e) => {
            setZip(e.target.value.replace(/\D/g, '').slice(0, 5))
            setZipError(false)
          }}
          aria-invalid={zipError}
          className={`flex-1 min-h-12 rounded-xl border bg-card px-4 font-mono tracking-wider text-base ${
            zipError ? 'border-negative' : 'border-border'
          }`}
          placeholder="ZIP code"
        />
        <button
          type="submit"
          className="min-h-12 px-6 rounded-lg bg-ink text-white font-bold hover:bg-primary hover:text-ink"
        >
          See employers
        </button>
      </form>
      {zipError ? (
        <p className="mt-2 text-sm text-negative">Enter a 5-digit U.S. ZIP.</p>
      ) : null}

      <div className="mt-8">
        <p className="text-xs uppercase tracking-wider text-muted mb-2">
          Seed metros
        </p>
        <ul className="flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-none snap-x snap-proximity -mx-4 px-4 pb-1">
          {places.map((p) => (
            <li key={p.zip} className="snap-start shrink-0">
              <button
                type="button"
                onClick={() => navigate(`${resultsBase}/${cipCode}/${p.zip}`)}
                className="text-sm min-h-12 px-3 rounded-xl border border-border bg-card text-ink hover:border-border-bright inline-flex flex-col justify-center min-w-[7.25rem]"
              >
                <span className="font-medium leading-tight">
                  {p.cbsaName.split('-')[0].split(',')[0].trim()}
                </span>
                <span className="font-mono text-[11px] text-muted mt-0.5">{p.zip}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-sm text-muted">
        <Link to={home} className="underline hover:text-ink">
          ← Field Report home
        </Link>
      </p>
    </div>
  )
}

export function V3ResultsPage() {
  const { cipCode = '', zip = '' } = useParams()
  const { resultsBase, home, receipts, isV2, isV3 } = useAppPaths()
  const { majors } = useData()
  const [report, setReport] = useState<FieldReport | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const majorName = majors.find((m) => m.cip === cipCode)?.name

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setStatus('loading')
      setReport(null)
      setError(null)
      try {
        if (!/^\d{2}\.\d{4}$/.test(cipCode) || !/^\d{5}$/.test(zip)) {
          setStatus('error')
          setError('Use a CIP code and a 5-digit U.S. ZIP.')
          return
        }
        const data = await fetchLiveFieldReport(cipCode, zip)
        if (!cancelled) {
          setReport(data)
          setStatus('ready')
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load')
          setStatus('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cipCode, zip])

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <p className="text-muted">Building your employer report from AOI…</p>
        <p className="mt-2 text-sm text-muted">
          Resolving occupations, metro hiring, pathways, and AI door flags.
        </p>
      </div>
    )
  }

  if (status === 'error' || !report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <BackLink to={`${resultsBase}/${cipCode}/place`}>← Change metro</BackLink>
        <h1 className="font-sans font-bold tracking-tight text-2xl text-ink">Could not build this report</h1>
        <p className="mt-3 text-negative">{error || 'Unknown error'}</p>
        <p className="mt-4 text-sm text-muted leading-relaxed">
          Try another ZIP, or open a seed metro demo:{' '}
          <Link to={`${resultsBase}/11.0701/94402`} className="text-ink underline underline-offset-2">
            Computer Science · 94402
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 sm:pt-12 pb-8">
      {!isV2 && <FieldReportSignupPrompt key={`${cipCode}:${zip}`} context={{ version: isV3 ? 'v3' : 'public', cip: cipCode, major: majorName || report.cip.title, zip, roles: [] }} />}
      <DocumentMeta
        title={`${majorName || report.cip.title} in ${report.place.cbsaName}`}
      />
      <BackLink to={`${resultsBase}/${cipCode}/place`}>← Change metro</BackLink>

      <header className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          {report.cip.code} · {report.place.zip}
        </p>
        <h1 className="mt-2 font-sans font-bold tracking-tight text-3xl sm:text-5xl text-ink leading-tight">
          {majorName || report.cip.title}
        </h1>
        <p className="mt-3 text-lg text-ink/70">
          Employers hiring people with your degree in {report.place.cbsaName}
        </p>
      </header>

      <Funnel funnel={report.funnel} />

      <EmployerTable report={report} resultsBase={resultsBase} />

      <FiveYearsOut report={report} />

      <DoorSection report={report} />

      <FeedbackDock cip={report.cip.code} zip={report.place.zip} />

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link
          to={receipts}
          className="min-h-11 inline-flex items-center text-ink underline underline-offset-2 hover:text-primary"
        >
          How to read this report
        </Link>
        <Link to={home} className="min-h-11 inline-flex items-center text-muted hover:text-ink">
          Home
        </Link>
        {report.source?.builtAt ? (
          <span className="font-mono text-xs text-muted">
            Built {new Date(report.source.builtAt).toLocaleString()}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function Funnel({
  funnel,
}: {
  funnel: FieldReport['funnel']
}) {
  const max = Math.max(funnel.ratedInField, funnel.hiringHere, 1)
  const bars = [
    { label: 'Rated in your field', value: funnel.ratedInField, accent: false },
    { label: 'Hiring in your metro', value: funnel.hiringHere, accent: true },
  ]
  return (
    <section className="mt-10 max-w-3xl">
      <h2 className="font-sans font-bold tracking-tight text-2xl text-ink">The funnel</h2>
      <p className="mt-1 text-sm text-muted">
        Share this: how rated employers in your field narrow to those hiring near
        you.
      </p>
      <ul className="mt-6 space-y-4">
        {bars.map((b) => (
          <li key={b.label}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted">{b.label}</span>
              <span
                className={`font-mono tabular-nums ${
                  b.accent ? 'text-primary font-medium' : 'text-ink'
                }`}
              >
                {formatNumber(b.value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface overflow-hidden">
              <div
                className={`h-full rounded-full motion-safe:transition-all ${
                  b.accent ? 'bg-primary' : 'bg-ink/25'
                }`}
                style={{ width: `${Math.max(4, (b.value / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function FiveYearsOut({ report }: { report: FieldReport }) {
  return (
    <section className="mt-14 max-w-3xl">
      <h2 className="font-sans font-bold tracking-tight text-2xl sm:text-3xl text-ink">Five years out</h2>
      <p className="mt-2 text-muted leading-relaxed">
        Where people in these fields move next — and whether they stay or leave
        to move up.
      </p>
      <ul className="mt-6 space-y-6">
        {report.groups.map((g) => (
          <li key={g.id} className="border-t border-border pt-5">
            <h3 className="font-sans font-bold tracking-tight text-xl text-ink">{g.displayName}</h3>
            <p className="text-sm text-muted mt-1">{g.displayBlurb}</p>
            {g.promotion ? (
              <p className="mt-3 text-ink/90 leading-relaxed">
                <strong className="font-medium">{g.displayName}.</strong>{' '}
                {g.promotion.internalPct}% move up without changing employer.{' '}
                {g.promotion.externalPct}% have to leave to move up.{' '}
                <span className="text-muted">{g.promotion.verdict}</span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Promotion split not available for this group at this metro size.
              </p>
            )}
            {g.destinations?.length ? (
              <p className="mt-2 text-sm text-muted">
                Common next roles:{' '}
                {g.destinations.map((d) => d.name).join(' · ')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function DoorSection({ report }: { report: FieldReport }) {
  return (
    <section className="mt-14 max-w-3xl">
      <h2 className="font-sans font-bold tracking-tight text-2xl sm:text-3xl text-ink">The Door</h2>
      <p className="mt-2 text-muted leading-relaxed">
        Whether AI is changing entry — without calling anything risk or safe.
      </p>
      <ul className="mt-6 space-y-5">
        {report.door.map((d) => (
          <li key={d.groupId} className="rounded-xl border border-border bg-card px-5 py-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted">
              {d.groupName}
            </p>
            <h3 className="mt-1 font-sans font-bold tracking-tight text-xl text-ink">
              {d.heading || 'Mixed picture'}
            </h3>
            <p className="mt-2 text-ink/80 leading-relaxed">
              {d.body || 'Trends vary across roles in this group.'}
            </p>
            <a
              href="#employers"
              className="inline-flex mt-3 text-sm text-ink underline underline-offset-2 min-h-11 items-center"
            >
              See who is still hiring →
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

const FEEDBACK = [
  'Nine is too few',
  'Show pay per company',
  'Let me compare cities',
  "I don't trust the ratings",
] as const

function FeedbackDock({ cip, zip }: { cip: string; zip: string }) {
  const [sent, setSent] = useState<string | null>(null)
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem('fr-feedback-hide') === '1'
    } catch {
      return false
    }
  })

  if (hidden) return null

  async function send(choice: string) {
    const payload = { cip, zip, choice, at: new Date().toISOString() }
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('feedback failed')
      setSent(choice)
    } catch {
      try {
        const prev = JSON.parse(localStorage.getItem('fr-v3-feedback') || '[]')
        prev.push(payload)
        localStorage.setItem('fr-v3-feedback', JSON.stringify(prev.slice(-50)))
        setSent(choice)
      } catch {
        /* ignore */
      }
    }
  }

  function dismiss() {
    setHidden(true)
    try {
      sessionStorage.setItem('fr-feedback-hide', '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-10 mb-4 rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs text-muted">Quick feedback</p>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-muted hover:text-ink min-h-10 px-2"
          aria-label="Dismiss feedback"
        >
          Dismiss
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-none pb-0.5 -mx-3 px-3">
        {FEEDBACK.map((c) => (
          <button
            key={c}
            type="button"
            disabled={sent != null}
            onClick={() => send(c)}
            className={`shrink-0 text-sm min-h-11 px-3 rounded-full border whitespace-nowrap ${
              sent === c
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted hover:text-ink'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {sent ? (
        <p className="mt-2 text-xs text-muted">Thanks — noted.</p>
      ) : null}
    </div>
  )
}
