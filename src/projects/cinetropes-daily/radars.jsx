import { useEffect, useId, useRef } from 'react'

// The film page's three signature radars as the daily shows them, in the 128 units of their xx-lg glyphs.
// Each glyph opens the app's glass tooltip; the tooltip is a native popover, so Escape and outside clicks close it

const D = 128
const C = D / 2

const polar = (radius, degrees) => {
  const angle = ((degrees - 90) * Math.PI) / 180
  return { x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle) }
}

const ring = (sides, radius) => Array.from({ length: sides }, (_, i) => polar(radius, (i * 360) / sides))
const points = (vertices) => vertices.map(({ x, y }) => `${x},${y}`).join(' ')
const clip = (vertices) => `polygon(${vertices.map(({ x, y }) => `${(x / D) * 100}% ${(y / D) * 100}%`).join(', ')})`
const levels = (max) => [1, 2, 3, 4, 5].map((i) => ({ radius: (i / 5) * max, even: i % 2 === 1 }))

const Glyph = ({ label, name, tip, wide, children }) => {
  const id = `cd-tip-${useId().replace(/:/g, '')}`
  const anchor = useRef(null)
  const popover = useRef(null)

  // Above the glyph when it fits, below otherwise, kept inside the viewport
  useEffect(() => {
    const tip = popover.current

    const place = (event) => {
      if (event.newState !== 'open') {
        return
      }

      const rect = anchor.current.getBoundingClientRect()
      const half = tip.offsetWidth / 2
      const above = rect.top >= tip.offsetHeight + 12
      tip.style.left = `${Math.min(Math.max(rect.left + rect.width / 2, half + 12), innerWidth - half - 12)}px`
      tip.style.top = `${above ? rect.top - tip.offsetHeight - 12 : rect.bottom + 12}px`
    }

    tip.addEventListener('toggle', place)
    return () => tip.removeEventListener('toggle', place)
  }, [])

  return (
    <figure className='cd__signature-item'>
      <figcaption>{label}</figcaption>
      <button ref={anchor} type='button' className='cd__glyph' aria-label={name} popovertarget={id}>
        {children}
      </button>
      <div ref={popover} id={id} popover='auto' className={wide ? 'cd__tip cd__tip--wide' : 'cd__tip'}>
        {tip}
      </div>
    </figure>
  )
}

const Rows = ({ rows }) => (
  <ul className='cd__tip-rows'>
    {rows.map(({ key, color, label, word, value }) => (
      <li key={key}>
        <i style={{ backgroundColor: color }} />
        <span>{label}<small>{word}</small></span>
        <span className='cd__tip-bar'><b style={{ width: `${(value / 5) * 100}%`, backgroundColor: color }} /></span>
        <data value={value}>{value.toFixed(1)}</data>
      </li>
    ))}
  </ul>
)

const TRIFORCE = {
  critic: { label: 'Critic', color: '#F5C518', angle: 0, impact: ['Snubbed', 'Respected', 'Acclaimed'] },
  nerd: { label: 'Nerd', color: '#00E054', angle: 120, impact: ['Overlooked', 'Recognised', 'Cult'] },
  public: { label: 'Public', color: '#FA320A', angle: 240, impact: ['Ignored', 'Liked', 'Popular'] },
}

const AXES = ['critic', 'nerd', 'public']
const impactOf = (axis, score) => TRIFORCE[axis].impact[score <= 1.5 ? 0 : score <= 3.5 ? 1 : 2]

export const Reception = ({ scores }) => {
  const max = D * 0.38
  const vertices = AXES.map((axis) => polar((scores[axis] / 5) * max, TRIFORCE[axis].angle))
  const rows = ['critic', 'public', 'nerd'].map((key) => ({ key, ...TRIFORCE[key], word: impactOf(key, scores[key]), value: scores[key] }))

  return (
    <Glyph label='Reception' name={`Reception: ${rows.map(({ label, value }) => `${label.toLowerCase()} ${value.toFixed(1)}`).join(', ')} out of 5`} tip={<Rows rows={rows} />}>
      <svg viewBox={`0 0 ${D} ${D}`} aria-hidden='true'>
        {levels(max).map(({ radius, even }) => (
          <polygon key={radius} points={points(AXES.map((key) => polar(radius, TRIFORCE[key].angle)))} fill='none' stroke='white' opacity={even ? 0.12 : 0.06} vectorEffect='non-scaling-stroke' />
        ))}
        <polygon points={points(vertices)} fill='none' stroke='white' strokeOpacity='0.35' strokeWidth='1.5' strokeLinejoin='round' vectorEffect='non-scaling-stroke' />
      </svg>
      <span className='cd__fill' style={{ clipPath: clip(vertices), background: `conic-gradient(from 0deg at 50% 50%, ${TRIFORCE.critic.color}, ${TRIFORCE.nerd.color} 120deg, ${TRIFORCE.public.color} 240deg, ${TRIFORCE.critic.color})` }} />
      {AXES.map((key) => {
        const at = polar(max + D * 0.12, TRIFORCE[key].angle)
        return (
          <span key={key} className='cd__badge' style={{ left: `${(at.x / D) * 100}%`, top: `${(at.y / D) * 100}%`, color: TRIFORCE[key].color }}>
            <b style={{ backgroundColor: `color-mix(in srgb, ${TRIFORCE[key].color}, black 75%)` }}>{impactOf(key, scores[key])}</b>
          </span>
        )
      })}
    </Glyph>
  )
}

const EMOTIONS = [
  ['joy', 'Tone', '#FFD700', ['Grim', 'Sad', 'Melancholic', 'Neutral', 'Upbeat', 'Uplifting', 'Radiant']],
  ['anticipation', 'Pace', '#FF9100', ['Still', 'Contemplative', 'Measured', 'Gripping', 'Rousing', 'Intense', 'Breathless']],
  ['anger', 'Spirit', '#FF1744', ['Warm', 'Harmonious', 'Kind', 'Outrageous', 'Indignant', 'Hard-hitting', 'Furious']],
  ['disgust', 'Style', '#D500F9', ['Sublimated', 'Pared-back', 'Smooth', 'Disturbing', 'Visceral', 'Macabre', 'Repulsive']],
  ['sadness', 'Sensitivity', '#2979FF', ['Jovial', 'Light', 'Diverting', 'Touching', 'Moving', 'Poignant', 'Heartbreaking']],
  ['fear', 'Tension', '#00C853', ['Peaceful', 'Calm', 'Relaxed', 'Unsettling', 'Tense', 'Frightening', 'Terrifying']],
  ['trust', 'Ambience', '#00E676', ['Oppressive', 'Disquieting', 'Suspicious', 'Intriguing', 'Safe', 'Reassuring', 'Comforting']],
  ['surprise', 'Intrigue', '#00E5FF', ['Linear', 'Expected', 'Predictable', 'Unexpected', 'Surprising', 'Disorienting', 'Stunning']],
]

const moodOf = (moods, score) => moods[Math.max(-3, Math.min(3, Math.round((score / 5) * 6 - 3))) + 3]

export const Atmosphere = ({ emotions }) => {
  const max = D * 0.4
  const vertices = EMOTIONS.map(([key], i) => polar((emotions[key] / 5) * max, i * 45))
  const rows = EMOTIONS.map(([key, label, color, moods]) => ({ key, label, color, word: `“${moodOf(moods, emotions[key])}”`, value: emotions[key] }))

  return (
    <Glyph label='Atmosphere' name={`Atmosphere: ${rows.map(({ label, value }) => `${label.toLowerCase()} ${value.toFixed(1)}`).join(', ')} out of 5`} tip={<Rows rows={rows} />}>
      <svg viewBox={`0 0 ${D} ${D}`} aria-hidden='true'>
        {levels(max).map(({ radius, even }) => (
          <polygon key={radius} points={points(ring(8, radius))} fill='none' stroke='white' opacity={even ? 0.12 : 0.06} vectorEffect='non-scaling-stroke' />
        ))}
        {ring(8, max * 1.1).map((end, i) => (
          <line key={i} x1={C} y1={C} x2={end.x} y2={end.y} stroke='white' opacity={i % 2 ? 0.1 : 0.2} vectorEffect='non-scaling-stroke' />
        ))}
      </svg>
      <span className='cd__fill' style={{ clipPath: clip(vertices), background: `conic-gradient(${EMOTIONS.map(([, , color], i) => `${color} ${i * 45}deg`).join(', ')}, ${EMOTIONS[0][2]} 360deg)`, opacity: 0.85 }} />
    </Glyph>
  )
}

export const Tropes = ({ tropes }) => {
  const max = D * 0.4
  const step = 360 / tropes.length
  const vertices = tropes.map(({ value }, i) => polar((value / 5) * max, i * step))

  return (
    <Glyph
      label='Tropes'
      name={`Tropes: ${tropes.map(({ name }) => name).join(', ')}`}
      wide
      tip={(
        <ul className='cd__tip-tropes'>
          {tropes.map(({ name, value }) => (
            <li key={name}>
              <span>{name}</span>
              <span className='cd__tip-bar'><b style={{ width: `${(value / 5) * 100}%`, backgroundColor: '#8b5cf6' }} /></span>
            </li>
          ))}
        </ul>
      )}
    >
      <svg viewBox={`0 0 ${D} ${D}`} aria-hidden='true'>
        <defs>
          <linearGradient id='cd-tropes' x1='0%' y1='0%' x2='100%' y2='100%'>
            <stop offset='0%' stopColor='#7B1FA2' stopOpacity='0.75' />
            <stop offset='100%' stopColor='#CE93D8' stopOpacity='0.55' />
          </linearGradient>
        </defs>
        {levels(max).map(({ radius, even }) => (
          <circle key={radius} cx={C} cy={C} r={radius} fill='none' stroke='white' opacity={even ? 0.12 : 0.06} vectorEffect='non-scaling-stroke' />
        ))}
        {ring(tropes.length, max * 1.1).map((end, i) => (
          <line key={i} x1={C} y1={C} x2={end.x} y2={end.y} stroke='white' opacity={i % 2 ? 0.1 : 0.2} vectorEffect='non-scaling-stroke' />
        ))}
        <polygon points={points(vertices)} fill='url(#cd-tropes)' stroke='#a855f7' strokeWidth='1.5' strokeLinejoin='round' vectorEffect='non-scaling-stroke' />
      </svg>
    </Glyph>
  )
}
