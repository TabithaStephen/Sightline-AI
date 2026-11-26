/**
 * The Guided Demo script.
 *
 * Every step drives the real application UI — typing into the real inputs,
 * pressing the real buttons, triggering the real validation — so the audience
 * watches the product being used rather than a slideshow about it.
 *
 * The demo is completely silent: captions explain what is happening on screen
 * while the presenter speaks. Nothing here touches speech synthesis, speech
 * recognition, the microphone, or any network or external service.
 */

import { drivers, waitFor } from './drivers'
import { DEMO_APPLICATION } from '../student/data'

export interface DemoContext {
  /** Types text into a field one character at a time, pause-aware. */
  type: (apply: (value: string) => void, text: string, speedMs?: number) => Promise<void>
  /** A pause the judge can watch — interrupted cleanly by pause, skip and exit. */
  hold: (ms: number) => Promise<void>
  /** The line shown in the demo bar. Never spoken. */
  caption: (text: string) => void
  /** Mirrors the orb so the companion reads as busy while the demo acts. */
  phase: (phase: 'idle' | 'listening' | 'processing' | 'speaking') => void
  /** The simulated utterance shown as a transcript. */
  transcript: (text: string) => void
  cancelled: () => boolean
}

export interface DemoStep {
  id: string
  act: 1 | 2
  title: string
  run: (ctx: DemoContext) => Promise<void>
}

const REQUEST_TEXT = 'A direct flight from Bengaluru to Mumbai tomorrow morning'
const PASSENGER = { fullName: 'Asha Menon', email: 'asha.menon@example.com', phone: '9876543210' }
const BAD_EMAIL = 'asha.menon.example.com'
const BAD_STUDENT_EMAIL = 'rhea.nair.example.com'

const flight = () => waitFor(() => drivers.flight)
const entry = () => waitFor(() => drivers.taskEntry)
const form = () => waitFor(() => drivers.passengerForm)
const student = () => waitFor(() => drivers.student)

export const DEMO_SCRIPT: DemoStep[] = [
  /* ------------------------------------------------- Act 1 — flight booking */
  {
    id: 'open',
    act: 1,
    title: 'Opening the flight task',
    run: async (ctx) => {
      drivers.setScenario?.('flight')
      ;(await flight())?.reset()
      ctx.caption(
        'SIGHTLINE takes one task at a time and walks a person through it. This is the flight booking task, starting from an empty request.',
      )
      await ctx.hold(2600)
    },
  },
  {
    id: 'speak-request',
    act: 1,
    title: 'The request, in the user’s own words',
    run: async (ctx) => {
      ctx.phase('listening')
      ctx.caption('The user says what they need. No form, no dropdowns — just a sentence.')
      await ctx.hold(1400)
      ctx.transcript('I want to travel from Bengaluru to Mumbai tomorrow morning.')
      ctx.phase('processing')
      await ctx.hold(900)
    },
  },
  {
    id: 'type-request',
    act: 1,
    title: 'Filling the request box',
    run: async (ctx) => {
      await entry()
      ctx.caption('SIGHTLINE writes that into the request box, where it can be read back and corrected.')
      ctx.phase('processing')
      await ctx.type((value) => drivers.taskEntry?.setText(value), REQUEST_TEXT, 34)
      drivers.taskEntry?.setText(REQUEST_TEXT)
      await ctx.hold(900)
    },
  },
  {
    id: 'interpret',
    act: 1,
    title: 'Reading the request back',
    run: async (ctx) => {
      ;(await entry())?.submit()
      await ctx.hold(700)
      ctx.caption(
        'Before searching anything, SIGHTLINE shows what it understood: the cities, the budget, whether stops are allowed. Anything it filled in for itself is marked, and every detail is editable.',
      )
      ctx.phase('idle')
      await ctx.hold(4200)
    },
  },
  {
    id: 'search',
    act: 1,
    title: 'Searching',
    run: async (ctx) => {
      await flight()
      ctx.caption('The user confirms, and the search runs against the local simulated flight data.')
      ctx.phase('processing')
      drivers.flight?.beginSearch()
      await ctx.hold(1700)
      drivers.flight?.showResults()
      await ctx.hold(1200)
    },
  },
  {
    id: 'results',
    act: 1,
    title: 'Helping the user decide',
    run: async (ctx) => {
      ctx.phase('idle')
      ctx.caption(
        'The options are on screen. The hard part is not reading them, it is weighing them up — so SIGHTLINE does that out loud.',
      )
      await ctx.hold(2800)
      ctx.caption(drivers.flight?.tradeOff() ?? '')
      await ctx.hold(5200)
    },
  },
  {
    id: 'select',
    act: 1,
    title: 'Choosing a flight',
    run: async (ctx) => {
      await flight()
      ctx.caption('The user picks the recommended flight. SIGHTLINE never chooses for them.')
      drivers.flight?.selectRecommended()
      await ctx.hold(2400)
      ctx.caption(drivers.flight?.describeSelected() ?? '')
      await ctx.hold(1800)
      drivers.flight?.continueToPassenger()
      await ctx.hold(900)
    },
  },
  {
    id: 'passenger-name',
    act: 1,
    title: 'Entering passenger details',
    run: async (ctx) => {
      await flight()
      ctx.caption('Passenger details. SIGHTLINE explains each field as it is reached, then fills it in.')
      ctx.phase('processing')
      await ctx.type((value) => drivers.flight?.setPassengerField('fullName', value), PASSENGER.fullName, 60)
      await ctx.hold(600)
    },
  },
  {
    id: 'passenger-email',
    act: 1,
    title: 'A mistake, on purpose',
    run: async (ctx) => {
      await flight()
      ctx.caption('Watch the email address. This one is deliberately wrong — the at sign is missing.')
      await ctx.type((value) => drivers.flight?.setPassengerField('email', value), BAD_EMAIL, 44)
      await ctx.hold(700)
      await ctx.type((value) => drivers.flight?.setPassengerField('phone', value), PASSENGER.phone, 55)
      await ctx.hold(900)
    },
  },
  {
    id: 'passenger-error',
    act: 1,
    title: 'Catching the mistake',
    run: async (ctx) => {
      await form()
      const count = drivers.passengerForm?.validate() ?? 0
      ctx.caption(
        count > 0
          ? 'The form’s own validation catches it. SIGHTLINE names the one field that is wrong and says what to do about it — it does not read the whole form’s rules back at you.'
          : 'The form validated cleanly.',
      )
      await ctx.hold(4200)
    },
  },
  {
    id: 'passenger-fix',
    act: 1,
    title: 'Correcting it',
    run: async (ctx) => {
      await flight()
      ctx.caption('The correction goes in, and the error clears as soon as the value is valid.')
      drivers.flight?.setPassengerField('email', '')
      await ctx.hold(500)
      await ctx.type((value) => drivers.flight?.setPassengerField('email', value), PASSENGER.email, 40)
      await ctx.hold(600)
      const count = (await form())?.validate() ?? 0
      ctx.caption(count === 0 ? 'Validation passes. Nothing has been booked yet.' : 'Still checking the details.')
      await ctx.hold(2200)
    },
  },
  {
    id: 'review',
    act: 1,
    title: 'Review before anything happens',
    run: async (ctx) => {
      await flight()
      drivers.flight?.goReview()
      ctx.phase('idle')
      await ctx.hold(800)
      ctx.caption(
        'The review shows the chosen flight and the passenger details together, with a way back into either. Nothing is booked until the user decides.',
      )
      await ctx.hold(4600)
    },
  },
  {
    id: 'confirm',
    act: 1,
    title: 'Completing the task',
    run: async (ctx) => {
      await flight()
      drivers.flight?.confirm()
      await ctx.hold(900)
      ctx.caption(
        'A simulated confirmation, stated as such on screen. No airline was contacted, no seat held, no payment taken.',
      )
      await ctx.hold(4200)
    },
  },

  /* --------------------------------------- Act 2 — student assistance */
  {
    id: 'act2-switch',
    act: 2,
    title: 'A completely different task',
    run: async (ctx) => {
      drivers.setScenario?.('student')
      await student()
      drivers.student?.reset()
      ctx.caption(
        'The booking is not the point. The same companion runs any guided task — here is a student applying for travel assistance.',
      )
      await ctx.hold(3400)
    },
  },
  {
    id: 'act2-personal',
    act: 2,
    title: 'Personal details',
    run: async (ctx) => {
      await student()
      ctx.phase('processing')
      ctx.caption('The same pattern: one section at a time, each field explained as it is filled.')
      await ctx.type((value) => drivers.student?.setField('fullName', value), DEMO_APPLICATION.fullName, 62)
      await ctx.type((value) => drivers.student?.setField('dateOfBirth', value), DEMO_APPLICATION.dateOfBirth, 70)
      ctx.caption('And again, one entry is deliberately wrong — the email address has no at sign.')
      await ctx.type((value) => drivers.student?.setField('email', value), BAD_STUDENT_EMAIL, 40)
      await ctx.type((value) => drivers.student?.setField('phone', value), DEMO_APPLICATION.phone, 55)
      await ctx.hold(800)
    },
  },
  {
    id: 'act2-error',
    act: 2,
    title: 'The same guardian, a different form',
    run: async (ctx) => {
      await student()
      drivers.student?.submitStage()
      await ctx.hold(600)
      ctx.caption(
        'The section will not advance. The specific problem is named in plain words, in exactly the way it was on the flight form.',
      )
      await ctx.hold(4000)
      ctx.caption('The correction goes in, and the section advances.')
      drivers.student?.setField('email', '')
      await ctx.hold(400)
      await ctx.type((value) => drivers.student?.setField('email', value), DEMO_APPLICATION.email, 38)
      await ctx.hold(700)
      drivers.student?.submitStage()
      await ctx.hold(1400)
    },
  },
  {
    id: 'act2-college',
    act: 2,
    title: 'College and student number',
    run: async (ctx) => {
      await student()
      ctx.caption('College and student number: assistance is issued through the college, so it needs both.')
      drivers.student?.setField('collegeName', DEMO_APPLICATION.collegeName)
      await ctx.hold(900)
      await ctx.type((value) => drivers.student?.setField('studentId', value), DEMO_APPLICATION.studentId, 60)
      await ctx.hold(900)
      drivers.student?.submitStage()
      await ctx.hold(1200)
    },
  },
  {
    id: 'act2-course',
    act: 2,
    title: 'Course and year',
    run: async (ctx) => {
      await student()
      ctx.caption('Course and year decide which assistance band the application is assessed against.')
      drivers.student?.setField('course', DEMO_APPLICATION.course)
      await ctx.hold(1000)
      drivers.student?.setField('academicYear', DEMO_APPLICATION.academicYear)
      await ctx.hold(1200)
      drivers.student?.submitStage()
      await ctx.hold(1200)
    },
  },
  {
    id: 'act2-eligibility',
    act: 2,
    title: 'Eligibility',
    run: async (ctx) => {
      await student()
      ctx.caption('The income figure decides the outcome, so SIGHTLINE explains what it is used for before asking.')
      await ctx.type((value) => drivers.student?.setField('annualIncome', value), DEMO_APPLICATION.annualIncome, 80)
      await ctx.hold(500)
      drivers.student?.setField('category', DEMO_APPLICATION.category)
      await ctx.hold(800)
      await ctx.type((value) => drivers.student?.setField('travelRoute', value), DEMO_APPLICATION.travelRoute, 36)
      await ctx.hold(900)
      drivers.student?.submitStage()
      await ctx.hold(1300)
    },
  },
  {
    id: 'act2-documents',
    act: 2,
    title: 'The document checklist',
    run: async (ctx) => {
      await student()
      ctx.phase('idle')
      ctx.caption('Supporting documents. Each is ticked off as it is confirmed.')
      await ctx.hold(1400)
      drivers.student?.setDocument('id-card', true)
      await ctx.hold(1100)
      drivers.student?.setDocument('bonafide', true)
      await ctx.hold(1100)
      drivers.student?.setDocument('photo', true)
      await ctx.hold(1300)
      const state = drivers.student?.getState()
      const missing = state?.documents.filter((item) => !item.provided) ?? []
      ctx.caption(
        missing.length
          ? `One is still outstanding: the ${missing[0].label.toLowerCase()}. SIGHTLINE says which one is missing and what it is for, so the user knows exactly what to go and find.`
          : 'Every document is marked ready.',
      )
      await ctx.hold(4200)
      drivers.student?.setStage('review')
      await ctx.hold(1000)
    },
  },
  {
    id: 'act2-review',
    act: 2,
    title: 'Review and simulated decision',
    run: async (ctx) => {
      await student()
      drivers.student?.setStage('review')
      ctx.caption(
        'The whole application in one place, with the simulated assistance band worked out from the income that was entered.',
      )
      await ctx.hold(5000)
    },
  },
  {
    id: 'act2-complete',
    act: 2,
    title: 'Completing the second task',
    run: async (ctx) => {
      await student()
      drivers.student?.submitApplication()
      await ctx.hold(900)
      ctx.caption(
        'Two completely different tasks, start to finish, with the same companion. To be clear about both: no flight was booked and no application was filed with any college or authority. Everything stayed in this browser.',
      )
      await ctx.hold(5200)
    },
  },
]
