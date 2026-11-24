import { ArrowLeft, CircleAlert, Pencil, ShieldCheck } from 'lucide-react'
import { cityName } from '../data/airports'
import { clockToHuman, minutesToHuman, rupees, stopsLabel } from '../lib/format'
import type { Passenger, RankedFlight } from '../types'

interface Props {
  flight: RankedFlight
  passenger: Passenger
  onConfirm: () => void
  onEditFlight: () => void
  onEditPassenger: () => void
}

export default function ReviewBooking({ flight, passenger, onConfirm, onEditFlight, onEditPassenger }: Props) {
  const { flight: f } = flight

  return (
    <>
      <section className="card stack" aria-labelledby="review-heading">
        <p className="eyebrow">Step 4 of 5 &middot; Review</p>
        <h1 id="review-heading">Check your booking before confirming</h1>
        <p className="lede">
          Nothing has been booked yet. Read the summary below, change anything that is wrong, and confirm only when
          you are ready.
        </p>
      </section>

      <section className="card stack" aria-labelledby="summary-heading">
        <h2 id="summary-heading">Booking summary</h2>

        <div className="review-grid">
          <div className="review-section">
            <div className="review-section__head">
              <h3>Flight</h3>
              <button type="button" className="btn btn-quiet" onClick={onEditFlight}>
                <Pencil size={18} aria-hidden="true" />
                Change flight
              </button>
            </div>
            <dl className="summary-list summary-list--cols">
              <div className="summary-item">
                <dt className="summary-item__label">Airline</dt>
                <dd className="summary-item__value">{f.airline}</dd>
              </div>
              <div className="summary-item">
                <dt className="summary-item__label">Flight number</dt>
                <dd className="summary-item__value">{f.flightNumber}</dd>
              </div>
              <div className="summary-item">
                <dt className="summary-item__label">Route</dt>
                <dd className="summary-item__value">
                  {cityName(f.from)} ({f.from}) to {cityName(f.to)} ({f.to})
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
                <dt className="summary-item__label">Journey time</dt>
                <dd className="summary-item__value">{minutesToHuman(flight.durationMinutes)}</dd>
              </div>
              <div className="summary-item">
                <dt className="summary-item__label">Stops</dt>
                <dd className="summary-item__value">
                  {stopsLabel(f.stops)}
                  {f.stops > 0 && ` via ${f.via.map(cityName).join(', ')}`}
                </dd>
              </div>
              <div className="summary-item">
                <dt className="summary-item__label">Baggage</dt>
                <dd className="summary-item__value">
                  {f.cabinBag}. {f.checkedBag}.
                </dd>
              </div>
              <div className="summary-item">
                <dt className="summary-item__label">Fare type</dt>
                <dd className="summary-item__value">{f.refundable ? 'Refundable' : 'Non-refundable'}</dd>
              </div>
            </dl>
          </div>

          <div className="review-section">
            <div className="review-section__head">
              <h3>Passenger</h3>
              <button type="button" className="btn btn-quiet" onClick={onEditPassenger}>
                <Pencil size={18} aria-hidden="true" />
                Change passenger details
              </button>
            </div>
            <dl className="summary-list summary-list--cols">
              <div className="summary-item">
                <dt className="summary-item__label">Full name</dt>
                <dd className="summary-item__value">{passenger.fullName}</dd>
              </div>
              <div className="summary-item">
                <dt className="summary-item__label">Email address</dt>
                <dd className="summary-item__value">{passenger.email}</dd>
              </div>
              <div className="summary-item">
                <dt className="summary-item__label">Phone number</dt>
                <dd className="summary-item__value">{passenger.phone}</dd>
              </div>
            </dl>
          </div>
        </div>

        <p className="total-row">
          <span>Total for 1 passenger</span>
          <span>{rupees(f.price)}</span>
        </p>

        <p className="notice">
          <CircleAlert size={20} aria-hidden="true" className="notice__icon" />
          <span>
            <strong>This is a demo.</strong> Confirming creates a simulated booking only. No airline is contacted, no
            seat is held, and no payment is taken. You will never be asked for card details.
          </span>
        </p>

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            <ShieldCheck size={20} aria-hidden="true" />
            Confirm demo booking
          </button>
          <button type="button" className="btn btn-secondary" onClick={onEditPassenger}>
            <ArrowLeft size={20} aria-hidden="true" />
            Back to passenger details
          </button>
        </div>
      </section>
    </>
  )
}
