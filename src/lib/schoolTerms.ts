import termData from '@/data/schoolTerms.json'
import type { AustralianState } from '@/contexts/HouseholdContext'

export interface SchoolTerm {
  term: number
  start: string  // YYYY-MM-DD
  end:   string  // YYYY-MM-DD
}

export interface TermStatus {
  inTerm:          boolean
  termNumber:      number | null   // 1–4 if in term, null if in holidays
  currentTermEnd:  string | null   // YYYY-MM-DD last day of current term (if inTerm)
  nextPeriodStart: string | null   // YYYY-MM-DD first day of next term or first holiday day
  nextPeriodLabel: string | null   // e.g. "Term 2 starts" | "School holidays"
  nextTermNumber:  number | null   // which term is coming next
}

/** Return the term list for a given state + year, or null if not available. */
export function getTerms(state: AustralianState, year: number): SchoolTerm[] | null {
  const stateData = (termData as unknown as Record<string, Record<string, SchoolTerm[]>>)[state]
  if (!stateData) return null
  return stateData[String(year)] ?? null
}

/** Return the term a date falls within, or null if in holidays / outside data. */
export function getTermForDate(state: AustralianState, dateStr: string): SchoolTerm | null {
  const year = parseInt(dateStr.slice(0, 4), 10)
  const terms = getTerms(state, year)
  if (!terms) return null
  return terms.find(t => dateStr >= t.start && dateStr <= t.end) ?? null
}

/**
 * Full status for a given date — in term or holidays, and what changes next.
 * Looks across the current and following year so end-of-year works correctly.
 */
export function getTermStatus(state: AustralianState, dateStr: string): TermStatus {
  const year = parseInt(dateStr.slice(0, 4), 10)

  // Collect terms across this year and next (in case we're near year boundary)
  const terms: SchoolTerm[] = [
    ...(getTerms(state, year)     ?? []),
    ...(getTerms(state, year + 1) ?? []),
  ]

  const currentTerm = terms.find(t => dateStr >= t.start && dateStr <= t.end) ?? null

  if (currentTerm) {
    // In a term — holidays begin the day AFTER the term end date
    const termEnd  = currentTerm.end
    const nextTerm = terms.find(t => t.start > termEnd)
    return {
      inTerm:          true,
      termNumber:      currentTerm.term,
      currentTermEnd:  termEnd,
      nextPeriodStart: offsetDate(termEnd, 1),
      nextPeriodLabel: nextTerm ? 'School holidays' : null,
      nextTermNumber:  nextTerm?.term ?? null,
    }
  }

  // In holidays — find the next term that starts after today
  const nextTerm = terms.find(t => t.start > dateStr)
  return {
    inTerm:          false,
    termNumber:      null,
    currentTermEnd:  null,
    nextPeriodStart: nextTerm?.start ?? null,
    nextPeriodLabel: nextTerm ? `Term ${nextTerm.term} starts` : null,
    nextTermNumber:  nextTerm?.term ?? null,
  }
}

/** Check if a specific date string is the first day of a term or first day of holidays. */
export function getTermBannerForDate(
  state: AustralianState,
  dateStr: string,
): string | null {
  const year  = parseInt(dateStr.slice(0, 4), 10)
  const terms: SchoolTerm[] = [
    ...(getTerms(state, year - 1) ?? []),
    ...(getTerms(state, year)     ?? []),
    ...(getTerms(state, year + 1) ?? []),
  ]

  // First day of a term?
  const termStart = terms.find(t => t.start === dateStr)
  if (termStart) return `Term ${termStart.term} starts`

  // First day of holidays? (day after a term ends)
  const termJustEnded = terms.find(t => offsetDate(t.end, 1) === dateStr)
  if (termJustEnded) {
    const nextTerm = terms.find(t => t.start > dateStr)
    return nextTerm ? `School holidays` : `Term ${termJustEnded.term} ends`
  }

  return null
}

/** Check if a date string falls within school holidays. */
export function isSchoolHoliday(state: AustralianState, dateStr: string): boolean {
  return getTermForDate(state, dateStr) === null
}

// Always operate in UTC so Australian timezone offsets don't shift the date.
// e.g. in AEDT (UTC+11): new Date('2026-04-02T00:00:00') local → UTC rolls back
// to 2026-04-01, so toISOString() would return the wrong day.
function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')   // parse as UTC midnight
  d.setUTCDate(d.getUTCDate() + days)           // add days in UTC
  return d.toISOString().slice(0, 10)           // YYYY-MM-DD, still UTC
}
