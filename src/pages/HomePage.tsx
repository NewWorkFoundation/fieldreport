import { MajorSearch } from '../components/MajorSearch'
import { DocumentMeta } from '../components/DocumentMeta'
import { Mascot } from '../components/Mascot'
import { FieldReportEntryGraphic } from '../components/FieldReportEntryGraphic'
import { useAppPaths } from '../lib/useAppPaths'
import { useTheme } from '../lib/theme'
import { useData } from '../data/DataContext'

export function HomePage() {
  const { majors, loading, error } = useData()
  const { resultsBase } = useAppPaths()
  const { isDark } = useTheme()

  return (
    <div className="flex flex-col items-center justify-start pt-16 sm:pt-24 pb-20 px-4">
      <DocumentMeta description="BLS salary data, projected annual openings, and AI-exposure scores for every U.S. degree." />
      <div className="text-center max-w-2xl mx-auto w-full">
        <Mascot className="mx-auto mb-6 h-12 w-12 sm:h-14 sm:w-14" />
        <h1 className="font-sans text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-ink text-balance leading-[1.1]">
          What&apos;s your degree worth?
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed text-pretty max-w-xl mx-auto">
          Explore both traditional and adjacent jobs for your degree. Compare salary data, hiring
          volume, and which paths are growing.
        </p>

        <div className="flex justify-center mt-8">
          {loading ? (
            <p className="text-muted">Loading data...</p>
          ) : error ? (
            <p className="text-negative">{error}</p>
          ) : (
            <MajorSearch
              majors={majors}
              size="lg"
              resultsBase={resultsBase}
              placeholder="Search your degree"
              noMatchNoun="degrees"
              tone={isDark ? 'dark' : 'light'}
            />
          )}
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 sm:gap-12 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-ink font-mono tabular-nums">
              811
            </div>
            <div className="text-xs text-muted mt-1">Occupations</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-ink font-mono tabular-nums">
              1,920
            </div>
            <div className="text-xs text-muted mt-1">Degrees</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-ink font-mono tabular-nums">
              50
            </div>
            <div className="text-xs text-muted mt-1">States + DC</div>
          </div>
        </div>

        <blockquote className="mt-12 max-w-lg mx-auto">
          <p className="text-base sm:text-lg text-ink leading-relaxed text-pretty">
            “I had no idea my sociology degree maps to over thirty occupations.”
          </p>
          <footer className="mt-4">
            <cite className="not-italic">
              <span className="block text-sm font-medium text-ink">Samantha Wen</span>
              <span className="block text-sm text-muted">
                Berkeley ’23 and New Work Foundation co-founder
              </span>
            </cite>
          </footer>
        </blockquote>
      </div>

      <div className="mt-14 w-full max-w-4xl">
        <FieldReportEntryGraphic />
      </div>
    </div>
  )
}
