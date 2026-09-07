import { useState, type FormEvent } from 'react'
import { LETTER_URL } from '../lib/letterUrl'

export type DigestSignupProps = {
  industry?: string
  role?: string
  focusAreas?: string[]
  sourceRef?: string
  /** Include this report URL in the welcome email (defaults to the current page). */
  includeReport?: boolean
}

type Status = 'idle' | 'sending' | 'sent' | 'skipped' | 'error'

function subscribeUrl(): string {
  return `${LETTER_URL}/api/subscribe`
}

function currentReportUrl(): string {
  if (typeof window === 'undefined') return ''
  const path = `${window.location.pathname}${window.location.search}`
  const configured = (
    import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined
  )?.replace(/\/$/, '')
  if (configured) return `${configured}${path}`
  const { origin } = window.location
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return `https://fieldreport.dearcc.org${path}`
  }
  return window.location.href.split('#')[0] ?? window.location.href
}

export function useLetterSubscribe({
  industry,
  role,
  focusAreas,
  sourceRef,
  includeReport = false,
}: DigestSignupProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const endpoint = subscribeUrl()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    if (!endpoint) {
      setStatus('error')
      setErrorMsg("Couldn't send this right now. Try again in a minute.")
      return
    }
    setStatus('sending')
    setErrorMsg(null)
    try {
      const reportUrl = includeReport ? currentReportUrl() : null
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          industry: industry ?? null,
          role: role ?? null,
          focusAreas: focusAreas ?? null,
          sourceRef: sourceRef ?? null,
          reportUrl,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        skipped?: string
        ok?: boolean
      }
      if (!res.ok) {
        throw new Error(data.error ?? `request failed (${res.status})`)
      }
      setStatus(data.skipped === 'already_enrolled' ? 'skipped' : 'sent')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return { email, setEmail, status, errorMsg, base: LETTER_URL, onSubmit }
}

type QuietEmailFormProps = {
  idPrefix?: string
  autoFocus?: boolean
} & ReturnType<typeof useLetterSubscribe>

/** Unbranded email + Send capture. Subscribes without naming the product. */
export function QuietEmailForm({
  idPrefix = 'report',
  autoFocus = false,
  email,
  setEmail,
  status,
  errorMsg,
  onSubmit,
}: QuietEmailFormProps) {
  if (status === 'sent' || status === 'skipped') {
    return (
      <p role="status" aria-live="polite" className="text-sm text-ink">
        {status === 'skipped' ? 'Already sent.' : 'Sent.'} Check {email} for the
        report — you are on the weekly list.
      </p>
    )
  }

  return (
    <div className="w-full max-w-md min-w-0">
      <form onSubmit={onSubmit} className="flex items-center gap-2.5">
        <label className="sr-only" htmlFor={`${idPrefix}-email`}>
          Email
        </label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          autoFocus={autoFocus}
          disabled={status === 'sending'}
          className="min-w-0 flex-1 rounded-lg border border-ink bg-transparent px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="shrink-0 rounded-lg bg-ink px-5 py-2.5 text-sm font-bold text-page disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : 'Send'}
        </button>
      </form>
      {status === 'error' && (
        <p role="alert" className="mt-2 text-sm text-negative">
          {errorMsg ?? 'Something went wrong. Try again in a minute.'}
        </p>
      )}
    </div>
  )
}

export function DigestSignup({
  industry,
  role,
  focusAreas,
  sourceRef,
}: DigestSignupProps) {
  const { email, setEmail, status, errorMsg, base, onSubmit } = useLetterSubscribe({
    industry,
    role,
    focusAreas,
    sourceRef,
  })

  return (
    <section id="next" className="mt-14 border-t border-border pt-12">
      <h2 className="font-sans text-2xl sm:text-3xl font-bold text-ink tracking-tight">
        NEXT
      </h2>
      <p className="mt-3 text-muted max-w-xl leading-relaxed">
        Sign up for our weekly updates to help you stay on top of the labor market. Get a
        15-minute Sunday email: real news, no slop, picks for your path, and one thing to
        build.
      </p>

      {status === 'sent' || status === 'skipped' ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-8 max-w-lg rounded-lg border border-border px-5 py-4 text-ink"
        >
          <p className="font-medium">
            {status === 'skipped' ? "You're already on the list." : "You're in."}
          </p>
          <p className="mt-1 text-sm text-muted">
            Check <span className="text-ink">{email}</span> for your first update.
          </p>
          {base && (
            <a
              href={base}
              className="mt-4 inline-flex w-full sm:w-auto justify-center rounded-lg bg-ink px-4 py-3 text-sm font-bold text-page hover:bg-primary hover:text-ink transition-colors min-h-11"
            >
              Open NEXT →
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg">
          <label className="sr-only" htmlFor="next-email">
            Email
          </label>
          <input
            id="next-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.edu"
            disabled={status === 'sending'}
            className="w-full min-w-0 flex-1 rounded-lg border-2 border-ink bg-card px-4 py-3.5 sm:py-3 text-base text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full sm:w-auto shrink-0 rounded-lg bg-ink px-5 py-3.5 sm:py-3 font-bold text-page hover:bg-primary hover:text-ink transition-colors min-h-11"
          >
            {status === 'sending' ? 'Sending…' : 'Sign up'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p role="alert" className="mt-3 text-sm text-negative">
          {errorMsg ?? 'Something went wrong. Try again in a minute.'}
        </p>
      )}
    </section>
  )
}
