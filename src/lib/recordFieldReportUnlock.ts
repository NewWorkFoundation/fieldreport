export async function recordFieldReportUnlock(
  base: string,
  targetRoles: Array<{ soc: string; title: string }>,
  send: typeof fetch,
  onRecorded: (leadId: string) => void,
) {
  const response = await send(`${base}/api/profile/field-report-unlocked`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetRoles }),
    keepalive: true,
  })
  // Anonymous signup can still expose the report, but cannot credit any member.
  if (response.status === 401) return
  if (!response.ok) throw new Error('Could not record Field Report unlock')
  const result = await response.json() as { leadId: string; recorded: boolean }
  if (result.recorded) onRecorded(result.leadId)
}
