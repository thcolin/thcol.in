import { Trans } from '../../i18n'
import { QUOTED, number, quantity, t } from '../../sheets'
import './labo.css'

// Deterministic, so each frame is cut from the same spot of its picture on every visit
export const rng = (seed) => {
  let state = (Math.abs(Math.round(seed)) % 2147483646) + 1
  return () => (state = (state * 16807) % 2147483647) / 2147483647
}

export const two = (value) => String(value).padStart(2, '0')

// A quantity is written over the print in grease pencil with its unit: not a date, nor the digits of a name or of a title in quotes
export const figures = (text) =>
  text.split(QUOTED).flatMap((part, index) => {
    if (index % 2) return [part]
    const bits = []
    let from = 0
    for (const match of part.matchAll(quantity())) {
      bits.push(
        part.slice(from, match.index),
        <b key={`${index}-${match.index}`} className='labo-fig'>
          <span className='labo-fig-n'>{match[1]}</span>
          {match[2] && <> {match[2]}</>}
        </b>,
      )
      from = match.index + match[0].length
    }
    return [...bits, part.slice(from)]
  })

// A paragraph of the model cut at its sentences
export const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ý0-9«“])/)

const SIDES = ['left', 'right']

// Edge printing: film stock, the reel's name and a key number that climbs down the page
export const Edges = ({ index, reel }) => {
  const marks = [`KODAK 5219`, reel && `${reel.name.toUpperCase()} ${reel.year}`, `▸ ${two(index * 4 + 1)}`, 'SAFETY FILM', `▸ ${two(index * 4 + 3)}`].filter(
    Boolean,
  )
  return (
    <>
      {SIDES.map((side) => (
        <div key={side} className={`labo-edge labo-edge-${side}`} aria-hidden='true'>
          {marks.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      ))}
    </>
  )
}

export const Title = ({ lines, as: Tag = 'h2', className }) => (
  <Tag className={`labo-title ${className || ''}`}>
    {lines.map((line, index) => (
      <span key={index}>
        {index > 0 && ' '}
        {line}
      </span>
    ))}
  </Tag>
)

// A frame of the film: the poster printed warm, a missing one left unexposed with its title
export const Frame = ({ poster, art, kind = 'thumb', width = 640, code, eager, className, children }) => {
  const src = art(poster, kind, width) || art(poster, kind === 'thumb' ? 'art' : 'thumb', width)
  return (
    <figure className={`labo-frame ${kind === 'art' ? 'labo-frame-wide' : ''} ${className || ''}`}>
      {src ? (
        <img src={src} alt={poster.title} loading={eager ? 'eager' : 'lazy'} decoding='async' />
      ) : (
        <span className='labo-frame-blank'>{poster.title}</span>
      )}
      {code && (
        <span className='labo-frame-code' aria-hidden='true'>
          {code}
        </span>
      )}
      {children}
    </figure>
  )
}

// So many frames cut from one picture, each from its own spot, as many as there are evenings or episodes
export const Cells = ({ count, src, seed, columns, className }) => {
  const random = rng(seed)
  return (
    <ol
      className={`labo-cells ${className || ''}`}
      aria-hidden='true'
      style={{ '--src': src ? `url("${src}")` : 'none', gridTemplateColumns: columns ? `repeat(${columns}, 1fr)` : undefined }}
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index} style={{ backgroundPosition: `${Math.round(random() * 100)}% ${Math.round(random() * 100)}%` }} />
      ))}
    </ol>
  )
}

export const Ring = ({ className }) => (
  <svg className={`labo-ring ${className || ''}`} viewBox='0 0 100 100' preserveAspectRatio='none' aria-hidden='true'>
    <path d='M52 4 C 88 1, 98 26, 97 52 C 96 88, 64 98, 32 96 C 8 94, 2 64, 4 38 C 6 10, 34 3, 64 8' />
  </svg>
)

// What an editor scrawls on a frame in grease pencil, each gesture in the frame's own box
const GESTURES = {
  crop: 'M1 5 L 98 2 M 96 0 L 98 97 M 100 95 L 3 98 M 5 100 L 2 3',
  ring: 'M52 -2 C 97 -3, 107 30, 105 55 C 103 95, 64 102, 30 101 C 1 99, -6 64, -4 36 C -1 5, 34 -3, 67 3',
  corners: 'M-3 18 L -3 -3 L 18 -3 M 82 -3 L 103 -3 L 103 18 M 103 82 L 103 103 L 82 103 M 18 103 L -3 103 L -3 82',
  slash: 'M 3 97 C 28 72, 66 32, 98 4 M 8 99 C 34 74, 70 36, 99 10',
  squiggle: 'M 4 95 C 12 90, 16 100, 24 95 S 38 90, 46 95 S 60 100, 68 95 S 82 90, 90 95 S 96 99, 98 93',
  arrow: 'M -16 -14 C -10 8, 2 20, 22 26 M 22 26 L 9 29 M 22 26 L 15 14',
}

export const hash = (text) => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 2147483646, 7)

// A different gesture for each frame, and from one sheet of frames to the next
export const gestureOf = (sheet, item) => {
  const gestures = Object.keys(GESTURES)
  return gestures[(sheet * 2 + item) % gestures.length]
}

// A cut across the frame at a height, with the editor's tick where the scissors go
const cutAt = (at) => `M 0 ${at + 1} C 20 ${at - 2}, 60 ${at + 3}, 104 ${at - 1} M 93 ${at - 8} L 104 ${at - 1} L 94 ${at + 6}`

// Every point of the gesture moved a little, so no two frames carry the same stroke
const wobble = (path, random) => path.replace(/-?\d+(?:\.\d+)?/g, (value) => (Number(value) + (random() - 0.5) * 7).toFixed(1))

export const Scrawl = ({ gesture, seed, at }) => {
  const random = rng(seed)
  const style = { '--stroke': 2.5 + random() * 2.5, transform: `rotate(${(random() - 0.5) * 5}deg)` }
  return (
    <svg className={`labo-ring labo-scrawl labo-scrawl-${gesture}`} viewBox='0 0 100 100' preserveAspectRatio='none' aria-hidden='true' style={style}>
      <path d={wobble(gesture === 'cut' ? cutAt(Math.min(Math.max(at ?? 50, 6), 94)) : GESTURES[gesture], random)} />
    </svg>
  )
}

// The printer lights of the form: the reader's hours, the median's and the first viewer's, each a density on the strip
export const Lights = ({ sheet }) => {
  const lights = [
    { label: t('wrapped.common.you'), hours: sheet.hours, you: true },
    { label: t('wrapped.common.median'), hours: sheet.median },
    // An edition frozen before the first viewer's hours were kept does not know them
    ...(sheet.max !== null && sheet.rank !== 1 ? [{ label: t('wrapped.labo.first'), hours: sheet.max }] : []),
  ]
  const top = Math.max(...lights.map((light) => light.hours), 1)
  return (
    <dl className='labo-fiche-values labo-lights'>
      {lights.map((light) => (
        <div key={light.label} className={'you' in light ? 'labo-lights-you' : undefined}>
          <dt>{light.label}</dt>
          <dd className='labo-felt'>{t('wrapped.labo.hours', { hours: number.format(light.hours) })}</dd>
          <span className='labo-lights-bar' style={{ '--share': Math.max(light.hours / top, 0.02) }} aria-hidden='true' />
        </div>
      ))}
    </dl>
  )
}

export const FicheHead = ({ reel, children }) => (
  <header className='labo-fiche-head' aria-hidden='true'>
    <span>
      <Trans i18nKey='wrapped.labo.fiche' values={{ year: reel.year }} components={[<br />]} />
    </span>
    <strong>{reel.name}</strong>
    {children}
  </header>
)

// One evening's binge, a frame per episode
// The footage counter of the printer, one window per figure
export const Counter = ({ stats }) => (
  <ul className='labo-counter'>
    {stats.map((stat) => (
      <li key={stat.unit}>
        <b>{stat.value}</b>
        <span>{stat.unit}</span>
      </li>
    ))}
  </ul>
)

// A still, its poster clipped to the corner so the show reads at a glance
export const Still = ({ poster, art, code }) => (
  <div className='labo-still-print'>
    <Frame poster={poster} art={art} kind='art' width={1280} code={code} />
    {poster.art && poster.thumb && <Frame poster={poster} art={art} width={320} className='labo-still-poster' />}
  </div>
)

export const Hour = ({ children }) => (
  <b className='labo-fig'>
    <span className='labo-fig-n'>{children}</span>
  </b>
)

// A few frames side by side on a cut of film, the titles under them
export const Strip = ({ posters, art, caption, start = 1, titled = true }) => (
  <ul className='labo-strip' data-count={posters.length}>
    {posters.map((poster, frame) => (
      <li key={poster.key}>
        <div className='labo-strip-film'>
          <Frame poster={poster} art={art} width={320} code={`${start + frame}A`} />
        </div>
        {titled && <span className='labo-strip-title'>{poster.title}</span>}
        {caption && <span className='labo-strip-caption'>{caption(poster)}</span>}
      </li>
    ))}
  </ul>
)

// Two reels printed on one frame: where they overlap, the titles both viewers saw
export const Exposure = ({ name, count, spoken, sides }) => (
  <div className='labo-exposure'>
    <p className='labo-exposure-reel labo-exposure-you' aria-hidden='true'>
      <b>{t('wrapped.common.you')}</b>
      <span>{number.format(sides.you)}</span>
    </p>
    <p className='labo-exposure-reel labo-exposure-them' aria-hidden='true'>
      <b>{name}</b>
      {sides.them !== null && <span>{number.format(sides.them)}</span>}
    </p>
    <p className='labo-exposure-shared'>
      <span aria-hidden='true'>{number.format(count)}</span>
      <span className='visually-hidden'>{spoken}</span>
    </p>
  </div>
)

// Holes burnt through the film where the projector held on one frame
export const Scorch = () => (
  <svg viewBox='0 0 400 300' preserveAspectRatio='xMidYMid slice' aria-hidden='true'>
    <defs>
      <filter id='labo-scorch'>
        <feTurbulence type='fractalNoise' baseFrequency='0.035' numOctaves='3' seed='9' />
        <feDisplacementMap in='SourceGraphic' scale='46' />
      </filter>
      <radialGradient id='labo-hole'>
        <stop offset='0.52' stopColor='#070403' />
        <stop offset='0.6' stopColor='#fff2c4' />
        <stop offset='0.68' stopColor='#ffb238' />
        <stop offset='0.78' stopColor='#ff4b1f' />
        <stop offset='0.9' stopColor='#4a1606' stopOpacity='0.85' />
        <stop offset='1' stopColor='#4a1606' stopOpacity='0' />
      </radialGradient>
    </defs>
    <g filter='url(#labo-scorch)'>
      <circle cx='330' cy='70' r='120' fill='url(#labo-hole)' />
      <circle cx='60' cy='262' r='62' fill='url(#labo-hole)' />
    </g>
  </svg>
)
