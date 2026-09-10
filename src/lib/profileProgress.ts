import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Unlocking a gated results route exposes the report, so it counts as viewed. */
export function useFieldReportProfileProgress(unlocked: boolean) {
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get('leadId')
  const emailCandidate = searchParams.get('email')?.trim().toLowerCase() ?? ''
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate) ? emailCandidate : ''
  const roleSocsKey = searchParams.getAll('roleSoc').join('\u0000')
  const roleNamesKey = searchParams.getAll('role').join('\u0000')
  const targetRoles = useMemo(
    () => roleSocsKey.split('\u0000').slice(0, 3).map((soc, index) => ({ soc, title: roleNamesKey.split('\u0000')[index] ?? '' })).filter((role) => /^\d{2}-\d{4}$/.test(role.soc) && role.title.trim()),
    [roleNamesKey, roleSocsKey],
  )

  useEffect(() => {
    if (!unlocked || !leadId || !UUID.test(leadId)) return

    const controller = new AbortController()
    void fetch('/api/profile-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, ...(email ? { email } : {}), targetRoles }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          console.warn(`Could not sync dearCC profile progress (${response.status})`)
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.warn('Could not sync dearCC profile progress')
      })

    return () => controller.abort()
  }, [email, leadId, targetRoles, unlocked])
}
