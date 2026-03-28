/**
 * Attempts to merge two quantity strings into a combined total.
 * Examples:
 *   "500g"    + "500g"    → "1kg"
 *   "500g"    + "1kg"     → "1.5kg"
 *   "400ml"   + "270ml"   → "670ml"
 *   "270ml"   + "1L"      → "1.27L"
 *   "3"       + "2"       → "5"
 *   "3 cloves"+ "2 cloves"→ "5 cloves"
 *   "1 jar"   + "1 jar"   → "2 jars"  (simple count with label)
 *   "to serve"+ "500g"    → "500g"    (absorb non-quantifiable)
 *   "1 jar"   + "400g tin"→ "1 jar + 400g tin"  (incompatible, show both)
 */

interface Parsed {
  value: number
  unit: string        // normalised: 'g', 'ml', or '' for bare counts
  label: string       // original unit label for display
  singular: string    // label without trailing 's' for pluralisation
}

function parse(q: string): Parsed | null {
  const s = q.trim()

  // Non-quantifiable — "to serve", "as needed", "to taste"
  if (/^(to serve|to taste|as needed|optional)$/i.test(s)) return null

  // Pure metric weight/volume: "500g", "1.5kg", "270ml", "1L", "2l"
  const metric = s.match(/^([\d.]+)\s*(g|kg|ml|l)$/i)
  if (metric) {
    const raw = parseFloat(metric[1])
    const u = metric[2].toLowerCase()
    if (u === 'kg') return { value: raw * 1000, unit: 'g',  label: 'kg', singular: 'kg' }
    if (u === 'l')  return { value: raw * 1000, unit: 'ml', label: 'L',  singular: 'L'  }
    return { value: raw, unit: u, label: u, singular: u }
  }

  // Pure number: "3", "2", "4"
  const bare = s.match(/^(\d+)$/)
  if (bare) {
    return { value: parseInt(bare[1]), unit: '', label: '', singular: '' }
  }

  // Number + word label: "3 cloves", "2 tbsp", "1 jar", "4 rashers"
  const counted = s.match(/^(\d+)\s+(.+)$/)
  if (counted) {
    const label = counted[2].trim()
    // Remove trailing 's' for singular form used in pluralisation
    const singular = label.replace(/s$/i, '')
    return { value: parseInt(counted[1]), unit: label.toLowerCase(), label, singular }
  }

  return null
}

function format(value: number, unit: string): string {
  if (unit === 'g') {
    if (value >= 1000) {
      const kg = value / 1000
      return `${+kg.toFixed(2).replace(/\.?0+$/, '')}kg`
    }
    return `${Math.round(value)}g`
  }
  if (unit === 'ml') {
    if (value >= 1000) {
      const l = value / 1000
      return `${+l.toFixed(2).replace(/\.?0+$/, '')}L`
    }
    return `${Math.round(value)}ml`
  }
  return String(Math.round(value))
}

export function mergeQuantity(existing: string | null, incoming: string | null): string {
  const e = existing?.trim() ?? ''
  const i = incoming?.trim() ?? ''

  if (!e) return i
  if (!i) return e

  const a = parse(e)
  const b = parse(i)

  // One or both are non-quantifiable ("to serve") — keep the other
  if (!a && !b) return e
  if (!a) return i
  if (!b) return e

  // Same unit → add and reformat
  if (a.unit === b.unit) {
    const total = a.value + b.value

    // Bare numbers
    if (a.unit === '') return String(total)

    // Metric (g / ml) — reformat with unit conversion
    if (a.unit === 'g' || a.unit === 'ml') return format(total, a.unit)

    // Word unit (cloves, tbsp, jars, etc.) — pluralise simply
    const label = total === 1 ? a.singular : (a.label.endsWith('s') ? a.label : a.label + 's')
    return `${total} ${label}`
  }

  // Incompatible units — show both
  return `${e} + ${i}`
}
