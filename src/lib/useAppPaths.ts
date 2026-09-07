import { useLocation } from 'react-router-dom'

/** Canonical app paths for `/`, `/v2` interstitial signup, `/v3` modal signup, and `/v4` prototypes. */
export function useAppPaths() {
  const { pathname } = useLocation()
  const isV3 = pathname.startsWith('/v3')
  const isV2 = pathname.startsWith('/v2')
  const isV4 = pathname.startsWith('/v4')
  const prefix = isV2 ? '/v2' : isV3 ? '/v3' : isV4 ? '/v4' : ''
  return {
    isV2,
    isV3,
    isV4,
    isReport: true,
    prefix,
    home: prefix || '/',
    resultsBase: `${prefix}/results`,
    mapBase: `${prefix}/map`,
    receipts: isV4 ? '/receipts' : `${prefix}/receipts`,
  } as const
}
