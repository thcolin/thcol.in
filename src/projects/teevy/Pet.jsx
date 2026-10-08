import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { FACE_GRID, composeFace, faceParamsFrom } from './mascot/face-rig'
import { GHOST_ALPHA, STATUS_LABELS, STATUS_MIN_COLS, STATUS_ROWS, blinkHoldMs, composeStatusLine, statusLabelSlots, statusLabelText } from './mascot/status-rig'
import { HINT_TOP_FRACTION, JACKPOT_STAKE_W, REEL_COUNT, barColor, jackpotPayoutFor, mireAt, openJackpot, outcome, restsAtMs, stopNext } from './mascot/jackpot-core'
import { jackpotFace, jackpotScoreSignature } from './mascot/jackpot-face'

// teevy's channel 0, as its renderer draws it: the colour bars edge to edge, the face painted on
// them in plain white, and the status line in the black band underneath

const BARS = ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf']
const STATUS_INK = '#c8c8c8'
const FACE_SPAN = 21
const BLINK = [3000, 8000]
const GAZE = [1500, 4200]
const GAZE_HOLD = [450, 900]
const TICK_MS = 125
const RESULT_MS = 3200
const LINE_MS = 6000
const DRAIN_MS = 6000
const REST = { valence: 0.45, arousal: 0.55, override: null, particles: [], stage: 'adult', attention: 'center' }

const between = ([min, max]) => min + Math.random() * (max - min)

// The face's ink box, measured once on the neutral face: the rest framing centres on it
const NEUTRAL = composeFace(faceParamsFrom(REST, { blink: false, gazeOffset: 0 }))
const INK = (() => {
  let x0 = FACE_GRID
  let y0 = FACE_GRID
  let x1 = 0
  let y1 = 0
  NEUTRAL.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === '1') {
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x + 1)
      y1 = Math.max(y1, y + 1)
    }
  }))
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
})()

const verdict = (repaired) => repaired === REEL_COUNT
  ? 'Seven out of seven. The mire is whole again.'
  : repaired >= 4 ? `${repaired} bars repaired. So close.` : repaired >= 2 ? `${repaired} bars repaired.` : 'The mire is still broken.'

const fit = (canvas) => {
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.round(canvas.clientWidth * ratio)
  const height = Math.round(canvas.clientHeight * ratio)

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  return { width, height }
}

// The white face, teevy's rest framing: an integer cell, the ink box centred on the picture
const paintFace = (canvas, rows) => {
  const { width, height } = fit(canvas)
  const context = canvas.getContext('2d')
  const cell = Math.max(1, Math.floor(Math.min(width, height) / FACE_SPAN))
  const x0 = Math.round(width / 2 - INK.cx * cell)
  const y0 = Math.round(height / 2 - INK.cy * cell)
  context.clearRect(0, 0, width, height)
  context.fillStyle = '#ffffff'
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '1') context.fillRect(x0 + x * cell, y0 + y * cell, cell, cell)
    }
  })
}

// The status line: signal, battery and gauge, mood and gauge, watts on seven segments with ghosts
const paintStatus = (canvas, readout, nowMs) => {
  const { width, height } = fit(canvas)
  const context = canvas.getContext('2d')
  const cell = Math.max(1, Math.min(Math.floor(height / STATUS_ROWS), Math.floor(width / STATUS_MIN_COLS)))
  const cols = Math.max(STATUS_MIN_COLS, Math.floor(width / cell))
  const originY = Math.round((height - cell * STATUS_ROWS) / 2)
  const sprite = composeStatusLine(readout, false, cols, { moral: readout.needs.morale, bond: 'likes', nowMs })
  context.clearRect(0, 0, width, height)
  context.fillStyle = STATUS_INK

  for (const layer of [{ rows: sprite.ghost, alpha: GHOST_ALPHA }, { rows: sprite.rows, alpha: 1 }]) {
    context.globalAlpha = layer.alpha
    for (let y = 0; y < STATUS_ROWS; y++) {
      const row = layer.rows[y] ?? ''
      for (let x = 0; x < cols; x++) {
        if (row[x] === '1') context.fillRect(x * cell, originY + y * cell, cell, cell)
      }
    }
  }

  context.globalAlpha = 1
  return cols
}

export const PetChannel = forwardRef(({ active, reduced }, handle) => {
  const [watts, setWatts] = useState(1250)
  const [power, setPower] = useState(0.62)
  const [morale, setMorale] = useState(0.48)
  const [unlocks, setUnlocks] = useState(0)
  const [play, setPlay] = useState(null)
  const [line, setLine] = useState(null)
  const [cols, setCols] = useState(STATUS_MIN_COLS)
  const face = useRef(null)
  const status = useRef(null)
  const game = useRef(null)
  const props = useRef({})
  const reaction = useRef({ signature: '', at: 0 })

  // Needs drain slowly while the channel is on; nothing feeds them here, only the game pays
  useEffect(() => {
    if (!active) {
      return
    }

    const timer = setInterval(() => {
      setPower((value) => Math.max(0.12, value - 0.01))
      setMorale((value) => Math.max(0.1, value - 0.01))
    }, DRAIN_MS)
    return () => clearInterval(timer)
  }, [active])

  useEffect(() => {
    if (!line || play) {
      return
    }

    const timer = setTimeout(() => setLine(null), LINE_MS)
    return () => clearTimeout(timer)
  }, [line, play])

  // One frame of the game: where the seven reels are and what the score reads
  useEffect(() => {
    if (!play || play.result) {
      return
    }

    let raf = 0
    const tick = () => {
      const current = game.current
      const now = performance.now()
      const views = mireAt(current, now)
      const pressed = current.pressedMs.filter((value) => value !== null).length
      const rested = views.filter((view) => view.motion === 'posé').length
      const score = {
        posees: rested,
        reparees: views.slice(0, rested).filter((view) => view.repaired).length,
        derniere: rested === 0 ? null : views[rested - 1].repaired,
        visee: pressed < REEL_COUNT ? pressed : null,
        fini: false,
      }
      const reels = views.map((view, reel) => barColor(reel, view.phase))
      const restedAt = restsAtMs(current, REEL_COUNT - 1)

      if (current.status === 'réglé' && restedAt !== null && now >= restedAt) {
        const { repaired, perfect } = outcome(current)
        const paid = jackpotPayoutFor(repaired)
        setWatts((value) => value + paid)
        setMorale((value) => Math.min(1, value + 0.05 + repaired * 0.03))
        setUnlocks((count) => count + (perfect ? 1 : 0))
        setLine(`${verdict(repaired)}${paid ? ` +${paid} W.` : ''}`)
        setPlay({ reels, next: null, score: { ...score, fini: true }, result: { repaired, paid } })
        return
      }

      setPlay({ reels, next: score.visee, score, result: null })
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play?.result, play === null])

  useEffect(() => {
    if (!play?.result) {
      return
    }

    const timer = setTimeout(() => {
      game.current = null
      setPlay(null)
    }, RESULT_MS)
    return () => clearTimeout(timer)
  }, [play?.result])

  const press = () => {
    if (play?.result) {
      return
    }

    if (game.current) {
      game.current = stopNext(game.current, performance.now())
      return
    }

    const opening = openJackpot(watts, unlocks, `${Date.now()}|${watts}`, performance.now())

    if (!opening.ok || watts < opening.stakeW) {
      setLine(`A game costs ${JACKPOT_STAKE_W} W.`)
      return
    }

    setWatts((value) => value - opening.stakeW)
    setLine('Stop each bar on its own colour.')
    game.current = opening.game
    setPlay({ reels: null, next: 0, score: null, result: null })
  }

  useImperativeHandle(handle, () => ({ press }))

  let forced = null

  if (play?.score) {
    const signature = jackpotScoreSignature(play.score)

    if (signature !== reaction.current.signature) {
      reaction.current = { signature, at: performance.now() }
    }

    forced = jackpotFace(play.score, performance.now() - reaction.current.at)
  }

  props.current = { forced, reduced }

  // The face lives on its own: blinks every few seconds, glances aside, at 8 frames a second
  useEffect(() => {
    const canvas = face.current

    if (!canvas) {
      return
    }

    const life = { blinkAt: performance.now() + between(BLINK), blinkLeft: 0, gaze: 0, gazeAt: performance.now() + between(GAZE), gazeUntil: 0 }
    let timer = 0

    const frame = () => {
      const now = performance.now()
      const { forced, reduced } = props.current

      if (forced) {
        return paintFace(canvas, composeFace(forced))
      }

      if (!reduced && !life.blinkLeft && now >= life.blinkAt) {
        life.blinkLeft = 2
        life.blinkAt = now + between(BLINK)
      }

      if (!reduced && now >= life.gazeAt) {
        life.gaze = Math.random() < 0.5 ? -1 : 1
        life.gazeUntil = now + between(GAZE_HOLD)
        life.gazeAt = life.gazeUntil + between(GAZE)
      }

      const blink = life.blinkLeft > 0
      life.blinkLeft = Math.max(0, life.blinkLeft - 1)
      paintFace(canvas, composeFace(faceParamsFrom(REST, { blink, gazeOffset: !reduced && now < life.gazeUntil ? life.gaze : 0 })))
    }

    const loop = () => {
      frame()
      timer = setTimeout(loop, TICK_MS)
    }

    const observer = new ResizeObserver(frame)
    observer.observe(canvas)

    if (active && (!reduced || forced)) {
      loop()
    } else {
      frame()
    }

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [active, reduced, forced !== null])

  const readout = { wattsW: watts, needs: { power, morale } }
  const readoutRef = useRef(readout)
  readoutRef.current = readout

  // The signal blinks to the bond's rhythm, so the line repaints on its own clock
  useEffect(() => {
    const canvas = status.current

    if (!canvas) {
      return
    }

    let timer = 0
    const tick = () => {
      const at = performance.now()
      setCols(paintStatus(canvas, readoutRef.current, at))
      timer = setTimeout(tick, Math.max(16, blinkHoldMs('likes', at)))
    }

    const observer = new ResizeObserver(() => setCols(paintStatus(canvas, readoutRef.current, performance.now())))
    observer.observe(canvas)
    tick()

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (status.current) paintStatus(status.current, readout, performance.now())
  }, [watts, power, morale])

  const slots = statusLabelSlots(cols)

  return (
    <div className='teevy-pet' data-playing={play ? 'true' : undefined}>
      <button type='button' className='teevy-pet__mire' onClick={press} aria-label={play ? 'Stop the next bar' : `Play, ${JACKPOT_STAKE_W} W`}>
        {BARS.map((color, reel) => {
          const rolling = play?.reels?.[reel]

          return (
            <span key={color} className='teevy-pet__reel' data-todo={play && play.next !== null && reel > play.next ? 'true' : undefined}>
              {rolling === undefined
                ? <span style={{ background: color, flex: 1 }} />
                : (
                  <>
                    <span style={{ background: color, height: `${HINT_TOP_FRACTION * 100}%` }} />
                    <span style={{ background: BARS[rolling], flex: 1 }} />
                  </>
                  )}
            </span>
          )
        })}
        <canvas ref={face} className='teevy-pet__face' aria-hidden='true' />
      </button>
      {line && (
        <p className='teevy-line' aria-live='polite'>
          <span className='teevy-line__key'>TEEVY</span>
          <span className='teevy-line__val'><span className='teevy-line__text'>{line}</span></span>
        </p>
      )}
      <div className='teevy-pet__band'>
        <canvas ref={status} className='teevy-pet__status' role='img' aria-label={`Food ${Math.round(power * 100)}%, play ${Math.round(morale * 100)}%, ${watts} watts`} />
        <div className='teevy-pet__labels' aria-hidden='true'>
          {STATUS_LABELS.map((label) => {
            const { x, w } = slots[label.slot]
            return <span key={label.slot} className='teevy-pet__label' style={{ left: `${((x + w / 2) / cols) * 100}%` }}>{statusLabelText(label)}</span>
          })}
        </div>
      </div>
    </div>
  )
})
