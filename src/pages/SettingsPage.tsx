import { Fragment, useId, useState, type ReactNode } from 'react'
import {
  IconBrush,
  IconCalendarHeart,
  IconChartBar,
  IconCloudRain,
  IconDatabaseExport,
  IconFlask,
  IconHeart,
  IconHeartHandshake,
  IconId,
  IconInfoCircle,
  IconLanguage,
  IconLayoutList,
  IconListCheck,
  IconMapPin,
  IconMoodKid,
  IconPalette,
  IconPencil,
  IconPill,
  IconPlayerPlay,
  IconRefresh,
  IconSearch,
  IconServer,
  IconShieldLock,
  IconSparkles,
  IconStethoscope,
  IconStretching,
  IconUser,
  IconUsers,
  IconX,
  type Icon as TablerIcon,
} from '@tabler/icons-react'
import { useSettings } from '../hooks/useSettings'
import { updateSettings } from '../db'
import { clearAudienceFlag } from '../lib/audience'
import { type ParentGender, type ThemePref } from '../db/types'
import { Card, SectionTitle } from '../components/ui/Card'
import { Segmented } from '../components/ui/Segmented'
import { Footer } from '../components/layout/Footer'
import { AboutCard } from '../components/about/AboutCard'
import { SourcesCard } from '../components/about/SourcesCard'
import { SupportCard } from '../components/about/SupportCard'
import { BackupSection } from '../components/settings/BackupSection'
import { IS_DEMO } from '../lib/demoMode'
import { exitDemo, startDemo } from '../lib/demoSession'
import { setEarlyAccess, useEarlyAccess } from '../lib/earlyAccess'
import { setLook, useLook, type Look } from '../lib/look'
import { PageSky } from '../components/entry/TodaySky'
import { LockCard } from '../components/settings/LockCard'
import { AutoBackupCard } from '../components/settings/AutoBackupCard'
import { SensitiveZoneCard } from '../components/settings/SensitiveZoneCard'
import { InstallCard } from '../components/install/InstallCard'
import { MedicationsSection } from '../components/settings/MedicationsSection'
import { IllnessPicker } from '../components/settings/IllnessPicker'
import { SettingsCluster, SettingsGroup } from '../components/settings/SettingsGroup'
import { SettingToggle } from '../components/settings/SettingToggle'
import { FlareImageSetting } from '../components/settings/FlareImageSetting'
import { flaresApply } from '../lib/flares'
import { ReminderSettings } from '../components/settings/ReminderSettings'
import { formatCoordinates } from '../lib/weather'
import { saveCurrentLocation } from '../lib/weatherLocation'
import { format, LANGUAGES, useTranslation } from '../i18n'
import { IndicatorPicker } from '../components/settings/IndicatorPicker'
import { TrackingStep } from '../components/setup/TrackingStep'
import { ModalSheet } from '../components/ui/ModalSheet'
import { matchesSearch, type SettingId } from '../lib/settingsSearch'

type GroupId = 'trial' | 'profile' | 'tracking' | 'help' | 'hardDays' | 'appearance' | 'data' | 'about'
type ClusterId = 'trial' | 'you' | 'app'

/** The groups, in page order, by what people come to do. */
const GROUPS: { id: GroupId; cluster: ClusterId; icon: TablerIcon; tone: string }[] = [
  { id: 'trial', cluster: 'trial', icon: IconFlask, tone: 'sleep' },
  { id: 'profile', cluster: 'you', icon: IconUser, tone: 'fog' },
  { id: 'tracking', cluster: 'you', icon: IconPencil, tone: 'cycle' },
  { id: 'help', cluster: 'you', icon: IconSparkles, tone: 'fatigue' },
  { id: 'hardDays', cluster: 'you', icon: IconHeartHandshake, tone: 'sleep' },
  { id: 'appearance', cluster: 'app', icon: IconBrush, tone: 'pain' },
  { id: 'data', cluster: 'app', icon: IconShieldLock, tone: 'mood' },
  { id: 'about', cluster: 'app', icon: IconInfoCircle, tone: 'weather' },
]
const CLUSTERS: ClusterId[] = ['trial', 'you', 'app']
/** Short names listed under a folded group's title. */
const SUMMARY_MAX = 4

/** A setting on the page: its group, the title search shows, and its card. */
interface SettingEntry {
  id: SettingId
  group: GroupId
  title: string
  node: ReactNode
}

/** `openBackup`: arrive from the backup reminder, with the data group already open.
 * `onReplayTour`: in the demo, opens the guided tour again. */
export function SettingsPage({ openBackup = false, onReplayTour }: { openBackup?: boolean; onReplayTour?: () => void }) {
  const settings = useSettings()
  const earlyAccess = useEarlyAccess()
  const look = useLook()
  const [reviewing, setReviewing] = useState(false)
  // Raised to open the data group from the lock's sheet ("Faire d'abord une sauvegarde") or the trial group's WebDAV line.
  const [backupSignal, setBackupSignal] = useState(0)
  function goToBackupSection() {
    setQuery('')
    setBackupSignal((n) => n + 1)
    requestAnimationFrame(() => document.getElementById('backup')?.scrollIntoView({ block: 'start' }))
  }
  const t = useTranslation()
  const [locating, setLocating] = useState(false)
  const [query, setQuery] = useState('')
  const searchId = useId()

  const PARENT_OPTIONS: { value: ParentGender; label: string }[] = [
    { value: 'maman', label: t.settings.parentGenderMaman },
    { value: 'papa', label: t.settings.parentGenderPapa },
  ]
  const LOOK_OPTIONS: { value: Look; label: string }[] = [
    { value: 'meteo', label: t.settings.lookMeteo },
    { value: 'leger', label: t.settings.lookLeger },
  ]
  const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
    { value: 'system', label: t.settings.themeAuto },
    { value: 'light', label: t.settings.themeLight },
    { value: 'dark', label: t.settings.themeDark },
  ]

  const hasLocation = settings.autoWeatherLat !== undefined && settings.autoWeatherLon !== undefined
  const weatherTracked = settings.enabledFactors.includes('weather')

  async function handleSetLocation() {
    setLocating(true)
    try {
      await saveCurrentLocation(settings.language)
    } catch {
      // silently ignore — the entry form's own button will surface the error when actually needed
    } finally {
      setLocating(false)
    }
  }

  const muted = { color: 'var(--color-ink-muted)' }
  const softButton = { background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }

  // Every setting shown on this device, in page order. The groups and the search both read this list.
  const all: (SettingEntry | false)[] = [
    // À l'essai: the features under test, in one place; each joins its group once it opens to everyone.
    earlyAccess && {
      id: 'physio',
      group: 'trial',
      title: t.physio.settingTitle,
      node: <SettingToggle icon={IconStretching} title={t.physio.settingTitle} helper={t.physio.settingHelper} checked={!!settings.physioTracking} onChange={(v) => updateSettings({ physioTracking: v })} />,
    },
    earlyAccess && flaresApply(settings.illnesses) && { id: 'flareImage', group: 'trial', title: t.settings.flareImage.title, node: <FlareImageSetting settings={settings} /> },
    earlyAccess &&
      !IS_DEMO && {
        id: 'webdav',
        group: 'trial',
        title: t.settings.trial.webdavTitle,
        node: (
          <Card>
            <SectionTitle icon={IconServer}>{t.settings.trial.webdavTitle}</SectionTitle>
            <p className="text-caption mb-3" style={muted}>
              {t.settings.trial.webdavText}
            </p>
            <button type="button" onClick={goToBackupSection} className="min-h-11 rounded-[var(--radius-control)] px-4 text-caption font-semibold" style={softButton}>
              {t.settings.trial.webdavOpen}
            </button>
          </Card>
        ),
      },

    // Mon profil
    {
      id: 'firstName',
      group: 'profile',
      title: t.settings.firstNameTitle,
      node: (
        <Card>
          <SectionTitle icon={IconId}>{t.settings.firstNameTitle}</SectionTitle>
          <p className="text-caption mb-2" style={muted}>
            {format(t.settings.firstNameHelper, { name: settings.displayName || '…' })}
          </p>
          <input
            key={settings.displayName}
            defaultValue={settings.displayName}
            onBlur={(e) => updateSettings({ displayName: e.target.value.trim() })}
            placeholder={t.settings.firstNamePlaceholder}
            aria-label={t.settings.firstNameTitle}
            className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
            style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
          />
        </Card>
      ),
    },
    settings.kidsTabEnabled && {
      id: 'parentGender',
      group: 'profile',
      title: t.settings.parentGenderTitle,
      node: (
        <Card>
          <SectionTitle icon={IconUsers}>{t.settings.parentGenderTitle}</SectionTitle>
          <p className="text-caption mb-3" style={muted}>
            {t.settings.parentGenderHelper}
          </p>
          <Segmented label={t.settings.parentGenderTitle} options={PARENT_OPTIONS} value={settings.parentGender} onChange={(parentGender) => updateSettings({ parentGender })} />
        </Card>
      ),
    },
    {
      id: 'illnesses',
      group: 'profile',
      title: t.settings.illnessesTitle,
      node: (
        <Card>
          <SectionTitle icon={IconStethoscope}>{t.settings.illnessesTitle}</SectionTitle>
          <p className="text-caption mb-3" style={muted}>
            {t.settings.illnessesHelper}
          </p>
          <IllnessPicker />
        </Card>
      ),
    },
    !IS_DEMO && {
      id: 'rerun',
      group: 'profile',
      title: t.setup.rerunTitle,
      node: (
        <Card>
          <SectionTitle icon={IconRefresh}>{t.setup.rerunTitle}</SectionTitle>
          <p className="text-caption mb-3" style={muted}>
            {t.setup.rerunHelper}
          </p>
          <button onClick={() => updateSettings({ onboardingDone: false })} className="rounded-[var(--radius-control)] px-4 py-2 text-caption font-semibold" style={softButton}>
            {t.setup.rerunButton}
          </button>
        </Card>
      ),
    },

    // Ce que je note
    {
      id: 'factors',
      group: 'tracking',
      title: t.settings.factorsTitle,
      node: (
        <Card>
          <SectionTitle icon={IconListCheck}>{t.settings.factorsTitle}</SectionTitle>
          <p className="text-caption mb-3" style={muted}>
            {t.settings.factorsHelper}
          </p>
          <IndicatorPicker settings={settings} earlyAccess={earlyAccess} />
          <button type="button" onClick={() => setReviewing(true)} className="mt-4 min-h-11 text-control font-semibold underline underline-offset-4" style={{ color: 'var(--color-brand)' }}>
            {t.settings.indicators.reviewButton}
          </button>
        </Card>
      ),
    },
    settings.enabledFactors.includes('medications') && {
      id: 'medications',
      group: 'tracking',
      title: t.medications.title,
      node: (
        <Card>
          <SectionTitle icon={IconPill}>{t.medications.title}</SectionTitle>
          <MedicationsSection />
        </Card>
      ),
    },
    {
      id: 'cycle',
      group: 'tracking',
      title: t.settings.cycleTracking,
      node: <SettingToggle icon={IconCalendarHeart} title={t.settings.cycleTracking} helper={t.settings.cycleTrackingHelper} checked={settings.cycleTrackingEnabled} onChange={(v) => updateSettings({ cycleTrackingEnabled: v })} />,
    },

    // Ce que l'app fait pour moi
    { id: 'reminder', group: 'help', title: t.settings.reminderTitle, node: <ReminderSettings /> },
    {
      id: 'suggestions',
      group: 'help',
      title: t.settings.suggestionsTitle,
      node: (
        <SettingToggle icon={IconSparkles} title={t.settings.suggestionsTitle} helper={t.settings.suggestionsHelper} checked={settings.suggestionsEnabled} onChange={(v) => updateSettings({ suggestionsEnabled: v })}>
          <details className="mt-2">
            <summary className="text-caption font-semibold cursor-pointer min-h-11 flex items-center" style={{ color: 'var(--color-brand)' }}>
              {t.settings.suggestionsDetail}
            </summary>
            <ul className="text-caption list-disc pl-5 space-y-1" style={muted}>
              {t.settings.suggestionsItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-caption mt-3" style={muted}>
              {t.settings.suggestionsPrivacy}
            </p>
          </details>
        </SettingToggle>
      ),
    },
    weatherTracked && {
      id: 'weatherPlace',
      group: 'help',
      title: t.settings.weatherLocationTitle,
      node: (
        <Card>
          <SectionTitle icon={IconMapPin}>{t.settings.weatherLocationTitle}</SectionTitle>
          <p className="text-caption mb-3" style={muted}>
            {!hasLocation ? t.settings.weatherLocationUnset : format(t.settings.weatherLocationSet, { label: settings.autoWeatherLabel ?? formatCoordinates(settings.autoWeatherLat!, settings.autoWeatherLon!) })}
          </p>
          <button onClick={handleSetLocation} disabled={locating} className="rounded-[var(--radius-control)] px-4 py-2 text-caption font-semibold" style={softButton}>
            {locating ? t.settings.locating : t.settings.updateLocation}
          </button>
          <p className="text-caption mt-3" style={muted}>
            {t.settings.weatherLocationCredit}
          </p>
        </Card>
      ),
    },
    weatherTracked &&
      hasLocation && {
        id: 'forecast',
        group: 'help',
        title: t.forecast.settingsTitle,
        node: (
          <SettingToggle icon={IconCloudRain} title={t.forecast.settingsTitle} helper={t.forecast.settingsHelper} checked={!!settings.forecastEnabled} onChange={(v) => updateSettings({ forecastEnabled: v })}>
            <p className="text-caption mt-2" style={muted}>
              {t.forecast.settingsPrivacy}
            </p>
          </SettingToggle>
        ),
      },

    // Les jours difficiles
    {
      id: 'hardDaysCard',
      group: 'hardDays',
      title: t.settings.hardDaysTitle,
      node: <SettingToggle icon={IconHeart} title={t.settings.hardDaysTitle} helper={t.settings.hardDaysHelper} checked={settings.hardDaysCardEnabled} onChange={(v) => updateSettings({ hardDaysCardEnabled: v })} />,
    },
    {
      id: 'lightForm',
      group: 'hardDays',
      title: t.settings.lightFormTitle,
      node: <SettingToggle icon={IconLayoutList} title={t.settings.lightFormTitle} helper={t.settings.lightFormHelper} checked={settings.lightFormEnabled} onChange={(v) => updateSettings({ lightFormEnabled: v })} />,
    },

    // Apparence
    {
      id: 'language',
      group: 'appearance',
      title: t.settings.languageTitle,
      node: (
        <Card>
          <SectionTitle icon={IconLanguage}>{t.settings.languageTitle}</SectionTitle>
          <p className="text-caption mb-3" style={muted}>
            {t.settings.languageHelper}
          </p>
          <Segmented label={t.settings.languageTitle} options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))} value={settings.language} onChange={(language) => updateSettings({ language })} />
        </Card>
      ),
    },
    {
      id: 'appearance',
      group: 'appearance',
      title: t.settings.appearanceTitle,
      node: (
        <Card>
          <SectionTitle icon={IconPalette}>{t.settings.appearanceTitle}</SectionTitle>
          <Segmented label={t.settings.themeTitle} options={THEME_OPTIONS} value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-hairline)' }}>
            <p className="text-body font-medium">{t.settings.lookLabel}</p>
            <p className="text-caption mt-0.5 mb-3" style={muted}>
              {look === 'meteo' ? t.settings.lookMeteoHelper : t.settings.lookLegerHelper}
            </p>
            <Segmented label={t.settings.lookLabel} options={LOOK_OPTIONS} value={look} onChange={setLook} />
          </div>
        </Card>
      ),
    },
    {
      id: 'kidsTab',
      group: 'appearance',
      title: t.settings.kidsTabTitle,
      node: <SettingToggle icon={IconMoodKid} title={t.settings.kidsTabTitle} helper={t.settings.kidsTabHelper} checked={settings.kidsTabEnabled} onChange={(v) => updateSettings({ kidsTabEnabled: v })} />,
    },

    // Confidentialité et données
    IS_DEMO && {
      id: 'demo',
      group: 'data',
      title: t.demo.settingsTitle,
      node: (
        <Card>
          <SectionTitle icon={IconPlayerPlay}>{t.demo.settingsTitle}</SectionTitle>
          <p className="text-caption mb-3" style={muted}>
            {t.demo.settingsText}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onReplayTour} className="min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold" style={softButton}>
              {t.demo.tourReplay}
            </button>
            <button type="button" onClick={() => void exitDemo()} className="min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold" style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}>
              {t.demo.tourExit}
            </button>
          </div>
        </Card>
      ),
    },
    !IS_DEMO && { id: 'lock', group: 'data', title: t.lockSettings.title, node: <LockCard lastBackupAt={settings.lastBackupAt} onBackupFirst={goToBackupSection} /> },
    !IS_DEMO && { id: 'autoBackup', group: 'data', title: t.autoBackup.title, node: <AutoBackupCard /> },
    !IS_DEMO && {
      id: 'backup',
      group: 'data',
      title: t.settings.backupTitle,
      node: (
        <Card>
          <SectionTitle icon={IconDatabaseExport}>{t.settings.backupTitle}</SectionTitle>
          <BackupSection />
        </Card>
      ),
    },
    !IS_DEMO && {
      id: 'audience',
      group: 'data',
      title: t.settings.audienceTitle,
      node: (
        <SettingToggle
          icon={IconChartBar}
          title={t.settings.audienceTitle}
          helper={t.settings.audienceHelper}
          checked={settings.audienceMeasurementEnabled !== false}
          onChange={(on) => {
            if (!on) clearAudienceFlag()
            void updateSettings({ audienceMeasurementEnabled: on })
          }}
        />
      ),
    },
    !IS_DEMO && { id: 'sensitive', group: 'data', title: t.sensitive.title, node: <SensitiveZoneCard /> },

    // À propos
    { id: 'about', group: 'about', title: t.about.title, node: <AboutCard withHeader /> },
    !IS_DEMO && {
      id: 'demoStart',
      group: 'about',
      title: t.demo.cardTitle,
      node: (
        <Card>
          <SectionTitle icon={IconPlayerPlay}>{t.demo.cardTitle}</SectionTitle>
          <p className="text-caption mb-3" style={muted}>
            {t.demo.cardText}
          </p>
          <button type="button" onClick={() => startDemo(settings.language)} className="min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold" style={softButton}>
            {t.demo.cardButton}
          </button>
        </Card>
      ),
    },
    {
      id: 'audienceDetail',
      group: 'about',
      title: t.settings.audienceDetail.title,
      node: (
        <Card>
          <SectionTitle icon={IconChartBar}>{t.settings.audienceDetail.title}</SectionTitle>
          <ul className="flex flex-col gap-2 text-caption leading-relaxed" style={muted}>
            {t.settings.audienceDetail.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      ),
    },
    { id: 'sources', group: 'about', title: t.sources.title, node: <SourcesCard /> },
    {
      id: 'privacy',
      group: 'about',
      title: t.settings.privacyTitle,
      node: (
        <Card>
          <p className="text-caption leading-relaxed" style={muted}>
            {t.settings.privacyNote}
          </p>
          <p className="text-caption leading-relaxed mt-2" style={muted}>
            {t.settings.notMedicalDevice}
          </p>
        </Card>
      ),
    },
  ]
  const entries = all.filter((e): e is SettingEntry => !!e)

  const groupTitle = (g: GroupId) => t.settings.groups[g]
  const clusterTitle = (c: ClusterId) => (c === 'trial' ? t.settings.clusterTrial : c === 'you' ? t.settings.clusterYou : t.settings.clusterApp)
  const clusterOf = (g: GroupId) => GROUPS.find((x) => x.id === g)!.cluster

  // Under a folded group's title, what is inside it rather than its values.
  const summaryOf = (list: SettingEntry[]) => {
    const names = list.map((e) => t.settings.short[e.id])
    return names.length > SUMMARY_MAX ? `${names.slice(0, SUMMARY_MAX).join(' · ')}…` : names.join(' · ')
  }

  const searching = query.trim().length > 0
  const results = searching ? entries.filter((e) => matchesSearch(query, [e.title, t.settings.short[e.id], t.settings.keywords[e.id], groupTitle(e.group)])) : []

  return (
    <div className="relative isolate flex flex-col gap-4 px-4 pt-4 pb-28">
      <PageSky />
      <h1 className="page-title dawn-title text-title font-semibold px-1">{t.settings.title}</h1>

      <div className="relative" role="search">
        <IconSearch size={20} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={muted} />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.settings.search.placeholder}
          aria-label={t.settings.search.label}
          autoComplete="off"
          className="w-full min-h-12 rounded-[var(--radius-control)] pl-11 pr-12 text-body outline-none [&::-webkit-search-cancel-button]:hidden"
          style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
        />
        {searching && (
          <button type="button" onClick={() => setQuery('')} aria-label={t.settings.search.clear} className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center" style={muted}>
            <IconX size={20} aria-hidden />
          </button>
        )}
      </div>

      {searching ? (
        <section aria-label={t.settings.search.label} className="flex flex-col gap-3">
          <p role="status" className="text-caption px-1" style={muted}>
            {results.length ? format(results.length === 1 ? t.settings.search.resultsOne : t.settings.search.resultsOther, { n: results.length }) : t.settings.search.none}
          </p>
          {results.map((e) => (
            <div key={e.id} className="flex flex-col gap-1.5">
              <p className="text-caption font-semibold uppercase tracking-wide px-1" style={{ color: 'var(--color-brand)' }}>
                {clusterTitle(clusterOf(e.group))} › {groupTitle(e.group)}
              </p>
              {e.node}
            </div>
          ))}
        </section>
      ) : (
        CLUSTERS.map((c) => {
          const groups = GROUPS.filter((g) => g.cluster === c).map((g) => ({ ...g, list: entries.filter((e) => e.group === g.id) })).filter((g) => g.list.length > 0)
          if (!groups.length) return null
          return (
            <SettingsCluster key={c} title={clusterTitle(c)}>
              {groups.map((g) => (
                <SettingsGroup
                  key={g.id}
                  id={g.id === 'data' ? 'backup' : undefined}
                  icon={g.icon}
                  tone={g.tone}
                  title={groupTitle(g.id)}
                  summary={summaryOf(g.list)}
                  defaultOpen={g.id === 'data' && openBackup}
                  openSignal={g.id === 'data' ? backupSignal : 0}
                >
                  {g.list.map((e) => (
                    <Fragment key={e.id}>{e.node}</Fragment>
                  ))}
                  {g.id === 'trial' && (
                    <Card>
                      <p className="text-caption" style={muted}>
                        {t.settings.trial.others}
                      </p>
                      <p className="text-caption mt-2" style={muted}>
                        {t.settings.trial.note}
                      </p>
                      <button type="button" onClick={() => setEarlyAccess(false)} className="mt-2 min-h-11 text-control font-semibold underline underline-offset-4" style={{ color: 'var(--color-brand)' }}>
                        {t.settings.trial.leave}
                      </button>
                    </Card>
                  )}
                </SettingsGroup>
              ))}
            </SettingsCluster>
          )
        })
      )}

      {!searching && !IS_DEMO && <InstallCard />}

      {reviewing && (
        <ModalSheet title={t.settings.indicators.reviewTitle} closeLabel={t.settings.indicators.reviewClose} onClose={() => setReviewing(false)}>
          {/* The setup's own choice, with nothing pre-selected: what is followed stays as it is. */}
          <TrackingStep heading={null} intro={null} hint={null} applied={null} firstPass={false} />
        </ModalSheet>
      )}

      {!searching && !IS_DEMO && <SupportCard />}

      <Footer />
    </div>
  )
}
