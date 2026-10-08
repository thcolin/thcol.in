import { useEffect, useState } from 'react'
import { useReducedMotion } from '../../motion'
import { QUOTED, months, number, quantity, quoted, t } from '../../sheets'
import './scenario.css'

// Production revision colours, in the order a shooting script goes through them
// White is the first draft, it carries no revision line
export const REVISIONS = ['white', 'blue', 'pink', 'yellow', 'green', 'gold', 'buff', 'salmon', 'cherry', 'tan']

export const TRANSITIONS = ['dissolve', 'cut', 'crossfade', 'cutTo']

// The same lean for the same poster on every visit
export const lean = (seed) => {
  const text = String(seed)
  let hash = 0
  for (let index = 0; index < text.length; index++) hash = (hash * 31 + text.charCodeAt(index)) | 0
  const value = Math.sin(hash) * 43758.5453
  return value - Math.floor(value)
}

// How many numbered scenes each sheet writes, so numbering runs on across pages
export const scenesOf = (sheet) => {
  switch (sheet.kind) {
    case 'opening':
      return 0
    case 'months':
      return sheet.elapsed
    case 'binge':
      return sheet.pace ? 2 : 1
    case 'posters':
      return sheet.items.length
    default:
      return 1
  }
}

export const Holes = ({ brads }) => (
  <span className={`scenario-holes${brads ? ' scenario-holes-brads' : ''}`} aria-hidden='true'>
    <i />
    <i />
    <i />
  </span>
)

export const Page = ({ sheet, index, transition, children }) => {
  const colour = REVISIONS[(index - 1) % REVISIONS.length]
  return (
    <section
      id={`scenario-p${index}`}
      className='scenario-page'
      data-revision={colour}
      aria-label={sheet.label}
      style={{ '--tilt': `${(lean(index) - 0.5) * 0.8}deg` }}
    >
      <Holes />
      <p className='scenario-head' aria-hidden='true'>
        {colour !== 'white' && <span>{t(`wrapped.scenario.revision.${colour}`)}</span>}
        <span>{index + 1}.</span>
      </p>
      {children}
      <p className='scenario-transition' aria-hidden='true'>
        {t(transition ? `wrapped.scenario.transitions.${transition}` : 'wrapped.scenario.fadeOut')}
      </p>
      {sheet.kind === 'finale' && <p className='scenario-end'>{sheet.end}</p>}
    </section>
  )
}

export const Act = ({ children }) => <h2 className='scenario-act'>{children}</h2>

export const Slug = ({ scene, children }) => (
  <p className='scenario-slug'>
    <span className='scenario-scene' aria-hidden='true'>
      {scene}
    </span>
    <span>{children}</span>
    <span className='scenario-scene scenario-scene-right' aria-hidden='true'>
      {scene}
    </span>
  </p>
)

export const Caps = ({ children }) => <span className='scenario-caps'>{children}</span>

export const Mark = ({ children }) => <mark className='scenario-mark'>{children}</mark>

// A quantity is typed bold with its unit and underlined in red pencil: not a date, nor the digits of a name or of a title in quotes
export const figures = (text) =>
  text.split(QUOTED).flatMap((part, index) => {
    if (index % 2) return [part]
    const bits = []
    let from = 0
    for (const match of part.matchAll(quantity())) {
      bits.push(
        part.slice(from, match.index),
        <b key={`${index}-${match.index}`} className='scenario-figure'>
          <span className='scenario-figure-n'>{match[1]}</span>
          {match[2] && <> {match[2]}</>}
        </b>,
      )
      from = match.index + match[0].length
    }
    return [...bits, part.slice(from)]
  })

// A paragraph of the model cut at its sentences
export const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ý0-9«“])/)

// A key figure said at the scale of the page: centred capitals, like a line shouted from the room
export const Shout = ({ figure, children, long, className = '' }) => (
  <div className={`scenario-shout ${className}`} style={long ? { '--length': long } : undefined}>
    <p className={`scenario-shout-figure${long ? ' scenario-shout-word' : ''}`}>
      <Mark>{figure}</Mark>
    </p>
    {children && <p className='scenario-shout-unit'>{children}</p>}
  </div>
)

export const Pencil = ({ children, className }) => <p className={`scenario-pencil-note ${className || ''}`}>{children}</p>

export const Clip = () => (
  <svg className='scenario-clip' viewBox='0 0 22 58' aria-hidden='true'>
    <path d='M6 44 V10 a5 5 0 0 1 10 0 V48 a8 8 0 0 1 -16 0 V16' fill='none' stroke='#7d828a' strokeWidth='2.6' strokeLinecap='round' />
    <path d='M7 42 V11 a4 4 0 0 1 4 -4' fill='none' stroke='#d4d8dd' strokeWidth='0.9' strokeLinecap='round' />
  </svg>
)

// A poster paper-clipped to the page, a little askew
export const Insert = ({ poster, art, wide, width = 640, caption, className }) => {
  const src = (wide && art(poster, 'art', 1280)) || art(poster, 'thumb', width)
  const shape = wide && poster.art ? ' scenario-insert-wide' : ''
  return (
    <figure
      className={`scenario-insert${shape} ${className || ''}`}
      style={{ '--tilt': `${(lean(poster.key) - 0.5) * 6}deg`, '--clip': `${14 + lean(`${poster.key}-clip`) * 50}%` }}
    >
      <Clip />
      {src ? (
        <img src={src} alt={poster.title} loading='lazy' decoding='async' />
      ) : (
        <span className='scenario-insert-blank' role='img' aria-label={poster.title}>
          {poster.title}
        </span>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

const Inserts = ({ posters, art, caption }) => (
  <div className='scenario-inserts' data-count={posters.length}>
    {posters.map((poster, index) => (
      <Insert key={poster.key} poster={poster} art={art} width={320} caption={caption ? caption(poster, index) : poster.title} />
    ))}
  </div>
)

// A still paper-clipped across the page, its poster clipped over the corner so the title reads at a glance
const Still = ({ poster, art }) => {
  const src = poster.art && art(poster, 'art', 1280)
  if (!src || !poster.thumb) return <Insert poster={poster} art={art} wide />
  return (
    <figure className='scenario-still' style={{ '--tilt': `${(lean(`${poster.key}-still`) - 0.5) * 2}deg` }}>
      <Clip />
      <img src={src} alt='' loading='lazy' decoding='async' />
      <Insert poster={poster} art={art} width={320} className='scenario-still-poster' />
    </figure>
  )
}

// A clapperboard: each figure chalked in its own box
const Slate = ({ stats, small }) => (
  <ul className={`scenario-slate${small ? ' scenario-slate-small' : ''}`} data-count={stats.length}>
    {stats.map((stat) => (
      <li key={stat.unit}>
        <b>{stat.value}</b> <span>{stat.unit}</span>
      </li>
    ))}
  </ul>
)

// The title page types itself once, the caret keeps blinking where it stopped
const useTyped = (text) => {
  const reduced = useReducedMotion()
  const [count, setCount] = useState(reduced ? text.length : 0)
  useEffect(() => {
    if (reduced) {
      setCount(text.length)
      return
    }
    let index = 0
    let timer
    const next = () => {
      index += 1
      setCount(index)
      if (index < text.length) timer = setTimeout(next, 55 + lean(index) * 90 + (text[index - 1] === ' ' ? 60 : 0))
    }
    timer = setTimeout(next, 700)
    return () => clearTimeout(timer)
  }, [text, reduced])
  return { typed: text.slice(0, count), rest: text.slice(count), caret: !reduced }
}

export const Opening = ({ sheet, art }) => {
  const { typed, rest, caret } = useTyped(sheet.title)
  return (
    <section id='scenario-p0' className='scenario-page scenario-title-page' data-revision='white' data-typed={rest ? undefined : ''} aria-label={sheet.label}>
      <Holes brads />
      <div className='scenario-title-block'>
        <h1 className='scenario-title'>
          <span className='visually-hidden'>{sheet.title}</span>
          <span aria-hidden='true'>
            {typed}
            {caret && <span className='scenario-caret' />}
            <span className='scenario-untyped'>{rest}</span>
          </span>
        </h1>
        <p className='scenario-byline'>{t('wrapped.scenario.writtenBy')}</p>
        <p className='scenario-author'>
          <Mark>
            <Caps>{sheet.name}</Caps>
          </Mark>
        </p>
      </div>
      {!!sheet.posters.length && (
        <div className='scenario-fan' data-count={sheet.posters.length}>
          {sheet.posters.map((poster) => (
            <Insert key={poster.key} poster={poster} art={art} width={320} />
          ))}
        </div>
      )}
      <div className='scenario-draft'>
        {sheet.lede && <p>{sheet.lede}</p>}
        <ul>
          {sheet.figures.map((figure) => (
            <li key={figure}>{figures(figure)}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// A cast list, the friend's name billed at its rank and the other lines left blank, the hours written where they are known
export const Rank = ({ sheet, name, scene }) => {
  const { rank, users } = sheet
  const middle = Math.ceil(users / 2)
  const shown = [...new Set([1, 2, 3, rank - 1, rank, rank + 1, middle, users])].filter((line) => line >= 1 && line <= users).sort((a, b) => a - b)
  const hoursOf = (line) => (line === rank ? sheet.hours : line === 1 ? sheet.max : line === middle ? sheet.median : null)
  return (
    <>
      <Act>{sheet.label}</Act>
      <Slug scene={scene}>{t('wrapped.scenario.slugs.screening')}</Slug>
      <ol className='scenario-cast' aria-hidden='true'>
        {shown.map((line, index) => {
          const hours = hoursOf(line)
          return (
            <li key={line} className={line === rank ? 'scenario-cast-you' : undefined} data-gap={index > 0 && line - shown[index - 1] > 1 ? '' : undefined}>
              <span>{line}.</span>
              {line === rank ? (
                <Mark>
                  <Caps>{name}</Caps>
                </Mark>
              ) : (
                line === middle && <span className='scenario-cast-role'>{t('wrapped.scenario.median')}</span>
              )}
              <i />
              {hours !== null && <b className='scenario-cast-hours'>{t('wrapped.common.hours', { hours: number.format(hours) })}</b>}
            </li>
          )
        })}
      </ol>
      <p className='scenario-character'>{t('wrapped.scenario.audience')}</p>
      <p className='scenario-parenthetical'>{t('wrapped.scenario.chorus')}</p>
      <Shout
        figure={
          <>
            {rank}
            <sup>{sheet.suffix}</sup>
          </>
        }
      >
        {sheet.unit}
      </Shout>
      <p className='scenario-dialogue'>{figures(sheet.detail)}</p>
      <p className='scenario-action'>{figures(sheet.compare)}</p>
    </>
  )
}

// Tally marks in red pencil, one stroke per evening
export const Tally = ({ count }) => {
  const groups = Math.ceil(count / 5)
  const perRow = 6
  const rows = Math.ceil(groups / perRow)
  return (
    <svg className='scenario-tally' viewBox={`0 0 ${Math.min(groups, perRow) * 34} ${rows * 34}`} aria-hidden='true'>
      {Array.from({ length: groups }, (_, group) => {
        const [x, y] = [(group % perRow) * 34 + 4, Math.floor(group / perRow) * 34 + 4]
        const strokes = Math.min(5, count - group * 5)
        return (
          <g key={group} transform={`rotate(${(lean(group) - 0.5) * 6} ${x + 12} ${y + 12})`}>
            {Array.from({ length: Math.min(4, strokes) }, (_, stroke) => (
              <path key={stroke} d={`M${x + stroke * 6 + 2} ${y + 1 + lean(group * 5 + stroke) * 2} L${x + stroke * 6 + 1} ${y + 25}`} />
            ))}
            {strokes === 5 && <path d={`M${x - 2} ${y + 20} L${x + 24} ${y + 6}`} />}
          </g>
        )
      })}
    </svg>
  )
}

// The evening's still with its poster, its figures chalked on a clapperboard, the pace of another show as a later scene
export const Binge = ({ sheet, scene, art }) => (
  <>
    <Act>{figures(sheet.lines.join(' '))}</Act>
    <Slug scene={scene}>{t('wrapped.scenario.slugs.evening')}</Slug>
    <Still poster={sheet.poster} art={art} />
    <p className='scenario-action scenario-centred'>
      <Caps>{sheet.title}</Caps>
      {sheet.date && <>. {sheet.date}.</>}
    </p>
    <Slate stats={sheet.stats} />
    {sheet.pace && (
      <>
        <Slug scene={scene + 1}>{t('wrapped.scenario.slugs.later')}</Slug>
        <div className='scenario-beside'>
          <Insert poster={sheet.pace} art={art} caption={<Caps>{sheet.pace.title}</Caps>} />
          <Slate stats={sheet.paced_stats} small />
        </div>
      </>
    )}
  </>
)

// « Personne d’autre » has no lines; « Ton jumeau » names the other viewer as a character, both speaking at once
export const Figure = ({ sheet, scene, art }) => {
  const unit = sheet.highlight ? sheet.unit.split(sheet.highlight) : [sheet.unit]
  const titles = (count) => figures(`${t('wrapped.count.moviesAndShows', { count })}.`)
  const dual = !!sheet.highlight && sheet.sides?.them != null
  // The dual dialogue already says the figures of the first sentence
  const details = dual ? sentences(sheet.details).slice(1).join(' ') : sheet.details
  return (
    <>
      <Act>{sheet.lines ? sheet.lines.join(' ') : sheet.label}</Act>
      <Slug scene={scene}>{t('wrapped.scenario.slugs.evening')}</Slug>
      {dual && sheet.sides && sheet.sides.them !== null && (
        <div className='scenario-dual'>
          <div>
            <p className='scenario-character'>{t('wrapped.common.you')}</p>
            <p className='scenario-dialogue'>{titles(sheet.sides.you)}</p>
          </div>
          <div>
            <p className='scenario-character'>{sheet.highlight}</p>
            <p className='scenario-dialogue'>{titles(sheet.sides.them)}</p>
          </div>
        </div>
      )}
      <Shout figure={number.format(sheet.count)}>
        {unit.map((part, index) => (
          <span key={index}>
            {index > 0 && <Mark>{sheet.highlight}</Mark>}
            {part}
          </span>
        ))}
      </Shout>
      {details && <p className='scenario-action'>{figures(details)}</p>}
      {!!sheet.posters.length && <Inserts posters={sheet.posters} art={art} />}
    </>
  )
}

// Each title watched at two is a line of dialogue: the other viewer's name as the character, the gap as the parenthetical
export const Duo = ({ sheet, scene, art }) => (
  <>
    <Act>{sheet.lines.join(' ')}</Act>
    <Slug scene={scene}>{t('wrapped.scenario.slugs.evening')}</Slug>
    <p className='scenario-action'>{figures(sheet.lede)}</p>
    <ol className='scenario-exchange'>
      {sheet.posters.map((poster) => (
        <li key={poster.key}>
          <Insert poster={poster} art={art} width={320} />
          <div>
            <p className='scenario-character'>{poster.who}</p>
            {poster.gap && <p className='scenario-parenthetical'>({figures(poster.gap)})</p>}
            <p className='scenario-dialogue'>{quoted(poster.title)}</p>
          </div>
        </li>
      ))}
    </ol>
  </>
)

export const Genre = ({ sheet, scene, art }) => {
  const { lead } = sheet
  return (
    <>
      <Act>{sheet.lines.join(' ')}</Act>
      <Slug scene={scene}>{t('wrapped.scenario.slugs.evening')}</Slug>
      <Shout figure={sheet.name} long={Math.max(sheet.name.length, 5)} />
      <p className='scenario-action'>{figures(sheet.count)}</p>
      <Inserts posters={sheet.posters} art={art} />
      {lead && (
        <p className='scenario-action'>
          <Mark>
            <Caps>{lead.name}</Caps>
          </Mark>{' '}
          {figures(lead.role)}
        </p>
      )}
      {lead && !!lead.posters.length && <Inserts posters={lead.posters} art={art} />}
    </>
  )
}

export const Finale = ({ sheet, scene, art }) => (
  <>
    <Act>{sheet.lines.join(' ')}</Act>
    <Slug scene={scene}>{t('wrapped.scenario.slugs.evening')}</Slug>
    {sheet.poster.art ? <Still poster={sheet.poster} art={art} /> : <Insert poster={sheet.poster} art={art} />}
    <p className='scenario-action scenario-centred'>
      <Caps>{sheet.title}</Caps>. {sheet.date}
    </p>
    {!sheet.closed && <Pencil className='scenario-pencil-stamp'>{t('wrapped.common.draft')}</Pencil>}
  </>
)
