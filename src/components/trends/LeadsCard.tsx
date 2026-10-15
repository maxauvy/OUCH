import { useRef, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconNotebook } from '@tabler/icons-react'
import { Card, SectionTitle } from '../ui/Card'
import { actionInSentence, type Lead, type LeadChoice, type LeadChoices } from '../../lib/leads'
import { format, useLanguage, useLocale, useTranslation, type Translations } from '../../i18n'
import { usePalette } from '../../hooks/usePalette'

type LeadTexts = { title: string; high: string; low: string; note: string }

function textsFor(lead: Lead, t: Translations['trends']): LeadTexts {
  const action = actionInSentence(lead.action ?? '')
  switch (lead.kind) {
    case 'sleep':
      return { title: t.leadTitleSleep, high: t.leadSleepHigh, low: t.leadSleepLow, note: t.leadNoteSleep }
    case 'stress':
      return { title: t.leadTitleStress, high: t.leadStressHigh, low: t.leadStressLow, note: t.leadNoteStress }
    case 'activity':
      return { title: t.leadTitleActivity, high: t.leadActivityHigh, low: t.leadActivityLow, note: t.leadNoteActivity }
    case 'action':
      return {
        title: format(t.leadTitleAction, { action }),
        high: format(t.leadActionHigh, { action }),
        low: t.leadActionLow,
        note: t.leadNoteAction,
      }
  }
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * The few things in the notes that go with a clearly different pain, one at a
 * time: two big numbers (pain on the softer days, on the harder ones), one
 * sentence that says it, and what it does not say. The person can keep a lead
 * for the appointment or set it aside; neither changes what is computed. See
 * `lib/leads.ts` for what counts as a lead.
 */
export function LeadsCard({
  shown,
  dismissed,
  choices,
  onAnswer,
  onUndo,
}: {
  shown: Lead[]
  dismissed: Lead[]
  choices: LeadChoices | undefined
  onAnswer: (lead: Lead, choice: LeadChoice['choice']) => void
  onUndo: (lead: Lead) => void
}) {
  const i18n = useTranslation()
  const t = i18n.trends
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const palette = usePalette()
  const [index, setIndex] = useState(0)
  const heading = useRef<HTMLDivElement>(null)
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const current = shown[Math.min(index, shown.length - 1)]
  const at = current ? shown.indexOf(current) : 0

  // The card the person answered leaves the list: keep them where they were.
  const dismiss = (lead: Lead) => {
    onAnswer(lead, 'dismissed')
    heading.current?.focus()
  }

  return (
    <Card tour="trends-leads">
      <div ref={heading} tabIndex={-1} className="outline-none">
        <SectionTitle>{t.leadsTitle}</SectionTitle>
      </div>

      {!current ? (
        <p className="text-control leading-snug" style={{ color: palette.inkMuted }}>
          {t.leadsNone}
        </p>
      ) : (
        <LeadView
          lead={current}
          choice={choices?.[current.key]}
          nf={nf}
          language={language}
          onKeep={() => onAnswer(current, 'kept')}
          onDismiss={() => dismiss(current)}
          onUndo={() => onUndo(current)}
        />
      )}

      {shown.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <PagerButton label={t.leadsPrevious} disabled={at === 0} onClick={() => setIndex(at - 1)}>
            <IconChevronLeft size={20} aria-hidden />
          </PagerButton>
          <span className="text-caption tabular-nums min-w-[4.5rem] text-center" style={{ color: palette.inkMuted }} aria-live="polite">
            {format(t.leadsCount, { i: at + 1, n: shown.length }, language)}
          </span>
          <PagerButton label={t.leadsNext} disabled={at === shown.length - 1} onClick={() => setIndex(at + 1)}>
            <IconChevronRight size={20} aria-hidden />
          </PagerButton>
        </div>
      )}

      {dismissed.length > 0 && (
        <details className="mt-4 pt-3" style={{ borderTop: `1px solid ${palette.hairline}` }}>
          <summary className="text-control cursor-pointer" style={{ color: palette.inkMuted }}>
            {format(t.leadsDismissedTitle, { n: dismissed.length }, language)}
          </summary>
          <p className="text-caption mt-2" style={{ color: palette.inkMuted }}>
            {t.leadsDismissedHint}
          </p>
          <ul className="mt-1">
            {dismissed.map((lead) => (
              <li key={lead.key} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-control">{textsFor(lead, t).title}</span>
                <button
                  type="button"
                  onClick={() => onUndo(lead)}
                  className="text-control font-medium underline underline-offset-4 min-h-10 px-1"
                  style={{ color: palette.brand }}
                >
                  {t.leadReopen}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  )
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"
      style={{ color: 'var(--color-brand)' }}
    >
      {children}
    </button>
  )
}

function LeadView({
  lead,
  choice,
  nf,
  language,
  onKeep,
  onDismiss,
  onUndo,
}: {
  lead: Lead
  choice: LeadChoice | undefined
  nf: Intl.NumberFormat
  language: string
  onKeep: () => void
  onDismiss: () => void
  onUndo: () => void
}) {
  const t = useTranslation().trends
  const palette = usePalette()
  const texts = textsFor(lead, t)
  const gap = Math.abs(lead.gap)
  const sentence = format(
    lead.gap < 0 ? t.leadSentenceLower : t.leadSentenceHigher,
    { when: capitalise(texts.high), gap: nf.format(gap), n: gap },
    language
  )
  const basis =
    lead.kind === 'action'
      ? format(t.leadBasisAction, { n: lead.days, a: lead.high.n, b: lead.low.n }, language)
      : format(t.leadBasisScale, { n: lead.days }, language)
  // The softer days on the left, in the brand blue; the harder ones in a neutral grey: no alarm colour.
  const soft = lead.gap <= 0 ? { mean: lead.high.mean, label: texts.high } : { mean: lead.low.mean, label: texts.low }
  const hard = lead.gap <= 0 ? { mean: lead.low.mean, label: texts.low } : { mean: lead.high.mean, label: texts.high }
  const kept = choice?.choice === 'kept'

  return (
    <div>
      <h3 className="text-heading font-semibold leading-snug">{texts.title}</h3>
      <p className="text-caption mt-0.5" style={{ color: palette.inkMuted }}>
        {t.leadsCaption}
      </p>
      <div className="grid grid-cols-2 gap-2.5 mt-3">
        <Tile mean={nf.format(soft.mean)} label={soft.label} bg="var(--color-brand-soft)" ink="var(--color-brand)" />
        <Tile mean={nf.format(hard.mean)} label={hard.label} bg="var(--color-surface-raised)" ink="var(--color-ink)" ring />
      </div>
      <p className="text-control leading-snug mt-3 font-medium">{sentence}</p>
      <p className="text-caption leading-snug mt-1.5" style={{ color: palette.inkMuted }}>
        {basis} {texts.note}
      </p>

      {kept ? (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 mt-3 text-control"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
        >
          <IconNotebook size={18} aria-hidden />
          <span>{t.leadKept}</span>
          <button type="button" onClick={onUndo} className="ml-auto underline underline-offset-4 min-h-10 px-1">
            {t.leadUndo}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={onKeep}
            className="rounded-[var(--radius-control)] px-3.5 min-h-11 text-control font-medium"
            style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
          >
            {t.leadKeep}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-[var(--radius-control)] px-3.5 min-h-11 text-control font-medium"
            style={{ boxShadow: 'inset 0 0 0 1px var(--color-hairline)', color: 'var(--color-ink)' }}
          >
            {t.leadDismiss}
          </button>
        </div>
      )}
    </div>
  )
}

function Tile({ mean, label, bg, ink, ring }: { mean: string; label: string; bg: string; ink: string; ring?: boolean }) {
  return (
    <div
      className="rounded-xl px-2.5 py-3 text-center"
      style={{ background: bg, color: ink, boxShadow: ring ? 'inset 0 0 0 1px var(--color-hairline)' : undefined }}
    >
      <p className="text-display font-bold leading-none">{mean}</p>
      <p className="text-caption mt-1.5 leading-snug" style={{ color: 'var(--color-ink)' }}>
        {capitalise(label)}
      </p>
    </div>
  )
}
