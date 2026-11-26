import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react'
import { useVoice } from '../components/VoiceProvider'
import { DEMO_SCRIPT, type DemoStep } from './script'
import { drivers } from './drivers'

type Phase = 'idle' | 'listening' | 'processing' | 'speaking'

interface Props {
  running: boolean
  onExit: () => void
}

/**
 * Runs the Guided Demo as a cancellable async sequence rather than a chain of
 * fragile timers: each step awaits the one before it, and pause, skip, restart
 * and exit all resolve the pending wait immediately.
 */
export default function DemoController({ running, onExit }: Props) {
  const voice = useVoice()
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [paused, setPaused] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [runKey, setRunKey] = useState(0)

  // The voice api object is rebuilt on every provider render, so the runner
  // reaches it through a ref. Depending on it directly would restart the demo
  // loop on every render and cancel its own narration.
  const voiceRef = useRef(voice)
  voiceRef.current = voice

  const tokenRef = useRef(0)
  const pausedRef = useRef(false)
  const skipRef = useRef<(() => void) | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  pausedRef.current = paused

  const total = DEMO_SCRIPT.length
  const current: DemoStep | undefined = DEMO_SCRIPT[index]

  /** Resolves when unpaused, or immediately if the run was cancelled. */
  const waitWhilePaused = useCallback(async (token: number) => {
    while (pausedRef.current && tokenRef.current === token) {
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
  }, [])

  /** Speaks and resolves when finished, skipped, or after a safety timeout. */
  const speakAsync = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          skipRef.current = null
          window.clearTimeout(guard)
          resolve()
        }
        // Skip and exit both resolve the pending narration straight away.
        skipRef.current = finish
        // If speech synthesis never reports back, the demo still moves on.
        const guard = window.setTimeout(finish, Math.min(4000 + text.length * 70, 45000))
        voiceRef.current.speak(text, finish)
      }),
    [],
  )

  const sleep = useCallback(
    (ms: number, token: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          skipRef.current = null
          resolve()
        }, ms)
        skipRef.current = () => {
          window.clearTimeout(timer)
          resolve()
        }
        if (tokenRef.current !== token) {
          window.clearTimeout(timer)
          resolve()
        }
      }),
    [],
  )

  // The run loop. A new token invalidates any loop still in flight.
  useEffect(() => {
    if (!running) return
    tokenRef.current += 1
    const token = tokenRef.current
    let cancelled = false

    async function run() {
      for (let i = 0; i < DEMO_SCRIPT.length; i++) {
        if (tokenRef.current !== token || cancelled) return
        setIndex(i)
        const step = DEMO_SCRIPT[i]

        await waitWhilePaused(token)
        if (tokenRef.current !== token) return

        setPhase('processing')
        setTranscript('')
        try {
          await step.before?.()
        } catch {
          // A step that cannot set up is skipped rather than stalling the demo.
        }
        if (tokenRef.current !== token) return

        // A scripted utterance: the orb listens, then the words appear.
        if (step.transcript) {
          setPhase('listening')
          await sleep(1100, token)
          if (tokenRef.current !== token) return
          setTranscript(step.transcript)
          setPhase('processing')
          await sleep(650, token)
          if (tokenRef.current !== token) return
        }

        await waitWhilePaused(token)
        if (tokenRef.current !== token) return

        setPhase('speaking')
        let text = ''
        try {
          text = step.say()
        } catch {
          text = ''
        }
        if (text) await speakAsync(text)
        if (tokenRef.current !== token) return

        try {
          await step.after?.()
        } catch {
          // Same again: never let a failed transition freeze the demo.
        }

        setPhase('idle')
        await sleep(420, token)
      }

      if (tokenRef.current === token) {
        setPhase('idle')
        setIndex(DEMO_SCRIPT.length - 1)
      }
    }

    void run()
    return () => {
      cancelled = true
      tokenRef.current += 1
    }
  }, [running, runKey, sleep, speakAsync, waitWhilePaused])

  // Keep the companion's orb in step with the demo.
  useEffect(() => {
    voiceRef.current.setDemoPhase(running ? phase : null)
  }, [phase, running])

  useEffect(() => () => voiceRef.current.setDemoPhase(null), [])

  useEffect(() => {
    if (running) panelRef.current?.focus()
  }, [running])

  const handleExit = useCallback(() => {
    tokenRef.current += 1
    skipRef.current?.()
    skipRef.current = null
    voiceRef.current.stop()
    voiceRef.current.setDemoPhase(null)
    setPaused(false)
    setPhase('idle')
    setTranscript('')
    setIndex(0)
    // Demo data never stays behind in the user's own workflow.
    drivers.flight?.reset()
    drivers.student?.reset()
    drivers.setScenario?.('flight')
    onExit()
  }, [onExit])

  useEffect(() => {
    if (!running) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleExit()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleExit, running])

  if (!running || !current) return null

  const progress = ((index + (phase === 'idle' ? 1 : 0.5)) / total) * 100

  return (
    <div className="demo-bar" role="region" aria-label="Guided demo controls" ref={panelRef} tabIndex={-1}>
      <div className="demo-bar__inner wrap">
        <div className="demo-bar__head">
          <p className="mono mono--accent">
            Guided demo <span aria-hidden="true">&mdash;</span> Act {current.act} of 2
          </p>
          <p className="mono">
            Step {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </p>
        </div>

        <div className="demo-bar__body">
          <div className="demo-bar__text">
            <p className="demo-bar__title">{current.title}</p>
            <p className="fine">
              {phase === 'listening'
                ? 'Listening (simulated — no microphone is used)'
                : phase === 'processing'
                  ? 'Working out what to say from the screen'
                  : phase === 'speaking'
                    ? 'Narrating'
                    : 'Ready for the next step'}
            </p>
            {transcript && (
              <p className="demo-bar__transcript">
                <span className="mono">Heard</span> &ldquo;{transcript}&rdquo;
              </p>
            )}
          </div>

          <div className="demo-bar__controls">
            <button
              type="button"
              className="btn btn--secondary btn--compact"
              onClick={() => setPaused((value) => !value)}
              aria-pressed={paused}
            >
              {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--compact"
              onClick={() => {
                voice.stop()
                skipRef.current?.()
              }}
            >
              <SkipForward size={15} aria-hidden="true" />
              Skip step
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--compact"
              onClick={() => {
                tokenRef.current += 1
                voice.stop()
                skipRef.current?.()
                setPaused(false)
                setIndex(0)
                setTranscript('')
                drivers.setScenario?.('flight')
                drivers.flight?.reset()
                drivers.student?.reset()
                // Bumping the run key restarts the sequence from the top.
                setRunKey((value) => value + 1)
              }}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Restart
            </button>
            <button type="button" className="btn btn--primary btn--compact" onClick={handleExit}>
              <X size={15} aria-hidden="true" />
              Exit demo
            </button>
          </div>
        </div>

        <div
          className="demo-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-valuetext={`Step ${index + 1} of ${total}: ${current.title}`}
        >
          <span className="demo-progress__fill" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>
    </div>
  )
}
