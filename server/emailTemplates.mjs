const FROM =
  process.env.RESEND_FROM_EMAIL?.trim() ||
  'dearCC Field Report <hello@dearcc.org>'

const ASSET_BASE = (
  process.env.VITE_PUBLIC_SITE_URL ||
  process.env.BASE_URL ||
  'https://fieldreport.dearcc.org'
).replace(/\/$/, '')

/** Intent for this template. Rev this when you change copy or layout. */
export const WELCOME_PROMPT = `Field Report welcome email.

Voice: dearCC. Direct. No newsletter pitch. No em dashes.
Typed name is dearCC (no brackets in body copy).
Coral is accent only. Primary CTA is a black button with a white label.

Must include:
1. Greeting by first name when we have one, otherwise Hi,
2. One line that the Field Report is ready
3. A single CTA to the report URL when we have one
4. Short signoff: dearCC / Own your future.`

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function firstNameOf(input) {
  const first = String(input?.firstName || '').trim()
  if (first) return first
  const name = String(input?.name || '').trim()
  if (!name) return ''
  return name.split(/\s+/)[0] || ''
}

/**
 * Build the signup / "email me this report" message. Does not send.
 * @param {{ email?: string, name?: string, firstName?: string, reportUrl?: string }} input
 */
export function composeSubscribeEmail(input) {
  const to = String(input?.email || '').trim()
  const first = firstNameOf(input)
  const reportUrl = String(input?.reportUrl || '').trim()
  const greeting = first ? `Hi ${first},` : 'Hi,'
  const body = 'Your Field Report is ready. Open it for wages, openings, and the jobs this major actually leads to.'
  const cta = reportUrl ? 'Open your Field Report' : ''
  const signoff = 'dearCC'
  const tagline = 'Own your future.'
  const subject = 'Your Field Report is ready'
  const logo = `${ASSET_BASE}/brand/dearcc-black-coral.svg`

  const ctaHtml = reportUrl
    ? `<tr>
        <td style="padding:0 0 28px;">
          <a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:#000000;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;line-height:1;text-decoration:none;padding:14px 20px;border-radius:8px;">
            ${escapeHtml(cta)}
          </a>
        </td>
      </tr>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f1f1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f1f1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="height:4px;background:#ff5a3d;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <img src="${escapeHtml(logo)}" alt="dearCC" width="132" style="display:block;border:0;height:auto;">
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;font-family:Inter,Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#5c5c5c;">
              Field Report
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 12px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;color:#000000;">
              ${escapeHtml(greeting)}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#000000;">
              ${escapeHtml(body)}
            </td>
          </tr>
          ${ctaHtml}
          <tr>
            <td style="padding:8px 32px 32px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#5c5c5c;">
              ${escapeHtml(signoff)}<br>
              ${escapeHtml(tagline)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    greeting,
    '',
    body,
    reportUrl ? `${cta}: ${reportUrl}` : '',
    '',
    signoff,
    tagline,
  ]
    .filter((line) => line !== '')
    .join('\n')

  return {
    templateId: 'field-report-welcome',
    prompt: WELCOME_PROMPT,
    from: FROM,
    to,
    subject,
    html,
    text,
    copy: { greeting, body, cta, signoff, tagline },
  }
}
