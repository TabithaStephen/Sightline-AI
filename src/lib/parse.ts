import { AIRPORTS } from '../data/airports'
import { AIRLINE_NAMES } from '../data/flights'
import type { TimeOfDay, Priority, TripRequest } from '../types'

/**
 * Deterministic, rule-based parsing of the user's request.
 * No language model and no network call is involved: every rule below is
 * plain pattern matching, which is why the app can explain exactly what it
 * understood and let the user correct it.
 */

interface Hit {
  code: string
  index: number
  label: 'from' | 'to' | null
}

function findAirportHits(text: string): Hit[] {
  const hits: Hit[] = []
  for (const airport of AIRPORTS) {
    let best = -1
    for (const alias of airport.aliases) {
      const pattern = new RegExp(`\\b${alias}\\b`, 'i')
      const match = pattern.exec(text)
      if (match && (best === -1 || match.index < best)) best = match.index
    }
    if (best === -1) continue
    const before = text.slice(Math.max(0, best - 14), best)
    let label: Hit['label'] = null
    if (/\b(to|into|towards|reach)\s+$/i.test(before)) label = 'to'
    else if (/\b(from|leaving|depart(?:ing)?(?:\s+from)?|out of)\s+$/i.test(before)) label = 'from'
    hits.push({ code: airport.code, index: best, label })
  }
  return hits.sort((a, b) => a.index - b.index)
}

function parseBudget(text: string): number | null {
  const patterns = [
    /(?:under|below|less than|within|upto|up to|max(?:imum)?(?:\s+of)?|budget(?:\s+of)?|cheaper than|no more than|<=?)\s*(?:₹|rs\.?|inr)?\s*([\d][\d,]*)\s*(k\b|thousand)?/i,
    /(?:₹|rs\.?\s*|inr\s*)([\d][\d,]*)\s*(k\b|thousand)?/i,
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (!match) continue
    let value = Number(match[1].replace(/,/g, ''))
    if (!Number.isFinite(value) || value <= 0) continue
    if (match[2]) value *= 1000
    else if (value <= 100) value *= 1000 // "under 8" means 8 thousand
    return Math.round(value)
  }
  return null
}

function parseTimeOfDay(text: string): TimeOfDay {
  if (/\b(morning|early|sunrise|before noon|am flight)\b/i.test(text)) return 'morning'
  if (/\b(afternoon|midday|mid-day|after lunch)\b/i.test(text)) return 'afternoon'
  if (/\b(evening|after work|late afternoon)\b/i.test(text)) return 'evening'
  if (/\b(night|late night|red[- ]?eye|overnight)\b/i.test(text)) return 'night'
  return 'any'
}

function parsePriority(text: string): Priority {
  if (/\b(cheapest|cheap|lowest fare|least expensive|most affordable|save money)\b/i.test(text)) return 'cheapest'
  if (/\b(fastest|quickest|shortest|quick|soonest arrival)\b/i.test(text)) return 'fastest'
  return 'balanced'
}

function parseAirline(text: string): string | null {
  for (const name of AIRLINE_NAMES) {
    if (new RegExp(`\\b${name.replace(/\s+/g, '\\s+')}\\b`, 'i').test(text)) return name
  }
  return null
}

export const DEFAULT_ORIGIN = 'BLR'
export const DEFAULT_DESTINATION = 'BOM'

export function parseRequest(rawText: string): TripRequest {
  const text = rawText.trim()
  const hits = findAirportHits(text)
  const assumed: string[] = []

  let origin = hits.find((h) => h.label === 'from')?.code ?? null
  let destination = hits.find((h) => h.label === 'to')?.code ?? null

  const unlabelled = hits.filter((h) => h.code !== origin && h.code !== destination)
  if (!origin && !destination) {
    origin = unlabelled[0]?.code ?? null
    destination = unlabelled[1]?.code ?? null
  } else if (!origin) {
    origin = unlabelled[0]?.code ?? null
  } else if (!destination) {
    destination = unlabelled[0]?.code ?? null
  }

  if (!origin) {
    origin = DEFAULT_ORIGIN
    assumed.push('origin')
  }
  if (!destination || destination === origin) {
    destination = destination === origin ? (origin === DEFAULT_DESTINATION ? DEFAULT_ORIGIN : DEFAULT_DESTINATION) : DEFAULT_DESTINATION
    assumed.push('destination')
  }

  const budget = parseBudget(text)
  if (budget === null) assumed.push('budget')

  return {
    origin,
    destination,
    budget,
    directOnly: /\b(direct|non[- ]?stop|nonstop|no stops?|without (?:a )?stops?|straight through)\b/i.test(text),
    timeOfDay: parseTimeOfDay(text),
    priority: parsePriority(text),
    airline: parseAirline(text),
    assumed,
    rawText: text,
  }
}

export const TIME_WINDOWS: Record<Exclude<TimeOfDay, 'any'>, { label: string; from: number; to: number }> = {
  morning: { label: 'morning (5:00 am to 11:59 am)', from: 5 * 60, to: 11 * 60 + 59 },
  afternoon: { label: 'afternoon (12:00 pm to 4:59 pm)', from: 12 * 60, to: 16 * 60 + 59 },
  evening: { label: 'evening (5:00 pm to 8:59 pm)', from: 17 * 60, to: 20 * 60 + 59 },
  night: { label: 'night (9:00 pm to 4:59 am)', from: 21 * 60, to: 4 * 60 + 59 },
}
