import { useEffect, useRef, useState } from 'react'
import { ASSETS } from './cinetropes-game/assets'
import { CINEMAS } from './cinetropes-game/cinemas'
import { createHall, curtainFrame, npcFrame, pickupsOf, stepHall, stillNpc } from './cinetropes-game/hall'
import { Anchor, Choices, Tags, stepOf, usePrefersReducedMotion, useScrub } from './shared'
import './cinetropes-game.css'

const SIZE = 192
const SWAP_MS = 700
const SWAP_CELL = 6

// The demo is the game itself, served by the beta and embedded with the cinema's facade
const GAME_URL = process.env.CINETROPES_URL || 'https://beta.cinetropes.com'
const GAME_ORIGIN = new URL(GAME_URL).origin
const SAVE_KEY = 'cinetropes-meta-game'

// What the screen shows before a game: the cinema from boarded up to restored, room by room
const SLIDES = [
  { room: 'exterior', tier: 0, level: 0, label: 'Outside, boarded up' },
  { room: 'exterior', tier: 1, level: 1, label: 'Outside, lit' },
  { room: 'hall', tier: 1, level: 0, label: 'Lobby, abandoned' },
  { room: 'hall', tier: 3, level: 1, label: 'Lobby, repaired' },
  { room: 'hall', tier: 6, level: 2, label: 'Lobby, restored' },
  { room: 'salle', tier: 1, level: 0, label: 'Screen, torn' },
  { room: 'salle', tier: 3, level: 1, label: 'Screen, repaired' },
  { room: 'salle', tier: 6, level: 2, label: 'Screen, restored' },
  { room: 'cabine', tier: 1, level: 0, label: 'Booth, abandoned' },
  { room: 'cabine', tier: 3, level: 1, label: 'Booth, repaired' },
  { room: 'cabine', tier: 5, level: 2, label: 'Booth, restored' },
]

const ROOMS = [
  { id: 'exterior', label: 'Outside' },
  { id: 'hall', label: 'Lobby' },
  { id: 'salle', label: 'Screen' },
  { id: 'cabine', label: 'Booth' },
]

// The tier the lobby stands at for each level, and the crowd it draws: from the game's
// screen-room tiers 4 and 6
const HALL_LEVELS = [1, 3, 6]
const DENSITY = [0, 2, 3]
const CROWDS = [
  { cap: 0, spawnDelay: [0, 0], queueing: false },
  { cap: 8, spawnDelay: [1200, 2500], queueing: true },
  { cap: 20, spawnDelay: [350, 900], queueing: true },
]

// Desk and projector shown with each booth tier, the post-Awakening equipment first
const EQUIPMENT = { 2: 1, 3: 2, 4: 3, 5: 5 }

// The console's buttons, and the key each one plays in the game
const PAD = [
  { id: 'up', key: 'ArrowUp', label: 'Up' },
  { id: 'left', key: 'ArrowLeft', label: 'Left' },
  { id: 'right', key: 'ArrowRight', label: 'Right' },
  { id: 'down', key: 'ArrowDown', label: 'Down' },
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

const readSave = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY))?.scene ?? null
  } catch {
    return null
  }
}

const writeSave = (scene) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ scene }))
  } catch {
    // Without storage the game still plays, it just won't offer to continue
  }
}

// Visible: drawn and playing; near: its images may load
const useViewport = (ref) => {
  const [state, setState] = useState({ near: false, visible: false })

  useEffect(() => {
    const element = ref.current

    if (!element || typeof IntersectionObserver === 'undefined') {
      setState({ near: true, visible: true })
      return
    }

    const near = new IntersectionObserver(([entry]) => entry.isIntersecting && setState((s) => ({ ...s, near: true })), { rootMargin: '600px 0px' })
    const visible = new IntersectionObserver(([entry]) => setState((s) => ({ ...s, visible: entry.isIntersecting })))
    near.observe(element)
    visible.observe(element)

    return () => {
      near.disconnect()
      visible.disconnect()
    }
  }, [ref])

  return state
}

const shuffle = (length) => {
  const cells = Array.from({ length }, (_, i) => i)

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }

  return cells
}

const crowdShown = (world) => world.room === 'hall' && world.level > 0

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
  } else {
    blit(`${c}-hall-${tier}`)

    // An abandoned lobby has nothing left standing, as in the game
    if (tier > 1) {
      blit('posters')
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

// The rooms, drawn as the game draws them; a change of slide breaks the old one into pixels
const Slides = ({ cinema, slide, running, reduced, label }) => {
  const canvas = useRef(null)
  const world = useRef(null)
  const shown = useRef(null)
  const { room, tier, level } = SLIDES[slide]

  world.current ??= { hall: createHall(), swap: null }
  Object.assign(world.current, {
    cinema,
    room,
    tier,
    level,
    reduced,
    picks: [],
    crowd: CROWDS[level],
    cashier: [2000, 3000],
    popcornShare: 0.17,
  })

  useEffect(() => {
    const ctx = canvas.current.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const key = `${cinema}-${slide}`

    // Keeps the room as it was, so the next draw can break it away cell by cell
    if (shown.current && shown.current !== key && !reduced) {
      const copy = document.createElement('canvas')
      copy.width = SIZE
      copy.height = SIZE
      copy.getContext('2d').drawImage(canvas.current, 0, 0)
      world.current.swap = { canvas: copy, start: performance.now(), cells: shuffle((SIZE / SWAP_CELL) ** 2) }
    }

    shown.current = key
  }, [cinema, slide, reduced])

  useEffect(() => {
    const ctx = canvas.current.getContext('2d')
    ctx.imageSmoothingEnabled = false
    let frame = 0

    const loop = (now) => {
      const state = world.current

      if (crowdShown(state) && !state.reduced) {
        stepHall(state.hall, now, state)
      }

      drawRoom(ctx, state, now)
      frame = requestAnimationFrame(loop)
    }

    if (running) {
      frame = requestAnimationFrame(loop)
    } else {
      drawRoom(ctx, world.current, performance.now())
    }

    return () => cancelAnimationFrame(frame)
  }, [running])

  return <canvas ref={canvas} className='cg__canvas' width={SIZE} height={SIZE} role='img' aria-label={label} />
}

// A Game Boy Color, each cinema in its own colour: the game shows in its screen, and
// its buttons are live. The cross is held like a key; A, B and the pills are tapped.
const Console = ({ color, children, playing, onPad, onTap, onStart }) => (
  <div className='cg__console' data-scrub-demo>
    <img className='cg__shell' src={ASSETS[`gbc-${color}`]} width='1000' height='1675' alt='' draggable={false} />
    <span className='cg__led' data-on={playing || undefined} aria-hidden='true' />
    <div className='cg__screen'>{children}</div>
    <div className='cg__pad' role='group' aria-label='Direction pad'>
      {PAD.map((button) => (
        <button
          key={button.id}
          type='button'
          className={`cg__key cg__key--${button.id}`}
          aria-label={button.label}
          onPointerDown={() => onPad(button.key, true)}
          onPointerUp={() => onPad(button.key, false)}
          onPointerLeave={(event) => event.buttons && onPad(button.key, false)}
          onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && !event.repeat && onPad(button.key, true)}
          onKeyUp={(event) => (event.key === 'Enter' || event.key === ' ') && onPad(button.key, false)}
        />
      ))}
    </div>
    <button type='button' className='cg__round cg__round--b' aria-label='B: back' onClick={() => onTap('Escape')} disabled={!playing} />
    <button type='button' className='cg__round cg__round--a' aria-label={playing ? 'A: confirm' : 'A: start the game'} onClick={playing ? () => onTap('Enter') : onStart} />
    <button type='button' className='cg__pill cg__pill--select' aria-label='Select: next room' onClick={() => onTap('ArrowRight')} disabled={playing} />
    <button type='button' className='cg__pill cg__pill--start' aria-label={playing ? 'Start: back to the game' : 'Start the game'} onClick={onStart} />
  </div>
)

export const CinetropesGame = () => {
  const reduced = usePrefersReducedMotion()
  const root = useRef(null)
  const frame = useRef(null)
  const { near, visible } = useViewport(root)
  const [saved, setSaved] = useState(readSave)
  const [index, setIndex] = useState(() => Math.max(0, CINEMAS.findIndex((cinema) => cinema.scene === readSave())))
  const [slide, setSlide] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const cinema = CINEMAS[index]
  const savedCinema = CINEMAS.find((other) => other.scene === saved)
  const hasGame = saved === cinema.scene

  // At rest the scroll walks through the four rooms, until the reader picks one
  const [scrub, hold] = useScrub((progress) => {
    if (!playing) {
      const room = ROOMS[stepOf(progress, ROOMS.length)].id
      setSlide(SLIDES.findIndex((other) => other.room === room))
    }
  })

  // Out of view, the game unloads; it continues from its own save when started again
  useEffect(() => {
    if (!visible) {
      setPlaying(false)
    }
  }, [visible])

  const send = (message) => frame.current?.contentWindow?.postMessage(message, GAME_ORIGIN)

  const start = () => {
    writeSave(cinema.scene)
    setSaved(cinema.scene)
    setConfirm(null)
    setPlaying(true)
  }

  const restart = () => send({ type: 'cinetropes:reset' })

  const choose = (id) => {
    const next = CINEMAS.findIndex((other) => other.id === id)
    hold()

    // Another cinema while a game is under way: say so before the game is given up
    if (saved && CINEMAS[next].scene !== saved) {
      setConfirm(next)
    } else {
      setConfirm(null)
    }

    setPlaying(false)
    setIndex(next)
    setSlide(0)
  }

  const pad = (key, pressed) => {
    if (playing) {
      send({ type: 'cinetropes:key', key, pressed })
      return
    }

    if (pressed) {
      hold()
    }

    if (pressed && (key === 'ArrowRight' || key === 'ArrowDown')) {
      setSlide((current) => (current + 1) % SLIDES.length)
    } else if (pressed && (key === 'ArrowLeft' || key === 'ArrowUp')) {
      setSlide((current) => (current - 1 + SLIDES.length) % SLIDES.length)
    }
  }

  const slideRoom = SLIDES[slide].room
  const action = playing ? 'Restart' : hasGame ? 'Continue' : 'Start the game'

  return (
    <div ref={scrub} id='cinetropes-meta-game' className='scrub' style={{ '--steps': ROOMS.length }}>
      <article ref={root} className='band cg' aria-labelledby='cinetropes-meta-game-title'>
        <div className='cg__street' aria-hidden='true'>
          {['facade', 'lobby'].map((kind) => (
            <ul key={kind} className={`cg__track cg__track--${kind}`}>
              {[0, 1].map((copy) => CINEMAS.map((other) => (
                <li key={`${copy}-${other.id}`}>
                  {near && <img src={ASSETS[`${other.id}-${kind}`]} width='192' height='192' alt='' loading='lazy' />}
                </li>
              )))}
            </ul>
          ))}
        </div>
        <div className='cg__layout'>
          <Console
            color={cinema.console}
            playing={playing}
            onPad={pad}
            onTap={(key) => {
              pad(key, true)
              pad(key, false)
            }}
            onStart={playing ? () => frame.current?.focus() : start}
          >
            {playing ? (
              <iframe
                ref={frame}
                className='cg__game'
                title={`cinetropes meta-game demo, ${cinema.name}`}
                src={`${GAME_URL}/play?embed&facade=${cinema.scene}`}
                allow='autoplay'
                onLoad={() => frame.current?.focus()}
              />
            ) : (
              <>
                {near && <Slides cinema={cinema.id} slide={slide} running={visible} reduced={reduced} label={`${cinema.name}, ${SLIDES[slide].label}`} />}
                <button type='button' className='cg__press' onClick={start}>
                  <span>{hasGame ? 'Press A to continue' : 'Press A'}</span>
                </button>
              </>
            )}
          </Console>
          <section className='cg__box cg__panel'>
            <h3 id='cinetropes-meta-game-title' className='cg__title'>
              <Anchor id='cinetropes-meta-game'>
                <img src={new URL('../assets/cinetropes/logo.svg', import.meta.url)} alt='cinetropes' width='275' height='40' />
                <span>meta-game</span>
              </Anchor>
            </h3>
            <Choices
              label='Cinema'
              className='cg__cinemas'
              value={cinema.id}
              onChange={choose}
              options={CINEMAS.map((other) => ({
                id: other.id,
                label: near ? <img src={ASSETS[`${other.id}-facade`]} width='56' height='56' alt={other.name} /> : other.name,
              }))}
            />
            <div className='cg__cinema' aria-live='polite'>
              <h4 className='cg__heading'>{cinema.name}</h4>
              <p className='cg__text cg__dim'>{cinema.theme}</p>
              <p className='cg__text cg__gold'>“{cinema.line}”</p>
            </div>
            {confirm !== null && savedCinema ? (
              <div className='cg__confirm' role='group' aria-label='Change cinema'>
                <p className='cg__text'>Your game is at {savedCinema.name}. Start over here?</p>
                <div className='cg__actions'>
                  <button type='button' className='cg__button' onClick={start}>Start over</button>
                  <button type='button' className='cg__button' onClick={() => choose(savedCinema.id)}>Back to {savedCinema.name}</button>
                </div>
              </div>
            ) : (
              <>
                {!playing && (
                  <Choices
                    label='Rooms'
                    className='choices cg__rooms'
                    value={slideRoom}
                    onChange={(id) => { hold(); setSlide(SLIDES.findIndex((other) => other.room === id)) }}
                    options={ROOMS}
                  />
                )}
                <p className='cg__text'>
                  A demo of the game: restore an abandoned cinema, welcome its audience, upgrade its rooms and gear, and program five films every two hours. It plays on real time, and saves in your browser.
                </p>
                <p className='cg__text cg__dim'>The game is in French.</p>
                <div className='cg__actions'>
                  <button type='button' className='cg__button' onClick={playing ? restart : start}>{action}</button>
                </div>
              </>
            )}
            <Tags items={['TypeScript', 'Phaser', 'React', 'Hono', 'Pixel art']} />
          </section>
        </div>
      </article>
    </div>
  )
}
