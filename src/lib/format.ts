export function formatSalary(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function formatRatio(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(value >= 10 ? 1 : 2)
}

/** Format a 0–1 exposure share as a percent (no sign). */
export function formatShare(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(0)}%`
}

/** Compact salary for prose: $85k */
export function formatSalaryK(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}k`
  return formatSalary(value)
}

/** Compact count for prose: 295.8K */
export function formatCompactCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  if (Math.abs(value) >= 1_000_000) {
    const n = value / 1_000_000
    return `${n >= 10 ? n.toFixed(0) : n.toFixed(1)}M`
  }
  if (Math.abs(value) >= 1000) {
    const n = value / 1000
    const label = Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)
    return `${label}K`
  }
  return formatNumber(value)
}

/** Signed compact count for projected job change: +297K / -17.2K */
export function formatSignedCompactCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  const core = formatCompactCount(Math.abs(value))
  if (value > 0) return `+${core}`
  if (value < 0) return `-${core}`
  return core
}

/** Signed percent for BLS projected growth: +1.4% / -0.3%. */
export function formatGrowth(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`
}

/** Mockup titles: "Computer science", "Database architects". */
export function sentenceCase(value: string): string {
  const t = value.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}
