import { FLIGHTS } from '../data/flights'
import { cityName } from '../data/airports'
import { TIME_WINDOWS } from './parse'
import { clockToHuman, minutesToHuman, rupees, timeToMinutes } from './format'
import type { Flight, RankedFlight, SearchResult, TripRequest } from '../types'

export function flightDuration(flight: Flight): number {
  const depart = timeToMinutes(flight.departTime)
  const arrive = timeToMinutes(flight.arriveTime)
  const raw = arrive - depart
  return raw <= 0 ? raw + 24 * 60 : raw
}

function inTimeWindow(flight: Flight, window: { from: number; to: number }): boolean {
  const depart = timeToMinutes(flight.departTime)
  if (window.from <= window.to) return depart >= window.from && depart <= window.to
  return depart >= window.from || depart <= window.to // window crosses midnight
}

/**
 * Deterministic filtering. Filters are applied strictly first. If that leaves
 * nothing, the least important filter is relaxed one step at a time and the
 * user is told exactly what was relaxed, so results are never silently wrong.
 */
export function searchFlights(request: TripRequest): SearchResult {
  const onRoute = FLIGHTS.filter((f) => f.from === request.origin && f.to === request.destination)
  if (onRoute.length === 0) {
    return { matches: [], recommendedId: null, relaxedNotes: [], routeSupported: false }
  }

  const relaxedNotes: string[] = []
  let pool = onRoute

  const byAirline = (list: Flight[]) => (request.airline ? list.filter((f) => f.airline === request.airline) : list)
  const timeOfDay = request.timeOfDay
  const byTime = (list: Flight[]) =>
    timeOfDay === 'any' ? list : list.filter((f) => inTimeWindow(f, TIME_WINDOWS[timeOfDay]))
  const byBudget = (list: Flight[]) => (request.budget === null ? list : list.filter((f) => f.price <= request.budget!))
  const byDirect = (list: Flight[]) => (request.directOnly ? list.filter((f) => f.stops === 0) : list)

  // Relaxation order: airline first, then departure window, then budget, then direct.
  const steps: Array<{ apply: (list: Flight[]) => Flight[]; note: string; active: boolean }> = [
    { apply: byAirline, note: `No ${request.airline} flights matched, so other airlines are included.`, active: request.airline !== null },
    { apply: byTime, note: `No flights matched the ${request.timeOfDay} departure window, so all departure times are included.`, active: request.timeOfDay !== 'any' },
    { apply: byBudget, note: `No flights were available under ${request.budget !== null ? rupees(request.budget) : 'your budget'}, so slightly higher fares are included.`, active: request.budget !== null },
    { apply: byDirect, note: 'No direct flights were available, so flights with a stop are included.', active: request.directOnly },
  ]

  const enabled = steps.map((s) => s.active)
  const applyAll = (flags: boolean[]) =>
    steps.reduce((list, step, i) => (flags[i] ? step.apply(list) : list), onRoute)

  pool = applyAll(enabled)
  for (let i = 0; i < steps.length && pool.length === 0; i++) {
    if (!enabled[i]) continue
    enabled[i] = false
    relaxedNotes.push(steps[i].note)
    pool = applyAll(enabled)
  }

  const cheapestPrice = Math.min(...pool.map((f) => f.price))
  const fastestDuration = Math.min(...pool.map(flightDuration))

  const ranked: RankedFlight[] = pool.map((flight) => {
    const durationMinutes = flightDuration(flight)
    return {
      flight,
      durationMinutes,
      reasons: [],
      withinBudget: request.budget === null ? true : flight.price <= request.budget,
      isCheapest: flight.price === cheapestPrice,
      isFastest: durationMinutes === fastestDuration,
    }
  })

  // Absolute scales, not the spread of this result set: paying 2,000 rupees more
  // and travelling an hour longer count the same, so a five minute saving never
  // outranks a real difference in price.
  const PRICE_SCALE = 2000
  const DURATION_SCALE = 60

  const weights =
    request.priority === 'cheapest'
      ? { price: 0.75, duration: 0.25 }
      : request.priority === 'fastest'
        ? { price: 0.25, duration: 0.75 }
        : { price: 0.5, duration: 0.5 }

  const scored = ranked.map((item) => {
    const priceScore = (item.flight.price - cheapestPrice) / PRICE_SCALE
    const durationScore = (item.durationMinutes - fastestDuration) / DURATION_SCALE
    let score = priceScore * weights.price + durationScore * weights.duration
    if (item.flight.stops === 0) score -= 0.12 // a direct flight is simpler to take
    if (!item.withinBudget) score += 1
    return { item, score }
  })

  scored.sort((a, b) => a.score - b.score || a.item.flight.price - b.item.flight.price)
  const sorted = scored.map((s) => s.item)
  for (const item of sorted) item.reasons = buildReasons(item, request)

  return {
    matches: sorted,
    recommendedId: sorted[0]?.flight.id ?? null,
    relaxedNotes,
    routeSupported: true,
  }
}

function buildReasons(item: RankedFlight, request: TripRequest): string[] {
  const reasons: string[] = []
  const { flight } = item

  if (flight.stops === 0) reasons.push('It is a direct flight, so you stay on the same plane the whole way.')
  else if (flight.stops === 1) reasons.push(`It stops once in ${cityName(flight.via[0])}, where you wait before continuing.`)
  else reasons.push(`It stops ${flight.stops} times, in ${flight.via.map(cityName).join(' and ')}.`)

  if (request.budget !== null && item.withinBudget) {
    const spare = request.budget - flight.price
    reasons.push(
      spare > 0
        ? `At ${rupees(flight.price)} it is ${rupees(spare)} under your ${rupees(request.budget)} budget.`
        : `At ${rupees(flight.price)} it exactly meets your ${rupees(request.budget)} budget.`,
    )
  } else if (request.budget !== null) {
    reasons.push(`At ${rupees(flight.price)} it is ${rupees(flight.price - request.budget)} over your ${rupees(request.budget)} budget.`)
  } else {
    reasons.push(`The fare is ${rupees(flight.price)}.`)
  }

  if (item.isCheapest) reasons.push('It is the lowest fare in these results.')
  if (item.isFastest) reasons.push(`It is the shortest journey in these results, at ${minutesToHuman(item.durationMinutes)}.`)

  if (request.timeOfDay !== 'any') {
    reasons.push(`It departs at ${clockToHuman(flight.departTime)}, in the ${request.timeOfDay} as you asked.`)
  }

  if (flight.checkedBag.startsWith('No')) reasons.push('No check-in bag is included, so you would pay extra for luggage.')
  else reasons.push(`${flight.checkedBag}.`)

  if (flight.arrivesNextDay) reasons.push('It lands after midnight, on the following day.')

  return reasons
}

export function recommendationSummary(item: RankedFlight, request: TripRequest): string {
  const parts: string[] = []
  if (item.flight.stops === 0) parts.push('it is direct')
  if (request.budget !== null && item.withinBudget) parts.push('it is within your budget')
  if (item.isCheapest) parts.push('it is the lowest fare here')
  if (item.isFastest) parts.push('it is the shortest journey here')
  if (parts.length === 0) parts.push('it is the closest match to what you asked for')
  const joined =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  return `Recommended because ${joined}.`
}
