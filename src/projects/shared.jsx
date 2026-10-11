import { useCallback, useEffect, useRef, useState } from 'react'

// Shown once scrolled into view; reduced motion shows it at once through the styles
export const useReveal = () => {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (!element || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true)
        observer.disconnect()
      }
    }, { rootMargin: '0px 0px -15% 0px' })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, shown]
}

export const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])

  return reduced
}

export const range = (p, from, to) => Math.min(1, Math.max(0, (p - from) / (to - from)))
export const easeOut = (t) => 1 - (1 - t) ** 3

// Progress runs from the screen entering the viewport to the first band pushing it out
export const Group = ({ id, title, phrase, projects, children }) => {
  const screen = useRef(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const element = screen.current

    if (reduced || !element) {
      return
    }

    const lines = element.querySelectorAll('.group__title span')
    const meta = element.querySelector('.group__meta')
    let frame = 0

    const render = () => {
      frame = 0
      const rect = element.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, (innerHeight - rect.top) / rect.height))

      lines.forEach((line, index) => {
        const t = easeOut(range(p, 0.08 + index * 0.07, 0.4 + index * 0.07))
        line.style.transform = `translateX(${(1 - t) * (index % 2 ? 110 : -110)}vw)`
      })

      const shown = range(p, 0.52, 0.66)
      meta.style.opacity = shown
      meta.style.transform = `translateY(${(1 - shown) * 24}px)`
    }

    const schedule = () => {
      frame ||= requestAnimationFrame(render)
    }

    render()
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)

    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
      element.querySelectorAll('[style]').forEach((node) => node.removeAttribute('style'))
    }
  }, [reduced])

  return (
    <section id={id} className='group' aria-labelledby={`${id}-title`}>
      <div ref={screen} className='group__screen'>
        <div className='group__stick'>
          <div className='group__stack'>
            <h2 id={`${id}-title`} className='group__title'>
              {title.split(' ').map((word) => <span key={word}>{word}</span>)}
            </h2>
            <div className='group__meta'>
              <p className='group__phrase'>{phrase}</p>
              <ul className='group__names'>
                {projects.map((name) => <li key={name}>{name}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
      {children}
    </section>
  )
}

// Same query as the pinning in projects.css: a band is one screen from there
const PINNED = '(min-width: 900px) and (min-height: 640px)'

// One screen a step: the first also has the band's entry, the last its exit
export const stepOf = (progress, steps) => Math.round(progress * (steps - 1))

// The scroll walks a band through its steps: pinned on a wide screen, otherwise while its demo, marked
// `data-scrub-demo`, crosses the middle of the screen. `hold` hands the band to the visitor until it leaves the screen
export const useScrub = (onProgress) => {
  const ref = useRef(null)
  const held = useRef(false)
  const callback = useRef(onProgress)
  const reduced = usePrefersReducedMotion()
  callback.current = onProgress

  useEffect(() => {
    const element = ref.current

    if (reduced || !element) {
      return
    }

    const pinned = matchMedia(PINNED)
    let frame = 0

    const render = () => {
      frame = 0
      const rect = element.getBoundingClientRect()

      if (rect.bottom <= 0 || rect.top >= innerHeight) {
        held.current = false
        return
      }

      if (held.current) {
        return
      }

      const demo = (element.querySelector('[data-scrub-demo]') || element).getBoundingClientRect()
      const progress = pinned.matches
        ? -rect.top / Math.max(1, rect.height - innerHeight)
        : (innerHeight * 0.75 - (demo.top + demo.height / 2)) / (innerHeight * 0.5)

      callback.current(Math.min(1, Math.max(0, progress)))
    }

    const schedule = () => {
      frame ||= requestAnimationFrame(render)
    }

    render()
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)

    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
    }
  }, [reduced])

  const hold = useCallback(() => {
    held.current = true
  }, [])

  return [ref, hold]
}

export const Tags = ({ items }) => (
  <ul className='tags' aria-label='Stack'>
    {items.map((item) => <li key={item}>{item}</li>)}
  </ul>
)

export const Links = ({ links }) => (
  <ul className='links'>
    {links.map(([label, href]) => (
      <li key={href}>
        <a href={href} target='_blank' rel='noreferrer'>{label}</a>
      </li>
    ))}
  </ul>
)

// A row of exclusive choices: arrows move between them, as in a tablist
export const Choices = ({ label, options, value, onChange, className = 'choices' }) => {
  const move = (event, index) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]

    if (!step) {
      return
    }

    event.preventDefault()
    const next = options[(index + step + options.length) % options.length]
    onChange(next.id)
    event.currentTarget.parentElement.querySelector(`[data-id="${next.id}"]`)?.focus()
  }

  return (
    <div role='radiogroup' aria-label={label} className={className}>
      {options.map((option, index) => (
        <button
          key={option.id}
          type='button'
          role='radio'
          data-id={option.id}
          aria-checked={option.id === value}
          tabIndex={option.id === value ? 0 : -1}
          onClick={() => onChange(option.id)}
          onKeyDown={(event) => move(event, index)}
          style={option.style}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
