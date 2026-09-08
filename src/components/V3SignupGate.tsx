import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  const [unlocked, setUnlocked] = useState(() => {
    const handoff = new URLSearchParams(window.location.search)
    return hasSignup(V3_SIGNUP_KEY) || Boolean(handoff.get('leadId'))
  })
  useFieldReportProfileProgress(unlocked)

  useEffect(() => {
    if (unlocked) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const layout = document.getElementById('root')?.firstElementChild
    layout?.setAttribute('inert', '')
    return () => {
      document.body.style.overflow = prevOverflow
      layout?.removeAttribute('inert')
    }
  }, [unlocked])

  if (unlocked) return children

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
