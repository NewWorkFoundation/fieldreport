import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const DEFAULT_TITLE = 'Field Report'
const DEFAULT_DESCRIPTION =
  'BLS salary data, projected annual openings, and AI-exposure scores for every U.S. major.'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

/** Sets document title + Open Graph / Twitter tags for the current view. */
export function DocumentMeta({
  title,
  description = DEFAULT_DESCRIPTION,
}: {
  title?: string
  description?: string
}) {
  const { pathname } = useLocation()
  useEffect(() => {
    const fullTitle = title ? `${title} · ${DEFAULT_TITLE}` : DEFAULT_TITLE
    document.title = fullTitle

    const path = pathname.replace(/\/$/, '') || '/'
    const canonicalPath = /^\/v[23]$/.test(path) ? '/' : path.replace(/^\/v[23]\/receipts$/, '/receipts')
    const url = `https://fieldreport.dearcc.org${canonicalPath}`
    const image = 'https://fieldreport.dearcc.org/brand/field-report-social.png'
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:image', image)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image)

    return () => {
      document.title = DEFAULT_TITLE
      upsertMeta('name', 'description', DEFAULT_DESCRIPTION)
    }
  }, [title, description, pathname])

  return null
}
