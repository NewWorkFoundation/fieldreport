import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { trackFieldReport } from '../lib/analytics'
import { DEARCC_URL, getDearccProfile } from '../lib/dearccProfile'
import { useFieldReportProfileProgress } from '../lib/profileProgress'
import { BrandMark } from './BrandMark'
import { hasSignup, V2_SIGNUP_KEY, V3_SIGNUP_KEY } from './JoinSignup'
import { gamePlanSignupUrl, type ReportSignupContext } from '../lib/gamePlanSignup'

const PROMPT_KEY = 'fr-signup-prompt-seen'
// Retain dismissal across SPA navigation even when browser storage is unavailable.
let seenThisSession = false

function hasSeenPrompt() {
  try { return seenThisSession || sessionStorage.getItem(PROMPT_KEY) === '1' }
  catch { return seenThisSession }
}

type DismissVia = 'close' | 'continue' | 'escape' | 'backdrop'

/** Mount only with usable report content, never on loading, empty, or error screens. */
export function FieldReportSignupPrompt({ context }: { context: ReportSignupContext }) {
  const { version } = context
  const [open, setOpen] = useState(false)
  const [member, setMember] = useState(false)
  const [alreadyRecorded, setAlreadyRecorded] = useState(false)
  const [checking, setChecking] = useState(true)
  const [previousSignup] = useState(() => hasSignup(V3_SIGNUP_KEY) || hasSignup(V2_SIGNUP_KEY))
  const dialogRef = useRef<HTMLDialogElement>(null)
  const viewed = useRef(false)

  useEffect(() => {
    let cancelled = false
    void getDearccProfile().then(profile => {
      if (cancelled) return
      setMember(Boolean(profile))
      setAlreadyRecorded(profile?.fieldReportCompleted === true)
    }).catch(() => undefined).finally(() => {
      if (!cancelled) setChecking(false)
    })
    return () => { cancelled = true }
  }, [])

  useFieldReportProfileProgress((member || previousSignup) && !checking && !alreadyRecorded)

  useEffect(() => {
    if (viewed.current) return
    viewed.current = true
    trackFieldReport('field_report_viewed', { version })
  }, [version])

  useEffect(() => {
    if (checking || member || previousSignup || hasSeenPrompt()) return
    const startY = window.scrollY
    let hasScrolled = false
    let hasRead = false
    let shown = false
    const maybeShow = () => {
      if (shown || !hasRead || !hasScrolled || document.visibilityState !== 'visible' || hasSeenPrompt()) return
      shown = true
      seenThisSession = true
      try { sessionStorage.setItem(PROMPT_KEY, '1') } catch { /* In-memory fallback above. */ }
      trackFieldReport('field_report_signup_prompt_viewed', { version })
      setOpen(true)
    }
    const onScroll = () => {
      if (window.scrollY - startY >= 160) hasScrolled = true
      maybeShow()
    }
    const timer = window.setTimeout(() => { hasRead = true; maybeShow() }, 2500)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [checking, member, previousSignup, version])

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  function dismiss(dismissVia: DismissVia) {
    trackFieldReport('field_report_signup_prompt_dismissed', { version, dismissVia })
    setOpen(false)
  }

  if (!open) return null

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="report-signup-title"
      aria-describedby="report-signup-description"
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[30rem] overflow-y-auto rounded-2xl border border-black/10 bg-[#fffdf9] p-0 text-[#111] shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm"
      style={{ colorScheme: 'light' }}
      onCancel={event => { event.preventDefault(); dismiss('escape') }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return
        const controls = event.currentTarget.querySelectorAll<HTMLElement>('button, a[href]')
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss('backdrop')
      }}
    >
      <div className="relative p-6 sm:p-9">
        <button
          type="button"
          autoFocus
          aria-label="Close signup prompt"
          onClick={() => dismiss('close')}
          className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full text-[#626262] hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
        <div className="pr-6"><BrandMark forceLight compact /></div>
        <h2 id="report-signup-title" className="mt-7 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Let’s get you hired.</h2>
        <p id="report-signup-description" className="mt-4 text-base leading-relaxed text-[#555]">Join a community of mentors and peers, get a personalized game plan, and stay current with AI in your field.</p>
        <a
          href={gamePlanSignupUrl(DEARCC_URL, context)}
          onClick={() => trackFieldReport('field_report_signup_prompt_clicked', { version })}
          className="mt-7 flex min-h-12 w-full items-center justify-center rounded-lg bg-black px-5 py-3 text-base font-bold text-white no-underline transition-colors hover:bg-[#ff5a3d] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
        >Join dearCC for free <span className="ml-2" aria-hidden="true">→</span></a>
        <button type="button" onClick={() => dismiss('continue')} className="mt-2 min-h-11 w-full rounded-lg text-sm font-semibold text-[#555] hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-black">Keep exploring Field Report</button>
        <p className="mt-4 text-center text-xs leading-relaxed text-[#666]">Field Report is free to use. No account required.</p>
      </div>
    </dialog>,
    document.body,
  )
}
