import { useEffect, useRef, useState } from 'react'
import { ASSETS } from './cinetropes-game/assets'
import { CINEMAS } from './cinetropes-game/cinemas'
import { createHall, curtainFrame, npcFrame, pickupsOf, stepHall, stillNpc } from './cinetropes-game/hall'
import { Choices, Tags, usePrefersReducedMotion } from './shared'
import './cinetropes-game.css'

const SIZE = 192
const SWAP_MS = 700
const SWAP_CELL = 6
const MAX_PICKS = 2
const REEL_SPEED = 0.034
const REEL_IDLE_MS = 2500

// The rooms the game lets you walk through, each with the tiers its assets draw
const ROOMS = [
  { id: 'exterior', label: 'Outside', tiers: ['Boarded up', 'Lit'] },
  { id: 'hall', label: 'Lobby', tiers: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'] },
  { id: 'salle', label: 'Screen', tiers: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'] },
  { id: 'cabine', label: 'Booth', tiers: ['T1', 'T2', 'T3', 'T4', 'T5'] },
  { id: 'backoffice', label: 'Backoffice', tiers: ['T1'] },
]

// Where each room stands with no film, one film or two programmed: from abandoned to restored
const LEVELS = {
  exterior: [0, 1, 1],
  hall: [1, 3, 6],
  salle: [1, 3, 6],
  cabine: [1, 3, 5],
  backoffice: [1, 1, 1],
}
const DENSITY = [0, 2, 3]

// The game's crowd profiles: none while abandoned, then those of screen-room tiers 4 and 6
const CROWDS = [
  { cap: 0, spawnDelay: [0, 0], queueing: false },
  { cap: 8, spawnDelay: [1200, 2500], queueing: true },
  { cap: 20, spawnDelay: [350, 900], queueing: true },
]

// Desk and projector shown with each booth tier, the post-Awakening equipment first
const EQUIPMENT = { 2: 1, 3: 2, 4: 3, 5: 5 }
const WALL_SLOTS = [1, 3]

// What the staff says when the lobby reaches that tier, from the game
const QUOTES = [
  '',
  'The floor is fixed. We can finally walk without fear of falling!',
  'A golden chandelier to top it all. This lobby is perfect!',
]

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

const crowdShown = (world) => world.room === 'hall' && world.level > 0 && world.tier === LEVELS.hall[world.level]

const drawRoom = (ctx, world, now) => {
  const blit = (key) => {
    const img = image(key)
    img && ctx.drawImage(img, 0, 0)
  }
  const { cinema: c, tier } = world

  ctx.fillStyle = '#110806'
  ctx.fillRect(0, 0, SIZE, SIZE)

  if (world.room === 'exterior') {
    blit(tier ? `${c}-facade` : `${c}-facade-off`)
  } else if (world.room === 'salle') {
    const img = image(`salle-${tier}`)
    img && ctx.drawImage(img, 0, tier === 1 ? 0 : DENSITY[world.level] * SIZE, SIZE, SIZE, 0, 0, SIZE, SIZE)
  } else if (world.room === 'cabine') {
    blit(`${c}-cabin-${tier}`)

    if (tier > 1) {
      blit('cabin-map')
      blit(`desk-${EQUIPMENT[tier]}`)
      blit(`projector-${EQUIPMENT[tier]}`)
    }
  } else if (world.room === 'backoffice') {
    blit('backoffice')
  } else {
    blit(`${c}-hall-${tier}`)

    // An abandoned lobby has nothing left standing, as in the game
    if (tier > 1) {
      blit('posters')
      const walls = image(`${c}-walls`)
      world.picks.forEach((film, i) => walls && ctx.drawImage(walls, film * 20, 0, 20, 30, 45 + WALL_SLOTS[i] * 22, 51, 14, 22))
      blit('cashier')

      if (tier === 6) {
        blit('combo-5')
      } else {
        const equipment = tier < 4 ? 2 : 4
        blit('counter')
        blit(`tickets-${equipment}`)
        blit(`popcorn-${equipment}`)
      }
    }

    const crowd = crowdShown(world)

    for (const npc of crowd ? (world.reduced ? [stillNpc] : world.hall.npcs) : []) {
      const sheet = image(npc.sheet === 'in' ? 'npc-in' : 'npc-out')
      const frame = npcFrame(npc)
      sheet && ctx.drawImage(sheet, frame.sx, frame.sy, frame.w, frame.h, frame.x, frame.y, frame.w, frame.h)
    }

    const curtains = image('curtains')
    curtains && ctx.drawImage(curtains, (world.reduced ? 0 : curtainFrame(world.hall, now)) * SIZE, 0, SIZE, SIZE, 0, 0, SIZE, SIZE)

    if (crowd && !world.reduced) {
      for (const pickup of pickupsOf(world.hall, now)) {
        const icon = image(`icon-${pickup.icon}`)

        if (icon) {
          ctx.globalAlpha = pickup.alpha
          ctx.drawImage(icon, Math.round(pickup.x - 6), Math.round(pickup.y - 6))
          ctx.globalAlpha = 1
        }
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

const Scene = ({ world, swapRef, label }) => {
  const canvas = useRef(null)

  useEffect(() => {
    const ctx = canvas.current.getContext('2d')
    ctx.imageSmoothingEnabled = false
    let frame = 0

    // Keeps the room as it is now, so the next draw can break it away cell by cell
    swapRef.current = () => {
      drawRoom(ctx, world.current, performance.now())
      const copy = document.createElement('canvas')
      copy.width = SIZE
      copy.height = SIZE
      copy.getContext('2d').drawImage(canvas.current, 0, 0)
      world.current.swap = { canvas: copy, start: performance.now(), cells: shuffle((SIZE / SWAP_CELL) ** 2) }
    }

    const loop = (now) => {
      const state = world.current

      if (crowdShown(state) && !state.reduced) {
        stepHall(state.hall, now, state)
      }

      drawRoom(ctx, state, now)
      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [world, swapRef])

  return <canvas ref={canvas} className='cg__canvas' width={SIZE} height={SIZE} role='img' aria-label={label} />
}

const Poster = ({ cinema, index }) => (
  <span
    className='cg__poster'
    style={{ backgroundImage: `url(${ASSETS[`${cinema}-cards`]})`, backgroundPosition: `${(index / 3) * 100}% 0` }}
  />
)

const Visit = ({ cinema, reduced, onLeave }) => {
  const [picks, setPicks] = useState([])
  const [room, setRoom] = useState('hall')
  const [viewed, setViewed] = useState(null)
  const [focus, setFocus] = useState(null)
  const world = useRef(null)
  const swap = useRef(null)
  const heading = useRef(null)
  const touch = useRef(null)
  const level = picks.length
  const current = LEVELS[room][level]
  const tier = viewed ?? current
  const rooms = ROOMS.find((other) => other.id === room)

  world.current ??= { hall: createHall(), swap: null }
  Object.assign(world.current, {
    cinema: cinema.id,
    room,
    tier,
    level,
    picks,
    reduced,
    crowd: CROWDS[level],
    cashier: [2000, 3000],
    popcornShare: 0.17,
  })

  useEffect(() => heading.current?.focus({ preventScroll: true }), [])

  const change = (update) => {
    swap.current?.()
    update()
  }

  const toggle = (index) => {
    const next = picks.includes(index) ? picks.filter((pick) => pick !== index) : [...picks, index]

    if (next.length <= MAX_PICKS) {
      change(() => {
        setPicks(next)
        setViewed(null)
      })
    }
  }

  const tierOptions = rooms.tiers.map((label, index) => {
    const value = room === 'exterior' ? index : index + 1

    return {
      id: String(value),
      label: <>{label}{value === current && <span className='cg__now' aria-label=', current' />}</>,
    }
  })

  return (
    <div
      className='cg__visit'
      role='dialog'
      aria-modal='true'
      aria-labelledby='cg-visit'
      onKeyDown={(event) => event.key === 'Escape' && onLeave()}
      // The cinemas still show around the visit: a click on them goes back to the street
      onClick={(event) => event.target === event.currentTarget && onLeave()}
    >
      <div
        className='cg__stage'
        onTouchStart={(event) => { touch.current = event.touches[0] }}
        onTouchEnd={(event) => {
          const start = touch.current
          const end = event.changedTouches[0]
          touch.current = null

          if (start && end.clientY - start.clientY > 80 && Math.abs(end.clientX - start.clientX) < 60) {
            onLeave()
          }
        }}
      >
        <Scene world={world} swapRef={swap} label={`${cinema.name}, ${rooms.label.toLowerCase()}, ${rooms.tiers[room === 'exterior' ? tier : tier - 1]}`} />
        {tierOptions.length > 1 && (
          <Choices
            label='Condition'
            className='choices cg__hud cg__hud--top'
            value={String(tier)}
            onChange={(id) => change(() => setViewed(Number(id) === current ? null : Number(id)))}
            options={tierOptions}
          />
        )}
        <Choices
          label='Rooms'
          className='choices cg__hud cg__hud--bottom'
          value={room}
          onChange={(id) => change(() => {
            setRoom(id)
            setViewed(null)
          })}
          options={ROOMS}
        />
      </div>
      <section className='cg__box cg__panel'>
        <h4 id='cg-visit' ref={heading} tabIndex={-1} className='cg__heading'>{cinema.name}</h4>
        <p className='cg__text cg__dim'>{cinema.theme}</p>
        <p className='cg__text cg__gold'>“{cinema.line}”</p>
        <p className='cg__text'>Tonight: <mark>{cinema.mission}</mark>. Pick one or two films.</p>
        <ul className='cg__films'>
          {cinema.films.map((film, index) => {
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
                  <Poster cinema={cinema.id} index={index} />
                </button>
              </li>
            )
          })}
        </ul>
        <p className='cg__text cg__caption'>
          {focus === null ? ' ' : <>{cinema.films[focus].title} <span className='cg__dim'>{cinema.films[focus].year}</span></>}
        </p>
        <p className='cg__text cg__quote' aria-live='polite'>{QUOTES[level]}</p>
        <div className='cg__actions'>
          <button type='button' className='cg__button' onClick={onLeave}>Back to the street</button>
        </div>
      </section>
    </div>
  )
}

// A row of cinemas that drifts on its own, and that the hand can take over: drag, horizontal
// wheel or Shift+wheel, arrow keys. Vertical wheel is left to the page.
const Row = ({ kind, direction, near, paused, reduced, onVisit }) => {
  const row = useRef(null)
  const track = useRef(null)
  const reel = useRef({ offset: 0, idleUntil: 0, drag: null, moved: false, hover: false, focus: false })

  useEffect(() => {
    const element = row.current
    const state = reel.current
    let last = performance.now()
    let frame = 0

    const loop = (now) => {
      const half = track.current.scrollWidth / 2
      const auto = !reduced && !paused && !state.drag && !state.hover && !state.focus && now > state.idleUntil

      if (auto) {
        state.offset += direction * (now - last) * REEL_SPEED
      }

      if (half) {
        state.offset = ((state.offset % half) + half) % half
        track.current.style.transform = `translateX(${-state.offset}px)`
      }

      last = now
      frame = requestAnimationFrame(loop)
    }

    const onWheel = (event) => {
      const dx = event.shiftKey ? event.deltaX || event.deltaY : event.deltaX

      if (!event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
        return
      }

      event.preventDefault()
      state.offset += dx
      state.idleUntil = performance.now() + REEL_IDLE_MS
    }

    frame = requestAnimationFrame(loop)
    element.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener('wheel', onWheel)
    }
  }, [direction, paused, reduced])

  const state = reel.current

  const onPointerDown = (event) => {
    if (event.button === 0) {
      state.drag = { x: event.clientX, offset: state.offset, id: event.pointerId }
      state.moved = false
    }
  }

  const onPointerMove = (event) => {
    if (!state.drag || state.drag.id !== event.pointerId) {
      return
    }

    const dx = event.clientX - state.drag.x

    if (!state.moved && Math.abs(dx) > 6) {
      state.moved = true
      row.current.setPointerCapture(event.pointerId)
    }

    if (state.moved) {
      state.offset = state.drag.offset - dx
    }
  }

  const onPointerUp = () => {
    state.drag = null
    state.idleUntil = performance.now() + REEL_IDLE_MS
  }

  const onKeyDown = (event, index) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]

    if (!step) {
      return
    }

    event.preventDefault()
    const tiles = track.current.querySelectorAll('[data-copy="0"]')
    const next = tiles[(index + step + tiles.length) % tiles.length]
    next.focus({ preventScroll: true })
    state.offset = next.offsetLeft - (row.current.clientWidth - next.offsetWidth) / 2
    state.idleUntil = performance.now() + REEL_IDLE_MS
  }

  return (
    <div
      ref={row}
      className={`cg__row cg__row--${kind}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerEnter={(event) => { state.hover = event.pointerType === 'mouse' }}
      onPointerLeave={() => { state.hover = false }}
      // Only keyboard focus holds the row; a tile pressed by the pointer keeps focus but not the row
      onFocus={(event) => { state.focus = event.target.matches(':focus-visible') }}
      onBlur={() => { state.focus = false }}
      onClickCapture={(event) => {
        if (state.moved) {
          event.preventDefault()
          event.stopPropagation()
          state.moved = false
        }
      }}
    >
      <ul ref={track} className='cg__track'>
        {[0, 1].map((copy) => CINEMAS.map((cinema, index) => (
          <li key={`${copy}-${cinema.id}`} aria-hidden={copy ? 'true' : undefined}>
            <button
              type='button'
              className='cg__tile'
              data-copy={copy}
              tabIndex={copy || kind === 'lobby' ? -1 : undefined}
              onClick={(event) => onVisit(index, event.currentTarget)}
              onKeyDown={(event) => onKeyDown(event, index)}
              aria-label={`Visit ${cinema.name}`}
              draggable={false}
            >
              {near && <img src={ASSETS[`${cinema.id}-${kind}`]} width='192' height='192' alt='' loading='lazy' draggable={false} />}
            </button>
          </li>
        )))}
      </ul>
    </div>
  )
}

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

  const visiting = visit !== null

  return (
    <article ref={root} className={visiting ? 'band cg is-visiting' : 'band cg'} aria-labelledby='cinetropes-game'>
      <div className='cg__reel' inert={visiting ? '' : undefined}>
        <Row kind='facade' direction={1} near={near} paused={visiting} reduced={reduced} onVisit={enter} />
        <Row kind='lobby' direction={-1} near={near} paused={visiting} reduced={reduced} onVisit={enter} />
      </div>
      <div className='cg__box cg__intro' inert={visiting ? '' : undefined}>
        <h3 id='cinetropes-game' className='cg__title'>cinetropes meta-game</h3>
        <p className='cg__text'>
          An incremental pixel-art management game: you restore an abandoned cinema that changes with the films you log on cinetropes. Eighty cinemas, each with its own facade and lobby.
        </p>
        <p className='cg__text cg__gold'>Pick one and program its night.</p>
        <Tags items={['TypeScript', 'Phaser', 'React', 'Hono', 'Pixel art']} />
      </div>
      {visiting && near && <Visit key={visit} cinema={CINEMAS[visit]} reduced={reduced} onLeave={leave} />}
    </article>
  )
}
