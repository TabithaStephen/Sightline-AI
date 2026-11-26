import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react'
import { useVoice } from '../components/VoiceProvider'
import { DEMO_SCRIPT, type DemoContext, type DemoStep } from './script'
import { drivers } from './drivers'

type Phase = 'idle' | 'listening' | 'processing' | 'speaking'

interface Props {
  running: boolean
  onExit: () => void
}

/**
 * Runs the Guided Demo as a cancellable async sequence.
 *
 * The demo is silent by design: the presenter narrates it. Nothing here calls
 * speech synthesis, opens the microphone or plays a sound, and no step waits on
 * a speech callback — pacing comes from the animation itself, so the demo can
 * never stall on an audio API.
 */
export default function DemoController({ running, onExit }: Props) {
  const voice = useVoice()
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [paused, setPaused] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [caption, setCaption] = useState('')
  const [runKey, setRunKey] = useState(0)

  // The voice api object is rebuilt on every provider render, so the runner
  // reaches it through a ref. Depending on it directly would restart the loop.
  const voiceRef = useRef(voice)
  voiceRef.current = voice

  const tokenRef = useRef(0)
  const pausedRef = useRef(false)
  /** Resolves the current wait early, for Skip step and Exit. */
  const interruptRef = useRef<(() => void) | null>(null)
  /** Set while a step is being skipped so its remaining work bails out. */
  const skippedRef = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)

  pausedRef.current = paused

  const total = DEMO_SCRIPT.length
  const current: DemoStep | undefined = DEMO_SCRIPT[index]

  /** A sleep that resolves early on skip or exit, and never while paused. */
  const sleep = useCallback(
    (ms: number, token: number) =>
      new Promise<void>((resolve) => {
        if (tokenRef.current !== token) return resolve()
        const timer = window.setTimeout(() => {
          interruptRef.current = null
          resolve()
        }, ms)
        interruptRef.current = () => {
          window.clearTimeout(timer)
          resolve()
        }
      }),
    [],
  )

  const waitWhilePaused = useCallback(
    async (token: number) => {
      while (pausedRef.current && tokenRef.current === token && !skippedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 120))
      }
    },
    [],
  )

  // The run loop. A new token invalidates any loop still in flight.
  useEffect(() => {
    if (!running) return
    tokenRef.current += 1
    const token = tokenRef.current

    // Nothing in the demo makes a sound.
    voiceRef.current.setDemoSilent(true)

    async function run() {
      for (let i = 0; i < DEMO_SCRIPT.length; i++) {
        if (tokenRef.current !== token) return
        skippedRef.current = false
        setIndex(i)
        setTranscript('')
        setPhase('idle')

        const cancelled = () => tokenRef.current !== token || skippedRef.current

        const ctx: DemoContext = {
          caption: (text) => {
            if (!cancelled()) setCaption(text)
          },
          phase: (next) => {
            if (!cancelled()) setPhase(next)
          },
          transcript: (text) => {
            if (!cancelled()) setTranscript(text)
          },
          cancelled,
          hold: async (ms) => {
            await waitWhilePaused(token)
            if (cancelled()) return
            await sleep(ms, token)
          },
          // Typing is driven one character at a time, checking pause between
          // each: pausing stops mid-word and resuming carries on from there
          // rather than restarting the field.
          type: async (apply, text, speedMs = 45) => {
            for (let position = 1; position <= text.length; position += 1) {
              await waitWhilePaused(token)
              if (cancelled()) {
                // Leave the field complete rather than half-typed.
                apply(text)
                return
              }
              apply(text.slice(0, position))
              await sleep(speedMs, token)
            }
          },
        }

        await waitWhilePaused(token)
        if (tokenRef.current !== token) return

        try {
          await DEMO_SCRIPT[i].run(ctx)
        } catch {
          // A step that cannot run is skipped rather than stalling the demo.
        }

        if (tokenRef.current !== token) return
        setPhase('idle')
        await sleep(400, token)
      }

      if (tokenRef.current === token) {
        setPhase('idle')
        setIndex(DEMO_SCRIPT.length - 1)
      }
    }

    void run()
    return () => {
      tokenRef.current += 1
    }
  }, [running, runKey, sleep, waitWhilePaused])

  // The orb mirrors the demo's phases, silently.
  useEffect(() => {
    voiceRef.current.setDemoPhase(running ? phase : null)
  }, [phase, running])

  useEffect(
    () => () => {
      voiceRef.current.setDemoPhase(null)
      voiceRef.current.setDemoSilent(false)
    },
    [],
  )

  useEffect(() => {
    if (running) panelRef.current?.focus()
  }, [running])

  const skipStep = useCallback(() => {
    skippedRef.current = true
    interruptRef.current?.()
    interruptRef.current = null
  }, [])

  const handleExit = useCallback(() => {
    tokenRef.current += 1
    skippedRef.current = true
    interruptRef.current?.()
    interruptRef.current = null
    // Voice returns to normal the moment the demo ends.
    voiceRef.current.setDemoPhase(null)
    voiceRef.current.setDemoSilent(false)
    setPaused(false)
    setPhase('idle')
    setTranscript('')
    setCaption('')
    setIndex(0)
    // Demo data never stays behind in the user's own workflow.
    drivers.flight?.reset()
    drivers.student?.reset()
    drivers.setScenario?.('flight')
    onExit()
  }, [onExit])

  const restart = useCallback(() => {
    tokenRef.current += 1
    skippedRef.current = true
    interruptRef.current?.()
    interruptRef.current = null
    setPaused(false)
    setIndex(0)
    setTranscript('')
    setCaption('')
    setPhase('idle')
    drivers.setScenario?.('flight')
    drivers.flight?.reset()
    drivers.student?.reset()
    setRunKey((value) => value + 1)
  }, [])

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

  const progress = ((index + 1) / total) * 100

  return (
    <div className="demo-bar" role="region" aria-label="Guided demo controls" ref={panelRef} tabIndex={-1}>
      <div className="demo-bar__inner wrap">
        <div className="demo-bar__head">
          <p className="mono mono--accent">
            Guided demo <span aria-hidden="true">&mdash;</span> Act {current.act} of 2
            <span aria-hidden="true"> &middot; </span>
            <span className="demo-bar__silent">Silent</span>
          </p>
          <p className="mono">
            Step {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </p>
        </div>

        <div className="demo-bar__body">
          <div className="demo-bar__text">
            <p className="demo-bar__title">{current.title}</p>
            {transcript && (
              <p className="demo-bar__transcript">
                <span className="mono">Heard</span> &ldquo;{transcript}&rdquo;
              </p>
            )}
            {caption && <p className="demo-bar__caption">{caption}</p>}
            {paused && <p className="mono mono--accent">Paused</p>}
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
            <button type="button" className="btn btn--secondary btn--compact" onClick={skipStep}>
              <SkipForward size={15} aria-hidden="true" />
              Skip step
            </button>
            <button type="button" className="btn btn--secondary btn--compact" onClick={restart}>
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
