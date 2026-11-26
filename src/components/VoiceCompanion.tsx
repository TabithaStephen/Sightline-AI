import { useEffect, useRef } from 'react'
import { CircleStop, Compass, Mic, MicOff, RotateCcw, Sparkles, X } from 'lucide-react'
import { useVoice, type VoiceStatus } from './VoiceProvider'
import type { Step } from '../types'

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: 'Ready',
  listening: 'Listening',
  processing: 'Thinking',
  speaking: 'Speaking',
  error: 'Needs attention',
}

const STATUS_HINT: Record<VoiceStatus, string> = {
  idle: 'Choose Start listening, or use a question below.',
  listening: 'Say something like “explain this screen”.',
  processing: 'Working out the answer from what is on screen.',
  speaking: 'Choose Stop speaking to interrupt at any time.',
  error: 'Voice is unavailable, but every button still works.',
}

/** Contextual one-tap questions, so the companion is usable without a mic. */
function quickAsks(step: Step): Array<{ id: string; label: string }> {
  switch (step) {
    case 'results':
      return [
        { id: 'cheapest', label: 'Which is cheapest?' },
        { id: 'fastest', label: 'Which is fastest?' },
        { id: 'stops', label: 'Which has fewest stops?' },
        { id: 'tradeoff', label: 'What am I giving up?' },
        { id: 'options', label: 'Read the options' },
      ]
    default:
      return []
  }
}

function Orb({ status }: { status: VoiceStatus }) {
  return (
    <div className={`orb orb--${status}`} aria-hidden="true">
      <span className="orb__halo" />
      <span className="orb__blob orb__blob--a" />
      <span className="orb__blob orb__blob--b" />
      <span className="orb__blob orb__blob--c" />
      <span className="orb__core" />
    </div>
  )
}

export default function VoiceCompanion({ step }: { step: Step }) {
  const voice = useVoice()
  const panelRef = useRef<HTMLDivElement>(null)
  const micRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const { open, status } = voice

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement as HTMLElement | null
    micRef.current?.focus()
    return () => {
      returnFocusRef.current?.focus?.()
    }
  }, [open])

  // Escape closes; Tab is kept inside the dialog while it is open.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        voice.setOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, voice])

  if (!open) return null

  const asks = quickAsks(step)
  const speaking = status === 'speaking' || status === 'processing'

  return (
    <div className="voice-overlay" role="presentation">
      <div
        className="voice-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-title"
        ref={panelRef}
      >
        <div className="voice-panel__top">
          <p className="mono mono--accent" id="voice-title">
            SIGHTLINE voice companion
          </p>
          <button type="button" className="btn btn--quiet" onClick={() => voice.setOpen(false)}>
            <X size={14} aria-hidden="true" />
            Close
          </button>
        </div>

        <div className="voice-stage">
          <Orb status={status} />

          <div className="voice-state">
            <p className="mono mono--accent voice-state__label">
              <span className={`voice-dot voice-dot--${status}`} aria-hidden="true" />
              {STATUS_LABEL[status]}
            </p>
            <p className="fine">{STATUS_HINT[status]}</p>
          </div>
        </div>

        {/* What the microphone is picking up, live. */}
        <div className="voice-transcript" aria-live="polite">
          <p className="mono">You said</p>
          <p className="voice-transcript__text">
            {voice.transcript || voice.lastHeard || (
              <span className="voice-transcript__empty">Nothing yet.</span>
            )}
          </p>
        </div>

        {/*
          Captions are deliberately not a live region: the companion already
          speaks this text, and announcing it again would double up for anyone
          using a screen reader alongside it.
        */}
        <div className="voice-caption">
          <p className="mono">Response</p>
          <p className="voice-caption__text">
            {voice.caption || 'Ask me about this screen and the answer appears here as well as aloud.'}
          </p>
        </div>

        {voice.error && (
          <p className="note note--alert">
            <span className="mono" style={{ color: 'inherit', flex: 'none' }}>
              Note
            </span>
            <span>{voice.error}</span>
          </p>
        )}

        {!voice.canSpeak && (
          <p className="note">
            <span className="mono" style={{ color: 'inherit', flex: 'none' }}>
              Note
            </span>
            <span>
              This browser cannot speak out loud, so every answer is shown as text above instead.
            </span>
          </p>
        )}

        <div className="voice-controls">
          <button
            type="button"
            ref={micRef}
            className="btn btn--primary"
            onClick={voice.toggleListening}
            disabled={!voice.canListen}
            aria-pressed={status === 'listening'}
          >
            {status === 'listening' ? <MicOff size={17} aria-hidden="true" /> : <Mic size={17} aria-hidden="true" />}
            {status === 'listening' ? 'Stop listening' : 'Start listening'}
          </button>

          <button type="button" className="btn btn--secondary" onClick={voice.stop} disabled={!speaking}>
            <CircleStop size={17} aria-hidden="true" />
            Stop speaking
          </button>

          <button type="button" className="btn btn--secondary" onClick={voice.replay} disabled={!voice.caption}>
            <RotateCcw size={17} aria-hidden="true" />
            Replay
          </button>
        </div>

        {!voice.canListen && (
          <p className="fine">
            Speech input is not available in this browser, so the microphone button is switched off. The questions
            below and every control in SIGHTLINE still work.
          </p>
        )}

        <div className="voice-asks">
          <p className="mono">Ask about this screen</p>
          <div className="voice-asks__row">
            <button type="button" className="ask" onClick={voice.explainCurrentScreen}>
              <Sparkles size={14} aria-hidden="true" />
              Explain this screen
            </button>
            <button type="button" className="ask" onClick={voice.describeNextSteps}>
              <Compass size={14} aria-hidden="true" />
              What can I do here?
            </button>
            {asks.map((ask) => (
              <button
                key={ask.id}
                type="button"
                className="ask"
                onClick={() =>
                  ask.id === 'options'
                    ? voice.readFlightOptions()
                    : voice.answerChoice(ask.id as 'cheapest' | 'fastest' | 'stops' | 'tradeoff')
                }
              >
                {ask.label}
              </button>
            ))}
          </div>
        </div>

        <p className="fine">
          Closing the companion keeps your place in the booking — nothing is lost. SIGHTLINE never selects a flight,
          fills in your details or confirms a booking from speech on its own.
        </p>
      </div>
    </div>
  )
}
