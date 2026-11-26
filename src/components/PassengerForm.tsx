import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CircleAlert } from 'lucide-react'
import { cityName } from '../data/airports'
import { clockToHuman, rupees } from '../lib/format'
import type { Passenger, RankedFlight } from '../types'

interface Props {
  passenger: Passenger
  flight: RankedFlight
  onChange: (passenger: Passenger) => void
  onSubmit: () => void
  onBack: () => void
}

type FieldKey = keyof Passenger

const FIELD_LABELS: Record<FieldKey, string> = {
  fullName: 'Full name',
  email: 'Email address',
  phone: 'Phone number',
}

export function validatePassenger(passenger: Passenger): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {}

  const name = passenger.fullName.trim()
  if (name.length === 0) errors.fullName = 'Enter the passenger name as it appears on their identity document.'
  else if (name.length < 3) errors.fullName = 'The name looks too short. Enter the full name, for example Asha Menon.'
  else if (!/^[a-zA-Z.'\- ]+$/.test(name)) errors.fullName = 'Use letters, spaces, hyphens and full stops only.'

  const email = passenger.email.trim()
  if (email.length === 0) errors.email = 'Enter an email address so booking updates could be sent.'
  else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email))
    errors.email = 'Enter an email address in the form name@example.com.'

  const phone = passenger.phone.replace(/[\s()-]/g, '')
  if (phone.length === 0) errors.phone = 'Enter a phone number the airline could call.'
  else if (!/^\+?\d{10,13}$/.test(phone))
    errors.phone = 'Enter a phone number with 10 to 13 digits, for example 9876543210.'

  return errors
}

export default function PassengerForm({ passenger, flight, onChange, onSubmit, onBack }: Props) {
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [showSummary, setShowSummary] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const { flight: f } = flight

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const found = validatePassenger(passenger)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setShowSummary(true)
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setShowSummary(false)
    onSubmit()
  }

  const field = (key: FieldKey, type: string, hint: string, autoComplete: string) => (
    <div className="field">
      <label className="field__label" htmlFor={key}>
        {FIELD_LABELS[key]}
        <span className="chip" aria-hidden="true">
          Required
        </span>
        <span className="visually-hidden">(required)</span>
      </label>
      <p className="field__hint" id={`${key}-hint`}>
        {hint}
      </p>
      <input
        id={key}
        className="input"
        type={type}
        autoComplete={autoComplete}
        required
        value={passenger[key]}
        aria-describedby={errors[key] ? `${key}-hint ${key}-error` : `${key}-hint`}
        aria-invalid={errors[key] ? 'true' : undefined}
        onChange={(event) => {
          onChange({ ...passenger, [key]: event.target.value })
          if (errors[key]) setErrors({ ...errors, [key]: undefined })
        }}
      />
      {errors[key] && (
        <p className="field__error" id={`${key}-error`}>
          <CircleAlert size={15} aria-hidden="true" />
          {errors[key]}
        </p>
      )}
    </div>
  )

  const errorEntries = Object.entries(errors).filter(([, value]) => Boolean(value)) as Array<[FieldKey, string]>

  return (
    <>
      <section className="band" aria-labelledby="passenger-heading">
        <p className="eyebrow">
          Step 03 / 05 <span aria-hidden="true">&mdash;</span> Passenger details
        </p>
        <h1 className="display--md" id="passenger-heading">
          Who is <span className="serif">travelling?</span>
        </h1>
        <p className="lede">
          These details would go on the ticket. In this prototype they stay in your browser for this session and are
          not sent anywhere.
        </p>

        <div className="chosen">
          <div className="chosen__block">
            <p className="mono">Chosen flight</p>
            <p className="chosen__value">
              {f.airline} {f.flightNumber}
            </p>
          </div>
          <div className="chosen__block">
            <p className="mono">Route</p>
            <p className="chosen__value">
              {cityName(f.from)} <span aria-hidden="true">&rarr;</span> {cityName(f.to)}
            </p>
          </div>
          <div className="chosen__block">
            <p className="mono">Departs</p>
            <p className="chosen__value">{clockToHuman(f.departTime)}</p>
          </div>
          <div className="chosen__block chosen__price">
            <p className="mono">Simulated fare</p>
            <p className="chosen__value">{rupees(f.price)}</p>
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="form-heading">
        <div className="panel__head">
          <h2 id="form-heading">Passenger information</h2>
          <p className="mono">3 fields, all required</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="stack stack--lg">
          {showSummary && errorEntries.length > 0 && (
            <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
              <strong>
                <CircleAlert size={15} aria-hidden="true" />
                {errorEntries.length === 1
                  ? 'One detail needs your attention'
                  : `${errorEntries.length} details need your attention`}
              </strong>
              <ul>
                {errorEntries.map(([key, message]) => (
                  <li key={key}>
                    <a href={`#${key}`}>{FIELD_LABELS[key]}</a>: {message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="field-grid">
            {field(
              'fullName',
              'text',
              'Use the name exactly as it appears on the identity document you will travel with.',
              'name',
            )}
            {field('email', 'email', 'For example: asha.menon@example.com. Used for booking updates only.', 'email')}
            {field('phone', 'tel', 'Ten digits, or with a country code such as +91 9876543210.', 'tel')}
          </div>

          <div>
            <div className="actions">
              <button type="submit" className="btn btn--primary">
                Review booking
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button type="button" className="btn btn--secondary" onClick={onBack}>
                <ArrowLeft size={17} aria-hidden="true" />
                Back to flights
              </button>
            </div>
            <p className="field__hint" style={{ marginTop: '1.25rem' }}>
              Nothing is booked yet. The next screen shows a summary you can check before confirming.
            </p>
          </div>
        </form>
      </section>
    </>
  )
}
