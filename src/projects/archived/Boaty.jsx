import { useMemo, useRef, useState } from 'react'
import oleoo from 'oleoo'
import { usePrefersReducedMotion } from '../shared'
import { useTick } from './tick'
import './boaty.css'

// boaty (thcolin/boaty): @boaty/boat's Header and Footer around the @boaty/webtorrent pane, the react-blessed
// boxes redrawn in HTML with the colors of the README's screenshot.svg. The torrents are the ones of that
// recording; their speeds are simulated.

const ROUTES = ['torrents', 'details', 'files', 'release', 'pieces']
const DRAWER = ['details', 'files', 'release']
const LABELS = { torrents: 'Torrents', details: 'Details', files: 'Files', release: 'Release', pieces: 'Pieces' }
const DIR = '/tmp/webtorrent/done'
const PIECES = 2400
const KB = 1024
const MB = KB * KB
const GB = MB * KB

const COMMANDS = [
  ['Tab', 'Switch'],
  ['↓↑', 'Move'],
  [' o ', 'Push'],
  ['Enter', 'Open'],
  ['Space', 'Pause-Resume'],
  ['Back', 'Remove'],
  ['Del', 'Delete'],
  ['Esc', 'Close'],
  [' q ', 'Quit'],
]

const TRACKERS = ['udp://tracker.leechers-paradise.org:6969', 'udp://tracker.coppersurfer.tk:6969', 'wss://tracker.openwebtorrent.com']

// The watch dir of config.default.json, as the Open modal listed it in the recording
const WATCH = ['..', 'Fedora-SoaS-Live-i386-28', 'big-buck-bunny.torrent', 'debian-9.4.0-amd64-netinst.iso', 'tears-of-steel.torrent', 'ubuntu-14.04.5-server-amd64.iso', 'ubuntu-18.04-desktop-amd64.iso']

const PUSHABLE = {
  'big-buck-bunny.torrent': { name: 'Big Buck Bunny', total: 263.64 * MB, files: ['Big Buck Bunny.en.srt', 'Big Buck Bunny.mp4', 'poster.jpg'] },
  'tears-of-steel.torrent': { name: 'Tears of Steel', total: 571.6 * MB, files: ['Tears of Steel.mp4', 'Tears of Steel.en.srt', 'poster.jpg'] },
}

const seed = (hash, name, total, progress, extra = {}) => ({
  hash,
  name,
  total,
  progress,
  downloadSpeed: 0,
  uploadSpeed: 0,
  uploaded: 0,
  peers: 0,
  ready: true,
  stoped: false,
  done: progress >= 1,
  created: Date.now() - 3 * 60 * 1000,
  files: [name],
  pieces: Array.from({ length: PIECES }, (_, index) => index / PIECES < progress ? 1 : -1),
  ...extra,
})

const initial = () => [
  seed('a1', 'Fedora-SoaS-Live-i386-28', 863 * MB, 0.7, { files: ['Fedora-SoaS-Live-i386-28/Fedora-SoaS-Live-i386-28-1.1.iso', 'Fedora-SoaS-Live-i386-28/Fedora-Spins-28-1.1-i386-CHECKSUM'], downloadSpeed: 265.6 * KB, peers: 4 }),
  seed('b2', 'debian-9.4.0-amd64-netinst.iso', 291 * MB, 1),
  seed('c3', 'ubuntu-18.04-desktop-amd64.iso', 1.79 * GB, 0.7, { downloadSpeed: 9.5 * MB, peers: 23 }),
]

// humanize, as @boaty/boat/utils/humanize extends it
const number = (value, decimals = 0) => value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const filesize = (bytes) => {
  if (bytes < KB) {
    return `${Math.round(bytes)} bytes`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(units.length, Math.floor(Math.log(bytes) / Math.log(KB)))
  return `${number(bytes / KB ** exponent, 2)} ${units[exponent - 1]}`
}

const speed = (value) => `${filesize(value)}/s`.replace(/bytes/g, 'b')

const duration = (ms = 0) => [
  [Math.floor(ms / 86400000), ' days'],
  [Math.floor(ms / 3600000) % 24, ' hours'],
  [Math.floor(ms / 60000) % 60, ' min'],
  [Math.floor(ms / 1000) % 60, 's'],
].filter(([value]) => value).map(([value, suffix]) => `${value}${suffix}`).join(' ')

const relative = (ms) => {
  const seconds = Math.round(ms / 1000)
  const [value, unit] = seconds < 60 ? [seconds, 'second'] : seconds < 3600 ? [Math.round(seconds / 60), 'minute'] : [Math.round(seconds / 3600), 'hour']
  return `${value} ${unit}${value > 1 ? 's' : ''}`
}

const date = (time) => {
  const value = new Date(time)
  const pad = (part) => String(part).padStart(2, '0')
  return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()} - ${value.getHours()}:${value.getMinutes()}:${value.getSeconds()}`
}

const clock = (now) => [now.getHours(), now.getMinutes(), now.getSeconds()].map((value) => String(value).padStart(2, '0')).join(':')

const remaining = (torrent) => (torrent.total * (1 - torrent.progress)) / (torrent.downloadSpeed || 1) * 1000

const state = (torrent) => torrent.stoped ? '◼' : torrent.done ? '✔' : !torrent.ready ? '●' : '▶'

const Box = ({ route, focused, collapsed, className = '', onFocus, children }) => (
  <section
    className={['boaty-box', focused && 'is-focused', collapsed && 'is-collapsed', className].filter(Boolean).join(' ')}
    aria-label={LABELS[route]}
    onMouseDown={onFocus}
  >
    <span className='boaty-box__label'>{LABELS[route]}</span>
    {!collapsed && children}
  </section>
)

const Rows = ({ rows, selected }) => (
  <dl className='boaty-rows'>
    {rows.map(([key, value], index) => (
      <div key={index} className={index === selected ? 'is-selected' : undefined}>
        <dt>{key}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
)

export const Boaty = ({ awake }) => {
  const reduced = usePrefersReducedMotion()
  const terminal = useRef(null)
  const timer = useRef(0)
  const [torrents, setTorrents] = useState(initial)
  const [selected, setSelected] = useState(0)
  const [route, setRoute] = useState('torrents')
  const [opened, setOpened] = useState('release')
  const [cursor, setCursor] = useState({ details: 0, files: 0, release: 0 })
  const [modal, setModal] = useState(null)
  const [message, setMessage] = useState(null)
  const [quit, setQuit] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [relaunch, setRelaunch] = useState(0)

  // After q, the shell recalls ./bin/boaty from its history and runs it again
  useTick(() => {
    if (relaunch < 16) {
      setRelaunch(relaunch + 1)
    } else {
      setRelaunch(0)
      setQuit(false)
    }
  }, 120, quit && awake)

  const torrent = torrents[selected]
  const stats = torrents.reduce((total, item) => ({
    down: total.down + (item.done || item.stoped ? 0 : item.downloadSpeed),
    up: total.up + (item.stoped ? 0 : item.uploadSpeed),
    done: total.done + (item.done ? 1 : 0),
  }), { down: 0, up: 0, done: 0 })

  // The daemon's websocket pushes FILL_TORRENTS every second
  useTick(() => {
    setNow(new Date())
    setTorrents((current) => current.map((item) => {
      if (item.stoped || item.done) {
        return { ...item, downloadSpeed: 0, uploadSpeed: item.done && !item.stoped ? item.uploadSpeed : 0 }
      }

      if (!item.ready) {
        return { ...item, ready: true, peers: 3, downloadSpeed: 380 * KB }
      }

      const downloadSpeed = Math.max(48 * KB, item.downloadSpeed * (0.8 + Math.random() * 0.45) + Math.random() * 600 * KB)
      const progress = Math.min(1, item.progress + downloadSpeed / item.total)
      const have = Math.floor(progress * PIECES)
      const pieces = item.pieces.map((value, index) => index < have ? 1 : index < have + 3 ? 0 : value === 1 ? 1 : -1)

      return {
        ...item,
        progress,
        downloadSpeed,
        uploadSpeed: Math.random() < 0.3 ? Math.random() * 40 * KB : 0,
        uploaded: item.uploaded + (Math.random() < 0.3 ? Math.random() * 40 * KB : 0),
        peers: Math.max(1, item.peers + Math.round(Math.random() * 4 - 2)),
        done: progress >= 1,
        pieces: progress >= 1 ? pieces.map(() => 1) : pieces,
      }
    }))
  }, 1000, awake && !reduced && !quit)

  const say = (text) => {
    setMessage(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2400)
  }

  const focusRoute = (next) => {
    setRoute(next)

    if (DRAWER.includes(next)) {
      setOpened(next)
    }
  }

  const update = (hash, patch) => setTorrents((current) => current.map((item) => item.hash === hash ? { ...item, ...patch } : item))

  const remove = (erase) => {
    if (!torrent) {
      return
    }

    say(`${erase ? 'Deleted' : 'Removed'} ${torrent.name}${erase ? ` and erased ${DIR}/${torrent.name}` : ''}`)
    setTorrents((current) => current.filter((item) => item.hash !== torrent.hash))
    setSelected((index) => Math.max(0, Math.min(index, torrents.length - 2)))
  }

  const push = (entry) => {
    const pushable = PUSHABLE[entry]

    if (!pushable) {
      setModal({ ...modal, status: ['error', `${entry} is not a .torrent file`] })
      return
    }

    if (torrents.some((item) => item.name === pushable.name)) {
      setModal({ ...modal, status: ['error', `localhost:9876@${entry} is already sailing`] })
      return
    }

    setTorrents((current) => [seed(entry, pushable.name, pushable.total, 0, { ready: false, files: pushable.files.map((file) => `${pushable.name}/${file}`), created: Date.now() }), ...current])
    setSelected(0)
    setModal({ ...modal, status: ['success', `localhost:9876@${entry}`] })
  }

  const rows = useMemo(() => {
    if (!torrent) {
      return { details: [], files: [], release: [] }
    }

    const release = oleoo.parse(torrent.name, { strict: false })

    return {
      details: [
        ['Torrent', torrent.name],
        ['Created', date(torrent.created)],
        ['Size', filesize(torrent.total)],
        ['Progress', `${number(torrent.progress * 100)}% (${filesize(torrent.total * torrent.progress)} of ${filesize(torrent.total)})`],
        ['Uploaded', filesize(torrent.uploaded)],
        ['Remaining', torrent.done ? 'Done' : torrent.stoped ? 'Paused' : torrent.downloadSpeed ? relative(remaining(torrent)) : '∞'],
        ['Speed', `↓ ${speed(torrent.done ? 0 : torrent.downloadSpeed)} - ↑ ${speed(torrent.uploadSpeed)}`],
        ['Ratio', number(torrent.uploaded / torrent.total, 2)],
        ['Peers', String(torrent.peers)],
        ...TRACKERS.map((tracker, index) => [index ? '' : 'Announce(s)', tracker]),
      ],
      files: [`${DIR}/${torrent.files[0].includes('/') ? torrent.name : ''}`.replace(/\/$/, ''), ...torrent.files.map((file) => ` ${file.split('/').pop()}`)],
      release: release.score < 2
        ? [['Torrent', torrent.name], ['Sorry..', <>Extension <u>oleoo</u> didn't succeed to parse selected torrent</>]]
        : [
            ['Torrent', torrent.name],
            ['Type', { movie: 'Movie', tvshow: 'TV Show' }[release.type]],
            ['Title', release.title],
            ['Year', release.year || String(new Date().getFullYear())],
            ['Resolution', release.resolution || 'SD'],
            ['Language', release.language],
            ['Source', release.source || <span className='boaty-grey'>Unknown</span>],
            ['Encoding', release.encoding || <span className='boaty-grey'>Unknown</span>],
            ['Score', `${release.score}/8`],
            ['Generated', release.generated],
          ],
    }
  }, [torrent])

  const move = (step) => {
    if (modal) {
      setModal({ ...modal, cursor: (modal.cursor + step + WATCH.length) % WATCH.length })
    } else if (route === 'torrents') {
      setSelected((index) => Math.max(0, Math.min(torrents.length - 1, index + step)))
    } else if (DRAWER.includes(route)) {
      const length = route === 'files' ? rows.files.length : rows[route].length
      setCursor({ ...cursor, [route]: Math.max(0, Math.min(length - 1, cursor[route] + step)) })
    }
  }

  const open = () => {
    if (modal) {
      push(WATCH[modal.cursor])
    } else if (route === 'files') {
      say(`opn ${rows.files[0]}/${rows.files[cursor.files]?.trim() ?? ''}`.replace(/\/$/, ''))
    } else if (torrent) {
      say(`opn ${DIR}/${torrent.name}`)
    }
  }

  const toggle = () => {
    if (torrent && route === 'torrents' && !modal) {
      update(torrent.hash, { stoped: !torrent.stoped })
    }
  }

  const keys = {
    ArrowDown: () => move(1),
    ArrowUp: () => move(-1),
    o: () => setModal(modal ? null : { cursor: 2, status: ['info', `localhost:9876@${DIR.replace('done', 'watch')}`] }),
    Enter: open,
    ' ': toggle,
    Backspace: () => !modal && route === 'torrents' && remove(false),
    Delete: () => !modal && route === 'torrents' && remove(true),
    Escape: () => setModal(null),
    q: () => setQuit(true),
  }

  const keyDown = (event) => {
    if (quit) {
      if (event.key === 'Enter') {
        event.preventDefault()
        setRelaunch(0)
        setQuit(false)
      }

      return
    }

    if (event.key === 'Tab' && !modal) {
      const index = ROUTES.indexOf(route) + (event.shiftKey ? -1 : 1)

      // The last box lets Tab leave the terminal, so the keyboard is never trapped
      if (index < 0 || index >= ROUTES.length) {
        return
      }

      event.preventDefault()
      focusRoute(ROUTES[index])
      return
    }

    const action = keys[event.ctrlKey && event.key === 'c' ? 'q' : event.key]

    if (action && !event.metaKey && !event.altKey) {
      event.preventDefault()
      action()
    }
  }

  const press = (command) => {
    terminal.current?.focus()
    const map = { Tab: () => focusRoute(ROUTES[(ROUTES.indexOf(route) + 1) % ROUTES.length]), '↓↑': () => move(1), ' o ': keys.o, Enter: open, Space: toggle, Back: keys.Backspace, Del: keys.Delete, Esc: keys.Escape, ' q ': keys.q }
    map[command]?.()
  }

  const values = [['↓', speed(stats.down)], ['↑', speed(stats.up)], ['~', number(0, 2)], ['≡', `${stats.done}/${torrents.length}`]]

  return (
    <div className='boaty'>
      <div className='boaty__chrome' aria-hidden='true'>
        <i /><i /><i />
      </div>
      <div
        ref={terminal}
        className='boaty__screen'
        role='application'
        tabIndex={0}
        aria-roledescription='terminal'
        aria-label='boaty, in a terminal. Tab switches boxes, arrows move, Space pauses, o pushes a torrent, Enter opens, Backspace removes, q quits'
        onKeyDown={keyDown}
      >
        {quit ? (
          <div className='boaty-shell'>
            <p><span className='boaty-shell__time'>{clock(now).slice(0, 5)}</span> <span className='boaty-shell__prompt'>%</span> ./bin/boaty</p>
            <p><span className='boaty-shell__time'>{clock(now).slice(0, 5)}</span> <span className='boaty-shell__prompt'>%</span> {'./bin/boaty'.slice(0, relaunch)}<span className='boaty-shell__cursor'>▋</span></p>
          </div>
        ) : (
          <>
            <div className='boaty-line'>
              <span><span aria-hidden='true'>⛴</span>  <b>boaty</b> 0.0.1</span>
              <b className='boaty-line__center'>{values.map(([key, value]) => `${key} ${value}`).join(' ')}</b>
              <span className='boaty-line__clock'>{clock(now)}</span>
            </div>
            <div className='boaty__workspace'>
              <Box route='torrents' focused={route === 'torrents' && !modal} className='boaty-torrents' onFocus={() => focusRoute('torrents')}>
                <div className='boaty-table' role='grid' aria-label='Torrents'>
                  <div className='boaty-table__header' role='row'>
                    {['?', 'Name', '↓', '↑', '%', '#', '@'].map((header) => <span key={header} role='columnheader'>{header}</span>)}
                  </div>
                  {torrents.map((item, index) => (
                    <div
                      key={item.hash}
                      role='row'
                      aria-selected={index === selected}
                      className={index === selected ? 'boaty-table__row is-selected' : 'boaty-table__row'}
                      onMouseDown={() => setSelected(index)}
                    >
                      <span>{state(item)}</span>
                      <span className='boaty-table__name'>{item.name}</span>
                      <span>{item.done || item.stoped ? '-' : speed(item.downloadSpeed)}</span>
                      <span>{item.stoped ? '-' : speed(item.uploadSpeed)}</span>
                      <span>{`${number(item.progress * 100)}%`}</span>
                      <span>{filesize(item.total)}</span>
                      <span>{item.done || item.stoped ? '-' : item.ready ? duration(remaining(item)) : '∞'}</span>
                    </div>
                  ))}
                </div>
              </Box>
              <div className='boaty__bottom'>
                <div className='boaty-drawer'>
                  {DRAWER.map((name) => (
                    <Box key={name} route={name} focused={route === name && !modal} collapsed={opened !== name} onFocus={() => focusRoute(name)}>
                      {name === 'files'
                        ? (
                          <ul className='boaty-files'>
                            {rows.files.map((file, index) => <li key={index} className={index === cursor.files ? 'is-selected' : undefined}>{file}</li>)}
                          </ul>
                          )
                        : <Rows rows={rows[name]} selected={route === name ? cursor[name] : -1} />}
                    </Box>
                  ))}
                </div>
                <Box route='pieces' focused={route === 'pieces' && !modal} className='boaty-pieces' onFocus={() => focusRoute('pieces')}>
                  <p className='boaty-pieces__grid' aria-label={torrent ? `${number(torrent.progress * 100)}% of the pieces` : 'No torrent'}>
                    {torrent?.pieces.map((value, index) => (
                      <span key={index} className={value === 1 ? 'is-have' : value === 0 ? 'is-pending' : undefined}>◼</span>
                    ))}
                  </p>
                </Box>
              </div>
              {modal && (
                <section className='boaty-box boaty-modal is-focused' aria-label='Open'>
                  <span className='boaty-box__label'>Open</span>
                  <p className={`boaty-modal__status is-${modal.status[0]}`} role='status'>{modal.status[1]}</p>
                  <ul className='boaty-files'>
                    {WATCH.map((entry, index) => (
                      <li key={entry} className={index === modal.cursor ? 'is-selected' : undefined} onMouseDown={() => setModal({ ...modal, cursor: index })} onDoubleClick={() => push(entry)}>
                        {index === modal.cursor ? entry : ` ${entry}`}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            <div className='boaty-line boaty-line--footer'>
              <span className='boaty-keys'>
                {COMMANDS.map(([command, label]) => (
                  <button key={command} type='button' tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => press(command)}>
                    <kbd>{command}</kbd> {label}
                  </button>
                ))}
              </span>
              <span className='boaty-line__center' role='status'>{message}</span>
              <span><b>localhost:9876</b> - <span aria-label='online'>⛅</span></span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
