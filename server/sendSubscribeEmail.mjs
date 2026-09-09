import { composeSubscribeEmail } from './emailTemplates.mjs'

/**
 * Send the Field Report welcome mail via Resend.
 * @param {{ email?: string, name?: string, firstName?: string, reportUrl?: string }} input
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
export async function sendSubscribeEmail(input) {
  const key = process.env.RESEND_API_KEY?.trim()
  const created = composeSubscribeEmail(input)
  const includeCreated = Boolean(input?.includeCreated)
  const withCreated = (body) => (includeCreated ? { ...body, created } : body)
  if (!created.to || !created.to.includes('@')) {
    return { status: 400, body: withCreated({ error: 'email required' }) }
  }
  if (!key) {
    return {
      status: 503,
      body: withCreated({ error: 'RESEND_API_KEY is not set' }),
    }
  }

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: created.from,
      to: [created.to],
      subject: created.subject,
      html: created.html,
      text: created.text,
    }),
  })
  const data = await sendRes.json().catch(() => ({}))
  if (!sendRes.ok) {
    const message =
      (typeof data.message === 'string' && data.message) ||
      (typeof data.error === 'string' && data.error) ||
      'send failed'
    return {
      status: sendRes.status === 403 ? 500 : sendRes.status,
      body: withCreated({ error: message }),
    }
  }

  return {
    status: 200,
    body: withCreated({
      ok: true,
      id: data.id,
      welcomeSent: true,
    }),
  }
}

/**
 * Fetch the email Resend actually stored for a send id.
 * @param {string} id
 */
export async function fetchSentEmail(id) {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    return { status: 503, body: { error: 'RESEND_API_KEY is not set' } }
  }
  const emailId = String(id || '').trim()
  if (!emailId) {
    return { status: 400, body: { error: 'id required' } }
  }

  const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      (typeof data.message === 'string' && data.message) ||
      (typeof data.error === 'string' && data.error) ||
      'lookup failed'
    return { status: res.status, body: { error: message } }
  }

  return {
    status: 200,
    body: {
      sent: {
        id: data.id,
        from: data.from,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        createdAt: data.created_at,
        lastEvent: data.last_event,
      },
    },
  }
}
