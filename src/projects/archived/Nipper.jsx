import { useId, useState } from 'react'
import { usePrefersReducedMotion } from '../shared'
import { useTick } from './tick'
import './nipper.css'

// nipper v2 (thcolin/nipper, branch version/2.0.0): its atoms, blocks and components ported from glamor to CSS,
// its theme kept as is. Nothing reaches YouTube: any valid link digs the same sample playlist.

const ICONS = {
  arrow: 'M222.5 66.9l22.2-22.2c9.4-9.4 24.6-9.4 33.9 0L473 239c9.4 9.4 9.4 24.6 0 33.9L278.6 467.3c-9.4 9.4-24.6 9.4-33.9 0l-22.2-22.2c-9.5-9.5-9.3-25 .4-34.3L343.4 296H56c-13.3 0-24-10.7-24-24v-32c0-13.3 10.7-24 24-24h287.4L222.9 101.2c-9.8-9.3-10-24.8-.4-34.3z',
  artist: 'M96 224h13.5c24.7 56.5 80.9 96 146.5 96s121.8-39.5 146.5-96H416c8.8 0 16-7.2 16-16v-96c0-8.8-7.2-16-16-16h-13.5C377.8 39.5 321.6 0 256 0S134.2 39.5 109.5 96H96c-8.8 0-16 7.2-16 16v96c0 8.8 7.2 16 16 16zm40-88c0-22.1 21.5-40 48-40h144c26.5 0 48 17.9 48 40v24c0 53-43 96-96 96h-48c-53 0-96-43-96-96v-24zm72 72l12-36 36-12-36-12-12-36-12 36-36 12 36 12 12 36zm151.6 113.4C329.7 340.7 294.2 352 256 352s-73.7-11.3-103.6-30.6C84.9 328.5 32 385 32 454.4v9.6c0 26.5 21.5 48 48 48h80v-64c0-17.7 14.3-32 32-32h128c17.7 0 32 14.3 32 32v64h80c26.5 0 48-21.5 48-48v-9.6c0-69.4-52.9-125.9-120.4-133zM304 448c-8.8 0-16 7.2-16 16s7.2 16 16 16 16-7.2 16-16-7.2-16-16-16zm-40.4-126.6c-8.8 0-16 7.2-16 16v48h32v-48c0-8.8-7.2-16-16-16z',
  check: 'M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z',
  dots: 'M256 184c39.8 0 72 32.2 72 72s-32.2 72-72 72-72-32.2-72-72 32.2-72 72-72zM184 80c0 39.8 32.2 72 72 72s72-32.2 72-72-32.2-72-72-72-72 32.2-72 72zm0 352c0 39.8 32.2 72 72 72s72-32.2 72-72-32.2-72-72-72-72 32.2-72 72z',
  down: 'M239.03 381.476L44.687 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04l154.746 154.021 154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L272.972 381.476c-9.373 9.372-24.569 9.372-33.942 0z',
  download: 'M255.9 470c-3.7 0-7.3-1.5-9.9-4.1l-175.7-176c-6.1-6.1-3.9-13.2-3-15.3.8-2 4.3-8.7 12.9-8.7h103.7c5.5 0 10-4.5 10-10V56c0-7.7 6.3-14 14-14h96c7.7 0 14 6.3 14 14v200c0 5.5 4.5 10 10 10h103.8c5.9 0 10.7 3.2 12.9 8.6 2.3 5.4 1.1 11.2-3 15.3l-175.8 176c-2.6 2.7-6.1 4.1-9.9 4.1z',
  loading: 'M288 39.056v16.659c0 10.804 7.281 20.159 17.686 23.066C383.204 100.434 440 171.518 440 256c0 101.689-82.295 184-184 184-101.689 0-184-82.295-184-184 0-84.47 56.786-155.564 134.312-177.219C216.719 75.874 224 66.517 224 55.712V39.064c0-15.709-14.834-27.153-30.046-23.234C86.603 43.482 7.394 141.206 8.003 257.332c.72 137.052 111.477 246.956 248.531 246.667C393.255 503.711 504 392.788 504 256c0-115.633-79.14-212.779-186.211-240.236C302.678 11.889 288 23.456 288 39.056z',
  music: 'M470.4 1.5l-304 96C153.1 101.7 144 114 144 128v264.6c-14.1-5.4-30.5-8.6-48-8.6-53 0-96 28.7-96 64s43 64 96 64 96-28.7 96-64V220.5l272-85.9v194c-14.1-5.4-30.5-8.6-48-8.6-53 0-96 28.7-96 64s43 64 96 64 96-28.7 96-64V32c0-21.7-21.1-37-41.6-30.5z',
  sound: 'M227.667 110.834v297.468c0 18.981-22.971 28.331-36.277 15.026l-78.775-78.76H22.25C10.514 344.568 1 335.054 1 323.318v-127.5c0-11.736 9.514-21.25 21.25-21.25h90.365l78.776-78.761c13.29-13.29 36.276-3.976 36.276 15.026zm161.195-68.953c-13.347-8.164-30.789-3.96-38.954 9.389-8.164 13.35-3.96 30.79 9.389 38.954 56.934 34.817 95.036 97.611 95.036 169.345 0 65.017-31.943 125.988-85.449 163.099-12.858 8.918-16.052 26.571-7.134 39.429 8.921 12.864 26.577 16.05 39.429 7.134C469.946 421.535 511 343.157 511 259.569c0-91.414-48.325-172.548-122.138-217.688zM426 259.568c0-60.692-32.008-114.906-81.42-145.12-13.349-8.164-30.79-3.959-38.954 9.391-8.164 13.351-3.959 30.79 9.392 38.953 34.01 20.797 54.315 56.975 54.315 96.776 0 37.156-18.258 72.001-48.838 93.213-12.857 8.919-16.051 26.571-7.133 39.429 5.504 7.934 14.33 12.188 23.306 12.188a28.21 28.21 0 0 0 16.123-5.055C398.633 367.548 426 315.295 426 259.568zm-85 0c0-29.853-15.217-56.976-40.704-72.554-13.351-8.159-30.79-3.952-38.951 9.399-8.161 13.351-3.953 30.79 9.398 38.951 8.511 5.201 13.591 14.249 13.591 24.204-.006 9.305-4.572 18.016-12.221 23.315-12.86 8.915-16.058 26.568-7.143 39.428 8.916 12.86 26.57 16.058 39.428 7.142C327.317 313.564 341 287.44 341 259.568z',
  spinner: 'M256 490.5c-63.5 0-123.2-24.5-168-69.1-44.8-44.6-69.7-104.1-70-167.6-.3-54.1 17.1-105.2 50.4-147.7 32.2-41.2 77.7-71.1 128.1-84 1.2-.3 2.4-.5 3.6-.5 7.7 0 14 6.3 14 14v16.6c0 6.2-4.3 11.7-10.4 13.4-40 11.2-76 35.5-101.5 68.6C75.9 168.4 62 209.3 62 252.5c0 51.9 20.2 100.6 56.8 137.2 36.6 36.6 85.4 56.8 137.2 56.8 51.9 0 100.6-20.2 137.2-56.8 36.6-36.6 56.8-85.3 56.8-137.2 0-43.2-13.9-84.1-40.2-118.3-25.4-33.1-61.5-57.4-101.5-68.6-6.1-1.7-10.4-7.2-10.4-13.4V35.6c0-7.7 6.2-14 13.9-14 1.1 0 2.3.1 3.4.4 50.2 12.9 95.6 42.5 127.9 83.5 33.2 42.3 50.8 93.1 50.8 147 0 63.5-24.7 123.2-69.5 168.1-44.8 44.9-104.5 69.7-167.9 69.9H256z',
  switch: 'M137 288h238c21.4 0 32.1 25.9 17 41L273 448c-9.4 9.4-24.6 9.4-33.9 0L120 329c-15.1-15.1-4.4-41 17-41zm255-105L273 64c-9.4-9.4-24.6-9.4-33.9 0L120 183c-15.1 15.1-4.4 41 17 41h238c21.4 0 32.1-25.9 17-41z',
  up: 'M272.97 130.524l194.343 194.343c9.373 9.373 9.373 24.569 0 33.941l-22.667 22.667c-9.357 9.357-24.522 9.375-33.901.04L255.999 227.495 101.254 381.516c-9.379 9.335-24.544 9.317-33.901-.04l-22.667-22.667c-9.373-9.373-9.373-24.569 0-33.941L239.029 130.524c9.372-9.373 24.568-9.373 33.941 0z',
  video: 'M298.761 85.667H42.906C19.485 85.667.5 104.652.5 128.073v255.855c0 23.421 18.985 42.406 42.406 42.406h255.855c23.421 0 42.406-18.985 42.406-42.406V128.073c0-23.421-18.985-42.406-42.406-42.406zm168.027 33.446l-97.232 67.069v139.638l97.232 66.98c18.808 12.952 44.712-.266 44.712-22.889V142.001c0-22.534-25.816-35.841-44.712-22.888z',
  warning: 'M505.749 419.248c16.375 28.383-4.18 63.863-36.885 63.863H43.131c-32.769 0-53.228-35.535-36.885-63.863L219.115 50.167c16.383-28.397 57.417-28.345 73.77 0l212.864 369.081zM256 342.941c-22.538 0-40.809 18.271-40.809 40.809s18.271 40.809 40.809 40.809 40.809-18.271 40.809-40.809-18.271-40.809-40.809-40.809zm-38.745-146.687l6.581 120.653c.308 5.646 4.976 10.066 10.63 10.066h43.068c5.654 0 10.322-4.42 10.63-10.066l6.581-120.653c.333-6.098-4.523-11.226-10.63-11.226h-56.23c-6.107 0-10.962 5.128-10.63 11.226z',
}

// store/codecs.js, with the two video labels put back the right way round
const CODECS = {
  mp3: { label: 'Audio - mp3', icon: 'sound' },
  aac: { label: 'Audio - aac', icon: 'sound' },
  vorbis: { label: 'Audio - vorbis (ogg)', icon: 'sound' },
  opus: { label: 'Audio - opus', icon: 'sound' },
  webm: { label: 'Video - webm', icon: 'video' },
  mp4: { label: 'Video - mp4', icon: 'video' },
}

const STEPS = [
  ['🌐', 'Enter Youtube video or playlist link'],
  ['🏚', 'Fix wrong tags (cover, artist, song)'],
  ['🎩', 'Choose format (audio, video)'],
  ['🚌', 'Select some videos...'],
  ['💽', 'Download one-by-one or zipped !'],
]

// store/services/youtube.js
const PLAYLIST = /(?:youtube\.com\/)(?:watch|playlist)(?:.*?list=)([^#&?=]{18,34})/
const VIDEO = /(?:youtu\.?be(?:\.com)?\/)(?:watch|embed|v)?(?:\/|\?)?(?:.*?v=)?([^#&?=]{11})/
const TOPOGRAPHY = new URL('./nipper-topography.svg', import.meta.url)
const SAMPLE_LINK = 'https://youtube.com/playlist?list=PLnipperSampleData0000'

const SAMPLE = {
  title: 'Sample playlist',
  author: 'nipper',
  tracks: [
    { id: 't1', title: 'Lune Rouge - Paper Lanterns (Official Video)', author: 'Lune Rouge', hue: 348 },
    { id: 't2', title: 'The Midnight Owls – Neon Harbour [HD]', author: 'MidnightOwlsVEVO', hue: 205 },
    { id: 't3', title: 'Coastal Drive (feat. Ama) - Kiko Sato | Lyrics', author: 'Lyrics Corner', hue: 32 },
    { id: 't4', title: 'Glass Orchard - Slow Tide (Live Session)', author: 'Glass Orchard', hue: 160 },
    { id: 't5', title: 'velvet arcade - summer static (audio)', author: 'velvet arcade', hue: 275 },
    { id: 't6', title: 'Marée Basse — Les Phares [Clip Officiel]', author: 'Marée Basse', hue: 190 },
  ],
}

// What get-artist-title does for nipper: split on the dash, drop the noise around the song
const identify = (title) => {
  const clean = title
    .replace(/\s*[[(](official video|clip officiel|hd|audio|lyrics?)[\])]/gi, '')
    .replace(/\s*\|\s*lyrics?$/i, '')
    .trim()
  const [artist, ...song] = clean.split(/\s+[-–—]\s+/)

  return song.length ? [artist.trim(), song.join(' - ').trim()] : ['', clean]
}

const Icon = ({ name, animate }) => (
  <i className={animate ? 'nipper-icon is-spinning' : 'nipper-icon'} aria-hidden='true'>
    <svg viewBox='0 0 512 512' width='100%' height='100%'><path fill='currentColor' d={ICONS[name]} /></svg>
  </i>
)

// components/atoms/Button.js, its progress drawn as a pie when the button has no label
const Button = ({ appearance = 'plain', inverted = false, icon, animate = false, progress = null, size = 1, label, className = '', ...props }) => {
  const angle = Math.max(12, 360 * (progress / 100))
  const end = ((angle - 90) * Math.PI) / 180
  const pie = `M100,100 v-100 a100,100 0 ${angle < 180 ? '0' : '1'},1 ${Math.cos(end) * 100},${100 + Math.sin(end) * 100} z`
  const classes = [
    'nipper-button',
    `nipper-button--${appearance}`,
    inverted && 'is-inverted',
    label ? 'has-label' : appearance === 'none' && 'is-bare',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button type='button' {...props} className={classes} style={{ fontSize: `${size}em` }}>
      {appearance !== 'none' && progress !== null && (
        <svg viewBox='0 0 200 200' preserveAspectRatio='none' className='nipper-button__progress' aria-hidden='true'>
          {label && <rect x='0' y='0' width={`${progress}%`} height='100%' />}
          {!label && angle >= 360 && <circle cx='100' cy='100' r='100' />}
          {!label && angle < 360 && <path d={pie} />}
        </svg>
      )}
      <span className='nipper-button__content'>
        {icon && <Icon name={icon} animate={animate} />}
        {label && <span className='nipper-button__label'>{label}</span>}
      </span>
    </button>
  )
}

const Logo = ({ inverted, animate, className, onClick, label }) => {
  const [pulse, setPulse] = useState(false)
  const bars = [[0, 10, 1], [2, 9, 3], [4, 8, 5], [6, 9, 3], [8, 7, 7], [10, 5, 10], [12, 3, 14], [14, 5, 10], [16, 8, 5], [18, 7, 7], [20, 9, 3], [22, 10, 1]]
  const delays = [0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.3, 0.35, 0.4, 0.45]
  const play = () => {
    if (!pulse) {
      setPulse(true)
      setTimeout(() => setPulse(false), 1200)
    }
  }
  const svg = (
    <svg viewBox='0 0 24 20' className={[inverted && 'is-inverted', (animate || pulse) && 'is-waving'].filter(Boolean).join(' ') || undefined} aria-hidden='true'>
      {bars.map(([x, y, height], index) => (
        <rect key={x} x={x} y={y} width='1' height={height} rx='0.5' style={{ animationDelay: `-${delays[index]}s` }} />
      ))}
    </svg>
  )

  return (
    <button type='button' className={`nipper-logo ${className}`} aria-label={label} onClick={onClick || play}>{svg}</button>
  )
}

const Select = ({ value, onChange, disabled, label }) => (
  <label className={disabled ? 'nipper-select is-disabled' : 'nipper-select'} title={CODECS[value].label}>
    <select value={value} disabled={disabled} aria-label={label} onChange={(event) => onChange(event.target.value)}>
      {Object.entries(CODECS).map(([key, codec]) => <option key={key} value={key}>{codec.label}</option>)}
    </select>
    <Icon name={CODECS[value].icon} />
  </label>
)

const Input = ({ icon, ...props }) => (
  <label className='nipper-input'>
    <input type='text' spellCheck={false} {...props} />
    <Icon name={icon} />
  </label>
)

const Stepper = ({ steps, name }) => {
  const [count, setCount] = useState(0)
  const current = Math.min(steps.length - 1, count)

  return (
    <div className='nipper-stepper'>
      <div className='nipper-stepper__steps' aria-live='polite'>
        {steps.map(([emoji, label], index) => (
          <p key={label} className='nipper-stepper__step' style={{ translate: `${-current * 100}% 0` }} aria-hidden={index !== current}>
            <span className='nipper-stepper__emoji' aria-hidden='true'>{emoji}</span>
            <em dangerouslySetInnerHTML={{ __html: label.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
          </p>
        ))}
      </div>
      {steps.length > 1 && (
        <div className='nipper-stepper__radio' role='radiogroup' aria-label='Steps'>
          {steps.map(([, label], index) => (
            <input key={label} type='radio' name={name} aria-label={`Step ${index + 1}`} checked={index === current} onChange={() => setCount(index)} />
          ))}
        </div>
      )}
    </div>
  )
}

const Track = ({ track, selected, zipping, onSelect, onChange, onDownload }) => {
  const busy = track.progress !== null

  return (
    <li className={selected ? 'nipper-track is-selected' : 'nipper-track'}>
      <div className='nipper-track__thumbnail' style={{ '--hue': track.hue }} aria-hidden='true'>
        <span>{track.duration}</span>
      </div>
      <div className='nipper-track__body'>
        <div className='nipper-track__top'>
          <div className='nipper-track__headings'>
            <p className='nipper-track__title' title={track.title}>{track.title}</p>
            <p className='nipper-track__author'>{track.author}</p>
          </div>
          <div className='nipper-track__actions'>
            <Button
              appearance={selected ? 'plain' : 'light'}
              icon='check'
              size={0.5}
              title={selected ? 'Unselect' : 'Select'}
              aria-label={`Select ${track.title}`}
              aria-pressed={selected}
              disabled={zipping || busy}
              onClick={onSelect}
            />
            <Button
              icon='download'
              size={0.5}
              progress={track.progress}
              title={busy ? `${Math.round(track.progress)}%` : `Download as ${track.format}`}
              aria-label={busy ? `Cancel the download of ${track.title}` : `Download ${track.title} as ${track.format}`}
              disabled={zipping && selected}
              onClick={onDownload}
            />
            <Select value={track.format} label={`Codec for ${track.title}`} disabled={busy} onChange={(format) => onChange({ format })} />
          </div>
        </div>
        <div className='nipper-track__inputs'>
          <Input icon='artist' placeholder='Artist' aria-label='Artist' value={track.artist} disabled={busy} onChange={(event) => onChange({ artist: event.target.value })} />
          <Button
            appearance='none'
            icon='switch'
            className='nipper-track__switch'
            title='Switch artist and song'
            aria-label='Switch artist and song'
            disabled={busy}
            onClick={() => onChange({ artist: track.song, song: track.artist })}
          />
          <Input icon='music' placeholder='Song' aria-label='Song' value={track.song} disabled={busy} onChange={(event) => onChange({ song: event.target.value })} />
        </div>
      </div>
    </li>
  )
}

const Placeholder = () => (
  <li className='nipper-track is-placeholder' aria-hidden='true'>
    <div className='nipper-track__thumbnail' />
    <div className='nipper-track__body'>
      <div className='nipper-track__top'>
        <div className='nipper-track__headings'>
          <span className='nipper-shimmer nipper-shimmer--title' />
          <span className='nipper-shimmer nipper-shimmer--author' />
        </div>
        <span className='nipper-shimmer nipper-shimmer--actions' />
      </div>
      <span className='nipper-shimmer nipper-shimmer--inputs' />
    </div>
  </li>
)

const fresh = () => SAMPLE.tracks.map((track, index) => {
  const [artist, song] = identify(track.title)
  return { ...track, artist, song, format: 'mp3', progress: null, duration: `0${3 + (index % 3)}:${String(7 + index * 9).padStart(2, '0')}` }
})

export const Nipper = ({ awake }) => {
  const id = useId()
  const reduced = usePrefersReducedMotion()
  const [view, setView] = useState('landing')
  const [value, setValue] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches ? SAMPLE_LINK : '')
  const [error, setError] = useState(null)
  const [dig, setDig] = useState(null)
  const [tracks, setTracks] = useState([])
  const [selection, setSelection] = useState([])
  const [format, setFormat] = useState('mp3')
  const [zipping, setZipping] = useState(false)
  const [curtain, setCurtain] = useState(false)
  const [typing, setTyping] = useState(true)

  const total = SAMPLE.tracks.length
  const digging = dig && !dig.done
  const downloading = tracks.some((track) => track.progress !== null)
  const zipped = tracks.filter((track) => selection.includes(track.id))
  const zip = zipping ? zipped.reduce((sum, track) => sum + (track.progress ?? 100), 0) / (zipped.length || 1) : null

  // The app scrolled its page from the landing to the results; here the two slide, so only the list scrolls
  const reveal = () => setView('results')

  const start = (link) => {
    setError(null)
    setSelection([])
    setZipping(false)

    if (!PLAYLIST.test(link) && !VIDEO.test(link)) {
      setDig(null)
      setTracks([])
      setError('Provide a valid **YouTube** video or playlist link')
      return
    }

    const all = fresh()
    const single = !PLAYLIST.test(link)
    const playlist = single ? all.slice(0, 1) : all

    if (reduced) {
      setDig({ link, done: true, synced: playlist.length, total: playlist.length })
      setTracks(playlist)
    } else {
      setDig({ link, done: false, synced: 0, total: playlist.length, queue: playlist })
      setTracks([])
    }

    reveal()
  }

  const submit = (event) => {
    event.preventDefault()

    if (digging) {
      setDig(null)
      setTracks([])
      return
    }

    start(value.trim())
  }

  // Tracks come in one by one, as the YouTube API pages did; downloads fill their pie, then let go
  useTick(() => {
    let next = tracks

    if (digging) {
      const synced = dig.synced + 1
      next = dig.queue.slice(0, synced).map((track) => tracks.find((item) => item.id === track.id) ?? track)
      setDig({ ...dig, synced, done: synced >= dig.total })
    }

    next = next.map((track) => {
      if (track.progress === null) {
        return track
      }

      return { ...track, progress: track.progress >= 100 ? null : Math.min(100, track.progress + 4 + Math.random() * 9) }
    })

    setTracks(next)

    if (zipping && next.every((track) => !selection.includes(track.id) || track.progress === null)) {
      setZipping(false)
    }
  }, 260, awake && (digging || downloading))

  // A sample link types itself in the field, until someone types instead
  useTick(() => {
    if (value.length < SAMPLE_LINK.length) {
      setValue(SAMPLE_LINK.slice(0, value.length + 1))
    } else {
      setTyping(false)
    }
  }, 45, awake && typing && !dig && !reduced)

  const change = (trackId, patch) => setTracks((current) => current.map((track) => track.id === trackId ? { ...track, ...patch } : track))

  const toggle = (trackId) => setSelection((current) => current.includes(trackId) ? current.filter((item) => item !== trackId) : [...current, trackId])

  const download = (track) => change(track.id, { progress: track.progress === null ? (reduced ? 100 : 0) : null })

  const downloadAll = () => {
    setZipping(!zipping)
    setTracks((current) => current.map((track) => selection.includes(track.id) ? { ...track, format, progress: zipping ? null : (reduced ? 100 : 0) } : track))
  }

  const everything = tracks.length > 0 && selection.length === tracks.length

  return (
    <div className={dig && view === 'results' ? 'nipper is-results' : 'nipper'}>
      <section className='nipper__landing' aria-label='nipper, landing' inert={dig && view === 'results' ? '' : undefined}>
        <div className='nipper__topography' style={{ backgroundImage: `url(${TOPOGRAPHY})` }} aria-hidden='true' />
        <Logo inverted className='nipper__logo' label='nipper' />
        <div className='nipper__body'>
          <p className='nipper__heading'>Nipper</p>
          <form className={digging ? 'nipper-form is-busy' : 'nipper-form'} onSubmit={submit}>
            <input
              type='search'
              value={digging ? dig.link : value}
              placeholder='Enter a Youtube video or playlist link'
              aria-label='YouTube video or playlist link'
              spellCheck={false}
              disabled={digging}
              onFocus={() => setTyping(false)}
              onChange={(event) => {
                setTyping(false)
                setValue(event.target.value)
              }}
              className='nipper-form__input'
            />
            <Button
              type='submit'
              inverted
              icon={digging ? 'loading' : 'arrow'}
              animate={digging}
              label={digging ? 'Cancel' : undefined}
              aria-label={digging ? 'Cancel' : 'Dig the link'}
              className='nipper-form__submit'
            />
          </form>
          <Stepper key={error || 'steps'} name={`${id}-stepper`} steps={error ? [['⚠️', error]] : STEPS} />
        </div>
        <div className={dig?.done ? 'nipper-curtain' : 'nipper-curtain is-empty'}>
          <Button
            appearance='none'
            inverted
            icon={curtain ? 'down' : 'up'}
            aria-label={curtain ? 'Hide recent playlists' : 'Show recent playlists'}
            aria-expanded={curtain}
            className='nipper-curtain__toggle'
            onClick={() => setCurtain(!curtain)}
          />
          {curtain && dig?.done && (
            <button type='button' className='nipper-tale' onClick={() => reveal()}>
              <span className='nipper-tale__head' style={{ '--hue': SAMPLE.tracks[0].hue }} />
              <span className='nipper-tale__body'>
                <span className='nipper-tale__title'>{SAMPLE.title}</span>
                <span className='nipper-tale__author'>{SAMPLE.author}</span>
              </span>
            </button>
          )}
        </div>
      </section>
      {dig && (
        <section className='nipper__results' aria-label='nipper, results' inert={view === 'results' ? undefined : ''}>
          <div className='nipper-belt'>
            <div className='nipper-belt__side'>
              {dig.done ? (
                <Button
                  appearance={everything ? 'plain' : 'light'}
                  icon='check'
                  size={0.625}
                  title={everything ? 'Unselect All' : 'Select All'}
                  aria-label={everything ? 'Unselect all' : 'Select all'}
                  disabled={zip !== null}
                  className='nipper-belt__check'
                  onClick={() => setSelection(everything ? [] : tracks.map((track) => track.id))}
                />
              ) : (
                <span className='nipper-belt__syncing' role='status' title={`Syncing: ${dig.synced} / ${dig.total}`}>
                  <Icon name='spinner' animate />
                  <span className='visually-hidden'>{`Syncing: ${dig.synced} / ${dig.total}`}</span>
                </span>
              )}
              <Select value={format} label='Codec for the zip' disabled={zip !== null} onChange={setFormat} />
            </div>
            <Logo animate={digging} className='nipper-belt__logo' label='Back to the link' onClick={() => setView('landing')} />
            <div className='nipper-belt__side'>
              <Button
                appearance={zip === null ? 'light' : 'plain'}
                icon='download'
                size={0.625}
                progress={zip}
                title={selection.length ? `Download (${selection.length})` : 'First, select some videos'}
                aria-label={zip !== null ? 'Cancel the zip' : selection.length ? `Download ${selection.length} as a zip` : 'First, select some videos'}
                disabled={!selection.length}
                onClick={downloadAll}
              />
              <Button appearance='none' icon='dots' title='Options' aria-label='Options' disabled className='nipper-belt__dots' />
            </div>
          </div>
          <p className='nipper-message'>
            <Icon name='warning' />
            <span>Keep in mind this project is <strong>experimental</strong> and that <strong>downloading</strong> or <strong>converting</strong> into specific codec, are directly made by <strong>your browser</strong> !</span>
          </p>
          <ul className='nipper-list' aria-live='polite' aria-busy={digging}>
            {tracks.map((track) => (
              <Track
                key={track.id}
                track={track}
                selected={selection.includes(track.id)}
                zipping={zip !== null}
                onSelect={() => toggle(track.id)}
                onChange={(patch) => change(track.id, patch)}
                onDownload={() => download(track)}
              />
            ))}
            {digging && Array.from({ length: Math.min(2, dig.total - tracks.length) }, (_, index) => <Placeholder key={index} />)}
          </ul>
        </section>
      )}
    </div>
  )
}
