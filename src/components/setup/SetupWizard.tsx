import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { IconCheck, IconDeviceFloppy, IconFileText, IconMicroscope, type Icon } from '@tabler/icons-react'
import { db, updateSettings } from '../../db'
import { ALL_FACTORS, type ParentGender } from '../../db/types'
import { useSettings } from '../../hooks/useSettings'
import { useMedications } from '../../hooks/useMedications'
import { useLiveQuery } from 'dexie-react-hooks'
import { canNotify, requestNotificationPermission } from '../../lib/reminder'
import { radioGroupProps, radioProps } from '../../lib/a11y'
import { formatIllnessList } from '../../lib/childView'
import { format, getTranslations, LANGUAGES, useLanguage, useLocale, useTranslation } from '../../i18n'
import { AboutCard } from '../about/AboutCard'
import { Acronym } from '../about/Acronym'
import { AppLogo } from '../ui/AppLogo'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { Toggle } from '../ui/Toggle'
import { MedicationsSection } from '../settings/MedicationsSection'
import { IllnessPicker } from '../settings/IllnessPicker'

// First-run setup. Every step is optional and saved as soon as it is changed
// (same as Settings), so leaving halfway keeps what was chosen. The steps
// start from the illness being tracked, then cover what the doctor report
// relies on: a name to prefill, the factors it describes, the medication
// registry, and regular logging.

type Step = 'welcome' | 'illness' | 'profile' | 'tracking' | 'medications' | 'reminder' | 'done'


const inputStyle = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }

export function SetupWizard({ onDone, wiped = false }: { onDone: () => void; wiped?: boolean }) {
  const t = useTranslation()
  const settings = useSettings()
  const ids = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const tracksMedications = settings.enabledFactors.includes('medications')
  const steps: Step[] = ['welcome', 'illness', 'profile', 'tracking', ...(tracksMedications ? (['medications'] as const) : []), 'reminder', 'done']
  const [step, setStep] = useState<Step>('welcome')
  // Run again from Settings by someone who already logs: no "first day".
  const hasEntries = !!useLiveQuery(() => db.entries.count(), [])
  const index = Math.max(0, steps.indexOf(step))

  // New step: back to the top, and focus its title so screen readers say where they are.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [step])

  const go = (delta: number) => setStep(steps[Math.min(steps.length - 1, Math.max(0, index + delta))]!)
  const isLast = step === 'done'

  const progress = format(t.setup.progress, { n: index + 1, total: steps.length })
  // Focus lands on the title at each step, so the step number is read with it.
  const heading = (text: string) => (
    <h1 id={`${ids}-title`} ref={headingRef} tabIndex={-1} className="text-title font-semibold outline-none">
      {step !== 'welcome' && <span className="sr-only">{progress}, </span>}
      {text}
    </h1>
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${ids}-title`}
      className="fixed inset-0 z-50 overflow-y-auto"
      // Keeps keyboard focus clear of the sticky buttons at the bottom.
      style={{ background: 'var(--color-paper)', scrollPaddingBottom: 96 }}
    >
      <div className="min-h-full flex justify-center px-5 pt-5">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 min-h-11">
            {step === 'welcome' ? (
              <LanguagePicker />
            ) : (
              <p className="text-caption font-medium" style={{ color: 'var(--color-ink-muted)' }} aria-hidden>
                {progress}
              </p>
            )}
            {!isLast && (
              <button
                type="button"
                onClick={onDone}
                className="min-h-11 px-2 text-caption font-semibold underline underline-offset-2"
                style={{ color: 'var(--color-brand)' }}
              >
                {t.setup.skipAll}
              </button>
            )}
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-hairline)' }} aria-hidden>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${((index + 1) / steps.length) * 100}%`, background: 'var(--color-brand)' }}
            />
          </div>

          {step === 'welcome' && (
            <>
              {wiped && <WipedNotice />}
              <AppLogo size={72} className="self-center" />
              <div className="text-center">
                {heading(t.welcome.title)}
                <Acronym className="text-caption mt-1" />
              </div>
              <AboutCard />
              <Intro>{t.setup.welcomeIntro}</Intro>
            </>
          )}

          {step === 'illness' && <IllnessStep heading={heading(t.setup.illnessTitle)} />}

          {step === 'profile' && (
            <>
              {heading(t.setup.profileTitle)}
              <Intro>{t.setup.profileIntro}</Intro>
              <Card>
                <label htmlFor={`${ids}-name`} className="block text-control font-medium mb-2">
                  {t.settings.firstNameTitle}
                </label>
                <input
                  id={`${ids}-name`}
                  defaultValue={settings.displayName}
                  key={settings.displayName}
                  onBlur={(e) => updateSettings({ displayName: e.target.value.trim() })}
                  placeholder={t.settings.firstNamePlaceholder}
                  autoComplete="given-name"
                  aria-describedby={`${ids}-name-help`}
                  className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
                  style={inputStyle}
                />
                <p id={`${ids}-name-help`} className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
                  {t.setup.profileHelper}
                </p>
              </Card>
              <Card>
                <ParentPicker />
              </Card>
            </>
          )}

          {step === 'tracking' && (
            <>
              {heading(t.setup.trackingTitle)}
              <Intro>{t.setup.trackingIntro}</Intro>
              <Card>
                <p id={`${ids}-factors`} className="text-control font-medium mb-3">
                  {t.settings.factorsTitle}
                </p>
                <div role="group" aria-labelledby={`${ids}-factors`} className="flex flex-wrap gap-2">
                  {ALL_FACTORS.map((key) => {
                    const on = settings.enabledFactors.includes(key)
                    return (
                      <Chip
                        key={key}
                        label={t.factors[key].label}
                        selected={on}
                        onClick={() =>
                          updateSettings({
                            enabledFactors: on ? settings.enabledFactors.filter((k) => k !== key) : [...settings.enabledFactors, key],
                          })
                        }
                      />
                    )
                  })}
                </div>
                <div className="flex items-center justify-between gap-3 mt-5">
                  <div>
                    <p className="text-control font-medium">{t.settings.cycleTracking}</p>
                    <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                      {t.settings.cycleTrackingHelper}
                    </p>
                  </div>
                  <Toggle
                    checked={settings.cycleTrackingEnabled}
                    onChange={(v) => updateSettings({ cycleTrackingEnabled: v })}
                    label={t.settings.cycleTracking}
                  />
                </div>
              </Card>
              <Hint>{t.setup.changeLater}</Hint>
            </>
          )}

          {step === 'medications' && (
            <>
              {heading(t.setup.medicationsTitle)}
              <Intro>{t.setup.medicationsIntro}</Intro>
              <Card>
                <MedicationsSection />
              </Card>
              <Hint>{t.setup.medicationsLater}</Hint>
            </>
          )}

          {step === 'reminder' && <ReminderStep heading={heading(t.setup.reminderTitle)} />}

          {step === 'done' && <DoneStep heading={heading(t.setup.doneTitle)} />}

          {/* Sticky so the buttons stay reachable when a step is taller than the screen */}
          <div className="sticky bottom-0 -mx-1 px-1 pt-2 pb-5 mt-auto flex gap-2" style={{ background: 'var(--color-paper)' }}>
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(-1)}
                className="rounded-[var(--radius-control)] px-5 py-3.5 text-body font-semibold"
                style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
              >
                {t.setup.back}
              </button>
            )}
            <button
              type="button"
              onClick={isLast ? onDone : () => go(1)}
              className="flex-1 rounded-[var(--radius-control)] py-3.5 text-body font-semibold text-[var(--color-on-brand)]"
              style={{ background: 'var(--color-brand)' }}
            >
              {step === 'welcome' ? t.setup.begin : isLast ? (hasEntries ? t.setup.finishRerun : t.setup.finish) : t.setup.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Intro({ children }: { children: ReactNode }) {
  return (
    <p className="text-control leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
      {children}
    </p>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="text-caption px-1" style={{ color: 'var(--color-ink-muted)' }}>
      {children}
    </p>
  )
}

/** After the data was deleted. The language went with it, so the sentence is
 * given in both until one is picked just above. */
function WipedNotice() {
  return (
    <p role="status" className="rounded-[var(--radius-card)] px-4 py-3 text-body" style={{ background: 'var(--color-brand-soft)' }}>
      {LANGUAGES.map((lang) => (
        <span key={lang.code} lang={lang.code} className="block">
          {getTranslations(lang.code).deleteData.wiped}
        </span>
      ))}
    </p>
  )
}

function LanguagePicker() {
  const t = useTranslation()
  const { language } = useLocale()
  return (
    <div className="flex gap-2" {...radioGroupProps(t.settings.languageTitle)}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          {...radioProps(language === lang.code)}
          onClick={() => updateSettings({ language: lang.code })}
          className="min-h-11 rounded-[var(--radius-control)] px-4 text-caption font-semibold"
          style={{
            background: language === lang.code ? 'var(--color-brand)' : 'var(--color-brand-soft)',
            color: language === lang.code ? 'var(--color-on-brand)' : 'var(--color-brand)',
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}

/** Same choice as in Settings: the Kids tab's sentences are written for
 * "maman" or "papa", with the matching French agreement. */
function ParentPicker() {
  const t = useTranslation()
  const settings = useSettings()
  const ids = useId()
  const options: { value: ParentGender; label: string }[] = [
    { value: 'maman', label: t.settings.parentGenderMaman },
    { value: 'papa', label: t.settings.parentGenderPapa },
  ]
  return (
    <>
      <p className="text-control font-medium mb-1">
        {t.settings.parentGenderTitle}
      </p>
      <p id={`${ids}-parent-help`} className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
        {t.settings.parentGenderHelper}
      </p>
      <div className="flex gap-2" {...radioGroupProps(t.settings.parentGenderTitle)} aria-describedby={`${ids}-parent-help`}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            {...radioProps(settings.parentGender === opt.value)}
            onClick={() => updateSettings({ parentGender: opt.value })}
            className="flex-1 min-h-11 rounded-[var(--radius-control)] py-2 text-control font-semibold"
            style={{
              background: settings.parentGender === opt.value ? 'var(--color-brand)' : 'var(--color-brand-soft)',
              color: settings.parentGender === opt.value ? 'var(--color-on-brand)' : 'var(--color-brand)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </>
  )
}

function IllnessStep({ heading }: { heading: ReactNode }) {
  const t = useTranslation()
  return (
    <>
      {heading}
      <Intro>{t.setup.illnessIntro}</Intro>
      <Card>
        <IllnessPicker />
      </Card>
      <Hint>{t.setup.illnessOther}</Hint>
    </>
  )
}

function ReminderStep({ heading }: { heading: ReactNode }) {
  const t = useTranslation()
  const settings = useSettings()
  const [denied, setDenied] = useState(false)

  async function toggle(v: boolean) {
    setDenied(false)
    if (v && canNotify()) {
      const perm = await requestNotificationPermission()
      if (perm !== 'granted') {
        setDenied(true)
        await updateSettings({ reminderEnabled: false })
        return
      }
    }
    await updateSettings({ reminderEnabled: v })
  }

  return (
    <>
      {heading}
      <Intro>{t.setup.reminderIntro}</Intro>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-control font-medium">{t.settings.reminderTitle}</p>
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {t.settings.reminderHelper}
            </p>
          </div>
          <Toggle checked={settings.reminderEnabled} onChange={toggle} label={t.settings.reminderTitle} />
        </div>
        {settings.reminderEnabled && (
          <input
            type="time"
            aria-label={t.setup.reminderTime}
            value={settings.reminderTime}
            onChange={(e) => updateSettings({ reminderTime: e.target.value })}
            className="rounded-xl px-3.5 py-2.5 text-body outline-none mt-3"
            style={inputStyle}
          />
        )}
        <p className="text-caption mt-3" role={denied ? 'alert' : undefined} style={{ color: 'var(--color-ink-muted)' }}>
          {denied ? t.setup.reminderDenied : t.settings.reminderNote}
        </p>
      </Card>
    </>
  )
}

function DoneStep({ heading }: { heading: ReactNode }) {
  const t = useTranslation()
  const settings = useSettings()
  const medications = useMedications()
  const tracksMedications = settings.enabledFactors.includes('medications')
  const described = medications?.filter((m) => m.regimen !== 'unspecified').length ?? 0

  const language = useLanguage()
  const items: { done: boolean; text: string }[] = [
    {
      done: settings.illnesses.length > 0,
      text: settings.illnesses.length
        ? format(t.setup.checkIllness, { illness: formatIllnessList(language, settings.illnesses) })
        : t.setup.checkNoIllness,
    },
    { done: !!settings.displayName, text: settings.displayName ? format(t.setup.checkName, { name: settings.displayName }) : t.setup.checkNoName },
    {
      done: true,
      text: format(t.setup.checkParent, {
        parent: settings.parentGender === 'papa' ? t.settings.parentGenderPapa : t.settings.parentGenderMaman,
      }),
    },
    { done: true, text: format(t.setup.checkFactors, { n: settings.enabledFactors.length }) },
    ...(tracksMedications
      ? [{ done: described > 0, text: described > 0 ? format(t.setup.checkMedications, { n: described }) : t.setup.checkNoMedications }]
      : []),
    { done: settings.reminderEnabled, text: settings.reminderEnabled ? format(t.setup.checkReminder, { time: settings.reminderTime }) : t.setup.checkNoReminder },
  ]

  return (
    <>
      {heading}
      <Intro>{t.setup.doneIntro}</Intro>
      <Card>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.text} className="flex gap-3 items-start">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: item.done ? 'var(--color-brand)' : 'transparent',
                  boxShadow: item.done ? undefined : 'inset 0 0 0 1.5px var(--color-control-off)',
                  color: 'var(--color-on-brand)',
                }}
                aria-hidden
              >
                {item.done && <IconCheck size={14} stroke={3} />}
              </span>
              <span className="text-control">{item.text}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <div className="flex flex-col gap-4">
          <InfoRow icon={IconFileText} title={t.setup.reportTitle} body={t.setup.reportBody} />
          <InfoRow icon={IconDeviceFloppy} title={t.setup.backupTitle} body={t.setup.backupBody} />
        </div>
      </Card>
      <Card>
        <InfoRow icon={IconMicroscope} title={t.setup.sourcesTitle} body={t.setup.sourcesBody} />
      </Card>
    </>
  )
}

/** A titled note with a small icon in a soft circle, as on the About card. */
function InfoRow({ icon: IconComponent, title, body }: { icon: Icon; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
        aria-hidden="true"
      >
        <IconComponent size={20} stroke={1.75} />
      </span>
      <div>
        <p className="text-control font-medium mb-1">{title}</p>
        <p className="text-caption leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
          {body}
        </p>
      </div>
    </div>
  )
}
