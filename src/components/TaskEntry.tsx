import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Mic, MicOff, Quote, Search } from 'lucide-react'

const EXAMPLES = [
  'Find me a direct flight from Bengaluru to Mumbai under ₹8,000.',
  'Cheapest flight from Mumbai to Bengaluru, I do not mind a stop.',
  'Morning flight from Bengaluru to Delhi, budget ₹7,000.',
  'Fastest direct flight from Delhi to Mumbai in the evening.',
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
      setError('Please describe the flight you need, for example: a direct flight from Bengaluru to Mumbai under 8,000 rupees.')
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
    <>
      <section className="card stack" aria-labelledby="entry-heading">
        <p className="eyebrow">Step 1 of 5 &middot; Your request</p>
        <h1 id="entry-heading">Tell SIGHTLINE what you need, in your own words.</h1>
        <p className="lede">
          SIGHTLINE turns a complicated booking website into one guided question at a time. You say what you want,
          it explains the options in plain language, and you stay in control of every decision.
        </p>
        <p className="field__hint">
          SIGHTLINE works alongside your screen reader and other assistive tools. It does not replace them.
        </p>
      </section>

      <section className="card stack" aria-labelledby="request-heading">
        <h2 id="request-heading">Describe your flight</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="stack">
            <div className="field">
              <label className="field__label" htmlFor="request-input">
                What flight do you need?
              </label>
              <p className="field__hint" id="request-hint">
                Include where you are flying from and to. You can also add a budget, a time of day, or say
                &ldquo;direct&rdquo;. Anything you leave out gets a sensible default that you can change on the next
                screen.
              </p>
              <textarea
                id="request-input"
                ref={inputRef}
                className="textarea"
                value={text}
                onChange={(event) => setText(event.target.value)}
                aria-describedby={error ? 'request-hint request-error' : 'request-hint'}
                aria-invalid={error ? 'true' : undefined}
                placeholder="Find me a direct flight from Bengaluru to Mumbai under 8,000 rupees"
                rows={3}
              />
              {error && (
                <p className="field__error" id="request-error">
                  <span aria-hidden="true">&#9888;</span> {error}
                </p>
              )}
            </div>

            <div className="actions">
              <button type="submit" className="btn btn-primary">
                <Search size={20} aria-hidden="true" />
                Understand my request
                <ArrowRight size={20} aria-hidden="true" />
              </button>
              {voiceSupported && (
                <button type="button" className="btn btn-secondary" onClick={toggleVoice} aria-pressed={listening}>
                  {listening ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
                  {listening ? 'Stop listening' : 'Speak instead of typing'}
                </button>
              )}
            </div>
            <p aria-live="polite" className="field__hint">
              {voiceNote}
            </p>
          </div>
        </form>
      </section>

      <section className="card stack" aria-labelledby="examples-heading">
        <h2 id="examples-heading">Or start from an example</h2>
        <p className="field__hint">
          Choosing an example fills in the box above. You can edit it before searching.
        </p>
        <ul className="examples">
          {EXAMPLES.map((example) => (
            <li key={example}>
              <button type="button" className="example-btn" onClick={() => applyExample(example)}>
                <Quote size={18} aria-hidden="true" color="#0a6a5b" style={{ flex: 'none' }} />
                <span>{example}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
