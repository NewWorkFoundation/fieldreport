import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

/** Consistent mobile-friendly back navigation control. */
export function BackLink({
  to,
  children,
  compact = false,
}: {
  to: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <Link
      to={to}
      className={
        compact
          ? 'text-sm text-muted hover:text-ink mb-0 inline-flex items-center min-h-11 py-1.5 max-w-full'
          : 'text-sm text-muted hover:text-ink mb-4 sm:mb-6 inline-flex items-center min-h-11 py-2 max-w-full'
      }
    >
      <span className="truncate">{children}</span>
    </Link>
  )
}
