import { useEffect, useState, type ReactNode } from 'react'
import { DocumentMeta } from './DocumentMeta'
import {
  JoinSignupCard,
  V2_SIGNUP_KEY,
  hasSignup,
  markSignup,
} from './JoinSignup'

/** Blocks `/v2` results until the visitor creates a free account. */
export function V2SignupGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => hasSignup(V2_SIGNUP_KEY))

  if (unlocked) return children

  return (
    <V2SignupInterstitial
      onComplete={() => {
        markSignup(V2_SIGNUP_KEY)
        setUnlocked(true)
      }}
    />
  )
}

function V2SignupInterstitial({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#ededed] px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label="Join dearCC"
    >
      <DocumentMeta
        title="Join dearCC"
        description="Sign up to view the results, it is completely free!"
      />
      <JoinSignupCard sourceRef="fieldreport-v2" onComplete={onComplete} />
    </div>
  )
}
