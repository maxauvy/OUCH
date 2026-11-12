// The little round friend of the relaxing exercise: one picture per step. Drawn
// by hand in SVG (light, offline, no file). Decorative: the words of the step
// say everything, so the picture is hidden from screen readers. The friend stays
// white with a dark face in both themes; only the sky behind it follows the theme.

const INK = '#2b4a62'
const CHEEK = '#f2b8c0'
const LAV = '#c9b8e6'
const SKY = '#7fa5c2'
const SPARK = '#ffffff'

function Friend({ cx, cy, r, eyes, mouth, children }: { cx: number; cy: number; r: number; eyes: 'open' | 'closed'; mouth: 'smile' | 'o' | 'calm'; children?: React.ReactNode }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy + r * 0.9} rx={r * 0.9} ry={5} fill={SKY} opacity={0.3} />
      <path d={`M${cx - r} ${cy + r * 0.8} C${cx - r} ${cy - r * 1.1} ${cx + r} ${cy - r * 1.1} ${cx + r} ${cy + r * 0.8} Z`} fill="#fff" />
      <circle cx={cx - r * 0.55} cy={cy + 6} r={5} fill={CHEEK} opacity={0.6} />
      <circle cx={cx + r * 0.55} cy={cy + 6} r={5} fill={CHEEK} opacity={0.6} />
      {eyes === 'open' ? (
        <>
          <circle cx={cx - 11} cy={cy - 4} r={3.2} fill={INK} />
          <circle cx={cx + 11} cy={cy - 4} r={3.2} fill={INK} />
        </>
      ) : (
        <path d={`M${cx - 16} ${cy - 4} q5 5 10 0 M${cx + 6} ${cy - 4} q5 5 10 0`} stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      )}
      {mouth === 'smile' && <path d={`M${cx - 8} ${cy + 8} q8 7 16 0`} stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />}
      {mouth === 'o' && <ellipse cx={cx} cy={cy + 10} rx={5} ry={6} fill={INK} opacity={0.8} />}
      {mouth === 'calm' && <path d={`M${cx - 6} ${cy + 10} h12`} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />}
      {children}
    </g>
  )
}

/** Step 0 to 4: settle, jaw, shoulders, hands, belly. */
export function ReliefIllustration({ step }: { step: number }) {
  return (
    <svg viewBox="0 0 200 150" width="100%" aria-hidden focusable="false" className="block rounded-[var(--radius-card)]" style={{ background: 'var(--color-brand-soft)' }}>
      <circle cx="30" cy="30" r="2" fill={SPARK} opacity={0.8} />
      <circle cx="170" cy="40" r="2.5" fill={SPARK} opacity={0.8} />
      <circle cx="160" cy="120" r="2" fill={SPARK} opacity={0.7} />
      {step === 0 && (
        <>
          <rect x="40" y="96" width="120" height="30" rx="15" fill={LAV} />
          <Friend cx={100} cy={78} r={30} eyes="closed" mouth="smile" />
          <text x="150" y="42" fontSize="13" fill="#0d5c8c" opacity={0.8}>
            z z
          </text>
        </>
      )}
      {step === 1 && (
        <Friend cx={100} cy={76} r={36} eyes="closed" mouth="o">
          <path d="M146 62 q10 -4 14 4 M150 50 q8 -3 12 3" stroke={SKY} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </Friend>
      )}
      {step === 2 && (
        <Friend cx={100} cy={78} r={34} eyes="closed" mouth="calm">
          <path d="M58 100 q-2 -12 4 -16 M142 100 q2 -12 -4 -16" stroke="#0d5c8c" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M52 76 v18 m-5 -6 l5 7 l5 -7 M148 76 v18 m-5 -6 l5 7 l5 -7" stroke={SKY} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Friend>
      )}
      {step === 3 && (
        <Friend cx={100} cy={70} r={30} eyes="open" mouth="smile">
          <circle cx="58" cy="108" r="12" fill="#fff" />
          <circle cx="142" cy="108" r="12" fill="#fff" />
          <path d="M52 104 l-5 -6 M58 102 v-8 M64 104 l5 -6 M136 104 l-5 -6 M142 102 v-8 M148 104 l5 -6" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </Friend>
      )}
      {step === 4 && (
        <Friend cx={100} cy={70} r={32} eyes="closed" mouth="smile">
          <circle cx="100" cy="100" r="13" fill={CHEEK} opacity={0.7} />
          <path d="M92 100 q8 -6 16 0" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
        </Friend>
      )}
    </svg>
  )
}
