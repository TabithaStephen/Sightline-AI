import { ArrowLeft, ArrowRight, BadgeCheck, Check, CircleAlert, Clock, IndianRupee, Luggage, Plane, Star } from 'lucide-react'
import { cityName } from '../data/airports'
import { clockToHuman, minutesToHuman, minutesToShort, rupees, stopsLabel } from '../lib/format'
import { recommendationSummary } from '../lib/search'
import type { RankedFlight, SearchResult, TripRequest } from '../types'

interface Props {
  request: TripRequest
  result: SearchResult
  selectedId: string | null
  compareIds: string[]
  onSelect: (id: string) => void
  onToggleCompare: (id: string) => void
  onContinue: () => void
  onBack: () => void
}

function Timeline({ item }: { item: RankedFlight }) {
  const { flight } = item
  return (
    <div className="timeline">
      <div className="timeline__end">
        <div className="timeline__time">{clockToHuman(flight.departTime)}</div>
        <div className="timeline__city">
          {cityName(flight.from)} ({flight.from})
        </div>
      </div>
      <div className="timeline__mid" aria-hidden="true">
        <div>{minutesToShort(item.durationMinutes)}</div>
        <div className="timeline__bar" />
        <div>{stopsLabel(flight.stops)}</div>
      </div>
      <div className="timeline__end">
        <div className="timeline__time">
          {clockToHuman(flight.arriveTime)}
          {flight.arrivesNextDay && <span className="timeline__city"> next day</span>}
        </div>
        <div className="timeline__city">
          {cityName(flight.to)} ({flight.to})
        </div>
      </div>
      <p className="visually-hidden">
        Departs {clockToHuman(flight.departTime)} from {cityName(flight.from)}, arrives{' '}
        {clockToHuman(flight.arriveTime)}
        {flight.arrivesNextDay ? ' the next day' : ''} in {cityName(flight.to)}. Journey time{' '}
        {minutesToHuman(item.durationMinutes)}. {stopsLabel(flight.stops)}.
      </p>
    </div>
  )
}

function FlightCard({
  item,
  index,
  request,
  isRecommended,
  isSelected,
  isCompared,
  onSelect,
  onToggleCompare,
}: {
  item: RankedFlight
  index: number
  request: TripRequest
  isRecommended: boolean
  isSelected: boolean
  isCompared: boolean
  onSelect: () => void
  onToggleCompare: () => void
}) {
  const { flight } = item
  const headingId = `flight-${flight.id}-heading`

  return (
    <li>
      <article
        className={`flight-card${isRecommended ? ' flight-card--recommended' : ''}${isSelected ? ' flight-card--selected' : ''}`}
        aria-labelledby={headingId}
      >
        <div className="flight-card__top">
          <div>
            <h3 className="flight-card__airline" id={headingId}>
              <span className="visually-hidden">Option {index + 1}: </span>
              {flight.airline}
              {isSelected && <span className="visually-hidden"> (currently selected)</span>}
            </h3>
            <p className="flight-card__number">
              Flight {flight.flightNumber} &middot; {cityName(flight.from)} to {cityName(flight.to)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="flight-card__price">{rupees(flight.price)}</div>
            <div className="flight-card__per">per passenger</div>
          </div>
        </div>

        <div className="badges">
          {isRecommended && (
            <span className="badge badge--accent">
              <Star size={16} aria-hidden="true" /> Recommended
            </span>
          )}
          {isSelected && (
            <span className="badge badge--accent">
              <Check size={16} aria-hidden="true" /> Selected
            </span>
          )}
          <span className="badge">
            <Plane size={16} aria-hidden="true" /> {stopsLabel(flight.stops)}
            {flight.stops > 0 && ` via ${flight.via.map(cityName).join(', ')}`}
          </span>
          <span className="badge">
            <Clock size={16} aria-hidden="true" /> {minutesToShort(item.durationMinutes)}
          </span>
          {item.isCheapest && (
            <span className="badge">
              <IndianRupee size={16} aria-hidden="true" /> Lowest fare
            </span>
          )}
          {item.isFastest && (
            <span className="badge">
              <Clock size={16} aria-hidden="true" /> Shortest journey
            </span>
          )}
          {request.budget !== null &&
            (item.withinBudget ? (
              <span className="badge">
                <BadgeCheck size={16} aria-hidden="true" /> Within your budget
              </span>
            ) : (
              <span className="badge">
                <CircleAlert size={16} aria-hidden="true" /> Over your budget
              </span>
            ))}
        </div>

        <Timeline item={item} />

        <div className="why">
          <p className="why__title">{isRecommended ? recommendationSummary(item, request) : 'What this option means'}</p>
          <ul className="why__list">
            {item.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>

        <dl className="detail-rows">
          <div>
            <dt>Journey time</dt>
            <dd>{minutesToHuman(item.durationMinutes)}</dd>
          </div>
          <div>
            <dt>Cabin bag</dt>
            <dd>{flight.cabinBag}</dd>
          </div>
          <div>
            <dt>Check-in bag</dt>
            <dd>{flight.checkedBag}</dd>
          </div>
          <div>
            <dt>Fare type</dt>
            <dd>{flight.refundable ? 'Refundable' : 'Non-refundable'}</dd>
          </div>
        </dl>

        <div className="flight-card__foot">
          <div className="checkbox-row" style={{ border: 0, padding: 0, background: 'transparent' }}>
            <input
              type="checkbox"
              id={`compare-${flight.id}`}
              checked={isCompared}
              onChange={onToggleCompare}
            />
            <label htmlFor={`compare-${flight.id}`}>
              Compare this flight
              <span className="visually-hidden">
                {' '}
                ({flight.airline} {flight.flightNumber})
              </span>
            </label>
          </div>
          <button
            type="button"
            className={isSelected ? 'btn btn-secondary' : 'btn btn-primary'}
            onClick={onSelect}
            aria-pressed={isSelected}
          >
            {isSelected ? (
              <>
                <Check size={20} aria-hidden="true" /> Selected
              </>
            ) : (
              <>
                Select this flight
                <ArrowRight size={20} aria-hidden="true" />
              </>
            )}
            <span className="visually-hidden">
              : {flight.airline} {flight.flightNumber} at {clockToHuman(flight.departTime)} for{' '}
              {rupees(flight.price)}
            </span>
          </button>
        </div>
      </article>
    </li>
  )
}

function CompareTable({ items }: { items: RankedFlight[] }) {
  return (
    <section className="card stack" aria-labelledby="compare-heading">
      <h2 id="compare-heading">Side-by-side comparison</h2>
      <div className="table-wrap">
        <table className="compare-table">
          <caption>Comparing {items.length} selected flights. All figures are simulated.</caption>
          <thead>
            <tr>
              <th scope="col">Detail</th>
              {items.map((item) => (
                <th scope="col" key={item.flight.id}>
                  {item.flight.airline}
                  <span style={{ display: 'block', fontWeight: 400 }}>{item.flight.flightNumber}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Price</th>
              {items.map((item) => (
                <td key={item.flight.id}>{rupees(item.flight.price)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Departs</th>
              {items.map((item) => (
                <td key={item.flight.id}>{clockToHuman(item.flight.departTime)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Arrives</th>
              {items.map((item) => (
                <td key={item.flight.id}>
                  {clockToHuman(item.flight.arriveTime)}
                  {item.flight.arrivesNextDay ? ' (next day)' : ''}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Journey time</th>
              {items.map((item) => (
                <td key={item.flight.id}>{minutesToHuman(item.durationMinutes)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Stops</th>
              {items.map((item) => (
                <td key={item.flight.id}>
                  {stopsLabel(item.flight.stops)}
                  {item.flight.stops > 0 && ` via ${item.flight.via.map(cityName).join(', ')}`}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Check-in bag</th>
              {items.map((item) => (
                <td key={item.flight.id}>{item.flight.checkedBag}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Fare type</th>
              {items.map((item) => (
                <td key={item.flight.id}>{item.flight.refundable ? 'Refundable' : 'Non-refundable'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function FlightResults({
  request,
  result,
  selectedId,
  compareIds,
  onSelect,
  onToggleCompare,
  onContinue,
  onBack,
}: Props) {
  const compared = result.matches.filter((m) => compareIds.includes(m.flight.id))
  const selected = result.matches.find((m) => m.flight.id === selectedId) ?? null

  if (!result.routeSupported) {
    return (
      <section className="card stack" aria-labelledby="no-route-heading">
        <h1 id="no-route-heading">No simulated flights for this route</h1>
        <p className="lede">
          This demo only carries invented flight data for a few routes, and {cityName(request.origin)} to{' '}
          {cityName(request.destination)} is not one of them.
        </p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onBack}>
            <ArrowLeft size={20} aria-hidden="true" />
            Change the cities
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="card stack" aria-labelledby="results-heading">
        <p className="eyebrow">Step 2 of 5 &middot; Choose a flight</p>
        <div className="results-head">
          <div className="stack--tight stack">
            <h1 id="results-heading">
              {result.matches.length} simulated {result.matches.length === 1 ? 'flight' : 'flights'} match your
              request
            </h1>
            <p className="lede">
              {cityName(request.origin)} to {cityName(request.destination)}
              {request.budget !== null ? `, up to ${rupees(request.budget)}` : ''}
              {request.directOnly ? ', direct only' : ', stops allowed'}. Ordered by{' '}
              {request.priority === 'cheapest'
                ? 'lowest price'
                : request.priority === 'fastest'
                  ? 'shortest journey'
                  : 'the best balance of price and time'}
              .
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={20} aria-hidden="true" />
            Change search
          </button>
        </div>

        {result.relaxedNotes.length > 0 && (
          <div className="notice">
            <CircleAlert size={20} aria-hidden="true" className="notice__icon" />
            <div>
              <strong>Your search had to be widened:</strong>
              <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem' }}>
                {result.relaxedNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <p className="notice">
          <Luggage size={20} aria-hidden="true" className="notice__icon" />
          <span>
            These flights are simulated for the demo. Prices, times and seats are invented and nothing can be
            booked.
          </span>
        </p>
      </section>

      {compared.length >= 2 && <CompareTable items={compared} />}

      <h2 className="visually-hidden">Flight options</h2>
      <ul className="flight-list">
        {result.matches.map((item, index) => (
          <FlightCard
            key={item.flight.id}
            item={item}
            index={index}
            request={request}
            isRecommended={item.flight.id === result.recommendedId}
            isSelected={item.flight.id === selectedId}
            isCompared={compareIds.includes(item.flight.id)}
            onSelect={() => onSelect(item.flight.id)}
            onToggleCompare={() => onToggleCompare(item.flight.id)}
          />
        ))}
      </ul>

      <section className="card stack" aria-labelledby="continue-heading">
        <h2 id="continue-heading">Ready to continue?</h2>
        <p>
          {selected
            ? `You have chosen ${selected.flight.airline} ${selected.flight.flightNumber}, departing at ${clockToHuman(selected.flight.departTime)} for ${rupees(selected.flight.price)}. You can still choose a different flight above.`
            : 'Choose "Select this flight" on the option you want. Nothing is booked when you select a flight.'}
        </p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onContinue} disabled={!selected}>
            Continue with this flight
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
        {!selected && <p className="field__hint">This button becomes available once a flight is selected.</p>}
      </section>
    </>
  )
}
