import { ArrowLeft, ArrowRight, Info, Plane } from 'lucide-react'
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

  const assumedChip = (key: string) =>
    assumed.has(key) ? <span className="chip">Assumed</span> : null

  return (
    <>
      <section className="band" aria-labelledby="interpret-heading">
        <p className="eyebrow">
          Step 01 / 05 <span aria-hidden="true">&mdash;</span> Interpretation
        </p>
        <h1 className="display--md" id="interpret-heading">
          Here is what we <span className="serif">understood</span>
        </h1>

        <p className="quote">
          <span className="visually-hidden">You asked: </span>&ldquo;{request.rawText}&rdquo;
        </p>

        <p className="lede">
          Your words were read with fixed rules, not a guess. Check each detail below and change anything that is
          wrong before any flights are shown.
        </p>

        {assumed.size > 0 && (
          <p className="note">
            <Info size={17} aria-hidden="true" className="note__icon" />
            <span>
              You did not mention{' '}
              {[...assumed].map((key, index) => (
                <span key={key}>
                  {index > 0 ? ' and ' : ''}
                  <strong>{key}</strong>
                </span>
              ))}
              , so a default was filled in. The fields marked <strong>Assumed</strong> below are the ones to check
              first.
            </span>
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="edit-heading">
        <div className="panel__head">
          <h2 id="edit-heading">Check and correct the details</h2>
          <p className="mono">Editable</p>
        </div>

        <div className="route" aria-hidden="true">
          <div className="route__node">
            <p className="route__code num">{request.origin}</p>
            <p className="mono">{cityName(request.origin)}</p>
          </div>
          <div className="route__link">
            <span className="route__line" />
            <Plane size={15} />
            <span className="route__line" />
          </div>
          <div className="route__node route__node--end">
            <p className="route__code num">{request.destination}</p>
            <p className="mono">{cityName(request.destination)}</p>
          </div>
        </div>
        <p className="visually-hidden">
          Flying from {cityName(request.origin)} ({request.origin}) to {cityName(request.destination)} (
          {request.destination}).
        </p>

        <hr className="rule" style={{ margin: '1.75rem 0' }} />

        <div className="field-grid">
          <div className="field">
            <label className="field__label" htmlFor="origin">
              Flying from {assumedChip('origin')}
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
              Flying to {assumedChip('destination')}
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
              Most you want to pay {assumed.has('budget') && <span className="chip">No limit set</span>}
            </label>
            <p className="field__hint" id="budget-hint">
              In rupees. Leave this empty to see every fare on the route.
            </p>
            <input
              id="budget"
              className="input num"
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

        <div className="check" style={{ marginTop: '1.5rem' }}>
          <input
            id="directOnly"
            type="checkbox"
            checked={request.directOnly}
            onChange={(event) => update({ directOnly: event.target.checked })}
            aria-describedby="direct-hint"
          />
          <div className="stack--xs stack">
            <label className="field__label" htmlFor="directOnly">
              Direct flights only
            </label>
            <p className="field__hint" id="direct-hint">
              A direct flight goes straight there without changing planes. Turning this on hides flights with a
              stop.
            </p>
          </div>
        </div>

        <hr className="rule" style={{ margin: '1.75rem 0 1.25rem' }} />

        <p className="mono" style={{ marginBottom: '1.25rem' }}>
          Searching <span className="mono--ivory">{cityName(request.origin)}</span>{' '}
          <span aria-hidden="true">&rarr;</span>{' '}
          <span className="mono--ivory">{cityName(request.destination)}</span>
          {' · '}
          <span className="mono--ivory">
            {request.budget !== null ? `up to ${rupees(request.budget)}` : 'no price limit'}
          </span>
          {' · '}
          <span className="mono--ivory">{request.directOnly ? 'direct only' : 'stops allowed'}</span>
        </p>

        <div className="actions">
          <button type="button" className="btn btn--primary" onClick={onConfirm}>
            Show matching flights
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn--secondary" onClick={onBack}>
            <ArrowLeft size={17} aria-hidden="true" />
            Change my request
          </button>
        </div>

        <p className="field__hint" style={{ marginTop: '1.25rem' }}>
          This prototype carries simulated flights for these routes only:{' '}
          {SUPPORTED_ROUTES.map(([from, to]) => `${cityName(from)} to ${cityName(to)}`).join('; ')}.
        </p>
      </section>
    </>
  )
}
