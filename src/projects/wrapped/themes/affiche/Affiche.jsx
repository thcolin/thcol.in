import { useEffect, useId } from 'react'
import { animate, useMotionValue, useReducedMotion } from '../../motion'
import { QUOTED, number, quantity, t } from '../../sheets'
import { Painted } from './Painted'
import { Lettering, Sheet, lean } from './Sheet'
import './affiche.css'

// A quantity is lettered with its unit: not a date, nor the digits of a name or of a title in quotes
export const figures = (text) =>
  text.split(QUOTED).flatMap((part, index) => {
    if (index % 2) return [part]
    const bits = []
    let from = 0
    for (const match of part.matchAll(quantity())) {
      bits.push(
        part.slice(from, match.index),
        <b key={`${index}-${match.index}`} className='daub' style={{ '--lean': `${(lean(match.index || 0, index + 3) - 0.5) * 8}deg` }}>
          <span className='daub-n'>{match[1]}</span>
          {match[2] && (
            <>
              {' '}
              <span className='daub-unit'>{match[2]}</span>
            </>
          )}
        </b>,
      )
      from = (match.index || 0) + match[0].length
    }
    return [...bits, part.slice(from)]
  })

// Figures stacked like the lettering of a poster, each leaning its own way
export const Stats = ({ stats, seed, className = '' }) => (
  <ul className={`stats ${className}`}>
    {stats.map((stat, index) => (
      <li key={stat.unit} style={{ '--lean': `${(lean(index, seed) - 0.5) * 9}deg` }}>
        <b>{stat.value}</b> <span>{stat.unit}</span>
      </li>
    ))}
  </ul>
)

export const Opening = ({ sheet, art }) => {
  const reduced = useReducedMotion()
  const progress = useMotionValue(reduced ? 1 : 0)
  useEffect(() => {
    if (!reduced) {
      const controls = animate(progress, 1, { duration: 2.4, delay: 0.6, ease: [0.16, 1, 0.3, 1] })
      return () => controls.stop()
    }
  }, [reduced])
  return (
    <Sheet className='sheet-opening' label={sheet.label}>
      <div className='collage' data-count={sheet.posters.length}>
        {sheet.posters.map((poster, index) => (
          <Painted key={poster.key} className={`collage-${index}`} src={art(poster)} alt={poster.title} progress={progress} />
        ))}
      </div>
      <Lettering as='h1' className='opening-title' text={sheet.title} highlight={sheet.name} />
      {sheet.lede && <p className='lede'>{sheet.lede}</p>}
      <ul className='opening-figures'>
        {sheet.figures.map((figure) => (
          <li key={figure}>{figures(figure)}</li>
        ))}
      </ul>
      <svg className='scroll-hint' viewBox='0 0 40 90' aria-hidden='true'>
        <path d='M20 4 C 16 30, 25 52, 19 80 M8 64 C 13 72, 17 78, 19 84 C 23 76, 27 70, 33 62' />
      </svg>
    </Sheet>
  )
}

// One brush stroke per evening, struck through by five, crimson on the evenings of the title of the run
export const Tally = ({ nights, lead }) => (
  <ol className='tally' aria-hidden='true'>
    {Array.from({ length: Math.ceil(nights.length / 5) }, (_, group) => (
      <li key={group} className={`tally-group${(group + 1) * 5 <= nights.length ? ' tally-full' : ''}`}>
        {nights.slice(group * 5, group * 5 + 5).map(({ day, poster }, index) => (
          <i
            key={day}
            className={lead && poster?.key === lead ? 'tally-lead' : undefined}
            style={{ '--lean': `${(lean(group * 5 + index, 9) - 0.5) * 12}deg` }}
          />
        ))}
      </li>
    ))}
  </ol>
)

// A few posters with their titles, the proof behind a count
export const Strip = ({ posters, layout, caption, progress, art }) => (
  <ul className='strip' data-layout={layout}>
    {posters.map((poster) => (
      <li key={poster.key} className='strip-entry'>
        <Painted className='strip-poster' src={art(poster, 'thumb', 320)} alt={poster.title} progress={progress} />
        <span className='strip-title'>{poster.title}</span>
        {caption && <span className='strip-caption'>{caption(poster)}</span>}
      </li>
    ))}
  </ul>
)

// Two viewers as two daubs of paint, the titles they share where the paint overlaps
export const Twins = ({ name, count, spoken, sides }) => {
  const id = useId().replace(/:/g, '')
  return (
    <div className='twins'>
      <svg viewBox='0 0 400 240' aria-hidden='true'>
        <filter id={`${id}-dry`}>
          <feTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='2' seed={3} />
          <feDisplacementMap in='SourceGraphic' scale='10' />
        </filter>
        <circle className='twins-you' cx='140' cy='120' r='108' filter={`url(#${id}-dry)`} />
        <circle className='twins-them' cx='260' cy='120' r='108' filter={`url(#${id}-dry)`} />
      </svg>
      <p className='twins-side twins-side-you' aria-hidden='true'>
        <span>{t('wrapped.common.you')}</span>
        <b>{number.format(sides.you)}</b>
      </p>
      <p className='twins-side twins-side-them' aria-hidden='true'>
        <span>{name}</span>
        {sides.them !== null && <b>{number.format(sides.them)}</b>}
      </p>
      <p className='twins-shared'>
        <span aria-hidden='true'>{number.format(count)}</span>
        <span className='visually-hidden'>{spoken}</span>
      </p>
    </div>
  )
}

export const Rank = ({ sheet }) => {
  // The hours known on the server, each lettered as large as its share of the first viewer's
  const hours = [
    sheet.max !== null && sheet.rank > 1 && { label: t('wrapped.affiche.first'), hours: sheet.max },
    { label: t('wrapped.common.you'), hours: sheet.hours, you: true },
    { label: t('wrapped.common.median'), hours: sheet.median },
  ].filter(Boolean)
  const top = Math.max(...hours.map((entry) => entry.hours), 1)
  return (
    <Sheet className='sheet-rank' label={sheet.label}>
      <p className='rank'>
        <span aria-hidden='true'>
          {sheet.rank}
          <sup>{sheet.suffix}</sup>
        </span>
        <span className='visually-hidden'>
          {sheet.rank}
          {sheet.suffix}
        </span>
      </p>
      <Lettering className='rank-unit' text={sheet.unit} seed={11} />
      <ol className='crowd' aria-hidden='true'>
        {Array.from({ length: sheet.users }, (_, index) => (
          <li key={index} className={index === sheet.rank - 1 ? 'crowd-you' : undefined} />
        ))}
      </ol>
      <p className='rank-detail'>{figures(sheet.detail)}</p>
      <p className='visually-hidden'>{sheet.compare}</p>
      <ol className='rank-hours' aria-hidden='true'>
        {hours
          .sort((a, b) => b.hours - a.hours)
          .map((entry, index) => (
            <li
              key={entry.label}
              className={entry.you ? 'rank-hours-you' : undefined}
              style={{ '--share': Math.sqrt(entry.hours / top), '--lean': `${(lean(index, 14) - 0.5) * 8}deg` }}
            >
              <b>
                {number.format(entry.hours)}
                <small>{t('wrapped.affiche.h')}</small>
              </b>
              <span>{entry.label}</span>
            </li>
          ))}
      </ol>
    </Sheet>
  )
}
