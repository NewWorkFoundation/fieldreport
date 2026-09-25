import posthog, {
  type CaptureResult,
  type Properties,
} from 'posthog-js/dist/module.slim.no-external'

const env = import.meta.env
const POSTHOG_TOKEN =
  (env.VITE_POSTHOG_TOKEN as string | undefined) || 'phc_wo2HoAijxXMXtk84BPF8Rz66VPerR5Y6bLZE6qS2j2kk'
const POSTHOG_HOST = (env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com'
const ENABLED_FLAG = String(env.VITE_POSTHOG_ENABLED ?? '').trim().toLowerCase()
const POSTHOG_ENABLED = ENABLED_FLAG ? ENABLED_FLAG === 'true' || ENABLED_FLAG === '1' : env.PROD

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Hub handoff URLs carry email and LinkedIn in the query string.
const URL_PROPERTIES = [
  '$current_url',
  '$initial_current_url',
  '$referrer',
  '$initial_referrer',
  '$session_entry_url',
] as const

// Stored first-touch URLs stay in the cookie, so mask these before they persist.
const HANDOFF_QUERY_PARAMS = ['leadId', 'email', 'first', 'last', 'linkedin']

let posthogInitialized = false
let lastPageviewPath = ''

function cleanUrl(raw: string) {
  // Leave non-URL markers such as `$direct` alone.
  if (!/^[a-z][a-z\d+.-]*:/i.test(raw)) return raw.split(/[?#]/, 1)[0]
  try {
    const url = new URL(raw, window.location.origin)
    return `${url.origin}${url.pathname}`
  } catch {
    return raw.split(/[?#]/, 1)[0]
  }
}

function cleanUrlProperties(properties?: Properties) {
  if (!properties) return
  for (const key of URL_PROPERTIES) {
    const value = properties[key]
    if (typeof value === 'string') properties[key] = cleanUrl(value)
  }
}

function cleanPosthogUrls(result: CaptureResult | null) {
  if (!result) return null
  cleanUrlProperties(result.properties)
  cleanUrlProperties(result.$set)
  cleanUrlProperties(result.$set_once)
  return result
}

function environment() {
  if (env.DEV) return 'development'
  return env.VITE_VERCEL_ENV === 'preview' ? 'preview' : 'production'
}

function isInternalPath() {
  const base = env.BASE_URL.replace(/\/$/, '')
  const path = window.location.pathname.slice(base.length) || '/'
  return path === '/dev' || path.startsWith('/dev/')
}

export function initAnalytics() {
  if (!POSTHOG_ENABLED || posthogInitialized || isInternalPath()) return
  posthog.init(POSTHOG_TOKEN, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',
    autocapture: false,
    // The slim bundle omits history autocapture; trackPageview covers route changes.
    capture_pageview: true,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    person_profiles: 'identified_only',
    persistence: 'localStorage+cookie',
    cross_subdomain_cookie: true,
    mask_personal_data_properties: true,
    custom_personal_data_properties: HANDOFF_QUERY_PARAMS,
    before_send: cleanPosthogUrls,
  })
  posthog.register({ surface: 'field_report', environment: environment() })
  posthogInitialized = true
  lastPageviewPath = window.location.pathname
}

/** Captures a `$pageview` when the SPA route's pathname changes. The first load is captured by init. */
export function trackPageview() {
  if (!posthogInitialized || window.location.pathname === lastPageviewPath) return
  lastPageviewPath = window.location.pathname
  posthog.capture('$pageview')
}

/** Links this browser's anonymous history to the dearcc.org member ID (`leads.id`). */
export function identifyMember(leadId: string | null | undefined) {
  if (!posthogInitialized || !leadId || !UUID.test(leadId)) return
  posthog.identify(leadId.toLowerCase())
}
