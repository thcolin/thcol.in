import { useEffect, useRef, useState } from 'react'
import cards from '../assets/cinetropes-tcg/cards.json'
import { Holo, Mark, useHolo } from './Cinetropes'
import { Anchor, Links, Tags, usePrefersReducedMotion } from './shared'
import './cinetropes-tcg.css'

// The app's Boosters page and its Marché cases, on one table: the same five cards, Common to Legendary, every time

const LOGO = new URL('../assets/cinetropes/logo.svg', import.meta.url)
const BACK = new URL('../assets/cinetropes-daily/card-back.svg', import.meta.url)

const POSTERS = {
  'venom-2018': new URL('../assets/cinetropes-tcg/poster-venom-2018.webp', import.meta.url),
  'thor': new URL('../assets/cinetropes-tcg/poster-thor.webp', import.meta.url),
  'top-gun': new URL('../assets/cinetropes-tcg/poster-top-gun.webp', import.meta.url),
  'midsommar-directors-cut': new URL('../assets/cinetropes-tcg/poster-midsommar-directors-cut.webp', import.meta.url),
  'spirited-away': new URL('../assets/cinetropes-tcg/poster-spirited-away.webp', import.meta.url),
}

const RARITIES = { common: 'Common', holo: 'Rare', rare: 'Epic', ultra: 'Mythic', secret: 'Legendary' }

// The app's timings: the deck rising out of the sachet, the flip, the flight into the case
const OPENING_MS = 750
const FLIP_MS = 600
const STOW_MS = 450

// Once the card has turned, the two highest tiers sweep under a virtual finger as long as their sound plays in the app
const CELEBRATION_PAUSE_MS = 250
const SWEEP_MS = { ultra: 1270, secret: 1230 }

const FAN = ['-5deg', '4deg', '-1.5deg', '3deg']

const touchesNeeded = () => 3 + Math.floor(Math.random() * 5)

// The whole sachet, drawn twice: once clipped to the top seal that flies off when it opens, once to the body
const PackLayer = ({ part }) => (
  <span className={`tcg-pack__layer tcg-pack__layer--${part}`} aria-hidden='true'>
    <span className='tcg-pack__art' />
    <span className='tcg-pack__sheen' />
    <span className='tcg-pack__band'><img src={LOGO} alt='' width='275' height='40' /></span>
    <span className='tcg-pack__banner'>5 films</span>
  </span>
)

const Pack = ({ opening, onHit, packRef }) => {
  const wrap = useRef(null)
  const [jolt, setJolt] = useState(0)
  const [crinkles, setCrinkles] = useState([])

  // Tilt and sheen follow the pointer, with the same ratios as the app's usePackTilt
  const point = (event) => {
    if (event.pointerType !== 'mouse' || opening) {
      return
    }

    const rect = wrap.current.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
    Object.entries({ '--px': `${x}%`, '--py': `${y}%`, '--rx': `${(-(x - 50) / 5).toFixed(2)}deg`, '--ry': `${((y - 50) / 5).toFixed(2)}deg`, '--hover': 1 })
      .forEach(([name, value]) => wrap.current.style.setProperty(name, value))
  }
  const release = () => ['--px', '--py', '--rx', '--ry', '--hover'].forEach((name) => wrap.current?.style.removeProperty(name))

  // Each touch crinkles the foil where it lands, the keyboard in the middle
  const hit = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX ? ((event.clientX - rect.left) / rect.width) * 100 : 50
    const y = event.clientY ? ((event.clientY - rect.top) / rect.height) * 100 : 50
    const start = Math.random() * 360
    const creases = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, (_, i) => ({
      angle: start + i * (360 / 5) + (Math.random() - 0.5) * 40,
      length: 30 + Math.random() * 60,
    }))
    setCrinkles((all) => [...all, { x, y, creases }])
    setJolt((value) => value > 0 ? -1 : 1)
    onHit()
  }

  return (
    <div ref={wrap} className={opening ? 'tcg-pack is-opening' : 'tcg-pack'} onPointerMove={point} onPointerLeave={release}>
      <span className='tcg-pack__stack' aria-hidden='true'>
        {FAN.map((fan, i) => <img key={i} className='tcg__back' src={BACK} alt='' style={{ '--fan': fan, '--depth': i + 1 }} />)}
        <img className='tcg__back' src={BACK} alt='' style={{ '--fan': '0deg', '--depth': 0 }} />
      </span>
      <button
        ref={packRef}
        type='button'
        className={jolt ? `tcg-pack__button is-jolt-${jolt > 0 ? 'a' : 'b'}` : 'tcg-pack__button'}
        disabled={opening}
        aria-label='Open the booster, keep tapping it until it gives way'
        onClick={hit}
      >
        <PackLayer part='body' />
        <PackLayer part='strip' />
        <span className='tcg-pack__crinkles' aria-hidden='true'>
          {crinkles.map((crinkle, i) => (
            <span key={i} className='tcg-pack__crinkle' style={{ left: `${crinkle.x}%`, top: `${crinkle.y}%` }}>
              {crinkle.creases.map((crease, j) => <span key={j} className='tcg-pack__crease' style={{ '--angle': `${crease.angle}deg`, '--length': `${crease.length}px` }} />)}
            </span>
          ))}
        </span>
      </button>
    </div>
  )
}

const Card = ({ card, index, flipped, stowing, still, cardRef, onTap }) => {
  const { ref, interact, rest } = useHolo(card.rarity, flipped && !stowing && !still)

  useEffect(() => {
    if (!flipped || still || !SWEEP_MS[card.rarity]) {
      return
    }

    let frame = 0
    let start = 0
    const sweep = (now) => {
      start ||= now
      const t = Math.min(1, (now - start) / SWEEP_MS[card.rarity])
      const rect = ref.current?.getBoundingClientRect()

      if (rect) {
        interact({ clientX: rect.left + rect.width * (0.15 + 0.7 * t), clientY: rect.top + rect.height * (0.2 + 0.6 * Math.sin(t * Math.PI)) })
      }

      frame = t < 1 ? requestAnimationFrame(sweep) : (rest(), 0)
    }
    const timer = setTimeout(() => { frame = requestAnimationFrame(sweep) }, FLIP_MS + CELEBRATION_PAUSE_MS)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [flipped, still, card.rarity])

  const keyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onTap()
    }
  }

  return (
    <div
      ref={cardRef}
      className={['tcg__card', flipped && 'is-flipped', stowing && 'is-stowing'].filter(Boolean).join(' ')}
      style={stowing ? { '--stow-x': `${stowing.x}px`, '--stow-y': `${stowing.y}px`, '--stow-scale': stowing.scale } : undefined}
      role='button'
      tabIndex={0}
      aria-label={flipped ? `${card.title}, ${RARITIES[card.rarity]}, card ${index + 1} of ${cards.length}, put away` : `Card ${index + 1} of ${cards.length}, flip`}
      onClick={onTap}
      onKeyDown={keyDown}
    >
      <span className='tcg__flip'>
        <img className='tcg__back' src={BACK} alt='' />
        <span ref={ref} className='tcg__face cinetropes__card' data-rarity={card.rarity} onPointerMove={interact} onPointerLeave={rest}>
          <Holo src={POSTERS[card.slug]} />
        </span>
      </span>
    </div>
  )
}

export const CinetropesTcg = () => {
  const reduced = usePrefersReducedMotion()
  const [phase, setPhase] = useState('sealed')
  const [pack, setPack] = useState(0)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stowing, setStowing] = useState(null)
  const [stowed, setStowed] = useState(0)
  const [touched, setTouched] = useState(false)
  const hits = useRef(0)
  const needed = useRef(touchesNeeded())
  const packRef = useRef(null)
  const cardRef = useRef(null)
  const strip = useRef(null)
  const slots = useRef([])
  const timer = useRef(null)
  const driven = useRef(false)
  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    if (driven.current) {
      (phase === 'revealing' ? cardRef : packRef).current?.focus({ preventScroll: true })
    }
  }, [phase, index, pack])

  const later = (ms, then) => {
    timer.current = setTimeout(then, reduced ? 0 : ms)
  }

  const hit = () => {
    driven.current = true
    setTouched(true)
    hits.current += 1

    if (hits.current < needed.current) {
      return
    }

    setPhase('opening')
    setStowed(0)
    later(OPENING_MS, () => {
      setIndex(0)
      setFlipped(false)
      setPhase('revealing')
    })
  }

  // On a phone the cases scroll sideways: the one that will take the card comes into view while it turns
  const reach = (at) => {
    const list = strip.current
    const item = slots.current[at]?.closest('li')

    if (list && item && list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2, behavior: reduced ? 'instant' : 'smooth' })
    }
  }

  const tap = () => {
    if (stowing) {
      return
    }

    if (!flipped) {
      setFlipped(true)
      reach(index)
      return
    }

    const from = cardRef.current.getBoundingClientRect()
    const to = slots.current[index].getBoundingClientRect()
    setStowing({ x: to.left - from.left, y: to.top - from.top, scale: to.width / from.width })
    later(STOW_MS, () => {
      setStowing(null)
      setFlipped(false)
      setStowed(index + 1)

      if (index + 1 < cards.length) {
        setIndex(index + 1)
        return
      }

      hits.current = 0
      needed.current = touchesNeeded()
      setTouched(false)
      setPack((count) => count + 1)
      setPhase('sealed')
    })
  }

  const card = cards[index]
  const hint = phase === 'revealing'
    ? (flipped ? 'Tap the card for the next one' : 'Tap the card to flip it')
    : phase === 'opening' ? 'Opening…' : touched ? 'Again…' : 'Tap the booster until it gives way'

  return (
    <article className='band tcg' aria-labelledby='cinetropes-tcg-title'>
      <div className='tcg__table'>
        <div className='tcg__side'>
          <h3 id='cinetropes-tcg-title' className='tcg__title'>
            <Anchor id='cinetropes-tcg'>
              <img src={LOGO} alt='cinetropes' width='275' height='40' />
              <Mark of='tcg' />
            </Anchor>
          </h3>
          <p className='tcg__lead'>Open your boosters</p>

          <div className='tcg__stage'>
            {phase === 'revealing' ? (
              <div className='tcg__deck'>
                {FAN.slice(0, cards.length - index - 1).map((fan, i) => <img key={i} className='tcg__back' src={BACK} alt='' style={{ '--fan': fan, '--depth': i + 1 }} />)}
                <Card key={index} card={card} index={index} flipped={flipped} stowing={stowing} still={reduced} cardRef={cardRef} onTap={tap} />
              </div>
            ) : (
              <Pack key={pack} opening={phase === 'opening'} onHit={hit} packRef={packRef} />
            )}
          </div>

          <p className='tcg__hint' aria-live='polite'>
            {phase === 'revealing' && flipped && <span className={`tcg__rarity tcg__rarity--${card.rarity}`}>{RARITIES[card.rarity]} </span>}
            {hint}
          </p>
        </div>

        <ul ref={strip} className='tcg__cases' aria-label='Cases'>
          {cards.map((item, i) => (
            <li key={item.id} className='tcg__case'>
              <p className={`tcg__rarity tcg__rarity--${item.rarity}`}>{RARITIES[item.rarity]}</p>
              <div className='tcg__glass'>
                <div ref={(node) => { slots.current[i] = node }} className='tcg__slot'>
                  {i < stowed && <div className='cinetropes__card tcg__stowed' data-rarity={item.rarity}><Holo src={POSTERS[item.slug]} /></div>}
                </div>
              </div>
              <p className='tcg__film'>{i < stowed ? item.title : ''}</p>
            </li>
          ))}
        </ul>

        <div className='tcg__text'>
          <p className='band__body'>
            Five films per pack, a new pack every 20 minutes, from Common to Legendary. Collect them, sell them at auction on the Market, take them into the Arena.
          </p>
          <Tags items={['TypeScript', 'React', 'Hono', 'Drizzle', 'PostgreSQL']} />
          <Links links={[['Play', 'https://tcg.cinetropes.com']]} />
        </div>
      </div>
    </article>
  )
}
