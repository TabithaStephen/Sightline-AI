import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  cancelSpeech,
  createRecognition,
  describeRecognitionError,
  pickVoice,
  recognitionSupported,
  synthesisSupported,
  type SpeechRecognitionLike,
} from '../lib/speech'
import { beep } from '../lib/beep'
import {
  answerChoiceQuestion,
  describeNext,
  explainScreen,
  helpText,
  readOptions,
  stageIntro,
  type NarrationInput,
} from '../lib/narrate'

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'

/** What the companion is allowed to do on the current screen. */
export interface VoiceActions {
  onBack?: () => void
  backLabel?: string
  onContinue?: () => void
  continueLabel?: string
  /** Why Continue is unavailable, so the companion can explain instead of failing silently. */
  continueBlockedReason?: string
}

export type VoiceContextInput = NarrationInput & VoiceActions

/**
 * A second workflow can take over the companion's narration while it is on
 * screen, so "explain this screen" always describes the task the user is in.
 */
export interface NarrationOverride {
  explain: () => string
  next: () => string
  intro: () => string
  stageKey: () => string
}

interface VoiceApi {
  status: VoiceStatus
  open: boolean
  guided: boolean
  transcript: string
  caption: string
  lastHeard: string
  error: string | null
  canSpeak: boolean
  canListen: boolean
  setOpen: (open: boolean) => void
  setGuided: (guided: boolean) => void
  speak: (text: string, onDone?: () => void) => void
  /** Speaks, chimes, then opens the microphone. Used by Guided Mode. */
  speakThenListen: (text: string) => void
  /** Speaks only if this key was not the last thing said, to avoid repeats. */
  speakOnce: (key: string, text: string) => void
  stop: () => void
  replay: () => void
  toggleListening: () => void
  explainCurrentScreen: () => void
  describeNextSteps: () => void
  readFlightOptions: () => void
  answerChoice: (id: 'cheapest' | 'fastest' | 'stops' | 'tradeoff' | 'recommended') => string
  /** Dictation into a form field. Never submits anything. */
  dictate: (onText: (text: string) => void) => void
  dictatingInto: string | null
  setDictatingInto: (id: string | null) => void
  publish: (input: VoiceContextInput) => void
  setNarrationOverride: (override: NarrationOverride | null) => void
  /** Lets the Guided Demo drive the orb's state directly. */
  setDemoPhase: (phase: VoiceStatus | null) => void
  /**
   * Silences the companion for the Guided Demo. While this is on, nothing
   * reaches speech synthesis, no chime plays and the microphone is never
   * opened — captions still update so the screen keeps explaining itself.
   * It is scoped to the demo and restored the moment the demo exits.
   */
  setDemoSilent: (silent: boolean) => void
  /** Tells the companion a new stage has been reached, in any workflow. */
  notifyStage: (key: string) => void
  /**
   * Lets the screen in focus claim speech that is not a command, so a spoken
   * answer can fill the field the user is on. Returns a confirmation sentence,
   * or null to let the companion treat it as an unknown command.
   */
  setSpeechSink: (sink: ((text: string) => string | null) | null) => void
}

const VoiceCtx = createContext<VoiceApi | null>(null)

export function useVoice(): VoiceApi {
  const ctx = useContext(VoiceCtx)
  if (!ctx) throw new Error('useVoice must be used inside VoiceProvider')
  return ctx
}

const EMPTY_INPUT: VoiceContextInput = {
  step: 'entry',
  request: null,
  result: null,
  selected: null,
  compared: [],
  passenger: { fullName: '', email: '', phone: '' },
  bookingRef: null,
}

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [open, setOpenState] = useState(false)
  const [guided, setGuidedState] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [lastHeard, setLastHeard] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dictatingInto, setDictatingInto] = useState<string | null>(null)
  const [demoPhase, setDemoPhase] = useState<VoiceStatus | null>(null)
  const silentRef = useRef(false)

  const canSpeak = useMemo(() => synthesisSupported(), [])
  const canListen = useMemo(() => recognitionSupported(), [])

  // The live application state, republished by App on every render. Kept in a
  // ref so speech callbacks always read the current screen, never a stale one.
  const inputRef = useRef<VoiceContextInput>(EMPTY_INPUT)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const dictationTargetRef = useRef<((text: string) => void) | null>(null)
  const lastSpokenRef = useRef('')
  const lastKeyRef = useRef('')
  const speechSeq = useRef(0)
  const sinkRef = useRef<((text: string) => string | null) | null>(null)
  const overrideRef = useRef<NarrationOverride | null>(null)
  const guidedRef = useRef(guided)
  const stepRef = useRef<string>('')


  /* ------------------------------------------------------------- Speaking */

  const stop = useCallback(() => {
    // Bumping the sequence cancels any queued follow-up (the chime, the
    // listening prompt, the next demo step) along with the speech itself.
    speechSeq.current += 1
    cancelSpeech()
    setStatus((current) => (current === 'speaking' || current === 'processing' ? 'idle' : current))
  }, [])

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      const clean = text.trim()
      if (!clean) return
      lastSpokenRef.current = clean
      setCaption(clean)
      setError(null)

      // Never let two responses overlap: a new one always cancels the old.
      speechSeq.current += 1
      const seq = speechSeq.current
      const finish = () => {
        if (speechSeq.current !== seq) return
        setStatus((c) => (c === 'speaking' || c === 'processing' ? 'idle' : c))
        onDone?.()
      }

      if (silentRef.current) {
        // Guided Demo: the caption is the whole response. Nothing is spoken.
        setStatus('idle')
        window.setTimeout(finish, 0)
        return
      }

      if (!canSpeak) {
        // No synthesis in this browser: the caption carries the whole response,
        // and anything chained after it still runs so nothing can get stuck.
        setStatus('idle')
        window.setTimeout(finish, Math.min(600 + clean.length * 22, 9000))
        return
      }

      cancelSpeech()
      setStatus('processing')

      // Chrome drops an utterance queued in the same tick as cancel().
      window.setTimeout(() => {
        if (speechSeq.current !== seq) return
        const utterance = new SpeechSynthesisUtterance(clean)
        const voice = pickVoice()
        if (voice) utterance.voice = voice
        utterance.rate = 1
        utterance.pitch = 1
        utterance.onstart = () => {
          if (speechSeq.current === seq) setStatus('speaking')
        }
        utterance.onend = finish
        utterance.onerror = finish
        try {
          window.speechSynthesis.speak(utterance)
        } catch {
          finish()
        }
      }, 60)
    },
    [canSpeak],
  )

  const speakOnce = useCallback(
    (key: string, text: string) => {
      if (lastKeyRef.current === key) return
      lastKeyRef.current = key
      speak(text)
    },
    [speak],
  )

  const replay = useCallback(() => {
    if (lastSpokenRef.current) speak(lastSpokenRef.current)
  }, [speak])

  /* ------------------------------------------------------- Narration verbs */

  const explainCurrentScreen = useCallback(
    () => speak(overrideRef.current ? overrideRef.current.explain() : explainScreen(inputRef.current)),
    [speak],
  )
  const describeNextSteps = useCallback(
    () => speak(overrideRef.current ? overrideRef.current.next() : describeNext(inputRef.current)),
    [speak],
  )
  const readFlightOptions = useCallback(() => {
    const input = inputRef.current
    if (input.step !== 'results') {
      speak('There is no flight list on this screen. Flight options are on the choose a flight step.')
      return
    }
    speak(readOptions(input.result))
  }, [speak])

  const answerChoice = useCallback(
    (id: 'cheapest' | 'fastest' | 'stops' | 'tradeoff' | 'recommended') => {
      const text = answerChoiceQuestion(id, inputRef.current.result, inputRef.current.request)
      speak(text)
      return text
    },
    [speak],
  )

  /* ------------------------------------------------------------- Commands */

  const runCommand = useCallback(
    (heard: string) => {
      const text = heard.toLowerCase().trim()
      const input = inputRef.current

      const has = (...needles: string[]) => needles.some((n) => text.includes(n))

      if (has('stop speaking', 'be quiet', 'stop talking')) {
        stop()
        setCaption('Stopped.')
        return
      }
      if (has('repeat', 'say that again', 'again please')) {
        if (lastSpokenRef.current) replay()
        else speak('I have not said anything yet on this screen.')
        return
      }
      if (has('explain this screen', 'explain the screen', 'explain this page', 'where am i', 'what is this')) {
        explainCurrentScreen()
        return
      }
      if (has('what can i do', 'what are my options', 'what next', "what's next", 'next step')) {
        describeNextSteps()
        return
      }
      if (has('help', 'what can you do', 'commands')) {
        speak(helpText(input))
        return
      }
      if (has('read the options', 'read options', 'read the flights', 'list the flights', 'read the list')) {
        readFlightOptions()
        return
      }
      if (has('cheapest', 'lowest price')) {
        speak(answerChoiceQuestion('cheapest', input.result, input.request))
        return
      }
      if (has('fastest', 'quickest', 'shortest')) {
        speak(answerChoiceQuestion('fastest', input.result, input.request))
        return
      }
      if (has('fewest stops', 'direct', 'stops')) {
        speak(answerChoiceQuestion('stops', input.result, input.request))
        return
      }
      if (has('trade-off', 'trade off', 'tradeoff', 'difference between', 'why would i choose', 'sacrific')) {
        speak(answerChoiceQuestion('tradeoff', input.result, input.request))
        return
      }
      if (has('why is it recommended', 'why recommended', 'why this one')) {
        speak(answerChoiceQuestion('recommended', input.result, input.request))
        return
      }
      if (has('go back', 'previous', 'back')) {
        if (input.onBack) {
          speak(`Going back to ${input.backLabel ?? 'the previous step'}.`)
          input.onBack()
        } else {
          speak('There is no step to go back to from here.')
        }
        return
      }
      if (has('continue', 'next screen', 'carry on', 'proceed')) {
        if (input.onContinue) {
          speak(`Continuing to ${input.continueLabel ?? 'the next step'}.`)
          input.onContinue()
        } else {
          speak(
            input.continueBlockedReason ??
              'There is nothing to continue to from here. Say what can I do here to hear the available actions.',
          )
        }
        return
      }
      if (has('guided mode off', 'turn off guided', 'disable guided')) {
        setGuidedState(false)
        speak('Guided mode is off.')
        return
      }
      if (has('guided mode on', 'turn on guided', 'enable guided', 'guided mode')) {
        setGuidedState(true)
        speak('Guided mode is on. I will introduce each step as you reach it.')
        return
      }

      // Not a command: offer it to the screen in focus, so a spoken answer can
      // fill the field the user is on. Filling a field is never consequential —
      // nothing is submitted or confirmed by speech.
      const claimed = sinkRef.current?.(heard)
      if (claimed) {
        speak(claimed)
        return
      }

      speak(
        `I did not recognise "${heard}" as a command. ${helpText(input)} I will never choose a flight, fill in your details or confirm a booking from speech on my own.`,
      )
    },
    [describeNextSteps, explainCurrentScreen, readFlightOptions, replay, speak, stop],
  )

  /* ------------------------------------------------------------ Listening */

  const startRecognitionRef = useRef<((mode: 'command' | 'dictation') => void) | null>(null)

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      // Already stopped.
    }
  }, [])

  const startRecognition = useCallback(
    (mode: 'command' | 'dictation') => {
      if (silentRef.current) return
      if (!canListen) {
        setError(
          'This browser does not support speech input. Everything in SIGHTLINE works with the keyboard and the buttons.',
        )
        setStatus('error')
        return
      }
      // Speaking over our own microphone confuses recognition.
      cancelSpeech()

      const recognition = createRecognition({ interim: true })
      if (!recognition) return
      recognitionRef.current = recognition
      setTranscript('')
      setError(null)

      recognition.onstart = () => setStatus('listening')

      recognition.onresult = (event) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result[0]?.transcript ?? ''
          if (result.isFinal) final += text
          else interim += text
        }
        setTranscript(final || interim)
        if (!final) return

        const heard = final.trim()
        setLastHeard(heard)
        setTranscript('')
        setStatus('processing')

        if (mode === 'dictation') {
          const target = dictationTargetRef.current
          dictationTargetRef.current = null
          setDictatingInto(null)
          if (target) target(heard)
          // Dictation only fills the field. It never submits the form.
          setStatus('idle')
          return
        }
        runCommand(heard)
      }

      recognition.onerror = (event) => {
        const message = describeRecognitionError(event?.error)
        dictationTargetRef.current = null
        setDictatingInto(null)
        if (event?.error === 'aborted') {
          setStatus('idle')
          return
        }
        setError(message)
        setStatus('error')
        setCaption(message)
      }

      recognition.onend = () => {
        recognitionRef.current = null
        setTranscript('')
        setStatus((current) => (current === 'listening' ? 'idle' : current))
      }

      try {
        recognition.start()
      } catch {
        setError('Speech input could not be started. Try again, or use the buttons and the keyboard.')
        setStatus('error')
      }
    },
    [canListen, runCommand],
  )

  useEffect(() => {
    startRecognitionRef.current = startRecognition
  }, [startRecognition])

  const toggleListening = useCallback(() => {
    if (status === 'listening') {
      stopListening()
      return
    }
    startRecognition('command')
  }, [startRecognition, status, stopListening])

  const dictate = useCallback(
    (onText: (text: string) => void) => {
      dictationTargetRef.current = onText
      startRecognition('dictation')
    },
    [startRecognition],
  )

  const setSpeechSink = useCallback((sink: ((text: string) => string | null) | null) => {
    sinkRef.current = sink
  }, [])

  const setDemoSilent = useCallback((silent: boolean) => {
    silentRef.current = silent
    if (silent) {
      // Anything already in flight stops immediately when the demo starts.
      speechSeq.current += 1
      cancelSpeech()
      try {
        recognitionRef.current?.abort()
      } catch {
        // Nothing was listening.
      }
      setStatus('idle')
    }
  }, [])

  const setNarrationOverride = useCallback((override: NarrationOverride | null) => {
    overrideRef.current = override
    // Force the next stage notification to be treated as a change, so moving
    // between workflows always re-introduces where the user has landed.
    stepRef.current = ''
  }, [])

  /**
   * The Guided Mode rhythm: explain, chime, invite, then open the microphone.
   * Every link in the chain is cancelled by Stop speaking, and if speech input
   * is unavailable it says so and leaves the microphone button to the user.
   */
  const speakThenListen = useCallback(
    (text: string) => {
      if (silentRef.current) {
        // Guided Demo: caption only, and the microphone stays closed.
        speak(text)
        return
      }
      if (!canListen) {
        speak(
          `${text} Speech input is not available in this browser, so use the buttons or the keyboard — or the microphone button if you enable it.`,
        )
        return
      }
      speak(text, () => {
        void beep().then(() => {
          speak("You can speak now. Tell me what you'd like to do, and I'll help you fill in the details.", () => {
            startRecognitionRef.current?.('command')
          })
        })
      })
    },
    [canListen, speak],
  )

  /* -------------------------------------------------------- Panel + guided */

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next)
      if (!next) {
        stopListening()
        stop()
      }
    },
    [stop, stopListening],
  )

  const setGuided = useCallback(
    (next: boolean) => {
      setGuidedState(next)
      if (next) {
        const override = overrideRef.current
        speakThenListen(
          `Guided mode on. ${override ? `${override.intro()} ${override.next()}` : `${stageIntro(inputRef.current)} ${describeNext(inputRef.current)}`}`,
        )
      }
      else {
        stop()
        setCaption('Guided mode off.')
      }
    },
    [speakThenListen, stop],
  )

  useEffect(() => {
    guidedRef.current = guided
  }, [guided])

  // Called from an effect in the workflow after every render. Besides storing
  // the live state, it notices when the user has moved to a new stage: Guided
  // Mode then speaks one short, interruptible introduction. It never reads out
  // the whole screen on arrival.
  const notifyStage = useCallback(
    (key: string) => {
      if (stepRef.current === key) return
      const first = stepRef.current === ''
      stepRef.current = key
      lastKeyRef.current = ''
      if (first || !guidedRef.current) return
      const override = overrideRef.current
      const text = override
        ? `${override.intro()} ${override.next()}`
        : `${stageIntro(inputRef.current)} ${describeNext(inputRef.current)}`
      speakThenListen(text)
    },
    [speakThenListen],
  )

  const publish = useCallback(
    (next: VoiceContextInput) => {
      inputRef.current = next
      // While another workflow owns the narration, its own stage notifications
      // drive Guided Mode; the flight step underneath must stay quiet.
      if (overrideRef.current) return
      notifyStage(next.step)
    },
    [notifyStage],
  )

  // Stop any speech when the page is closed or hidden.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') cancelSpeech()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', cancelSpeech)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', cancelSpeech)
      cancelSpeech()
    }
  }, [])

  const api: VoiceApi = {
    // During the Guided Demo the orb follows the demo's own phases.
    status: demoPhase ?? status,
    open,
    guided,
    transcript,
    caption,
    lastHeard,
    error,
    canSpeak,
    canListen,
    setOpen,
    setGuided,
    speak,
    speakThenListen,
    speakOnce,
    stop,
    replay,
    toggleListening,
    explainCurrentScreen,
    describeNextSteps,
    readFlightOptions,
    answerChoice,
    dictate,
    dictatingInto,
    setDictatingInto,
    publish,
    setSpeechSink,
    setNarrationOverride,
    notifyStage,
    setDemoPhase,
    setDemoSilent,
  }

  return <VoiceCtx.Provider value={api}>{children}</VoiceCtx.Provider>
}

/**
 * Republishes live application state to the companion after every render, so
 * spoken answers always describe the screen the user is actually on.
 */
export function usePublishVoiceContext(input: VoiceContextInput) {
  const { publish } = useVoice()
  useEffect(() => {
    publish(input)
  })
}
