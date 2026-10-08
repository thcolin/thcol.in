import { useMemo, useState } from 'react'
import oleoo from 'oleoo'
import { Links, Tags, useReveal } from './shared'

const EXAMPLE = 'Arrival.2016.MULTi.2160p.WEB-DL.x265.EAC3-VCR'

const LOGO = [
  ' ▒█████   ██▓    ▓█████  ▒█████   ▒█████ ',
  '▒██▒  ██▒▓██▒    ▓█   ▀ ▒██▒  ██▒▒██▒  ██▒',
  '▒██░  ██▒▒██░    ▒███   ▒██░  ██▒▒██░  ██▒',
  '▒██   ██░▒██░    ▒▓█  ▄ ▒██   ██░▒██   ██░',
  '░ ████▓▒░░██████▒░▒████▒░ ████▓▒░░ ████▓▒░',
  '░ ▒░▒░▒░ ░ ▒░▓  ░░░ ▒░ ░░ ▒░▒░▒░ ░ ▒░▒░▒░ ',
]

// The README's own edge, the gradient its logo is drawn with
const EDGE = '░▒▓█'.repeat(120)

const FACTS = [
  ['6697', 'releases, the same result in all three'],
  ['3', 'packages, JavaScript, Go and Rust, one version number'],
  ['0', 'dependency on npm'],
]

const FIELDS = [
  ['title', (result) => result.title || null],
  ['year', (result) => result.year],
  ['language', (result) => result.language],
  ['resolution', (result) => result.resolution],
  ['source', (result) => result.source],
  ['encoding', (result) => result.encoding],
  ['dub', (result) => result.dub],
  ['group', (result) => result.group],
  ['flags', (result) => result.flags.join(' ') || null],
]

const parse = (name) => {
  if (!name.trim()) {
    return null
  }

  try {
    return oleoo.parse(name, { strict: false, flagged: true })
  } catch {
    return null
  }
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Where in the name each field was read: the rules of the value oleoo found, matched again on the name
const marksOf = (value, result) => {
  if (!result) {
    return []
  }

  const marks = []
  const free = (start, end) => marks.every((mark) => end <= mark.start || start >= mark.end)
  const mark = (field, patterns) => {
    for (const rule of patterns) {
      let regexp

      try {
        regexp = new RegExp(`(?<![a-z0-9])(?:${typeof rule === 'string' ? rule : rule.pattern})(?![a-z0-9])`, 'gi')
      } catch {
        continue
      }

      for (const match of value.matchAll(regexp)) {
        const start = match.index ?? 0
        const end = start + match[0].length

        if (match[0] && free(start, end)) {
          marks.push({ start, end, field })
          return
        }
      }
    }
  }

  if (result.group) {
    const start = value.lastIndexOf(result.group)

    if (start > 0 && free(start, start + result.group.length)) {
      marks.push({ start, end: start + result.group.length, field: 'group' })
    }
  }

  if (result.year) {
    mark('year', [escape(result.year)])
  }

  if (result.resolution) {
    mark('resolution', oleoo.rules.resolution[result.resolution])
  }

  if (result.source) {
    mark('source', oleoo.rules.source[result.source])
  }

  if (result.encoding) {
    mark('encoding', oleoo.rules.encoding[result.encoding])
  }

  if (result.dub) {
    mark('dub', oleoo.rules.dub[result.dub])
  }

  result.languages.forEach((language) => mark('language', oleoo.rules.language[language]))
  result.flags.forEach((flag) => mark('flags', oleoo.rules.flags[flag]))

  // The title runs from the start up to the first field read
  const first = Math.min(value.length, ...marks.map(({ start }) => start))
  const title = value.slice(0, first).replace(/[.\-_\s([]+$/, '')

  if (result.title && title) {
    marks.push({ start: 0, end: title.length, field: 'title' })
  }

  return marks.sort((a, b) => a.start - b.start)
}

const SEPARATOR = /([.\-_\s()[\]]+)/

// The name cut at its separators, each word carrying the field it fed and the separator after it,
// the field named under its first word
const piecesOf = (value, marks) => {
  const pieces = []
  const cut = (text, field) => text.split(SEPARATOR).forEach((part, index) => {
    if (index % 2) {
      pieces[pieces.length - 1].separator += part
    } else if (part || !pieces.length) {
      const label = !!field && !pieces.some((piece) => piece.field === field)
      pieces.push({ word: part, separator: '', field: part ? field : undefined, label })
    }
  })
  let cursor = 0

  marks.forEach(({ start, end, field }) => {
    cut(value.slice(cursor, start))
    cut(value.slice(start, end), field)
    cursor = end
  })

  cut(value.slice(cursor))
  return pieces.filter((piece) => piece.word || piece.separator)
}

// The textarea grows with the name through an invisible copy of it laid out the same way
const Release = ({ value, onChange }) => {
  const result = useMemo(() => parse(value), [value])
  const pieces = useMemo(() => piecesOf(value, marksOf(value, result)), [value, result])

  return (
    <>
      <div className='oleoo__prompt'>
        <span aria-hidden='true' className='oleoo__caret'>&gt;</span>
        <div className='oleoo__release'>
          <div aria-hidden='true' className='oleoo__mirror'>{value || EXAMPLE}{'​'}</div>
          <textarea
            id='oleoo-release'
            rows={1}
            value={value}
            placeholder={EXAMPLE}
            spellCheck={false}
            autoComplete='off'
            autoCapitalize='off'
            onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
            onChange={(event) => onChange(event.target.value.replace(/[\r\n]+/g, ''))}
            className='oleoo__input'
          />
        </div>
      </div>
      <p aria-hidden='true' className='oleoo__tokens'>
        {pieces.map(({ word, separator, field, label }, index) => (
          <span key={index}>
            <span data-field={label ? field : undefined} className={field ? 'oleoo__token' : 'oleoo__piece'}>{word}</span>
            <span className='oleoo__piece'>{separator}</span>
          </span>
        ))}
      </p>
      <dl aria-live='polite' className='oleoo__fields'>
        {FIELDS.map(([key, read]) => {
          const found = result ? read(result) : null

          return (
            <div key={key} className={key === 'title' ? 'oleoo__field oleoo__field--wide' : 'oleoo__field'}>
              <dt>{key}</dt>
              <dd className={found ? undefined : 'is-missing'}>{found ?? '—'}</dd>
            </div>
          )
        })}
      </dl>
    </>
  )
}

export const Oleoo = () => {
  const [value, setValue] = useState(EXAMPLE)
  const [ref, shown] = useReveal()

  return (
    <article className='band oleoo' aria-labelledby='oleoo'>
      <div aria-hidden='true' className='oleoo__edge'>{EDGE}</div>
      <div ref={ref} className='band__column band__split oleoo__split'>
        <div className='band__text'>
          <h3 id='oleoo' className='visually-hidden'>oleoo</h3>
          <pre aria-hidden='true' className='oleoo__logo'>
            {LOGO.map((line, index) => (
              <span key={index} style={{ transitionDelay: `${index * 70}ms` }} className={shown ? 'is-shown' : undefined}>{line}</span>
            ))}
          </pre>
          <p className='oleoo__subtitle'>Scene/P2P/Warez release name parser</p>
          <p className='oleoo__forum'>Named after an old French warez forum closed in 2008.</p>
          <dl className='oleoo__facts'>
            {FACTS.map(([fact, detail]) => (
              <div key={fact}>
                <dt>{fact}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
          <Tags items={['JavaScript', 'Go', 'Rust', 'rules.json + SPEC.md']} />
          <Links links={[
            ['npm', 'https://www.npmjs.com/package/oleoo'],
            ['crates.io', 'https://crates.io/crates/oleoo'],
            ['pkg.go.dev', 'https://pkg.go.dev/github.com/thcolin/oleoo/packages/go/v3'],
            ['GitHub', 'https://github.com/thcolin/oleoo'],
          ]} />
        </div>
        <div className='band__demo oleoo__parse'>
          <label htmlFor='oleoo-release' className='oleoo__label'>Release name, parsed as you type</label>
          <Release value={value} onChange={setValue} />
        </div>
      </div>
    </article>
  )
}
