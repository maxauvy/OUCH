import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AppLogo } from '../components/ui/AppLogo'
import { EXAMPLE_FOCUS, EXAMPLE_IMAGE, EXAMPLE_PARTS, EXAMPLE_SIZE } from './example'
import { strings as t } from './strings'

const NOTE_URL = `https://maxauvy.github.io/OUCH/soignants/note-methodologique.${t.lang}.pdf`
const CODE_URL = 'https://github.com/maxauvy/OUCH'
const image = EXAMPLE_IMAGE[t.lang === 'en' ? 'en' : 'fr']

/** The thumbnail of a part: the example image, enlarged, centred on that part. */
const THUMB = { width: 96, height: 56, imageWidth: 192 }
function thumbStyle(part: number): CSSProperties {
  const [y, x] = EXAMPLE_FOCUS[part]
  const scale = THUMB.imageWidth / EXAMPLE_SIZE.width
  return { width: THUMB.imageWidth, left: -8 - x * scale, top: THUMB.height / 2 - y * scale }
}

/**
 * The "Understand" tab: how to read the image (the four parts, each opening
 * the tour at its step, and the five skies), what it does not say, then OUCH,
 * what Duo receives and the sources, folded.
 */
export function Understand({ name }: { name?: string }) {
  const [tour, setTour] = useState<number | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)

  return (
    <div className="stack understand">
      <h1 className="title">{t.readTitle(name)}</h1>
      <p className="small">{t.readHint}</p>

      <ul className="card parts">
        {t.parts.map((part, i) => (
          <li key={part.title}>
            <button
              type="button"
              className="part"
              onClick={(e) => {
                opener.current = e.currentTarget
                setTour(i)
              }}
            >
              <span className="thumb" aria-hidden="true">
                <img src={image} alt="" style={thumbStyle(i)} />
              </span>
              <span className="part-text">
                <strong>{part.title}</strong>
                <span>{part.short}</span>
              </span>
              <Chevron />
            </button>
          </li>
        ))}
      </ul>

      <section className="card">
        <h2 className="card-title small-title">{t.scaleTitle}</h2>
        <p className="small scale-text">{t.scaleText(name)}</p>
        <ol className="scale">
          {t.levels.map((level, i) => (
            <li key={level} className={`w${i + 1}`}>
              {level}
              <strong>{['0–1', '2–3', '4–5', '6–7', '8–10'][i]}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="card calm">
        <h2 className="card-title">{t.notTitle}</h2>
        <p className="text">{t.notText}</p>
      </section>

      <Fold icon={<AppLogo size={26} />} tint="w1" title={t.aboutTitle} line={t.aboutLine}>
        <p className="text">{t.aboutText(name)}</p>
      </Fold>
      <Fold icon={<LockIcon />} tint="w4" title={t.receiveTitle} line={t.receiveLine}>
        <p className="text">{t.receiveText(name)}</p>
      </Fold>
      <Fold icon={<BookIcon />} tint="w3" title={t.methodTitle} line={t.methodLine}>
        <p className="text">{t.methodText}</p>
        <ul className="refs">
          {t.refs.map((ref) => (
            <li key={ref.title}>
              <strong>{ref.title}</strong> <span className="ref-source">· {ref.source}</span>
              <span className="ref-text">{ref.text}</span>
            </li>
          ))}
        </ul>
        <a className="link-btn" href={NOTE_URL} target="_blank" rel="noopener noreferrer">
          {t.noteLink} ↗<span className="visually-hidden"> {t.opensElsewhere}</span>
        </a>
      </Fold>

      <p className="small center-text">
        {t.codeLine}{' '}
        <a className="inline-link" href={CODE_URL} target="_blank" rel="noopener noreferrer">
          {t.codeLink} ↗<span className="visually-hidden"> {t.opensElsewhere}</span>
        </a>
      </p>

      {tour !== null && (
        <Tour
          step={tour}
          name={name}
          onStep={setTour}
          onClose={() => {
            setTour(null)
            opener.current?.focus()
          }}
        />
      )}
    </div>
  )
}

function Fold({ icon, tint, title, line, children }: { icon: ReactNode; tint: string; title: string; line: string; children: ReactNode }) {
  return (
    <details className="card fold">
      <summary>
        <span className={`fold-icon ${tint}`} aria-hidden="true">
          {icon}
        </span>
        <span className="part-text">
          <strong>{title}</strong>
          <span>{line}</span>
        </span>
        <Chevron down />
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  )
}

/** The tour: the example image, dimmed except the part explained, and its explanation below. */
function Tour({ step, name, onStep, onClose }: { step: number; name?: string; onStep: (step: number) => void; onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const part = t.parts[step]
  const last = step === t.parts.length - 1
  const [top, bottom] = EXAMPLE_PARTS[step]
  // The part with some of the image around it, so it can be placed on the whole: at least 380 of the card's pixels tall.
  const windowHeight = Math.min(EXAMPLE_SIZE.height, Math.max(bottom - top + 64, 380))
  const windowTop = Math.max(0, Math.min(EXAMPLE_SIZE.height - windowHeight, (top + bottom) / 2 - windowHeight / 2))

  useEffect(() => {
    heading.current?.focus()
  }, [step])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // The page under the tour does not scroll while it is open.
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="duo-tour-title">
      <div className="sky" aria-hidden="true" />
      <div className="tour-top">
        <p className="brand tour-name">{t.tourTitle}</p>
        <button type="button" className="round" aria-label={t.close} onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="stage" style={{ aspectRatio: `${EXAMPLE_SIZE.width} / ${windowHeight}` }} aria-hidden="true">
        <img src={image} alt="" style={{ top: `${(-windowTop / windowHeight) * 100}%` }} />
        <span
          className="hole"
          style={{
            top: `${((top - windowTop) / windowHeight) * 100}%`,
            height: `${((bottom - top) / windowHeight) * 100}%`,
          }}
        >
          <span className="num">{step + 1}</span>
        </span>
      </div>
      <p className="small center-text">{t.tourExample}</p>
      <section className="tour-sheet">
        <div className="dots">
          {t.parts.map((p, i) => (
            <span key={p.title} className={i === step ? 'on' : undefined} />
          ))}
          <span className="small">{t.stepOf(step + 1, t.parts.length)}</span>
        </div>
        <h2 id="duo-tour-title" className="card-title" tabIndex={-1} ref={heading}>
          {part.title}
        </h2>
        <p className="text">{part.text(t.who(name))}</p>
        <p className="small">{part.more}</p>
        <div className="tour-nav">
          {step > 0 ? (
            <button type="button" className="link-btn" onClick={() => onStep(step - 1)}>
              ← {t.parts[step - 1].title}
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="pill" onClick={() => (last ? onClose() : onStep(step + 1))}>
            {last ? t.done : `${t.parts[step + 1].title} →`}
          </button>
        </div>
      </section>
    </div>
  )
}

function Chevron({ down }: { down?: boolean }) {
  return (
    <svg
      className="chevron"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={down ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5" />
    </svg>
  )
}
