import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CircleAlert, Mic, Pencil, RotateCcw, Volume2 } from 'lucide-react'
import { useVoice } from '../components/VoiceProvider'
import {
  DEFAULT_DOCUMENTS,
  EMPTY_APPLICATION,
  STAGE_LABEL,
  STAGE_ORDER,
  assistanceBand,
  stageById,
  validateStage,
  type DocumentItem,
  type StudentApplication,
  type StudentFieldKey,
  type StudentStageId,
} from './data'
import { studentErrorSummary, studentExplainScreen, studentNextSteps, studentStageIntro } from './narrate'

export interface StudentDriver {
  reset: () => void
  setStage: (stage: StudentStageId) => void
  setFields: (patch: Partial<StudentApplication>) => void
  /** One field at a time, so the demo can type into it visibly. */
  setField: (key: StudentFieldKey, value: string) => void
  setDocument: (id: string, provided: boolean) => void
  submitStage: () => void
  submitApplication: () => void
  getState: () => { stage: StudentStageId; app: StudentApplication; documents: DocumentItem[] }
}

interface Props {
  onAnnounce: (message: string) => void
  registerDriver?: (driver: StudentDriver | null) => void
}

function makeReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `SA-${code}`
}

export default function StudentWorkflow({ onAnnounce, registerDriver }: Props) {
  const [stage, setStage] = useState<StudentStageId>('personal')
  const [app, setApp] = useState<StudentApplication>(EMPTY_APPLICATION)
  const [documents, setDocuments] = useState<DocumentItem[]>(DEFAULT_DOCUMENTS)
  const [errors, setErrors] = useState<Partial<Record<StudentFieldKey, string>>>({})
  const [focused, setFocused] = useState<StudentFieldKey | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const voice = useVoice()
  const mainRef = useRef<HTMLDivElement>(null)

  const definition = stageById(stage)
  const index = STAGE_ORDER.indexOf(stage)

  const stateRef = useRef({ stage, app, documents })
  stateRef.current = { stage, app, documents }
  const focusedRef = useRef<StudentFieldKey | null>(null)
  focusedRef.current = focused

  function patch(next: Partial<StudentApplication>) {
    setApp((current) => ({ ...current, ...next }))
    setErrors((current) => {
      const cleaned = { ...current }
      for (const key of Object.keys(next) as StudentFieldKey[]) delete cleaned[key]
      return cleaned
    })
  }

  function goTo(nextStage: StudentStageId) {
    setStage(nextStage)
    setErrors({})
    setFocused(null)
    onAnnounce(`${STAGE_LABEL[nextStage]}. ${studentNextSteps({ stage: nextStage, app, documents, reference })}`)
  }

  /** Checks only the current section, then moves on. Never submits. */
  function handleContinue() {
    if (definition) {
      const found = validateStage(definition, app)
      setErrors(found)
      if (Object.keys(found).length > 0) {
        const entries = Object.entries(found) as Array<[StudentFieldKey, string]>
        voice.speak(studentErrorSummary(entries, app))
        onAnnounce(`${entries.length} fields need attention on this screen.`)
        return
      }
    }
    goTo(STAGE_ORDER[Math.min(index + 1, STAGE_ORDER.length - 1)])
  }

  function handleSubmit() {
    const code = makeReference()
    setReference(code)
    setStage('complete')
    onAnnounce(`Simulated application complete. Reference ${code}. Nothing was submitted anywhere.`)
  }

  function handleReset() {
    setStage('personal')
    setApp(EMPTY_APPLICATION)
    setDocuments(DEFAULT_DOCUMENTS)
    setErrors({})
    setFocused(null)
    setReference(null)
    onAnnounce('Starting a new simulated application.')
  }

  // Spoken answers fill the field in focus. Nothing is ever submitted by voice.
  useEffect(() => {
    voice.setSpeechSink((text) => {
      const key = focusedRef.current
      if (!key) return null
      const value =
        key === 'email'
          ? text.replace(/\s+at\s+/gi, '@').replace(/\s+dot\s+/gi, '.').replace(/\s+/g, '')
          : key === 'phone' || key === 'annualIncome'
            ? text.replace(/\D/g, '')
            : text
      patch({ [key]: value } as Partial<StudentApplication>)
      return `I heard "${text}". I have put ${value} in the ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} field. Check it before you continue — I will not submit the application for you.`
    })
    return () => voice.setSpeechSink(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice])

  useEffect(() => {
    registerDriver?.({
      reset: handleReset,
      setStage: (next) => goTo(next),
      setFields: (next) => patch(next),
      setField: (key, value) => patch({ [key]: value } as Partial<StudentApplication>),
      setDocument: (id, provided) =>
        setDocuments((current) => current.map((item) => (item.id === id ? { ...item, provided } : item))),
      submitStage: handleContinue,
      submitApplication: handleSubmit,
      getState: () => stateRef.current,
    })
    return () => registerDriver?.(null)
  })

  const narration = { stage, app, documents, reference }

  function field(key: StudentFieldKey) {
    const spec = definition?.fields.find((item) => item.key === key)
    if (!spec) return null
    const error = errors[key]
    return (
      <div className="field" key={key}>
        <label className="field__label" htmlFor={`student-${key}`}>
          {spec.label}
          <span className="chip" aria-hidden="true">
            Required
          </span>
          <span className="visually-hidden">(required)</span>
        </label>
        <p className="field__hint" id={`student-${key}-hint`}>
          {spec.hint}
        </p>
        {spec.type === 'select' ? (
          <select
            id={`student-${key}`}
            className="select"
            value={app[key]}
            aria-describedby={error ? `student-${key}-hint student-${key}-error` : `student-${key}-hint`}
            aria-invalid={error ? 'true' : undefined}
            onFocus={() => {
              setFocused(key)
              if (voice.guided) voice.speakOnce(`student:${key}`, spec.help)
            }}
            onChange={(event) => patch({ [key]: event.target.value } as Partial<StudentApplication>)}
          >
            <option value="">Choose an option</option>
            {spec.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={`student-${key}`}
            className="input"
            type={spec.type}
            value={app[key]}
            aria-describedby={error ? `student-${key}-hint student-${key}-error` : `student-${key}-hint`}
            aria-invalid={error ? 'true' : undefined}
            onFocus={() => {
              setFocused(key)
              if (voice.guided) voice.speakOnce(`student:${key}`, spec.help)
            }}
            onChange={(event) => patch({ [key]: event.target.value } as Partial<StudentApplication>)}
          />
        )}

        <div className="field__tools">
          <button type="button" className="mic-btn" onClick={() => voice.speak(spec.help)}>
            <Volume2 size={13} aria-hidden="true" />
            Explain
            <span className="visually-hidden"> the {spec.label.toLowerCase()} field</span>
          </button>
          {voice.canListen && spec.type !== 'select' && (
            <button
              type="button"
              className="mic-btn"
              aria-pressed={voice.dictatingInto === key}
              onClick={() => {
                voice.setDictatingInto(key)
                voice.dictate((text) => {
                  const value =
                    key === 'email'
                      ? text.replace(/\s+at\s+/gi, '@').replace(/\s+dot\s+/gi, '.').replace(/\s+/g, '')
                      : key === 'phone' || key === 'annualIncome'
                        ? text.replace(/\D/g, '')
                        : text
                  patch({ [key]: value } as Partial<StudentApplication>)
                })
              }}
            >
              <Mic size={13} aria-hidden="true" />
              {voice.dictatingInto === key ? 'Listening' : 'Dictate'}
              <span className="visually-hidden"> into {spec.label.toLowerCase()}</span>
            </button>
          )}
        </div>

        {error && (
          <p className="field__error" id={`student-${key}-error`}>
            <CircleAlert size={15} aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    )
  }

  const band = assistanceBand(app)
  const missingDocs = documents.filter((item) => !item.provided)

  return (
    <div ref={mainRef}>
      {definition && (
        <>
          <section className="band" aria-labelledby="student-heading">
            <p className="eyebrow">
              Step {String(index + 1).padStart(2, '0')} / {STAGE_ORDER.length}{' '}
              <span aria-hidden="true">&mdash;</span> {STAGE_LABEL[stage]}
            </p>
            <h1 className="display--md" id="student-heading">
              {definition.title.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="serif">{definition.title.split(' ').slice(-1)}</span>
            </h1>
            <p className="lede">{definition.blurb}</p>
          </section>

          <section className="panel" aria-labelledby="student-form-heading">
            <div className="panel__head">
              <h2 id="student-form-heading">{STAGE_LABEL[stage]}</h2>
              <p className="mono">
                {definition.fields.length} {definition.fields.length === 1 ? 'field' : 'fields'}, all required
              </p>
            </div>

            <div className="guardian" style={{ marginBottom: '1.75rem' }}>
              <p className="mono mono--accent">Field guidance</p>
              <p className="guardian__text">
                {focused
                  ? definition.fields.find((item) => item.key === focused)?.hint
                  : 'Move to a field and this line explains what belongs in it. Each field has an Explain button, and a Dictate button where your browser supports speech.'}
              </p>
              {focused && errors[focused] && (
                <p className="field__error">
                  <CircleAlert size={15} aria-hidden="true" />
                  {errors[focused]}
                </p>
              )}
            </div>

            <div className="field-grid">{definition.fields.map((spec) => field(spec.key))}</div>

            <div className="actions" style={{ marginTop: '2rem' }}>
              <button type="button" className="btn btn--primary" onClick={handleContinue}>
                Continue
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              {index > 0 && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => goTo(STAGE_ORDER[index - 1])}
                >
                  <ArrowLeft size={17} aria-hidden="true" />
                  Back
                </button>
              )}
            </div>
            <p className="field__hint" style={{ marginTop: '1.25rem' }}>
              Continue checks this section only. Nothing is submitted to any college or authority.
            </p>
          </section>
        </>
      )}

      {stage === 'documents' && (
        <>
          <section className="band" aria-labelledby="student-docs-heading">
            <p className="eyebrow">
              Step 05 / {STAGE_ORDER.length} <span aria-hidden="true">&mdash;</span> Documents
            </p>
            <h1 className="display--md" id="student-docs-heading">
              Supporting <span className="serif">documents</span>
            </h1>
            <p className="lede">
              A real application needs these four documents. Tick the ones you have ready — in this demonstration
              no file is uploaded anywhere.
            </p>
          </section>

          <section className="panel" aria-labelledby="student-doclist-heading">
            <div className="panel__head">
              <h2 id="student-doclist-heading">Checklist</h2>
              <p className="mono">
                {documents.length - missingDocs.length} of {documents.length} ready
              </p>
            </div>

            <ul className="doc-list">
              {documents.map((item) => (
                <li key={item.id}>
                  <div className="check">
                    <input
                      type="checkbox"
                      id={`doc-${item.id}`}
                      checked={item.provided}
                      onChange={(event) =>
                        setDocuments((current) =>
                          current.map((doc) =>
                            doc.id === item.id ? { ...doc, provided: event.target.checked } : doc,
                          ),
                        )
                      }
                    />
                    <div className="stack stack--xs">
                      <label className="field__label" htmlFor={`doc-${item.id}`}>
                        {item.label}
                        <span className={item.provided ? 'chip' : 'chip chip--missing'}>
                          {item.provided ? 'Ready' : 'Missing'}
                        </span>
                      </label>
                      <p className="field__hint">{item.note}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <p className="note" style={{ marginTop: '1.5rem' }}>
              <span className="mono" style={{ color: 'inherit', flex: 'none' }}>
                Note
              </span>
              <span>
                {missingDocs.length === 0
                  ? 'Everything is marked ready. You can continue to the review.'
                  : `${missingDocs.length} ${missingDocs.length === 1 ? 'document is' : 'documents are'} still missing: ${missingDocs.map((item) => item.label.toLowerCase()).join(', ')}. You can still continue — a real application would be held until they arrive.`}
              </span>
            </p>

            <div className="actions" style={{ marginTop: '1.75rem' }}>
              <button type="button" className="btn btn--primary" onClick={() => goTo('review')}>
                Continue to review
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => goTo('eligibility')}>
                <ArrowLeft size={17} aria-hidden="true" />
                Back
              </button>
            </div>
          </section>
        </>
      )}

      {stage === 'review' && (
        <>
          <section className="band" aria-labelledby="student-review-heading">
            <p className="eyebrow">
              Step 06 / {STAGE_ORDER.length} <span aria-hidden="true">&mdash;</span> Review
            </p>
            <h1 className="display--md" id="student-review-heading">
              Check it before you <span className="serif">submit</span>
            </h1>
            <p className="lede">
              Nothing has been submitted yet. Read the summary, change anything that is wrong, and submit only when
              you are ready.
            </p>
          </section>

          <section className="panel" aria-labelledby="student-summary-heading">
            <div className="panel__head">
              <h2 id="student-summary-heading">Application summary</h2>
              <p className="mono">Simulated</p>
            </div>

            <div className="review">
              {[
                { id: 'personal' as StudentStageId, keys: ['fullName', 'dateOfBirth', 'email', 'phone'] },
                { id: 'college' as StudentStageId, keys: ['collegeName', 'studentId'] },
                { id: 'course' as StudentStageId, keys: ['course', 'academicYear'] },
                { id: 'eligibility' as StudentStageId, keys: ['annualIncome', 'category', 'travelRoute'] },
              ].map((group) => (
                <div className="review__section" key={group.id}>
                  <div className="review__head">
                    <h3>{STAGE_LABEL[group.id]}</h3>
                    <button type="button" className="btn btn--quiet" onClick={() => goTo(group.id)}>
                      <Pencil size={13} aria-hidden="true" />
                      Change
                      <span className="visually-hidden"> {STAGE_LABEL[group.id].toLowerCase()}</span>
                    </button>
                  </div>
                  <dl className="srows">
                    {group.keys.map((key) => {
                      const spec = stageById(group.id)?.fields.find((item) => item.key === key)
                      const value = app[key as StudentFieldKey]
                      return (
                        <div className="srow" key={key}>
                          <dt>{spec?.label ?? key}</dt>
                          <dd>
                            {key === 'annualIncome' && value
                              ? `₹${Number(value).toLocaleString('en-IN')}`
                              : value || 'Not entered'}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                </div>
              ))}

              <div className="review__section">
                <div className="review__head">
                  <h3>Documents</h3>
                  <button type="button" className="btn btn--quiet" onClick={() => goTo('documents')}>
                    <Pencil size={13} aria-hidden="true" />
                    Change
                    <span className="visually-hidden"> documents</span>
                  </button>
                </div>
                <dl className="srows">
                  {documents.map((item) => (
                    <div className="srow" key={item.id}>
                      <dt>{item.label}</dt>
                      <dd>{item.provided ? 'Ready' : 'Missing'}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className="total">
              <p className="mono">Simulated decision</p>
              <p className="total__value" style={{ fontSize: 'clamp(1.5rem, 1rem + 1.6vw, 2.1rem)' }}>
                {band.band}
              </p>
            </div>
            <p className="fine" style={{ marginTop: '0.75rem' }}>
              {band.detail}
            </p>

            <p className="note note--alert" style={{ marginTop: '1.75rem' }}>
              <CircleAlert size={17} aria-hidden="true" className="note__icon" />
              <span>
                <strong>This is a demonstration.</strong> Submitting completes a simulation only. No application is
                filed with any college, authority or government service, and nothing you entered leaves your
                browser.
              </span>
            </p>

            <div className="actions" style={{ marginTop: '1.75rem' }}>
              <button type="button" className="btn btn--primary" onClick={handleSubmit}>
                <Check size={17} aria-hidden="true" />
                Submit simulated application
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => goTo('documents')}>
                <ArrowLeft size={17} aria-hidden="true" />
                Back to documents
              </button>
            </div>
          </section>
        </>
      )}

      {stage === 'complete' && (
        <>
          <section className="band confirm" aria-labelledby="student-done-heading">
            <p className="eyebrow">
              Step 07 / {STAGE_ORDER.length} <span aria-hidden="true">&mdash;</span> Complete
            </p>
            <div className="confirm__mark" aria-hidden="true">
              <Check size={20} />
            </div>
            <h1 className="display" id="student-done-heading">
              Application <span className="serif">complete.</span>
            </h1>
            <p className="lede">
              {app.fullName || 'The applicant'} completed a student assistance application for{' '}
              {app.collegeName || 'the selected college'} &mdash; in this simulation only. The simulated decision
              was {band.band.toLowerCase()}.
            </p>

            <div className="refbox">
              <div className="stack--xs stack">
                <p className="mono">Simulated reference</p>
                <p className="refbox__value">{reference}</p>
              </div>
              <p className="mono" style={{ maxWidth: '22ch' }}>
                Not a real application
              </p>
            </div>

            <p className="note note--alert">
              <CircleAlert size={17} aria-hidden="true" className="note__icon" />
              <span>
                <strong>Nothing was submitted.</strong> No application has been filed with any college, authority
                or government service, no documents were uploaded, and nothing you entered left your browser. This
                reference is not valid for anything.
              </span>
            </p>

            <div className="actions">
              <button type="button" className="btn btn--primary" onClick={handleReset}>
                <RotateCcw size={17} aria-hidden="true" />
                Start a new application
              </button>
            </div>
          </section>
        </>
      )}

      {/* Keeps the companion's answers on this workflow in step with the form. */}
      <StudentVoiceBridge input={narration} />
    </div>
  )
}

/**
 * Publishes the student narration to the companion, replacing the flight
 * narration while this workflow is on screen.
 */
function StudentVoiceBridge({ input }: { input: Parameters<typeof studentExplainScreen>[0] }) {
  const voice = useVoice()
  const ref = useRef(input)
  ref.current = input

  useEffect(() => {
    voice.setNarrationOverride({
      explain: () => studentExplainScreen(ref.current),
      next: () => studentNextSteps(ref.current),
      stageKey: () => ref.current.stage,
      intro: () => studentStageIntro(ref.current),
    })
    return () => voice.setNarrationOverride(null)
  }, [voice])

  // Guided Mode introduces each section of this workflow as it is reached.
  useEffect(() => {
    voice.notifyStage(`student:${input.stage}`)
  }, [input.stage, voice])

  return null
}
