// THROWAWAY: static mockups of the next screens, drawn with the app's real components and tokens. Never committed.
import { createRoot } from 'react-dom/client'
import '../index.css'
import { I18nProvider } from '../i18n/I18nProvider'
import { Card, SectionTitle } from '../components/ui/Card'
import { PRIMARY, SECONDARY, BUTTON } from '../components/today/cardStyles'
import { IconBath, IconCalendar, IconChartLine, IconChevronLeft, IconClockHour4, IconHeart, IconHeartbeat, IconLeaf, IconMessageHeart, IconPlayerPlay, IconStar, IconStarFilled, IconStethoscope, IconWalk, IconWind, IconPlus, IconYoga, IconNotebook, IconUsers, IconX, type Icon } from '@tabler/icons-react'

const dark = location.search.includes('dark')
if (dark) document.documentElement.setAttribute('data-theme', 'dark')

const MARKER =
  'linear-gradient(transparent 58%, color-mix(in srgb, var(--color-weather-1) 45%, transparent) 58%, color-mix(in srgb, var(--color-weather-1) 45%, transparent) 92%, transparent 92%)'

function TabBar({ active }: { active: string }) {
  const tabs: { id: string; label: string; I: Icon }[] = [
    { id: 'today', label: 'Aujourd’hui', I: IconHeartbeat },
    { id: 'journal', label: 'Journal', I: IconCalendar },
    { id: 'trends', label: 'Tendances', I: IconChartLine },
    { id: 'soulager', label: 'Soulager', I: IconWind },
    { id: 'consultation', label: 'Consultation', I: IconStethoscope },
  ]
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40" style={{ borderTop: '1px solid var(--color-hairline)', background: 'var(--color-surface)' }}>
      <div className="max-w-[560px] mx-auto flex">
        {tabs.map(({ id, label, I }) => {
          const on = id === active
          return (
            <div key={id} className="flex-1 flex flex-col items-center gap-0.5 py-2.5" style={{ color: on ? 'var(--color-brand)' : 'var(--color-ink-muted)' }}>
              <span className="relative" style={{ background: on ? 'var(--tab-pill, transparent)' : undefined, borderRadius: 999, padding: 'var(--tab-pill-pad, 0)', margin: 'var(--tab-pill-margin, 0)' }}>
                <I size={22} stroke={on ? 2.2 : 1.8} />
              </span>
              <span className="text-[11px] font-medium">{label}</span>
            </div>
          )
        })}
      </div>
    </nav>
  )
}

function Back({ label = 'Aujourd’hui' }: { label?: string }) {
  return (
    <div className="px-4 pt-3">
      <span className="inline-flex items-center gap-1 min-h-11 -ml-2 pr-3 text-control font-semibold" style={{ color: 'var(--color-brand)' }}>
        <IconChevronLeft size={20} aria-hidden />
        {label}
      </span>
    </div>
  )
}

function Btn({ children, primary, icon: I }: { children: React.ReactNode; primary?: boolean; icon?: Icon }) {
  return (
    <span className={`${BUTTON} inline-flex items-center gap-2`} style={primary ? PRIMARY : SECONDARY}>
      {I && <I size={18} stroke={1.8} aria-hidden />}
      {children}
    </span>
  )
}

function Round({ icon: I }: { icon: Icon }) {
  return (
    <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }}>
      <I size={20} stroke={1.8} />
    </span>
  )
}

const PLAN = [
  ['Ce que je m’autorise', 'Ne rien faire d’autre que noter ma douleur. Les courses peuvent attendre.'],
  ['Ce qui m’aide', 'La bouillotte, un bain chaud, ma série légère, le canapé.'],
  ['Qui prévenir', 'Léa, 06 12 34 56 78 — si ça dure plus de trois jours.'],
  ['À ne pas oublier', 'Mon traitement du soir. Boire un grand verre d’eau.'],
]

function Today() {
  return (
    <>
      <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
        <div className="px-1">
          <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>Jeudi 12 novembre</p>
          <h1 className="text-title font-bold leading-tight">Aujourd’hui</h1>
        </div>
        <section className="relative flex gap-3 rounded-[var(--radius-card)] py-3.5 pl-3.5 pr-12" style={{ background: 'var(--color-brand-soft)', boxShadow: 'var(--tint-edge, none)' }}>
          <Round icon={IconHeart} />
          <div className="min-w-0">
            <p className="text-body font-semibold">Ces derniers jours ont été plus durs.</p>
            <p className="text-body">Prends soin de toi : noter ta douleur suffit aujourd’hui.</p>
            <p className="text-heading font-medium mt-3 leading-[1.7]">
              Ce qui t’a déjà fait du bien : <mark className="font-bold px-0.5" style={{ color: 'inherit', background: MARKER }}>repos / sieste</mark>, <mark className="font-bold px-0.5" style={{ color: 'inherit', background: MARKER }}>bain chaud</mark> ou <mark className="font-bold px-0.5" style={{ color: 'inherit', background: MARKER }}>méditation / respiration</mark>.
            </p>
            <div className="flex flex-col items-start gap-1 mt-2">
              <span className="text-control font-semibold underline underline-offset-2 min-h-11 inline-flex items-center" style={{ color: 'var(--color-brand)' }}>Ouvrir mon plan</span>
              <span className="text-control font-semibold underline underline-offset-2 min-h-11 inline-flex items-center" style={{ color: 'var(--color-brand)' }}>Un moment pour souffler</span>
            </div>
          </div>
          <span className="absolute top-0.5 right-0.5 w-10 h-10 flex items-center justify-center" style={{ color: 'var(--color-ink-muted)' }}><IconX size={16} /></span>
        </section>
        <Card>
          <div className="flex items-center justify-between"><span className="text-body font-semibold">Douleur</span><span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>Saisi à 19:01</span></div>
          <p className="text-caption mt-1" style={{ color: 'var(--color-ink-muted)' }}>Sur toute ta journée, pas seulement maintenant</p>
          <p className="mt-2"><span className="text-display font-bold">7</span> <span className="text-body" style={{ color: 'var(--color-ink-muted)' }}>/ 10</span></p>
        </Card>
      </div>
      <TabBar active="today" />
    </>
  )
}

function Plan() {
  return (
    <>
      <Back />
      <div className="flex flex-col gap-4 px-4 pt-2 pb-28">
        <div className="px-1">
          <h1 className="text-title font-bold leading-tight">Mon plan des jours difficiles</h1>
          <p className="text-body mt-1" style={{ color: 'var(--color-ink-muted)' }}>Écrit par toi, pour toi. Il revient dans le mot doux les jours plus durs. Il reste sur ton téléphone.</p>
        </div>
        {PLAN.map(([t, x]) => (
          <Card key={t}>
            <h2 className="text-caption font-semibold" style={{ color: 'var(--color-ink-muted)' }}>{t}</h2>
            <p className="text-heading leading-relaxed mt-1">{x}</p>
          </Card>
        ))}
        <div className="flex flex-wrap gap-2">
          <Btn primary>Modifier mon plan</Btn>
          <Btn icon={IconWind}>Un moment pour souffler</Btn>
        </div>
      </div>
      <TabBar active="today" />
    </>
  )
}

const field = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }
function PlanEdit() {
  return (
    <>
      <Back label="Mon plan" />
      <div className="flex flex-col gap-4 px-4 pt-2 pb-28">
        <div className="px-1">
          <h1 className="text-title font-bold leading-tight">Écrire mon plan</h1>
          <p className="text-body mt-1" style={{ color: 'var(--color-ink-muted)' }}>Quelques mots suffisent. Tu peux laisser une rubrique vide.</p>
        </div>
        <Card>
          <div className="flex flex-col gap-4">
            {PLAN.map(([t, x], i) => (
              <label key={t} className="block">
                <span className="block text-caption font-semibold mb-1">{t}</span>
                <div className="w-full rounded-xl px-3.5 py-2.5 text-body" style={{ ...field, minHeight: 64, color: i === 3 ? 'var(--color-ink-muted)' : 'var(--color-ink)' }}>{i === 3 ? 'Mon traitement du soir…' : x}</div>
              </label>
            ))}
          </div>
        </Card>
        <div className="flex gap-2"><Btn primary>Enregistrer</Btn><Btn>Annuler</Btn></div>
      </div>
      <TabBar active="today" />
    </>
  )
}

function Soulager() {
  return (
    <>
      <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
        <div className="px-1">
          <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>Pour toi, quand tu en as besoin</p>
          <h1 className="text-title font-bold leading-tight">Soulager</h1>
        </div>
        <section className="flex gap-3 rounded-[var(--radius-card)] py-3.5 px-3.5" style={{ background: 'var(--color-brand-soft)', boxShadow: 'var(--tint-edge, none)' }}>
          <Round icon={IconMessageHeart} />
          <div className="min-w-0">
            <p className="text-body font-semibold">Mon plan des jours difficiles</p>
            <p className="text-body" style={{ color: 'var(--color-ink-muted)' }}>Ne rien faire d’autre que noter… </p>
            <div className="mt-2"><Btn>Ouvrir mon plan</Btn></div>
          </div>
        </section>
        <Card>
          <SectionTitle icon={IconWind}>Respirer et se détendre</SectionTitle>
          <div className="flex flex-col gap-2">
            {[[IconWind, 'Respirer lentement', '1, 3 ou 5 minutes'], [IconLeaf, 'Relâcher le corps, zone par zone', '5 étapes, à ton rythme'], [IconYoga, 'Un geste doux pour la nuque et les épaules', '4 gestes lents']].map(([I, t, h]) => {
              const Ic = I as Icon
              return (
                <div key={t as string} className="flex items-center gap-3 rounded-[var(--radius-control)] p-3 min-h-11" style={{ background: 'var(--color-brand-soft)' }}>
                  <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }}><Ic size={20} stroke={1.8} /></span>
                  <span><span className="block text-body font-semibold">{t as string}</span><span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>{h as string}</span></span>
                </div>
              )
            })}
          </div>
        </Card>
        <Card>
          <SectionTitle icon={IconStarFilled}>Mes gestes</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {[[IconBath, 'Bain chaud', '15 min'], [IconWalk, 'Marche courte', '10 min'], [IconYoga, 'Étirements', '8 min']].map(([I, t, d]) => {
              const Ic = I as Icon
              return (
                <div key={t as string} className="rounded-[var(--radius-card)] p-2.5 flex flex-col items-center text-center gap-1" style={{ background: 'var(--color-brand-soft)' }}>
                  <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }}><Ic size={20} stroke={1.8} /></span>
                  <span className="text-caption font-semibold leading-tight">{t as string}</span>
                  <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>{d as string}</span>
                </div>
              )
            })}
          </div>
          <p className="text-control font-semibold underline underline-offset-2 mt-3" style={{ color: 'var(--color-brand)' }}>Voir et choisir mes gestes</p>
        </Card>
      </div>
      <TabBar active="soulager" />
    </>
  )
}

function Gestes() {
  const rows: [Icon, string, string, boolean][] = [[IconBath, 'Bain chaud', '5 fois', true], [IconWalk, 'Marche courte', '4 fois', true], [IconYoga, 'Étirements doux', '3 fois', true], [IconLeaf, 'Repos / sieste', '3 fois', false], [IconStethoscope, 'Kiné / soins', '2 fois', false]]
  return (
    <>
      <Back label="Soulager" />
      <div className="flex flex-col gap-4 px-4 pt-2 pb-28">
        <div className="px-1">
          <h1 className="text-title font-bold leading-tight">Mes gestes</h1>
          <p className="text-body mt-1" style={{ color: 'var(--color-ink-muted)' }}>Choisis les trois à cinq qui t’aident, et la durée qui te convient. D’après ce que tu as noté.</p>
        </div>
        <Card>
          <ul className="flex flex-col">
            {rows.map(([I, t, n, on]) => (
              <li key={t} className="flex items-center gap-3 py-2.5 border-t first:border-t-0" style={{ borderColor: 'var(--color-hairline)' }}>
                <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}><I size={20} stroke={1.8} /></span>
                <span className="flex-1 min-w-0"><span className="block text-body font-semibold">{t}</span><span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>{on ? `Noté ${n} · ${t.includes('Bain') ? '15' : t.includes('Marche') ? '10' : '8'} min` : `Noté ${n}`}</span></span>
                <span className="min-h-11 min-w-11 flex items-center justify-center" style={{ color: on ? 'var(--color-brand)' : 'var(--color-ink-muted)' }}>{on ? <IconStarFilled size={22} /> : <IconStar size={22} />}</span>
              </li>
            ))}
          </ul>
          <p className="text-control font-semibold underline underline-offset-2 mt-2 inline-flex items-center gap-1" style={{ color: 'var(--color-brand)' }}><IconPlus size={16} />Ajouter un geste</p>
        </Card>
        <p className="text-caption px-1" style={{ color: 'var(--color-ink-muted)' }}>Les durées sont les tiennes : OUCH n’en recommande aucune.</p>
      </div>
      <TabBar active="soulager" />
    </>
  )
}

function Timer({ done }: { done?: boolean }) {
  const r = 84
  const c = 2 * Math.PI * r
  return (
    <>
      <Back label="Mes gestes" />
      <div className="flex flex-col gap-4 px-4 pt-2 pb-28">
        <div className="px-1">
          <h1 className="text-title font-bold leading-tight">Marche courte</h1>
          <p className="text-body mt-1" style={{ color: 'var(--color-ink-muted)' }}>{done ? 'Voilà, c’est fini. Bravo de t’être accordé ce moment.' : 'Va doucement, à ton rythme. Tu peux arrêter quand tu veux.'}</p>
        </div>
        <Card>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="absolute inset-0" aria-hidden>
                <circle cx="100" cy="100" r={r} fill="none" stroke="var(--color-brand-soft)" strokeWidth="10" />
                <circle cx="100" cy="100" r={r} fill="none" stroke="var(--color-brand)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={done ? 0 : c * 0.4} transform="rotate(-90 100 100)" />
              </svg>
              <div className="text-center">
                <p className="text-display font-bold tabular-nums">{done ? '0:00' : '6:02'}</p>
                <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>{done ? 'terminé' : 'sur 10 min'}</p>
              </div>
            </div>
            {done ? (
              <>
                <Btn primary icon={IconPlus}>Ajouter à « ce qui a aidé » aujourd’hui</Btn>
                <Btn>Recommencer</Btn>
              </>
            ) : (
              <Btn icon={IconClockHour4}>Arrêter</Btn>
            )}
            <p className="text-caption text-center" style={{ color: 'var(--color-ink-muted)' }}>{done ? 'Rien n’est ajouté sans ton geste.' : 'L’écran reste allumé pendant le minuteur.'}</p>
          </div>
        </Card>
      </div>
      <TabBar active="soulager" />
    </>
  )
}
void IconPlayerPlay; void IconNotebook; void IconUsers

const screens: Record<string, () => React.ReactElement> = { today: Today, plan: Plan, planedit: PlanEdit, soulager: Soulager, gestes: Gestes, timer: () => <Timer />, done: () => <Timer done /> }
const Screen = screens[location.hash.slice(1)] ?? Today
createRoot(document.getElementById('root')!).render(<I18nProvider language="fr"><Screen /></I18nProvider>)
