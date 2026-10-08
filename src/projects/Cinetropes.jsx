import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import films from '../assets/cinetropes/films.json'
import { Choices, Tags, usePrefersReducedMotion } from './shared'
import './cinetropes.css'

const POSTERS = {
  'spirited-away': new URL('../assets/cinetropes/poster-spirited-away.webp', import.meta.url),
  'kill-bill-vol-1': new URL('../assets/cinetropes/poster-kill-bill-vol-1.webp', import.meta.url),
  'no-other-choice': new URL('../assets/cinetropes/poster-no-other-choice.webp', import.meta.url),
  'venom-2018': new URL('../assets/cinetropes/poster-venom-2018.webp', import.meta.url),
}

// The film page's runtime, 2h05
const runtimeOf = (minutes) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`

// Radar geometry, in the 128 units of the film page's xx-lg glyphs

const D = 128
const C = D / 2

const polar = (radius, degrees) => {
  const angle = ((degrees - 90) * Math.PI) / 180
  return { x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle) }
}

const ring = (sides, radius) => Array.from({ length: sides }, (_, i) => polar(radius, (i * 360) / sides))
const points = (vertices) => vertices.map(({ x, y }) => `${x},${y}`).join(' ')
const line = (a, b) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`
const shape = (vertices) => `M ${vertices.map(({ x, y }) => `${x} ${y}`).join(' L ')} Z`
const clip = (vertices) => `polygon(${vertices.map(({ x, y }) => `${(x / D) * 100}% ${(y / D) * 100}%`).join(', ')})`

// Chrome and Firefox animate the CSS d property, Safari keeps the attribute
const Morph = ({ d, ...props }) => <path d={d} style={{ d: `path("${d}")` }} {...props} />

const useGradientId = (prefix) => `${prefix}-${useId().replace(/:/g, '')}`

const levels = (count, max) => Array.from({ length: count }, (_, i) => ({ radius: ((i + 1) / count) * max, even: i % 2 === 0 }))

// A signature glyph: its badges on hover, its glass tooltip on click, one open at a time

let openTip = null

const FOCUSABLE = 'button, [href], [tabindex]:not([tabindex="-1"])'

// Above the glyph when it fits, below otherwise, kept inside the viewport
const Tip = ({ id, anchor, wide, onKeyDown, onBlur, children }) => {
  const ref = useRef(null)
  const [box, setBox] = useState(null)

  useLayoutEffect(() => {
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect()
      const tip = ref.current

      if (!rect || !tip) {
        return
      }

      const gap = 12
      const above = rect.top >= tip.offsetHeight + gap || rect.top > innerHeight - rect.bottom
      const half = tip.offsetWidth / 2
      const left = Math.min(Math.max(rect.left + rect.width / 2, half + 12), innerWidth - half - 12)
      setBox(above ? { left, bottom: innerHeight - rect.top + gap, placement: 'top' } : { left, top: rect.bottom + gap, placement: 'bottom' })
    }

    place()
    addEventListener('scroll', place, true)
    addEventListener('resize', place)
    return () => {
      removeEventListener('scroll', place, true)
      removeEventListener('resize', place)
    }
  }, [anchor, children])

  return createPortal(
    <div
      ref={ref}
      id={id}
      role='dialog'
      aria-label={anchor.current?.getAttribute('aria-label') ?? undefined}
      className={`cinetropes__tip${wide ? ' cinetropes__tip--wide' : ''}${box ? ` is-${box.placement}` : ''}`}
      style={box ? { left: box.left, top: box.top, bottom: box.bottom } : { visibility: 'hidden' }}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      {children}
    </div>,
    document.body,
  )
}

const Signature = ({ label, name, tip, wide, children }) => {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const [axis, setAxis] = useState(null)
  const anchor = useRef(null)
  const id = useGradientId('tip')
  const tipOf = () => document.getElementById(id)

  const close = (refocus) => {
    setOpen(false)
    setAxis(null)
    refocus && anchor.current?.focus()
  }

  const closer = useRef(() => close())

  const toggle = () => {
    if (open) {
      close()
      return
    }

    openTip?.()
    openTip = closer.current
    setOpen(true)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    const outside = (event) => {
      if (!anchor.current?.contains(event.target) && !tipOf()?.contains(event.target)) {
        close()
      }
    }

    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)

      if (openTip === closer.current) {
        openTip = null
      }
    }
  }, [open])

  // Leaving both the glyph and its tooltip by keyboard closes it
  const blur = (event) => {
    const next = event.relatedTarget

    if (next && !anchor.current?.contains(next) && !tipOf()?.contains(next)) {
      close()
    }
  }

  const keyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    } else if (event.key === 'Escape' && open) {
      close()
    } else if (event.key === 'Tab' && !event.shiftKey && open) {
      // The tooltip lives at the end of the page: Tab steps into it from its glyph
      const first = tipOf()?.querySelector(FOCUSABLE)

      if (first) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  const tipKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close(true)
    } else if (event.key === 'Tab') {
      const items = [...tipOf().querySelectorAll(FOCUSABLE)]
      const edge = event.shiftKey ? items[0] : items[items.length - 1]

      if (document.activeElement === edge) {
        event.preventDefault()
        event.shiftKey ? anchor.current?.focus() : close(true)
      }
    }
  }

  return (
    <figure>
      <figcaption>{label}</figcaption>
      <div
        ref={anchor}
        className='cinetropes__glyph'
        role='button'
        tabIndex={0}
        aria-label={name}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onPointerEnter={(event) => event.pointerType === 'mouse' && setHover(true)}
        onPointerLeave={() => setHover(false)}
        onClick={toggle}
        onKeyDown={keyDown}
        onBlur={blur}
      >
        {children({ open, hover, axis, setAxis })}
      </div>
      {open && (
        <Tip id={id} anchor={anchor} wide={wide} onKeyDown={tipKeyDown} onBlur={blur}>
          {tip({ axis, setAxis })}
        </Tip>
      )}
    </figure>
  )
}

const Bar = ({ value, color }) => (
  <span className='cinetropes__bar'>
    <span style={{ width: `${(value / 5) * 100}%`, backgroundColor: color }} />
  </span>
)

// A label pinned outside the radar, pushed away from the center along its axis
const Badge = ({ at, angle, color, small, children }) => {
  const rad = (angle * Math.PI) / 180
  return (
    <span className='cinetropes__badge' style={{ left: `${(at.x / D) * 100}%`, top: `${(at.y / D) * 100}%`, '--tx': `${-50 + 50 * Math.sin(rad)}%`, '--ty': `${-50 - 50 * Math.cos(rad)}%`, color }}>
      {small && <small>{small}</small>}
      <b style={{ backgroundColor: `color-mix(in srgb, ${color}, black 75%)` }}>{children}</b>
    </span>
  )
}

const HitAreas = ({ vertices, keys, onAxis }) => (
  <g>
    {vertices.map(({ x, y }, i) => (
      <circle key={i} cx={x} cy={y} r='15' fill='transparent' pointerEvents='all' onPointerEnter={() => onAxis(keys[i])} onPointerLeave={() => onAxis(null)} />
    ))}
  </g>
)

// Réception: the Tri-Force, critics on top, audience bottom left, nerds bottom right

const TRIFORCE = {
  critic: { label: 'Critic', color: '#F5C518', rgb: '245, 197, 24', angle: 0, impact: ['Snubbed', 'Respected', 'Acclaimed'] },
  nerd: { label: 'Nerd', color: '#00E054', rgb: '0, 224, 84', angle: 120, impact: ['Overlooked', 'Recognised', 'Cult'] },
  public: { label: 'Public', color: '#FA320A', rgb: '250, 50, 10', angle: 240, impact: ['Ignored', 'Liked', 'Popular'] },
}

const AXES = ['critic', 'nerd', 'public']

const impactOf = (axis, score) => TRIFORCE[axis].impact[score <= 1.5 ? 0 : score <= 3.5 ? 1 : 2]

const TIERS = [[50, 'Unknown'], [1_000, 'Minor'], [30_000, 'Niche'], [100_000, 'Mainstream'], [300_000, 'Famous'], [750_000, 'Essential'], [Infinity, 'Classic']]

const votesOf = (count) => {
  if (count < 10) return `${count}`
  if (count < 1000) return `${Math.round(count / 10) * 10}`
  if (count < 1_000_000) return `${Math.round(count / 1000)}K`
  return `${parseFloat((count / 1_000_000).toFixed(1))}M`
}

const voteConfidence = (notoriety) => {
  if (notoriety <= 50) return 0.04 + (0.16 * notoriety) / 50
  if (notoriety <= 1_000) return 0.2 + (0.2 * (notoriety - 50)) / 950
  if (notoriety <= 30_000) return 0.4 + (0.2 * (notoriety - 1_000)) / 29_000
  if (notoriety <= 100_000) return 0.6 + (0.2 * (notoriety - 30_000)) / 70_000
  if (notoriety <= 300_000) return 0.8 + (0.1 * (notoriety - 100_000)) / 200_000
  if (notoriety <= 750_000) return 0.9 + (0.1 * (notoriety - 300_000)) / 450_000
  return 1
}

const dominantRgb = (scores) => {
  const total = scores.critic + scores.nerd + scores.public
  return [[245, 0, 250], [197, 224, 50], [24, 84, 10]]
    .map(([c, n, p]) => Math.round((c * scores.critic + n * scores.nerd + p * scores.public) / total))
    .join(', ')
}

// The center leans away from the strong scores, giving their colour more of the cone
const triforceGradient = (scores, vertices) => {
  const intensity = (axis) => 0.85 + (scores[axis] / 5) * 0.15
  const centroid = { x: vertices.reduce((sum, v) => sum + v.x, 0) / 3, y: vertices.reduce((sum, v) => sum + v.y, 0) / 3 }
  const weights = AXES.map((axis) => 6 - scores[axis])
  const total = weights[0] + weights[1] + weights[2]
  const weighted = {
    x: vertices.reduce((sum, v, i) => sum + v.x * weights[i], 0) / total,
    y: vertices.reduce((sum, v, i) => sum + v.y * weights[i], 0) / total,
  }
  const average = (scores.critic + scores.public + scores.nerd) / 3
  const variance = AXES.reduce((sum, axis) => sum + (scores[axis] - average) ** 2, 0) / 3
  const blend = Math.min(1.5, Math.sqrt(variance / 4.5) * 1.5)
  const cx = ((centroid.x + (weighted.x - centroid.x) * blend) / D) * 100
  const cy = ((centroid.y + (weighted.y - centroid.y) * blend) / D) * 100
  const rgb = dominantRgb(scores)

  return `radial-gradient(circle at ${cx}% ${cy}%, rgba(${rgb}, 0.8) 0%, rgba(${rgb}, 0.3) 6%, transparent 12%),
    conic-gradient(at ${cx}% ${cy}%, rgba(${TRIFORCE.critic.rgb}, ${intensity('critic')}) 0deg, rgba(${TRIFORCE.nerd.rgb}, ${intensity('nerd')}) 120deg, rgba(${TRIFORCE.public.rgb}, ${intensity('public')}) 240deg, rgba(${TRIFORCE.critic.rgb}, ${intensity('critic')}) 360deg)`
}

// A glow per axis scored 4 and over, at the xx-lg blur
const triforceGlow = (scores) => {
  const blur = 16 * 0.6
  const strong = AXES.filter((axis) => scores[axis] >= 4)
  const alpha = strong.length === 1 ? 'B0' : '80'
  const offsets = { critic: `0 -${blur * 0.3}px`, nerd: `${blur * 0.25}px ${blur * 0.2}px`, public: `-${blur * 0.25}px ${blur * 0.2}px` }
  return strong.map((axis) => `drop-shadow(${offsets[axis]} ${blur}px ${TRIFORCE[axis].color}${alpha})`).join(' ')
}

const ORDER = ['critic', 'public', 'nerd']

const Reception = ({ scores }) => {
  const id = useGradientId('reception')
  const max = D * 0.38
  const vertices = AXES.map((axis) => polar((scores[axis] / 5) * max, TRIFORCE[axis].angle))
  const fill = { clipPath: clip(vertices), background: triforceGradient(scores, vertices) }
  const opacity = voteConfidence(scores.notoriety)
  const glow = triforceGlow(scores)
  const edges = [
    ['critic', 'nerd', { x1: '0%', y1: '0%', x2: '100%', y2: '100%' }],
    ['nerd', 'public', { x1: '100%', y1: '50%', x2: '0%', y2: '50%' }],
    ['public', 'critic', { x1: '100%', y1: '100%', x2: '0%', y2: '0%' }],
  ]

  const tip = ({ setAxis }) => (
    <>
      <p className='cinetropes__tip-title'>
        {TIERS.find(([limit]) => scores.notoriety <= limit)[1]} <span>· {votesOf(scores.votes)} ★</span>
      </p>
      <ul className='cinetropes__tip-rows'>
        {ORDER.map((axis) => (
          <li key={axis} style={{ '--row': TRIFORCE[axis].color }} onPointerEnter={() => setAxis(axis)} onPointerLeave={() => setAxis(null)}>
            <i style={{ backgroundColor: TRIFORCE[axis].color }} />
            <span>{TRIFORCE[axis].label}<small>{impactOf(axis, scores[axis])}</small></span>
            <Bar value={scores[axis]} color={TRIFORCE[axis].color} />
            <data value={scores[axis]}>{scores[axis].toFixed(1)}</data>
          </li>
        ))}
      </ul>
      <dl className='cinetropes__sources'>
        {scores.sources.map(({ name, value }) => (
          <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </>
  )

  return (
    <Signature label='Reception' name={`Reception: ${ORDER.map((axis) => `${TRIFORCE[axis].label.toLowerCase()} ${scores[axis].toFixed(1)}`).join(', ')} out of 5`} tip={tip}>
      {({ open, hover, axis }) => (
        <>
          {glow && (
            <div className='cinetropes__glow' style={{ filter: glow }}>
              <div className='cinetropes__fill' style={{ ...fill, opacity: 0.6 * opacity }} />
            </div>
          )}
          <svg viewBox={`0 0 ${D} ${D}`} aria-hidden='true'>
            {levels(5, max).map(({ radius, even }) => (
              <polygon key={radius} points={points(AXES.map((key) => polar(radius, TRIFORCE[key].angle)))} fill='none' stroke='white' opacity={even ? 0.12 : 0.06} vectorEffect='non-scaling-stroke' />
            ))}
            {AXES.map((key, i) => (
              <path key={key} d={line(polar(0, 0), polar(max, TRIFORCE[key].angle))} stroke='white' opacity={i % 2 ? 0.12 : 0.25} vectorEffect='non-scaling-stroke' />
            ))}
            <defs>
              {edges.map(([from, to, direction]) => (
                <linearGradient key={from} id={`${id}-${from}`} {...direction}>
                  <stop offset='0%' stopColor={TRIFORCE[from].color} style={{ stopOpacity: Math.max(0.5, scores[from] / 5) }} />
                  <stop offset='100%' stopColor={TRIFORCE[to].color} style={{ stopOpacity: Math.max(0.5, scores[to] / 5) }} />
                </linearGradient>
              ))}
            </defs>
            {edges.map(([from, to]) => (
              <Morph key={from} d={line(vertices[AXES.indexOf(from)], vertices[AXES.indexOf(to)])} fill='none' stroke={`url(#${id}-${from})`} strokeWidth='2' strokeLinecap='round' vectorEffect='non-scaling-stroke' />
            ))}
          </svg>
          <div className='cinetropes__fill' style={{ ...fill, opacity: 0.75 * opacity }} />
          {axis && (
            <span className='cinetropes__vertex' style={{ left: `${(vertices[AXES.indexOf(axis)].x / D) * 100}%`, top: `${(vertices[AXES.indexOf(axis)].y / D) * 100}%`, '--vertex': TRIFORCE[axis].color }} />
          )}
          {(open || hover) && AXES.map((key, i) => (
            <span key={key} className='cinetropes__badge cinetropes__badge--center' style={{ left: `${(polar(max + D * 0.12, TRIFORCE[key].angle).x / D) * 100}%`, top: `${(polar(max + D * 0.12, TRIFORCE[key].angle).y / D) * 100}%`, color: TRIFORCE[key].color, animationDelay: `${i * 80}ms` }}>
              <b style={{ backgroundColor: `color-mix(in srgb, ${TRIFORCE[key].color}, black 75%)`, opacity: Math.max(0.8, scores[key] / 5) }}>{impactOf(key, scores[key])}</b>
            </span>
          ))}
        </>
      )}
    </Signature>
  )
}

// Atmosphère: Plutchik's eight emotions, each read as an axis of the film's mood

const EMOTIONS = [
  ['joy', 'Tone', '#FFD700', '255, 215, 0', ['Grim', 'Sad', 'Melancholic', 'Neutral', 'Upbeat', 'Uplifting', 'Radiant']],
  ['anticipation', 'Pace', '#FF9100', '255, 145, 0', ['Still', 'Contemplative', 'Measured', 'Gripping', 'Rousing', 'Intense', 'Breathless']],
  ['anger', 'Spirit', '#FF1744', '255, 23, 68', ['Warm', 'Harmonious', 'Kind', 'Outrageous', 'Indignant', 'Hard-hitting', 'Furious']],
  ['disgust', 'Style', '#D500F9', '213, 0, 249', ['Sublimated', 'Pared-back', 'Smooth', 'Disturbing', 'Visceral', 'Macabre', 'Repulsive']],
  ['sadness', 'Sensitivity', '#2979FF', '41, 121, 255', ['Jovial', 'Light', 'Diverting', 'Touching', 'Moving', 'Poignant', 'Heartbreaking']],
  ['fear', 'Tension', '#00C853', '0, 200, 83', ['Peaceful', 'Calm', 'Relaxed', 'Unsettling', 'Tense', 'Frightening', 'Terrifying']],
  ['trust', 'Ambience', '#00E676', '0, 230, 118', ['Oppressive', 'Disquieting', 'Suspicious', 'Intriguing', 'Safe', 'Reassuring', 'Comforting']],
  ['surprise', 'Intrigue', '#00E5FF', '0, 229, 255', ['Linear', 'Expected', 'Predictable', 'Unexpected', 'Surprising', 'Disorienting', 'Stunning']],
]

// Seven words per axis, from -3 to +3 around the middle of the scale
const moodOf = (labels, score) => labels[Math.max(-3, Math.min(3, Math.round((score / 5) * 6 - 3))) + 3]

const atmosphereGradient = (emotions) => {
  const values = EMOTIONS.map(([key]) => emotions[key])
  const corners = ring(8, 50).map(({ x, y }) => ({ x: x - C + 50, y: y - C + 50 }))
  const weights = values.map((value) => 6 - value)
  const total = weights.reduce((sum, w) => sum + w, 0)
  const weighted = {
    x: corners.reduce((sum, v, i) => sum + v.x * weights[i], 0) / total,
    y: corners.reduce((sum, v, i) => sum + v.y * weights[i], 0) / total,
  }
  const average = values.reduce((sum, v) => sum + v, 0) / 8
  const variance = values.reduce((sum, v) => sum + (v - average) ** 2, 0) / 8
  const blend = Math.min(1.5, Math.sqrt(variance / 4.5) * 1.5)
  const cx = 50 + (weighted.x - 50) * blend
  const cy = 50 + (weighted.y - 50) * blend
  const sum = values.reduce((acc, v) => acc + v, 0)
  const rgb = [0, 1, 2].map((channel) => Math.round(EMOTIONS.reduce((acc, [key, , , color]) => acc + color.split(', ')[channel] * emotions[key], 0) / sum)).join(', ')
  const stop = (i) => `rgba(${EMOTIONS[i % 8][3]}, ${0.5 + (values[i % 8] / 5) * 0.25}) ${i * 45}deg`

  return `radial-gradient(circle at ${cx}% ${cy}%, rgba(${rgb}, 0.5) 0%, rgba(${rgb}, 0.25) 6%, transparent 12%),
    conic-gradient(at ${cx}% ${cy}%, ${Array.from({ length: 9 }, (_, i) => stop(i)).join(', ')})`
}

const Atmosphere = ({ emotions, archetype }) => {
  const id = useGradientId('atmosphere')
  const max = D * 0.4
  const vertices = EMOTIONS.map(([key], i) => polar((emotions[key] / 5) * max, i * 45))

  const tip = ({ setAxis }) => (
    <>
      <p className='cinetropes__tip-title'>{archetype}</p>
      <ul className='cinetropes__tip-rows'>
        {EMOTIONS.map(([key, label, color, , moods]) => (
          <li key={key} className='is-stacked' style={{ '--row': color }} onPointerEnter={() => setAxis(key)} onPointerLeave={() => setAxis(null)}>
            <i style={{ backgroundColor: color }} />
            <span>{label}<small>“{moodOf(moods, emotions[key])}”</small></span>
            <Bar value={emotions[key]} color={color} />
            <data value={emotions[key]}>{emotions[key].toFixed(1)}</data>
          </li>
        ))}
      </ul>
    </>
  )

  return (
    <Signature label='Atmosphere' name={`Atmosphere: ${archetype}. ${EMOTIONS.map(([key, label]) => `${label.toLowerCase()} ${emotions[key].toFixed(1)}`).join(', ')} out of 5`} tip={tip}>
      {({ axis, setAxis }) => (
        <>
          <svg viewBox={`0 0 ${D} ${D}`} aria-hidden='true'>
            {levels(5, max).map(({ radius, even }) => (
              <polygon key={radius} points={points(ring(8, radius))} fill='none' stroke='white' opacity={even ? 0.12 : 0.06} vectorEffect='non-scaling-stroke' />
            ))}
            {ring(8, max * 1.1).map((end, i) => (
              <path key={i} d={line(polar(0, 0), end)} stroke='white' opacity={i % 2 ? 0.1 : 0.2} vectorEffect='non-scaling-stroke' />
            ))}
            {EMOTIONS.map(([key, , color], i) => {
              const [next, , nextColor] = EMOTIONS[(i + 1) % 8]
              const a = vertices[i]
              const b = vertices[(i + 1) % 8]
              return (
                <g key={key}>
                  <defs>
                    <linearGradient id={`${id}-${i}`} gradientUnits='userSpaceOnUse' x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
                      <stop offset='0%' stopColor={color} style={{ stopOpacity: Math.max(0.75, emotions[key] / 5) }} />
                      <stop offset='100%' stopColor={nextColor} style={{ stopOpacity: Math.max(0.75, emotions[next] / 5) }} />
                    </linearGradient>
                  </defs>
                  <Morph d={line(a, b)} fill='none' stroke={`url(#${id}-${i})`} strokeWidth='2' strokeLinecap='round' vectorEffect='non-scaling-stroke' />
                </g>
              )
            })}
            <HitAreas vertices={vertices} keys={EMOTIONS.map(([key]) => key)} onAxis={setAxis} />
          </svg>
          <div className='cinetropes__fill' style={{ clipPath: clip(vertices), background: atmosphereGradient(emotions) }} />
          {EMOTIONS.map(([key, label, color, , moods], i) => key === axis && (
            <Badge key={key} at={polar(max + D * 0.14, i * 45)} angle={i * 45} color={color} small={label}>{moodOf(moods, emotions[key])}</Badge>
          ))}
        </>
      )}
    </Signature>
  )
}

// Tropes: the film's nine most telling tropes, the rarer the further out

const hashOf = (text) => {
  let hash = 0

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  }

  return Math.abs(hash)
}

const PROMINENCE = { central: 'Central', supporting: 'Supporting', background: 'Background' }

const TropesTip = ({ tropes, themes, onAxis }) => {
  const detailed = (trope) => !!(trope.description || trope.evidence || trope.prominence || trope.spoilerLevel || trope.subversion)
  const [expanded, setExpanded] = useState(() => tropes.find(detailed)?.id ?? null)

  return (
    <>
      <p className='cinetropes__tip-title'>{themes.join(' · ')}</p>
      <ul className='cinetropes__tropes'>
        {tropes.map((trope, i) => {
          const open = expanded === trope.id
          return (
            <li key={`${trope.id}-${i}`} className={open ? 'is-open' : undefined} onPointerEnter={() => onAxis(i)} onPointerLeave={() => onAxis(null)}>
              <button type='button' className='cinetropes__trope' aria-expanded={detailed(trope) ? open : undefined} onClick={() => detailed(trope) && setExpanded(trope.id)}>
                <span>{trope.name}</span>
                <Bar value={trope.value} color='#8b5cf6' />
                {trope.synonyms.length > 0 && <small>{trope.synonyms.map((synonym) => `“${synonym}”`).join(', ')}</small>}
              </button>
              {detailed(trope) && (
                <div className='cinetropes__trope-body'>
                  <div>
                    {trope.description && <p>{trope.description}</p>}
                    <p className='cinetropes__trope-badges'>
                      {trope.prominence && <span className={`is-${trope.prominence}`}>{PROMINENCE[trope.prominence]}</span>}
                      {trope.subversion && !['none', 'played_straight'].includes(trope.subversion) && <span className='is-subverted'>Subverted</span>}
                      {trope.spoilerLevel && trope.spoilerLevel !== 'none' && <span className={`is-spoiler-${trope.spoilerLevel}`}>{trope.spoilerLevel === 'heavy' ? 'Major spoiler' : 'Minor spoiler'}</span>}
                    </p>
                    {trope.evidence && <blockquote>{trope.evidence}</blockquote>}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

const Tropes = ({ tropes, themes, filmId }) => {
  const id = useGradientId('tropes')
  const max = D * 0.4
  const step = 360 / tropes.length
  const vertices = tropes.map(({ value }, i) => polar((value / 5) * max, i * step))
  const average = tropes.reduce((sum, { value }) => sum + value, 0) / tropes.length
  const seeded = `hsl(${280 + (hashOf(tropes.map(({ id: key }) => key).join('')) % 20) - 10}, 60%, 45%)`

  return (
    <Signature
      label='Tropes'
      name={`Tropes: ${tropes.map(({ name, value }) => `${name} ${value.toFixed(1)}`).join(', ')}`}
      wide
      tip={({ setAxis }) => <TropesTip key={filmId} tropes={tropes} themes={themes} onAxis={setAxis} />}
    >
      {({ axis, setAxis }) => (
        <>
          <svg viewBox={`0 0 ${D} ${D}`} aria-hidden='true'>
            {levels(5, max).map(({ radius, even }) => (
              <circle key={radius} cx={C} cy={C} r={radius} fill='none' stroke='white' opacity={even ? 0.12 : 0.06} vectorEffect='non-scaling-stroke' />
            ))}
            {ring(tropes.length, max * 1.1).map((end, i) => (
              <path key={i} d={line(polar(0, 0), end)} stroke='white' opacity={i % 2 ? 0.1 : 0.2} vectorEffect='non-scaling-stroke' />
            ))}
            <defs>
              <linearGradient id={id} x1='0%' y1='0%' x2='100%' y2='100%'>
                <stop offset='0%' stopColor='#7B1FA2' style={{ stopOpacity: 0.3 + (average / 5) * 0.5 }} />
                <stop offset='100%' stopColor='#CE93D8' style={{ stopOpacity: 0.2 + (average / 5) * 0.4 }} />
              </linearGradient>
              {tropes.map((trope, i) => {
                const next = tropes[(i + 1) % tropes.length]
                const a = vertices[i]
                const b = vertices[(i + 1) % tropes.length]
                return (
                  <linearGradient key={i} id={`${id}-${i}`} gradientUnits='userSpaceOnUse' x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
                    <stop offset='0%' stopColor={`hsl(${270 + ((i * 5) % 30)}, 60%, 50%)`} style={{ stopOpacity: Math.max(0.6, trope.value / 5) }} />
                    <stop offset='100%' stopColor={`hsl(${270 + (((i + 1) * 5) % 30)}, 60%, 50%)`} style={{ stopOpacity: Math.max(0.6, next.value / 5) }} />
                  </linearGradient>
                )
              })}
            </defs>
            <Morph d={shape(vertices)} fill={`url(#${id})`} />
            {vertices.map((a, i) => (
              <Morph key={i} d={line(a, vertices[(i + 1) % vertices.length])} fill='none' stroke={`url(#${id}-${i})`} strokeWidth='2' strokeLinecap='round' vectorEffect='non-scaling-stroke' />
            ))}
            <HitAreas vertices={vertices} keys={tropes.map((_, i) => i)} onAxis={setAxis} />
          </svg>
          {axis !== null && tropes[axis] && (
            <Badge at={polar(max + D * 0.14, axis * step)} angle={axis * step} color={seeded}>{tropes[axis].name}</Badge>
          )}
        </>
      )}
    </Signature>
  )
}

// Palette: the poster's colours, four ways to see them, a click to switch

const seeded = (seed) => {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

const weighted = (colors) => colors.map((hex, i) => ({ hex, weight: (colors.length - i) / ((colors.length * (colors.length + 1)) / 2) }))

const describe = (colors) => {
  let warm = 0
  let cool = 0
  let saturation = 0
  let lightness = 0

  weighted(colors).forEach(({ hex, weight }) => {
    const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
    r > b ? (warm += weight) : (cool += weight)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    saturation += (max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min)) * weight
    lightness += l * weight
  })

  const temperature = warm > cool * 1.5 ? 'Warm tones' : cool > warm * 1.5 ? 'Cool tones' : 'Mixed'
  const tone = saturation > 0.5 && lightness > 0.6 ? 'Pastel' : saturation > 0.4 ? 'Saturated' : 'Desaturated'
  return `${temperature} • ${tone}`
}

const Gooey = ({ colors, still }) => {
  const id = useGradientId('palette')
  const seed = colors.reduce((acc, hex, i) => acc + parseInt(hex.slice(1, 3), 16) * (i + 1), 0)
  const blobs = colors.slice(0, 6).map((color, i) => {
    const [r1, r2, r3, r4, r5, r6] = [7, 13, 19, 23, 29, 37].map((k) => seeded(seed + i * k))
    const angle1 = r3 * Math.PI * 2
    const angle2 = (r3 + 0.4 + r4 * 0.3) * Math.PI * 2
    const distance1 = 25 + r4 * 20
    const distance2 = 20 + r5 * 15
    return {
      color,
      size: [32, 28, 25, 22, 19, 16][i] * (0.85 + r1 * 0.3),
      duration: [6, 8, 10, 12, 14, 16][i] * (0.8 + r2 * 0.5),
      delay: -r6 * 8,
      one: { x: Math.cos(angle1) * distance1, y: Math.sin(angle1) * distance1 },
      two: { x: Math.cos(angle2) * distance2, y: Math.sin(angle2) * distance2 },
    }
  })
  const rotation = 12 + seeded(seed * 31) * 12

  return (
    <>
      <svg className='cinetropes__goo' aria-hidden='true'>
        <filter id={id} colorInterpolationFilters='sRGB'>
          <feGaussianBlur stdDeviation='8' />
          <feColorMatrix values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 48 -24' />
        </filter>
      </svg>
      <div className='cinetropes__mode' style={{ filter: `url(#${id})` }}>
        <svg viewBox='0 0 100 100' preserveAspectRatio='xMidYMid slice' aria-hidden='true'>
          <g style={{ transformOrigin: '50px 50px', animation: still ? undefined : `${id}-rotate ${rotation}s linear infinite` }}>
            {blobs.map((blob, i) => (
              <rect
                key={`${blob.color}-${i}`}
                x={50 - blob.size / 2}
                y={50 - blob.size / 2}
                rx={blob.size * 0.45}
                width={blob.size}
                height={blob.size}
                fill={blob.color}
                style={{
                  transformOrigin: '50px 50px',
                  ...(still
                    ? { transform: `translate(${blob.one.x}%, ${blob.one.y}%)` }
                    : { animation: `${id}-blob-${i} ${blob.duration}s ease-in-out ${blob.delay}s infinite` }),
                }}
              />
            ))}
          </g>
        </svg>
      </div>
      {!still && (
        <style>
          {`@keyframes ${id}-rotate { to { transform: rotate(360deg); } }
          ${blobs.map((blob, i) => `@keyframes ${id}-blob-${i} {
            0%, 100% { transform: translate(0%, 0%) scale(1); }
            25% { transform: translate(${blob.one.x}%, ${blob.one.y}%) scale(0.9); }
            50% { transform: translate(${blob.two.x * 0.3}%, ${blob.two.y * 0.3}%) scale(1.05); }
            75% { transform: translate(${blob.two.x}%, ${blob.two.y}%) scale(0.95); }
          }`).join('\n')}`}
        </style>
      )}
    </>
  )
}

// The film's compressed timeline: stripes in proportion to each colour, shuffled by a seed
const Barcode = ({ colors }) => {
  const stripes = []
  weighted(colors).forEach(({ hex, weight }) => {
    for (let i = 0; i < Math.max(2, Math.round(weight * 200)); i++) {
      stripes.push(hex)
    }
  })
  const seed = colors.reduce((acc, hex) => acc + parseInt(hex.slice(1, 3), 16), 0)

  for (let i = stripes.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(seed + i) * (i + 1))
    ;[stripes[i], stripes[j]] = [stripes[j], stripes[i]]
  }

  return (
    <div className='cinetropes__mode cinetropes__barcode'>
      {stripes.slice(0, 200).map((hex, i) => <span key={i} style={{ backgroundColor: hex }} />)}
    </div>
  )
}

// Mondrian blocks, the dominant colour the largest
const Masonry = ({ colors }) => {
  const blocks = weighted(colors).slice(0, 8)
  const total = blocks.reduce((sum, { weight }) => sum + weight, 0)

  return (
    <div className='cinetropes__mode cinetropes__masonry'>
      {blocks.map(({ hex, weight }, i) => {
        const share = weight / total
        const big = i === 0 && share > 0.25
        const medium = !big && share > 0.15 && i < 3
        return (
          <span
            key={i}
            style={{
              backgroundColor: hex,
              gridColumn: `span ${big ? 2 : medium && i % 2 === 0 ? 2 : 1}`,
              gridRow: `span ${big ? 2 : medium && i % 2 === 1 ? 2 : 1}`,
            }}
          />
        )
      })}
    </div>
  )
}

// react-bits' Aurora shader, one WebGL layer per three colours
const AURORA_FRAGMENT = `#version 300 es
precision highp float;
uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
out vec4 fragColor;
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 rampColor = uv.x < 0.5 ? mix(uColorStops[0], uColorStops[1], uv.x * 2.0) : mix(uColorStops[1], uColorStops[2], (uv.x - 0.5) * 2.0);
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  float auroraAlpha = smoothstep(0.2 - uBlend * 0.5, 0.2 + uBlend * 0.5, intensity);
  fragColor = vec4(rampColor * auroraAlpha, auroraAlpha);
}`

const AURORA_VERTEX = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`

const AuroraLayer = ({ stops, amplitude, blend, speed, offset }) => {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true })

    if (!gl) {
      return
    }

    const shader = (type, source) => {
      const unit = gl.createShader(type)
      gl.shaderSource(unit, source)
      gl.compileShader(unit)
      return unit
    }

    const program = gl.createProgram()
    gl.attachShader(program, shader(gl.VERTEX_SHADER, AURORA_VERTEX))
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, AURORA_FRAGMENT))
    gl.linkProgram(program)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    const uniform = (name) => gl.getUniformLocation(program, name)
    gl.uniform3fv(uniform('uColorStops'), stops.flatMap((hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)))
    gl.uniform1f(uniform('uAmplitude'), amplitude)
    gl.uniform1f(uniform('uBlend'), blend)

    const size = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uniform('uResolution'), canvas.width, canvas.height)
    }

    let frame = 0
    const draw = (t) => {
      gl.uniform1f(uniform('uTime'), (t + offset * 10000) * 0.01 * speed * 0.1)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      if (speed) {
        frame = requestAnimationFrame(draw)
      }
    }

    size()
    draw(0)
    frame = speed ? requestAnimationFrame(draw) : 0
    return () => {
      cancelAnimationFrame(frame)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [stops.join(), amplitude, blend, speed, offset])

  return <canvas ref={ref} />
}

const Aurora = ({ colors, still }) => {
  const seed = colors.reduce((acc, hex, i) => acc + parseInt(hex.slice(1, 3), 16) * (i + 1), 0)
  const all = [...colors]

  while (all.length < 3) {
    all.push(all[all.length - 1] ?? '#000000')
  }

  const count = Math.max(2, Math.ceil(all.length / 2))
  const layers = Array.from({ length: count }, (_, i) => {
    const [r1, r2, r3] = [[7, 11], [13, 17], [19, 23]].map(([a, b]) => seeded(seed * a + i * b))
    const start = (i * 2) % all.length
    return {
      stops: [0, 1, 2].map((k) => all[(start + k) % all.length]),
      amplitude: (0.8 + r1 * 0.8) * 1.3,
      blend: 0.4 + r2 * 0.4 + 0.2,
      offset: r3 * 100 + i * 30,
      speed: still ? 0 : 0.2 + r1 * 0.3,
      opacity: i === 0 ? 1 : 0.5 + (1 - i / count) * 0.3,
      flip: i % 2 === 0 ? -1 : 1,
    }
  })

  return (
    <div className='cinetropes__mode' style={{ background: `linear-gradient(135deg, ${colors.map((hex, i) => `${hex} ${(i / (colors.length - 1)) * 100}%`).join(', ')})` }}>
      {layers.map(({ flip, opacity, ...layer }, i) => (
        <div key={i} className='cinetropes__aurora' style={{ transform: `scaleY(${flip})`, opacity }}>
          <AuroraLayer {...layer} />
        </div>
      ))}
    </div>
  )
}

const MODES = [
  { id: 'gooey', label: 'Gooey' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'barcode', label: 'Barcode' },
  { id: 'masonry', label: 'Masonry' },
]

const Palette = ({ colors, still }) => {
  const [mode, setMode] = useState('gooey')

  const tip = () => (
    <>
      <p className='cinetropes__tip-title'>{describe(colors)}</p>
      <ul className='cinetropes__swatches'>
        {colors.map((hex) => (
          <li key={hex}><i style={{ backgroundColor: hex }} /><code>{hex}</code></li>
        ))}
      </ul>
      <Choices label='Palette view' options={MODES} value={mode} onChange={setMode} className='choices cinetropes__views' />
    </>
  )

  return (
    <Signature label='Palette' name={`Palette: ${describe(colors)}, ${colors.length} colours`} tip={tip}>
      {() => (
        <div className='cinetropes__palette'>
          {mode === 'gooey' && <Gooey colors={colors} still={still} />}
          {mode === 'aurora' && <Aurora colors={colors} still={still} />}
          {mode === 'barcode' && <Barcode colors={colors} />}
          {mode === 'masonry' && <Masonry colors={colors} />}
          <span className='cinetropes__modes' aria-hidden='true'>
            {MODES.map(({ id }) => <i key={id} className={id === mode ? 'is-current' : undefined} />)}
          </span>
        </div>
      )}
    </Signature>
  )
}

// The holo card: pokemon-cards-css layers, lit and tilted by the pointer

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value))
const round = (value) => Math.round(value * 100) / 100
const adjust = (value, toMin, toMax) => round(toMin + (value / 100) * (toMax - toMin))

const rarityOf = ({ critic, public: audience, nerd }) => {
  const average = (critic + audience + nerd) / 3
  if (average >= 4.2) return 'secret'
  if (average >= 3.5) return 'ultra'
  if (average >= 2.8) return 'rare'
  if (average >= 2.0) return 'holo'
  return 'common'
}

const HOLO_OPACITY = { common: 0.3, holo: 0.4, rare: 0.25, ultra: 0.6, secret: 0.55 }

const setVars = (element, values) => Object.entries(values).forEach(([name, value]) => element?.style.setProperty(`--${name}`, value))

const useHolo = (film, enabled) => {
  const ref = useRef(null)
  const timer = useRef(null)
  const rarity = rarityOf(film.scores)
  useEffect(() => () => clearTimeout(timer.current), [])

  const interact = (event) => {
    const card = ref.current

    if (!enabled || !card) {
      return
    }

    const rect = card.getBoundingClientRect()
    const x = clamp(round((100 / rect.width) * (event.clientX - rect.left)))
    const y = clamp(round((100 / rect.height) * (event.clientY - rect.top)))

    if (!card.classList.contains('is-interacting')) {
      card.classList.add('is-interacting', 'is-entering')
      timer.current = setTimeout(() => ref.current?.classList.remove('is-entering'), 200)
    }

    setVars(card, {
      'pointer-x': `${x}%`,
      'pointer-y': `${y}%`,
      'pointer-from-center': clamp(Math.sqrt((y - 50) ** 2 + (x - 50) ** 2) / 50, 0, 1),
      'pointer-from-top': y / 100,
      'pointer-from-left': x / 100,
      'card-opacity': HOLO_OPACITY[rarity],
      'tilt-x': `${round(-(x - 50) / 4)}deg`,
      'tilt-y': `${round((y - 50) / 4)}deg`,
      'background-x': `${adjust(x, 37, 63)}%`,
      'background-y': `${adjust(y, 33, 67)}%`,
    })
  }

  const rest = () => {
    ref.current?.classList.remove('is-interacting', 'is-entering')
    setVars(ref.current, { 'pointer-x': '50%', 'pointer-y': '50%', 'card-opacity': 0, 'tilt-x': '0deg', 'tilt-y': '0deg', 'background-x': '50%', 'background-y': '50%' })
  }

  return { ref, rarity, interact, rest }
}

const Holo = ({ film }) => (
  <div className='cinetropes__perspective'>
    <div className='cinetropes__rotator'>
      <div className='cinetropes__front'>
        <img src={POSTERS[film.id]} alt='' width='500' height='750' loading='lazy' decoding='async' draggable='false' />
        <div className='cinetropes__foil' />
        <div className='cinetropes__shine' />
        <div className='cinetropes__glare' />
      </div>
    </div>
  </div>
)

// The front card of the stack: grabbed, it springs back, swiped past a third of its width it goes behind, clicked it zooms
const Card = ({ film, hidden, still, onZoom, onSwipe, cardRef }) => {
  const { ref, rarity, interact, rest } = useHolo(film, !still)
  const gesture = useRef({ down: false, dragged: false, x: 0, y: 0 })
  const [phase, setPhase] = useState(null)
  const returning = useRef(null)
  useEffect(() => () => clearTimeout(returning.current), [])

  const setRef = (node) => {
    ref.current = node
    cardRef.current = node
  }

  const pointerDown = (event) => {
    if (event.button > 0) {
      return
    }

    Object.assign(gesture.current, { down: true, dragged: false, x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const pointerMove = (event) => {
    interact(event)

    if (!gesture.current.down) {
      return
    }

    const dx = event.clientX - gesture.current.x
    const dy = event.clientY - gesture.current.y

    if (!gesture.current.dragged && Math.hypot(dx, dy) > 5) {
      gesture.current.dragged = true
      clearTimeout(returning.current)
      setPhase('dragging')
    }

    if (gesture.current.dragged) {
      setVars(ref.current, { 'drag-x': `${dx}px`, 'drag-y': `${dy}px`, 'drag-rotate': `${clamp((dx / ref.current.offsetWidth) * 15, -15, 15)}deg` })
    }
  }

  // Let go, the card springs back to the stack, or past the threshold the stack turns
  const pointerUp = (event) => {
    if (!gesture.current.down) {
      return
    }

    gesture.current.down = false

    if (!gesture.current.dragged) {
      onZoom()
      return
    }

    const dx = event.clientX - gesture.current.x
    const dy = event.clientY - gesture.current.y
    gesture.current.dragged = false
    setVars(ref.current, { 'drag-x': '0px', 'drag-y': '0px', 'drag-rotate': '0deg' })
    setPhase('returning')
    returning.current = setTimeout(() => setPhase(null), 400)

    if (Math.abs(dx) > ref.current.offsetWidth * 0.3 && Math.abs(dx) > Math.abs(dy)) {
      rest()
      onSwipe(dx < 0 ? 1 : -1)
    }
  }

  const keyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onZoom()
    }
  }

  return (
    <div
      ref={setRef}
      className={['cinetropes__card', 'is-front', phase && `is-${phase}`].filter(Boolean).join(' ')}
      data-rarity={rarity}
      role='button'
      tabIndex={0}
      aria-label={`${film.title}, zoom the card`}
      aria-describedby='cinetropes-hint'
      style={hidden ? { visibility: 'hidden' } : undefined}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onPointerLeave={() => !gesture.current.down && rest()}
      onKeyDown={keyDown}
    >
      <Holo film={film} />
    </div>
  )
}

const Chevron = ({ d }) => (
  <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d={d} />
  </svg>
)

// The app's popover: the card flies to the middle of the screen at 70% of it, and back
const Zoom = ({ film, from, still, onClose }) => {
  const { ref, rarity, interact, rest } = useHolo(film, !still)
  const close = useRef(null)
  const [open, setOpen] = useState(still)
  const [leaving, setLeaving] = useState(false)
  const width = innerWidth
  const height = innerHeight
  const scale = Math.min((width * 0.7) / from.width, (height * 0.7) / from.height)
  const size = { width: from.width * scale, height: from.height * scale }
  const box = { left: (width - size.width) / 2, top: (height - size.height) / 2 }
  const away = `translate(${from.x - width / 2}px, ${from.y - height / 2}px) rotate(${from.angle}deg) scale(${1 / scale})`
  const shown = open && !leaving

  useEffect(() => {
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    close.current?.focus({ preventScroll: true })
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)))
    return () => {
      cancelAnimationFrame(frame)
      document.documentElement.style.overflow = overflow
    }
  }, [])

  const leave = () => {
    if (leaving) {
      return
    }

    rest()
    setLeaving(true)
    setTimeout(onClose, still ? 0 : 650)
  }

  // The close button is the only stop: Tab stays on it
  const keyDown = (event) => {
    if (event.key === 'Escape') {
      leave()
    } else if (event.key === 'Tab') {
      event.preventDefault()
      close.current?.focus()
    }
  }

  return createPortal(
    <div className={`cinetropes__zoom${shown ? ' is-open' : ''}`} role='dialog' aria-modal='true' aria-label={film.title} onKeyDown={keyDown} onClick={leave}>
      <div className='cinetropes__zoom-backdrop' />
      <div
        ref={ref}
        className='cinetropes__card cinetropes__zoom-card'
        data-rarity={rarity}
        style={{ ...size, ...box, transform: shown ? 'none' : away }}
        onPointerMove={(event) => shown && interact(event)}
        onPointerLeave={rest}
      >
        <Holo film={film} />
      </div>
      <button
        ref={close}
        type='button'
        className='cinetropes__close'
        style={{ top: box.top - 32, left: box.left + size.width + 32 }}
        aria-label='Close'
      >
        <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
          <path d='M18 6l-12 12' />
          <path d='M6 6l12 12' />
        </svg>
      </button>
    </div>,
    document.body,
  )
}

export const Cinetropes = () => {
  const still = usePrefersReducedMotion()
  const [front, setFront] = useState(0)
  const [motion, setMotion] = useState(null)
  const [zoom, setZoom] = useState(null)
  const card = useRef(null)
  const timer = useRef(null)
  const refocus = useRef(false)
  const film = films[front]
  useEffect(() => () => clearTimeout(timer.current), [])

  // Next: the front card tucks behind the stack. Previous: the last one comes back out to the front
  const step = (direction, focus) => {
    if (motion) {
      return
    }

    refocus.current = !!focus
    const leaving = front
    setFront((front + direction + films.length) % films.length)

    if (!still) {
      setMotion({ direction, film: direction > 0 ? leaving : (front - 1 + films.length) % films.length })
      timer.current = setTimeout(() => setMotion(null), 600)
    }
  }

  useLayoutEffect(() => {
    if (refocus.current) {
      card.current?.focus({ preventScroll: true })
      refocus.current = false
    }
  }, [front, zoom])

  const keyDown = (event) => {
    const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key]

    if (direction && !zoom) {
      event.preventDefault()
      step(direction, event.target === card.current)
    }
  }

  const open = () => {
    const element = card.current
    const rect = element.getBoundingClientRect()
    setZoom({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: element.offsetWidth, height: element.offsetHeight, angle: 0 })
  }

  const shut = () => {
    refocus.current = true
    setZoom(null)
  }

  return (
    <article className='band cinetropes' aria-labelledby='cinetropes'>
      <div className='cinetropes__backdrop' aria-hidden='true'>
        {films.map((item, index) => (
          <div key={item.id} className={index === front ? 'is-shown' : undefined} style={{ backgroundImage: `url(${POSTERS[item.id]})` }} />
        ))}
      </div>
      <div className='cinetropes__nav'>
        <h3 id='cinetropes' className='cinetropes__logo'>
          <img src={new URL('../assets/cinetropes/logo.svg', import.meta.url)} alt='cinetropes' width='275' height='40' />
        </h3>
        <p className='cinetropes__tagline'>Explore, discover, find</p>
        <Tags items={['TypeScript', 'React', 'Hono', 'Drizzle', 'PostgreSQL + pgvector', 'Python', 'Gemini']} />
      </div>
      <div className='cinetropes__page'>
        <div className='cinetropes__deck' role='group' aria-roledescription='carousel' aria-label='Films' onKeyDown={keyDown}>
          <button type='button' className='cinetropes__arrow' aria-label='Previous film' onClick={() => step(-1)}>
            <Chevron d='M15 6l-6 6l6 6' />
          </button>
          <div className='cinetropes__stack'>
            {films.map((item, index) => {
              const depth = (index - front + films.length) % films.length
              const moving = motion?.film === index ? (motion.direction > 0 ? ' is-tucking' : ' is-pulling') : ''
              return (
                <div key={item.id} className={`cinetropes__slot${moving}`} style={{ '--depth': depth, zIndex: films.length - depth }} aria-hidden={depth > 0}>
                  {depth === 0
                    ? <Card key={`${item.id}-front`} film={item} hidden={!!zoom} still={still} cardRef={card} onZoom={open} onSwipe={(direction) => step(direction, true)} />
                    : <div className='cinetropes__card' data-rarity={rarityOf(item.scores)}><Holo film={item} /></div>}
                </div>
              )
            })}
          </div>
          <button type='button' className='cinetropes__arrow' aria-label='Next film' onClick={() => step(1)}>
            <Chevron d='M9 6l6 6l-6 6' />
          </button>
          <p className='cinetropes__count'><span className='visually-hidden'>Film </span>{front + 1} / {films.length}</p>
        </div>
        <div className='cinetropes__main'>
          <div className='cinetropes__info' aria-live='polite'>
            <h4>{film.title}</h4>
            <p className='cinetropes__original' lang={film.originalLanguage}>{film.originalTitle ?? ' '}</p>
            <p className='cinetropes__meta'>{film.year} · {film.genres.join(', ')} · {runtimeOf(film.runtime)}</p>
            <p className='cinetropes__director'><span>a film by</span> {film.director}</p>
            <p className='cinetropes__synopsis'>{film.synopsis}</p>
            <p className='cinetropes__cast'><span>with</span> {film.cast.slice(0, 3).map(({ name }) => name).join(', ')}</p>
          </div>
          <div className='cinetropes__signature'>
            <Reception scores={film.scores} />
            <Atmosphere emotions={film.emotions} archetype={film.atmosphere} />
            <Tropes tropes={film.tropes} themes={film.themes} filmId={film.id} />
            <Palette key={film.id} colors={film.palette} still={still} />
          </div>
        </div>
      </div>
      <footer className='cinetropes__footer'>
        <p className='cinetropes__pitch'>
          A film recommendation engine that speaks the language of cinephiles. Not vague genres: what makes a film unique, its themes, its tropes, its mood. Every film is rated by critics, audience and nerds apart.
        </p>
        <p id='cinetropes-hint' className='cinetropes__hint'>
          Grab the card, click it to zoom. The arrows, the arrow keys or a swipe turn the stack. Click or tap a chart for its details.
          <span> Posters from TMDB. Ratings, atmospheres and tropes from the beta.</span>
        </p>
      </footer>
      {zoom && <Zoom film={film} from={zoom} still={still} onClose={shut} />}
    </article>
  )
}
