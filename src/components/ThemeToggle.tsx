import { useTheme } from '../lib/theme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="inline-flex shrink-0 rounded-full bg-surface p-0.5"
    >
      <ThemeOption
        label="Light"
        active={theme === 'light'}
        onClick={() => setTheme('light')}
      />
      <ThemeOption
        label="Dark"
        active={theme === 'dark'}
        onClick={() => setTheme('dark')}
      />
    </div>
  )
}

function ThemeOption({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label} mode`}
      title={`${label} mode`}
      className={`inline-flex items-center justify-center rounded-full px-3.5 min-h-8 text-[13px] font-medium transition-colors ${
        active ? 'bg-ink text-page' : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
