import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { identifyMember } from '../lib/analytics'
import { getDearccProfile } from '../lib/dearccProfile'

export function DearccProfileHandoff() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const checkedProfile = useRef(false)
  const leadId = params.get('leadId')
  const onRoleEntry = location.pathname.startsWith('/v3/roles')

  // Hub handoff links carry `leadId` on any route, but a forwarded link carries
  // someone else's. Only the dearCC session proves who is browsing.
  useEffect(() => {
    if (!leadId || onRoleEntry) return
    let cancelled = false
    void getDearccProfile()
      .then((profile) => {
        if (!cancelled && profile) identifyMember(profile.leadId)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [leadId, onRoleEntry])

  useEffect(() => {
    if (!onRoleEntry || checkedProfile.current) return
    checkedProfile.current = true

    let cancelled = false
    void getDearccProfile()
      .then((profile) => {
        if (cancelled || !profile) return
        identifyMember(profile.leadId)
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
