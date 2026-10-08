import { useEffect, useRef, useState } from 'react'

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

// The poster card; once revealed, it tilts and catches the light under the pointer
export const MysteryCard = ({ holo, children }) => {
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

  return (
    <div ref={card} className={holo ? 'cd__card is-holo' : 'cd__card'} onPointerMove={move} onPointerLeave={leave}>
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
