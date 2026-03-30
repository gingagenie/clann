import termData from '@/data/schoolTerms.json'
import type { AustralianState } from '@/contexts/HouseholdContext'

export interface SchoolTerm {
  term: number
  start: string  // YYYY-MM-DD
  end:   string  // YYYY-MM-DD
}

export interface TermStatus {
  inTerm:     boolean
  termNumber: number | null   // 1–4 if in term, null if in holidays
  /** First day of the NEXT upcoming term or holiday period (for banner logic) */
  nextPeriodStart: string | null
  nextPeriodLabel: string | null  // e.g. "Term 2 starts" | "School holidays"
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
    // In a term — find the next holiday start (day after term ends)
    const termEnd    = currentTerm.end
    const nextDay    = offsetDate(termEnd, 1)
    const nextTerm   = terms.find(t => t.start > termEnd)
    return {
      inTerm:          true,
      termNumber:      currentTerm.term,
      nextPeriodStart: nextDay,
      nextPeriodLabel: nextTerm ? `School holidays` : null,
    }
  }

  // In holidays — find the next term that starts after today
  const nextTerm = terms.find(t => t.start > dateStr)
  return {
    inTerm:          false,
    termNumber:      null,
    nextPeriodStart: nextTerm?.start ?? null,
    nextPeriodLabel: nextTerm ? `Term ${nextTerm.term} starts` : null,
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

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
