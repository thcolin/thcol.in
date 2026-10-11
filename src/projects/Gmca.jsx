import { useState } from 'react'
import { Choices, Links, Tags, stepOf, useScrub } from './shared'

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

const TOUR = [['switch', 'plex'], ['vita', 'jellyfin'], ['tv', 'emby']]

export const Gmca = () => {
  const [device, setDevice] = useState('switch')
  const [server, setServer] = useState('plex')
  const [scrub, hold] = useScrub((progress) => {
    const [nextDevice, nextServer] = TOUR[stepOf(progress, TOUR.length)]
    setDevice(nextDevice)
    setServer(nextServer)
  })

  const current = SERVERS.find(({ id }) => id === server)
  const name = DEVICES.find(({ id }) => id === device).name

  return (
    <div ref={scrub} id='gmca' className='scrub' style={{ '--steps': TOUR.length }}>
      <article className='band gmca' aria-labelledby='gmca-title' style={current.style}>
        <div className='band__column band__split band__split--reverse'>
          <div className='band__text'>
            {/* Every server and device stacked in one cell sets the height; the current one sits at its bottom, on the description, so rotating never moves the band */}
            <div className='gmca__head'>
              <p aria-hidden='true' className='gmca__headline gmca__sizer'>
                {DEVICES.flatMap((d) => SERVERS.map((s) => (
                  <span key={`${d.id}-${s.id}`}>Runs <em>{s.label}</em> on your {d.name}</span>
                )))}
              </p>
              <div className='gmca__current'>
                <h3 id='gmca-title' className='gmca__brand'>
                  <img src={new URL('../assets/gmca/gmca-logo.webp', import.meta.url)} alt='' width='64' height='64' />
                  <span>GMCA</span>
                  <small>Gamepad Media Center Aggregator</small>
                </h3>
                <p className='gmca__headline'>
                  Runs <em>{current.label}</em> on your {name}
                </p>
              </div>
            </div>
            <p className='band__body'>
              One native, controller-first client. Point it at any media center and run it on any device you left in a drawer. The interface never changes; only the accent and the tabs follow your server.
            </p>
            <div className='gmca__controls'>
              <Choices label='Device' options={DEVICES} value={device} onChange={(id) => { hold(); setDevice(id) }} className='choices choices--mc' />
              <Choices label='Server' options={SERVERS} value={server} onChange={(id) => { hold(); setServer(id) }} className='choices choices--mc' />
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
    </div>
  )
}
