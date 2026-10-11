import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import films from '../assets/cinetropes/films.json'
import { Choices, Tags, usePrefersReducedMotion } from './shared'
import { Atmosphere, Reception, Signature, Tropes, useGradientId } from './cinetropes-radars'
import './cinetropes.css'

const POSTERS = {
  'spirited-away': new URL('../assets/cinetropes/poster-spirited-away.webp', import.meta.url),
  'kill-bill-vol-1': new URL('../assets/cinetropes/poster-kill-bill-vol-1.webp', import.meta.url),
  'no-other-choice': new URL('../assets/cinetropes/poster-no-other-choice.webp', import.meta.url),
  'venom-2018': new URL('../assets/cinetropes/poster-venom-2018.webp', import.meta.url),
}

// The film page's runtime, 2h05
const runtimeOf = (minutes) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`

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
    <article id='cinetropes' className='band cinetropes' aria-labelledby='cinetropes-title'>
      <div className='cinetropes__backdrop' aria-hidden='true'>
        {films.map((item, index) => (
          <div key={item.id} className={index === front ? 'is-shown' : undefined} style={{ backgroundImage: `url(${POSTERS[item.id]})` }} />
        ))}
      </div>
      <div className='cinetropes__nav'>
        <h3 id='cinetropes-title' className='cinetropes__logo'>
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
