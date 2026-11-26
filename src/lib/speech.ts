/**
 * Thin wrappers over the browser's built-in speech APIs.
 *
 * Nothing here calls a network service: SIGHTLINE uses `speechSynthesis` and
 * `SpeechRecognition` exactly as the browser provides them, and every helper
 * reports honestly when the browser does not support a capability.
 */

export interface RecognitionAlternative {
  transcript: string
}

export interface RecognitionResult extends ArrayLike<RecognitionAlternative> {
  isFinal: boolean
}

export interface RecognitionEvent {
  resultIndex: number
  results: ArrayLike<RecognitionResult>
}

export interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type RecognitionCtor = new () => SpeechRecognitionLike

export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function recognitionSupported(): boolean {
  return getRecognitionCtor() !== null
}

export function synthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function createRecognition(options: {
  interim: boolean
  lang?: string
}): SpeechRecognitionLike | null {
  const Ctor = getRecognitionCtor()
  if (!Ctor) return null
  const recognition = new Ctor()
  recognition.lang = options.lang ?? 'en-IN'
  recognition.interimResults = options.interim
  recognition.continuous = false
  recognition.maxAlternatives = 1
  return recognition
}

/** Prefers an English voice, favouring Indian then British then any English. */
export function pickVoice(): SpeechSynthesisVoice | null {
  if (!synthesisSupported()) return null
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  const byLang = (prefix: string) => voices.find((v) => v.lang?.toLowerCase().startsWith(prefix))
  return byLang('en-in') ?? byLang('en-gb') ?? byLang('en-us') ?? byLang('en') ?? voices[0]
}

export function cancelSpeech(): void {
  if (!synthesisSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // Cancelling can throw if synthesis was never started; nothing to clean up.
  }
}

/** A readable, human-friendly rendering of a message for the error state. */
export function describeRecognitionError(code: string | undefined): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow the microphone in your browser settings, or carry on using the buttons and the keyboard — everything here works without voice.'
    case 'no-speech':
      return 'I did not hear anything. Choose Start listening and try again, or use the buttons on screen.'
    case 'audio-capture':
      return 'No microphone was found. You can still use every part of SIGHTLINE with the keyboard and the buttons.'
    case 'network':
      return 'Speech recognition needs a network connection in this browser and could not reach it. Typing and the buttons still work.'
    case 'aborted':
      return 'Listening stopped.'
    default:
      return 'Speech recognition stopped unexpectedly. You can try again, or use the buttons and the keyboard instead.'
  }
}
