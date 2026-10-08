import { Trans } from '../../i18n'
import { QUOTED, months, number, quantity, suffix, t } from '../../sheets'
import './tele.css'

// The magazine's sections, printed in the running head of each page
export const rubric = (sheet) => {
  switch (sheet.kind) {
    case 'opening':
      return t('wrapped.tele.rubrics.opening')
    case 'rank':
      return t('wrapped.tele.rubrics.rank')
    case 'streak':
      return t('wrapped.tele.rubrics.streak')
    case 'months':
      return t('wrapped.tele.rubrics.months')
    case 'binge':
      return t('wrapped.tele.rubrics.binge')
    case 'night':
      return t('wrapped.tele.rubrics.night')
    case 'server':
      return t('wrapped.tele.rubrics.server')
    case 'figure':
      return t(sheet.variant === 'twin' ? 'wrapped.tele.rubrics.twin' : 'wrapped.tele.rubrics.onlyYou')
    case 'duo':
      return t('wrapped.tele.rubrics.duo')
    case 'posters':
      return t(sheet.variant === 'dropped' ? 'wrapped.tele.rubrics.dropped' : 'wrapped.tele.rubrics.outliers')
    case 'genre':
      return t('wrapped.tele.rubrics.genre')
    case 'finale':
      return t('wrapped.tele.rubrics.finale')
  }
}

export const Folio = ({ name, rubric, page }) => (
  <p className='tele-folio' aria-hidden='true'>
    <span>
      {t('wrapped.tele.brand')} {name}
    </span>
    <b>{rubric}</b>
    <span>{t('wrapped.tele.page', { page })}</span>
  </p>
)

// The last line, or the last word of a single line, sits on a band of colour
export const Headline = ({ lines, as: Tag = 'h2' }) => {
  const words = lines.length > 1 ? lines : lines[0].split(' ')
  const head = lines.length > 1 ? lines.slice(0, -1).join(' ') : words.slice(0, -1).join(' ')
  return (
    <Tag className='tele-headline'>
      {head && <>{head} </>}
      <span className='tele-band'>{words[words.length - 1]}</span>
    </Tag>
  )
}

export const Photo = ({ poster, art, kind = 'thumb', width = 640, className = '', eager }) => {
  const src = art(poster, kind, width) || art(poster, kind === 'thumb' ? 'art' : 'thumb', width)
  return src ? (
    <img className={`tele-photo tele-photo-${kind} ${className}`} src={src} alt={poster.title} loading={eager ? 'eager' : 'lazy'} decoding='async' />
  ) : (
    <span className={`tele-photo tele-photo-${kind} tele-photo-none ${className}`} role='img' aria-label={poster.title}>
      <span aria-hidden='true'>{poster.title}</span>
    </span>
  )
}

export const Big = ({ value, spoken, suffix }) => (
  <p className='tele-big'>
    <span aria-hidden='true'>
      {number.format(value)}
      {suffix && <sup>{suffix}</sup>}
    </span>
    <span className='visually-hidden'>{spoken}</span>
  </p>
)

export const Barcode = () => (
  <span className='tele-barcode' aria-hidden='true'>
    <i />
  </span>
)

// A quantity stands out with its unit: not a date, nor the digits of a name or of a title in quotes
export const figures = (text) =>
  text.split(QUOTED).flatMap((part, index) => {
    if (index % 2) return [part]
    const bits = []
    let from = 0
    for (const match of part.matchAll(quantity())) {
      bits.push(
        part.slice(from, match.index),
        <b key={`${index}-${match.index}`} className='tele-figure'>
          <span className='tele-figure-n'>{match[1]}</span>
          {match[2] && <> {match[2]}</>}
        </b>,
      )
      from = match.index + match[0].length
    }
    return [...bits, part.slice(from)]
  })

// The cover of the issue: the first poster full bleed, the masthead, the year's figures
export const Cover = ({ sheet, name, art, sticker, colophon }) => {
  const [star, ...inset] = sheet.posters
  const [lead, ...rest] = sheet.figures
  return (
    <div className='tele-cover'>
      {star && (
        <div className='tele-cover-star'>
          <Photo poster={star} art={art} width={1280} eager />
        </div>
      )}
      <header className='tele-mast' aria-hidden='true'>
        <p className='tele-logo' style={{ '--letters': name.length + t('wrapped.tele.brand').length }}>
          {t('wrapped.tele.brand')}
          <span>{name}</span>
        </p>
        <p className='tele-issue'>
          <Trans i18nKey='wrapped.tele.issue' values={{ year: sheet.year }} components={[<b />]} />
        </p>
      </header>
      {sticker || (
        <p className='tele-sticker' aria-hidden='true'>
          <span>
            <Trans i18nKey='wrapped.tele.sticker' components={[<b />]} />
          </span>
        </p>
      )}
      <div className='tele-cover-lines'>
        {sheet.lede && <p className='tele-cover-lede'>{sheet.lede}</p>}
        <h1 className='tele-cover-title'>{sheet.title}</h1>
        {lead && <p className='tele-cover-line tele-cover-line-lead'>{figures(lead)}</p>}
        {rest.map((figure) => (
          <p key={figure} className='tele-cover-line'>
            {figures(figure)}
          </p>
        ))}
        {!!inset.length && !colophon?.short && (
          <ul className='tele-inset'>
            {inset.map((poster) => (
              <li key={poster.key}>
                <Photo poster={poster} art={art} width={320} eager />
              </li>
            ))}
          </ul>
        )}
        {colophon?.short && <p className='tele-cover-lede'>{colophon.short}</p>}
        {colophon && <p className='tele-cover-colophon'>{colophon.text}</p>}
      </div>
      <Barcode />
    </div>
  )
}

// The ratings of the server: the first, the reader, the middle and the last, each with the hours known for it
export const Ratings = ({ sheet }) => {
  const middle = Math.ceil(sheet.users / 2)
  const hoursOf = (rank) => (rank === sheet.rank ? sheet.hours : rank === 1 ? sheet.max : rank === middle ? sheet.median : null)
  const top = sheet.max || sheet.hours
  return (
    <table className='tele-ratings' aria-hidden='true'>
      <tbody>
        {[...new Set([1, sheet.rank, middle, sheet.users])]
          .sort((a, b) => a - b)
          .flatMap((rank, index, ranks) => {
            const hours = hoursOf(rank)
            return [
              index > 0 && rank - ranks[index - 1] > 1 && (
                <tr key={`gap-${rank}`} className='tele-ratings-gap'>
                  <td colSpan={2}>…</td>
                </tr>
              ),
              <tr key={rank} className={rank === sheet.rank ? 'tele-ratings-you' : undefined}>
                <th>
                  {rank}
                  <sup>{suffix(rank)}</sup>
                </th>
                <td>
                  {rank === sheet.rank && <b>{t('wrapped.common.you')}</b>}
                  {rank !== sheet.rank && rank === middle && <span className='tele-ratings-label'>{t('wrapped.common.median')}</span>}
                  {hours !== null ? (
                    <span className='tele-ratings-bar' style={{ '--share': Math.max(hours / top, 0.04) }}>
                      <span>{t('wrapped.common.hours', { hours: number.format(hours) })}</span>
                    </span>
                  ) : (
                    rank !== sheet.rank && <span className='tele-ratings-blank' />
                  )}
                </td>
              </tr>,
            ]
          })}
      </tbody>
    </table>
  )
}

// A paragraph of the model cut at its sentences, so each can take its own place on the page
export const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ý0-9«“])/)

// Each figure on its own line, set as large as the page allows
export const Stats = ({ stats }) => (
  <ul className='tele-stats'>
    {stats.map((stat) => (
      <li key={stat.unit}>
        <b>{stat.value}</b> <span>{stat.unit}</span>
      </li>
    ))}
  </ul>
)

// Two viewers as two circles, the titles they share where they cross
export const Venn = ({ name, count, spoken, sides }) => (
  <div className='tele-venn'>
    <p className='tele-venn-side tele-venn-you' aria-hidden='true'>
      <b>{t('wrapped.common.you')}</b>
      <span>{number.format(sides.you)}</span>
    </p>
    <p className='tele-venn-side tele-venn-them' aria-hidden='true'>
      <b>{name}</b>
      {sides.them !== null && <span>{number.format(sides.them)}</span>}
    </p>
    <p className='tele-venn-shared'>
      <span aria-hidden='true'>{number.format(count)}</span>
      <span className='visually-hidden'>{spoken}</span>
    </p>
  </div>
)

// Each title watched at two is a reader's letter, signed with the other viewer
export const Letter = ({ poster, art, lead }) => (
  <article className={`tele-letter${lead ? ' tele-letter-lead' : ''}`}>
    <Photo poster={poster} art={art} width={lead ? 640 : 320} />
    <div>
      <h3 className='tele-pick-title'>{poster.title}</h3>
      <p className='tele-letter-sign'>{figures(poster.caption)}</p>
    </div>
  </article>
)

// Each figure a review, with its poster
export const Review = ({ item: { what, poster, detail, when }, art, lead }) => (
  <article className={`tele-review${lead ? ' tele-review-lead' : ''}`}>
    <Photo poster={poster} art={art} />
    <div>
      <p className='tele-review-what'>{what}</p>
      <h3 className='tele-pick-title'>{poster.title}</h3>
      <p className='tele-review-detail'>{figures(detail)}</p>
      {when && <p className='tele-review-when'>{when}</p>}
    </div>
  </article>
)

export const Sign = ({ className }) => (
  <svg className={className} viewBox='0 0 100 100' aria-hidden='true'>
    <circle cx='50' cy='50' r='46' />
    <path d='M28 64 C 34 36, 48 30, 50 50 C 52 70, 66 64, 72 36' />
    <circle className='tele-sign-dot' cx='72' cy='36' r='5' />
  </svg>
)
