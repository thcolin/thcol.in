import { useEffect, useRef, useState } from 'react'
import { clock } from './osd'

// What teevy would be showing: Blender's open movies (CC BY), a Triplego album, FIP Cultes live,
// today's real forecast from Open-Meteo, and the AV input left empty

export const ALBUM = {
  artist: 'Triplego',
  title: 'MACHAKIL',
  year: 2019,
  cover: new URL('../../assets/teevy/channels/machakil.webp', import.meta.url),
  // The cover is black and white split by a red and cyan fringe: the aurora takes those two
  colors: ['#ff3b3b', '#2ee6f0'],
  tracks: [
    ["Tu l'auras", 255], ['3an 3an 3an', 202], ['Panama', 258], ['Trou Noir', 248], ['Pagavinho', 221], ['Costa', 248], ['Die', 182], ['Interlude', 153],
    ['Socios', 233], ['Hasta la muerte', 291], ['No conozco', 207], ['Habeeba', 218], ['Vamos', 240], ['Iris', 213], ['Rihanna', 258], ["Les cheveux d'Assala", 270],
  ],
}

export const STREAM = 'https://icecast.radiofrance.fr/fipcultes-hifi.aac'

// Where the album is at, `seconds` after the band came on: starts on track 3, as if picked up mid-listen
export const albumAt = (seconds) => {
  let left = seconds + 42 + ALBUM.tracks.slice(0, 2).reduce((sum, [, length]) => sum + length, 0)
  let index = 0

  while (left >= ALBUM.tracks[index][1]) {
    left -= ALBUM.tracks[index][1]
    index = (index + 1) % ALBUM.tracks.length
  }

  return { index, title: ALBUM.tracks[index][0], length: ALBUM.tracks[index][1], position: left }
}

export const Film = ({ still }) => (
  <div className='teevy-prog teevy-prog--film' aria-hidden='true'>
    <img className='teevy-prog__still' src={still} alt='' width='1280' height='720' loading='lazy' />
  </div>
)

const CreditTag = ({ kicker, artist, title, meta }) => (
  <div className='teevy-credit'>
    <span className='teevy-credit__kicker'><i className='teevy-credit__dot' />{kicker}</span>
    <span className='teevy-credit__artist'>{artist}</span>
    <span className='teevy-credit__title'>{title}</span>
    <span className='teevy-credit__meta'>{meta}</span>
  </div>
)

const Aurora = ({ running, still }) => {
  const host = useRef(null)

  useEffect(() => {
    if (!running) {
      return
    }

    let dispose = null
    let cancelled = false

    import('./aurora').then(({ mountAurora }) => {
      if (!cancelled && host.current) {
        dispose = mountAurora(host.current, { colors: ALBUM.colors, still })
      }
    })

    return () => {
      cancelled = true
      dispose?.()
    }
  }, [running, still])

  return <div ref={host} className='teevy-aurora' />
}

export const Spotify = ({ seconds, view, running, reduced }) => {
  const track = albumAt(seconds)

  return (
    <div className='teevy-prog teevy-prog--spotify' aria-hidden='true'>
      {view === 'aurora'
        ? <Aurora running={running} still={reduced} />
        : (
          <>
            <div className='teevy-prog__blur' style={{ backgroundImage: `url(${ALBUM.cover})` }} />
            <img className='teevy-prog__cover' src={ALBUM.cover} alt='' width='600' height='600' loading='lazy' />
          </>
          )}
      <CreditTag kicker='Spotify' artist={ALBUM.artist} title={track.title} meta={`${ALBUM.title} · ${ALBUM.year} · ${String(track.index + 1).padStart(2, '0')}/${ALBUM.tracks.length}`} />
      <p className='teevy-prog__view'>{view === 'aurora' ? 'Aurora' : 'Cover'} · {clock(track.position)}</p>
    </div>
  )
}

const SpeakerIcon = ({ off }) => (
  <svg className='teevy-mute__icon' viewBox='0 0 16 14' aria-hidden='true' shapeRendering='crispEdges'>
    <path d='M1 4h3l4-3h1v12H8L4 10H1z' fill='#fff' />
    {off
      ? <path d='M11 4h1v1h1v1h1V5h1v1h-1v1h1v1h-1v1h1v1h-1V9h-1v1h-1V9h1V8h-1V7h1V6h-1V5h-1z' fill='#ff3030' />
      : <path d='M11 5h1v4h-1zM13 3h1v8h-1z' fill='#28e060' />}
  </svg>
)

export const Radio = ({ sound, onToggle }) => (
  <div className='teevy-prog teevy-prog--radio'>
    <div className='teevy-prog__plate' aria-hidden='true'>
      <span className='teevy-prog__station'>FIP</span>
      <span className='teevy-prog__station-sub'>Cultes</span>
    </div>
    <button type='button' className='teevy-mute' onClick={onToggle} aria-pressed={sound} aria-label={sound ? 'Mute FIP Cultes' : 'Listen to FIP Cultes, live'}>
      <SpeakerIcon off={!sound} />
      <span>{sound ? 'On air' : 'Sound off'}</span>
    </button>
    <p className='teevy-prog__view' aria-hidden='true'>Radio France · live stream</p>
  </div>
)

const CITIES = [
  ['Nantes', 47.22, -1.55],
  ['Brest', 48.39, -4.49],
  ['Paris', 48.86, 2.35],
  ['Lyon', 45.76, 4.84],
  ['Marseille', 43.3, 5.37],
]

const GLYPHS = {
  sun: <><circle cx='8' cy='8' r='3.5' fill='#f4d000' />{[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => <rect key={angle} x='7.4' y='0.6' width='1.2' height='2.2' fill='#f4d000' transform={`rotate(${angle} 8 8)`} />)}</>,
  cloud: <path d='M3 12h10a3 3 0 0 0 0-6 4 4 0 0 0-7.6-1A3.5 3.5 0 0 0 3 12z' fill='#fff' />,
  rain: <><path d='M3 10h10a3 3 0 0 0 0-6 4 4 0 0 0-7.6-1A3.5 3.5 0 0 0 3 10z' fill='#fff' />{[5, 8, 11].map((x) => <rect key={x} x={x} y='12' width='1' height='3' fill='#00e5e5' />)}</>,
  snow: <><path d='M3 10h10a3 3 0 0 0 0-6 4 4 0 0 0-7.6-1A3.5 3.5 0 0 0 3 10z' fill='#fff' />{[5, 8, 11].map((x) => <rect key={x} x={x} y='12' width='2' height='2' fill='#fff' />)}</>,
  storm: <><path d='M3 10h10a3 3 0 0 0 0-6 4 4 0 0 0-7.6-1A3.5 3.5 0 0 0 3 10z' fill='#fff' /><path d='M8 10h3l-2 3h2l-4 3 1-3H6z' fill='#f4d000' /></>,
}

// WMO weather codes, as Open-Meteo returns them, folded into teevy's few glyphs
const glyphOf = (code) => code <= 1 ? 'sun' : code <= 48 ? 'cloud' : code >= 95 ? 'storm' : (code >= 71 && code <= 77) || code >= 85 ? 'snow' : 'rain'

export const Weather = ({ active }) => {
  const [forecast, setForecast] = useState(null)

  useEffect(() => {
    if (!active || forecast) {
      return
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${CITIES.map(([, lat]) => lat).join(',')}&longitude=${CITIES.map(([, , lon]) => lon).join(',')}&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max&timezone=Europe%2FParis&forecast_days=1`
    const controller = new AbortController()

    fetch(url, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(response.status))
      .then((data) => setForecast(data.map(({ daily }) => ({ code: daily.weather_code[0], low: Math.round(daily.temperature_2m_min[0]), high: Math.round(daily.temperature_2m_max[0]), wind: Math.round(daily.wind_speed_10m_max[0]) }))))
      .catch(() => {})

    return () => controller.abort()
  }, [active, forecast])

  return (
    <div className='teevy-prog teevy-prog--weather' aria-hidden='true'>
      <div className='teevy-prog__panel'>
        <p className='teevy-prog__panel-head'><span>Weather · Today</span><span>Open-Meteo</span></p>
        {CITIES.map(([city], index) => {
          const day = forecast?.[index]

          return (
            <p key={city} className='teevy-prog__forecast'>
              <span>{city}</span>
              <svg viewBox='0 0 16 16'>{day ? GLYPHS[glyphOf(day.code)] : null}</svg>
              <span className='teevy-prog__low'>{day ? `${day.low}°` : '··'}</span>
              <span className='teevy-prog__high'>{day ? `${day.high}°` : '··'}</span>
              <span className='teevy-prog__wind'>{day ? `${day.wind} km/h` : '··'}</span>
            </p>
          )
        })}
      </div>
    </div>
  )
}

export const Bars = () => (
  <div className='teevy-prog teevy-prog--bars' aria-hidden='true'>
    <div className='teevy-prog__smpte'>
      {['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf'].map((color) => <i key={color} style={{ backgroundColor: color }} />)}
    </div>
    <div className='teevy-prog__nosignal'>
      <span>AV 1</span>
      <b>No signal</b>
    </div>
  </div>
)
