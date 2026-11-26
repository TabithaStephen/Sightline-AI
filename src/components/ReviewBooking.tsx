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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="srow">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export default function ReviewBooking({ flight, passenger, onConfirm, onEditFlight, onEditPassenger }: Props) {
  const { flight: f } = flight

  return (
    <>
      <section className="band" aria-labelledby="review-heading">
        <p className="eyebrow">
          Step 04 / 05 <span aria-hidden="true">&mdash;</span> Review
        </p>
        <h1 className="display--md" id="review-heading">
          Check it before you <span className="serif">confirm</span>
        </h1>
        <p className="lede">
          Nothing has been booked yet. Read the summary below, change anything that is wrong, and confirm only when
          you are ready.
        </p>
      </section>

      <section className="panel" aria-labelledby="summary-heading">
        <div className="panel__head">
          <h2 id="summary-heading">Booking summary</h2>
          <p className="mono">Simulated</p>
        </div>

        <div className="review">
          <div className="review__section">
            <div className="review__head">
              <h3>Flight</h3>
              <button type="button" className="btn btn--quiet" onClick={onEditFlight}>
                <Pencil size={13} aria-hidden="true" />
                Change flight
              </button>
            </div>
            <dl className="srows">
              <Row label="Airline">{f.airline}</Row>
              <Row label="Flight number">
                <span className="num">{f.flightNumber}</span>
              </Row>
              <Row label="Route">
                {cityName(f.from)} ({f.from}) to {cityName(f.to)} ({f.to})
              </Row>
              <Row label="Departs">{clockToHuman(f.departTime)}</Row>
              <Row label="Arrives">
                {clockToHuman(f.arriveTime)}
                {f.arrivesNextDay ? ' (next day)' : ''}
              </Row>
              <Row label="Journey time">{minutesToHuman(flight.durationMinutes)}</Row>
              <Row label="Stops">
                {stopsLabel(f.stops)}
                {f.stops > 0 && ` via ${f.via.map(cityName).join(', ')}`}
              </Row>
              <Row label="Baggage">
                {f.cabinBag}. {f.checkedBag}.
              </Row>
              <Row label="Fare type">{f.refundable ? 'Refundable' : 'Non-refundable'}</Row>
            </dl>
          </div>

          <div className="review__section">
            <div className="review__head">
              <h3>Passenger</h3>
              <button type="button" className="btn btn--quiet" onClick={onEditPassenger}>
                <Pencil size={13} aria-hidden="true" />
                Change passenger details
              </button>
            </div>
            <dl className="srows">
              <Row label="Full name">{passenger.fullName}</Row>
              <Row label="Email address">{passenger.email}</Row>
              <Row label="Phone number">{passenger.phone}</Row>
            </dl>
          </div>
        </div>

        <div className="total">
          <p className="mono">Total for 1 passenger</p>
          <p className="total__value">{rupees(f.price)}</p>
        </div>

        <p className="note note--alert" style={{ marginTop: '1.75rem' }}>
          <CircleAlert size={17} aria-hidden="true" className="note__icon" />
          <span>
            <strong>This is a demonstration.</strong> Confirming creates a simulated booking only. No airline is
            contacted, no seat is held, and no payment is taken. You will never be asked for card details.
          </span>
        </p>

        <div className="actions" style={{ marginTop: '1.75rem' }}>
          <button type="button" className="btn btn--primary" onClick={onConfirm}>
            <ShieldCheck size={17} aria-hidden="true" />
            Confirm demo booking
          </button>
          <button type="button" className="btn btn--secondary" onClick={onEditPassenger}>
            <ArrowLeft size={17} aria-hidden="true" />
            Back to passenger details
          </button>
        </div>
      </section>
    </>
  )
}
