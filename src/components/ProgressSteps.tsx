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
    <nav aria-label="Booking progress">
      <ol className="rail__list">
        {STEPS.map((item, index) => {
          const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo'
          return (
            <li
              key={item.label}
              className={`rail__item rail__item--${state}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {state === 'done' ? (
                <Check size={13} aria-hidden="true" className="rail__icon" />
              ) : (
                <span className="rail__num num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
              )}
              <span className="rail__label">
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
