export type ReportSignupContext = {
  version: 'v3' | 'public'
  cip?: string
  major?: string
  zip?: string
  roles: Array<{ title: string; soc?: string }>
}

/** Rebuild the handoff from report data, never from the page's identity/query parameters. */
export function gamePlanSignupUrl(dearccUrl: string, context: ReportSignupContext) {
  const url = new URL('/api/profile/gameplan-signup', dearccUrl)
  url.searchParams.set('from', 'fieldreport')
  url.searchParams.set('version', context.version)
  if (context.cip && /^\d{2}\.\d{4}$/.test(context.cip)) {
    url.searchParams.set('cip', context.cip)
    if (context.major) url.searchParams.set('major', context.major.slice(0, 160))
    if (context.zip && /^\d{5}$/.test(context.zip)) url.searchParams.set('zip', context.zip)
  }
  for (const role of context.roles.slice(0, 6)) {
    if (!role.title.trim()) continue
    url.searchParams.append('role', role.title.trim().slice(0, 120))
    url.searchParams.append('roleSoc', role.soc && /^\d{2}-\d{4}$/.test(role.soc) ? role.soc : '')
  }
  return url.href
}
