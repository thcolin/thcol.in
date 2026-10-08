import { useEffect, useState } from 'react'
import { Choices, Links, Tags, usePrefersReducedMotion } from './shared'

const DEVICES = [
  { id: 'switch', label: 'Switch', name: 'Nintendo Switch' },
  { id: 'vita', label: 'PS Vita', name: 'PS Vita' },
  { id: 'tv', label: 'TV', name: 'Raspberry Pi TV' },
]

const SERVERS = [
  { id: 'plex', label: 'Plex', style: { '--accent': '#e5a00d', '--on-accent': '#1a1400' } },
  { id: 'jellyfin', label: 'Jellyfin', style: { '--accent': '#00a4dc', '--on-accent': '#002430' } },
  { id: 'emby', label: 'Emby', style: { '--accent': '#52b54b', '--on-accent': '#06210a' } },
  { id: 'stremio', label: 'Stremio', style: { '--accent': '#9575f7', '--on-accent': '#ffffff' } },
]

const HEROES = {
  'switch-plex': new URL('../assets/gmca/switch-plex.webp', import.meta.url),
  'switch-jellyfin': new URL('../assets/gmca/switch-jellyfin.webp', import.meta.url),
  'switch-emby': new URL('../assets/gmca/switch-emby.webp', import.meta.url),
  'switch-stremio': new URL('../assets/gmca/switch-stremio.webp', import.meta.url),
  'vita-plex': new URL('../assets/gmca/vita-plex.webp', import.meta.url),
  'vita-jellyfin': new URL('../assets/gmca/vita-jellyfin.webp', import.meta.url),
  'vita-emby': new URL('../assets/gmca/vita-emby.webp', import.meta.url),
  'vita-stremio': new URL('../assets/gmca/vita-stremio.webp', import.meta.url),
  'tv-plex': new URL('../assets/gmca/tv-plex.webp', import.meta.url),
  'tv-jellyfin': new URL('../assets/gmca/tv-jellyfin.webp', import.meta.url),
  'tv-emby': new URL('../assets/gmca/tv-emby.webp', import.meta.url),
  'tv-stremio': new URL('../assets/gmca/tv-stremio.webp', import.meta.url),
}

const ROTATION = 3200

export const Gmca = () => {
  const [device, setDevice] = useState('switch')
  const [server, setServer] = useState('plex')
  // Rotates through the servers until the visitor takes the controls
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!auto || paused || reduced) {
      return
    }

    const timer = setTimeout(() => {
      const index = SERVERS.findIndex(({ id }) => id === server)
      const next = (index + 1) % SERVERS.length
      setServer(SERVERS[next].id)

      if (next === 0) {
        setDevice(DEVICES[(DEVICES.findIndex(({ id }) => id === device) + 1) % DEVICES.length].id)
      }
    }, ROTATION)

    return () => clearTimeout(timer)
  }, [auto, paused, reduced, server, device])

  const current = SERVERS.find(({ id }) => id === server)
  const name = DEVICES.find(({ id }) => id === device).name

  return (
    <article
      className='band gmca'
      aria-labelledby='gmca'
      style={current.style}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className='band__column band__split band__split--reverse'>
        <div className='band__text'>
          <h3 id='gmca' className='gmca__brand'>
            <img src={new URL('../assets/gmca/gmca-logo.webp', import.meta.url)} alt='' width='64' height='64' />
            <span>GMCA</span>
            <small>Gamepad Media Center Aggregator</small>
          </h3>
          {/* Every server and device stacked in one cell: the tallest sets the height, so rotating never moves the band */}
          <p className='gmca__headline'>
            {DEVICES.flatMap((d) => SERVERS.map((s) => (
              <span key={`${d.id}-${s.id}`} aria-hidden={d.id !== device || s.id !== server}>
                Runs <em style={s.style}>{s.label}</em> on your {d.name}
              </span>
            )))}
          </p>
          <p className='band__body'>
            One native, controller-first client. Point it at any media center and run it on any device you left in a drawer. The interface never changes; only the accent and the tabs follow your server.
          </p>
          <div className='gmca__controls'>
            <Choices label='Device' options={DEVICES} value={device} onChange={(id) => { setAuto(false); setDevice(id) }} className='choices choices--mc' />
            <Choices label='Server' options={SERVERS} value={server} onChange={(id) => { setAuto(false); setServer(id) }} className='choices choices--mc' />
          </div>
          <Tags items={['C++17', 'borealis', 'mpv', 'CMake', 'devkitPro']} />
          <Links links={[
            ['Website', 'https://thcolin.github.io/gamepad-media-center-aggregator/'],
            ['Download v1.3.0', 'https://github.com/thcolin/gamepad-media-center-aggregator/releases/latest'],
            ['GitHub', 'https://github.com/thcolin/gamepad-media-center-aggregator'],
          ]} />
        </div>
        <div className='band__demo gmca__stage'>
          <img
            key={`${device}-${server}`}
            src={HEROES[`${device}-${server}`]}
            alt={`GMCA on ${name}, browsing ${current.label}`}
            loading='lazy'
            decoding='async'
            width='1280'
            height='640'
          />
        </div>
      </div>
    </article>
  )
}
