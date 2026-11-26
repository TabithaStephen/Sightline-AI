import { useEffect, useMemo, useRef, useState } from 'react'
import { Headphones, PlayCircle, RotateCcw, Type } from 'lucide-react'
import AssistPanel from './components/AssistPanel'
import VoiceCompanion from './components/VoiceCompanion'
import { useVoice, usePublishVoiceContext, VoiceProvider, type VoiceActions } from './components/VoiceProvider'
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
import StudentWorkflow, { type StudentDriver } from './student/StudentWorkflow'
import DemoController from './demo/DemoController'
import { drivers } from './demo/drivers'
import { answerChoiceQuestion, describeFlight, describeNext, explainScreen } from './lib/narrate'
import { validatePassenger } from './components/PassengerForm'
import { STAGE_LABEL, STAGE_ORDER } from './student/data'
import { studentExplainScreen, studentNextSteps } from './student/narrate'
import type { Passenger, Step, TripRequest } from './types'
import './App.css'
import './voice.css'
import './demo.css'

type TextSize = 'standard' | 'large' | 'xlarge'

const TEXT_SIZES: Array<{ value: TextSize; label: string; short: string }> = [
  { value: 'standard', label: 'Standard text size', short: 'A' },
  { value: 'large', label: 'Large text size', short: 'A+' },
  { value: 'xlarge', label: 'Extra large text size', short: 'A++' },
]

const STEP_LABELS: Record<Step, string> = {
  entry: 'Your request',
  interpret: 'Your request',
  results: 'Choose a flight',
  passenger: 'Passenger details',
  review: 'Review',
  confirmation: 'Confirmed',
}

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

export type Scenario = 'flight' | 'student'

export default function App() {
  return (
    <VoiceProvider>
      <Workflow />
    </VoiceProvider>
  )
}

function Workflow() {
  const [scenario, setScenario] = useState<Scenario>('flight')
  const [demoRunning, setDemoRunning] = useState(false)
  const [studentStage, setStudentStage] = useState<string>('personal')
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

  const voice = useVoice()

  // What the companion is allowed to do here. Anything consequential — picking
  // a flight, submitting the form, confirming the booking — is deliberately
  // left to the on-screen control, never to a spoken command.
  const voiceActions: VoiceActions = (() => {
    switch (step) {
      case 'interpret':
        return {
          onBack: () => setStep('entry'),
          backLabel: 'your request',
          onContinue: handleShowResults,
          continueLabel: 'the flight results',
        }
      case 'results':
        return {
          onBack: () => setStep('interpret'),
          backLabel: 'the check screen',
          onContinue: selected
            ? () => {
                setStep('passenger')
                setAnnouncement('Now enter the passenger details. Nothing is booked yet.')
              }
            : undefined,
          continueLabel: 'passenger details',
          continueBlockedReason:
            'No flight is selected yet, so there is nothing to continue with. Choose Select this flight on the option you want, then ask me to continue.',
        }
      case 'passenger':
        return {
          onBack: () => setStep('results'),
          backLabel: 'the flight list',
          continueBlockedReason:
            'I will not submit the form for you. Choose Review booking on screen and I will read out anything that needs fixing.',
        }
      case 'review':
        return {
          onBack: () => setStep('passenger'),
          backLabel: 'passenger details',
          continueBlockedReason:
            'Confirming is your decision to make, so I will not do it from a spoken command. Use the Confirm demo booking button on screen.',
        }
      case 'confirmation':
        return {
          continueBlockedReason:
            'The task is finished. Choose Start a new search to run it again with a different request.',
        }
      default:
        return {
          continueBlockedReason:
            'Type or dictate the flight you need first, then choose Understand my request.',
        }
    }
  })()

  // The Guided Demo drives the real workflow through these actions, with
  // predefined data — no microphone, no network, no external service.
  useEffect(() => {
    drivers.setScenario = (next) => setScenario(next)
    return () => {
      drivers.setScenario = null
    }
  }, [])

  useEffect(() => {
    const narration = () => ({
      step,
      request,
      result,
      selected,
      compared: result?.matches.filter((m) => compareIds.includes(m.flight.id)) ?? [],
      passenger,
      bookingRef,
    })
    drivers.flight = {
      reset: handleRestart,
      applyRequest: (text) => handleRequest(text),
      showResults: handleShowResults,
      selectRecommended: () => {
        const id = result?.recommendedId ?? result?.matches[0]?.flight.id
        if (id) handleSelect(id)
      },
      continueToPassenger: () => setStep('passenger'),
      setPassenger: (next) => setPassenger(next),
      validateNow: () =>
        Object.entries(validatePassenger(passenger)).filter(([, value]) => Boolean(value)) as Array<
          [keyof Passenger, string]
        >,
      goReview: () => setStep('review'),
      confirm: handleConfirm,
      explain: () => explainScreen(narration()),
      nextSteps: () => describeNext(narration()),
      tradeOff: () => answerChoiceQuestion('tradeoff', result, request),
      describeSelected: () =>
        selected ? `You have chosen ${describeFlight(selected)}.` : 'No flight is selected.',
    }
    return () => {
      drivers.flight = null
    }
  })

  usePublishVoiceContext({
    step,
    request,
    result,
    selected,
    compared: result?.matches.filter((m) => compareIds.includes(m.flight.id)) ?? [],
    passenger,
    bookingRef,
    ...voiceActions,
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
          ? `Comparing ${next.length} flights. The comparison is above the flight list.`
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

  const isEntry = step === 'entry'

  // The guided help rail follows whichever task is on screen.
  const studentState = scenario === 'student' ? (drivers.student?.getState() ?? null) : null
  const studentAssist = studentState
    ? {
        heading: `${STAGE_LABEL[studentState.stage]} — what this section is for`,
        nextAction: studentNextSteps({ ...studentState, reference: null }),
        points: studentExplainScreen({ ...studentState, reference: null })
          .split('. ')
          .map((sentence) => sentence.trim())
          .filter(Boolean)
          .slice(0, 5)
          .map((sentence) => (sentence.endsWith('.') ? sentence : `${sentence}.`)),
        questions: [],
      }
    : null

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <header className="masthead">
        <div className="masthead__inner wrap">
          <a className="wordmark" href="#main">
            <span className="wordmark__name">Sightline</span>
            <span className="wordmark__dot" aria-hidden="true" />
          </a>

          <div className="masthead__meta">
            <span className="masthead__divider" aria-hidden="true" />
            <p className="mono masthead__long">
              Prototype 01 <span aria-hidden="true">&mdash;</span> Guided flight booking
            </p>
            <span className="masthead__divider masthead__long" aria-hidden="true" />
            <p className="mono mono--accent">{STEP_LABELS[step]}</p>
          </div>

          <div className="masthead__tools">
            <div className="textsize">
              <span className="mono textsize__label" id="text-size-label">
                <Type size={14} aria-hidden="true" />
                Text
              </span>
              <div className="textsize__group" role="group" aria-labelledby="text-size-label">
                {TEXT_SIZES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="textsize__btn"
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

            <div className="scenario-switch" role="group" aria-label="Choose a task">
              {([
                { id: 'flight' as Scenario, label: 'Flight booking' },
                { id: 'student' as Scenario, label: 'Student assistance' },
              ]).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="scenario-switch__btn"
                  aria-pressed={scenario === option.id}
                  onClick={() => {
                    setScenario(option.id)
                    setAnnouncement(`Switched to the ${option.label.toLowerCase()} task.`)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="guided-toggle"
              aria-pressed={voice.guided}
              onClick={() => {
                const next = !voice.guided
                voice.setGuided(next)
                setAnnouncement(
                  next
                    ? 'Guided mode on. Each step will be introduced aloud when you reach it.'
                    : 'Guided mode off.',
                )
              }}
            >
              <span className="guided-toggle__led" aria-hidden="true" />
              Guided mode
              <span className="visually-hidden">{voice.guided ? ' (on)' : ' (off)'}</span>
            </button>

            {!isEntry && (
              <button type="button" className="btn btn--quiet" onClick={handleRestart}>
                <RotateCcw size={14} aria-hidden="true" />
                Start over
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="sim-strip">
        <p className="sim-strip__inner wrap">
          <span className="sim-strip__dot" aria-hidden="true" />
          <span className="mono">
            {scenario === 'flight' ? (
              <>
                Simulated data <span aria-hidden="true">&mdash;</span> no airline is contacted, no seat is held and
                no payment is ever taken
              </>
            ) : (
              <>
                Simulated data <span aria-hidden="true">&mdash;</span> no application is filed with any college or
                authority and no document is uploaded
              </>
            )}
          </span>
        </p>
      </div>

      {scenario === 'flight' && !isEntry && (
        <div className="rail">
          <div className="wrap">
            <ProgressSteps step={step} />
          </div>
        </div>
      )}

      {scenario === 'student' && (
        <div className="rail">
          <div className="wrap">
            <nav aria-label="Application progress">
              <ol className="rail__list rail__list--seven">
                {STAGE_ORDER.map((id, order) => {
                  const currentIndex = STAGE_ORDER.indexOf(studentStage as (typeof STAGE_ORDER)[number])
                  const state = order < currentIndex ? 'done' : order === currentIndex ? 'current' : 'todo'
                  return (
                    <li
                      key={id}
                      className={`rail__item rail__item--${state}`}
                      aria-current={state === 'current' ? 'step' : undefined}
                    >
                      <span className="rail__num num" aria-hidden="true">
                        {String(order + 1).padStart(2, '0')}
                      </span>
                      <span className="rail__label">
                        {STAGE_LABEL[id]}
                        {state === 'done' && <span className="visually-hidden"> (completed)</span>}
                        {state === 'current' && <span className="visually-hidden"> (current step)</span>}
                        {state === 'todo' && <span className="visually-hidden"> (not started)</span>}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </nav>
          </div>
        </div>
      )}

      <div className={scenario === 'flight' && isEntry ? 'shell shell--full' : 'shell'}>
        <main
          key={scenario === 'student' ? 'student' : step}
          className={scenario === 'flight' && isEntry ? 'column column--full' : 'column'}
          id="main"
          ref={mainRef}
          tabIndex={-1}
          aria-label="Guided flight booking"
        >
          {scenario === 'student' && (
            <StudentWorkflow
              onAnnounce={setAnnouncement}
              registerDriver={(driver: StudentDriver | null) => {
                drivers.student = driver
                if (driver) setStudentStage(driver.getState().stage)
              }}
            />
          )}

          {scenario === 'flight' && step === 'entry' && (
            <>
              <TaskEntry initialText={requestText} onSubmit={handleRequest} />
              <AssistPanel content={assist} inline />
            </>
          )}

          {scenario === 'flight' && step === 'interpret' && request && (
            <Interpretation
              request={request}
              onChange={setRequest}
              onConfirm={handleShowResults}
              onBack={() => setStep('entry')}
            />
          )}

          {scenario === 'flight' && step === 'results' && request && result && (
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

          {scenario === 'flight' && step === 'passenger' && selected && (
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

          {scenario === 'flight' && step === 'review' && selected && (
            <ReviewBooking
              flight={selected}
              passenger={passenger}
              onConfirm={handleConfirm}
              onEditFlight={() => setStep('results')}
              onEditPassenger={() => setStep('passenger')}
            />
          )}

          {scenario === 'flight' && step === 'confirmation' && selected && bookingRef && (
            <Confirmation
              flight={selected}
              passenger={passenger}
              bookingRef={bookingRef}
              onRestart={handleRestart}
            />
          )}

          {scenario === 'flight' && (step === 'passenger' || step === 'review' || step === 'confirmation') && !selected && (
            <section className="band" aria-labelledby="cleared-heading">
              <p className="eyebrow">Selection cleared</p>
              <h1 id="cleared-heading" className="display--md">
                Your flight selection
                <br />
                is no longer <span className="serif">available</span>
              </h1>
              <p className="lede">
                The chosen flight is not in your current results, which can happen if the search was changed. Start
                again to pick a flight.
              </p>
              <div className="actions">
                <button type="button" className="btn btn--primary" onClick={handleRestart}>
                  Start a new search
                </button>
              </div>
            </section>
          )}
        </main>

        {!(scenario === 'flight' && isEntry) && (
          <AssistPanel content={scenario === 'student' && studentAssist ? studentAssist : assist} />
        )}
      </div>

      {!demoRunning && (
        <button
          type="button"
          className="demo-launch"
          onClick={() => {
            voice.setOpen(false)
            setDemoRunning(true)
            setAnnouncement('Guided demo starting. It runs both tasks automatically and needs no microphone.')
          }}
        >
          <PlayCircle size={17} aria-hidden="true" />
          Experience SIGHTLINE
          <span className="demo-launch__note">Guided demo</span>
        </button>
      )}

      <DemoController running={demoRunning} onExit={() => setDemoRunning(false)} />

      <button
        type="button"
        className="voice-dock"
        onClick={() => voice.setOpen(true)}
        aria-haspopup="dialog"
      >
        <span className="orb" aria-hidden="true" style={{ width: '2.25rem' }}>
          <span className="orb__blob orb__blob--a" />
          <span className="orb__blob orb__blob--b" />
          <span className="orb__core" />
        </span>
        <span className="voice-dock__label">
          <span className="voice-dock__title">Voice companion</span>
          <span className="voice-dock__state">
            {voice.status === 'idle' ? 'Ask about this screen' : voice.status}
          </span>
        </span>
        <Headphones size={16} aria-hidden="true" />
      </button>

      <VoiceCompanion step={step} />

      <p aria-live="polite" role="status" className="visually-hidden">
        {announcement}
      </p>

      <footer className="footer">
        <div className="footer__inner wrap">
          <div className="footer__brand">
            <p className="wordmark__name">Sightline</p>
            <p className="mono mono--accent">The web, on your terms.</p>
          </div>
          <p className="footer__note">
            SIGHTLINE is an accessibility-focused digital companion, built as a prototype. It works alongside screen
            readers and other assistive tools rather than replacing them. Every flight, price and booking reference
            in this demonstration is simulated: no airline is contacted and no payment is ever taken.
          </p>
        </div>
      </footer>
    </div>
  )
}
