import { ArrowLeft, ArrowRight, Check, CircleAlert, Star } from 'lucide-react'
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

const ORDER_LABEL: Record<TripRequest['priority'], string> = {
  cheapest: 'lowest price',
  fastest: 'shortest journey',
  balanced: 'the best balance of price and time',
}

/** Evenly spaced markers so a stop is visible as well as described in words. */
function stopMarkers(stops: number): number[] {
  if (stops <= 0) return []
  return Array.from({ length: stops }, (_, i) => ((i + 1) / (stops + 1)) * 100)
}

function Journey({ item, label }: { item: RankedFlight; label: string }) {
  const { flight } = item
  return (
    <div className="fl__journey">
      <div className="fl__point">
        <p className="fl__time">{clockToHuman(flight.departTime)}</p>
        <p className="fl__apt num">
          {flight.from} <span aria-hidden="true">&middot;</span> {cityName(flight.from)}
        </p>
      </div>

      <div className="fl__mid" aria-hidden="true">
        <p className="fl__dur">{minutesToShort(item.durationMinutes)}</p>
        <div className="fl__line">
          {stopMarkers(flight.stops).map((left) => (
            <span className="fl__stop" style={{ left: `${left}%` }} key={left} />
          ))}
        </div>
        <p className="fl__stops">
          {stopsLabel(flight.stops)}
          {flight.stops > 0 && ` · ${flight.via.map(cityName).join(', ')}`}
        </p>
      </div>

      <div className="fl__point fl__point--end">
        <p className="fl__time">
          {clockToHuman(flight.arriveTime)}
          {flight.arrivesNextDay && (
            <span className="fl__nextday" aria-hidden="true">
              {' '}
              +1
            </span>
          )}
        </p>
        <p className="fl__apt num">
          {cityName(flight.to)} <span aria-hidden="true">&middot;</span> {flight.to}
        </p>
      </div>

      <p className="visually-hidden">
        {label} Departs {clockToHuman(flight.departTime)} from {cityName(flight.from)}, arrives{' '}
        {clockToHuman(flight.arriveTime)}
        {flight.arrivesNextDay ? ' the next day' : ''} in {cityName(flight.to)}. Journey time{' '}
        {minutesToHuman(item.durationMinutes)}. {stopsLabel(flight.stops)}
        {flight.stops > 0 ? `, via ${flight.via.map(cityName).join(' and ')}` : ''}.
      </p>
    </div>
  )
}

function FlightRow({
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
  const classes = ['fl']
  if (isRecommended) classes.push('fl--featured')
  if (isSelected) classes.push('fl--selected')

  return (
    <li>
      <article className={classes.join(' ')} aria-labelledby={headingId}>
        {(isRecommended || isSelected) && (
          <div className="fl__overline">
            {isRecommended && (
              <span className="tag tag--accent">
                <Star size={11} aria-hidden="true" />
                Recommended for your request
              </span>
            )}
            {isSelected && (
              <span className="tag tag--accent">
                <Check size={11} aria-hidden="true" />
                Selected
              </span>
            )}
          </div>
        )}

        <div className="fl__ident">
          <h3 className="fl__airline" id={headingId}>
            <span className="visually-hidden">Option {index + 1}: </span>
            {flight.airline}
            {isSelected && <span className="visually-hidden"> (currently selected)</span>}
          </h3>
          <p className="fl__code">
            <span className="fl__codemark">{flight.airlineCode}</span>
            <span>{flight.flightNumber}</span>
          </p>
        </div>

        <Journey item={item} label={`${flight.airline} ${flight.flightNumber}.`} />

        <div className="fl__price-col">
          <p className="fl__price">{rupees(flight.price)}</p>
          <p className="mono">Per passenger</p>
        </div>

        <div className="fl__tags tags">
          <span className="tag">{stopsLabel(flight.stops)}</span>
          <span className="tag">{minutesToShort(item.durationMinutes)}</span>
          {item.isCheapest && <span className="tag tag--accent">Lowest fare</span>}
          {item.isFastest && <span className="tag tag--accent">Shortest journey</span>}
          {flight.refundable && <span className="tag">Refundable</span>}
          {request.budget !== null &&
            (item.withinBudget ? (
              <span className="tag">Within budget</span>
            ) : (
              <span className="tag tag--alert">
                <CircleAlert size={11} aria-hidden="true" />
                Over budget
              </span>
            ))}
        </div>

        <div className="fl__why">
          <p className="fl__why-title">
            {isRecommended ? recommendationSummary(item, request) : 'What this option means'}
          </p>
          <ul className="fl__why-list">
            {item.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>

        <dl className="fl__facts">
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

        <div className="fl__foot">
          <div className="fl__compare">
            <input type="checkbox" id={`compare-${flight.id}`} checked={isCompared} onChange={onToggleCompare} />
            <label htmlFor={`compare-${flight.id}`}>
              Add to comparison
              <span className="visually-hidden">
                {' '}
                ({flight.airline} {flight.flightNumber})
              </span>
            </label>
          </div>
          <button
            type="button"
            className={isSelected ? 'btn btn--secondary btn--compact' : 'btn btn--primary btn--compact'}
            onClick={onSelect}
            aria-pressed={isSelected}
          >
            {isSelected ? (
              <>
                <Check size={16} aria-hidden="true" /> Selected
              </>
            ) : (
              <>
                Select this flight
                <ArrowRight size={16} aria-hidden="true" />
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

/**
 * Explains the trade-off between the compared flights in plain language. Every
 * sentence is derived from the data already on screen — nothing is invented.
 */
function tradeOffSentences(items: RankedFlight[], recommendedId: string | null): string[] {
  if (items.length < 2) return []
  const cheapest = items.reduce((a, b) => (b.flight.price < a.flight.price ? b : a))
  const fastest = items.reduce((a, b) => (b.durationMinutes < a.durationMinutes ? b : a))
  const lines: string[] = []

  const sameDuration = items.every((item) => item.durationMinutes === items[0].durationMinutes)

  if (sameDuration) {
    lines.push(
      `These flights all take ${minutesToHuman(items[0].durationMinutes)}, so time is not the deciding factor. ${cheapest.flight.airline} ${cheapest.flight.flightNumber} is the cheapest, at ${rupees(cheapest.flight.price)}.`,
    )
  } else if (cheapest.flight.id === fastest.flight.id) {
    lines.push(
      `${cheapest.flight.airline} ${cheapest.flight.flightNumber} is both the cheapest and the quickest of these, so there is no trade-off to weigh.`,
    )
  } else {
    const saving = fastest.flight.price - cheapest.flight.price
    const extra = cheapest.durationMinutes - fastest.durationMinutes
    lines.push(
      `${cheapest.flight.airline} ${cheapest.flight.flightNumber} saves ${rupees(saving)}, but the journey is ${minutesToHuman(extra)} longer than ${fastest.flight.airline} ${fastest.flight.flightNumber}.`,
    )
  }

  const direct = items.filter((item) => item.flight.stops === 0)
  if (direct.length > 0 && direct.length < items.length) {
    lines.push(
      `${direct.length === 1 ? `Only ${direct[0].flight.airline} ${direct[0].flight.flightNumber} is direct` : `${direct.length} of these are direct`}; the others land somewhere on the way, so you would wait before continuing.`,
    )
  }

  const refundable = items.filter((item) => item.flight.refundable)
  if (refundable.length > 0 && refundable.length < items.length) {
    lines.push(
      `${refundable.map((item) => item.flight.flightNumber).join(' and ')} ${refundable.length === 1 ? 'is' : 'are'} marked refundable in this simulation; the rest would return little or nothing if cancelled.`,
    )
  }

  const recommended = items.find((item) => item.flight.id === recommendedId)
  if (recommended) {
    lines.push(
      `${recommended.flight.airline} ${recommended.flight.flightNumber} is the one recommended for your request.`,
    )
  }

  return lines
}

function Comparison({
  items,
  recommendedId,
}: {
  items: RankedFlight[]
  recommendedId: string | null
}) {
  const lowestPrice = Math.min(...items.map((item) => item.flight.price))
  const shortest = Math.min(...items.map((item) => item.durationMinutes))
  const lines = tradeOffSentences(items, recommendedId)

  return (
    <section className="panel" aria-labelledby="compare-heading">
      <div className="panel__head">
        <h2 id="compare-heading">Side by side</h2>
        <p className="mono num">{items.length} flights</p>
      </div>

      {lines.length > 0 && (
        <div className="tradeoff" style={{ marginBottom: '1.75rem' }}>
          <p className="mono mono--accent">What differs</p>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      <div className="compare-wrap">
        <table className="ctable">
          <caption>
            Comparing {items.length} selected flights. All figures are simulated. &ldquo;Lowest&rdquo; and
            &ldquo;Shortest&rdquo; mark the best value in each row.
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Detail</span>
              </th>
              {items.map((item) => (
                <th scope="col" key={item.flight.id}>
                  {item.flight.airline}
                  <span>{item.flight.flightNumber}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Price</th>
              {items.map((item) => {
                const best = item.flight.price === lowestPrice
                return (
                  <td key={item.flight.id} className={best ? 'best' : undefined}>
                    {rupees(item.flight.price)}
                    {best && <span className="best__flag">Lowest</span>}
                  </td>
                )
              })}
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
              {items.map((item) => {
                const best = item.durationMinutes === shortest
                return (
                  <td key={item.flight.id} className={best ? 'best' : undefined}>
                    {minutesToHuman(item.durationMinutes)}
                    {best && <span className="best__flag">Shortest</span>}
                  </td>
                )
              })}
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
      <section className="band" aria-labelledby="no-route-heading">
        <p className="eyebrow">
          Step 02 / 05 <span aria-hidden="true">&mdash;</span> No results
        </p>
        <h1 className="display--md" id="no-route-heading">
          No simulated flights
          <br />
          on this <span className="serif">route</span>
        </h1>
        <p className="lede">
          This prototype only carries invented flight data for a few routes, and {cityName(request.origin)} to{' '}
          {cityName(request.destination)} is not one of them.
        </p>
        <div className="actions">
          <button type="button" className="btn btn--primary" onClick={onBack}>
            <ArrowLeft size={17} aria-hidden="true" />
            Change the cities
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="band" aria-labelledby="results-heading">
        <p className="eyebrow">
          Step 02 / 05 <span aria-hidden="true">&mdash;</span> Choose a flight
        </p>
        <div className="band__head">
          <div className="stack stack--sm">
            <h1 className="display--md" id="results-heading">
              <span className="num">{result.matches.length}</span>{' '}
              {result.matches.length === 1 ? 'flight' : 'flights'} <span className="serif">match</span>
            </h1>
            <p className="lede">
              {cityName(request.origin)} to {cityName(request.destination)}
              {request.budget !== null ? `, up to ${rupees(request.budget)}` : ''}
              {request.directOnly ? ', direct only' : ', stops allowed'}. Ordered by{' '}
              {ORDER_LABEL[request.priority]}, and every fare below is simulated.
            </p>
          </div>
          <button type="button" className="btn btn--secondary btn--compact" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" />
            Change search
          </button>
        </div>

        {result.relaxedNotes.length > 0 && (
          <div className="note">
            <CircleAlert size={17} aria-hidden="true" className="note__icon" />
            <div>
              <strong>Your search had to be widened:</strong>
              <ul>
                {result.relaxedNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {compared.length >= 2 && <Comparison items={compared} recommendedId={result.recommendedId} />}

      <section className="band" aria-labelledby="options-heading">
        <div className="band__head">
          <h2 id="options-heading">Flight options</h2>
          <p className="mono">
            Tick two or three to compare <span aria-hidden="true">&mdash;</span> nothing is booked by selecting
          </p>
        </div>
        <ul className="results">
          {result.matches.map((item, index) => (
            <FlightRow
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
      </section>

      <section className="band" aria-labelledby="continue-heading">
        <div className="panel">
          <div className="panel__head">
            <h2 id="continue-heading">Ready to continue?</h2>
            <p className="mono">{selected ? 'Flight chosen' : 'No flight chosen yet'}</p>
          </div>
          <p className="body-text" style={{ marginBottom: '1.5rem' }}>
            {selected
              ? `You have chosen ${selected.flight.airline} ${selected.flight.flightNumber}, departing at ${clockToHuman(selected.flight.departTime)} for ${rupees(selected.flight.price)}. You can still choose a different flight above.`
              : 'Choose "Select this flight" on the option you want. Nothing is booked when you select a flight.'}
          </p>
          <div className="actions">
            <button type="button" className="btn btn--primary" onClick={onContinue} disabled={!selected}>
              Continue with this flight
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            {!selected && <p className="field__hint">This becomes available once a flight is selected.</p>}
          </div>
        </div>
      </section>
    </>
  )
}
