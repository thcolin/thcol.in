import { useCallback, useEffect, useRef, useState } from 'react'
import { Choices, Tags, stepOf, usePrefersReducedMotion, useScrub } from '../shared'
import { GuideLabel, Hud, Legend, clock, useInView } from './osd'
import { Bars, Film, Radio, STREAM, Spotify, TRACK, Weather } from './channels'
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
  { n: 8, id: 'fip', label: 'FIP Cultes', kind: 'radio', title: 'Live stream', byline: 'Radio France' },
  { n: 9, id: 'kanshi', label: 'Kanshi', kind: 'kanshi', title: 'Homelab', byline: 'Kyoto · Tokyo · Akihabara' },
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

// The scroll only visits a few flagship channels
const FLAGSHIPS = ['teevy', 'plex', 'spotify', 'gamecube', 'kanshi']
const VIEWS = ['cover', 'aurora']
const HUD_MS = 4000
const SNOW_MS = 320
const HOLD_MS = 1400
const ENTRY_MS = 1500
const SWIPE_PX = 40

const pad = (n) => String(n).padStart(2, '0')

// Thomas's photos of the real Sharp CRT: the print shows the tube on the channel being watched
const PHOTOS = {
  teevy: { src: new URL('../../assets/teevy/photo/tube.webp', import.meta.url), alt: 'The real CRT on channel 00: the colour bars with teevy\'s face, a controller on the desk' },
  kanshi: { src: new URL('../../assets/teevy/photo/kanshi.webp', import.meta.url), alt: 'The real CRT on channel 09: Kanshi, on the Kyoto page' },
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
  const [elapsed, setElapsed] = useState(0)
  const [listened, setListened] = useState(0)
  const [view, setView] = useState('cover')
  const [sound, setSound] = useState(false)
  const [playback, setPlayback] = useState(null)
  const analyser = useRef(null)
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

  // The scroll zaps through the flagships, faster through a boot screen the quicker it goes, until someone takes the remote
  const step = useRef(0)
  const scroll = useRef({ velocity: 0, at: 0 })
  const [scrub, handOver] = useScrub((progress, velocity) => {
    const index = stepOf(progress, FLAGSHIPS.length)
    scroll.current = { velocity, at: performance.now() }

    if (index !== step.current) {
      step.current = index
      tune(CHANNELS.findIndex((item) => item.id === FLAGSHIPS[index]))
    }
  })

  const speed = useCallback(() => {
    const { velocity, at } = scroll.current
    const fade = Math.max(0, 1 - (performance.now() - at) / 400)
    return 1 + Math.min(3, velocity * 1.5) * fade
  }, [])

  const take = (index) => {
    handOver()
    tune(index)
  }

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
    if (sound && ((current.kind !== 'radio' && current.kind !== 'spotify') || !inView)) {
      setSound(false)
    }
  }, [current.kind, inView, sound])

  useEffect(() => {
    if (current.kind !== 'spotify') setPlayback(null)
  }, [current.kind])

  // The radio's level, read off the stream itself, drives its aurora
  const level = useCallback(() => {
    const node = analyser.current

    if (!node) {
      return null
    }

    const bins = new Uint8Array(node.frequencyBinCount)
    node.getByteFrequencyData(bins)
    let sum = 0
    for (let i = 2; i < bins.length * 0.25; i++) sum += bins[i]
    return Math.min(1, sum / (bins.length * 0.25 - 2) / 160)
  }, [])

  useEffect(() => {
    const element = audio.current

    if (!element) {
      return
    }

    if (sound && current.kind === 'radio') {
      element.src = STREAM

      if (!analyser.current) {
        try {
          const context = new AudioContext()
          const node = context.createAnalyser()
          node.fftSize = 512
          context.createMediaElementSource(element).connect(node)
          node.connect(context.destination)
          analyser.current = node
        } catch {}
      }

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

    hold.current = setTimeout(() => setRun((count) => count + 1), HOLD_MS)
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
      handOver()
      setView((value) => VIEWS[(VIEWS.indexOf(value) + side + VIEWS.length) % VIEWS.length])
    } else if (event.key === ' ' && (current.kind === 'radio' || current.kind === 'spotify')) {
      event.preventDefault()
      handOver()
      setSound(!sound)
    } else if ((event.key === 'p' || event.key === 'P' || event.key === ' ') && current.kind === 'pet') {
      event.preventDefault()
      handOver()
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

  // The track's clock comes from the YouTube player when it reports, otherwise it runs on its own
  const position = playback ? playback.position : listened % TRACK.length
  const length = playback?.length || TRACK.length
  const info = current.kind === 'spotify'
    ? { title: TRACK.title, byline: `${TRACK.artist} · ${TRACK.album}`, progress: { ratio: position / length, elapsed: clock(position), total: clock(length) } }
    : current.kind === 'game'
      ? { title: 'Boot screen', byline: `Live · ${current.render}` }
      : {
          title: current.title,
          byline: current.byline,
          progress: current.duration ? { ratio: ((current.start + elapsed) % current.duration) / current.duration, elapsed: clock((current.start + elapsed) % current.duration), total: clock(current.duration) } : null,
        }

  const legend = [['Select', ['▲', '▼']], ['Tune', ['0', '9']]]
  if (current.kind === 'spotify') legend.push(['View', ['◄', '►']], ['Sound', ['Space']])
  if (current.kind === 'radio') legend.push(['Sound', ['Space']])
  if (current.kind === 'pet') legend.push(['Play', ['P']])
  if (current.kind === 'game') legend.push(['Replay', ['OK']])

  return (
    <div ref={scrub} id='teevy' className='scrub' style={{ '--steps': FLAGSHIPS.length }}>
      <article
        ref={band}
        className='band teevy'
        aria-labelledby='teevy-title'
        tabIndex={0}
        onKeyDown={keys}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={() => { swipe.current = null }}
        data-kind={current.kind}
      >
        <Prints active={photo} />
        <div className='teevy__stage' data-scrub-demo>
          <div className='teevy__screen'>
            <div className='teevy__channel' data-channel={current.id}>
              {current.kind === 'film' && <Film still={current.still} />}
              {current.kind === 'spotify' && <Spotify view={view} running={inView} reduced={reduced} sound={sound} onTime={setPlayback} position={position} />}
              {current.kind === 'weather' && <Weather active={inView} />}
              {current.kind === 'av' && <Bars />}
              {current.kind === 'radio' && <Radio sound={sound} onToggle={() => { handOver(); setSound(!sound) }} running={inView} reduced={reduced} level={level} />}
              {current.kind === 'pet' && <PetChannel ref={pet} active={inView} reduced={reduced} />}
              {current.kind === 'game' && <IntroChannel id={current.id} run={run} playing={inView && (!reduced || run > 1)} speed={speed} onDone={introDone} />}
              {current.kind === 'kanshi' && <KanshiChannel active={inView} reduced={reduced} />}
            </div>
            <audio ref={audio} preload='none' crossOrigin='anonymous' />
            <div className={snow ? 'teevy-snow is-on' : 'teevy-snow'} aria-hidden='true' />
            <Hud visible={hud} number={pad(current.n)} name={current.label} title={info.title} byline={info.byline} progress={info.progress} />
            {entry && <p className='teevy-entry' aria-hidden='true'>{entry.padEnd(2, '-')}</p>}
          </div>
        </div>
        <div className='teevy-osd'>
          <h3 id='teevy-title' className='teevy-osd__band'>
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
    </div>
  )
}
