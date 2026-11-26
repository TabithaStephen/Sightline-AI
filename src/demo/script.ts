/**
 * The Guided Demo script: twelve deterministic steps across both workflows.
 *
 * Every line is either fixed copy or narration generated from the data the
 * screen is actually showing. Nothing here uses a microphone, a network call
 * or any external service, so it runs identically every time.
 */

import { drivers, waitFor } from './drivers'
import { DEMO_APPLICATION } from '../student/data'
import { studentExplainScreen, studentNextSteps } from '../student/narrate'

export interface DemoStep {
  id: string
  act: 1 | 2
  title: string
  scenario: 'flight' | 'student'
  /** A simulated user utterance shown as a transcript before the narration. */
  transcript?: string
  /** Runs before the narration — usually the state change being demonstrated. */
  before?: () => void | Promise<void>
  /** The narration, resolved at run time so it reflects real screen data. */
  say: () => string
  /** Runs after the narration has finished. */
  after?: () => void | Promise<void>
}

const PASSENGER_INVALID = { fullName: 'Asha Menon', email: 'asha.menon.example.com', phone: '9876543210' }
const PASSENGER_FIXED = { fullName: 'Asha Menon', email: 'asha.menon@example.com', phone: '9876543210' }

const STUDENT_INVALID = { ...DEMO_APPLICATION, email: 'rhea.nair.example.com' }

async function flight() {
  return waitFor(() => drivers.flight)
}

async function student() {
  return waitFor(() => drivers.student)
}

export const DEMO_SCRIPT: DemoStep[] = [
  {
    id: 'intro',
    act: 1,
    title: 'What SIGHTLINE is',
    scenario: 'flight',
    before: async () => {
      drivers.setScenario?.('flight')
      ;(await flight())?.reset()
    },
    say: () =>
      'This is SIGHTLINE. Complex websites assume you can see the whole screen at once, scan it, and work out what matters. If you cannot, that assumption is the barrier. SIGHTLINE takes one task at a time, explains the screen in plain language, helps you weigh the options, and keeps every consequential decision in your hands. This demonstration runs two completely different tasks, start to finish, with nothing but local data.',
  },
  {
    id: 'screen',
    act: 1,
    title: 'Understanding the screen',
    scenario: 'flight',
    before: async () => {
      drivers.setScenario?.('flight')
      ;(await flight())?.reset()
    },
    say: () => drivers.flight?.explain() ?? 'The flight request screen is open.',
  },
  {
    id: 'request',
    act: 1,
    title: 'Speaking a request',
    scenario: 'flight',
    transcript: 'I want to travel from Bengaluru to Mumbai tomorrow morning.',
    before: async () => {
      ;(await flight())?.applyRequest('I want to travel from Bengaluru to Mumbai tomorrow morning, direct.')
    },
    say: () =>
      `${drivers.flight?.explain() ?? ''} In the demonstration that request is scripted rather than spoken into a microphone, so it runs the same way every time.`,
  },
  {
    id: 'results',
    act: 1,
    title: 'Helping you decide',
    scenario: 'flight',
    before: async () => {
      ;(await flight())?.showResults()
    },
    say: () =>
      `${drivers.flight?.explain() ?? ''} ${drivers.flight?.tradeOff() ?? ''} That comparison is worked out from the fares and journey times on screen, not from anything invented.`,
  },
  {
    id: 'select',
    act: 1,
    title: 'Choosing a flight',
    scenario: 'flight',
    transcript: 'Take the recommended one.',
    before: async () => {
      const api = await flight()
      api?.selectRecommended()
    },
    say: () =>
      `${drivers.flight?.describeSelected() ?? ''} Notice that SIGHTLINE did not choose for you: selecting a flight is a decision, so it stays an action you take. Nothing is booked yet.`,
    after: async () => {
      ;(await flight())?.continueToPassenger()
    },
  },
  {
    id: 'guardian',
    act: 1,
    title: 'Catching a mistake',
    scenario: 'flight',
    before: async () => {
      const api = await flight()
      api?.setPassenger(PASSENGER_INVALID)
      await new Promise((resolve) => setTimeout(resolve, 400))
      api?.validateNow()
    },
    say: () => {
      const errors = drivers.flight?.validateNow() ?? []
      const problem = errors.length
        ? "That email address doesn't appear to be valid. Please check that it contains a complete address, with an at sign and a dot."
        : 'The passenger details are filled in.'
      return `The passenger details are filled in from demonstration data, and one of them is deliberately wrong. ${problem} SIGHTLINE names the one field that is wrong and says what to do about it, rather than reading the whole form's rules back at you.`
    },
    after: async () => {
      const api = await flight()
      api?.setPassenger(PASSENGER_FIXED)
      await new Promise((resolve) => setTimeout(resolve, 300))
      api?.goReview()
    },
  },
  {
    id: 'confirm',
    act: 1,
    title: 'Review and completion',
    scenario: 'flight',
    say: () => `${drivers.flight?.explain() ?? ''}`,
    after: async () => {
      ;(await flight())?.confirm()
    },
  },
  {
    id: 'act2-intro',
    act: 2,
    title: 'A completely different task',
    scenario: 'student',
    before: async () => {
      drivers.setScenario?.('student')
      const api = await student()
      api?.reset()
    },
    say: () =>
      'That was a flight booked, as a simulation, from a sentence in plain English. The booking is not the point. The same companion works on any guided task, so here is a completely different one: a student applying for travel assistance. Same voice, same explanations, same field guidance — a different form entirely.',
  },
  {
    id: 'act2-understand',
    act: 2,
    title: 'Understanding the application',
    scenario: 'student',
    say: () => {
      const state = drivers.student?.getState()
      return state
        ? studentExplainScreen({ ...state, reference: null })
        : 'The student assistance application is open.'
    },
  },
  {
    id: 'act2-fill',
    act: 2,
    title: 'Completing the sections',
    scenario: 'student',
    transcript: 'My name is Rhea Nair, I study computer science at St. Joseph’s.',
    before: async () => {
      const api = await student()
      api?.setFields(STUDENT_INVALID)
      await new Promise((resolve) => setTimeout(resolve, 400))
    },
    say: () =>
      'The application is filled in from demonstration data: personal details, college and student number, course and year, and the household income that decides which assistance band applies. SIGHTLINE explains why each section exists rather than just listing the fields.',
  },
  {
    id: 'act2-error',
    act: 2,
    title: 'Catching a mistake again',
    scenario: 'student',
    say: () =>
      "One entry here is wrong on purpose. That email address doesn't appear to be valid. Please check that it contains a complete address, with an at sign and a dot. Again, just the one problem, in plain words — not the whole rule book.",
    after: async () => {
      const api = await student()
      api?.setFields({ email: DEMO_APPLICATION.email })
      await new Promise((resolve) => setTimeout(resolve, 300))
      api?.setStage('documents')
    },
  },
  {
    id: 'act2-documents',
    act: 2,
    title: 'The document checklist',
    scenario: 'student',
    before: async () => {
      const api = await student()
      api?.setStage('documents')
      await new Promise((resolve) => setTimeout(resolve, 250))
      api?.setDocument('id-card', true)
      api?.setDocument('bonafide', true)
      api?.setDocument('photo', true)
    },
    say: () => {
      const state = drivers.student?.getState()
      if (!state) return 'The document checklist is open.'
      const missing = state.documents.filter((item) => !item.provided)
      const ready = state.documents.filter((item) => item.provided)
      return `${ready.length} of the ${state.documents.length} supporting documents are marked ready: ${ready.map((item) => item.label.toLowerCase()).join(', ')}. ${missing.length ? `Still missing: ${missing.map((item) => item.label.toLowerCase()).join(', ')}. SIGHTLINE says which one is outstanding and what it is for, so you know exactly what to go and find.` : 'Nothing is outstanding.'}`
    },
  },
  {
    id: 'act2-complete',
    act: 2,
    title: 'Review and completion',
    scenario: 'student',
    before: async () => {
      const api = await student()
      api?.setStage('review')
      await new Promise((resolve) => setTimeout(resolve, 350))
    },
    say: () => {
      const state = drivers.student?.getState()
      const review = state ? studentExplainScreen({ ...state, reference: null }) : ''
      return `${review} To be completely clear about both halves of this demonstration: no flight was booked, no ticket exists, and no application has been filed with any college, authority or government service. Everything stayed in this browser.`
    },
    after: async () => {
      const api = await student()
      api?.submitApplication()
    },
  },
]

export function stepsForAct(act: 1 | 2): DemoStep[] {
  return DEMO_SCRIPT.filter((step) => step.act === act)
}

export { studentNextSteps }
