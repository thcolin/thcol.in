import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePrefersReducedMotion } from '../shared'

// The SwipeCard, as the daily uses it: a mini card per attempt with its in-slot suspense,
// and the big poster card, holographic once the film is found

const BACK = new URL('../../assets/cinetropes-daily/card-back.svg', import.meta.url)

const Star = () => <svg viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' d='M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z' /></svg>
const Cross = () => <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M18 6l-12 12M6 6l12 12' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' /></svg>

// The in-slot reveal, with the app's timings from mount: pocket entry at 200 ms, idle float, escalating tremble,
// a pause, the flip to the poster, then the verdict overlay, which calls onResult as the app calls onRetreat
const PHASES = [[200, 'entering'], [600, 'settled'], [1100, 'trembling'], [1700, 'silence'], [1850, 'revealing'], [2700, 'result'], [4000, 'done']]

export const HistoryCard = ({ film, suspense, overlayVisible, onResult }) => {
  const [phase, setPhase] = useState(suspense ? 'waiting' : 'idle')
  const result = useRef(onResult)
  result.current = onResult

  useEffect(() => {
    if (!suspense) {
      return
    }

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('result')
      result.current?.()
      const timer = setTimeout(() => setPhase('idle'), 1200)
      return () => clearTimeout(timer)
    }

    const timers = PHASES.map(([at, next]) => setTimeout(() => {
      setPhase(next)
      next === 'result' && result.current?.()
    }, at))
    return () => timers.forEach(clearTimeout)
  }, [])

  const flipped = ['waiting', 'entering', 'settled', 'trembling', 'silence'].includes(phase)
  const showOverlay = overlayVisible !== undefined ? overlayVisible && !!suspense : phase === 'result'
  const glow = showOverlay ? suspense : null

  return (
    <div className={`cd__mini is-${phase}${glow ? ` is-result-${glow}` : ''}${flipped ? ' is-flipped' : ''}`}>
      <div className='cd__mini-translater'>
        <div className='cd__mini-rotator'>
          {suspense && (
            <div className='cd__mini-back'>
              <img src={BACK} alt='' width='1696' height='2528' />
            </div>
          )}
          <div className='cd__mini-front'>
            {film.posterUrl && <img src={film.posterUrl} alt={film.title} width='342' height='513' />}
            {showOverlay && (
              <div className={`cd__verdict cd__verdict--${suspense === 'correct' ? 'correct' : 'wrong'}`} aria-hidden='true'>
                <span>{suspense === 'correct' ? <Star /> : <Cross />}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// The poster card; once revealed, it tilts and catches the light under the pointer, and a click zooms it
export const MysteryCard = ({ holo, label, hidden, onZoom, children }) => {
  const card = useRef(null)

  const move = (event) => {
    if (!holo || event.pointerType !== 'mouse') {
      return
    }

    const rect = card.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    card.current.style.setProperty('--pointer-x', `${x * 100}%`)
    card.current.style.setProperty('--pointer-y', `${y * 100}%`)
    card.current.style.setProperty('--rotate-x', `${(x - 0.5) * 28}deg`)
    card.current.style.setProperty('--rotate-y', `${(0.5 - y) * 28}deg`)
    card.current.classList.add('is-interacting')
  }

  const leave = () => {
    card.current.classList.remove('is-interacting')
    card.current.style.setProperty('--rotate-x', '0deg')
    card.current.style.setProperty('--rotate-y', '0deg')
  }

  const zoom = () => {
    const rect = card.current.getBoundingClientRect()
    leave()
    onZoom({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: card.current.offsetWidth, height: card.current.offsetHeight })
  }

  const keyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      zoom()
    }
  }

  return (
    <div
      ref={card}
      className={holo ? 'cd__card is-holo' : 'cd__card'}
      style={hidden ? { visibility: 'hidden' } : undefined}
      onPointerMove={move}
      onPointerLeave={leave}
      {...onZoom && { role: 'button', tabIndex: 0, 'aria-label': label, onClick: zoom, onKeyDown: keyDown }}
    >
      <div className='cd__card-rotator'>
        <div className='cd__card-front'>
          {children}
          {holo && <div className='cd__card-shine' />}
          {holo && <div className='cd__card-glare' />}
        </div>
      </div>
    </div>
  )
}

const Icon = ({ d }) => (
  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    {d.map((path) => <path key={path} d={path} />)}
  </svg>
)

const FOCUSABLE = 'button, [href], [tabindex]:not([tabindex="-1"])'

// The app's SwipeCard as the film page opens it: the card flies to the middle of the screen at 70% of it, spinning a
// turn and a half to land on its back, the film's sheet. A click on the card or the turn button turns it over;
// Escape, the cross or the backdrop puts it back, the app's timings throughout
export const MysteryZoom = ({ from, poster, title, onClose, children }) => {
  const dialog = useRef(null)
  const busy = useRef(true)
  const timers = useRef([])
  const reduced = usePrefersReducedMotion()
  const [, setViewport] = useState(0)
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const scale = Math.min((innerWidth * 0.7) / from.width, (innerHeight * 0.7) / from.height)
  const size = { width: from.width * scale, height: from.height * scale }
  const box = { left: (innerWidth - size.width) / 2, top: (innerHeight - size.height) / 2 }
  const away = `translate(${from.x - innerWidth / 2}px, ${from.y - innerHeight / 2}px) scale(${1 / scale})`
  const shown = open && !leaving
  const onBack = rotation % 360 !== 0
  const later = (callback, delay) => timers.current.push(setTimeout(callback, reduced ? 0 : delay))

  // The page behind is inert while the card is open, and the focus goes back where it was
  useEffect(() => {
    const opener = document.activeElement
    const overflow = document.documentElement.style.overflow
    const page = [...document.body.children].filter((element) => element !== dialog.current && !element.inert)
    document.documentElement.style.overflow = 'hidden'
    page.forEach((element) => { element.inert = true })
    dialog.current.focus({ preventScroll: true })
    const resize = () => setViewport((n) => n + 1)
    addEventListener('resize', resize)
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => {
      setOpen(true)
      setRotation(-540)
      later(() => {
        setRevealed(true)
        busy.current = false
      }, 1000)
    }))
    return () => {
      cancelAnimationFrame(frame)
      timers.current.forEach(clearTimeout)
      removeEventListener('resize', resize)
      page.forEach((element) => { element.inert = false })
      document.documentElement.style.overflow = overflow
      requestAnimationFrame(() => opener?.focus?.({ preventScroll: true }))
    }
  }, [])

  const turn = () => {
    if (busy.current || leaving) {
      return
    }

    busy.current = true
    setRotation((r) => onBack ? r + 180 : r - 180)
    onBack && setRevealed(false)
    later(() => {
      !onBack && setRevealed(true)
      busy.current = false
    }, 800)
  }

  const leave = () => {
    if (leaving) {
      return
    }

    timers.current.forEach(clearTimeout)
    timers.current = []
    busy.current = true
    setRevealed(false)
    setLeaving(true)
    onBack && setRotation((r) => r + 180)
    later(onClose, onBack ? 1550 : 800)
  }

  const keyDown = (event) => {
    if (event.key === 'Escape') {
      leave()
    } else if (event.key === 'Tab') {
      const items = [...dialog.current.querySelectorAll(FOCUSABLE)]
      const edge = event.shiftKey ? items[0] : items[items.length - 1]

      if (document.activeElement === edge || document.activeElement === dialog.current) {
        event.preventDefault()
        ;(event.shiftKey ? items[items.length - 1] : items[0]).focus()
      }
    }
  }

  return createPortal(
    <div ref={dialog} className={`cinetropes__zoom cd__zoom${shown ? ' is-open' : ''}`} role='dialog' aria-modal='true' aria-label={title} tabIndex={-1} onKeyDown={keyDown}>
      <div className='cinetropes__zoom-backdrop' onClick={leave} />
      <div className='cd__zoom-card' style={{ ...size, ...box, transform: shown ? 'none' : away }} onClick={turn}>
        <div className='cd__zoom-rotator' style={{ transform: `rotateY(${rotation}deg)` }}>
          <div className='cd__zoom-front'>
            <img src={poster} alt='' width='500' height='750' />
          </div>
          <div className='cd__zoom-back'>
            <img src={BACK} alt='' width='1696' height='2528' />
          </div>
        </div>
        {revealed && <div className='cd__zoom-sheet' onClick={(event) => event.stopPropagation()}>{children}</div>}
      </div>
      <button type='button' className='cinetropes__close' style={{ top: box.top - 32, left: box.left + size.width + 32 }} aria-label='Close' onClick={leave}>
        <Icon d={['M18 6l-12 12', 'M6 6l12 12']} />
      </button>
      <button type='button' className='cinetropes__close cd__zoom-turn' style={{ top: box.top + size.height + 32, left: box.left + size.width / 2 }} aria-label={onBack ? 'Show the poster' : 'Show the back'} onClick={turn}>
        <Icon d={['M19.933 13.041a8 8 0 1 1 -9.925 -8.788c3.899 -1 7.935 1.007 9.425 4.747', 'M20 4v5h-5']} />
      </button>
    </div>,
    document.body,
  )
}
