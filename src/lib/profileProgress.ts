import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEARCC_URL } from './dearccProfile'
import { trackFieldReportUnlocked } from './analytics'
import { recordFieldReportUnlock } from './recordFieldReportUnlock'

/** Record a real unlock once per mounted report, never an identity from its URL. */
export function useFieldReportProfileProgress(unlocked: boolean) {
  const [params] = useSearchParams()
  const sent = useRef(false)
  const socs = params.getAll('roleSoc')
  const names = params.getAll('role')
  const roles = JSON.stringify(socs.slice(0, 3).map((soc, i) => ({ soc, title: names[i] ?? '' }))
    .filter(r => /^\d{2}-\d{4}$/.test(r.soc) && r.title.trim()))
  useEffect(() => {
    if (!unlocked || sent.current) return
    sent.current = true
    void recordFieldReportUnlock(DEARCC_URL, JSON.parse(roles), fetch, trackFieldReportUnlocked)
      .catch(() => console.warn('Could not sync dearCC profile progress'))
  }, [roles, unlocked])
}
