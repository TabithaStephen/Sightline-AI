import { Check } from 'lucide-react'
import type { Step } from '../types'

const STEPS: Array<{ key: Step[]; label: string }> = [
  { key: ['entry', 'interpret'], label: 'Your request' },
  { key: ['results'], label: 'Choose a flight' },
  { key: ['passenger'], label: 'Passenger details' },
  { key: ['review'], label: 'Review' },
  { key: ['confirmation'], label: 'Confirmed' },
]

export default function ProgressSteps({ step }: { step: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key.includes(step))

  return (
    <nav className="progress" aria-label="Booking progress">
      <ol className="progress__list">
        {STEPS.map((item, index) => {
          const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo'
          return (
            <li
              key={item.label}
              className={`progress__item progress__item--${state}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {state === 'done' ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <span className="progress__num" aria-hidden="true">
                  {index + 1}.
                </span>
              )}
              <span>
                {item.label}
                {state === 'done' && <span className="visually-hidden"> (completed)</span>}
                {state === 'current' && <span className="visually-hidden"> (current step)</span>}
                {state === 'todo' && <span className="visually-hidden"> (not started)</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
