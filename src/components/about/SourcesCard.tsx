import { Card, SectionTitle } from '../ui/Card'
import { format, useTranslation } from '../../i18n'
import { REFERENCES } from '../../lib/references'

/**
 * The scientific references behind the report and its benchmarks, each with
 * a short summary and what OUCH takes from it. Collapsed by default: fifteen
 * entries is a lot to scroll past on the settings page.
 */
export function SourcesCard() {
  const t = useTranslation()
  const s = t.sources
  return (
    <Card>
      <SectionTitle>{s.title}</SectionTitle>
      <p className="text-caption leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
        {s.intro}
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer text-control font-semibold" style={{ color: 'var(--color-brand)' }}>
          {format(s.toggle, { n: REFERENCES.length })}
        </summary>
        {/* role="list": Safari drops the list semantics of `list-none` lists */}
        <ol role="list" className="flex flex-col gap-4 mt-3 list-none">
          {REFERENCES.map((r, i) => (
            <li key={r.citation} className="flex gap-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold"
                style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                  {r.citation}
                </p>
                <p className="text-control leading-relaxed mt-1">{s.items[i].summary}</p>
                <p className="text-control leading-relaxed mt-1">
                  <span className="font-semibold">{s.inOuch}</span> {s.items[i].usage}
                </p>
                {r.pmid && (
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 text-caption underline"
                    style={{ color: 'var(--color-brand)' }}
                  >
                    {s.pubmed}
                    <span className="sr-only"> ({i + 1})</span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="text-caption leading-relaxed mt-4" style={{ color: 'var(--color-ink-muted)' }}>
          {s.note}
        </p>
      </details>
    </Card>
  )
}
