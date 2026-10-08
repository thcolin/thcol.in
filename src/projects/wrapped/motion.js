import { useEffect, useRef, useState } from 'react'

// The few calls of framer-motion the stories make: a tween, a value it drives, and the reduced-motion preference
export { usePrefersReducedMotion as useReducedMotion } from '../shared'

// cubic-bezier(x1, y1, x2, y2) as a function of time, x solved by bisection
const bezier = ([x1, y1, x2, y2]) => {
  const at = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3

  return (x) => {
    let [low, high] = [0, 1]

    for (let step = 0; step < 24; step++) {
      const middle = (low + high) / 2
      at(x1, x2, middle) < x ? (low = middle) : (high = middle)
    }

    return at(y1, y2, (low + high) / 2)
  }
}

const valueOf = (initial) => {
  let current = initial
  const listeners = new Set()

  return {
    get: () => current,
    set: (next) => {
      current = next
      listeners.forEach((listener) => listener(next))
    },
    on: (_, listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

// `animate(from, to, { onUpdate })` tweens a number, `animate(value, to)` a value made by `useMotionValue`
export const animate = (subject, to, { duration = 0.3, delay = 0, ease = [0.25, 0.1, 0.25, 1], onUpdate } = {}) => {
  const value = typeof subject === 'number' ? null : subject
  const from = value ? value.get() : subject
  const curve = bezier(ease)
  let start = null
  let frame = requestAnimationFrame(function tick(now) {
    start ??= now + delay * 1000
    const progress = Math.min(1, Math.max(0, (now - start) / (duration * 1000)))
    const current = from + (to - from) * curve(progress)
    value ? value.set(current) : onUpdate?.(current)
    frame = progress < 1 ? requestAnimationFrame(tick) : 0
  })

  return { stop: () => cancelAnimationFrame(frame) }
}

export const useMotionValue = (initial) => useState(() => valueOf(initial))[0]

export const useMotionValueEvent = (value, event, callback) => {
  const latest = useRef(callback)
  latest.current = callback
  useEffect(() => value.on(event, (next) => latest.current(next)), [value, event])
}
