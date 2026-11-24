import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { AIRPORTS, cityName } from '../data/airports'
import { AIRLINE_NAMES, SUPPORTED_ROUTES } from '../data/flights'
import { rupees } from '../lib/format'
import type { Priority, TimeOfDay, TripRequest } from '../types'

interface Props {
  request: TripRequest
  onChange: (request: TripRequest) => void
  onConfirm: () => void
  onBack: () => void
}

const TIME_LABELS: Array<{ value: TimeOfDay; label: string }> = [
  { value: 'any', label: 'Any time of day' },
  { value: 'morning', label: 'Morning (5:00 am to 11:59 am)' },
  { value: 'afternoon', label: 'Afternoon (12:00 pm to 4:59 pm)' },
  { value: 'evening', label: 'Evening (5:00 pm to 8:59 pm)' },
  { value: 'night', label: 'Night (9:00 pm onwards)' },
]

const PRIORITY_LABELS: Array<{ value: Priority; label: string }> = [
  { value: 'balanced', label: 'A good balance of price and time' },
  { value: 'cheapest', label: 'Lowest price first' },
  { value: 'fastest', label: 'Shortest journey first' },
]

export default function Interpretation({ request, onChange, onConfirm, onBack }: Props) {
  const assumed = new Set(request.assumed)
  const update = (patch: Partial<TripRequest>) => {
    const touched = Object.keys(patch)
    onChange({ ...request, ...patch, assumed: request.assumed.filter((key) => !touched.includes(key)) })
  }

  return (
    <>
      <section className="card stack" aria-labelledby="interpret-heading">
        <p className="eyebrow">Step 1 of 5 &middot; Your request</p>
        <h1 id="interpret-heading">Here is what SIGHTLINE understood</h1>
        <p className="quote">
          <span className="visually-hidden">You asked: </span>&ldquo;{request.rawText}&rdquo;
        </p>
        <p className="lede">
          Your words were read with fixed rules, not a guess. Check each detail below and change anything that is
          wrong before any flights are shown.
        </p>
        {assumed.size > 0 && (
          <p className="notice">
            <Info size={20} aria-hidden="true" className="notice__icon" />
            <span>
              You did not mention{' '}
              {[...assumed].map((key, index) => (
                <span key={key}>
                  {index > 0 ? ' and ' : ''}
                  <strong>{key}</strong>
                </span>
              ))}
              , so a default was filled in. Fields marked &ldquo;assumed&rdquo; below are the ones to check first.
            </span>
          </p>
        )}
      </section>

      <section className="card stack" aria-labelledby="edit-heading">
        <h2 id="edit-heading">Check and correct the details</h2>

        <div className="field-grid">
          <div className="field">
            <label className="field__label" htmlFor="origin">
              Flying from {assumed.has('origin') && <span className="tag">Assumed</span>}
            </label>
            <select
              id="origin"
              className="select"
              value={request.origin}
              onChange={(event) => update({ origin: event.target.value })}
            >
              {AIRPORTS.map((airport) => (
                <option key={airport.code} value={airport.code}>
                  {airport.city} ({airport.code})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="destination">
              Flying to {assumed.has('destination') && <span className="tag">Assumed</span>}
            </label>
            <select
              id="destination"
              className="select"
              value={request.destination}
              onChange={(event) => update({ destination: event.target.value })}
            >
              {AIRPORTS.map((airport) => (
                <option key={airport.code} value={airport.code}>
                  {airport.city} ({airport.code})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="budget">
              Most you want to pay, in rupees {assumed.has('budget') && <span className="tag">No limit set</span>}
            </label>
            <p className="field__hint" id="budget-hint">
              Leave this empty to see every fare on the route.
            </p>
            <input
              id="budget"
              className="input"
              type="number"
              inputMode="numeric"
              min={1000}
              step={500}
              aria-describedby="budget-hint"
              value={request.budget ?? ''}
              onChange={(event) =>
                update({ budget: event.target.value === '' ? null : Number(event.target.value) })
              }
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="timeOfDay">
              Preferred departure time
            </label>
            <select
              id="timeOfDay"
              className="select"
              value={request.timeOfDay}
              onChange={(event) => update({ timeOfDay: event.target.value as TimeOfDay })}
            >
              {TIME_LABELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="priority">
              What matters most to you
            </label>
            <select
              id="priority"
              className="select"
              value={request.priority}
              onChange={(event) => update({ priority: event.target.value as Priority })}
            >
              {PRIORITY_LABELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="airline">
              Preferred airline
            </label>
            <select
              id="airline"
              className="select"
              value={request.airline ?? ''}
              onChange={(event) => update({ airline: event.target.value === '' ? null : event.target.value })}
            >
              <option value="">No preference</option>
              {AIRLINE_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="checkbox-row">
          <input
            id="directOnly"
            type="checkbox"
            checked={request.directOnly}
            onChange={(event) => update({ directOnly: event.target.checked })}
            aria-describedby="direct-hint"
          />
          <div>
            <label className="field__label" htmlFor="directOnly">
              Direct flights only
            </label>
            <p className="field__hint" id="direct-hint">
              A direct flight goes straight there without changing planes. Turning this on hides flights with a stop.
            </p>
          </div>
        </div>

        <p className="field__hint">
          Current search: {cityName(request.origin)} to {cityName(request.destination)},{' '}
          {request.budget !== null ? `up to ${rupees(request.budget)}` : 'no price limit'},{' '}
          {request.directOnly ? 'direct flights only' : 'stops allowed'}.
        </p>

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            Show matching flights
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={20} aria-hidden="true" />
            Change my request
          </button>
        </div>

        <p className="field__hint">
          This demo carries simulated flights for these routes only:{' '}
          {SUPPORTED_ROUTES.map(([from, to]) => `${cityName(from)} to ${cityName(to)}`).join('; ')}.
        </p>
      </section>
    </>
  )
}
