import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { getDearccProfile } from '../lib/dearccProfile'

export function DearccProfileHandoff() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const checkedProfile = useRef(false)

  useEffect(() => {
    if (!location.pathname.startsWith('/v3/roles') || checkedProfile.current) return
    checkedProfile.current = true

    let cancelled = false
    void getDearccProfile()
      .then((profile) => {
        if (cancelled || !profile) return
        const next = new URLSearchParams(params)
        // A bookmarked handoff can point at a different database or an old
        // profile. The active dearCC cookie is authoritative when available.
        next.set('leadId', profile.leadId)
        if (profile.email) next.set('email', profile.email)
        if (profile.linkedin) next.set('linkedin', profile.linkedin)
        const roleNames = profile.targetRoles.map((role) => role.title.replace(/;/g, ',')).join(';')
        if (roleNames) next.set('profileRoles', roleNames)

        if (!next.has('roleSoc')) {
          for (const role of profile.targetRoles.filter((role) => role.soc).slice(0, 3)) {
            next.append('roleSoc', role.soc ?? '')
            next.append('role', role.title)
          }
        }
        setParams(next, { replace: true })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- validate once on role entry
  }, [location.pathname])

  return null
}
