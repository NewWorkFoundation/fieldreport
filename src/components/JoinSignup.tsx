import { useId, useState, type FormEvent } from 'react'
import { SUBSCRIBE_URL } from '../lib/subscribe'

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

function normalizeLinkedIn(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
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
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [linkedin, setLinkedin] = useState('')
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

    try {
      await fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mail,
          firstName: first,
          lastName: last,
          name: `${first} ${last}`,
          linkedin: normalizeLinkedIn(linkedin),
          linkedinUrl: normalizeLinkedIn(linkedin),
          sourceRef,
          reportUrl: reportUrl(),
        }),
      })
    } catch {
      /* persist is best-effort; never block the gate on mail delivery */
    }
    onComplete()
  }

  const sending = status === 'sending'

  return (
    <div
      className="w-full max-w-[28rem] rounded-xl bg-white p-8 shadow-lg sm:p-10"
      style={{ colorScheme: 'light' }}
    >
      <h1
        id={`${id}-title`}
        className="font-sans text-3xl font-bold tracking-tight text-black sm:text-[2rem]"
      >
        Join dearCC
      </h1>
      <p id={`${id}-copy`} className="mt-2 text-[15px] leading-relaxed text-[#5c5c5c]">
        Sign up to view the results, it is completely free!
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
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
        <Field
          id={`${id}-email`}
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={setEmail}
          disabled={sending}
        />
        <Field
          id={`${id}-linkedin`}
          label="LinkedIn profile URL"
          autoComplete="url"
          inputMode="url"
          placeholder="https://linkedin.com/in/..."
          value={linkedin}
          onChange={setLinkedin}
          disabled={sending}
          required={false}
        />

        <button
          type="submit"
          disabled={sending}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-[#ff5a3d] px-4 py-3.5 text-base font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {sending ? 'Creating account…' : 'Create my account →'}
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
        className="mb-1.5 block text-[13px] font-semibold text-[#3a3a3a]"
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
        className="w-full rounded-md border border-[#d4d4d4] bg-white px-3 py-2.5 text-[15px] text-black placeholder:text-[#9a9a9a] outline-none transition-colors focus:border-black disabled:opacity-60"
      />
    </div>
  )
}
