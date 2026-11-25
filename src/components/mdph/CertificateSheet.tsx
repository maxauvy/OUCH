import { useId, useState } from 'react'
import { IconFileTypePdf } from '@tabler/icons-react'
import { useSettings } from '../../hooks/useSettings'
import { format, getTranslations, useLanguage, useTranslation } from '../../i18n'
import { cleanMdphGestures } from '../../lib/mdph'
import { cleanParcours } from '../../lib/mdphParcours'
import { CERT_FILE, NEEDS_MAX, certificateFields, needsSentence } from '../../lib/mdphCertificate'
import { ModalSheet } from '../ui/ModalSheet'
import { NamesFields, type Names } from './FormSheet'
import { sharePdf } from './sharePdf'

/** Writes page 1's patient box into the official certificate, fetched the first time. The fields stay editable. */
async function fillCertificate(texts: Record<string, string>): Promise<Blob> {
  const [{ PDFDocument }, bytes] = await Promise.all([import('pdf-lib'), fetch(`${import.meta.env.BASE_URL}${CERT_FILE}`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))])
  const doc = await PDFDocument.load(bytes)
  const form = doc.getForm()
  for (const [name, text] of Object.entries(texts)) {
    const field = form.getTextField(name)
    // The box of needs is three short lines: a smaller size keeps the whole text inside it.
    if (name === 'Principaux Besoins') field.setFontSize(9)
    field.setText(text)
  }
  return new Blob([(await doc.save()) as BlobPart], { type: 'application/pdf' })
}

/**
 * « Ce que OUCH écrit sur ton certificat »: only the box of page 1 that the certificate gives to the patient. The sentence of needs is proposed
 * from « Ton parcours » and the B2 grid, always in French (the certificate is French), and can be changed freely before the PDF is made.
 */
export function CertificateSheet({ names, onNames, today, onClose }: { names: Names; onNames: (n: Names) => void; today: string; onClose: () => void }) {
  const t = useTranslation().mdph
  const c = t.cert
  const language = useLanguage()
  const settings = useSettings()
  const ids = useId()
  const fr = getTranslations('fr').mdph
  const proposal = needsSentence(cleanParcours(settings.mdphParcours)?.asks, cleanMdphGestures(settings.mdphGestures), { asks: fr.parcours.asks, gestures: fr.gestures })
  const birthDate = settings.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(settings.birthDate) ? settings.birthDate : undefined
  const [withBirth, setWithBirth] = useState(true)
  const [dossier, setDossier] = useState('')
  const [needs, setNeeds] = useState(proposal)
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle')

  const make = async () => {
    setState('busy')
    try {
      const blob = await fillCertificate(certificateFields({ ...names, birthDate: withBirth ? birthDate : undefined, dossier, needs }))
      await sharePdf(blob, `${c.fileName}-${today}.pdf`, c.sheetTitle)
      setState('idle')
    } catch (e) {
      console.error(e)
      setState('failed')
    }
  }

  const input = 'w-full min-h-11 rounded-[var(--radius-control)] px-3 text-body'
  const inputStyle = { background: 'var(--color-input, var(--color-surface))', border: '1px solid var(--color-hairline)', color: 'var(--color-ink)' }
  const muted = { color: 'var(--color-ink-muted)' }

  return (
    <ModalSheet title={c.sheetTitle} closeLabel={t.form.close} busy={state === 'busy'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-body" style={muted}>
          {c.sheetIntro}
        </p>
        <NamesFields names={names} onNames={onNames} />
        {birthDate && (
          <label className="flex items-center gap-3 min-h-11 text-body">
            <input type="checkbox" checked={withBirth} onChange={(e) => setWithBirth(e.target.checked)} className="w-5 h-5 accent-[var(--color-brand)]" />
            {c.birth}
          </label>
        )}
        <div className="grid gap-2">
          <label htmlFor={`${ids}-dossier`} className="text-control font-semibold">
            {c.dossier}
          </label>
          <input id={`${ids}-dossier`} value={dossier} onChange={(e) => setDossier(e.target.value)} inputMode="text" className={input} style={inputStyle} />
        </div>
        <div className="grid gap-2">
          <label htmlFor={`${ids}-needs`} className="text-control font-semibold">
            {c.needs}
          </label>
          <textarea
            id={`${ids}-needs`}
            value={needs}
            maxLength={NEEDS_MAX}
            rows={5}
            onChange={(e) => setNeeds(e.target.value)}
            aria-describedby={`${ids}-needs-hint`}
            className="w-full rounded-[var(--radius-control)] px-3 py-2.5 text-body leading-[1.5]"
            style={inputStyle}
          />
          <p id={`${ids}-needs-hint`} className="text-caption" style={muted}>
            {proposal ? format(c.needsHint, { n: needs.length, max: NEEDS_MAX }, language) : c.needsEmpty}
          </p>
          {proposal && needs !== proposal && (
            <button type="button" onClick={() => setNeeds(proposal)} className="self-start min-h-11 text-control font-semibold underline underline-offset-2" style={{ color: 'var(--color-brand)' }}>
              {c.needsReset}
            </button>
          )}
        </div>
        <div className="rounded-[14px] px-3 py-2.5" style={{ background: 'var(--color-brand-soft)' }}>
          <p className="text-body font-semibold">{t.form.byHandTitle}</p>
          <p className="text-caption">{c.byHand}</p>
        </div>
        <button type="button" onClick={() => void make()} disabled={state === 'busy'} className="btn-primary w-full">
          <IconFileTypePdf size={18} aria-hidden />
          {state === 'busy' ? t.form.making : c.make}
        </button>
        <p role="alert" className="text-caption text-center font-medium" style={{ color: 'var(--color-weather-5-text)' }}>
          {state === 'failed' ? c.failed : ''}
        </p>
      </div>
    </ModalSheet>
  )
}
