// URLs may contain bearer invite tokens or location data, including in referrers.
export function redactSecretPath(path: string): string {
  return path.split(/[?#]/, 1)[0]
    .replace(/(^|\/)guest\/invite\/[^/]+/gi, '$1guest/invite/[token]')
    .replace(/(\/(?:v[234]\/)?results\/[^/]+\/)(?!place(?:\/|$))[^/]+/gi, '$1[zip]')
    .replace(/(\/v4\/compare\/[^/]+\/)[^/]+\/[^/]+/gi, '$1[zip]/[zip]')
}

export function cleanUrl(raw: string): string {
  try {
    const url = new URL(raw)
    return url.origin + redactSecretPath(url.pathname)
  } catch {
    return redactSecretPath(raw)
  }
}

export function stripUrlDetails(properties: Record<string, unknown> | undefined): void {
  if (!properties) return
  for (const key of ['$set', '$set_once']) {
    const nested = properties[key]
    if (nested && typeof nested === 'object') stripUrlDetails(nested as Record<string, unknown>)
  }
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string' && /url|referrer|pathname$/i.test(key)) {
      properties[key] = cleanUrl(value)
    }
  }
}
