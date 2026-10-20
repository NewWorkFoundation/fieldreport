import { profileBaseUrl } from './profileBaseUrl'
export const DEARCC_URL = profileBaseUrl(
  (import.meta.env.VITE_DEARCC_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:3002' : 'https://dearcc.org')
)

export type DearccProfile = {
  leadId: string
  fieldReportCompleted: boolean
  email: string
  linkedin: string
  targetRoles: Array<{ soc?: string; title: string }>
}

export async function getDearccProfile(): Promise<DearccProfile | null> {
  const response = await fetch(`${DEARCC_URL}/api/profile/handoff`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (response.status === 401) return null
  if (!response.ok) throw new Error('Could not load your dearCC profile')

  const body = await response.json() as {
    authenticated?: boolean
    profile?: Partial<DearccProfile>
  }
  if (!body.authenticated || !body.profile || typeof body.profile.leadId !== 'string') return null

  return {
    leadId: body.profile.leadId,
    fieldReportCompleted: body.profile.fieldReportCompleted === true,
    email: typeof body.profile.email === 'string' ? body.profile.email : '',
    linkedin: typeof body.profile.linkedin === 'string' ? body.profile.linkedin : '',
    targetRoles: Array.isArray(body.profile.targetRoles)
      ? body.profile.targetRoles.filter((role): role is { soc?: string; title: string } =>
          Boolean(role && typeof role.title === 'string' && role.title.trim()),
        )
      : [],
  }
}
