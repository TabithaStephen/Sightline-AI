import { useState } from 'react'
import { ChevronDown, LifeBuoy } from 'lucide-react'
import type { AssistContent } from '../lib/assist'

export default function AssistPanel({ content }: { content: AssistContent }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <aside className="assist" aria-labelledby="assist-heading">
      <div className="assist__head">
        <LifeBuoy size={22} aria-hidden="true" color="#074e43" />
        <h2 id="assist-heading" style={{ fontSize: '1.15rem' }}>
          Guided help
        </h2>
      </div>

      <p className="assist__next">
        <span className="visually-hidden">What to do next: </span>
        {content.nextAction}
      </p>

      <div>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{content.heading}</h3>
        <ul className="assist__points">
          {content.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      {content.questions.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Common questions</h3>
          {content.questions.map((item) => {
            const open = openId === item.id
            return (
              <div className="assist__q" key={item.id}>
                <button
                  type="button"
                  className="assist__q-btn"
                  aria-expanded={open}
                  aria-controls={`assist-answer-${item.id}`}
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    size={20}
                    aria-hidden="true"
                    style={{ flex: 'none', transform: open ? 'rotate(180deg)' : 'none' }}
                  />
                </button>
                {open && (
                  <p className="assist__a" id={`assist-answer-${item.id}`}>
                    {item.answer}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
