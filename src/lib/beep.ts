/**
 * A short, soft confirmation tone played before SIGHTLINE starts listening.
 * Synthesised with the Web Audio API so there is no asset to load and nothing
 * to fetch. Silently does nothing if the browser has no audio context.
 */
let context: AudioContext | null = null

export function beep(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return resolve()
      context = context ?? new Ctor()
      if (context.state === 'suspended') void context.resume()

      const now = context.currentTime
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(660, now)
      osc.frequency.setValueAtTime(880, now + 0.09)
      // Gentle attack and release: a chime, not an alarm.
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
      osc.connect(gain).connect(context.destination)
      osc.start(now)
      osc.stop(now + 0.24)
      osc.onended = () => resolve()
      window.setTimeout(resolve, 300)
    } catch {
      resolve()
    }
  })
}
