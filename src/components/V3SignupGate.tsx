import { useGateAnalytics } from '../lib/useGateAnalytics'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { getDearccProfile } from '../lib/dearccProfile'
import { DocumentMeta } from './DocumentMeta'
import {
  JoinSignupCard,
  V3_SIGNUP_KEY,
  hasSignup,
  markSignup,
} from './JoinSignup'
import { useFieldReportProfileProgress } from '../lib/profileProgress'

/** Renders `/v3` results underneath a signup modal so the report is visible but unreadable. */
export function V3SignupGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => hasSignup(V3_SIGNUP_KEY))
  const [signedIn, setSignedIn] = useState(false)
  const [alreadyRecorded, setAlreadyRecorded] = useState(false)
  const [checking, setChecking] = useState(true)
  useEffect(() => {
    let cancelled = false
    void getDearccProfile().then(profile => {
      if (!cancelled) {
        setSignedIn(Boolean(profile))
        setAlreadyRecorded(profile?.fieldReportCompleted === true)
      }
    }).catch(() => undefined).finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [])
  const profileUnlocked = unlocked || signedIn
  useFieldReportProfileProgress(profileUnlocked && !checking && !alreadyRecorded)
  useGateAnalytics(profileUnlocked, 'v3', !checking)

  useEffect(() => {
    if (profileUnlocked) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const layout = document.getElementById('root')?.firstElementChild
    layout?.setAttribute('inert', '')
    return () => {
      document.body.style.overflow = prevOverflow
      layout?.removeAttribute('inert')
    }
  }, [profileUnlocked])

  if (checking) return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20" role="status" aria-busy="true">
      <span className="sr-only">Loading your report…</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="h-4 w-24 rounded bg-ink/10" />
        <div className="mt-8 h-9 w-3/4 max-w-md rounded bg-ink/10" />
        <div className="mt-4 h-4 w-full max-w-lg rounded bg-ink/5" />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map(card => (
            <div key={card} className="h-40 rounded-xl border border-ink/10 bg-ink/5" />
          ))}
        </div>
      </div>
    </div>
  )
  if (profileUnlocked) return children

  const overlay = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-md px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label="Join dearCC"
    >
      <DocumentMeta
        title="Join dearCC"
        description="Sign up to view the results, it is completely free!"
      />
      <JoinSignupCard
        sourceRef="fieldreport-v3"
        onComplete={() => {
          markSignup(V3_SIGNUP_KEY)
          setUnlocked(true)
        }}
      />
    </div>
  )

  return (
    <>
      <div
        className="pointer-events-none select-none blur-[12px] sm:blur-[14px] saturate-50 contrast-75"
        aria-hidden
      >
        {children}
      </div>
      {createPortal(overlay, document.body)}
    </>
  )
}
