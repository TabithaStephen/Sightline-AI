/**
 * Student Assistance Application — a second simulated workflow.
 *
 * Entirely local and deterministic: colleges, courses and the document list are
 * demo data, nothing is submitted anywhere, and none of this touches the flight
 * booking logic.
 */

export type StudentStageId =
  | 'personal'
  | 'college'
  | 'course'
  | 'eligibility'
  | 'documents'
  | 'review'
  | 'complete'

export type StudentFieldKey =
  | 'fullName'
  | 'dateOfBirth'
  | 'email'
  | 'phone'
  | 'collegeName'
  | 'studentId'
  | 'course'
  | 'academicYear'
  | 'annualIncome'
  | 'category'
  | 'travelRoute'

export interface StudentApplication extends Record<StudentFieldKey, string> {}

export interface DocumentItem {
  id: string
  label: string
  note: string
  provided: boolean
}

export interface StudentField {
  key: StudentFieldKey
  label: string
  hint: string
  type: 'text' | 'email' | 'tel' | 'number' | 'select'
  options?: string[]
  /** The longer spoken explanation used by Guided Mode and the companion. */
  help: string
}

export interface StudentStage {
  id: StudentStageId
  title: string
  accent: string
  blurb: string
  fields: StudentField[]
}

export const COLLEGES = [
  'St. Joseph’s College, Bengaluru',
  'Christ University, Bengaluru',
  'Mount Carmel College, Bengaluru',
  'Jyoti Nivas College, Bengaluru',
]

export const COURSES = [
  'B.A. Economics',
  'B.Sc. Computer Science',
  'B.Com',
  'B.Tech Information Technology',
  'M.A. English',
]

export const ACADEMIC_YEARS = ['First year', 'Second year', 'Third year', 'Fourth year']

export const CATEGORIES = ['General', 'Other Backward Classes', 'Scheduled Caste', 'Scheduled Tribe']

export const EMPTY_APPLICATION: StudentApplication = {
  fullName: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  collegeName: '',
  studentId: '',
  course: '',
  academicYear: '',
  annualIncome: '',
  category: '',
  travelRoute: '',
}

export const DEMO_APPLICATION: StudentApplication = {
  fullName: 'Rhea Nair',
  dateOfBirth: '14/08/2005',
  email: 'rhea.nair@example.com',
  phone: '9845012233',
  collegeName: COLLEGES[0],
  studentId: 'SJC-2023-4471',
  course: COURSES[1],
  academicYear: 'Second year',
  annualIncome: '240000',
  category: 'General',
  travelRoute: 'Jayanagar to St. Joseph’s College',
}

export const DEFAULT_DOCUMENTS: DocumentItem[] = [
  {
    id: 'id-card',
    label: 'College identity card',
    note: 'Front and back, showing your name and student number.',
    provided: false,
  },
  {
    id: 'bonafide',
    label: 'Bonafide certificate',
    note: 'Issued by the college office for the current academic year.',
    provided: false,
  },
  {
    id: 'income',
    label: 'Income certificate',
    note: 'Used to check the assistance band you fall into.',
    provided: false,
  },
  {
    id: 'photo',
    label: 'Passport photograph',
    note: 'A recent photograph on a plain background.',
    provided: false,
  },
]

export const STAGES: StudentStage[] = [
  {
    id: 'personal',
    title: 'Your details',
    accent: 'details',
    blurb:
      'The application starts with who you are. These details identify the application and are how the college office would reach you.',
    fields: [
      {
        key: 'fullName',
        label: 'Full name',
        hint: 'As printed on your college identity card.',
        type: 'text',
        help: 'Full name. Required. Enter your name exactly as it is printed on your college identity card, because the office matches the application against it.',
      },
      {
        key: 'dateOfBirth',
        label: 'Date of birth',
        hint: 'Day, month and year, like 14/08/2005.',
        type: 'text',
        help: 'Date of birth. Required. Enter it as day, slash, month, slash, four digit year — for example fourteen, slash, zero eight, slash, two thousand and five.',
      },
      {
        key: 'email',
        label: 'Email address',
        hint: 'Where the decision on this application would be sent.',
        type: 'email',
        help: 'Email address. Required. In a real application this is where the decision would be sent. It needs an at sign and a dot.',
      },
      {
        key: 'phone',
        label: 'Phone number',
        hint: 'Ten digits, or with a country code.',
        type: 'tel',
        help: 'Phone number. Required. Ten digits, or a country code followed by the number. The office would call this if anything was unclear.',
      },
    ],
  },
  {
    id: 'college',
    title: 'College and student number',
    accent: 'college',
    blurb:
      'Assistance is issued through your college, so the application needs to know where you study and your number there.',
    fields: [
      {
        key: 'collegeName',
        label: 'College',
        hint: 'Choose the college you are enrolled at.',
        type: 'select',
        options: COLLEGES,
        help: 'College. Required. Choose the college you are enrolled at from the list. This demonstration carries four colleges.',
      },
      {
        key: 'studentId',
        label: 'Student number',
        hint: 'The number on your identity card, like SJC-2023-4471.',
        type: 'text',
        help: 'Student number. Required. This is the number printed on your college identity card, usually letters, then the year, then a number.',
      },
    ],
  },
  {
    id: 'course',
    title: 'Course and year',
    accent: 'course',
    blurb: 'Your course and year decide which assistance band the application is assessed against.',
    fields: [
      {
        key: 'course',
        label: 'Course',
        hint: 'The course you are enrolled on.',
        type: 'select',
        options: COURSES,
        help: 'Course. Required. Choose the course you are enrolled on. It decides which assistance band your application is assessed against.',
      },
      {
        key: 'academicYear',
        label: 'Academic year',
        hint: 'Which year of the course you are in now.',
        type: 'select',
        options: ACADEMIC_YEARS,
        help: 'Academic year. Required. Choose the year of the course you are in right now, not the year you started.',
      },
    ],
  },
  {
    id: 'eligibility',
    title: 'Eligibility',
    accent: 'eligibility',
    blurb:
      'These answers decide whether the application qualifies, and for how much. Nothing here is checked against any real record in this demonstration.',
    fields: [
      {
        key: 'annualIncome',
        label: 'Annual household income',
        hint: 'In rupees, for the whole household, for the last year.',
        type: 'number',
        help: 'Annual household income. Required. Enter the figure in rupees for your whole household over the last year. In this demonstration a household income under two lakh fifty thousand rupees qualifies for the full concession.',
      },
      {
        key: 'category',
        label: 'Category',
        hint: 'The category recorded on your college file.',
        type: 'select',
        options: CATEGORIES,
        help: 'Category. Required. Choose the category recorded on your college file. It is used only to work out which assistance band applies.',
      },
      {
        key: 'travelRoute',
        label: 'Daily travel route',
        hint: 'Where you travel from, and to, each day.',
        type: 'text',
        help: 'Daily travel route. Required. Say where you travel from and where you travel to each day, for example Jayanagar to St. Joseph’s College.',
      },
    ],
  },
]

export function stageById(id: StudentStageId): StudentStage | undefined {
  return STAGES.find((stage) => stage.id === id)
}

export const STAGE_ORDER: StudentStageId[] = [
  'personal',
  'college',
  'course',
  'eligibility',
  'documents',
  'review',
  'complete',
]

export const STAGE_LABEL: Record<StudentStageId, string> = {
  personal: 'Your details',
  college: 'College',
  course: 'Course',
  eligibility: 'Eligibility',
  documents: 'Documents',
  review: 'Review',
  complete: 'Complete',
}

/** One specific message per problem — never the whole rule set for the field. */
export function validateField(key: StudentFieldKey, value: string): string | null {
  const trimmed = value.trim()
  switch (key) {
    case 'fullName':
      if (!trimmed) return 'Enter the name printed on your college identity card.'
      if (trimmed.length < 3) return 'That name looks too short.'
      if (!/^[a-zA-Z.'’\- ]+$/.test(trimmed)) return 'Use letters, spaces, hyphens and full stops only.'
      return null
    case 'dateOfBirth':
      if (!trimmed) return 'Enter your date of birth.'
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return 'Use the form day/month/year, like 14/08/2005.'
      return null
    case 'email':
      if (!trimmed) return 'Enter an email address.'
      if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(trimmed)) return 'Enter an address in the form name@example.com.'
      return null
    case 'phone': {
      const digits = trimmed.replace(/[\s()-]/g, '')
      if (!digits) return 'Enter a phone number.'
      if (!/^\+?\d{10,13}$/.test(digits)) return 'Enter 10 to 13 digits, for example 9845012233.'
      return null
    }
    case 'collegeName':
      return trimmed ? null : 'Choose your college from the list.'
    case 'studentId':
      if (!trimmed) return 'Enter your student number.'
      if (trimmed.length < 4) return 'That student number looks too short.'
      return null
    case 'course':
      return trimmed ? null : 'Choose your course from the list.'
    case 'academicYear':
      return trimmed ? null : 'Choose the year you are in now.'
    case 'annualIncome': {
      if (!trimmed) return 'Enter your annual household income.'
      const amount = Number(trimmed)
      if (!Number.isFinite(amount) || amount < 0) return 'Enter the income as a number in rupees.'
      return null
    }
    case 'category':
      return trimmed ? null : 'Choose the category recorded on your college file.'
    case 'travelRoute':
      if (!trimmed) return 'Enter the route you travel each day.'
      if (trimmed.length < 4) return 'Say where you travel from and where you travel to.'
      return null
    default:
      return null
  }
}

export function validateStage(stage: StudentStage, app: StudentApplication): Partial<Record<StudentFieldKey, string>> {
  const errors: Partial<Record<StudentFieldKey, string>> = {}
  for (const field of stage.fields) {
    const message = validateField(field.key, app[field.key])
    if (message) errors[field.key] = message
  }
  return errors
}

/** The simulated assistance decision, worked out from the entered income. */
export function assistanceBand(app: StudentApplication): { band: string; detail: string } {
  const income = Number(app.annualIncome || 0)
  if (!Number.isFinite(income) || income <= 0) {
    return { band: 'Not yet assessed', detail: 'Enter the household income to see which band applies.' }
  }
  if (income < 250000) {
    return {
      band: 'Full concession',
      detail: 'A household income under ₹2,50,000 qualifies for the full travel concession in this simulation.',
    }
  }
  if (income < 500000) {
    return {
      band: 'Half concession',
      detail: 'A household income between ₹2,50,000 and ₹5,00,000 qualifies for half the concession here.',
    }
  }
  return {
    band: 'Not eligible',
    detail: 'A household income of ₹5,00,000 or more does not qualify for a concession in this simulation.',
  }
}
