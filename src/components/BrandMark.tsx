import { assetUrl } from '../lib/assetUrl'
import { useTheme } from '../lib/theme'

interface BrandMarkProps {
  size?: 'sm' | 'lg'
  as?: 'div' | 'h1'
  /** Header mode: hide the product name on narrow screens */
  compact?: boolean
  /** Kept for callers; both variants use the official dearCC lockup. */
  variant?: 'field' | 'dearcc'
  /** Lock the wordmark to the light (black + coral) lockup, e.g. on a white card. */
  forceLight?: boolean
}

export function BrandMark({
  size = 'sm',
  as: Tag = 'div',
  compact = false,
  forceLight = false,
}: BrandMarkProps) {
  const { isDark } = useTheme()
  const isLg = size === 'lg'
  const wordmark = assetUrl(
    forceLight || !isDark ? 'brand/dearcc-black-coral.svg' : 'brand/dearcc-white-coral.svg',
  )

  const ink = forceLight ? 'text-[#111]' : 'text-ink'
  const rule = forceLight ? 'bg-black/25' : 'bg-ink/30'
  const product = forceLight ? 'text-[#8a8a8a]' : 'text-ink'

  return (
    <Tag
      className={`inline-flex items-center no-underline ${ink} ${
        isLg ? 'justify-center' : ''
      }`}
    >
      <img
        src={wordmark}
        alt="dearCC"
        className={isLg ? 'h-8 sm:h-11 w-auto' : 'h-5 sm:h-[22px] w-auto'}
      />
      <span
        className={`${compact ? 'hidden sm:block' : ''} mx-2.5 sm:mx-3 h-[0.9em] w-px shrink-0 ${rule}`}
        aria-hidden
      />
      <span
        className={`${compact ? 'hidden sm:inline' : ''} font-medium tracking-tight ${product} ${
          isLg ? 'text-sm sm:text-base' : 'text-[13px] sm:text-[15px]'
        }`}
      >
        field report
      </span>
    </Tag>
  )
}
