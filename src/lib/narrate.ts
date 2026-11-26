/**
 * Turns live application state into plain-language explanations.
 *
 * Every sentence below is derived from the current request, the current result
 * set, the current selection and the real validation state. Nothing is
 * invented, nothing is sent anywhere, and no language model is involved: this
 * is deterministic text generation over the data already on screen.
 */

import { cityName } from '../data/airports'
import { clockToHuman, minutesToHuman, rupees, stopsLabel } from './format'
import { recommendationSummary } from './search'
import type { Passenger, RankedFlight, SearchResult, Step, TripRequest } from '../types'

export interface NarrationInput {
  step: Step
  request: TripRequest | null
  result: SearchResult | null
  selected: RankedFlight | null
  compared: RankedFlight[]
  passenger: Passenger
  bookingRef: string | null
}

export type FieldKey = keyof Passenger

const STEP_POSITION: Record<Step, string> = {
  entry: 'step one of five',
  interpret: 'step one of five',
  results: 'step two of five',
  passenger: 'step three of five',
  review: 'step four of five',
  confirmation: 'step five of five',
}

const ORDER_LABEL: Record<TripRequest['priority'], string> = {
  cheapest: 'lowest price first',
  fastest: 'shortest journey first',
  balanced: 'the best balance of price and time',
}

const TIME_LABEL: Record<TripRequest['timeOfDay'], string> = {
  any: 'any time of day',
  morning: 'the morning',
  afternoon: 'the afternoon',
  evening: 'the evening',
  night: 'the night',
}

function join(parts: string[]): string {
  return parts.filter(Boolean).join(' ')
}

/** "IndiGo 6E 5302, leaving 6:10 am, arriving 8:00 am, direct, 1 hour 50 minutes, ₹4,780" */
export function describeFlight(item: RankedFlight): string {
  const { flight } = item
  return `${flight.airline} ${flight.flightNumber}, leaving ${clockToHuman(flight.departTime)}, arriving ${clockToHuman(flight.arriveTime)}${flight.arrivesNextDay ? ' the next day' : ''}, ${stopsLabel(flight.stops).toLowerCase()}, ${minutesToHuman(item.durationMinutes)}, ${rupees(flight.price)}`
}

function cheapestOf(items: RankedFlight[]): RankedFlight | null {
  if (items.length === 0) return null
  return items.reduce((a, b) => (b.flight.price < a.flight.price ? b : a))
}

function fastestOf(items: RankedFlight[]): RankedFlight | null {
  if (items.length === 0) return null
  return items.reduce((a, b) => (b.durationMinutes < a.durationMinutes ? b : a))
}

function fewestStopsOf(items: RankedFlight[]): RankedFlight | null {
  if (items.length === 0) return null
  return items.reduce((a, b) => (b.flight.stops < a.flight.stops ? b : a))
}

/** The trade-off between two options, in the words a person would use. */
export function tradeOff(a: RankedFlight, b: RankedFlight): string {
  if (a.flight.id === b.flight.id) return ''
  const cheaper = a.flight.price <= b.flight.price ? a : b
  const dearer = cheaper.flight.id === a.flight.id ? b : a
  const priceGap = dearer.flight.price - cheaper.flight.price
  const timeGap = cheaper.durationMinutes - dearer.durationMinutes

  if (priceGap === 0 && timeGap === 0) {
    return `${a.flight.airline} ${a.flight.flightNumber} and ${b.flight.airline} ${b.flight.flightNumber} cost the same and take the same time, so the difference is the departure time and what each fare includes.`
  }

  if (timeGap > 0) {
    return `${cheaper.flight.airline} ${cheaper.flight.flightNumber} is cheaper by ${rupees(priceGap)}, but takes ${minutesToHuman(timeGap)} longer. ${dearer.flight.airline} ${dearer.flight.flightNumber} costs more and saves that time. If the price matters most, take the cheaper one. If getting there sooner matters more, take the quicker one.`
  }

  if (timeGap === 0) {
    return `${cheaper.flight.airline} ${cheaper.flight.flightNumber} is cheaper by ${rupees(priceGap)} and both take ${minutesToHuman(cheaper.durationMinutes)}, so you give up nothing in time by choosing it.`
  }

  return `${cheaper.flight.airline} ${cheaper.flight.flightNumber} is both cheaper, by ${rupees(priceGap)}, and quicker, by ${minutesToHuman(-timeGap)}. There is no trade-off between these two.`
}

/** Answers to the decision questions the results screen offers. */
export function answerChoiceQuestion(
  id: 'cheapest' | 'fastest' | 'stops' | 'tradeoff' | 'recommended',
  result: SearchResult | null,
  request: TripRequest | null,
): string {
  const items = result?.matches ?? []
  if (items.length === 0 || !request) {
    return 'There are no flights on screen to compare yet.'
  }

  const cheapest = cheapestOf(items)!
  const fastest = fastestOf(items)!
  const fewest = fewestStopsOf(items)!
  const recommended = items.find((item) => item.flight.id === result?.recommendedId) ?? null

  switch (id) {
    case 'cheapest': {
      const extra =
        cheapest.flight.stops === 0
          ? 'It is also direct.'
          : `It stops ${cheapest.flight.stops === 1 ? 'once' : `${cheapest.flight.stops} times`} in ${cheapest.flight.via.map(cityName).join(' and ')}, which is why it takes ${minutesToHuman(cheapest.durationMinutes)}.`
      const gap =
        items.length > 1
          ? ` The next cheapest is ${rupees([...items].sort((a, b) => a.flight.price - b.flight.price)[1].flight.price)}.`
          : ''
      return `The cheapest is ${describeFlight(cheapest)}. ${extra}${gap}`
    }

    case 'fastest': {
      const same = cheapest.flight.id === fastest.flight.id
      return same
        ? `The quickest is ${describeFlight(fastest)}, and it is the cheapest as well, so there is nothing to weigh up.`
        : `The quickest is ${describeFlight(fastest)}. ${tradeOff(cheapest, fastest)}`
    }

    case 'stops': {
      const direct = items.filter((item) => item.flight.stops === 0)
      if (direct.length === items.length) {
        return `Every one of these ${items.length} flights is direct, so none of them involves changing planes.`
      }
      if (direct.length === 0) {
        return `None of these flights is direct. The fewest stops is ${stopsLabel(fewest.flight.stops).toLowerCase()}, on ${describeFlight(fewest)}. A stop means landing somewhere on the way and waiting before you continue.`
      }
      const cheapestDirect = cheapestOf(direct)!
      return `${direct.length} of the ${items.length} flights are direct. The cheapest direct one is ${describeFlight(cheapestDirect)}. A direct flight goes straight there without changing planes.`
    }

    case 'tradeoff': {
      if (cheapest.flight.id === fastest.flight.id) {
        return `There is no trade-off here: ${cheapest.flight.airline} ${cheapest.flight.flightNumber} is the cheapest and the quickest at the same time, at ${rupees(cheapest.flight.price)} and ${minutesToHuman(cheapest.durationMinutes)}.`
      }
      const saving = fastest.flight.price - cheapest.flight.price
      const cost = cheapest.durationMinutes - fastest.durationMinutes
      return `${tradeOff(cheapest, fastest)} Put plainly: saving ${rupees(saving)} costs you ${minutesToHuman(cost)} of your day.`
    }

    case 'recommended':
    default: {
      if (!recommended) return 'No flight could be recommended for this request.'
      return `${describeFlight(recommended)}. ${recommendationSummary(recommended, request)} ${recommended.reasons.join(' ')}`
    }
  }
}

/** Reads the full option list aloud, one flight per sentence. */
export function readOptions(result: SearchResult | null): string {
  const items = result?.matches ?? []
  if (items.length === 0) return 'There are no flights on screen to read.'
  const lines = items.map((item, index) => {
    const tag = item.flight.id === result?.recommendedId ? ', the recommended option' : ''
    return `Option ${index + 1}${tag}: ${describeFlight(item)}.`
  })
  return `${items.length} simulated ${items.length === 1 ? 'flight' : 'flights'}. ${lines.join(' ')} To choose one, use the Select this flight button on that option.`
}

/** Explains the comparison the user has built, if they have built one. */
export function explainComparison(compared: RankedFlight[], result: SearchResult | null): string {
  if (compared.length < 2) {
    return 'You have not put two flights side by side yet. Tick Add to comparison on two or three flights and I will explain how they differ.'
  }
  const cheapest = cheapestOf(compared)!
  const fastest = fastestOf(compared)!
  const parts = [
    `You are comparing ${compared.length} flights: ${compared.map((item) => `${item.flight.airline} ${item.flight.flightNumber}`).join(', ')}.`,
    tradeOff(cheapest, fastest),
  ]

  const refundable = compared.filter((item) => item.flight.refundable)
  if (refundable.length > 0 && refundable.length < compared.length) {
    parts.push(
      `${refundable.map((item) => item.flight.flightNumber).join(' and ')} ${refundable.length === 1 ? 'is' : 'are'} refundable in this simulation; the others would return little or nothing if cancelled.`,
    )
  }

  const recommended = compared.find((item) => item.flight.id === result?.recommendedId)
  if (recommended) {
    parts.push(`${recommended.flight.airline} ${recommended.flight.flightNumber} is the one recommended for your request.`)
  }
  return join(parts)
}

/** The full "Explain this screen" narration for the current stage. */
export function explainScreen(input: NarrationInput): string {
  const { step, request, result, selected, compared, passenger, bookingRef } = input

  if (step === 'entry') {
    return join([
      'You are on the SIGHTLINE start screen, step one of five.',
      'SIGHTLINE is an accessibility companion that takes one task and walks you through it a step at a time. This demonstration books a flight using invented data.',
      'Tell me the flight you need in your own words. Say where you are flying from and where you are flying to, and add a budget, a time of day, or the word direct if you want to. For example: a direct flight from Bengaluru to Mumbai under eight thousand rupees.',
      'You can type it, dictate it, or choose one of the four suggested requests. Anything you leave out gets a sensible default that you can correct on the next screen.',
      'Nothing on this site is a real booking.',
    ])
  }

  if (step === 'interpret' && request) {
    const assumed = request.assumed
    return join([
      `This is the check screen, ${STEP_POSITION.interpret}.`,
      `You asked for: ${request.rawText}.`,
      'I read that with fixed rules rather than guessing, and here is what I understood.',
      `Flying from ${cityName(request.origin)} to ${cityName(request.destination)}.`,
      request.budget !== null
        ? `A budget of up to ${rupees(request.budget)} per person.`
        : 'No price limit, so every fare on the route will be shown.',
      request.directOnly
        ? 'Direct flights only, so anything with a stop will be hidden.'
        : 'Stops are allowed, so flights that change planes will be shown too.',
      request.timeOfDay !== 'any' ? `You wanted to leave in ${TIME_LABEL[request.timeOfDay]}.` : '',
      request.airline ? `You asked for ${request.airline}.` : '',
      `Results will be ordered by ${ORDER_LABEL[request.priority]}.`,
      assumed.length > 0
        ? `You did not mention ${assumed.join(' or ')}, so I filled in a default. Those fields are marked assumed on screen — check them first.`
        : 'Everything I needed was in your request.',
      'Every detail here is an editable control, so change anything that is wrong. When it looks right, choose Show matching flights. Nothing is searched until you do.',
    ])
  }

  if (step === 'results' && request) {
    if (!result?.routeSupported) {
      return join([
        `There are no simulated flights for ${cityName(request.origin)} to ${cityName(request.destination)}.`,
        'This demonstration only carries invented data for a few routes. Choose Change the cities to go back and pick a different pair.',
      ])
    }

    const items = result.matches
    const recommended = items.find((item) => item.flight.id === result.recommendedId)
    const cheapest = cheapestOf(items)
    const fastest = fastestOf(items)

    return join([
      `Flight results, ${STEP_POSITION.results}.`,
      `${items.length} simulated ${items.length === 1 ? 'flight matches' : 'flights match'} your request from ${cityName(request.origin)} to ${cityName(request.destination)}, ordered by ${ORDER_LABEL[request.priority]}.`,
      recommended
        ? `The first one is recommended: ${describeFlight(recommended)}. ${recommendationSummary(recommended, request)}`
        : '',
      cheapest && fastest && cheapest.flight.id !== fastest.flight.id
        ? `The cheapest and the quickest are different flights, so there is a choice to make. ${tradeOff(cheapest, fastest)}`
        : 'The cheapest option here is also the quickest.',
      result.relaxedNotes.length > 0 ? `One thing to know: ${result.relaxedNotes.join(' ')}` : '',
      compared.length >= 2 ? explainComparison(compared, result) : '',
      selected
        ? `You have chosen ${describeFlight(selected)}. Nothing is booked by choosing it.`
        : 'No flight is chosen yet. Say read the options to hear every flight, or ask which is cheapest, which is fastest, or what the trade-off is.',
      'Each option has a Select this flight button, and a tick box to add it to the side-by-side comparison.',
    ])
  }

  if (step === 'passenger') {
    return join([
      `Passenger details, ${STEP_POSITION.passenger}.`,
      selected ? `These details will be attached to ${describeFlight(selected)}.` : '',
      'There are three fields and all of them are required: full name, email address and phone number.',
      'They would go on the ticket in a real booking. In this demonstration they stay in your browser for this session and are not sent anywhere.',
      'Move between the fields with the Tab key. When you reach a field I will tell you what belongs in it and the format it expects.',
      'When the three fields are filled, choose Review booking. That opens a summary you can check — it does not book anything.',
    ])
  }

  if (step === 'review' && selected) {
    return join([
      `Review, ${STEP_POSITION.review}. This is the last screen before confirmation, and nothing has been booked yet.`,
      `Your flight is ${describeFlight(selected)}, from ${cityName(selected.flight.from)} to ${cityName(selected.flight.to)}.`,
      `Baggage: ${selected.flight.cabinBag}, ${selected.flight.checkedBag}. The fare is ${selected.flight.refundable ? 'refundable' : 'non-refundable'} in this simulation.`,
      `The passenger is ${passenger.fullName || 'not entered yet'}${passenger.email ? `, contactable on ${passenger.email}` : ''}${passenger.phone ? ` and ${passenger.phone}` : ''}.`,
      `The total for one passenger is ${rupees(selected.flight.price)}.`,
      'There are Change flight and Change passenger details links if anything is wrong.',
      'If you choose Confirm demo booking, SIGHTLINE shows a simulated confirmation with a made-up reference number. No airline is contacted, no seat is held and no payment is taken. You will never be asked for card details.',
    ])
  }

  if (step === 'confirmation' && selected) {
    return join([
      `This is the confirmation screen, ${STEP_POSITION.confirmation}. The guided task is complete.`,
      `${passenger.fullName} is shown as booked on ${describeFlight(selected)}, from ${cityName(selected.flight.from)} to ${cityName(selected.flight.to)}.`,
      bookingRef ? `The reference is ${bookingRef.split('').join(' ')}.` : '',
      'To be completely clear: this booking is simulated. No real reservation exists, no airline was contacted, no seat has been held and no payment has been taken. The reference is not valid for travel, and nothing you entered was sent anywhere.',
      'Choose Start a new search to run the whole task again with a different request.',
    ])
  }

  return 'This screen is part of the guided booking task. Use the buttons on screen to continue, or ask me what you can do here.'
}

/** A short spoken introduction used by Guided Mode when a stage opens. */
export function stageIntro(input: NarrationInput): string {
  const { step, request, result, selected, passenger } = input

  switch (step) {
    case 'entry':
      return 'Start screen. Tell me the flight you need in your own words, or pick one of the suggested requests.'
    case 'interpret':
      return request
        ? `Check screen. I understood ${cityName(request.origin)} to ${cityName(request.destination)}${request.budget !== null ? `, up to ${rupees(request.budget)}` : ''}${request.directOnly ? ', direct only' : ''}. Correct anything that is wrong, then choose Show matching flights.`
        : 'Check screen. Correct anything that is wrong, then choose Show matching flights.'
    case 'results': {
      if (!result?.routeSupported) return 'No simulated flights exist for that route. Go back and choose different cities.'
      const count = result.matches.length
      return `Flight results. ${count} simulated ${count === 1 ? 'flight matches' : 'flights match'}. The first one is recommended. Ask me which is cheapest, which is fastest, or what the trade-off is.`
    }
    case 'passenger':
      return `Passenger details. Three required fields: full name, email and phone. ${selected ? `They will be attached to ${selected.flight.airline} ${selected.flight.flightNumber}.` : ''} Nothing is booked on this screen.`
    case 'review':
      return `Review. Check the summary${selected ? `: ${selected.flight.airline} ${selected.flight.flightNumber} for ${rupees(selected.flight.price)}, passenger ${passenger.fullName || 'not entered'}` : ''}. Confirming creates a simulated booking only.`
    case 'confirmation':
      return 'The task is complete. This booking is simulated — no airline was contacted and no payment was taken.'
    default:
      return ''
  }
}

/** "Where am I, what have I done, what can I do, what happens next." */
export function describeNext(input: NarrationInput): string {
  const { step, result, selected, passenger } = input

  switch (step) {
    case 'entry':
      return 'You are at the beginning. From here you can type or dictate your request, or choose a suggested one. Choosing Understand my request takes you to a check screen where you can correct what I read — it does not search yet.';
    case 'interpret':
      return 'You have given me a request and I have read it back. From here you can change any detail, go back to rewrite your request, or choose Show matching flights to see the simulated options.'
    case 'results': {
      if (!result?.routeSupported) return 'There are no results for this route. The only action here is Change the cities, which takes you back to the check screen.'
      return selected
        ? `You have chosen ${selected.flight.airline} ${selected.flight.flightNumber}. From here you can pick a different flight, compare flights side by side, go back to change the search, or choose Continue with this flight to enter passenger details. Continuing does not book anything.`
        : 'You have a list of simulated flights. From here you can select one, tick two or three to compare them, or go back to change the search. The Continue button becomes available once a flight is selected.'
    }
    case 'passenger': {
      const filled = [passenger.fullName, passenger.email, passenger.phone].filter((v) => v.trim()).length
      return `You have chosen a flight and you are filling in passenger details. ${filled} of the 3 fields have something in them. From here you can go back to the flight list, or choose Review booking, which checks the fields and shows you a summary. It does not book anything.`
    }
    case 'review':
      return 'You have chosen a flight and entered the passenger details. From here you can change the flight, change the passenger details, or choose Confirm demo booking. Confirming shows a simulated confirmation — no airline is contacted and no payment is taken.'
    case 'confirmation':
      return 'The task is finished. The only action here is Start a new search, which clears this simulated booking and takes you back to the beginning.'
    default:
      return ''
  }
}

/** The commands the companion understands, phrased for speech. */
export function helpText(input: NarrationInput): string {
  const extras: string[] = []
  if (input.step === 'results') extras.push('read the options')
  return join([
    'You can say: explain this screen, what can I do here, repeat that, stop speaking, go back, or continue.',
    extras.length > 0 ? `On this screen you can also say: ${extras.join(', ')}.` : '',
    'Everything I can do by voice you can also do with the buttons and the keyboard.',
  ])
}

/* ---------------------------------------------------------------- Form help */

export const FIELD_LABEL: Record<FieldKey, string> = {
  fullName: 'Full name',
  email: 'Email address',
  phone: 'Phone number',
}

/** Short on-screen hint shown by the form guardian for the focused field. */
export const FIELD_HINT: Record<FieldKey, string> = {
  fullName: 'Required. Your name exactly as it appears on the travel identification you will use. Letters, spaces, hyphens and full stops only.',
  email: 'Required. The address the simulated booking would be sent to. It needs an at sign and a dot, like asha.menon@example.com.',
  phone: 'Required. A number the airline could call: ten digits, or with a country code such as +91 9876543210.',
}

/** The longer spoken version, used by Guided Mode and the voice companion. */
export function fieldHelp(key: FieldKey): string {
  switch (key) {
    case 'fullName':
      return 'Full name. This field is required. Enter your name exactly as it appears on the travel identification you will use, because a real airline matches the ticket against it. Letters, spaces, hyphens and full stops only. For example, Asha Menon.'
    case 'email':
      return 'Email address. This field is required. In a real booking this is where the ticket and any changes would be sent. It needs an at sign and a dot, for example asha dot menon at example dot com. In this demonstration nothing is sent anywhere.'
    case 'phone':
      return 'Phone number. This field is required. It is the number an airline could call if the flight changed. Enter ten digits, or add a country code, for example plus nine one, nine eight seven six five four three two one zero. Spaces, brackets and hyphens are fine.'
    default:
      return ''
  }
}

/** Explains a real validation error and how to fix it. */
export function errorHelp(key: FieldKey, message: string): string {
  const fix: Record<FieldKey, string> = {
    fullName: 'Move to the full name field and type the name as it is printed on the identification you will travel with.',
    email: 'Move to the email field and enter an address with an at sign and a dot in it, like asha.menon@example.com.',
    phone: 'Move to the phone field and enter ten digits, or a plus sign and a country code followed by the number.',
  }
  return `There is a problem with ${FIELD_LABEL[key].toLowerCase()}. ${message} ${fix[key]}`
}

/** Spoken summary of every outstanding validation error. */
export function errorSummarySpeech(errors: Array<[FieldKey, string]>): string {
  if (errors.length === 0) return 'Every field is filled in correctly.'
  const intro =
    errors.length === 1
      ? 'One detail needs your attention.'
      : `${errors.length} details need your attention.`
  return join([intro, ...errors.map(([key, message]) => errorHelp(key, message)), 'Nothing has been submitted.'])
}
