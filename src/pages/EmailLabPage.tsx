import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { DocumentMeta } from '../components/DocumentMeta'
import { SUBSCRIBE_URL } from '../lib/subscribe'

type Scenario = 'join' | 'report'

type CreatedEmail = {
  templateId: string
  prompt: string
  from: string
  to: string
  subject: string
  html: string
  text: string
  copy: {
    greeting: string
    body: string
    cta: string
    signoff: string
    tagline: string
  }
}

type SentEmail = {
  id: string
  from?: string
  to?: string | string[]
  subject?: string
  html?: string
  text?: string
  createdAt?: string
  lastEvent?: string
}

const JOIN_DEFAULTS = {
  firstName: 'Ada',
  lastName: 'Chen',
  email: 'product@dearcc.org',
  reportUrl: 'https://fieldreport.dearcc.org/v2/results/11.0701',
}

const REPORT_DEFAULTS = {
  firstName: '',
  lastName: '',
  email: 'product@dearcc.org',
  reportUrl: 'https://fieldreport.dearcc.org/v2/results/11.0701',
}

export function EmailLabPage() {
  const [scenario, setScenario] = useState<Scenario>('join')
  const [firstName, setFirstName] = useState(JOIN_DEFAULTS.firstName)
  const [lastName, setLastName] = useState(JOIN_DEFAULTS.lastName)
  const [email, setEmail] = useState(JOIN_DEFAULTS.email)
  const [reportUrl, setReportUrl] = useState(JOIN_DEFAULTS.reportUrl)
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop')
  const [created, setCreated] = useState<CreatedEmail | null>(null)
  const [sent, setSent] = useState<SentEmail | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'previewing' | 'sending'>('idle')
  const [pane, setPane] = useState<'preview' | 'html' | 'prompt'>('preview')

  const payload = useMemo(
    () => ({
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      reportUrl: reportUrl.trim(),
      sourceRef: scenario === 'join' ? 'email-lab-join' : 'email-lab-report',
    }),
    [email, firstName, lastName, reportUrl, scenario],
  )

  const loadPreview = useCallback(async () => {
    setStatus('previewing')
    setPreviewError(null)
    try {
      const res = await fetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as {
        created?: CreatedEmail
        error?: string
      }
      if (!res.ok || !data.created) {
        throw new Error(data.error ?? `preview failed (${res.status})`)
      }
      setCreated(data.created)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'preview failed')
    } finally {
      setStatus('idle')
    }
  }, [payload])

  useEffect(() => {
    void loadPreview()
  }, [loadPreview])

  function applyScenario(next: Scenario) {
    setScenario(next)
    setSent(null)
    setSendError(null)
    const defaults = next === 'join' ? JOIN_DEFAULTS : REPORT_DEFAULTS
    setFirstName(defaults.firstName)
    setLastName(defaults.lastName)
    setEmail(defaults.email)
    setReportUrl(defaults.reportUrl)
  }

  async function onSend(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setSendError(null)
    setSent(null)
    try {
      const sendRes = await fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, includeCreated: true }),
      })
      const sendData = (await sendRes.json().catch(() => ({}))) as {
        id?: string
        created?: CreatedEmail
        error?: string
      }
      if (sendData.created) setCreated(sendData.created)
      if (!sendRes.ok || !sendData.id) {
        throw new Error(sendData.error ?? `send failed (${sendRes.status})`)
      }
      const sentRes = await fetch(
        `/api/email/sent?id=${encodeURIComponent(sendData.id)}`,
      )
      const sentData = (await sentRes.json().catch(() => ({}))) as {
        sent?: SentEmail
        error?: string
      }
      if (!sentRes.ok || !sentData.sent) {
        setSent({ id: sendData.id, lastEvent: 'accepted' })
        throw new Error(
          sentData.error ??
            `sent, Resend id ${sendData.id}, but lookup failed`,
        )
      }
      setSent(sentData.sent)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'send failed')
    } finally {
      setStatus('idle')
    }
  }

  const htmlMatch =
    created && sent?.html
      ? normalizeHtml(created.html) === normalizeHtml(sent.html)
      : null

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <DocumentMeta
        title="Email lab"
        description="Preview the Field Report welcome email and send a real copy through Resend."
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
        Internal
      </p>
      <h1 className="mt-2 font-sans text-3xl font-bold tracking-tight text-ink">
        Email lab
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted leading-relaxed">
        Left is the message this app creates. Right is the copy Resend stored after
        a real send. Same path as Join dearCC and Email me this report.
      </p>

      <form onSubmit={onSend} className="mt-8 grid gap-8 lg:grid-cols-[20rem_1fr]">
        <aside className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-ink">Scenario</legend>
            <div className="flex gap-2">
              <ScenarioButton
                active={scenario === 'join'}
                onClick={() => applyScenario('join')}
              >
                Join dearCC
              </ScenarioButton>
              <ScenarioButton
                active={scenario === 'report'}
                onClick={() => applyScenario('report')}
              >
                Email this report
              </ScenarioButton>
            </div>
          </fieldset>

          {scenario === 'join' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="lab-first"
                label="First name"
                value={firstName}
                onChange={setFirstName}
              />
              <Field
                id="lab-last"
                label="Last name"
                value={lastName}
                onChange={setLastName}
              />
            </div>
          ) : null}

          <Field
            id="lab-email"
            label="Send to"
            type="email"
            value={email}
            onChange={setEmail}
            required
          />
          <Field
            id="lab-url"
            label="Report URL"
            value={reportUrl}
            onChange={setReportUrl}
          />

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="rounded-lg bg-ink px-4 py-3 text-sm font-bold text-page disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send test'}
            </button>
            <p className="text-xs text-muted">
              Creates the email, posts to /api/subscribe, then loads the Resend record.
            </p>
          </div>

          {sendError ? (
            <p role="alert" className="text-sm text-negative">
              {sendError}
            </p>
          ) : null}
          {sent?.id ? (
            <p className="text-sm text-ink">
              Sent. Resend id {sent.id}
              {sent.lastEvent ? ` · ${sent.lastEvent}` : ''}
            </p>
          ) : null}
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <PaneButton active={pane === 'preview'} onClick={() => setPane('preview')}>
              Design
            </PaneButton>
            <PaneButton active={pane === 'html'} onClick={() => setPane('html')}>
              HTML
            </PaneButton>
            <PaneButton active={pane === 'prompt'} onClick={() => setPane('prompt')}>
              Prompt and copy
            </PaneButton>
            <div className="ml-auto flex gap-2">
              <PaneButton
                active={width === 'desktop'}
                onClick={() => setWidth('desktop')}
              >
                560
              </PaneButton>
              <PaneButton
                active={width === 'mobile'}
                onClick={() => setWidth('mobile')}
              >
                360
              </PaneButton>
            </div>
          </div>

          {previewError ? (
            <p role="alert" className="text-sm text-negative">
              {previewError}
            </p>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <EmailCard
              title="Created"
              subtitle="Template output before Resend"
              email={created}
              pane={pane}
              width={width}
            />
            <EmailCard
              title="Sent"
              subtitle={
                htmlMatch === true
                  ? 'Matches created HTML'
                  : htmlMatch === false
                    ? 'Differs from created HTML'
                    : 'Resend record after a test send'
              }
              email={
                sent
                  ? {
                      templateId: created?.templateId ?? 'sent',
                      prompt: created?.prompt ?? '',
                      from: String(sent.from ?? ''),
                      to: Array.isArray(sent.to) ? sent.to.join(', ') : String(sent.to ?? ''),
                      subject: sent.subject ?? '',
                      html: sent.html ?? '',
                      text: sent.text ?? '',
                      copy: created?.copy ?? {
                        greeting: '',
                        body: '',
                        cta: '',
                        signoff: '',
                        tagline: '',
                      },
                    }
                  : null
              }
              pane={pane}
              width={width}
              empty="Send a test to load the Resend copy."
            />
          </div>
        </div>
      </form>
    </div>
  )
}

function EmailCard({
  title,
  subtitle,
  email,
  pane,
  width,
  empty,
}: {
  title: string
  subtitle: string
  email: CreatedEmail | null
  pane: 'preview' | 'html' | 'prompt'
  width: 'desktop' | 'mobile'
  empty?: string
}) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card overflow-hidden">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        {email ? (
          <dl className="mt-3 grid gap-1 text-xs text-muted">
            <div>
              <span className="text-ink font-semibold">From </span>
              {email.from || '—'}
            </div>
            <div>
              <span className="text-ink font-semibold">To </span>
              {email.to || '—'}
            </div>
            <div>
              <span className="text-ink font-semibold">Subject </span>
              {email.subject || '—'}
            </div>
          </dl>
        ) : null}
      </header>
      <div className="bg-paper p-4 min-h-80">
        {!email ? (
          <p className="text-sm text-muted">{empty ?? 'Nothing yet.'}</p>
        ) : pane === 'preview' ? (
          <div className="flex justify-center">
            <iframe
              title={`${title} preview`}
              srcDoc={email.html}
              className="bg-white rounded-xl border border-border overflow-hidden"
              style={{
                width: width === 'mobile' ? 360 : 560,
                maxWidth: '100%',
                height: 520,
              }}
            />
          </div>
        ) : pane === 'html' ? (
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-ink">
            {email.html}
          </pre>
        ) : (
          <div className="space-y-4 text-sm text-ink">
            <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-muted">
              {email.prompt}
            </pre>
            <dl className="grid gap-2">
              {Object.entries(email.copy).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    {key}
                  </dt>
                  <dd>{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  )
}

function ScenarioButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
        active
          ? 'border-ink bg-ink text-page'
          : 'border-border bg-transparent text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function PaneButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
        active ? 'bg-ink text-page' : 'bg-paper text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border-bright bg-white px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
      />
    </div>
  )
}

function normalizeHtml(html: string) {
  return html.replace(/\s+/g, ' ').trim()
}
