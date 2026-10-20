import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackFieldReport } from './analytics'

/** One impression per visible report/lock transition; route keys remain local. */
export function useGateAnalytics(unlocked: boolean, version: 'v2' | 'v3', enabled = true) {
  const location = useLocation()
  const previous = useRef('')
  const wasLocked = useRef(false)
  useEffect(() => {
    if (!enabled) return
    const key = `${location.pathname}:${unlocked}`
    if (previous.current === key) return
    previous.current = key
    if (!unlocked) {
      wasLocked.current = true
      trackFieldReport('field_report_gate_viewed', { version })
    } else {
      if (wasLocked.current) trackFieldReport('field_report_gate_unlocked', { version })
      wasLocked.current = false
      trackFieldReport('field_report_viewed', { version })
    }
  }, [unlocked, version, location.pathname, enabled])
}
