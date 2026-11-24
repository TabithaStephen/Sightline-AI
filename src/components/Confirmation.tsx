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

export default function Confirmation({ flight, passenger, bookingRef, onRestart }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { flight: f } = flight

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <>
      <section className="card stack" aria-labelledby="confirm-heading">
        <p className="eyebrow">Step 5 of 5 &middot; Confirmed</p>
        <div className="confirm-mark" aria-hidden="true">
          <Check size={34} />
        </div>
        <h1 id="confirm-heading" ref={headingRef} tabIndex={-1}>
          Demo booking confirmed
        </h1>
        <p className="lede">
          {passenger.fullName} is booked on {f.airline} {f.flightNumber} from {cityName(f.from)} to{' '}
          {cityName(f.to)} &mdash; in this simulation only.
        </p>

        <p className="notice">
          <CircleAlert size={20} aria-hidden="true" className="notice__icon" />
          <span>
            <strong>This is a demo booking.</strong> No real reservation exists, no seat has been held, and no
            payment has been taken. This reference is not valid for travel, and nothing you entered was sent
            anywhere.
          </span>
        </p>

        <div className="ref-box">
          <p className="summary-item__label">Demo reference</p>
          <p className="ref-box__value">{bookingRef}</p>
        </div>
      </section>

      <section className="card stack" aria-labelledby="confirmed-details-heading">
        <h2 id="confirmed-details-heading">What you chose</h2>
        <dl className="summary-list summary-list--cols">
          <div className="summary-item">
            <dt className="summary-item__label">Passenger</dt>
            <dd className="summary-item__value">{passenger.fullName}</dd>
          </div>
          <div className="summary-item">
            <dt className="summary-item__label">Contact</dt>
            <dd className="summary-item__value">
              {passenger.email}, {passenger.phone}
            </dd>
          </div>
          <div className="summary-item">
            <dt className="summary-item__label">Flight</dt>
            <dd className="summary-item__value">
              {f.airline} {f.flightNumber}
            </dd>
          </div>
          <div className="summary-item">
            <dt className="summary-item__label">Route</dt>
            <dd className="summary-item__value">
              {cityName(f.from)} to {cityName(f.to)}
            </dd>
          </div>
          <div className="summary-item">
            <dt className="summary-item__label">Departs</dt>
            <dd className="summary-item__value">{clockToHuman(f.departTime)}</dd>
          </div>
          <div className="summary-item">
            <dt className="summary-item__label">Arrives</dt>
            <dd className="summary-item__value">
              {clockToHuman(f.arriveTime)}
              {f.arrivesNextDay ? ' (next day)' : ''}
            </dd>
          </div>
          <div className="summary-item">
            <dt className="summary-item__label">Journey</dt>
            <dd className="summary-item__value">
              {minutesToHuman(flight.durationMinutes)}, {stopsLabel(f.stops).toLowerCase()}
            </dd>
          </div>
          <div className="summary-item">
            <dt className="summary-item__label">Simulated fare</dt>
            <dd className="summary-item__value">{rupees(f.price)}</dd>
          </div>
        </dl>

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onRestart}>
            <RotateCcw size={20} aria-hidden="true" />
            Start a new search
          </button>
        </div>
      </section>
    </>
  )
}
