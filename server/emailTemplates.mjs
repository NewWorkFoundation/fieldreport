const FROM =
  process.env.RESEND_FROM_EMAIL?.trim() ||
  'dearCC Field Report <hello@dearcc.org>'

/** Intent for this template. Rev this when you change copy or layout. */
export const WELCOME_PROMPT = `Field Report welcome email.

Voice: dearCC. Direct, useful, and encouraging. No newsletter pitch. No em dashes.
Match the Game Plan email: white canvas, compact text wordmark and product label,
black divider, clear heading, short sections, and CC + Team signoff.
Typed name is dearCC (no brackets in body copy).
Coral is accent only. Primary CTA is a black button with a white label.
Use inline styles and presentation tables. Do not depend on external images.

Must include:
1. A report-ready heading, personalized by first name when available
2. A short introduction and a scannable guide to pay, demand, and career paths
3. A single CTA to the supplied report URL when we have one
4. Encouraging signoff and a footer explaining why this email arrived
5. Equivalent plain text and a useful inbox preview`

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
  const greeting = first ? `${first}, your Field Report.` : 'Your Field Report.'
  const body = 'Your report is ready. Get a clearer picture of what jobs pay, where the openings are, and which paths are worth a closer look.'
  const cta = reportUrl ? 'Open my Field Report' : ''
  const signoff = 'CC + Team'
  const tagline = 'Own your future.'
  const subject = 'Your Field Report is ready'
  const preheader = 'Pay, demand, and career paths. Your next move starts here.'
  const sectionHeading = 'Inside your report'
  const sections = [
    { title: 'What jobs pay', body: 'Compare wages to put your options in perspective.' },
    { title: 'Where the demand is', body: 'See job openings and where opportunities are concentrated.' },
    { title: 'Where you could go', body: 'Explore career paths, including ones you might not have considered.' },
  ]
  const closing = "You don’t need to figure it all out today. Start with one path you’re curious about. We’re rooting for you."
  const reason = 'You’re receiving this because you requested a Field Report on dearCC.'
  const foundation = 'A New Work Foundation initiative, a 501(c)(3) nonprofit. Always free.'

  const sectionsHtml = sections.map((section) => `<tr>
    <td style="padding:0 0 18px;">
      <h3 style="margin:0 0 4px;font-size:15px;font-weight:700;line-height:1.4;color:#000000;">${escapeHtml(section.title)}</h3>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#5c5c5c;">${escapeHtml(section.body)}</p>
    </td>
  </tr>`).join('\n')

  // Keep the button inside the same content cell so email clients cannot
  // discard its gutter independently of the body copy.
  const ctaHtml = reportUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
        <tr><td bgcolor="#000000" style="border-radius:8px;text-align:center;mso-padding-alt:14px 22px;">
          <a href="${escapeHtml(reportUrl)}" style="display:inline-block;border:1px solid #000000;border-radius:8px;background:#000000;color:#ffffff;font-size:15px;font-weight:700;line-height:20px;text-align:center;text-decoration:none;padding:13px 21px;mso-padding-alt:0;">${escapeHtml(cta)} &rarr;</a>
        </td></tr>
      </table>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;line-height:1px;color:#ffffff;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse:collapse;">
    <tr><td align="center" style="padding:24px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;">
        <tr><td style="padding:0 0 10px;border-bottom:2px solid #000000;">
          <span style="font-size:19px;font-weight:900;letter-spacing:-.045em;color:#000000;">dear<span style="color:#ff5a3d;">[CC]</span></span><span style="display:inline-block;font-size:13px;font-weight:600;line-height:18px;color:#000000;border-left:1px solid #999999;padding-left:10px;margin-left:10px;">Field Report</span>
        </td></tr>
        <tr><td style="padding:24px 0 26px;">
          <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;letter-spacing:-.03em;line-height:1.2;color:#000000;overflow-wrap:anywhere;">${escapeHtml(greeting)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.65;color:#5c5c5c;">${escapeHtml(body)}</p>
        </td></tr>
        <tr><td>
          <h2 style="margin:0 0 16px;font-size:17px;font-weight:700;letter-spacing:-.022em;line-height:1.4;color:#000000;">${escapeHtml(sectionHeading)}</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${sectionsHtml}</table>
          ${ctaHtml}
        </td></tr>
        <tr><td style="padding:28px 0 26px;">
          <p style="margin:0;font-size:15px;line-height:1.65;color:#000000;">${escapeHtml(closing)}<br><strong>${escapeHtml(signoff)}</strong></p>
        </td></tr>
        <tr><td style="padding:15px 0 0;border-top:1px solid #e2e2e2;">
          <p style="margin:0;font-size:12px;line-height:1.65;color:#5c5c5c;">${escapeHtml(reason)}<br>${escapeHtml(foundation)}</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`

  const text = [
    'dearCC | Field Report',
    greeting,
    body,
    `${sectionHeading}\n${sections.map((section) => `${section.title}: ${section.body}`).join('\n\n')}`,
    reportUrl ? `${cta}: ${reportUrl}` : '',
    `${closing}\n${signoff}`,
    `${reason}\n${foundation}`,
  ].filter(Boolean).join('\n\n')

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
