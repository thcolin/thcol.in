import { useEffect, useState } from 'react'
import { Choices, Links, Tags, usePrefersReducedMotion } from './shared'

const FEATURES = [
  { id: 'library', label: 'Library', src: new URL('../assets/sensorr/movies-tv.webp', import.meta.url) },
  { id: 'seasons', label: 'Seasons', src: new URL('../assets/sensorr/seasons.webp', import.meta.url) },
  { id: 'policies', label: 'Policies', src: new URL('../assets/sensorr/policies.webp', import.meta.url) },
  { id: 'swaps', label: 'Swaps', src: new URL('../assets/sensorr/swaps.webp', import.meta.url) },
  { id: 'reports', label: 'Reports', src: new URL('../assets/sensorr/report.webp', import.meta.url) },
  { id: 'friends', label: 'Friends', src: new URL('../assets/sensorr/friends.webp', import.meta.url) },
]

const ROTATION = 5000

export const Sensorr = () => {
  const [feature, setFeature] = useState(FEATURES[0].id)
  // Each capture is an animated webp of about 150 KB: one loads when its tab is first chosen
  const [seen, setSeen] = useState([FEATURES[0].id])
  const show = (id) => {
    setFeature(id)
    setSeen((ids) => ids.includes(id) ? ids : [...ids, id])
  }
  // Tours the features until the visitor picks one
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!auto || paused || reduced) {
      return
    }

    const timer = setTimeout(() => show(FEATURES[(FEATURES.findIndex(({ id }) => id === feature) + 1) % FEATURES.length].id), ROTATION)
    return () => clearTimeout(timer)
  }, [auto, paused, reduced, feature])

  return (
    <article
      id='sensorr'
      className='band sensorr'
      aria-labelledby='sensorr-title'
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className='band__column band__split'>
        <div className='band__text'>
          <h3 id='sensorr-title' className='sensorr__title'>
            <span aria-hidden='true'>🍿📼 </span>sensorr
          </h3>
          <p className='sensorr__tagline'>Your Friendly Digital Video Recorder. Think VCR, but in modern times.</p>
          <p className='band__body'>
            Sensorr watches your Torznab indexers for the movies and shows you want, picks the best release by your rules, and hands it to your download client.
          </p>
          <Choices label='Feature' options={FEATURES} value={feature} onChange={(id) => { setAuto(false); show(id) }} className='choices choices--journey' />
          <Tags items={['TypeScript', 'React', 'Node.js', 'Nx', 'Docker']} />
          <Links links={[['Demo', 'https://thcolin.github.io/sensorr/'], ['GitHub', 'https://github.com/thcolin/sensorr']]} />
        </div>
        <div className='band__demo sensorr__stage'>
          {FEATURES.filter(({ id }) => seen.includes(id)).map(({ id, label, src }) => (
            <img
              key={id}
              src={src}
              alt={id === feature ? `Sensorr, ${label}` : ''}
              aria-hidden={id !== feature}
              loading='lazy'
              decoding='async'
              width='2000'
              height='1124'
              className={id === feature ? 'is-shown' : undefined}
            />
          ))}
        </div>
      </div>
    </article>
  )
}
