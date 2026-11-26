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
  speak: (text: string) => void
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

  const canSpeak = useMemo(() => synthesisSupported(), [])
  const canListen = useMemo(() => recognitionSupported(), [])

  // The live application state, republished by App on every render. Kept in a
  // ref so speech callbacks always read the current screen, never a stale one.
  const inputRef = useRef<VoiceContextInput>(EMPTY_INPUT)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const dictationTargetRef = useRef<((text: string) => void) | null>(null)
  const lastSpokenRef = useRef('')
  const guidedRef = useRef(guided)
  const stepRef = useRef<string>('')


  /* ------------------------------------------------------------- Speaking */

  const stop = useCallback(() => {
    cancelSpeech()
    setStatus((current) => (current === 'speaking' || current === 'processing' ? 'idle' : current))
  }, [])

  const speak = useCallback(
    (text: string) => {
      const clean = text.trim()
      if (!clean) return
      lastSpokenRef.current = clean
      setCaption(clean)
      setError(null)

      if (!canSpeak) {
        // No synthesis in this browser: the caption is the whole response.
        setStatus('idle')
        return
      }

      // Never let two responses overlap.
      cancelSpeech()
      setStatus('processing')

      // Chrome drops an utterance queued in the same tick as cancel().
      window.setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(clean)
        const voice = pickVoice()
        if (voice) utterance.voice = voice
        utterance.rate = 1
        utterance.pitch = 1
        utterance.onstart = () => setStatus('speaking')
        utterance.onend = () => setStatus((c) => (c === 'speaking' || c === 'processing' ? 'idle' : c))
        utterance.onerror = () => setStatus((c) => (c === 'speaking' || c === 'processing' ? 'idle' : c))
        try {
          window.speechSynthesis.speak(utterance)
        } catch {
          setStatus('idle')
        }
      }, 60)
    },
    [canSpeak],
  )

  const replay = useCallback(() => {
    if (lastSpokenRef.current) speak(lastSpokenRef.current)
  }, [speak])

  /* ------------------------------------------------------- Narration verbs */

  const explainCurrentScreen = useCallback(() => speak(explainScreen(inputRef.current)), [speak])
  const describeNextSteps = useCallback(() => speak(describeNext(inputRef.current)), [speak])
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

      speak(
        `I did not recognise "${heard}" as a command. ${helpText(input)} I will never choose a flight, fill in your details or confirm a booking from speech on my own.`,
      )
    },
    [describeNextSteps, explainCurrentScreen, readFlightOptions, replay, speak, stop],
  )

  /* ------------------------------------------------------------ Listening */

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      // Already stopped.
    }
  }, [])

  const startRecognition = useCallback(
    (mode: 'command' | 'dictation') => {
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
      if (next) speak(`Guided mode on. ${stageIntro(inputRef.current)}`)
      else {
        stop()
        setCaption('Guided mode off.')
      }
    },
    [speak, stop],
  )

  useEffect(() => {
    guidedRef.current = guided
  }, [guided])

  // Called from an effect in the workflow after every render. Besides storing
  // the live state, it notices when the user has moved to a new stage: Guided
  // Mode then speaks one short, interruptible introduction. It never reads out
  // the whole screen on arrival.
  const publish = useCallback(
    (next: VoiceContextInput) => {
      inputRef.current = next
      if (stepRef.current === '') {
        stepRef.current = next.step
        return
      }
      if (stepRef.current === next.step) return
      stepRef.current = next.step
      if (guidedRef.current) speak(stageIntro(next))
    },
    [speak],
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
    status,
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
