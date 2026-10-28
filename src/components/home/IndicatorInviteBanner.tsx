import { useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import type { FactorKey, Settings } from '../../db/types'
import { formatIllnessList } from '../../lib/childView'
import { completeInvite, invitableIndicators, snoozeInvite } from '../../lib/indicatorInvite'
import type { IndicatorKey } from '../../lib/indicatorCatalog'
import { format, useLanguage, useTranslation } from '../../i18n'
import { Chip } from '../ui/Chip'
import { ModalSheet } from '../ui/ModalSheet'

/** A quiet line on the day's page: new indicators fit what the person declared.
 * "See" opens a sheet with nothing ticked; the cross means "later". */
export function IndicatorInviteBanner({ settings, earlyAccess, today }: { settings: Settings; earlyAccess: boolean; today: string }) {
  const t = useTranslation()
  const language = useLanguage()
  const [open, setOpen] = useState(false)
  const list = formatIllnessList(language, settings.illnesses)

  return (
    <>
      <section
        aria-label={t.indicatorInvite.region}
        className="rounded-[var(--radius-card)] pl-4 pr-1 py-1 flex items-center gap-2"
        style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}
      >
        <p className="flex-1 text-control py-2">{format(t.indicatorInvite.banner, { list })}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-11 px-3 text-control font-semibold"
          style={{ color: 'var(--color-brand)' }}
        >
          {t.indicatorInvite.see}
        </button>
        <button
          type="button"
          onClick={() => void updateSettings(snoozeInvite(settings, today))}
          aria-label={t.indicatorInvite.later}
          className="w-11 h-11 shrink-0 rounded-[var(--radius-control)] flex items-center justify-center"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          <IconX size={18} aria-hidden />
        </button>
      </section>
      {open && <InviteSheet settings={settings} earlyAccess={earlyAccess} today={today} onClose={() => setOpen(false)} />}
    </>
  )
}

function InviteSheet({ settings, earlyAccess, today, onClose }: { settings: Settings; earlyAccess: boolean; today: string; onClose: () => void }) {
  const t = useTranslation()
  const language = useLanguage()
  // Nothing is ticked: what is added is only what the person chooses.
  const [chosen, setChosen] = useState<IndicatorKey[]>([])
  const candidates = invitableIndicators(settings, earlyAccess)
  const label = (k: IndicatorKey) => t.factors[k as FactorKey].label
  const toggle = (k: IndicatorKey) => setChosen((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))
  const followed = settings.enabledFactors.map((f) => t.factors[f].label.toLocaleLowerCase(language))

  // A sheet closed with nothing ticked is the same as the cross: later.
  function close() {
    if (chosen.length === 0) void updateSettings(snoozeInvite(settings, today))
    onClose()
  }
  function add() {
    void updateSettings(completeInvite(settings, chosen))
    onClose()
  }

  const chip = (k: IndicatorKey) => <Chip key={k} label={label(k)} selected={chosen.includes(k)} onClick={() => toggle(k)} />

  return (
    <ModalSheet title={t.indicatorInvite.sheetTitle} closeLabel={t.indicatorInvite.closeSheet} onClose={close}>
      <p className="text-control" style={{ color: 'var(--color-ink-muted)' }}>
        {t.indicatorInvite.sheetHint}
      </p>
      <div role="group" aria-label={t.indicatorInvite.sheetTitle} className="flex flex-wrap gap-2">
        {candidates.map(chip)}
      </div>
      {followed.length > 0 && (
        <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {format(t.indicatorInvite.footer, { list: new Intl.ListFormat(language, { type: 'conjunction' }).format(followed) })}
        </p>
      )}
      <button
        type="button"
        onClick={add}
        disabled={chosen.length === 0}
        className="rounded-[var(--radius-control)] py-3.5 text-body font-semibold text-[var(--color-on-brand)] disabled:opacity-40"
        style={{ background: 'var(--color-brand)' }}
      >
        {format(t.indicatorInvite.add, { n: chosen.length })}
      </button>
      <button type="button" onClick={close} className="min-h-11 text-control font-semibold underline underline-offset-4" style={{ color: 'var(--color-brand)' }}>
        {t.indicatorInvite.notNow}
      </button>
    </ModalSheet>
  )
}
