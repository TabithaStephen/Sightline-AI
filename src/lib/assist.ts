import { cityName } from '../data/airports'
import { clockToHuman, minutesToHuman, rupees, stopsLabel } from './format'
import { recommendationSummary } from './search'
import type { Passenger, RankedFlight, SearchResult, Step, TripRequest } from '../types'

export interface AssistQuestion {
  id: string
  question: string
  answer: string
}

export interface AssistContent {
  heading: string
  nextAction: string
  points: string[]
  questions: AssistQuestion[]
}

interface AssistInput {
  step: Step
  request: TripRequest | null
  result: SearchResult | null
  selected: RankedFlight | null
  compared: RankedFlight[]
  passenger: Passenger
  bookingRef: string | null
}

function describe(item: RankedFlight): string {
  const { flight } = item
  return `${flight.airline} ${flight.flightNumber}, ${clockToHuman(flight.departTime)} to ${clockToHuman(flight.arriveTime)}, ${stopsLabel(flight.stops).toLowerCase()}, ${rupees(flight.price)}`
}

/**
 * Builds the assistance panel from the live application state. Every sentence
 * below is derived from the current request, the current result set and the
 * current selection, so the panel can never describe a flight that is not on
 * screen.
 */
export function buildAssist(input: AssistInput): AssistContent {
  const { step, request, result, selected, compared, passenger, bookingRef } = input
  const matches = result?.matches ?? []
  const cheapest = matches.length
    ? matches.reduce((a, b) => (b.flight.price < a.flight.price ? b : a))
    : null
  const fastest = matches.length
    ? matches.reduce((a, b) => (b.durationMinutes < a.durationMinutes ? b : a))
    : null
  const recommended = matches.find((m) => m.flight.id === result?.recommendedId) ?? null

  const questions: AssistQuestion[] = []

  if (step === 'entry') {
    return {
      heading: 'How this works',
      nextAction: 'Type what you need in the box, or choose one of the example requests.',
      points: [
        'Describe your trip in your own words. For example: a direct flight from Bengaluru to Mumbai under 8,000 rupees.',
        'SIGHTLINE reads your words with fixed rules, shows you what it understood, and lets you correct anything before searching.',
        'All flights in this demo are simulated. Nothing is booked and no payment is ever taken.',
      ],
      questions: [
        {
          id: 'what-to-say',
          question: 'What can I include in my request?',
          answer:
            'A starting city, a destination city, a budget, whether you want a direct flight, and a rough time of day such as morning or evening. Anything you leave out gets a sensible default that you can change on the next screen.',
        },
        {
          id: 'is-it-real',
          question: 'Is this a real booking site?',
          answer:
            'No. This is a demonstration with made-up flights. It is built to show how a guided, plain-language interface can work. It does not replace your screen reader or other assistive tools.',
        },
      ],
    }
  }

  if (step === 'interpret' && request) {
    const assumedList = request.assumed.length
      ? `You did not mention: ${request.assumed.join(', ')}. Defaults were filled in and are marked on screen.`
      : 'Everything needed was found in your request.'
    return {
      heading: 'Check what was understood',
      nextAction: 'Read the details, change anything that is wrong, then choose "Show matching flights".',
      points: [
        `Trip: ${cityName(request.origin)} to ${cityName(request.destination)}.`,
        request.budget !== null ? `Budget: up to ${rupees(request.budget)} per person.` : 'Budget: none set, so all fares will be shown.',
        request.directOnly ? 'Direct flights only: yes, flights with stops will be hidden.' : 'Direct flights only: no, flights with stops will also be shown.',
        assumedList,
      ],
      questions: [
        {
          id: 'why-check',
          question: 'Why am I being asked to check this?',
          answer:
            'Because you stay in control. The request was read with simple rules, not a guess, and anything it filled in for you is marked so you can correct it before any results are shown.',
        },
        {
          id: 'direct-meaning',
          question: 'What does "direct" mean?',
          answer:
            'A direct flight goes straight to your destination without changing planes. A flight with a stop lands somewhere else on the way, and you wait there before continuing, which makes the journey longer.',
        },
      ],
    }
  }

  if (step === 'results' && request) {
    if (!result?.routeSupported) {
      return {
        heading: 'No simulated data for this route',
        nextAction: 'Go back and pick one of the four routes this demo includes.',
        points: [
          `This demo only carries invented flight data for a few routes, and ${cityName(request.origin)} to ${cityName(request.destination)} is not one of them.`,
          'Go back to change the cities, then search again.',
        ],
        questions: [],
      }
    }

    if (cheapest) {
      questions.push({
        id: 'cheapest',
        question: 'Which option is cheapest?',
        answer: `${describe(cheapest)}. ${cheapest.flight.stops === 0 ? 'It is also direct.' : `It stops in ${cheapest.flight.via.map(cityName).join(' and ')}, so it takes ${minutesToHuman(cheapest.durationMinutes)}.`}`,
      })
    }
    if (fastest) {
      questions.push({
        id: 'fastest',
        question: 'Which option is fastest?',
        answer: `${describe(fastest)}. The journey takes ${minutesToHuman(fastest.durationMinutes)}.`,
      })
    }
    if (recommended) {
      questions.push({
        id: 'why-recommended',
        question: 'Why is the top flight recommended?',
        answer: `${recommendationSummary(recommended, request)} In full: ${recommended.reasons.join(' ')}`,
      })
    }
    questions.push({
      id: 'baggage',
      question: 'What does the baggage line mean?',
      answer:
        'The cabin bag is the small bag you keep with you on the plane. The check-in bag is the larger bag the airline carries in the hold. If a flight includes no check-in bag, you would have to pay extra to take one.',
    })
    if (selected) {
      questions.push({
        id: 'selected',
        question: 'Which flight have I chosen?',
        answer: `You have chosen ${describe(selected)}. You can change this at any time by choosing a different flight, and nothing is booked until you reach the review screen.`,
      })
    }

    return {
      heading: 'Understanding these results',
      nextAction: selected
        ? 'Your flight is chosen. Choose "Continue with this flight" to enter passenger details.'
        : 'Read the options, then choose "Select this flight" on the one you want.',
      points: [
        `${matches.length} simulated ${matches.length === 1 ? 'flight' : 'flights'} match your request from ${cityName(request.origin)} to ${cityName(request.destination)}.`,
        recommended ? `The first card is recommended: ${recommendationSummary(recommended, request)}` : 'No flight could be recommended.',
        cheapest && fastest && cheapest.flight.id !== fastest.flight.id
          ? `The cheapest and the fastest are different flights here, so there is a trade-off between price and time.`
          : 'The cheapest option here is also the quickest.',
        compared.length >= 2
          ? `You are comparing ${compared.length} flights side by side.`
          : 'Tick "Compare" on two or three flights to see them side by side.',
        ...(result?.relaxedNotes ?? []),
      ],
      questions,
    }
  }

  if (step === 'passenger') {
    return {
      heading: 'Entering passenger details',
      nextAction: 'Fill in the three fields, then choose "Review booking". Nothing is confirmed yet.',
      points: [
        selected ? `These details will be attached to ${describe(selected)}.` : 'No flight is selected yet.',
        'Use the name as it appears on the identity document you will travel with.',
        'The email address and phone number are only used in this demo to show you what a real booking screen would ask for. Nothing is sent anywhere.',
        'If something is missing or looks wrong, the form tells you which field needs attention and why.',
      ],
      questions: [
        {
          id: 'why-details',
          question: 'Why are these details needed?',
          answer:
            'A real airline needs a passenger name for the ticket and a way to contact you if the flight changes. This demo asks for the same three things so the journey is realistic, but it stores them only in your browser for this session.',
        },
        {
          id: 'can-i-go-back',
          question: 'Can I still change my flight?',
          answer:
            'Yes. Choose "Back to flights" to return to the list and pick a different flight. Anything you have typed here is kept.',
        },
      ],
    }
  }

  if (step === 'review') {
    return {
      heading: 'Checking your booking',
      nextAction: 'Read the summary. If it is correct, choose "Confirm demo booking".',
      points: [
        selected
          ? `Flight: ${describe(selected)}, from ${cityName(selected.flight.from)} to ${cityName(selected.flight.to)}, taking ${minutesToHuman(selected.durationMinutes)}.`
          : 'No flight is selected.',
        `Passenger: ${passenger.fullName || 'not entered'}.`,
        selected ? `Total to pay in a real booking: ${rupees(selected.flight.price)} for one passenger.` : '',
        'This is the last step before confirmation. You can still change the flight or the passenger details from here.',
        'Confirming creates a simulated booking only. No reservation is made and no money is taken.',
      ].filter(Boolean),
      questions: [
        {
          id: 'what-happens',
          question: 'What happens when I confirm?',
          answer:
            'A demo confirmation screen appears with a made-up reference number. No airline is contacted, no seat is held and no payment is processed.',
        },
        {
          id: 'refundable',
          question: 'Is this fare refundable?',
          answer: selected
            ? selected.flight.refundable
              ? 'In this simulation the fare is marked refundable, which would mean you could cancel and get most of your money back.'
              : 'In this simulation the fare is marked non-refundable, which would mean cancelling returns little or nothing.'
            : 'No flight is selected yet.',
        },
      ],
    }
  }

  return {
    heading: 'Your demo booking is complete',
    nextAction: 'Choose "Start a new search" to try another request.',
    points: [
      bookingRef ? `Demo reference: ${bookingRef}. It is not valid for travel.` : '',
      selected ? `Simulated flight: ${describe(selected)}.` : '',
      'No real reservation exists and no payment was taken.',
      'Nothing you entered has been sent anywhere. Reloading the page clears it.',
    ].filter(Boolean),
    questions: [
      {
        id: 'real-booking',
        question: 'Do I need to cancel anything?',
        answer:
          'No. Nothing was booked. This screen exists only to show the end of the guided journey.',
      },
    ],
  }
}
