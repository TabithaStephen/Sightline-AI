/**
 * A small registry the Guided Demo drives the two workflows through.
 *
 * Each workflow registers a handful of imperative actions while it is mounted.
 * The demo calls them with predefined data, so it never depends on a
 * microphone, a network, or any external service.
 */

import type { Passenger } from '../types'
import type { StudentDriver } from '../student/StudentWorkflow'

export interface FlightDriver {
  reset: () => void
  applyRequest: (text: string) => void
  showResults: () => void
  selectRecommended: () => void
  continueToPassenger: () => void
  setPassenger: (passenger: Passenger) => void
  /** Runs the real validator and returns what is actually wrong. */
  validateNow: () => Array<[keyof Passenger, string]>
  goReview: () => void
  confirm: () => void
  explain: () => string
  nextSteps: () => string
  tradeOff: () => string
  describeSelected: () => string
}

export interface DemoRegistry {
  flight: FlightDriver | null
  student: StudentDriver | null
  setScenario: ((scenario: 'flight' | 'student') => void) | null
}

export const drivers: DemoRegistry = {
  flight: null,
  student: null,
  setScenario: null,
}

/** Waits for a workflow to mount and register itself after a scenario switch. */
export async function waitFor<T>(get: () => T | null, timeoutMs = 4000): Promise<T | null> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const value = get()
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, 60))
  }
  return null
}
