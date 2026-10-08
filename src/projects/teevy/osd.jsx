import { useEffect, useState } from 'react'

// Live visibility, both ways: what plays offscreen pauses, what renders offscreen unmounts
export const useInView = (ref, rootMargin = '0px') => {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (!element || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, rootMargin])

  return inView
}

export const number = (index) => String(index + 1).padStart(2, '0')

// A channel line of the guide: fixed gutter for the cursor, so the label never moves
export const GuideLabel = ({ index, label, hint }) => (
  <>
    <span aria-hidden='true' className='teevy-guide__cursor'>►</span>
    <span className='teevy-guide__number'>{number(index)}</span>
    <span className='teevy-guide__label'>{label}</span>
    {hint && <span className='teevy-guide__hint'>{hint}</span>}
  </>
)

// The navigation legend at the bottom of every teevy screen: boxed keys, colour-coded
export const Legend = ({ items }) => (
  <p className='teevy-legend'>
    {items.map(([label, keys]) => (
      <span key={label} className='teevy-legend__item'>
        <span>{label}</span>
        {keys.map((key) => <kbd key={key} className='teevy-legend__key'>{key}</kbd>)}
      </span>
    ))}
  </p>
)

// teevy's channel banner: number, wordmark, programme, and a segmented progress bar
export const Hud = ({ visible, number, name, title, byline, progress }) => (
  <div className={visible ? 'teevy-hud' : 'teevy-hud is-hidden'} aria-hidden='true'>
    <span className='teevy-hud__bug'>teevy</span>
    <div className='teevy-hud__channel'>
      {progress && (
        <div className='teevy-hud__progress'>
          <span className='teevy-hud__elapsed'>{progress.elapsed}</span>
          <span className='teevy-hud__track'><span className='teevy-hud__fill' style={{ width: `${progress.ratio * 100}%` }} /></span>
          <span className='teevy-hud__total'>{progress.total}</span>
        </div>
      )}
      <div className='teevy-hud__main'>
        <span className='teevy-hud__number'>{number}</span>
        <span className='teevy-hud__text'>
          <span className='teevy-hud__name'>{name}</span>
          {title && <span className='teevy-hud__title'>{title}</span>}
          {byline && <span className='teevy-hud__byline'>{byline}</span>}
        </span>
      </div>
    </div>
  </div>
)

export const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
