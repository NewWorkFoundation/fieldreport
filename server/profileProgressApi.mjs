const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/**
 * Field Report intentionally has no direct database connection. This
 * server-only relay records its shared-profile progress in dear-cc without
 * shipping PROFILE_SYNC_SECRET to the browser.
 */
export async function handleProfileProgress(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const isLocal = !process.env.VERCEL
  const profileUrl = (
    process.env.DEARCC_PROFILE_URL || (isLocal ? 'http://localhost:3000' : 'https://dearcc.org')
  ).replace(/\/$/, '')
  const secret = process.env.PROFILE_SYNC_SECRET || (isLocal ? 'local-dearcc-profile-sync' : '')
  const protectionBypassSecret = process.env.DEARCC_VERCEL_BYPASS_SECRET?.trim()
  if (!secret) {
    res.statusCode = 503
    res.end(JSON.stringify({ error: 'Profile sync is not configured' }))
    return
  }

  try {
    const body = await readBody(req)
    const leadId = typeof body?.leadId === 'string' ? body.leadId : ''
    const emailCandidate = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate) ? emailCandidate : ''
    if (!UUID.test(leadId)) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Invalid profile' }))
      return
    }
    const targetRoles = Array.isArray(body?.targetRoles)
      ? body.targetRoles
          .filter((role) => role && typeof role.soc === 'string' && /^\d{2}-\d{4}$/.test(role.soc) && typeof role.title === 'string' && role.title.trim())
          .slice(0, 3)
          .map((role) => ({ soc: role.soc, title: role.title.trim().slice(0, 200) }))
      : []

    const response = await fetch(`${profileUrl}/api/profile/progress`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
        ...(protectionBypassSecret
          ? { 'x-vercel-protection-bypass': protectionBypassSecret }
          : {}),
      },
      body: JSON.stringify({ leadId, ...(email ? { email } : {}), step: 'field_report', targetRoles }),
    })
    const responseBody = await response.text()
    res.statusCode = response.status
    res.end(responseBody)
  } catch {
    res.statusCode = 502
    res.end(JSON.stringify({ error: 'Could not sync profile progress' }))
  }
}

/** Vite middleware for the same endpoint during local development. */
export function profileProgressApiPlugin() {
  return {
    name: 'field-report-profile-progress-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!(req.url || '').startsWith('/api/profile-progress')) return next()
        await handleProfileProgress(req, res)
      })
    },
  }
}
