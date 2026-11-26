import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Mic, MicOff } from 'lucide-react'

const EXAMPLES = [
  'Find me a direct flight from Bengaluru to Mumbai under ₹8,000.',
  'Cheapest flight from Mumbai to Bengaluru, I do not mind a stop.',
  'Morning flight from Bengaluru to Delhi, budget ₹7,000.',
  'Fastest direct flight from Delhi to Mumbai in the evening.',
]

const FACTS: Array<{ label: string; text: string }> = [
  {
    label: 'Scope',
    text: 'This prototype demonstrates one task from start to finish: finding and booking a flight.',
  },
  {
    label: 'Data',
    text: 'Every flight, price and reference is simulated. Nothing is booked and no payment is taken.',
  },
  {
    label: 'Tools',
    text: 'SIGHTLINE works alongside your screen reader and other assistive tools. It does not replace them.',
  },
]

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type RecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface Props {
  initialText: string
  onSubmit: (text: string) => void
}

export default function TaskEntry({ initialText, onSubmit }: Props) {
  const [text, setText] = useState(initialText)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceNote, setVoiceNote] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const [voiceSupported] = useState(() => getRecognitionCtor() !== null)

  useEffect(() => () => recognitionRef.current?.stop(), [])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (text.trim().length < 3) {
      setError(
        'Please describe the flight you need, for example: a direct flight from Bengaluru to Mumbai under 8,000 rupees.',
      )
      inputRef.current?.focus()
      return
    }
    setError(null)
    onSubmit(text)
  }

  function applyExample(example: string) {
    setText(example)
    setError(null)
    inputRef.current?.focus()
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    const recognition = new Ctor()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript ?? ''
      if (spoken) {
        setText((current) => (current.trim() ? `${current.trim()} ${spoken}` : spoken))
        setVoiceNote(`Heard: "${spoken}". Check the text and edit it if needed.`)
        setError(null)
      } else {
        setVoiceNote('Nothing was heard. Please type your request instead.')
      }
    }
    recognition.onerror = () => {
      setVoiceNote('Voice input did not work. Please type your request instead.')
      setListening(false)
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    setVoiceNote('Listening. Say where you are flying from and to.')
    setListening(true)
    recognition.start()
  }

  return (
    <section className="hero" aria-labelledby="entry-heading">
      <div className="hero__lead">
        <p className="eyebrow">Accessibility companion</p>

        <h1 className="display hero__display" id="entry-heading">
          <span>The web,</span>
          <span>without the</span>
          <span className="serif">barriers.</span>
        </h1>

        <p className="lede">
          SIGHTLINE helps people with visual impairments make sense of complex online experiences. It reads a task
          back to you in plain language, explains the options that matter, and keeps every consequential decision in
          your hands.
        </p>

        <dl className="hero__meta">
          {FACTS.map((fact) => (
            <div className="hero__metarow" key={fact.label}>
              <dt className="mono">{fact.label}</dt>
              <dd style={{ margin: 0 }}>
                <p>{fact.text}</p>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="hero__panel">
        <div className="hero__panel-head">
          <h2 className="mono mono--ivory" style={{ fontWeight: 400 }}>
            Describe your flight
          </h2>
          <p className="mono num">01 / 05</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="stack">
          <div className="field">
            <label className="field__label" htmlFor="request-input">
              What do you need?
            </label>
            <p className="field__hint" id="request-hint">
              Say it in your own words. Include where you are flying from and to; you can add a budget, a time of
              day, or the word &ldquo;direct&rdquo;. Anything you leave out gets a sensible default that you can
              change on the next screen.
            </p>
            <textarea
              id="request-input"
              ref={inputRef}
              className="textarea"
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-describedby={error ? 'request-hint request-error' : 'request-hint'}
              aria-invalid={error ? 'true' : undefined}
              placeholder="A direct flight from Bengaluru to Mumbai under 8,000 rupees"
              rows={3}
            />
            {error && (
              <p className="field__error" id="request-error">
                <span className="mono" style={{ color: 'inherit' }}>
                  Error
                </span>
                {error}
              </p>
            )}
          </div>

          <div className="actions">
            <button type="submit" className="btn btn--primary">
              Understand my request
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            {voiceSupported && (
              <button type="button" className="btn btn--secondary" onClick={toggleVoice} aria-pressed={listening}>
                {listening ? <MicOff size={17} aria-hidden="true" /> : <Mic size={17} aria-hidden="true" />}
                {listening ? 'Stop listening' : 'Speak instead'}
              </button>
            )}
          </div>

          <p aria-live="polite" className="voice-note">
            {listening && <span className="listening-dot" aria-hidden="true" />}
            {voiceNote}
          </p>
        </form>

        <hr className="rule" style={{ margin: '1.5rem 0 1.1rem' }} />

        <h2 className="mono assist__section-title" style={{ marginBottom: '0.35rem' }}>
          Suggested requests
        </h2>
        <p className="field__hint" style={{ marginBottom: '0.35rem' }}>
          Choosing one fills in the box above. You can edit it before searching.
        </p>
        <ul className="examples">
          {EXAMPLES.map((example, index) => (
            <li key={example}>
              <button type="button" className="example" onClick={() => applyExample(example)}>
                <span className="example__num num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{example}</span>
                <ArrowRight size={15} className="example__arrow" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
