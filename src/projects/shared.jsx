import { useEffect, useRef, useState } from 'react'

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

export const Group = ({ id, title, children }) => (
  <section className='group' aria-labelledby={`group-${id}`}>
    <h2 id={`group-${id}`} className='group__title'>{title}</h2>
    {children}
  </section>
)

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
