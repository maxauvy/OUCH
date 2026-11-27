import { useId, useState } from 'react'
import { IconFileTypePdf } from '@tabler/icons-react'
import { useSettings } from '../../hooks/useSettings'
import { format, useLanguage, useTranslation } from '../../i18n'
import { sharePdf } from './sharePdf'
import { cleanMdphGestures } from '../../lib/mdph'
import type { MdphParcours } from '../../lib/mdphParcours'
import { CERFA_FILE, ageOn, formFields, type FormChoice, type FormFields } from '../../lib/mdphForm'
import { ModalSheet } from '../ui/ModalSheet'

/** The texts of B3 and D1, in French whatever the app's language: the form is French. Null when the journal has too few days. */
export interface FormTexts {
  b3: string
  d1: string
  months: number
}

/** The names typed for the form and the certificate: kept by the page while it is open, never stored. */
export interface Names {
  lastName: string
  firstNames: string
}

/** The two name fields, shared by the form's sheet and the certificate's. */
export function NamesFields({ names, onNames }: { names: Names; onNames: (n: Names) => void }) {
  const f = useTranslation().mdph.form
  const ids = useId()
  const input = 'w-full min-h-11 rounded-[var(--radius-control)] px-3 text-body'
  const inputStyle = { background: 'var(--color-input, var(--color-surface))', border: '1px solid var(--color-hairline)', color: 'var(--color-ink)' }
  return (
    <div className="grid grid-cols-1 gap-2">
      <label htmlFor={`${ids}-last`} className="text-control font-semibold">
        {f.lastName}
      </label>
      <input id={`${ids}-last`} value={names.lastName} onChange={(e) => onNames({ ...names, lastName: e.target.value })} autoComplete="family-name" className={input} style={inputStyle} />
      <label htmlFor={`${ids}-first`} className="text-control font-semibold">
        {f.firstNames}
      </label>
      <input id={`${ids}-first`} value={names.firstNames} onChange={(e) => onNames({ ...names, firstNames: e.target.value })} autoComplete="given-name" className={input} style={inputStyle} />
      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {f.namesHint}
      </p>
    </div>
  )
}

type Block = 'birth' | 'kind' | 'b2' | 'b3' | 'd1' | 'asks'

/** Writes `fields` into the official form, which is fetched the first time (it is not kept for offline use: 2.8 MB). The fields stay editable. */
async function fillCerfa(fields: FormFields): Promise<Blob> {
  const [{ PDFDocument }, bytes] = await Promise.all([import('pdf-lib'), fetch(`${import.meta.env.BASE_URL}${CERFA_FILE}`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))])
  const doc = await PDFDocument.load(bytes)
  const form = doc.getForm()
  for (const name of fields.checks) form.getCheckBox(name).check()
  for (const [name, text] of Object.entries(fields.texts)) form.getTextField(name).setText(text)
  return new Blob([(await doc.save()) as BlobPart], { type: 'application/pdf' })
}

function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (on: boolean) => void; label: string; sub: string }) {
  const id = useId()
  return (
    <li className="flex items-start justify-between gap-3 py-2.5" style={{ borderTop: '1px solid var(--color-hairline)' }}>
      <span className="min-w-0">
        <span id={id} className="block text-body">
          {label}
        </span>
        <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {sub}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={id}
        onClick={() => onChange(!on)}
        className="shrink-0 w-12 h-7 mt-0.5 rounded-full relative"
        style={{ background: on ? 'var(--color-brand)' : 'var(--chip-bg, var(--color-surface-raised))', boxShadow: on ? undefined : 'inset 0 0 0 1px var(--color-hairline)' }}
      >
        <span aria-hidden className="absolute top-1 w-5 h-5 rounded-full transition-[left]" style={{ left: on ? 26 : 4, background: on ? 'var(--color-on-brand)' : 'var(--color-ink-muted)' }} />
      </button>
    </li>
  )
}

/**
 * « Ce que OUCH écrit pour toi »: every block that goes into the form, each one switchable, before the form is made. The names are typed here
 * and not kept; nothing else personal is asked. The form is made on the phone and shared or saved from there: nothing is sent.
 */
export function FormSheet({ parcours, texts, today, names, onNames, onClose }: { parcours: MdphParcours; texts: FormTexts | null; today: string; names: Names; onNames: (n: Names) => void; onClose: () => void }) {
  const t = useTranslation().mdph
  const f = t.form
  const language = useLanguage()
  const settings = useSettings()
  const renewal = parcours.kind === 'renewal'
  const gestures = cleanMdphGestures(settings.mdphGestures)
  const needs = Object.values(gestures ?? {}).filter((a) => a === 'often' || a === 'sometimes').length
  const birthDate = settings.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(settings.birthDate) ? settings.birthDate : undefined
  const under20 = !!birthDate && ageOn(birthDate, today) < 20
  const asked = (parcours.asks ?? []).filter((a) => a === 'aah' || a === 'pch' || a === 'rqth' || a === 'orientation')
  const list = (items: string[]) => new Intl.ListFormat(language, { type: 'conjunction' }).format(items)

  const [off, setOff] = useState<Set<Block>>(new Set(['d1']))
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle')
  const on = (b: Block) => !off.has(b)
  const set = (b: Block) => (v: boolean) =>
    setOff((s) => {
      const next = new Set(s)
      if (v) next.delete(b)
      else next.add(b)
      return next
    })

  const rows: { block: Block; label: string; sub: string }[] = [
    ...(birthDate ? [{ block: 'birth' as const, label: f.birth, sub: f.birthSub }] : []),
    ...(parcours.kind ? [{ block: 'kind' as const, label: `« ${t.parcours.formKinds[parcours.kind]} »`, sub: f.kindSub }] : []),
    ...(!renewal && needs > 0 ? [{ block: 'b2' as const, label: format(f.b2, { n: needs }, language), sub: f.b2Sub }] : []),
    ...(!renewal && texts ? [{ block: 'b3' as const, label: t.b3Title, sub: format(f.b3Sub, { n: texts.months }, language) }] : []),
    ...(!renewal && texts ? [{ block: 'd1' as const, label: t.d1Title, sub: f.d1Sub }] : []),
    ...(!under20 && asked.length ? [{ block: 'asks' as const, label: list(asked.map((a) => t.parcours.asks[a])), sub: f.asksSub }] : []),
  ]

  const make = async () => {
    setState('busy')
    const choice: FormChoice = {
      ...names,
      birthDate: on('birth') ? birthDate : undefined,
      kind: on('kind') ? parcours.kind : undefined,
      gestures: on('b2') && !renewal ? gestures : undefined,
      asks: on('asks') ? parcours.asks : undefined,
      b3: on('b3') && !renewal ? texts?.b3 : undefined,
      d1: on('d1') && !renewal ? texts?.d1 : undefined,
    }
    try {
      await sharePdf(await fillCerfa(formFields(choice, today)), `${f.fileName}-${today}.pdf`, f.sheetTitle)
      setState('idle')
    } catch (e) {
      console.error(e)
      setState('failed')
    }
  }

  return (
    <ModalSheet title={f.sheetTitle} closeLabel={f.close} busy={state === 'busy'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <NamesFields names={names} onNames={onNames} />

        <ul className="flex flex-col">
          {rows.map((r) => (
            <Toggle key={r.block} on={on(r.block)} onChange={set(r.block)} label={r.label} sub={r.sub} />
          ))}
        </ul>

        {(parcours.asks?.includes('cmi') || under20) && (
          <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {[parcours.asks?.includes('cmi') && !under20 ? f.cmiNote : '', under20 ? f.under20 : ''].filter(Boolean).join(' ')}
          </p>
        )}

        <div className="rounded-[14px] px-3 py-2.5" style={{ background: 'var(--color-brand-soft)' }}>
          <p className="text-body font-semibold">{f.byHandTitle}</p>
          <p className="text-caption">{f.byHand}</p>
        </div>
        <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {f.reread}
        </p>

        <button type="button" onClick={() => void make()} disabled={state === 'busy'} className="btn-primary w-full">
          <IconFileTypePdf size={18} aria-hidden />
          {state === 'busy' ? f.making : f.make}
        </button>
        <p role="alert" className="text-caption text-center font-medium" style={{ color: 'var(--color-weather-5-text)' }}>
          {state === 'failed' ? f.failed : ''}
        </p>
      </div>
    </ModalSheet>
  )
}
