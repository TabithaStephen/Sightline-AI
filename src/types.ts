export interface Airport {
  code: string
  city: string
  airport: string
  aliases: string[]
}

export interface Flight {
  id: string
  airline: string
  airlineCode: string
  flightNumber: string
  from: string
  to: string
  departTime: string
  arriveTime: string
  price: number
  stops: number
  via: string[]
  cabinBag: string
  checkedBag: string
  refundable: boolean
  arrivesNextDay?: boolean
}

export type TimeOfDay = 'any' | 'morning' | 'afternoon' | 'evening' | 'night'
export type Priority = 'balanced' | 'cheapest' | 'fastest'

export interface TripRequest {
  origin: string
  destination: string
  budget: number | null
  directOnly: boolean
  timeOfDay: TimeOfDay
  priority: Priority
  airline: string | null
  assumed: string[]
  rawText: string
}

export interface RankedFlight {
  flight: Flight
  durationMinutes: number
  reasons: string[]
  withinBudget: boolean
  isCheapest: boolean
  isFastest: boolean
}

export interface SearchResult {
  matches: RankedFlight[]
  recommendedId: string | null
  relaxedNotes: string[]
  routeSupported: boolean
}

export interface Passenger {
  fullName: string
  email: string
  phone: string
}

export type Step = 'entry' | 'interpret' | 'results' | 'passenger' | 'review' | 'confirmation'
