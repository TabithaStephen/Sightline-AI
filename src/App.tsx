import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Type } from 'lucide-react'
import AssistPanel from './components/AssistPanel'
import Confirmation from './components/Confirmation'
import FlightResults from './components/FlightResults'
import Interpretation from './components/Interpretation'
import PassengerForm from './components/PassengerForm'
import ProgressSteps from './components/ProgressSteps'
import ReviewBooking from './components/ReviewBooking'
import { buildAssist } from './lib/assist'
import { parseRequest } from './lib/parse'
import { searchFlights } from './lib/search'
import TaskEntry from './components/TaskEntry'
import type { Passenger, Step, TripRequest } from './types'
import './App.css'

type TextSize = 'standard' | 'large' | 'xlarge'

const TEXT_SIZES: Array<{ value: TextSize; label: string; short: string }> = [
  { value: 'standard', label: 'Standard text size', short: 'A' },
  { value: 'large', label: 'Large text size', short: 'A+' },
  { value: 'xlarge', label: 'Extra large text size', short: 'A++' },
]

const EMPTY_PASSENGER: Passenger = { fullName: '', email: '', phone: '' }

function makeBookingRef(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `SL-${code}`
}

function readStoredTextSize(): TextSize {
  try {
    const stored = localStorage.getItem('sightline:text-size')
    if (stored === 'large' || stored === 'xlarge' || stored === 'standard') return stored
  } catch {
    // Storage can be blocked; the default size is used instead.
  }
  return 'standard'
}

export default function App() {
  const [step, setStep] = useState<Step>('entry')
  const [requestText, setRequestText] = useState('')
  const [request, setRequest] = useState<TripRequest | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [passenger, setPassenger] = useState<Passenger>(EMPTY_PASSENGER)
  const [bookingRef, setBookingRef] = useState<string | null>(null)
  const [textSize, setTextSize] = useState<TextSize>(readStoredTextSize)
  const [announcement, setAnnouncement] = useState('')
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  const result = useMemo(() => (request ? searchFlights(request) : null), [request])
  const selected = result?.matches.find((m) => m.flight.id === selectedId) ?? null

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize
    try {
      localStorage.setItem('sightline:text-size', textSize)
    } catch {
      // Ignore storage failures: the setting still applies for this session.
    }
  }, [textSize])

  // Drop a selection that is no longer in the result set (for example after the
  // request was edited), so the review screen can never show a stale flight.
  useEffect(() => {
    if (!result) return
    const ids = result.matches.map((m) => m.flight.id)
    if (selectedId && !ids.includes(selectedId)) setSelectedId(null)
    setCompareIds((current) => {
      const kept = current.filter((id) => ids.includes(id))
      return kept.length === current.length ? current : kept
    })
  }, [result, selectedId])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (step !== 'confirmation') mainRef.current?.focus()
  }, [step])

  const assist = buildAssist({
    step,
    request,
    result,
    selected,
    compared: result?.matches.filter((m) => compareIds.includes(m.flight.id)) ?? [],
    passenger,
    bookingRef,
  })

  function handleRequest(text: string) {
    const parsed = parseRequest(text)
    setRequestText(text)
    setRequest(parsed)
    setSelectedId(null)
    setCompareIds([])
    setStep('interpret')
    setAnnouncement('Your request was read. Check the details on screen and correct anything that is wrong.')
  }

  function handleShowResults() {
    const found = request ? searchFlights(request) : null
    setStep('results')
    setAnnouncement(
      found && found.routeSupported
        ? `${found.matches.length} simulated flights match your request. The first one is recommended.`
        : 'No simulated flights are available for that route.',
    )
  }

  function handleSelect(id: string) {
    const match = result?.matches.find((m) => m.flight.id === id)
    setSelectedId(id)
    setAnnouncement(
      match
        ? `Selected ${match.flight.airline} ${match.flight.flightNumber}. Nothing is booked yet. Choose "Continue with this flight" when you are ready.`
        : 'Flight selected.',
    )
  }

  function handleToggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) {
        setAnnouncement('Flight removed from the comparison.')
        return current.filter((item) => item !== id)
      }
      if (current.length >= 3) {
        setAnnouncement('You can compare up to three flights. Remove one before adding another.')
        return current
      }
      const next = [...current, id]
      setAnnouncement(
        next.length >= 2
          ? `Comparing ${next.length} flights. The comparison table is above the flight list.`
          : 'Flight added to the comparison. Add one more to see them side by side.',
      )
      return next
    })
  }

  function handleConfirm() {
    const reference = makeBookingRef()
    setBookingRef(reference)
    setStep('confirmation')
    setAnnouncement(`Demo booking confirmed. Reference ${reference}. No real reservation was made.`)
  }

  function handleRestart() {
    setStep('entry')
    setRequestText('')
    setRequest(null)
    setSelectedId(null)
    setCompareIds([])
    setPassenger(EMPTY_PASSENGER)
    setBookingRef(null)
    setAnnouncement('Starting a new search. Your previous demo booking has been cleared.')
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <header className="site-header">
        <div className="site-header__inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              <Eye size={22} />
            </span>
            <div>
              <p className="brand__name">Sightline</p>
              <p className="brand__tagline">The web, on your terms.</p>
            </div>
          </div>

          <div className="text-size">
            <span className="text-size__label" id="text-size-label">
              <Type size={18} aria-hidden="true" />
              Text size
            </span>
            <div className="text-size__group" role="group" aria-labelledby="text-size-label">
              {TEXT_SIZES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="text-size__btn"
                  aria-pressed={textSize === option.value}
                  onClick={() => {
                    setTextSize(option.value)
                    setAnnouncement(`${option.label} applied.`)
                  }}
                >
                  <span aria-hidden="true">{option.short}</span>
                  <span className="visually-hidden">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <p className="demo-banner">
        <span className="demo-banner__inner">
          <span aria-hidden="true">&#9888;</span>
          Demonstration only: all flights, prices and bookings on this site are simulated. No real reservation or
          payment is ever made.
        </span>
      </p>

      <ProgressSteps step={step} />

      <div className="layout">
        <main className="column" id="main" ref={mainRef} tabIndex={-1} aria-label="Flight booking assistant">
          {step === 'entry' && <TaskEntry initialText={requestText} onSubmit={handleRequest} />}

          {step === 'interpret' && request && (
            <Interpretation
              request={request}
              onChange={setRequest}
              onConfirm={handleShowResults}
              onBack={() => setStep('entry')}
            />
          )}

          {step === 'results' && request && result && (
            <FlightResults
              request={request}
              result={result}
              selectedId={selectedId}
              compareIds={compareIds}
              onSelect={handleSelect}
              onToggleCompare={handleToggleCompare}
              onContinue={() => {
                setStep('passenger')
                setAnnouncement('Now enter the passenger details. Nothing is booked yet.')
              }}
              onBack={() => setStep('interpret')}
            />
          )}

          {step === 'passenger' && selected && (
            <PassengerForm
              passenger={passenger}
              flight={selected}
              onChange={setPassenger}
              onSubmit={() => {
                setStep('review')
                setAnnouncement('Check your booking summary. Nothing is booked until you confirm.')
              }}
              onBack={() => setStep('results')}
            />
          )}

          {step === 'review' && selected && (
            <ReviewBooking
              flight={selected}
              passenger={passenger}
              onConfirm={handleConfirm}
              onEditFlight={() => setStep('results')}
              onEditPassenger={() => setStep('passenger')}
            />
          )}

          {step === 'confirmation' && selected && bookingRef && (
            <Confirmation
              flight={selected}
              passenger={passenger}
              bookingRef={bookingRef}
              onRestart={handleRestart}
            />
          )}

          {(step === 'passenger' || step === 'review' || step === 'confirmation') && !selected && (
            <section className="card stack">
              <h1>Your flight selection was cleared</h1>
              <p className="lede">
                The chosen flight is no longer in your results, which can happen if the search was changed. Start
                again to pick a flight.
              </p>
              <div className="actions">
                <button type="button" className="btn btn-primary" onClick={handleRestart}>
                  Start a new search
                </button>
              </div>
            </section>
          )}
        </main>

        <AssistPanel content={assist} />
      </div>

      <p aria-live="polite" role="status" className="visually-hidden">
        {announcement}
      </p>

      <footer className="site-footer">
        <p>
          SIGHTLINE is an accessibility-focused task companion built as a prototype. It works alongside screen
          readers and other assistive tools rather than replacing them. All flight data here is simulated.
        </p>
      </footer>
    </div>
  )
}
