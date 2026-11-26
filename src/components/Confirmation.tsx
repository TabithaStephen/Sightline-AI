import { useEffect, useRef } from 'react'
import { Check, CircleAlert, RotateCcw } from 'lucide-react'
import { cityName } from '../data/airports'
import { clockToHuman, minutesToHuman, rupees, stopsLabel } from '../lib/format'
import type { Passenger, RankedFlight } from '../types'

interface Props {
  flight: RankedFlight
  passenger: Passenger
  bookingRef: string
  onRestart: () => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="srow">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export default function Confirmation({ flight, passenger, bookingRef, onRestart }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { flight: f } = flight

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <>
      <section className="band confirm" aria-labelledby="confirm-heading">
        <p className="eyebrow">
          Step 05 / 05 <span aria-hidden="true">&mdash;</span> Complete
        </p>

        <div className="confirm__mark" aria-hidden="true">
          <Check size={20} />
        </div>

        <h1 className="display" id="confirm-heading" ref={headingRef} tabIndex={-1}>
          Task <span className="serif">complete.</span>
        </h1>

        <p className="lede">
          {passenger.fullName} is booked on {f.airline} {f.flightNumber} from {cityName(f.from)} to{' '}
          {cityName(f.to)} &mdash; in this simulation only. You went from a sentence in your own words to a finished
          booking in five guided steps.
        </p>

        <div className="refbox">
          <div className="stack--xs stack">
            <p className="mono">Demo reference</p>
            <p className="refbox__value">{bookingRef}</p>
          </div>
          <p className="mono" style={{ maxWidth: '22ch' }}>
            Not valid for travel
          </p>
        </div>

        <p className="note note--alert">
          <CircleAlert size={17} aria-hidden="true" className="note__icon" />
          <span>
            <strong>This is a simulated booking.</strong> No real reservation exists, no airline was contacted, no
            seat has been held and no payment has been taken. This reference is not valid for travel, and nothing
            you entered was sent anywhere.
          </span>
        </p>
      </section>

      <section className="panel" aria-labelledby="confirmed-details-heading">
        <div className="panel__head">
          <h2 id="confirmed-details-heading">What you chose</h2>
          <p className="mono">Record of this session</p>
        </div>

        <dl className="srows">
          <Row label="Passenger">{passenger.fullName}</Row>
          <Row label="Contact">
            {passenger.email}, {passenger.phone}
          </Row>
          <Row label="Flight">
            {f.airline} <span className="num">{f.flightNumber}</span>
          </Row>
          <Row label="Route">
            {cityName(f.from)} to {cityName(f.to)}
          </Row>
          <Row label="Departs">{clockToHuman(f.departTime)}</Row>
          <Row label="Arrives">
            {clockToHuman(f.arriveTime)}
            {f.arrivesNextDay ? ' (next day)' : ''}
          </Row>
          <Row label="Journey">
            {minutesToHuman(flight.durationMinutes)}, {stopsLabel(f.stops).toLowerCase()}
          </Row>
          <Row label="Simulated fare">{rupees(f.price)}</Row>
        </dl>

        <div className="actions" style={{ marginTop: '1.75rem' }}>
          <button type="button" className="btn btn--primary" onClick={onRestart}>
            <RotateCcw size={17} aria-hidden="true" />
            Start a new search
          </button>
        </div>
      </section>
    </>
  )
}
