import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Choices, Tags, usePrefersReducedMotion, useReveal } from './shared'
import './workflow.css'

// The sample vault of the kit, Monday 21/09: what each command writes, in the order it writes it
const COMMANDS = [
  {
    id: 'morning',
    label: '/morning',
    typed: '/morning',
    panel: 'calendar',
    text: 'Reads the planning, the tracker, the repositories and the sessions, then proposes a single action.',
    lines: [
      { tool: 'Bash', args: 'python3 agenda.py' },
      { result: '7 events this week, Monday to Thursday', fx: ['agenda'] },
      { tool: 'Bash', args: 'python3 etat.py repos' },
      { result: 'ACME-2 in review, no update for 5 days' },
      { tool: 'Bash', args: 'python3 dashboard.py' },
      { result: 'Calendar moved to 21/09, 1 overdue', fx: ['calendar'] },
      { say: 'Start with ACME-2: answer the review on the results sort, it has waited 5 days.' },
    ],
  },
  {
    id: 'ticket',
    label: '/ticket',
    typed: '/ticket ACME-1',
    panel: 'board',
    text: 'Takes a ticket end to end in its own worktree. Its card moves across the board as it goes.',
    lines: [
      { tool: 'Bash', args: 'git worktree add ../ACME-1' },
      { result: "Preparing worktree (new branch 'feat/ACME-1')" },
      { tool: 'Bash', args: 'python3 fiches.py set ACME-1 statut="diff ready"' },
      { result: 'ACME-1: 3 commits, tests green', fx: ['diff'] },
      { tool: 'Bash', args: 'python3 fiches.py set ACME-1 statut="in review"' },
      { result: 'ACME-1: merge request !42 opened', fx: ['review'] },
      { say: 'ACME-1 is in review. Login screen done, waiting on !42.' },
    ],
  },
  {
    id: 'evening',
    label: '/evening',
    typed: '/evening',
    panel: 'time',
    text: 'Counts the hours, writes the day in the journal and leaves the next action of each ticket.',
    lines: [
      { tool: 'Bash', args: 'python3 sessions.py' },
      { result: 'Today: Acme Corp 3.2 h, Beta SAS 2.9 h', fx: ['hours', 'bar'] },
      { tool: 'Write', args: 'journal/2026-09-21.md' },
      { result: 'Tickets: ACME-1 in review, BETA-7 in progress', fx: ['squares'] },
      { tool: 'Bash', args: 'python3 dashboard.py' },
      { result: 'Dashboard.md rewritten' },
      { say: 'Tomorrow: ACME-2, then the CSV import of BETA-7.' },
    ],
  },
]

// Effects already written when a command starts: everything the commands before it wrote
const before = (index) => COMMANDS.slice(0, index).flatMap(({ lines }) => lines.flatMap((line) => line.fx || []))

// Calendar: the hour band of the week, then thirty days from today. The track starts on Friday 18/09,
// the day the Dashboard was last computed, and /morning slides it to Monday 21/09
const HOURS = Array.from({ length: 12 }, (_, index) => 8 + index)
const hour = (value) => `${((value - 8) / 11) * 100}%`

const WEEK = [
  { day: 'Mo 21', events: [[9.5, 9.75, 'Daily']] },
  { day: 'Tu 22', events: [[9.5, 9.75, 'Daily'], [14, 15.6, 'Sprint sync with the product team']] },
  { day: 'We 23', events: [[9.5, 9.75, 'Daily'], [10, 12.1, 'Design workshop, annex 2 scoping']] },
  { day: 'Th 24', events: [[9.5, 9.75, 'Daily'], [16, 17.1, 'Code review']] },
]

const SPAN = 30
const SHIFT = 3
const DAYS = Array.from({ length: SPAN + SHIFT }, (_, index) => {
  const date = new Date(2026, 8, 18 + index)
  return {
    label: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
    off: [0, 5, 6].includes(date.getDay()),
  }
})

const LANES = [
  {
    label: 'Deadlines',
    points: [
      { at: 0, tint: 'due', title: 'Decide who covers the delivery on the 15th' },
      { at: 5, tint: 'due', title: 'Follow up on the Beta quote' },
      { at: 9, tint: 'todo', title: 'Prepare the acceptance testing with the client' },
    ],
  },
  { label: 'Acme', bars: [[3, 12, 'Annex 2 scoping'], [12, 26, 'Development']], milestone: [27, 'Delivery'] },
  { label: 'Beta', bars: [[5, 14, 'Import rework'], [14, 23, 'Client acceptance']] },
  { label: 'Off', bars: [[19, 22, 'Time off', 'off']] },
]

const DUE = {
  decide: { date: '18/09', text: 'Decide who covers the delivery on the 15th', before: 'today', after: '3 d overdue' },
  quote: { date: '23/09', text: 'Follow up on the Beta quote', before: 'in 5 d', after: 'in 2 d' },
  acceptance: { date: '27/09', text: 'Prepare the acceptance testing with the client', after: 'in 6 d' },
}

// Board: a column per state, a row per project. The moving card comes last so it lands under the others
const STATES = [['progress', 'In progress'], ['diff', 'Diff ready'], ['review', 'In review'], ['merged', 'Done']]

const CARDS = [
  { key: 'BETA-7', project: 'Beta SAS', title: 'CSV import', repo: 'core', state: () => 'progress' },
  { key: 'ACME-4', project: 'Acme Corp', title: 'Clear the cache on logout', repo: 'front', state: () => 'diff' },
  { key: 'ACME-2', project: 'Acme Corp', title: 'Fix the results sort', repo: 'api', stale: '5 d', state: () => 'review' },
  {
    key: 'ACME-1',
    project: 'Acme Corp',
    title: 'Login screen',
    repo: 'api',
    state: (fx) => (fx.has('review') ? 'review' : fx.has('diff') ? 'diff' : 'progress'),
  },
]

const PROJECTS = [
  { name: 'Beta SAS', tint: 'c2', keys: 'BETA-7', hours: 2.9, share: 47 },
  { name: 'Acme Corp', tint: 'c3', keys: 'ACME-1, ACME-4, ACME-2', hours: 3.2, share: 53 },
]

// Where my time goes: hours per day from 31/08, no project · Beta SAS · Acme Corp. The last one is today
const DAILY = [
  [0, 0.6, 3.2], [0, 0, 4], [6.4, 1.9, 1.1], [6, 1.5, 1.5], [0.4, 0, 0], [0, 0, 0], [0, 2.1, 0],
  [9.8, 6, 3.4], [7.7, 0.2, 2.6], [4.2, 0.4, 3.4], [5.3, 2.8, 10], [0, 3.8, 0], [0.2, 6, 0], [0, 0.9, 0],
  [11.3, 2.5, 6.2], [0, 1.9, 0], [2.8, 2.3, 5.3], [13.4, 3.8, 4.5], [0, 2.1, 0], [0, 0, 0], [0, 0, 0],
  [0, 2.9, 3.2],
]
const DATES = Array.from({ length: DAILY.length }, (_, index) => {
  const date = new Date(2026, 7, 31 + index)
  return {
    label: index % 7 ? '' : `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
    off: [0, 5, 6].includes(date.getDay()),
  }
})
const TODAY = DAILY.length - 1

// Tickets day by day: the state of each ticket touched that day, three places a day
const TOUCHED = [
  {
    name: 'Acme Corp',
    days: { 0: ['progress'], 1: ['progress', 'progress'], 3: ['progress'], 7: ['progress', 'progress'], 8: ['progress', 'progress', 'diff'], 9: ['progress'], 10: ['progress', 'diff'], 14: ['review'], 15: ['diff'], 16: ['diff', 'review'], 17: ['review', 'diff'], [TODAY]: ['review'] },
  },
  {
    name: 'Beta SAS',
    days: { 0: ['progress'], 1: ['progress'], 2: ['progress'], 7: ['diff'], 10: ['progress'], 15: ['diff'], 16: ['diff'], 17: ['diff'], [TODAY]: ['progress'] },
  },
]

const number = (value) => value.toFixed(1)

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

// A value that runs to its target instead of jumping there
const useTween = (target, instant, duration = 900) => {
  const [value, setValue] = useState(target)
  const current = useRef(target)

  useEffect(() => {
    if (instant) {
      current.current = target
      setValue(target)
      return
    }

    const origin = current.current
    const start = performance.now()
    let frame

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      current.current = origin + (target - origin) * (1 - (1 - progress) ** 3)
      setValue(current.current)

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, instant, duration])

  return value
}

// What changes place glides there from where it was: cards between columns, a deadline into Overdue
const useGlide = (instant) => {
  const root = useRef(null)
  const last = useRef(new Map())

  useLayoutEffect(() => {
    const origin = root.current.getBoundingClientRect()
    const next = new Map()

    root.current.querySelectorAll('[data-glide]').forEach((element) => {
      const rect = element.getBoundingClientRect()
      const at = { x: rect.left - origin.left, y: rect.top - origin.top }
      const from = last.current.get(element.dataset.glide)
      next.set(element.dataset.glide, at)

      if (from && !instant && (from.x !== at.x || from.y !== at.y)) {
        // In a narrow window the board scrolls sideways: it follows the card to its new column
        const frame = element.closest('.workflow-panel__scroll')

        if (frame && frame.scrollWidth > frame.clientWidth) {
          const box = frame.getBoundingClientRect()
          frame.scrollTo({ left: frame.scrollLeft + rect.left - box.left - (box.width - rect.width) / 2, behavior: 'smooth' })
        }

        element.animate(
          [{ translate: `${from.x - at.x}px ${from.y - at.y}px`, zIndex: 2 }, { translate: '0 0', zIndex: 2 }],
          { duration: 700, easing: EASE },
        )
      }
    })

    last.current = next
  })

  return root
}

const FADE = [{ opacity: 0, translate: '0 -6px' }, { opacity: 1, translate: '0 0' }]
const GROW = [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }]
const RISE = [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }]
const POP = [{ opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1 }]

// Played once, when the element first appears, and never while the Dashboard is being reset
const enter = (instant, keyframes, delay = 0) => (element) => {
  if (!element || 'entered' in element.dataset) {
    return
  }

  element.dataset.entered = ''

  if (!instant) {
    element.animate(keyframes, { duration: 650, delay, easing: EASE, fill: 'backwards' })
  }
}

const Panel = ({ title, legend, className = '', children, ...props }) => (
  <div className={`workflow-panel ${className}`} {...props}>
    <div className='workflow-panel__head'>
      <span className='workflow-panel__title'>{title}</span>
      {legend && <span className='workflow-panel__legend'>{legend}</span>}
    </div>
    <div className='workflow-panel__body'>{children}</div>
  </div>
)

const Key = ({ tint, shape = 'dot', children }) => (
  <span className='workflow-key'>
    <i data-tint={tint} className={`workflow-key__${shape}`} />
    {children}
  </span>
)

const Calendar = ({ fx, instant }) => {
  const fresh = fx.has('calendar')
  const now = fx.has('hours') ? 18.33 : 9.08
  const today = fresh ? SHIFT : 0
  const overdue = fresh ? ['decide'] : []
  const coming = fresh ? ['quote', 'acceptance'] : ['decide', 'quote']

  const row = (id) => (
    <li key={id} ref={enter(instant, FADE)} data-glide={id} className='workflow-list__row'>
      <span className='workflow-list__date'>{DUE[id].date}</span>
      <span className='workflow-list__text'>{DUE[id].text}</span>
      <span className='workflow-list__end'>{fresh ? DUE[id].after : DUE[id].before}</span>
    </li>
  )

  return (
    <Panel
      title='Calendar'
      className='workflow-panel--calendar'
      legend={<><Key tint='due'>deadline</Key><Key tint='meeting'>meeting</Key><Key tint='milestone' shape='diamond'>planning milestone</Key></>}
    >
      <div className='workflow-panel__scroll'>
        <div className='workflow-agenda'>
          <div className='workflow-agenda__row workflow-agenda__row--head'>
            <span />
            <span className='workflow-agenda__lane'>
              {HOURS.map((value) => <span key={value} className='workflow-agenda__hour' style={{ left: hour(value) }}>{value}:00</span>)}
            </span>
          </div>
          {WEEK.map(({ day, events }, index) => (
            <div key={day} className='workflow-agenda__row'>
              <span>{day}</span>
              <span className='workflow-agenda__lane'>
                {fx.has('agenda') && events.map(([from, to, title], rank) => (
                  <span
                    key={title}
                    ref={enter(instant, GROW, (index * 2 + rank) * 70)}
                    title={title}
                    className={to - from < 0.5 ? 'workflow-agenda__event is-short' : 'workflow-agenda__event'}
                    style={{ left: hour(from), width: `calc(${hour(to)} - ${hour(from)})` }}
                  >
                    {to - from < 0.5 ? null : title}
                  </span>
                ))}
                {fx.has('agenda') && index === 0 && <span className='workflow-agenda__now' style={{ left: hour(now) }} />}
              </span>
            </div>
          ))}
        </div>

        <div className='workflow-frise' style={{ '--days': SPAN + SHIFT, '--shift': fresh ? SHIFT : 0 }}>
          <div className='workflow-frise__row'>
            <span />
            <span className='workflow-frise__window'>
              <span className='workflow-frise__track workflow-frise__track--head'>
                {DAYS.map(({ label, off }, index) => (
                  <span key={label} className={['workflow-frise__day', off && 'is-off', index === today && 'is-today'].filter(Boolean).join(' ')}>{label}</span>
                ))}
              </span>
            </span>
          </div>
          {LANES.map(({ label, points = [], bars = [], milestone }) => (
            <div key={label} className='workflow-frise__row'>
              <span className='workflow-frise__label'>{label}</span>
              <span className='workflow-frise__window'>
                <span className='workflow-frise__track'>
                  {DAYS.map(({ label: day, off }, index) => (
                    <i key={day} className={['workflow-frise__col', off && 'is-off', index === today && 'is-today'].filter(Boolean).join(' ')} />
                  ))}
                  {points.map(({ at, tint, title }) => (
                    <span key={title} title={title} className='workflow-frise__point' style={{ left: `${(at / (SPAN + SHIFT)) * 100}%` }}>
                      <i data-tint={tint}>1</i>
                    </span>
                  ))}
                  {bars.map(([from, to, text, kind = 'plan']) => (
                    <span
                      key={text}
                      title={text}
                      className={`workflow-frise__bar is-${kind}`}
                      style={{ left: `${(from / (SPAN + SHIFT)) * 100}%`, width: `${((to - from) / (SPAN + SHIFT)) * 100}%` }}
                    >
                      {kind === 'plan' && DAYS.slice(from, to).map(({ off }, index) => off && (
                        <i key={index} className='workflow-frise__hollow' style={{ left: `${(index / (to - from)) * 100}%`, width: `${100 / (to - from)}%` }} />
                      ))}
                      <span className='workflow-frise__text'>{text}</span>
                    </span>
                  ))}
                  {milestone && (
                    <span title={milestone[1]} className='workflow-frise__milestone' style={{ left: `${(milestone[0] / (SPAN + SHIFT)) * 100}%` }}>
                      <i />
                      <span>{milestone[1]}</span>
                    </span>
                  )}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className='workflow-panel__subtitle'>Overdue</p>
      <ul className='workflow-list workflow-list--overdue'>
        {overdue.length ? overdue.map(row) : <li className='workflow-list__empty'>Nothing overdue</li>}
      </ul>
      <p className='workflow-panel__subtitle'>Coming up</p>
      <ul className='workflow-list workflow-list--coming'>{coming.map(row)}</ul>
    </Panel>
  )
}

const MOVING = CARDS[CARDS.length - 1]

// The ghost holds the place the moving card will take, so the row never grows under it
const Card = ({ id, title, repo, stale, ghost }) => (
  <span data-glide={ghost ? undefined : id} aria-hidden={ghost || undefined} className={ghost ? 'workflow-card is-ghost' : 'workflow-card'}>
    <span className='workflow-link'>{id}</span>
    {stale && <b className='workflow-badge'>stale</b>}
    <span className='workflow-card__title'>{title}</span>
    <span className='workflow-card__muted'>{repo}</span>
    {stale && <span className='workflow-card__muted'>{stale}</span>}
  </span>
)

const Board = ({ fx }) => (
  <Panel title='Ongoing work' legend='4 tickets' className='workflow-panel--board'>
    <div className='workflow-panel__scroll'>
      <div className='workflow-kanban'>
        <div className='workflow-kanban__row workflow-kanban__row--head'>
          <span />
          {STATES.map(([state, label]) => (
            <span key={state} className='workflow-kanban__state'><i data-tint={state} />{label}</span>
          ))}
        </div>
        {['Beta SAS', 'Acme Corp'].map((project) => (
          <div key={project} className='workflow-kanban__row'>
            <span className='workflow-link'>{project}</span>
            {STATES.map(([state]) => (
              <span key={state} className='workflow-kanban__col'>
                {CARDS.filter((card) => card.project === project && card.state(fx) === state).map(({ key, title, repo, stale }) => (
                  <Card key={key} id={key} title={title} repo={repo} stale={stale} />
                ))}
                {project === MOVING.project && state === 'review' && MOVING.state(fx) !== 'review' && (
                  <Card id={MOVING.key} title={MOVING.title} repo={MOVING.repo} ghost />
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  </Panel>
)

const Week = ({ fx, instant }) => {
  const progress = useTween(fx.has('hours') ? 1 : 0, instant)
  const total = 4.4 * progress
  const scale = 30.3

  return (
    <Panel title='Time this week' className='workflow-panel--week'>
      <div className='workflow-gauge'>
        <p className='workflow-gauge__line'>
          <span className='workflow-gauge__value'>{number(total)} h</span>
          <span className='workflow-gauge__gap'>−{number(29.3 - total)} h vs last week</span>
        </p>
        <span className='workflow-gauge__bar'>
          <span className='workflow-gauge__fill' style={{ width: `${(total / scale) * 100}%` }} />
          <i className='workflow-gauge__mark' style={{ left: `${(7 / scale) * 100}%` }} />
          <i className='workflow-gauge__mark is-target' style={{ left: `${(28 / scale) * 100}%` }} />
        </span>
        <p className='workflow-gauge__detail'>21/09 to 27/09 · clock hours, merged ranges · target 28 h, 7 h by today</p>
      </div>
      <ul className='workflow-share'>
        {PROJECTS.slice().reverse().map(({ name, tint, keys, hours, share }) => (
          <li key={name}>
            <span className='workflow-link'>{name}</span>
            <span className='workflow-share__keys'>{keys}</span>
            <span className='workflow-share__bar'><span data-tint={tint} style={{ width: `${(hours / 3.2) * 100 * progress}%` }} /></span>
            <span className='workflow-share__end'>{number(hours * progress)} h · {progress ? share : 0} %</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

const GRAPH = { width: 540, height: 170, gutter: 36, bottom: 22, margin: 6, max: 24 }

const Graph = ({ fx, instant }) => {
  const { width, height, gutter, bottom, margin, max } = GRAPH
  const plot = height - bottom - margin
  const step = (width - gutter - margin) / DAILY.length
  const bar = step * 0.68
  const y = (value) => margin + plot - (value / max) * plot
  const tints = ['c0', 'c2', 'c3']

  return (
    <Panel
      title='Where my time goes · 4 weeks'
      className='workflow-panel--graph'
    >
      <div className='workflow-panel__scroll'>
        <svg className='workflow-graph' viewBox={`0 0 ${width} ${height}`} width={width} height={height} role='img' aria-label='Hours per day over four weeks, stacked by project'>
          {[0, 7, 24].map((value) => (
            <g key={value}>
              <line className='workflow-graph__grid' x1={gutter} x2={width - margin} y1={y(value)} y2={y(value)} />
              <text className='workflow-graph__axis' x={gutter - 5} y={y(value) + 3.5} textAnchor='end'>{value} h</text>
            </g>
          ))}
          <line className='workflow-graph__target' x1={gutter} x2={width - margin} y1={y(7)} y2={y(7)} />
          {DAILY.map((segments, index) => {
            const x = gutter + index * step + (step - bar) / 2
            const tops = segments.map((_, rank) => segments.slice(0, rank + 1).reduce((sum, value) => sum + value, 0))
            const drawn = index !== TODAY || fx.has('bar')

            return (
              <g key={index}>
                {(DATES[index].off || index === TODAY) && (
                  <rect className={index === TODAY ? 'workflow-graph__column is-today' : 'workflow-graph__column'} x={gutter + index * step} y={margin} width={step} height={plot} />
                )}
                {drawn && (
                  <g ref={index === TODAY ? enter(instant, RISE, 300) : undefined} style={index === TODAY ? { transformOrigin: `0 ${y(0)}px` } : undefined}>
                    {segments.map((value, rank) => value > 0 && (
                      <rect key={rank} data-tint={tints[rank]} className='workflow-graph__seg' x={x} y={y(tops[rank])} width={bar} height={Math.max(1, y(tops[rank] - value) - y(tops[rank]))} />
                    ))}
                  </g>
                )}
                {DATES[index].label && (
                  <text className='workflow-graph__axis is-x' x={x + bar / 2} y={height - 6} textAnchor='middle'>{DATES[index].label}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <p className='workflow-legend'>
        <Key tint='c0' shape='square'>no project</Key>
        <Key tint='c1' shape='square'>gamma</Key>
        <Key tint='c2' shape='square'>Beta SAS</Key>
        <Key tint='c3' shape='square'>Acme Corp</Key>
      </p>
    </Panel>
  )
}

const Squares = ({ fx, instant }) => (
  <Panel
    title='Tickets, day by day · 4 weeks'
    className='workflow-panel--squares'
    legend={<><Key tint='progress' shape='square'>in progress</Key><Key tint='diff' shape='square'>diff ready</Key><Key tint='review' shape='square'>in review</Key><Key tint='merged' shape='square'>merged</Key></>}
  >
    <div className='workflow-panel__scroll'>
      <div className='workflow-squares' style={{ '--days': DATES.length }}>
        <div className='workflow-squares__row'>
          <span />
          <span className='workflow-squares__cells'>
            {DATES.map(({ label }, index) => (
              <span key={index} className={index === TODAY ? 'workflow-squares__day is-today' : 'workflow-squares__day'}>{label}</span>
            ))}
          </span>
        </div>
        {TOUCHED.map(({ name, days }) => (
          <div key={name} className='workflow-squares__row'>
            <span className='workflow-link'>{name}</span>
            <span className='workflow-squares__cells'>
              {DATES.map(({ off }, index) => {
                const states = index === TODAY && !fx.has('squares') ? [] : days[index] || []

                return (
                  <span key={index} className={['workflow-squares__cell', off && 'is-off', index === TODAY && 'is-today'].filter(Boolean).join(' ')}>
                    {[0, 1, 2].map((place) => states[place]
                      ? <i key={place} ref={index === TODAY ? enter(instant, POP, place * 90) : undefined} data-tint={states[place]} className='workflow-squares__square' />
                      : <i key={place} className='workflow-squares__square is-empty' />)}
                  </span>
                )
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  </Panel>
)

const Line = ({ line }) => {
  if (line.tool) {
    return <p className='workflow-term__line'><span className='workflow-term__dot is-done'>⏺</span><span><b>{line.tool}</b>({line.args})</span></p>
  }

  if (line.result) {
    return <p className='workflow-term__line is-result'><span className='workflow-term__dot'>⎿</span><span>{line.result}</span></p>
  }

  return <p className='workflow-term__line is-say'><span className='workflow-term__dot'>⏺</span><span>{line.say}</span></p>
}

export const Workflow = () => {
  const reduced = usePrefersReducedMotion()
  const [ref, shown] = useReveal()
  const [play, setPlay] = useState(() => ({ index: 0, typed: reduced ? 99 : 0, sent: reduced, lines: reduced ? 99 : 0, running: false, snap: true }))
  const timers = useRef([])
  const touched = useRef(false)
  const scroller = useRef(null)
  const panels = useRef({})

  const command = COMMANDS[play.index]
  const fx = new Set([...before(play.index), ...command.lines.slice(0, play.lines).flatMap((line) => line.fx || [])])
  const instant = reduced || play.snap
  const glide = useGlide(instant)
  const log = useRef(null)
  const [draft, setDraft] = useState(null)
  const [pick, setPick] = useState(0)

  // The log fills from the top, then keeps its last line in sight as a terminal does
  useLayoutEffect(() => {
    const element = log.current
    element.scrollTop = element.scrollHeight
    element.classList.toggle('is-full', element.scrollHeight > element.clientHeight)
  })

  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const start = (index, chain) => {
    const { typed, lines } = COMMANDS[index]
    const at = (delay, update) => timers.current.push(setTimeout(() => setPlay((state) => ({ ...state, ...update(state) })), delay))
    clear()

    const frame = scroller.current
    const target = panels.current[COMMANDS[index].panel]

    if (frame && target) {
      frame.querySelectorAll('.workflow-panel__scroll').forEach((element) => element.scrollTo({ left: 0 }))
      frame.scrollTo({
        top: target.getBoundingClientRect().top - frame.getBoundingClientRect().top + frame.scrollTop - 12,
        behavior: reduced ? 'auto' : 'smooth',
      })
    }

    if (reduced) {
      setPlay({ index, typed: typed.length, sent: true, lines: lines.length, running: false, snap: true })
      return
    }

    setPlay({ index, typed: 0, sent: false, lines: 0, running: false, snap: true })
    let time = 450
    at(60, () => ({ snap: false }))

    for (let count = 1; count <= typed.length; count++) {
      time += 55 + (count % 3) * 20
      at(time, () => ({ typed: count }))
    }

    at(time += 380, () => ({ sent: true, running: true }))
    lines.forEach((line, rank) => {
      time += line.fx ? 1100 : line.tool ? 500 : 700
      at(time, () => ({ lines: rank + 1 }))
    })
    at(time += 900, () => ({ running: false }))

    if (chain && index < COMMANDS.length - 1) {
      timers.current.push(setTimeout(() => start(index + 1, true), time + 2200))
    }
  }

  // Once in view, the day plays through its three commands, unless someone has already picked one
  useEffect(() => {
    if (shown && !reduced && !touched.current) {
      touched.current = true
      start(0, true)
    }
  }, [shown, reduced])

  useEffect(() => clear, [])

  const choose = (id) => {
    touched.current = true
    setDraft(null)
    start(COMMANDS.findIndex((item) => item.id === id), false)
  }

  // The prompt takes a command as Claude Code does: / lists them, arrows pick, Tab completes, Enter runs
  const query = (draft || '').trim().toLowerCase()
  const matches = query.startsWith('/') ? COMMANDS.filter((item) => item.typed.startsWith(query) || query.startsWith(item.label)) : []

  const run = (item) => {
    choose(item.id)
    log.current?.closest('.workflow-term').querySelector('input').blur()
  }

  const key = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (matches.length) {
        event.preventDefault()
        setPick((rank) => (rank + (event.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length)
      }
    } else if (event.key === 'Tab' && matches.length) {
      event.preventDefault()
      setDraft(matches[pick % matches.length].typed)
    } else if (event.key === 'Enter' && matches.length) {
      event.preventDefault()
      run(matches[pick % matches.length])
    } else if (event.key === 'Escape') {
      setDraft('')
    }
  }

  return (
    <article className='band workflow' aria-labelledby='workflow'>
      <div ref={ref} className='workflow__layout'>
        <div className='band__text'>
          <h3 id='workflow' className='workflow__title'>Workflow & Obsidian</h3>
          <p className='band__body'>
            An Obsidian vault as a second brain, kept by Claude Code commands. The Dashboard is never written by hand: it is computed from the notes and the sessions.
          </p>
          <Choices label='Command' options={COMMANDS} value={command.id} onChange={choose} className='choices choices--bracket' />
          <Tags items={['Claude Code', 'Obsidian Bases', 'Python', 'Orca worktrees']} />
        </div>

        <div className='workflow-term'>
          <div className='workflow-term__bar'>
            <span className='workflow-lights' aria-hidden='true'><i /><i /><i /></span>
            <span className='workflow-term__name'>claude</span>
          </div>
          <div className='workflow-term__screen'>
            <div ref={log} className='workflow-term__log' aria-live='polite'>
              <p className='workflow-term__welcome'><span className='workflow-term__claude'>✻</span> <b>Claude Code</b> <span className='workflow-term__dim'>~/work</span></p>
              {play.sent && <p className='workflow-term__line is-prompt'><span className='workflow-term__dot'>&gt;</span><span>{command.typed}</span></p>}
              {command.lines.slice(0, play.lines).map((line, rank) => <Line key={`${command.id}-${rank}`} line={line} />)}
            </div>
            <p className='workflow-term__spinner' aria-hidden='true'>{play.running && <><span className='workflow-term__spin' /> Working… <span className='workflow-term__dim'>(esc to interrupt)</span></>}</p>
            <label className='workflow-term__input'>
              <span className='workflow-term__dim' aria-hidden='true'>&gt;</span>
              <input
                type='text'
                role='combobox'
                aria-label='Claude Code prompt'
                aria-expanded={matches.length > 0}
                aria-controls='workflow-commands'
                aria-activedescendant={matches.length ? `workflow-command-${matches[pick % matches.length].id}` : undefined}
                aria-autocomplete='list'
                autoComplete='off'
                spellCheck='false'
                placeholder={draft === null && !play.typed ? 'Try "/morning"' : undefined}
                value={draft ?? (play.sent ? '' : command.typed.slice(0, play.typed))}
                onFocus={() => setDraft((value) => value ?? '')}
                onBlur={() => setDraft((value) => (value ? value : null))}
                onChange={(event) => { setDraft(event.target.value); setPick(0) }}
                onKeyDown={key}
              />
            </label>
            {matches.length > 0 ? (
              <ul id='workflow-commands' role='listbox' aria-label='Commands' className='workflow-term__menu'>
                {matches.map((item, rank) => (
                  <li
                    key={item.id}
                    id={`workflow-command-${item.id}`}
                    role='option'
                    aria-selected={rank === pick % matches.length}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => run(item)}
                  >
                    <span>{item.typed}</span>
                    <span className='workflow-term__dim'>{item.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='workflow-term__hint' aria-hidden='true'>/ for commands</p>
            )}
          </div>
        </div>

        <div className='workflow-obsidian__bar'>
          <span className='workflow-lights' aria-hidden='true'><i /><i /><i /></span>
          <span className='workflow-obsidian__tab'>Dashboard</span>
          <span className='workflow-obsidian__sample'>Sample data</span>
        </div>

        <figure className='workflow__figure'>
          <div
            ref={scroller}
            tabIndex={0}
            role='region'
            aria-label='The Obsidian Dashboard, sample data'
            className={instant ? 'workflow-obsidian__note is-instant' : 'workflow-obsidian__note'}
          >
            <div ref={glide} className='workflow-dash'>
              <div ref={(element) => { panels.current.calendar = element }} className='workflow-dash__wide'>
                <Calendar fx={fx} instant={instant} />
              </div>
              <div ref={(element) => { panels.current.board = element }} className='workflow-dash__wide'>
                <Board fx={fx} />
              </div>
              <div ref={(element) => { panels.current.time = element }} className='workflow-dash__half'>
                <Week fx={fx} instant={instant} />
              </div>
              <div className='workflow-dash__half'>
                <Graph fx={fx} instant={instant} />
              </div>
              <div className='workflow-dash__wide'>
                <Squares fx={fx} instant={instant} />
              </div>
            </div>
          </div>
        </figure>
      </div>
    </article>
  )
}
