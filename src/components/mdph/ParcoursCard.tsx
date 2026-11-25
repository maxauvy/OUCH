import { useId, useState } from 'react'
import { IconCheck } from '@tabler/icons-react'
import { db, updateSettings } from '../../db'
import { useSettings } from '../../hooks/useSettings'
import { format, useLanguage, useTranslation } from '../../i18n'
import { FormSheet, type FormTexts, type Names } from './FormSheet'
import { ASKS, ATTACHMENTS, PART_PAGES, REQUEST_KINDS, cleanParcours, parcoursParts, toggleAsk, type MdphParcours } from '../../lib/mdphParcours'

/** Brings the card of a box into view and moves the focus to its title, without touching the address (the app keeps its own). */
function goTo(box: string) {
  const card = document.getElementById(`mdph-${box}`)
  card?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  const title = card?.querySelector<HTMLElement>('h2')
  if (title) {
    title.tabIndex = -1
    title.focus({ preventScroll: true })
  }
}

/** Read from the stored settings, not from this render: two quick taps must not write over each other. */
const change = (edit: (p: MdphParcours) => MdphParcours) =>
  void db.transaction('rw', db.settings, async () => {
    const stored = cleanParcours((await db.settings.get(1))?.mdphParcours) ?? {}
    await updateSettings({ mdphParcours: cleanParcours(edit(stored)) })
  })

function Chip({ on, onClick, role, children }: { on: boolean; onClick: () => void; role: 'radio' | 'checkbox'; children: string }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={on}
      onClick={onClick}
      className="text-control min-h-11 px-3.5 rounded-full"
      style={on ? { background: 'var(--color-brand-soft)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 2px var(--color-brand)', fontWeight: 600 } : { background: 'var(--chip-bg, var(--color-brand-soft))', color: 'var(--color-ink)' }}
    >
      {children}
    </button>
  )
}

/**
 * « Ton parcours »: three answers, then the parts of the request form to fill in, in its order, with their pages and why (the form's own rules,
 * lib/mdphParcours.ts), where OUCH helps, and the documents of page 4 to tick as they are ready. Never what someone is entitled to.
 */
export function ParcoursCard({ cardsShown, texts, today, names, onNames }: { cardsShown: boolean; texts: FormTexts | null; today: string; names: Names; onNames: (n: Names) => void }) {
  const all = useTranslation().mdph
  const t = all.parcours
  const [formOpen, setFormOpen] = useState(false)
  const language = useLanguage()
  const settings = useSettings()
  const ids = useId()
  const p = cleanParcours(settings.mdphParcours) ?? {}
  const lines = parcoursParts(p)
  const toFill = lines?.filter((l) => l.fill === 'yes').length ?? 0
  const asked = (p.asks ?? []).filter((a) => a !== 'unsure')
  const list = (items: string[]) => new Intl.ListFormat(language, { type: 'conjunction' }).format(items)
  const muted = { color: 'var(--color-ink-muted)' }

  return (
    <section aria-labelledby={`${ids}-title`} className="rounded-[var(--radius-card)] p-4 flex flex-col gap-3" style={{ background: 'var(--color-surface)', border: 'var(--card-border, 1px solid var(--color-hairline))', boxShadow: 'var(--card-shadow)' }}>
      <h2 id={`${ids}-title`} className="section-title text-heading font-bold">
        {t.title}
      </h2>
      <p className="text-body" style={muted}>
        {t.intro}
      </p>

      <div role="radiogroup" aria-labelledby={`${ids}-kind`} className="flex flex-col gap-2">
        <p id={`${ids}-kind`} className="text-caption font-semibold uppercase tracking-[0.06em]" style={muted}>
          {t.kindLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {REQUEST_KINDS.map((k) => (
            <Chip key={k} role="radio" on={p.kind === k} onClick={() => change((s) => ({ ...s, kind: k }))}>
              {t.kinds[k]}
            </Chip>
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby={`${ids}-asks`} aria-describedby={`${ids}-asks-hint`} className="flex flex-col gap-2">
        <p id={`${ids}-asks`} className="text-caption font-semibold uppercase tracking-[0.06em]" style={muted}>
          {t.asksLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {ASKS.map((a) => (
            <Chip key={a} role="checkbox" on={!!p.asks?.includes(a)} onClick={() => change((s) => ({ ...s, asks: toggleAsk(s.asks, a) }))}>
              {t.asks[a]}
            </Chip>
          ))}
        </div>
        <p id={`${ids}-asks-hint`} className="text-caption" style={muted}>
          {t.asksHint}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip role="checkbox" on={!!p.studying} onClick={() => change((s) => ({ ...s, studying: !s.studying }))}>
          {t.studying}
        </Chip>
      </div>

      {lines && (
        <>
          <h3 className="text-body font-bold mt-2">
            {t.partsTitle} · {format(t.partsCount, { n: toFill }, language)}
          </h3>
          <ol className="flex flex-col">
            {lines.map((l, k) => {
              const [from, to] = PART_PAGES[l.part]
              const off = l.fill === 'no'
              const extra = l.part === 'A' && p.kind ? format(t.partA, { kind: t.formKinds[p.kind] }, language) : l.part === 'E' ? (asked.length ? format(t.partE, { list: list(asked.map((a) => t.asks[a])) }, language) : t.partENone) : ''
              return (
                <li key={l.part} className="grid grid-cols-[32px_1fr] gap-3 py-3" style={{ borderTop: k ? '1px solid var(--color-hairline)' : undefined }}>
                  <span
                    aria-hidden
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center font-extrabold"
                    style={{ fontFamily: 'var(--font-display)', background: off ? 'var(--chip-bg, var(--color-surface-raised))' : 'var(--color-brand-soft)', color: off ? 'var(--color-ink-muted)' : 'var(--color-brand)' }}
                  >
                    {l.part}
                  </span>
                  <div className="min-w-0 flex flex-col gap-1" style={off ? muted : undefined}>
                    <p className="text-body">
                      <span className="font-semibold">
                        <span className="sr-only">{l.part} · </span>
                        {t.partNames[l.part]}
                      </span>{' '}
                      <span className="text-caption" style={muted}>
                        {format(t.pages, { from, to }, language)} · {t.fill[l.fill]}
                      </span>
                    </p>
                    <p className="text-caption" style={muted}>
                      {t.reasons[l.reason]}
                    </p>
                    {!off && extra && <p className="text-body">{extra}</p>}
                    {!off && cardsShown && l.helped.length > 0 && (
                      <p className="text-caption">
                        <span className="font-semibold" style={{ color: 'var(--color-brand)' }}>
                          {format(t.helped, { boxes: list(l.helped) }, language)}
                        </span>{' '}
                        ·{' '}
                        <button type="button" onClick={() => goTo(l.helped[0]!)} className="min-h-9 font-semibold underline underline-offset-2" style={{ color: 'var(--color-brand)' }}>
                          {t.seeCard}
                        </button>
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          <h3 id={`${ids}-attach`} className="text-body font-bold mt-1">
            {t.attachTitle}
          </h3>
          <ul aria-labelledby={`${ids}-attach`} className="flex flex-col gap-1">
            {ATTACHMENTS.map((a) => {
              const on = !!p.attached?.includes(a)
              return (
                <li key={a}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => change((s) => ({ ...s, attached: on ? (s.attached ?? []).filter((x) => x !== a) : [...(s.attached ?? []), a] }))}
                    className="w-full min-h-11 flex items-start gap-3 text-left text-body py-1.5"
                  >
                    <span aria-hidden className="w-5 h-5 mt-0.5 shrink-0 rounded-md flex items-center justify-center" style={on ? { background: 'var(--color-brand)', color: 'var(--color-on-brand)' } : { boxShadow: 'inset 0 0 0 1.5px var(--color-ink-muted)' }}>
                      {on && <IconCheck size={14} stroke={3} />}
                    </span>
                    <span>{t.attach[a]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="text-caption" style={muted}>
            {t.attachNote}
          </p>

          <h3 className="text-body font-bold mt-2">{all.form.title}</h3>
          <p className="text-body" style={muted}>
            {all.form.intro}
          </p>
          <button type="button" onClick={() => setFormOpen(true)} className="btn-primary w-full">
            {all.form.open}
          </button>
        </>
      )}
      {formOpen && <FormSheet parcours={p} texts={texts} today={today} names={names} onNames={onNames} onClose={() => setFormOpen(false)} />}
    </section>
  )
}
