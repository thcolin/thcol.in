import { useEffect, useRef, useState } from 'react'
import { Choices, Tags, usePrefersReducedMotion } from '../shared'
import { GuideLabel, Hud, Legend, clock, useInView } from './osd'
import { ALBUM, Bars, Film, Radio, STREAM, Spotify, Weather, albumAt } from './channels'
import { PetChannel } from './Pet'
import { IntroChannel } from './Intro'
import { KanshiChannel } from './Kanshi'
import { drainRenderers } from './gl'

// teevy's own channel numbers where it has them; Plex, the weather, Kanshi and Moonlight take free ones
const CHANNELS = [
  { n: 0, id: 'teevy', label: 'teevy', kind: 'pet', title: 'Tamagotchi', byline: 'Repair the mire to win watts' },
  { n: 1, id: 'plex', label: 'Plex', kind: 'film', title: 'Big Buck Bunny', byline: 'Film · 2008', duration: 596, start: 92, still: new URL('../../assets/teevy/channels/big-buck-bunny.webp', import.meta.url) },
  { n: 2, id: 'weather', label: 'Weather', kind: 'weather', title: 'Today', byline: 'Nantes, Brest, Paris, Lyon, Marseille' },
  { n: 4, id: 'cine', label: 'Cinéma libre', kind: 'film', title: 'Tears of Steel', byline: 'YouTube · Blender', duration: 734, start: 181, still: new URL('../../assets/teevy/channels/tears-of-steel.webp', import.meta.url) },
  { n: 6, id: 'spotify', label: 'Spotify', kind: 'spotify' },
  { n: 8, id: 'fip', label: 'FIP Cultes', kind: 'radio', title: 'FIP Cultes', byline: 'Radio France · live' },
  { n: 9, id: 'kanshi', label: 'Kanshi', kind: 'kanshi', title: 'Homelab', byline: 'Babylon · Cortex · Chroma' },
  { n: 10, id: 'av', label: 'AV input', kind: 'av', title: 'No signal', byline: 'Composite' },
  { n: 11, id: 'snes', label: 'Super Nintendo', kind: 'game', render: 'SVG' },
  { n: 12, id: 'n64', label: 'Nintendo 64', kind: 'game', render: 'three.js' },
  { n: 13, id: 'gba', label: 'Game Boy Advance', kind: 'game', render: 'SVG' },
  { n: 14, id: 'gamecube', label: 'GameCube', kind: 'game', render: 'three.js' },
  { n: 15, id: 'ps1', label: 'PlayStation', kind: 'game', render: 'SVG' },
  { n: 16, id: 'ps2', label: 'PlayStation 2', kind: 'game', render: 'three.js' },
  { n: 17, id: 'psp', label: 'PSP', kind: 'game', render: 'three.js' },
  { n: 21, id: 'moonlight', label: 'Moonlight', kind: 'game', render: 'SVG' },
]

// The demo loop only visits a few flagship channels
const FLAGSHIPS = ['teevy', 'cine', 'spotify', 'snes', 'kanshi', 'gamecube']
const VIEWS = ['cover', 'aurora']
const HUD_MS = 4000
const SNOW_MS = 320
const AUTO_MS = 10000
const GAME_MAX_MS = 19000
const HOLD_MS = 1400
const ENTRY_MS = 1500
const SWIPE_PX = 40
const IDLE_MS = 15000

const pad = (n) => String(n).padStart(2, '0')

// Thomas's photos of the real Sharp CRT: the print shows the tube on the channel being watched
const PHOTOS = {
  teevy: { src: new URL('../../assets/teevy/photo/tube.webp', import.meta.url), alt: 'The real CRT on channel 00: the colour bars with teevy\'s face, a controller on the desk' },
  kanshi: { src: new URL('../../assets/teevy/photo/kanshi.webp', import.meta.url), alt: 'The real CRT on channel 09: Kanshi, on the Babylon page' },
  spotify: { src: new URL('../../assets/teevy/photo/spotify.webp', import.meta.url), alt: 'The real CRT on channel 06: Spotify\'s screensaver' },
  plex: { src: new URL('../../assets/teevy/photo/plex.webp', import.meta.url), alt: 'The real CRT on channel 01: Plex playing a cartoon' },
}

// All four prints, always; the one of the channel being watched lifts out of the fan
const Prints = ({ active }) => (
  <ul className='teevy-prints' aria-label='Photos of the real CRT'>
    {Object.entries(PHOTOS).map(([id, { src, alt }]) => (
      <li key={id} className={id === active ? 'teevy-prints__print is-active' : 'teevy-prints__print'}>
        <img src={src} alt={alt} width='1000' height='1778' loading='lazy' />
      </li>
    ))}
  </ul>
)

export const Tv = () => {
  const [channel, setChannel] = useState(0)
  const [hud, setHud] = useState(true)
  const [snow, setSnow] = useState(false)
  const [auto, setAuto] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [listened, setListened] = useState(0)
  const [view, setView] = useState('cover')
  const [sound, setSound] = useState(false)
  const [run, setRun] = useState(0)
  const [entry, setEntry] = useState('')
  const reduced = usePrefersReducedMotion()
  const band = useRef(null)
  const swipe = useRef(null)
  const audio = useRef(null)
  const pet = useRef(null)
  const hold = useRef(0)
  const inView = useInView(band, '100px 0px')
  const current = CHANNELS[channel]
  const photo = PHOTOS[current.id] ? current.id : null

  const tune = (index) => {
    clearTimeout(hold.current)
    setChannel((index + CHANNELS.length) % CHANNELS.length)
    setSnow(!reduced)
    setElapsed(0)
    setRun((count) => count + 1)
  }

  const take = (index) => {
    setAuto(false)
    tune(index)
  }

  const tuneTo = (id) => tune(CHANNELS.findIndex((item) => item.id === id))

  const nextFlagship = () => {
    const at = FLAGSHIPS.indexOf(current.id)
    tuneTo(FLAGSHIPS[(at + 1) % FLAGSHIPS.length])
  }

  // Like a TV in demo mode: zapping resumes on its own once nobody touches it
  useEffect(() => {
    if (auto || sound) {
      return
    }

    const timer = setTimeout(() => setAuto(true), IDLE_MS)
    return () => clearTimeout(timer)
  })

  useEffect(() => {
    setHud(true)
    const timer = setTimeout(() => setHud(false), HUD_MS)
    return () => clearTimeout(timer)
  }, [channel])

  useEffect(() => {
    if (!snow) {
      return
    }

    const timer = setTimeout(() => setSnow(false), SNOW_MS)
    return () => clearTimeout(timer)
  }, [snow])

  useEffect(() => {
    if (!inView) {
      drainRenderers()
      return
    }

    const timer = setInterval(() => {
      setElapsed((seconds) => seconds + 1)
      setListened((seconds) => seconds + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [inView])

  useEffect(() => () => {
    clearTimeout(hold.current)
    drainRenderers()
  }, [])

  useEffect(() => {
    if (!auto || !inView || reduced || sound) {
      return
    }

    const timer = setTimeout(nextFlagship, current.kind === 'game' ? GAME_MAX_MS : AUTO_MS)
    return () => clearTimeout(timer)
  })

  // Two digits compose a channel number, as on teevy; one alone tunes once the wait runs out
  useEffect(() => {
    if (!entry) {
      return
    }

    const commit = () => {
      const index = CHANNELS.findIndex(({ n }) => n === Number(entry))
      if (index >= 0) take(index)
      setEntry('')
    }

    if (entry.length === 2) {
      commit()
      return
    }

    const timer = setTimeout(commit, ENTRY_MS)
    return () => clearTimeout(timer)
  }, [entry])

  // The stream only plays after a gesture, and stops as soon as the radio is left or scrolled away
  useEffect(() => {
    if (sound && (current.kind !== 'radio' || !inView)) {
      setSound(false)
    }
  }, [current.kind, inView, sound])

  useEffect(() => {
    const element = audio.current

    if (!element) {
      return
    }

    if (sound) {
      element.src = STREAM
      element.play().catch(() => setSound(false))
    } else if (element.getAttribute('src')) {
      element.pause()
      element.removeAttribute('src')
      element.load()
    }
  }, [sound])

  const introDone = () => {
    if (reduced) {
      return
    }

    hold.current = setTimeout(() => (auto ? nextFlagship() : setRun((count) => count + 1)), HOLD_MS)
  }

  const keys = (event) => {
    if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    const zap = { ArrowUp: -1, ArrowDown: 1, PageUp: -1, PageDown: 1 }[event.key]
    const side = { ArrowLeft: -1, ArrowRight: 1 }[event.key]

    if (zap) {
      event.preventDefault()
      take(channel + zap)
    } else if (side && current.kind === 'spotify') {
      event.preventDefault()
      setAuto(false)
      setView((value) => VIEWS[(VIEWS.indexOf(value) + side + VIEWS.length) % VIEWS.length])
    } else if (event.key === ' ' && current.kind === 'radio') {
      event.preventDefault()
      setAuto(false)
      setSound(!sound)
    } else if ((event.key === 'p' || event.key === 'P' || event.key === ' ') && current.kind === 'pet') {
      event.preventDefault()
      setAuto(false)
      pet.current?.press()
    } else if (event.key === 'Enter' && current.kind === 'game') {
      take(channel)
    } else if (/^[0-9]$/.test(event.key)) {
      setEntry((value) => (value + event.key).slice(-2))
    }
  }

  // A horizontal swipe zaps, a vertical one keeps scrolling the page
  const down = (event) => {
    swipe.current = { x: event.clientX, y: event.clientY }
  }

  const up = (event) => {
    const start = swipe.current
    swipe.current = null

    if (!start) {
      return
    }

    const dx = event.clientX - start.x

    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
      take(channel + (dx < 0 ? 1 : -1))
    }
  }

  const track = albumAt(listened)
  const info = current.kind === 'spotify'
    ? { title: track.title, byline: `${ALBUM.artist} · ${ALBUM.title}`, progress: { ratio: track.position / track.length, elapsed: clock(track.position), total: clock(track.length) } }
    : current.kind === 'game'
      ? { title: 'Boot screen', byline: `Live · ${current.render}` }
      : {
          title: current.title,
          byline: current.byline,
          progress: current.duration ? { ratio: ((current.start + elapsed) % current.duration) / current.duration, elapsed: clock((current.start + elapsed) % current.duration), total: clock(current.duration) } : null,
        }

  const legend = [['Select', ['▲', '▼']], ['Tune', ['0', '9']]]
  if (current.kind === 'spotify') legend.push(['View', ['◄', '►']])
  if (current.kind === 'radio') legend.push(['Sound', ['Space']])
  if (current.kind === 'pet') legend.push(['Play', ['P']])
  if (current.kind === 'game') legend.push(['Replay', ['OK']])

  return (
    <article
      ref={band}
      className='band teevy'
      aria-labelledby='teevy'
      tabIndex={0}
      onKeyDown={keys}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={() => { swipe.current = null }}
      data-kind={current.kind}
    >
      <Prints active={photo} />
      <div className='teevy__stage'>
        <div className='teevy__screen'>
          <div className='teevy__channel' data-channel={current.id}>
            {current.kind === 'film' && <Film still={current.still} />}
            {current.kind === 'spotify' && <Spotify seconds={listened} view={view} running={inView} reduced={reduced} />}
            {current.kind === 'weather' && <Weather active={inView} />}
            {current.kind === 'av' && <Bars />}
            {current.kind === 'radio' && <Radio sound={sound} onToggle={() => { setAuto(false); setSound(!sound) }} />}
            {current.kind === 'pet' && <PetChannel ref={pet} active={inView} reduced={reduced} />}
            {current.kind === 'game' && <IntroChannel id={current.id} run={run} playing={inView && (!reduced || run > 1)} onDone={introDone} />}
            {current.kind === 'kanshi' && <KanshiChannel active={inView} reduced={reduced} />}
          </div>
          <audio ref={audio} preload='none' />
          <div className={snow ? 'teevy-snow is-on' : 'teevy-snow'} aria-hidden='true' />
          <Hud visible={hud} number={pad(current.n)} name={current.label} title={info.title} byline={info.byline} progress={info.progress} />
          {entry && <p className='teevy-entry' aria-hidden='true'>{entry.padEnd(2, '-')}</p>}
        </div>
      </div>
      <div className='teevy-osd'>
        <h3 id='teevy' className='teevy-osd__band'>
          <span className='teevy-osd__key'>teevy</span>
          <span className='teevy-osd__value'>Channel guide</span>
        </h3>
        <p className='teevy-osd__text'>
          A Mac drives a real CRT as a television, through HDMI to RCA. Every source becomes a channel: films, Spotify, the radio, the weather, the consoles booting like they did, the homelab's monitor, and a tamagotchi on channel zero. All of it zapped from the keyboard, in a 90s on-screen display.
        </p>
        <Choices
          label='Channels'
          className='teevy-guide'
          value={current.id}
          onChange={(id) => take(CHANNELS.findIndex((item) => item.id === id))}
          options={CHANNELS.map(({ n, id, label }) => ({ id, label: <GuideLabel index={n - 1} label={label} /> }))}
        />
        <Tags items={['TypeScript', 'Electron', 'React', 'three.js', 'Firefox extension', 'PWA']} />
        <Legend items={legend} />
      </div>
    </article>
  )
}
