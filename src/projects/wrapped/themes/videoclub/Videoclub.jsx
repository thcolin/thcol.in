import { useEffect, useState } from 'react'
import { QUOTED, number, quantity, quoted, suffix, t } from '../../sheets'
import './videoclub.css'

// Tape and case colours, picked from the key so a show keeps its colour from one shelf to the next
const TAPES = ['#c3242b', '#1c4fb8', '#1e8a4a', '#d99a12', '#6c2bb3', '#d9531e']

export const tapeOf = (key) => TAPES[[...key].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7) % TAPES.length]

const tilts = (count) => Array.from({ length: count }, (_, index) => (count > 1 ? (index / (count - 1) - 0.5) * 24 : 0))

// A quantity is priced with its unit: not a date, nor the digits of a name or of a title in quotes
export const figures = (text) =>
  text.split(QUOTED).flatMap((part, index) => {
    if (index % 2) return [part]
    const bits = []
    let from = 0
    for (const match of part.matchAll(quantity())) {
      bits.push(
        part.slice(from, match.index),
        <b key={`${index}-${match.index}`} className='videoclub-figure'>
          <span className='videoclub-figure-n'>{match[1]}</span>
          {match[2] && <> {match[2]}</>}
        </b>,
      )
      from = match.index + match[0].length
    }
    return [...bits, part.slice(from)]
  })

// A paragraph of the model cut at its sentences
export const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ý0-9«“])/)

// Price tags hung side by side, one figure each, the unit under it
export const Tags = ({ stats }) => (
  <ul className='videoclub-tags'>
    {stats.map((stat, index) => (
      <li key={stat.unit} className='videoclub-tag' style={{ '--turn': `${index % 2 ? 3 : -3}deg` }}>
        <b>{stat.value}</b> <span>{stat.unit}</span>
      </li>
    ))}
  </ul>
)

export const Neon = ({ lines, as: Tag = 'h2', tone = 'pink', className }) => (
  <Tag className={`videoclub-neon videoclub-neon-${tone} ${className || ''}`}>
    {lines.map((line) => (
      <span key={line}>{line}</span>
    ))}
  </Tag>
)

// A VHS case facing out: the sleeve under the plastic lip, a sticker, a handwritten label
export const Box = ({ poster, art, width = 640, tilt = 0, sticker, label, className, eager }) => {
  const src = art(poster, 'thumb', width)
  return (
    <figure className={`videoclub-box ${className || ''}`} style={{ '--ry': `${tilt}deg`, '--case': tapeOf(poster.key) }}>
      <span className='videoclub-box-case'>
        <span className='videoclub-box-sleeve'>
          {src ? <img src={src} alt={poster.title} loading={eager ? 'eager' : 'lazy'} /> : <span className='videoclub-box-blank'>{poster.title}</span>}
        </span>
        {sticker && <span className='videoclub-sticker'>{sticker}</span>}
      </span>
      {label && <figcaption className='videoclub-label'>{label}</figcaption>}
    </figure>
  )
}

// The spine of a tape on its shelf, the title written by hand on its label
export const Spines = ({ poster, count }) => (
  <span className='videoclub-spines' aria-hidden='true' style={{ '--tape': tapeOf(poster.key) }}>
    {Array.from({ length: count }, (_, index) => (
      <i key={index} className='videoclub-spine'>
        <span>{poster.title}</span>
      </i>
    ))}
  </span>
)

// Covers standing on a plank, each with its title and an optional handwritten note
const Shelf = ({ posters, art, titled = true, className }) => (
  <ul className={`videoclub-shelf ${className || ''}`} data-count={posters.length}>
    {posters.map((poster, index) => (
      <li key={poster.key} className='videoclub-shelf-entry'>
        <Box poster={poster} art={art} width={320} tilt={tilts(posters.length)[index]} />
        <span className='videoclub-plank' aria-hidden='true' />
        {titled && <span className='videoclub-shelf-title'>{poster.title}</span>}
      </li>
    ))}
  </ul>
)

// The shop's name over its door: the head on the lightbox, the name in tube, the year on its plate
export const Sign = ({ sheet }) => {
  const [lit, setLit] = useState(false)
  const at = sheet.title.indexOf(sheet.name)
  const [head, tail] = at < 0 ? [sheet.title, ''] : [sheet.title.slice(0, at).trim(), sheet.title.slice(at + sheet.name.length).trim()]
  const letters = at < 0 ? [] : [...sheet.name]
  // One tube has gone out, as on any sign that has been up a few winters
  const dead = letters.length > 3 ? Math.floor(letters.length / 2) : -1
  useEffect(() => {
    // The tubes strike once the face is in, or the flicker plays on a fallback font
    let live = true
    const strike = () => live && setLit(true)
    document.fonts?.load('1em "Tilt Neon"').then(strike, strike) ?? strike()
    return () => {
      live = false
    }
  }, [])
  return (
    <h1 className={`videoclub-sign ${lit ? 'videoclub-sign-on' : ''}`}>
      <span className='visually-hidden'>{sheet.title}</span>
      <span className='videoclub-fascia' aria-hidden='true'>
        <span className='videoclub-fascia-face'>{head}</span>
      </span>
      {!!letters.length && (
        <span className='videoclub-tube' aria-hidden='true'>
          {letters.map((letter, index) => (
            <span key={index} className={index === dead ? 'videoclub-tube-dead' : undefined} style={{ '--delay': `${0.5 + ((index * 7) % 5) * 0.12}s` }}>
              {letter === ' ' ? '\u00a0' : letter}
            </span>
          ))}
        </span>
      )}
      {tail && (
        <span className='videoclub-plate' aria-hidden='true'>
          {tail}
        </span>
      )}
    </h1>
  )
}

export const Opening = ({ sheet, art, first }) => {
  // The hero case stands in the middle, the others fan out from it
  const order = [3, 1, 0, 2, 4].map((index) => sheet.posters[index]).filter(Boolean)
  return (
    <section className='videoclub-sheet videoclub-opening' aria-label={sheet.label}>
      <Sign sheet={sheet} />
      {!!order.length && (
        <div className='videoclub-front'>
          {order.map((poster, index) => (
            <Box
              key={poster.key}
              poster={poster}
              art={art}
              className={poster === sheet.posters[0] ? 'videoclub-box-hero' : undefined}
              tilt={tilts(order.length)[index]}
              sticker={poster.key === first ? t('wrapped.videoclub.firstRental') : undefined}
            />
          ))}
        </div>
      )}
      <div className='videoclub-counter'>
        {sheet.lede && <p className='videoclub-lede'>{figures(sheet.lede)}</p>}
        <div className='videoclub-ticket videoclub-ticket-receipt'>
          <p className='videoclub-ticket-head' aria-hidden='true'>
            {t('wrapped.videoclub.receipt', { year: sheet.year })}
          </p>
          <ul>
            {sheet.figures.map((figure) => (
              <li key={figure}>{figures(figure)}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

// The membership card, its number embossed in the plastic
export const Rank = ({ sheet, name, server }) => (
  <section className='videoclub-sheet videoclub-rank' aria-label={sheet.label}>
    <Neon lines={[sheet.label]} tone='cyan' />
    <div className='videoclub-card'>
      <p className='visually-hidden'>
        {sheet.rank}
        {sheet.suffix} {sheet.unit}
      </p>
      <div className='videoclub-card-face' aria-hidden='true'>
        <span className='videoclub-card-brand'>{t('wrapped.themes.videoclub')}</span>
        {server && <span className='videoclub-card-server'>{server}</span>}
        <span className='videoclub-card-chip' />
        <span className='videoclub-card-number'>
          {String(sheet.rank).padStart(4, '0')} / {number.format(sheet.users)}
        </span>
        <span className='videoclub-card-holder'>{name}</span>
        <span className='videoclub-card-since'>
          {sheet.rank}
          <sup>{sheet.suffix}</sup> {sheet.unit}
        </span>
      </div>
    </div>
    <div className='videoclub-rank-text'>
      <p className='videoclub-lede'>{figures(sheet.detail)}</p>
      <Board sheet={sheet} />
    </div>
  </section>
)

// The best customers, pinned on the felt letter board by the till: the first, the reader, the middle and the last
const Board = ({ sheet }) => {
  const middle = Math.ceil(sheet.users / 2)
  const hoursOf = (rank) => (rank === sheet.rank ? sheet.hours : rank === 1 ? sheet.max : rank === middle ? sheet.median : null)
  return (
    <div className='videoclub-board'>
      <p className='videoclub-board-head' aria-hidden='true'>
        {t('wrapped.videoclub.topCustomers')}
      </p>
      <ol aria-hidden='true'>
        {[...new Set([1, sheet.rank, middle, sheet.users])]
          .sort((a, b) => a - b)
          .flatMap((rank, index, ranks) => {
            const hours = hoursOf(rank)
            return [
              index > 0 && rank - ranks[index - 1] > 1 && (
                <li key={`gap-${rank}`} className='videoclub-board-gap'>
                  …
                </li>
              ),
              <li key={rank} className={rank === sheet.rank ? 'videoclub-board-you' : undefined}>
                <span>
                  {rank}
                  {suffix(rank)}
                </span>
                <span>{rank === sheet.rank ? t('wrapped.common.you') : rank === middle ? t('wrapped.common.median') : ''}</span>
                <span>{hours !== null ? t('wrapped.common.hours', { hours: number.format(hours) }) : ''}</span>
              </li>,
            ]
          })}
      </ol>
      <p className='visually-hidden'>{sheet.compare}</p>
    </div>
  )
}

// A box set, one spine per episode of that evening
export const Binge = ({ sheet, art, episodes }) => (
  <section className={`videoclub-sheet videoclub-binge${sheet.paced_stats.length ? '' : ' videoclub-binge-solo'}`} aria-label={sheet.label}>
    <Neon lines={sheet.lines} tone='pink' />
    <div className='videoclub-binge-visual'>
      <div className='videoclub-set' style={{ '--count': Math.min(episodes, 40) }}>
        <Box poster={sheet.poster} art={art} className='videoclub-box-large' />
        {!!episodes && <Spines poster={sheet.poster} count={Math.min(episodes, 40)} />}
      </div>
      <div className='videoclub-shelf-card'>
        <h3>{sheet.title}</h3>
        {sheet.date && <p>{sheet.date}</p>}
      </div>
      <Tags stats={sheet.stats} />
    </div>
    {sheet.pace && !!sheet.paced_stats.length && (
      <div className='videoclub-binge-text'>
        <div className='videoclub-pace'>
          <Box poster={sheet.pace} art={art} width={320} tilt={6} />
          <div className='videoclub-pace-text'>
            <div className='videoclub-shelf-card'>
              <h3>{sheet.pace.title}</h3>
            </div>
            <Tags stats={sheet.paced_stats} />
          </div>
        </div>
      </div>
    )}
  </section>
)

export const Server = ({ sheet, art }) => (
  <section className='videoclub-sheet videoclub-server' aria-label={sheet.label}>
    <Neon lines={sheet.lines} tone='pink' />
    <div className='videoclub-spot'>
      <Box
        poster={sheet.poster}
        art={art}
        className='videoclub-box-large'
        sticker={t(sheet.first ? 'wrapped.videoclub.exclusive' : 'wrapped.videoclub.sameWeek')}
      />
    </div>
    <div className='videoclub-shelf-card'>
      <h3>{sheet.title}</h3>
      {sentences(sheet.bare).map((sentence) => (
        <p key={sentence}>{figures(sentence)}</p>
      ))}
    </div>
  </section>
)

// Personne d’autre: the shelf of the titles nobody else rents
export const Nobody = ({ sheet, art }) => (
  <section className='videoclub-sheet videoclub-nobody' aria-label={sheet.label}>
    <Neon lines={[sheet.label]} tone='cyan' />
    <p className='videoclub-price'>
      <span aria-hidden='true'>{number.format(sheet.count)}</span>
      <span className='visually-hidden'>{sheet.spoken}</span>
      <span className='videoclub-price-unit'>{sheet.unit}</span>
    </p>
    <p className='videoclub-lede'>{figures(sheet.details)}</p>
    {!!sheet.posters.length && (
      <div className='videoclub-aisle'>
        <p className='videoclub-aisle-tag' aria-hidden='true'>
          {t('wrapped.videoclub.rarities')}
        </p>
        <Shelf posters={sheet.posters} art={art} />
      </div>
    )}
  </section>
)

// Ton jumeau: a loan card both names are written on
export const Twin = ({ sheet, art }) => {
  const [before, after] = sheet.highlight ? sheet.unit.split(sheet.highlight) : [sheet.unit, '']
  const [chapo, ...more] = sentences(sheet.details)
  return (
    <section className='videoclub-sheet videoclub-twin' aria-label={sheet.label}>
      <Neon lines={sheet.lines || [sheet.label]} tone='pink' />
      <div className='videoclub-loan'>
        <p className='videoclub-loan-head' aria-hidden='true'>
          {t('wrapped.videoclub.loanCard')}
        </p>
        <p className='videoclub-loan-figure'>
          <span aria-hidden='true'>{number.format(sheet.count)}</span>
          <span className='visually-hidden'>{sheet.spoken}</span>
          <span className='videoclub-loan-unit'>
            {before}
            {sheet.highlight && <em>{sheet.highlight}</em>}
            {after}
          </span>
        </p>
        {sheet.sides && (
          <dl className='videoclub-loan-ledger'>
            <div>
              <dt>{t('wrapped.common.you')}</dt>
              <dd>{t('wrapped.count.titles', { count: sheet.sides.you })}</dd>
            </div>
            {sheet.highlight && sheet.sides.them !== null && (
              <div>
                <dt>{sheet.highlight}</dt>
                <dd>{t('wrapped.count.titles', { count: sheet.sides.them })}</dd>
              </div>
            )}
          </dl>
        )}
        {/* The ledger says the first sentence already */}
        {(sheet.sides ? more : [chapo, ...more]).map((sentence) => (
          <p key={sentence} className='videoclub-loan-details'>
            {figures(sentence)}
          </p>
        ))}
      </div>
      {!!sheet.posters.length && <Shelf posters={sheet.posters} art={art} />}
    </section>
  )
}

// Vus à deux: one loan card per title, the other borrower written in
export const Duo = ({ sheet, art }) => (
  <section className='videoclub-sheet videoclub-duo' aria-label={sheet.label}>
    <Neon lines={sheet.lines} tone='cyan' />
    <p className='videoclub-lede'>{figures(sheet.lede)}</p>
    <ul className='videoclub-loans' data-count={sheet.posters.length}>
      {sheet.posters.map((poster, index) => (
        <li key={poster.key} className='videoclub-loan videoclub-loan-small' style={{ '--turn': `${index % 2 ? 1.5 : -1.5}deg` }}>
          <Box poster={poster} art={art} width={320} />
          <div>
            <p className='videoclub-loan-title'>{poster.title}</p>
            <p className='videoclub-loan-hand'>{figures(poster.caption)}</p>
          </div>
        </li>
      ))}
    </ul>
  </section>
)

// One case per figure, the figure written on its label
export const Posters = ({ sheet, art }) => (
  <section className='videoclub-sheet videoclub-posters' aria-label={sheet.label}>
    <Neon lines={sheet.lines} tone={sheet.variant === 'outliers' ? 'cyan' : 'pink'} />
    <ol className='videoclub-shelf videoclub-shelf-large' data-count={sheet.items.length}>
      {sheet.items.map(({ what, poster, detail, when }, index) => (
        <li key={poster.key} className='videoclub-shelf-entry'>
          <Box poster={poster} art={art} tilt={tilts(sheet.items.length)[index]} sticker={what} label={detail} />
          <span className='videoclub-plank' aria-hidden='true' />
          <h3 className='videoclub-shelf-title'>{poster.title}</h3>
          {when && <p className='videoclub-shelf-when'>{when}</p>}
        </li>
      ))}
    </ol>
  </section>
)

// The genre's own aisle, its sign hanging over the shelves
export const Genre = ({ sheet, art }) => {
  const { lead } = sheet
  return (
    <section className='videoclub-sheet videoclub-genre' aria-label={sheet.label}>
      <Neon lines={sheet.lines} tone='cyan' as='h2' />
      <p className='videoclub-aisle-sign'>{sheet.name}</p>
      <p className='videoclub-lede'>{figures(sheet.count)}</p>
      <Shelf posters={sheet.posters} art={art} />
      {lead && (
        <p className='videoclub-lede'>
          <strong>{lead.name}</strong> {figures(lead.role)}
        </p>
      )}
      {/* A show in the lead is its own poster, its title already written above */}
      {lead && !!lead.posters.length && <Shelf posters={lead.posters} art={art} titled={!lead.posters.every((poster) => quoted(poster.title) === lead.name)} />}
    </section>
  )
}

// Closing time: the shutter comes down over the last case in the window
export const Finale = ({ sheet, art }) => (
  <section className='videoclub-sheet videoclub-finale' aria-label={sheet.label}>
    <Neon lines={sheet.lines} tone='pink' />
    <div className='videoclub-window' data-closed={sheet.closed}>
      <Box poster={sheet.poster} art={art} className='videoclub-box-large' sticker={sheet.closed ? undefined : t('wrapped.common.draft')} />
      <div className='videoclub-shutter' aria-hidden='true' />
      <p className='videoclub-end'>{sheet.end}</p>
    </div>
    <div className='videoclub-shelf-card'>
      <h3>{sheet.title}</h3>
      <p>{sheet.date}</p>
    </div>
  </section>
)
