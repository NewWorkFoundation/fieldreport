export const IDENTITY_PARAMS = ['leadId', 'email', 'first', 'last', 'linkedin', 'graduationYear'] as const
export function withoutIdentity(params: URLSearchParams) {
  const clean = new URLSearchParams(params)
  for (const key of IDENTITY_PARAMS) clean.delete(key)
  return clean
}
