import { useId, useRef, useState } from 'react'
import { updateSettings } from '../../db'
import { useSettings } from '../../hooks/useSettings'
import { format, useLanguage, useTranslation } from '../../i18n'
import { downloadBlob } from '../../lib/backup'
import { cardToPng } from '../../lib/cardImage'
import { helperIn } from '../../lib/careSheet'
import { MAX_WISH, cleanWish, type YearReview } from '../../lib/yearReview'
import { CORAL, INK, MUTED } from './yearStyle'
import { Confetti, YearSky } from './YearStory'

/**
 * The card of the year, at the end of the story: the sky, up to four good
 * news the journal holds, and a line for the year to come that the person
 * writes. Kept as an image, or shared, from the phone; nothing is sent.
 */
export function YearCard({ review, onBack }: { review: YearReview; onBack: () => void }) {
  const t = useTranslation().year
  const language = useLanguage()
  const settings = useSettings()
  const id = useId()
  const cardRef = useRef<HTMLDivElement>(null)
  const next = review.year + 1
  const stored = settings.yearWish?.year === review.year ? settings.yearWish.text : ''
  const [wish, setWish] = useState(stored)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const f = (template: string, vars: Record<string, string | number>) => format(template, vars, language)
  const name = settings.displayName.trim()

  // Up to four tiles, only what the journal holds, in this order.
  const tiles: [string, string][] = []
  if (review.flares.length) tiles.push([f(t.tileFlares, { n: review.flares.length }), f(t.tileFlaresSub, { n: review.flares.length })])
  if (review.calm) tiles.push([f(t.tileCalm, { n: review.calm.days }), t.tileCalmSub])
  if (review.helped[0]) tiles.push([helperIn(review.helped[0].label, language), t.tileHelpedSub])
  if (review.trials.length) tiles.push([f(t.tileTrials, { n: review.trials.length }), review.trials.join(', ').toLocaleLowerCase(language)])
  if (review.wroteNote) tiles.push([t.tileNote, t.tileNoteSub])
  const shown = tiles.slice(0, 4)

  const keepWish = (text: string) => {
    const clean = cleanWish(text)
    void updateSettings({ yearWish: clean ? { year: review.year, text: clean } : undefined })
  }

  const share = async () => {
    if (!cardRef.current) return
    setBusy(true)
    setFailed(false)
    try {
      keepWish(wish)
      const blob = await cardToPng(cardRef.current)
      const file = new File([blob], `${f(t.cardKicker, { year: review.year }).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: f(t.cardKicker, { year: review.year }) })
          return
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
        }
      }
      downloadBlob(blob, file.name)
    } catch (e) {
      console.error(e)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pb-10" style={{ paddingTop: 'calc(var(--root-pad-top, 0px) + 76px)' }}>
      <div className="mx-auto max-w-[400px]">
        <div ref={cardRef} className="relative overflow-hidden rounded-[28px] px-5 pt-5 pb-5" style={{ background: '#fffdfb', color: INK, boxShadow: '0 18px 50px rgba(44,40,96,.18)' }}>
          <div aria-hidden className="absolute inset-x-0 top-0 h-[170px]" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #ffe3d1, #f3e6fa 60%, transparent)' }} />
          <Confetti n={14} seed={9} x={[66, 96]} y={[3, 14]} />
          <div className="relative">
            <p className="m-0 text-[12px] font-bold tracking-[0.1em] uppercase" style={{ color: CORAL }}>
              {name ? f(t.cardKickerNamed, { year: review.year, name }) : f(t.cardKicker, { year: review.year })}
            </p>
            <h2 className="m-0 mt-1 mb-4 text-[30px] leading-[1.1] font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>
              {review.gentle > 0 ? f(t.cardTitle, { n: review.logged, g: review.gentle }) : f(t.cardTitleNoGentle, { n: review.logged })}
            </h2>
            <YearSky days={review.days} size={review.days.length <= 100 ? 15 : review.days.length <= 200 ? 11 : 8} />
            {shown.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                {shown.map(([a, b]) => (
                  <div key={a} className="rounded-2xl p-3 min-w-0" style={{ background: '#f6f0fb' }}>
                    <p className="m-0 text-[20px] font-extrabold leading-tight break-words" style={{ fontFamily: 'var(--font-display)' }}>
                      {a}
                    </p>
                    <p className="m-0 mt-0.5 text-[13px] break-words" style={{ color: MUTED }}>
                      {b}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {wish.trim() && (
              <p className="m-0 mt-4 text-[16px] leading-[1.45] text-center">
                {f(t.wishLabel, { next })} <i>{wish.trim()}</i>
              </p>
            )}
          </div>
        </div>

        <label htmlFor={id} className="block mt-5 mb-1.5 text-[14px] font-semibold">
          {f(t.wishHint, { next })}
        </label>
        <input
          id={id}
          value={wish}
          maxLength={MAX_WISH}
          placeholder={t.wishPlaceholder}
          onChange={(e) => setWish(e.target.value)}
          onBlur={() => keepWish(wish)}
          className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
          style={{ background: '#fff', color: INK, boxShadow: 'inset 0 0 0 1px #d9d0e6' }}
        />
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          <button type="button" onClick={() => void share()} disabled={busy} className="min-h-12 px-5 rounded-full text-control font-semibold disabled:opacity-60" style={{ background: '#2c2860', color: '#fff' }}>
            {busy ? t.making : t.share}
          </button>
          <button type="button" onClick={onBack} className="min-h-12 px-5 rounded-full text-control font-semibold" style={{ background: 'rgba(255,255,255,.75)', color: '#2c2860' }}>
            {t.back}
          </button>
        </div>
        <p role="alert" className="m-0 mt-3 text-center text-[14px]" style={{ color: CORAL }}>
          {failed ? t.failed : ''}
        </p>
      </div>
    </div>
  )
}
