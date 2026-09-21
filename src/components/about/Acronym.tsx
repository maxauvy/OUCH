const WORDS = ['Ouch', 'Understand', 'Chart', 'Heal']

/** "Ouch, Understand, Chart, Heal" with each initial highlighted so the O-U-C-H reads at a glance. */
export function Acronym({ className = '' }: { className?: string }) {
  return (
    <p className={className} style={{ color: 'var(--color-ink-muted)' }}>
      {WORDS.map((word, i) => (
        <span key={word}>
          <span className="font-bold" style={{ color: 'var(--color-brand)' }}>
            {word[0]}
          </span>
          {word.slice(1)}
          {i < WORDS.length - 1 && ', '}
        </span>
      ))}
    </p>
  )
}
