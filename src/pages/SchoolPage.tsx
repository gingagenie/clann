import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { getTerms } from '@/lib/schoolTerms'
import type { AustralianState } from '@/contexts/HouseholdContext'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

function todayStr(): string {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

const STATE_NAMES: Record<AustralianState, string> = {
  VIC: 'Victoria', NSW: 'New South Wales', QLD: 'Queensland',
  SA: 'South Australia', WA: 'Western Australia', TAS: 'Tasmania',
  ACT: 'ACT', NT: 'Northern Territory',
}

export default function SchoolPage() {
  const navigate = useNavigate()
  const { household } = useHousehold()
  const state = household?.state as AustralianState | null
  const today = todayStr()
  const currentYear = parseInt(today.slice(0, 4), 10)

  const years = [currentYear, currentYear + 1].filter(y => getTerms(state!, y) !== null)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border flex items-center gap-3 px-2 h-14">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h1 className="font-semibold text-foreground flex-1">School terms</h1>
        {state && (
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ color: '#3a5c2e', background: '#3a5c2e18' }}>
            {state}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 max-w-lg mx-auto w-full">
        {!state ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-4xl">🏫</p>
            <p className="font-semibold text-foreground">No state set</p>
            <p className="text-sm text-muted-foreground">Go to Settings to pick your school state.</p>
          </div>
        ) : (
          <>
            {state && <p className="text-sm text-muted-foreground -mt-1">{STATE_NAMES[state]}</p>}
            {years.map(year => {
              const terms = getTerms(state, year)
              if (!terms) return null
              return (
                <div key={year} className="space-y-3">
                  <h2 className="text-base font-bold text-foreground">{year}</h2>
                  {terms.map(term => {
                    const isCurrent = today >= term.start && today <= term.end
                    const isPast    = today > term.end
                    return (
                      <div
                        key={term.term}
                        className="rounded-2xl p-4"
                        style={{
                          background: isCurrent ? '#f5f0e8' : 'transparent',
                          border: `2px solid ${isCurrent ? '#3a5c2e' : 'hsl(var(--border))'}`,
                          opacity: isPast ? 0.45 : 1,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-foreground">
                              Term {term.term}
                              {isCurrent && (
                                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: '#3a5c2e', color: '#fff' }}>
                                  Now
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {formatDate(term.start)} – {formatDate(term.end)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
