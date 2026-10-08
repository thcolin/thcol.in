import { useEffect, useRef, useState } from 'react'
import { Choices } from '../shared'
import { drainRenderers } from './gl'
import { PAGES } from './kanshi/data'
import '../kanshi.css'

const WARN = '#e6b455'

const clamp = (value) => Math.max(0, Math.min(100, value))

// Kanshi's universal container: four square corners, the title in the notch
const Bracket = ({ title, aside, status, className = '', children }) => (
  <section className={`kanshi-brk ${status ? `is-${status}` : ''} ${className}`}>
    <div className='kanshi-brk__head'>
      <span className='kanshi-brk__title'>{title}</span>
      {aside != null && <span className='kanshi-brk__aside'>{aside}</span>}
    </div>
    <div className='kanshi-brk__body'>{children}</div>
  </section>
)

const Meter = ({ pct, segments = 20, status }) => {
  const fill = Math.round((clamp(pct) / 100) * segments)

  return (
    <span className='kanshi-meter' aria-hidden='true'>
      {Array.from({ length: segments }, (_, index) => (
        <i key={index} className={index < fill ? `is-on ${status ? `is-${status}` : ''}` : undefined} />
      ))}
    </span>
  )
}

const Gauge = ({ pct, children }) => {
  const radius = 42
  const circle = 2 * Math.PI * radius
  const arc = 0.75 * circle

  return (
    <div className='kanshi-gauge'>
      <svg viewBox='0 0 100 100' aria-hidden='true'>
        <circle className='kanshi-gauge__track' cx='50' cy='50' r={radius} transform='rotate(135 50 50)' strokeDasharray={`${arc} ${circle}`} />
        <circle className='kanshi-gauge__value' cx='50' cy='50' r={radius} transform='rotate(135 50 50)' strokeDasharray={`${(clamp(pct) / 100) * arc} ${circle}`} />
      </svg>
      <span className='kanshi-gauge__label'>{children}</span>
    </div>
  )
}

const Oscillo = ({ net }) => {
  const width = 100
  const height = 34
  const max = Math.max(10, ...net.history, ...net.ulHistory)
  const step = width / (net.history.length - 1)
  const y = (value) => height - (value / max) * (height - 3) - 1.5
  const points = (values) => values.map((value, index) => `${(index * step).toFixed(1)},${y(value).toFixed(1)}`)
  const down = points(net.history)

  return (
    <div className='kanshi-osc'>
      <div className='kanshi-osc__peaks'>
        <span>↓<b>{net.down}</b></span>
        <span>↑<b>{net.up}</b></span>
      </div>
      <div className='kanshi-osc__graph'>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio='none' aria-hidden='true'>
          {[1, 2, 3].map((line) => <line key={line} className='kanshi-osc__grid' x1='0' x2={width} y1={(height / 4) * line} y2={(height / 4) * line} />)}
          <path className='kanshi-osc__fill' d={`M0,${height} L${down.join(' L')} L${width},${height} Z`} />
          <polyline className='kanshi-osc__down' points={down.join(' ')} />
          <polyline className='kanshi-osc__up' points={points(net.ulHistory).join(' ')} />
        </svg>
      </div>
    </div>
  )
}

const Rows = ({ rows }) => (
  <div className='kanshi-rows'>
    {rows.map(([key, value, status]) => (
      <div key={key} className={status ? `kanshi-rows__row is-${status}` : 'kanshi-rows__row'}>
        <span>{key}</span>
        <span className='kanshi-rows__dots' />
        <span className='kanshi-rows__value'>{value}</span>
      </div>
    ))}
  </div>
)

const Machine = ({ page }) => (
  <>
    <Bracket title='CPU · 処理' aside={`${page.cpu.temp}°C`}>
      <div className='kanshi__cpu'>
        <Gauge pct={page.cpu.load}>{page.cpu.load}<small>%</small></Gauge>
        <div className='kanshi-cores' aria-hidden='true'>
          {page.cpu.cores.map((value, index) => <i key={index} style={{ height: `${Math.max(6, value)}%` }} />)}
        </div>
      </div>
      <p className='kanshi__seg'><span>FREQ</span>{page.cpu.freq}</p>
    </Bracket>
    <Bracket title='MEM · 記憶' aside={`${page.mem.used} / ${page.mem.total} GB`}>
      <p className='kanshi__big'>{page.mem.pct}<small>%</small></p>
      <Meter pct={page.mem.pct} />
    </Bracket>
    <Bracket title='NET · 通信' className='kanshi-brk--grow'>
      <Oscillo net={page.net} />
    </Bracket>
  </>
)

const Side = ({ page }) => {
  if (page.id === 'rack') {
    const total = page.power.reduce((sum, [, watts]) => sum + watts, 0)

    return (
      <>
        <Bracket title='POWER · 電力' aside='EST.'>
          {page.power.map(([name, watts]) => (
            <div key={name} className='kanshi__power'>
              <span>{name}</span>
              <Meter pct={(watts / 150) * 100} segments={12} />
              <b>{watts} W</b>
            </div>
          ))}
        </Bracket>
        <Bracket title='SYS.CHECK' className='kanshi-brk--grow'>
          <Rows rows={[['BABYLON', 'ONLINE'], ['CORTEX', 'ONLINE'], ['CHROMA', 'ONLINE'], ['TOTAL', `${total} W`]]} />
        </Bracket>
      </>
    )
  }

  if (page.id === 'babylon') {
    return (
      <>
        <Bracket title='DISKS · 記録' aside='SMART' className='kanshi-brk--grow' status='warn'>
          <div className='kanshi-disks'>
            {page.disks.map(({ bay, model, temp, status }) => (
              <div key={bay} className={status ? `kanshi-disks__row is-${status}` : 'kanshi-disks__row'}>
                <span>D{bay}</span>
                <span className='kanshi-disks__model'>{model ?? 'EMPTY'}</span>
                {temp != null && <Meter pct={((temp - 25) / 35) * 100} segments={8} status={status} />}
                <span className='kanshi-disks__temp'>{temp != null ? `${temp}°` : '··'}</span>
              </div>
            ))}
          </div>
        </Bracket>
        <Bracket title='STORAGE · 容量' aside={page.storage.free}>
          <p className='kanshi__big'>{page.storage.pct}<small>%</small></p>
          <Meter pct={page.storage.pct} />
        </Bracket>
      </>
    )
  }

  if (page.id === 'cortex') {
    return (
      <>
        <Bracket title='PLEX · 配信' aside={`${page.streams.length} STREAMS`} className='kanshi-brk--grow'>
          <div className='kanshi-streams'>
            {page.streams.map((stream) => (
              <div key={stream.user} className='kanshi-streams__item'>
                <span className='kanshi-streams__user'>{stream.user}</span>
                <span className='kanshi-streams__title'>{stream.title}</span>
                <span className='kanshi-streams__mode'>{stream.mode}</span>
                <Meter pct={stream.pct} segments={24} />
              </div>
            ))}
          </div>
        </Bracket>
        <Bracket title='STORAGE · 容量' aside={page.storage.free}>
          <p className='kanshi__big'>{page.storage.pct}<small>%</small></p>
          <Meter pct={page.storage.pct} />
        </Bracket>
      </>
    )
  }

  return (
    <>
      <Bracket title='DETAIL · 詳細' aside={`${page.gpu.temp}°C`} className='kanshi-brk--grow'>
        <Rows rows={[['CLOCK', page.gpu.clock], ['POWER', page.gpu.power], ['VRAM', `${page.gpu.vram} / ${page.gpu.vramTotal} GB`]]} />
        <Meter pct={(page.gpu.vram / page.gpu.vramTotal) * 100} />
      </Bracket>
      <Bracket title='VOLUMES · 容量'>
        {page.volumes.map(([name, pct]) => (
          <div key={name} className='kanshi__power'>
            <span>{name}</span>
            <Meter pct={pct} segments={12} />
            <b>{pct}%</b>
          </div>
        ))}
      </Bracket>
    </>
  )
}

const Wireframe = ({ page, running, reduced }) => {
  const host = useRef(null)

  useEffect(() => {
    if (!running) {
      return
    }

    let handle = null
    let cancelled = false
    const addon = page.containers
      ? { pos: [0.11, -0.02, 0.04], cols: 5, cell: 0.07, gap: 0.022, colors: [...Array(page.containers.up).fill('#60f08c'), ...Array(page.containers.idle).fill('#5a6a60')] }
      : null

    import('./kanshi/wireframe').then(({ mountWireframe }) => {
      if (!cancelled && host.current) {
        handle = mountWireframe(host.current, { url: page.model, color: page.status === 'warn' ? WARN : `rgb(${page.rgb.split(' ').join(', ')})`, spin: !reduced, addon })
      }
    })

    return () => {
      cancelled = true
      handle?.dispose()
    }
  }, [page, running, reduced])

  return <div ref={host} className='kanshi__3d' role='img' aria-label={`${page.name}, wireframe of the real machine`} />
}

const useClock = (running) => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!running) {
      return
    }

    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [running])

  return now.toTimeString().slice(0, 8)
}

const PAGE_MS = 9000
const BOOT_MS = 2300

const WORDMARK = `@@@  @@@   @@@@@@   @@@  @@@   @@@@@@   @@@  @@@  @@@
@@@  @@@  @@@@@@@@  @@@@ @@@  @@@@@@@   @@@  @@@  @@@
@@!  !@@  @@!  @@@  @@!@!@@@  !@@       @@!  @@@  @@!
!@!  @!!  !@!  @!@  !@!!@!@!  !@!       !@!  @!@  !@!
@!@@!@!   @!@!@!@!  @!@ !!@!  !!@@!!    @!@!@!@!  !!@
!!@!!!    !!!@!!!!  !@!  !!!   !!@!!!   !!!@!!!!  !!!
!!: :!!   !!:  !!!  !!:  !!!       !:!  !!:  !!!  !!:
:!:  !:!  :!:  !:!  :!:  !:!      !:!   :!:  !:!  :!:
 ::  :::  ::   :::   ::   ::  :::: ::   ::   :::   ::
 :   :::   :   : :  ::    :   :: : :     :   : :  :`

const BOOT = [
  'KANSHI 監視 SYSTEM ......... v1.0',
  '初期化 KERNEL / MEM ........ OK',
  'NODE BABYLON .............. LINK',
  'NODE CORTEX ............... LINK',
  'NODE CHROMA ............... LINK',
]

// The cracktro Kanshi plays when it powers on
const Boot = ({ onSkip }) => (
  <div className='kanshi-boot' onPointerDown={onSkip} role='status' aria-label='Kanshi is powering on'>
    <pre className='kanshi-boot__logo' aria-hidden='true'>{WORDMARK}</pre>
    <p className='kanshi-boot__sub'>監視 · System monitor · CH 09</p>
    <div className='kanshi-boot__log'>
      {BOOT.map((line, index) => <span key={line} style={{ animationDelay: `${0.45 + index * 0.16}s` }}>{line}</span>)}
    </div>
    <span className='kanshi-boot__bar' aria-hidden='true'><span /></span>
    <p className='kanshi-boot__sub'>ロード中 Loading system<span className='kanshi-boot__cursor'>_</span></p>
  </div>
)

const Ticker = ({ page, index }) => {
  const items = ['監視システム稼働中', 'MONITORING ONLINE', 'バビロン', 'コルテックス', 'クロマ', page.alert ? `警告 ${page.alert}` : '通信良好', 'SAMPLE DATA', `P${index + 1}/${PAGES.length}`]
  const row = items.join('   ///   ')

  return (
    <div className='kanshi__ticker' aria-hidden='true'>
      <div className='kanshi__ticker-roll'><span>{row}</span><span>{row}</span></div>
    </div>
  )
}

export const KanshiChannel = ({ active, reduced }) => {
  const [pageId, setPage] = useState('babylon')
  const [auto, setAuto] = useState(true)
  const [booted, setBooted] = useState(false)
  const near = active
  const clock = useClock(near)
  const page = PAGES.find(({ id }) => id === pageId)
  const index = PAGES.indexOf(page)
  const powered = booted || reduced

  useEffect(() => {
    if (!near) {
      drainRenderers()
    }
  }, [near])

  useEffect(() => {
    if (!near || powered) {
      return
    }

    const timer = setTimeout(() => setBooted(true), BOOT_MS)
    return () => clearTimeout(timer)
  }, [near, powered])

  useEffect(() => {
    if (!auto || !near || !powered || reduced) {
      return
    }

    const timer = setTimeout(() => setPage(PAGES[(index + 1) % PAGES.length].id), PAGE_MS)
    return () => clearTimeout(timer)
  }, [auto, near, powered, reduced, index])

  const take = (id) => {
    setAuto(false)
    setPage(id)
  }

  // Pages cycle on their own again once the tabs are left alone
  useEffect(() => {
    if (auto) {
      return
    }

    const timer = setTimeout(() => setAuto(true), PAGE_MS * 2)
    return () => clearTimeout(timer)
  })

  return (
    <div className='kanshi'>
      <div className='kanshi-screen' data-page={page.id} style={{ '--kanshi-rgb': page.rgb }}>
          {powered
            ? (
              <div key={page.id} className='kanshi__page'>
                <div className='kanshi__head'>
                  <span className='kanshi__ident'><i>監視</i> KANSHI · <b>{page.name}</b></span>
                  <span className='kanshi__meta'>
                    <span className='kanshi__sample'>SAMPLE DATA</span>
                    <span className='kanshi__clock'>{clock}</span>
                  </span>
                </div>
                <Choices
                  label='Machine'
                  className='kanshi__rail'
                  value={page.id}
                  onChange={take}
                  options={PAGES.map(({ id, name, rgb }) => ({ id, label: name, style: { '--kanshi-rgb': rgb } }))}
                />
                {page.alert && (
                  <p className='kanshi__alert'>
                    <span className='kanshi__hazard' aria-hidden='true' />
                    <b>警告 · {page.alert}</b>
                    <span className='kanshi__hazard' aria-hidden='true' />
                  </p>
                )}
                <div className='kanshi__plate'>
                  <b>{page.name}</b>
                  <span>{page.plate}</span>
                  <em className={page.status ? `is-${page.status}` : undefined}>{page.status === 'warn' ? 'SYSTEM WARN' : 'SYSTEM OK'}</em>
                </div>
                <div className='kanshi__cols'>
                  <div className='kanshi__col kanshi__col--left'>
                    {page.cpu ? <Machine page={page} /> : <Side page={page} />}
                  </div>
                  <div className='kanshi__col kanshi__col--center'>
                    <Bracket title={page.focal} className='kanshi-brk--focal'>
                      <Wireframe page={page} running={near} reduced={reduced} />
                    </Bracket>
                    <div className={page.hero.status ? `kanshi__hero is-${page.hero.status}` : 'kanshi__hero'}>
                      <span className='kanshi__hero-value'>{page.hero.value}<small>{page.hero.unit}</small></span>
                      <span className='kanshi__hero-label'>{page.hero.label}</span>
                    </div>
                  </div>
                  {page.cpu && (
                    <div className='kanshi__col kanshi__col--right'>
                      <Side page={page} />
                    </div>
                  )}
                </div>
                <Ticker page={page} index={index} />
              </div>
              )
            : <Boot onSkip={() => setBooted(true)} />}
          <span className='kanshi__scanlines' aria-hidden='true' />
      </div>
    </div>
  )
}
