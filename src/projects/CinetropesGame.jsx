import { useEffect, useRef, useState } from 'react'
import { ASSETS } from './cinetropes-game/assets'
import { CINEMAS } from './cinetropes-game/cinemas'
import { createHall, curtainFrame, npcFrame, pickupsOf, stepHall, stillNpc } from './cinetropes-game/hall'
import { Tags, usePrefersReducedMotion } from './shared'
import './cinetropes-game.css'

const SIZE = 192
const SWAP_MS = 700
const SWAP_CELL = 6

// Four films of the beta's programs, with the game's own pixel posters
const FILMS = [
  { title: 'Unforgiven', year: 1992 },
  { title: 'Scream', year: 1996 },
  { title: 'Shutter Island', year: 2010 },
  { title: 'WALL·E', year: 2008 },
]
const MAX_PICKS = 2

// Each film programmed restores the lobby by two tiers and brings the crowd of a bigger room,
// the game's crowd profiles for screen-room tiers 2, 4 and 6
const TIERS = [2, 4, 6]
const CROWDS = [
  { cap: 2, spawnDelay: [3500, 6500], queueing: false },
  { cap: 8, spawnDelay: [1200, 2500], queueing: true },
  { cap: 20, spawnDelay: [350, 900], queueing: true },
]
const WALL_SLOTS = [1, 3]

// What the popcorn seller says when the lobby reaches that tier, from the game
const QUOTES = {
  4: 'Finally a bulb that works. For what it cost, it had better last!',
  6: 'A golden chandelier to top it all. This lobby is perfect!',
}

const images = new Map()
const image = (key) => {
  let img = images.get(key)

  if (!img) {
    img = new Image()
    img.decoding = 'async'
    img.src = ASSETS[key]
    images.set(key, img)
  }

  return img.complete && img.naturalWidth ? img : null
}

const useNear = (ref) => {
  const [near, setNear] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (!element || typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), { rootMargin: '600px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return near
}

const shuffle = (length) => {
  const cells = Array.from({ length }, (_, i) => i)

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }

  return cells
}

const drawHall = (ctx, world, now) => {
  const blit = (key) => {
    const img = image(key)
    img && ctx.drawImage(img, 0, 0)
  }

  ctx.fillStyle = '#110806'
  ctx.fillRect(0, 0, SIZE, SIZE)
  blit(`${world.cinema}-hall-${TIERS[world.level]}`)
  blit('posters')

  const walls = image('films-walls')
  world.picks.forEach((film, i) => walls && ctx.drawImage(walls, film * 20, 0, 20, 30, 45 + WALL_SLOTS[i] * 22, 51, 14, 22))

  blit('cashier')
  blit('counter')
  blit('tickets-2')
  blit('popcorn-2')

  for (const npc of world.reduced ? [stillNpc] : world.hall.npcs) {
    const sheet = image(npc.sheet === 'in' ? 'npc-in' : 'npc-out')
    const frame = npcFrame(npc)
    sheet && ctx.drawImage(sheet, frame.sx, frame.sy, frame.w, frame.h, frame.x, frame.y, frame.w, frame.h)
  }

  const curtains = image('curtains')
  curtains && ctx.drawImage(curtains, (world.reduced ? 0 : curtainFrame(world.hall, now)) * SIZE, 0, SIZE, SIZE, 0, 0, SIZE, SIZE)

  if (!world.reduced) {
    for (const pickup of pickupsOf(world.hall, now)) {
      const icon = image(`icon-${pickup.icon}`)

      if (icon) {
        ctx.globalAlpha = pickup.alpha
        ctx.drawImage(icon, Math.round(pickup.x - 6), Math.round(pickup.y - 6))
        ctx.globalAlpha = 1
      }
    }
  }

  // The game's pixel swap: the old picture breaks into cells that fall away at random
  const swap = world.swap

  if (swap) {
    const progress = (now - swap.start) / SWAP_MS

    if (progress >= 1 || world.reduced) {
      world.swap = null
    } else {
      const side = SIZE / SWAP_CELL

      for (let i = Math.floor(progress * swap.cells.length); i < swap.cells.length; i++) {
        const x = (swap.cells[i] % side) * SWAP_CELL
        const y = Math.floor(swap.cells[i] / side) * SWAP_CELL
        ctx.drawImage(swap.canvas, x, y, SWAP_CELL, SWAP_CELL, x, y, SWAP_CELL, SWAP_CELL)
      }
    }
  }
}

const Hall = ({ world, swapRef, label }) => {
  const canvas = useRef(null)

  useEffect(() => {
    const ctx = canvas.current.getContext('2d')
    ctx.imageSmoothingEnabled = false
    let frame = 0

    // Keeps the lobby as it is now, so the next draw can break it away cell by cell
    swapRef.current = () => {
      drawHall(ctx, world.current, performance.now())
      const copy = document.createElement('canvas')
      copy.width = SIZE
      copy.height = SIZE
      copy.getContext('2d').drawImage(canvas.current, 0, 0)
      world.current.swap = { canvas: copy, start: performance.now(), cells: shuffle((SIZE / SWAP_CELL) ** 2) }
    }

    const loop = (now) => {
      const state = world.current

      if (!state.reduced) {
        stepHall(state.hall, now, state)
      }

      drawHall(ctx, state, now)
      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [world, swapRef])

  return <canvas ref={canvas} className='cg__canvas' width={SIZE} height={SIZE} role='img' aria-label={label} />
}

const Poster = ({ index, className = '' }) => (
  <span
    className={`cg__poster ${className}`}
    style={{ backgroundImage: `url(${ASSETS['films-cards']})`, backgroundPosition: `${(index / 3) * 100}% 0` }}
  />
)

const Visit = ({ cinema, reduced, onLeave }) => {
  const [picks, setPicks] = useState([])
  const [focus, setFocus] = useState(null)
  const world = useRef(null)
  const swap = useRef(null)
  const heading = useRef(null)
  const level = picks.length

  world.current ??= { hall: createHall(), swap: null }
  Object.assign(world.current, {
    cinema: cinema.id,
    level,
    picks,
    reduced,
    crowd: CROWDS[level],
    cashier: [2000, 3000],
    popcornShare: 0.17,
  })

  useEffect(() => heading.current?.focus({ preventScroll: true }), [])
  const swipe = useRef(null)

  const toggle = (index) => {
    const next = picks.includes(index) ? picks.filter((pick) => pick !== index) : [...picks, index]

    if (next.length > MAX_PICKS) {
      return
    }

    swap.current?.()
    setPicks(next)
  }

  return (
    <div
      className='cg__visit'
      role='dialog'
      aria-modal='true'
      aria-labelledby='cg-visit'
      onKeyDown={(event) => event.key === 'Escape' && onLeave()}
      // The cinemas still show around the lobby: a click on them goes back to the street
      onClick={(event) => event.target === event.currentTarget && onLeave()}
      onTouchStart={(event) => { swipe.current = event.touches[0] }}
      onTouchEnd={(event) => {
        const start = swipe.current
        const end = event.changedTouches[0]
        swipe.current = null

        if (start && end.clientY - start.clientY > 80 && Math.abs(end.clientX - start.clientX) < 60) {
          onLeave()
        }
      }}
    >
      <div className='cg__stage'>
        <Hall world={world} swapRef={swap} label={`${cinema.name}, lobby tier ${TIERS[level]}`} />
        <button type='button' className='cg__exit' onClick={onLeave} aria-label='Back to the cinemas'>
          <img src={ASSETS['arrow-down']} width='32' height='32' alt='' />
        </button>
      </div>
      <section className='cg__box cg__panel'>
        <h4 id='cg-visit' ref={heading} tabIndex={-1} className='cg__heading'>{cinema.name}</h4>
        <p className='cg__text cg__dim'>{cinema.theme}</p>
        <p className='cg__text cg__gold'>“{cinema.line}”</p>
        <p className='cg__text'>Program tonight: pick one or two films.</p>
        <ul className='cg__films'>
          {FILMS.map((film, index) => {
            const picked = picks.includes(index)
            const blocked = !picked && picks.length >= MAX_PICKS

            return (
              <li key={film.title}>
                <button
                  type='button'
                  className='cg__film'
                  aria-pressed={picked}
                  aria-disabled={blocked}
                  aria-label={`${film.title}, ${film.year}`}
                  onClick={() => !blocked && toggle(index)}
                  onFocus={() => setFocus(index)}
                  onMouseEnter={() => setFocus(index)}
                >
                  <Poster index={index} />
                </button>
              </li>
            )
          })}
        </ul>
        <p className='cg__text cg__caption'>
          {focus === null ? '\u00a0' : <>{FILMS[focus].title} <span className='cg__dim'>{FILMS[focus].year}</span></>}
        </p>
        <p className='cg__text cg__quote' aria-live='polite'>{QUOTES[TIERS[level]] ?? ''}</p>
        <div className='cg__actions'>
          <button type='button' className='cg__button' onClick={onLeave}>Back to the street</button>
        </div>
      </section>
    </div>
  )
}

const Row = ({ kind, near, onVisit }) => (
  <div className={`cg__row cg__row--${kind}`}>
    <ul className='cg__track'>
      {[0, 1].map((copy) => CINEMAS.map((cinema, index) => (
        <li key={`${copy}-${cinema.id}`} aria-hidden={copy ? 'true' : undefined}>
          <button
            type='button'
            className='cg__tile'
            tabIndex={copy || kind === 'lobby' ? -1 : undefined}
            onClick={(event) => onVisit(index, event.currentTarget)}
            aria-label={`Visit ${cinema.name}`}
          >
            {near && <img src={ASSETS[`${cinema.id}-${kind}`]} width='192' height='192' alt='' loading='lazy' />}
          </button>
        </li>
      )))}
    </ul>
  </div>
)

export const CinetropesGame = () => {
  const reduced = usePrefersReducedMotion()
  const root = useRef(null)
  const near = useNear(root)
  const [visit, setVisit] = useState(null)
  const from = useRef(null)

  const enter = (index, tile) => {
    from.current = tile
    setVisit(index)
  }

  // Back to the street, focus on the cinema the visit started from
  const leave = () => {
    setVisit(null)
    requestAnimationFrame(() => from.current?.focus({ preventScroll: true }))
  }

  return (
    <article ref={root} className={visit === null ? 'band cg' : 'band cg is-visiting'} aria-labelledby='cinetropes-game'>
      <div className='cg__reel' inert={visit !== null ? '' : undefined}>
        <Row kind='facade' near={near} onVisit={enter} />
        <Row kind='lobby' near={near} onVisit={enter} />
      </div>
      <div className='cg__box cg__intro' inert={visit !== null ? '' : undefined}>
        <h3 id='cinetropes-game' className='cg__title'>cinetropes meta-game</h3>
        <p className='cg__text'>
          An incremental pixel-art management game: you restore an abandoned cinema that changes with the films you log on cinetropes. Eighty cinemas, each with its own facade and lobby.
        </p>
        <p className='cg__text cg__gold'>Pick one and program its night.</p>
        <Tags items={['TypeScript', 'Phaser', 'React', 'Hono', 'Pixel art']} />
      </div>
      {visit !== null && near && <Visit key={visit} cinema={CINEMAS[visit]} reduced={reduced} onLeave={leave} />}
    </article>
  )
}
