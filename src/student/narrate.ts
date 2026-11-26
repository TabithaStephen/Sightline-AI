/**
 * Plain-language narration for the Student Assistance Application, built from
 * the live form state in exactly the way the flight workflow's narration is.
 */

import {
  STAGE_LABEL,
  STAGE_ORDER,
  assistanceBand,
  stageById,
  validateStage,
  type DocumentItem,
  type StudentApplication,
  type StudentFieldKey,
  type StudentStageId,
} from './data'

export interface StudentNarrationInput {
  stage: StudentStageId
  app: StudentApplication
  documents: DocumentItem[]
  reference: string | null
}

function position(stage: StudentStageId): string {
  const index = STAGE_ORDER.indexOf(stage)
  return `step ${index + 1} of ${STAGE_ORDER.length}`
}

function filledCount(stage: StudentStageId, app: StudentApplication): string {
  const definition = stageById(stage)
  if (!definition) return ''
  const total = definition.fields.length
  const done = definition.fields.filter((field) => app[field.key].trim().length > 0).length
  return `${done} of the ${total} ${total === 1 ? 'field has' : 'fields have'} been filled in.`
}

export function studentExplainScreen(input: StudentNarrationInput): string {
  const { stage, app, documents, reference } = input
  const definition = stageById(stage)

  if (definition) {
    const list = definition.fields.map((field) => field.label.toLowerCase()).join(', ')
    return [
      `${definition.title}, ${position(stage)} of the Student Assistance Application.`,
      definition.blurb,
      `There ${definition.fields.length === 1 ? 'is one field' : `are ${definition.fields.length} fields`} on this screen: ${list}. All of them are required.`,
      filledCount(stage, app),
      'Move between the fields with Tab and I will explain each one as you reach it. Choosing Continue checks this section before moving on — it does not submit anything.',
      'This is a demonstration. Nothing is sent to any college or government service.',
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (stage === 'documents') {
    const provided = documents.filter((item) => item.provided)
    const missing = documents.filter((item) => !item.provided)
    return [
      `Supporting documents, ${position(stage)}.`,
      `A real application needs ${documents.length} supporting documents. In this demonstration you tick the ones you have ready — no file is uploaded anywhere.`,
      provided.length > 0
        ? `You have marked ${provided.length} as ready: ${provided.map((item) => item.label.toLowerCase()).join(', ')}.`
        : 'None are marked as ready yet.',
      missing.length > 0
        ? `Still missing: ${missing.map((item) => item.label.toLowerCase()).join(', ')}.`
        : 'Nothing is missing.',
      'You can continue with documents missing — the application would simply be held until they arrive.',
    ].join(' ')
  }

  if (stage === 'review') {
    const band = assistanceBand(app)
    const missing = documents.filter((item) => !item.provided)
    return [
      `Review, ${position(stage)}. Nothing has been submitted yet.`,
      `The application is for ${app.fullName || 'no name entered'}, student number ${app.studentId || 'not entered'}, at ${app.collegeName || 'no college chosen'}.`,
      `Course: ${app.course || 'not chosen'}, ${app.academicYear || 'year not chosen'}.`,
      `Household income entered: ₹${Number(app.annualIncome || 0).toLocaleString('en-IN')}, category ${app.category || 'not chosen'}, travelling ${app.travelRoute || 'route not entered'}.`,
      `On those figures the simulated decision is: ${band.band}. ${band.detail}`,
      missing.length > 0
        ? `${missing.length} supporting ${missing.length === 1 ? 'document is' : 'documents are'} still missing: ${missing.map((item) => item.label.toLowerCase()).join(', ')}.`
        : 'All supporting documents are marked ready.',
      'Every section has a Change link if something is wrong. Choosing Submit application completes the simulation — no real application is filed.',
    ].join(' ')
  }

  return [
    `The application is complete, ${position(stage)}.`,
    reference ? `The simulated reference is ${reference.split('').join(' ')}.` : '',
    'To be completely clear: this application was not submitted to any college, authority or government service. Nothing you entered left your browser, and this reference is not valid for anything.',
    'Choose Start a new application to run the task again.',
  ]
    .filter(Boolean)
    .join(' ')
}

export function studentStageIntro(input: StudentNarrationInput): string {
  const { stage, app, documents } = input
  const definition = stageById(stage)
  if (definition) {
    return `${definition.title}, ${position(stage)}. ${definition.fields.length === 1 ? 'One field' : `${definition.fields.length} fields`}, all required. ${filledCount(stage, app)}`
  }
  if (stage === 'documents') {
    const missing = documents.filter((item) => !item.provided).length
    return `Supporting documents. ${missing === 0 ? 'All of them are marked ready.' : `${missing} of ${documents.length} still to tick.`}`
  }
  if (stage === 'review') return 'Review. Check the application summary. Nothing has been submitted yet.'
  return 'The application is complete, as a simulation only. Nothing was submitted anywhere.'
}

export function studentNextSteps(input: StudentNarrationInput): string {
  const { stage, app, documents } = input
  const index = STAGE_ORDER.indexOf(stage)
  const previous = index > 0 ? STAGE_LABEL[STAGE_ORDER[index - 1]] : null
  const next = index < STAGE_ORDER.length - 1 ? STAGE_LABEL[STAGE_ORDER[index + 1]] : null
  const definition = stageById(stage)

  if (definition) {
    const errors = validateStage(definition, app)
    const outstanding = Object.keys(errors).length
    return [
      `You are on ${definition.title.toLowerCase()}, ${position(stage)}.`,
      outstanding === 0
        ? 'Every field on this screen is filled in correctly.'
        : `${outstanding} ${outstanding === 1 ? 'field still needs' : 'fields still need'} attention.`,
      next ? `Choosing Continue checks this section and moves on to ${next.toLowerCase()}.` : '',
      previous ? `Choosing Back returns to ${previous.toLowerCase()} with everything kept.` : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (stage === 'documents') {
    const missing = documents.filter((item) => !item.provided).length
    return `You are on the document checklist. ${missing === 0 ? 'Everything is ticked.' : `${missing} still to tick.`} Continue moves on to the review, and you can continue with documents missing.`
  }
  if (stage === 'review') {
    return 'You are on the review. From here you can change any section, or choose Submit application, which completes the simulation. No real application is filed.'
  }
  return 'The task is finished. The only action here is Start a new application, which clears this simulated application.'
}

/** Only the specific problem, phrased conversationally. */
export function studentErrorSpeech(key: StudentFieldKey, value: string, message: string): string {
  const empty = value.trim().length === 0
  const label = key
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim()
  if (empty) {
    if (key === 'dateOfBirth') return "Your date of birth hasn't been entered yet."
    if (key === 'collegeName') return "You haven't chosen your college yet."
    if (key === 'course') return "You haven't chosen your course yet."
    if (key === 'academicYear') return "You haven't chosen your academic year yet."
    if (key === 'category') return "You haven't chosen a category yet."
    return `Your ${label} hasn't been entered yet.`
  }
  if (key === 'email') {
    return "That email address doesn't appear to be valid. Please check that it contains a complete address, with an at sign and a dot."
  }
  if (key === 'phone') return 'The phone number appears incomplete. Please check the digits.'
  if (key === 'dateOfBirth') return "That date doesn't look right. Please enter it as day, month and year, like 14/08/2005."
  return `That ${label} doesn't look right. ${message}`
}

export function studentErrorSummary(
  errors: Array<[StudentFieldKey, string]>,
  app: StudentApplication,
): string {
  if (errors.length === 0) return 'Everything on this screen looks right.'
  const [key, message] = errors[0]
  const first = studentErrorSpeech(key, app[key], message)
  if (errors.length === 1) return `${first} Nothing has been submitted.`
  return `${errors.length} fields need your attention. Starting with the first: ${first} Nothing has been submitted.`
}
