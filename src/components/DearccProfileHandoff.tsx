import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { identifyMember } from '../lib/analytics'
import { getDearccProfile } from '../lib/dearccProfile'
import { withoutIdentity } from '../lib/identityParams'

export function DearccProfileHandoff() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const clean = withoutIdentity(params).toString()
  useEffect(() => {
    if (clean !== params.toString()) setParams(clean, { replace: true })
  }, [clean, params, setParams])
  useEffect(() => {
    let cancelled = false
    void getDearccProfile().then(profile => {
      if (cancelled || !profile) return
      identifyMember(profile.leadId)
      if (location.pathname === '/v3/roles') {
        setParams(current => {
          const next = withoutIdentity(current)
          const roles = profile.targetRoles.map(role => role.title.replace(/;/g, ',')).join(';')
          if (roles) next.set('profileRoles', roles)
          if (!next.has('roleSoc')) {
            for (const role of profile.targetRoles.filter(role => role.soc).slice(0, 3)) {
              next.append('roleSoc', role.soc!)
              next.append('role', role.title)
            }
          }
          return next
        }, { replace: true })
      }
    }).catch(() => undefined)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh identity once per route, not when role query state changes
  }, [location.pathname])
  return null
}
