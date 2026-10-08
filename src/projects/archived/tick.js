import { useEffect, useRef } from 'react'

// Calls back every `ms` while `active`, always with the latest callback
export const useTick = (callback, ms, active) => {
  const saved = useRef(callback)
  saved.current = callback

  useEffect(() => {
    if (!active) {
      return
    }

    const id = setInterval(() => saved.current(), ms)
    return () => clearInterval(id)
  }, [ms, active])
}
