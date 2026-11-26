import { useState } from 'react'
import { ChevronDown, Compass, Sparkles, Volume2 } from 'lucide-react'
import type { AssistContent } from '../lib/assist'
import { useVoice } from './VoiceProvider'

/**
 * The two contextual actions that appear at every stage: a full explanation of
 * the current screen, and what the user can do next. Both are shown as text in
 * the companion and spoken aloud when the browser supports it.
 */
function AssistActions() {
  const voice = useVoice()
  return (
    <div className="assist__actions">
      <button
        type="button"
        className="ask"
        onClick={() => {
          voice.setOpen(true)
          voice.explainCurrentScreen()
        }}
      >
        <Sparkles size={14} aria-hidden="true" />
        Explain this screen
      </button>
      <button
        type="button"
        className="ask"
        onClick={() => {
          voice.setOpen(true)
          voice.describeNextSteps()
        }}
      >
        <Volume2 size={14} aria-hidden="true" />
        What can I do here?
      </button>
    </div>
  )
}

interface Props {
  content: AssistContent
  /** Landing-page variant: the same content, laid out as an editorial row. */
  inline?: boolean
}

function Questions({ content, idPrefix }: { content: AssistContent; idPrefix: string }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (content.questions.length === 0) return null

  return (
    <div>
      <h3 className="assist__section-title">Common questions</h3>
      {content.questions.map((item) => {
        const open = openId === item.id
        const answerId = `${idPrefix}-answer-${item.id}`
        return (
          <div className="assist__q" key={item.id}>
            <button
              type="button"
              className="assist__qbtn"
              aria-expanded={open}
              aria-controls={answerId}
              onClick={() => setOpenId(open ? null : item.id)}
            >
              <span>{item.question}</span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {open && (
              <p className="assist__a" id={answerId}>
                {item.answer}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AssistPanel({ content, inline = false }: Props) {
  if (inline) {
    return (
      <section className="inline-assist" aria-labelledby="assist-inline-heading">
        <div className="inline-assist__head">
          <p className="eyebrow">Guided help</p>
          <h2 id="assist-inline-heading">{content.heading}</h2>
          <p className="fine">{content.nextAction}</p>
          <AssistActions />
        </div>

        <ul className="triptych">
          {content.points.map((point, index) => (
            <li className="triptych__item" key={point}>
              <span className="triptych__num num" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p>{point}</p>
            </li>
          ))}
        </ul>

        <div className="inline-assist__questions">
          <Questions content={content} idPrefix="assist-inline" />
        </div>
      </section>
    )
  }

  return (
    <aside className="assist" aria-labelledby="assist-heading">
      <div className="assist__head">
        <Compass size={16} aria-hidden="true" />
        <h2 className="assist__title" id="assist-heading">
          Guided help
        </h2>
      </div>

      <div className="assist__next">
        <p className="mono mono--accent">What to do next</p>
        <p>{content.nextAction}</p>
        <AssistActions />
      </div>

      <div>
        <h3 className="assist__section-title">{content.heading}</h3>
        <ul className="assist__points">
          {content.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <Questions content={content} idPrefix="assist" />
    </aside>
  )
}
