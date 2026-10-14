import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './cinetropes.css'

// The film page's signature radars, shared by the cinetropes band and its daily

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

export const useGradientId = (prefix) => `${prefix}-${useId().replace(/:/g, '')}`

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

export const Signature = ({ label, name, tip, wide, legend, children }) => {
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

  // As a legend, the glyph keeps its badges and its tooltip's content stands beside it
  if (legend) {
    return (
      <figure className='cinetropes__legend'>
        <figcaption>{label}</figcaption>
        <div ref={anchor} className='cinetropes__glyph' role='img' aria-label={name} onPointerEnter={(event) => event.pointerType === 'mouse' && setHover(true)} onPointerLeave={() => setHover(false)}>
          {children({ open: false, hover, axis, setAxis })}
        </div>
        <div className='cinetropes__legend-body'>{tip({ axis, setAxis })}</div>
      </figure>
    )
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

// A label pinned outside the radar, pushed away from the center along its axis, and back inside the box that
// clips it, the daily's scrolling panel
const Badge = ({ at, angle, color, small, children }) => {
  const rad = (angle * Math.PI) / 180
  const ref = useRef(null)

  useLayoutEffect(() => {
    const badge = ref.current
    let box = badge.parentElement

    while (box && getComputedStyle(box).overflowX === 'visible') {
      box = box.parentElement
    }

    if (!box) {
      return
    }

    // Measured at rest: its entry animation scales it on top of its translation
    badge.style.animation = 'none'
    const { left, right } = badge.getBoundingClientRect()
    badge.style.animation = ''
    const bounds = box.getBoundingClientRect()
    badge.style.setProperty('--dx', `${Math.max(0, bounds.left - left) + Math.min(0, bounds.right - right)}px`)
  }, [children])

  return (
    <span ref={ref} className='cinetropes__badge' style={{ left: `${(at.x / D) * 100}%`, top: `${(at.y / D) * 100}%`, '--tx': `${-50 + 50 * Math.sin(rad)}%`, '--ty': `${-50 - 50 * Math.cos(rad)}%`, color }}>
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

export const Reception = ({ scores, legend }) => {
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
    </>
  )

  return (
    <Signature label='Reception' legend={legend} name={`Reception: ${ORDER.map((axis) => `${TRIFORCE[axis].label.toLowerCase()} ${scores[axis].toFixed(1)}`).join(', ')} out of 5`} tip={tip}>
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

export const Atmosphere = ({ emotions, archetype, legend }) => {
  const id = useGradientId('atmosphere')
  const max = D * 0.4
  const vertices = EMOTIONS.map(([key], i) => polar((emotions[key] / 5) * max, i * 45))

  const tip = ({ setAxis }) => (
    <>
      {archetype && <p className='cinetropes__tip-title'>{archetype}</p>}
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
    <Signature label='Atmosphere' legend={legend} name={`Atmosphere: ${archetype ? `${archetype}. ` : ''}${EMOTIONS.map(([key, label]) => `${label.toLowerCase()} ${emotions[key].toFixed(1)}`).join(', ')} out of 5`} tip={tip}>
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

const TropesTip = ({ tropes, themes, total, onAxis }) => {
  const detailed = (trope) => !!(trope.description || trope.evidence || trope.prominence || trope.spoilerLevel || trope.subversion)
  const [expanded, setExpanded] = useState(() => tropes.find(detailed)?.id ?? null)

  return (
    <>
      <p className='cinetropes__tip-title'>{themes.length > 0 ? themes.join(' · ') : `${total ?? tropes.length} tropes detected`}</p>
      <ul className='cinetropes__tropes'>
        {tropes.map((trope, i) => {
          const open = expanded === trope.id
          return (
            <li key={`${trope.id}-${i}`} className={open ? 'is-open' : undefined} onPointerEnter={() => onAxis(i)} onPointerLeave={() => onAxis(null)}>
              <button type='button' className='cinetropes__trope' aria-expanded={detailed(trope) ? open : undefined} onClick={() => detailed(trope) && setExpanded(trope.id)}>
                <span>{trope.name}</span>
                <Bar value={trope.value} color='#8b5cf6' />
                {trope.synonyms?.length > 0 && <small>{trope.synonyms.map((synonym) => `“${synonym}”`).join(', ')}</small>}
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

export const Tropes = ({ tropes, themes = [], total, filmId, legend }) => {
  const id = useGradientId('tropes')
  const max = D * 0.4
  const step = 360 / tropes.length
  const vertices = tropes.map(({ value }, i) => polar((value / 5) * max, i * step))
  const average = tropes.reduce((sum, { value }) => sum + value, 0) / tropes.length
  const seeded = `hsl(${280 + (hashOf(tropes.map(({ id: key }) => key).join('')) % 20) - 10}, 60%, 45%)`

  return (
    <Signature
      label='Tropes'
      legend={legend}
      name={`Tropes: ${tropes.map(({ name, value }) => `${name} ${value.toFixed(1)}`).join(', ')}`}
      wide
      tip={({ setAxis }) => <TropesTip key={filmId} tropes={tropes} themes={themes} total={total} onAxis={setAxis} />}
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
