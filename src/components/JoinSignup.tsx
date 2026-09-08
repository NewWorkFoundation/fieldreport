import { useId, useState, type FormEvent } from 'react'
import { LETTER_URL } from '../lib/letterUrl'

export const V2_SIGNUP_KEY = 'fr-v2-signup'
export const V3_SIGNUP_KEY = 'fr-v3-signup'

export function hasSignup(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function markSignup(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
}

function reportUrl(): string {
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

function linkedinSlug(raw: string): string {
  return raw.trim().replace(/^https?:\/\/(?:www\.)?linkedin\.com\/in\//i, '').replace(/^linkedin\.com\/in\//i, '').replace(/^\/+|\/+$/g, '')
}

function normalizeLinkedIn(raw: string): string | null {
  const slug = linkedinSlug(raw)
  return slug ? `https://www.linkedin.com/in/${slug}` : null
}

/** Shared Join dearCC card used by `/v2` interstitial and `/v3` modal. */
export function JoinSignupCard({
  sourceRef,
  onComplete,
}: {
  sourceRef: string
  onComplete: () => void
}) {
  const id = useId()
  const handoff = new URLSearchParams(
    typeof window === 'undefined' ? '' : window.location.search,
  )
  const existingProfile = Boolean(handoff.get('leadId'))
  const [firstName, setFirstName] = useState(() => handoff.get('first') ?? '')
  const [lastName, setLastName] = useState(() => handoff.get('last') ?? '')
  const [email, setEmail] = useState(() => handoff.get('email') ?? '')
  const [linkedin, setLinkedin] = useState(() => linkedinSlug(handoff.get('linkedin') ?? ''))
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const first = firstName.trim()
    const last = lastName.trim()
    const mail = email.trim()
    if (!first || !last || !mail) return

    setStatus('sending')
    setErrorMsg(null)

    // The umbrella signup already created the account and weekly subscription.
    // This confirmation only unlocks the generated Field Report; the gate then
    // records completion back on that canonical profile.
    if (existingProfile) {
      onComplete()
      return
    }

    const endpoint = `${LETTER_URL}/api/subscribe`
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mail,
          firstName: first,
          lastName: last,
          name: `${first} ${last}`,
          linkedin: normalizeLinkedIn(linkedin),
          sourceRef,
          reportUrl: reportUrl(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error ?? `request failed (${res.status})`)
      }
    } catch (err) {
      if (err instanceof TypeError) {
        onComplete()
        return
      }
      setStatus('error')
      setErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      )
      return
    }
    onComplete()
  }

  const sending = status === 'sending'

  return (
    <div
      className="w-full max-w-[28rem] rounded-xl bg-white p-6 shadow-lg sm:p-8"
      style={{ colorScheme: 'light' }}
    >
      <h1
        id={`${id}-title`}
        className="text-center font-sans text-3xl font-bold tracking-tight text-black"
      >
        Join dearCC
      </h1>
      <p id={`${id}-copy`} className="mx-auto mt-2 max-w-[34ch] text-center text-[15px] leading-relaxed text-[#5c5c5c]">
        Create one free profile to save this report and continue to your game plan.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-3">
        <div className="overflow-hidden rounded-xl bg-[#f1f1f1]">
        <div className="grid grid-cols-2 gap-3 border-b border-black/10 px-4 py-3.5">
          <Field
            id={`${id}-first`}
            label="First name"
            autoComplete="given-name"
            value={firstName}
            onChange={setFirstName}
            disabled={sending}
          />
          <Field
            id={`${id}-last`}
            label="Last name"
            autoComplete="family-name"
            value={lastName}
            onChange={setLastName}
            disabled={sending}
          />
        </div>
        <div className="border-b border-black/10 px-4 py-3.5"><Field
          id={`${id}-email`}
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={setEmail}
          disabled={sending}
        /></div>
        <div className="px-4 py-3.5">
          <label htmlFor={`${id}-linkedin`} className="mb-1.5 block text-[13px] font-semibold text-black">LinkedIn profile <span className="font-normal text-[#5c5c5c]">(optional)</span></label>
          <div className="flex items-baseline text-[15px] text-[#5c5c5c]">
            <span aria-hidden>linkedin.com/in/</span>
            <input id={`${id}-linkedin`} name={`${id}-linkedin`} type="text" value={linkedin} onChange={(event) => setLinkedin(event.target.value)} disabled={sending} placeholder="your-profile" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-black outline-none placeholder:text-[#9a9a9a] disabled:opacity-60" />
          </div>
        </div>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="flex w-full items-center justify-center rounded-lg bg-black px-4 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#ff5a3d] hover:text-black disabled:opacity-60"
        >
          {sending
            ? existingProfile ? 'Opening report…' : 'Creating account…'
            : existingProfile ? 'View my report →' : 'Create my account →'}
        </button>
      </form>

      {status === 'error' && (
        <p role="alert" className="mt-3 text-sm text-[#ff5a3d]">
          {errorMsg ?? 'Something went wrong. Try again in a minute.'}
        </p>
      )}
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  inputMode,
  placeholder,
  disabled,
  required = true,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  inputMode?: 'email' | 'url' | 'text'
  placeholder?: string
  disabled?: boolean
  required?: boolean
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-[13px] font-semibold text-black"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full border-0 bg-transparent p-0 text-[15px] text-black placeholder:text-[#9a9a9a] outline-none disabled:opacity-60"
      />
    </div>
  )
}
