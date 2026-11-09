import { useId, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { getSettings, updateSettings } from '../../db'
import type { CareSheetContact, CareSheetInfo } from '../../db/types'
import { cleanAllergies, cleanCareSheet, cleanContacts, cleanNote, MAX_ALLERGIES, MAX_ALLERGY_LENGTH, MAX_CONTACT_LABEL, MAX_CONTACTS, MAX_NOTE, MAX_PHONE } from '../../lib/careSheet'
import { format, useLanguage, useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'

const field = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }
const fieldClass = 'w-full rounded-xl px-3.5 py-2.5 text-body outline-none'
const linkClass = 'min-h-11 text-control font-semibold underline underline-offset-4'

/**
 * What only the person can add to the sheet: allergies, people to reach, a word.
 * Each change is kept as it is made (an allergy when added, a field when left),
 * so closing the sheet loses nothing, and an emptied form leaves nothing behind.
 */
export function CareSheetForm({ info, onClose }: { info: CareSheetInfo | undefined; onClose: () => void }) {
  const t = useTranslation().careSheet
  const language = useLanguage()
  const ids = useId()
  const [allergy, setAllergy] = useState('')
  const allergies = info?.allergies ?? []
  const contacts = info?.contacts ?? []

  // Every change is worked out from what is stored when it is made, not from what was on screen when the
  // field was focused: two quick changes (an allergy, then a person) must not undo each other.
  const change = (patch: (current: CareSheetInfo) => { allergies?: readonly string[]; contacts?: readonly CareSheetContact[]; note?: string }) =>
    void getSettings().then((s) => {
      const current: CareSheetInfo = s.careSheet ?? { allergies: [], contacts: [] }
      return updateSettings({ careSheet: cleanCareSheet({ ...current, ...patch(current) }) })
    })

  const addAllergy = () => {
    const text = allergy
    if (!text.trim()) return
    change((cur) => ({ allergies: cleanAllergies([...cur.allergies, text]) }))
    setAllergy('')
  }
  const setContact = (i: number, patch: Partial<CareSheetContact>) =>
    change((cur) => ({ contacts: cleanContacts(cur.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c))) }))
  // A contact being typed has no name yet: it is kept apart until it has one.
  const [draftContact, setDraftContact] = useState(false)

  return (
    <ModalSheet title={t.formTitle} closeLabel={t.close} onClose={onClose}>
      <div>
        <h3 className="text-caption font-semibold mb-1">{t.allergiesTitle}</h3>
        {allergies.length > 0 && (
          <ul>
            {allergies.map((a, i) => (
              <li key={a} className="flex items-center justify-between gap-3 py-2 border-t first:border-t-0" style={{ borderColor: 'var(--color-hairline)' }}>
                <span className="text-body">{a}</span>
                <button type="button" onClick={() => change((cur) => ({ allergies: cur.allergies.filter((a) => a !== allergies[i]) }))} aria-label={format(t.removeAllergy, { name: a }, language)} className="min-h-11 min-w-11 flex items-center justify-center shrink-0" style={{ color: 'var(--color-ink-muted)' }}>
                  <IconX size={18} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {allergies.length < MAX_ALLERGIES && (
          <form
            className="flex gap-2 mt-2"
            onSubmit={(e) => {
              e.preventDefault()
              addAllergy()
            }}
          >
            <input value={allergy} onChange={(e) => setAllergy(e.target.value)} maxLength={MAX_ALLERGY_LENGTH} placeholder={t.allergyPlaceholder} aria-label={t.allergiesTitle} className={fieldClass} style={field} />
            <button type="submit" disabled={!allergy.trim()} className={`${linkClass} min-w-11 shrink-0 disabled:opacity-40`} style={{ color: 'var(--color-brand)' }}>
              {t.addAllergy}
            </button>
          </form>
        )}
      </div>

      <div>
        <h3 className="text-caption font-semibold mb-1">{t.contactsTitle}</h3>
        <ul className="flex flex-col gap-2">
          {contacts.map((c, i) => (
            <li key={`${i}-${c.label}-${c.phone ?? ''}`} className="flex items-start gap-2">
              <div className="flex-1 flex flex-col gap-2">
                <input defaultValue={c.label} maxLength={MAX_CONTACT_LABEL} placeholder={t.contactLabelPlaceholder} aria-label={`${t.contactsTitle} ${i + 1}`} onBlur={(e) => e.target.value !== c.label && setContact(i, { label: e.target.value })} className={fieldClass} style={field} />
                <input type="tel" inputMode="tel" defaultValue={c.phone ?? ''} maxLength={MAX_PHONE} placeholder={t.contactPhonePlaceholder} aria-label={`${t.contactPhonePlaceholder} ${i + 1}`} onBlur={(e) => e.target.value !== (c.phone ?? '') && setContact(i, { phone: e.target.value })} className={fieldClass} style={field} />
              </div>
              <button type="button" onClick={() => change((cur) => ({ contacts: cur.contacts.filter((_, j) => j !== i) }))} aria-label={format(t.removeContact, { n: i + 1 }, language)} className="min-h-11 min-w-11 flex items-center justify-center shrink-0" style={{ color: 'var(--color-ink-muted)' }}>
                <IconX size={18} aria-hidden />
              </button>
            </li>
          ))}
          {draftContact && (
            <li>
              <NewContact
                labelText={`${t.contactsTitle} ${contacts.length + 1}`}
                onDone={(c) => {
                  setDraftContact(false)
                  if (c) change((cur) => ({ contacts: cleanContacts([...cur.contacts, c]) }))
                }}
              />
            </li>
          )}
        </ul>
        {contacts.length < MAX_CONTACTS && !draftContact && (
          <button type="button" onClick={() => setDraftContact(true)} className={`${linkClass} mt-1`} style={{ color: 'var(--color-brand)' }}>
            {t.addContact}
          </button>
        )}
      </div>

      <div>
        <label htmlFor={`${ids}-note`} className="text-caption font-semibold block mb-1">
          {t.noteTitle}
        </label>
        <textarea
          id={`${ids}-note`}
          key={info?.note ?? ''}
          defaultValue={info?.note ?? ''}
          maxLength={MAX_NOTE}
          rows={3}
          placeholder={t.notePlaceholder}
          onBlur={(e) => cleanNote(e.target.value) !== (info?.note ?? '') && change(() => ({ note: e.target.value }))}
          className={fieldClass}
          style={field}
        />
      </div>

      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {t.formHelper}
      </p>
    </ModalSheet>
  )
}

/** The two fields of a person being added; leaving them, with a name, adds the person. */
function NewContact({ labelText, onDone }: { labelText: string; onDone: (c: CareSheetContact | null) => void }) {
  const t = useTranslation().careSheet
  const [label, setLabel] = useState('')
  const [phone, setPhone] = useState('')
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onDone(label.trim() ? { label, phone } : null)
      }}
    >
      <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} maxLength={MAX_CONTACT_LABEL} placeholder={t.contactLabelPlaceholder} aria-label={labelText} className={fieldClass} style={field} />
      <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={MAX_PHONE} placeholder={t.contactPhonePlaceholder} aria-label={`${t.contactPhonePlaceholder} ${labelText}`} className={fieldClass} style={field} />
      <div className="flex gap-4">
        <button type="submit" disabled={!label.trim()} className="min-h-11 text-control font-semibold underline underline-offset-4 disabled:opacity-40" style={{ color: 'var(--color-brand)' }}>
          {t.addAllergy}
        </button>
        <button type="button" onClick={() => onDone(null)} className="min-h-11 text-control underline underline-offset-4" style={{ color: 'var(--color-ink-muted)' }}>
          {t.close}
        </button>
      </div>
    </form>
  )
}
