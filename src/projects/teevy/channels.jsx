import { useEffect, useRef, useState } from 'react'
import { clock } from './osd'

// What teevy would be showing: Blender's open movies (CC BY), TRIPLEGO's Dreamin, FIP Cultes live,
// today's real forecast from Open-Meteo, and the AV input left empty

export const TRACK = {
  artist: 'TRIPLEGO',
  title: 'Dreamin',
  album: '33',
  year: 2025,
  number: 1,
  tracks: 11,
  length: 198,
  cover: new URL('../../assets/teevy/channels/triplego-33.webp', import.meta.url),
  // The cover is a teal haze with orange hands: the aurora takes those two
  colors: ['#ff5a3c', '#5aa6a0'],
  // The track's official audio on YouTube (TRIPLEGO - Topic), embedded without cookies
  video: 'KqNBGHAXz24',
}

export const STREAM = 'https://icecast.radiofrance.fr/fipcultes-hifi.aac'

const YOUTUBE = 'https://www.youtube-nocookie.com'

export const Film = ({ still }) => (
  <div className='teevy-prog teevy-prog--film' aria-hidden='true'>
    <img className='teevy-prog__still' src={still} alt='' width='1280' height='720' loading='lazy' />
  </div>
)

export const Aurora = ({ running, still, colors, level = null }) => {
  const host = useRef(null)

  useEffect(() => {
    if (!running) {
      return
    }

    let dispose = null
    let cancelled = false

    import('./aurora').then(({ mountAurora }) => {
      if (!cancelled && host.current) {
        dispose = mountAurora(host.current, { colors, still, level })
      }
    })

    return () => {
      cancelled = true
      dispose?.()
    }
  }, [running, still, level])

  return <div ref={host} className='teevy-aurora' aria-hidden='true' />
}

// YouTube's iframe speaks postMessage: no API script to load, the frame reports its own clock
const useYouTube = (frame, { sound, onTime }) => {
  const report = useRef(onTime)
  report.current = onTime

  const send = (message) => frame.current?.contentWindow?.postMessage(JSON.stringify(message), YOUTUBE)
  const command = (func, args = []) => send({ event: 'command', func, args })

  useEffect(() => {
    const listen = (event) => {
      if (event.origin !== YOUTUBE || event.source !== frame.current?.contentWindow) {
        return
      }

      try {
        const info = JSON.parse(event.data)?.info

        if (info && typeof info.currentTime === 'number') {
          report.current({ position: info.currentTime, length: info.duration || TRACK.length })
        }
      } catch {}
    }

    window.addEventListener('message', listen)
    return () => window.removeEventListener('message', listen)
  }, [frame])

  useEffect(() => {
    if (sound) {
      command('unMute')
      command('setVolume', [80])
    } else {
      command('mute')
    }
  }, [sound])

  // The frame only starts reporting once told someone listens; say it a few times while it boots
  return () => {
    for (const delay of [0, 600, 1500, 3000]) {
      setTimeout(() => {
        send({ event: 'listening', id: 'teevy', channel: 'widget' })
        command(sound ? 'unMute' : 'mute')
      }, delay)
    }
  }
}

const Explicit = () => <abbr className='teevy-explicit' title='Explicit'>E</abbr>

export const Spotify = ({ view, running, reduced, sound, onTime, position }) => {
  const frame = useRef(null)
  const loaded = useYouTube(frame, { sound, onTime })
  const src = `${YOUTUBE}/embed/${TRACK.video}?autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=${TRACK.video}&playsinline=1&rel=0&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`

  return (
    <div className='teevy-prog teevy-prog--spotify'>
      {running && (
        <iframe
          ref={frame}
          className='teevy-prog__youtube'
          src={src}
          title={`${TRACK.artist}, ${TRACK.title}, on YouTube`}
          allow='autoplay; encrypted-media'
          referrerPolicy='strict-origin-when-cross-origin'
          tabIndex={-1}
          onLoad={loaded}
        />
      )}
      {view === 'aurora'
        ? <Aurora running={running} still={reduced} colors={TRACK.colors} />
        : (
          <>
            <div className='teevy-prog__blur' style={{ backgroundImage: `url(${TRACK.cover})` }} aria-hidden='true' />
            <img className='teevy-prog__cover' src={TRACK.cover} alt='' width='600' height='600' loading='lazy' />
          </>
          )}
      <div className='teevy-credit' aria-hidden='true'>
        <span className='teevy-credit__kicker'><i className='teevy-credit__dot' />Spotify</span>
        <span className='teevy-credit__artist'>{TRACK.artist}</span>
        <span className='teevy-credit__title'>{TRACK.title}</span>
        <span className='teevy-credit__meta'><Explicit /> {TRACK.album} · {TRACK.year} · {String(TRACK.number).padStart(2, '0')}/{TRACK.tracks}</span>
      </div>
      <p className='teevy-prog__view' aria-hidden='true'>{view === 'aurora' ? 'Aurora' : 'Cover'} · {clock(position)}</p>
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

// teevy's radio view without a now playing: the aurora on the stream, the station's bug, the credit
export const Radio = ({ sound, onToggle, running, reduced, level }) => (
  <div className='teevy-prog teevy-prog--radio'>
    <Aurora running={running} still={reduced} colors={['#e2007a', '#ff9a3c']} level={level} />
    <p className='teevy-radio-bug' aria-hidden='true'>FIP Cultes</p>
    <button type='button' className='teevy-mute' onClick={onToggle} aria-pressed={sound} aria-label={sound ? 'Mute FIP Cultes' : 'Listen to FIP Cultes, live'}>
      <SpeakerIcon off={!sound} />
      <span>{sound ? 'On air' : 'Sound off'}</span>
    </button>
    <div className='teevy-credit teevy-credit--radio' aria-hidden='true'>
      <span className='teevy-credit__kicker'><i className='teevy-credit__dot' />Live</span>
      <span className='teevy-credit__artist'>FIP Cultes</span>
      <span className='teevy-credit__meta'>Radio France · live stream</span>
    </div>
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
