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
  /** Puts the flight list into its visible searching state. */
  beginSearch: () => void
  showResults: () => void
  selectRecommended: () => void
  continueToPassenger: () => void
  setPassenger: (passenger: Passenger) => void
  /** Sets one passenger field, so the demo can type into it character by character. */
  setPassengerField: (key: keyof Passenger, value: string) => void
  /** Runs the real validator and returns what is actually wrong. */
  validateNow: () => Array<[keyof Passenger, string]>
  goReview: () => void
  confirm: () => void
  explain: () => string
  nextSteps: () => string
  tradeOff: () => string
  describeSelected: () => string
}

/** The request box on the first screen, so the demo can type into it. */
export interface TaskEntryDriver {
  setText: (text: string) => void
  submit: () => void
}

/** The passenger form, so the demo can trigger its real validation. */
export interface PassengerFormDriver {
  /** Runs the form's own submit path and returns the number of real errors. */
  validate: () => number
}

export interface DemoRegistry {
  flight: FlightDriver | null
  student: StudentDriver | null
  taskEntry: TaskEntryDriver | null
  passengerForm: PassengerFormDriver | null
  setScenario: ((scenario: 'flight' | 'student') => void) | null
}

export const drivers: DemoRegistry = {
  flight: null,
  student: null,
  taskEntry: null,
  passengerForm: null,
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
