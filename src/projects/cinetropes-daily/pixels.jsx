import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// The daily's pixel effects, ported from its PixelSplitOverlay and PixelatedText with the same algorithm and timings:
// the coarse cells crackle, swapping colours with their neighbours every 40 ms, and clear one by one onto the finer layer

export const POSTER_GRIDS = [{ w: 2, h: 3 }, { w: 4, h: 6 }, { w: 8, h: 12 }, { w: 16, h: 24 }, { w: 32, h: 48 }]

const GREY = { r: 51, g: 51, b: 51 }
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const rgb = ({ r, g, b }) => `rgb(${r},${g},${b})`

const size = (canvas) => {
  const dpr = devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const context = canvas.getContext('2d')
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { context, W: rect.width, H: rect.height }
}

// Swap maps, one per 40 ms frame: even then odd horizontal pairs, then vertical pairs, ramping up over three frames
const swapMaps = (w, h, frames) => Array.from({ length: frames }, (_, f) => {
  const intensity = f < 1 ? 0.3 : f < 2 ? 0.6 : 1
  const map = Array.from({ length: w * h }, (_, i) => i)
  const swap = (a, b) => { [map[a], map[b]] = [map[b], map[a]] }

  for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x += 2) Math.random() < intensity * 0.65 && swap(y * w + x, y * w + x + 1)
  for (let y = 0; y < h; y++) for (let x = 1; x < w - 1; x += 2) Math.random() < intensity * 0.35 && swap(y * w + x, y * w + x + 1)
  for (let y = 0; y < h - 1; y += 2) for (let x = 0; x < w; x++) Math.random() < intensity * 0.45 && swap(y * w + x, (y + 1) * w + x)
  return map
})

// One canvas, cells painted from a flat list of colours; `cells(i)` decides what each cell shows
const crackle = (canvas, w, h, colors, { duration, resolveStart, under }, done) => {
  const frames = Math.ceil(duration / 40)
  const maps = swapMaps(w, h, frames)
  const resolves = Array.from({ length: w * h }, () => resolveStart + Math.random() * (duration - resolveStart))
  let frame = requestAnimationFrame(() => {
    const { context, W, H } = size(canvas)

    if (!W || !H) {
      done()
      return
    }

    const cellW = W / w
    const cellH = H / h
    const start = performance.now()

    const tick = (now) => {
      const elapsed = now - start
      context.clearRect(0, 0, W, H)
      under?.(context, W, H)
      const map = maps[Math.min(Math.max(0, Math.floor(elapsed / 40)), frames - 1)]
      let alive = false

      for (let i = 0; i < w * h; i++) {
        if (elapsed < resolves[i]) {
          alive = true
          context.fillStyle = colors[map[i]]
          context.fillRect(Math.round((i % w) * cellW), Math.round(Math.floor(i / w) * cellH), Math.ceil(cellW) + 1, Math.ceil(cellH) + 1)
        }
      }

      if (alive) {
        frame = requestAnimationFrame(tick)
      } else {
        done()
      }
    }

    frame = requestAnimationFrame(tick)
  })

  return () => cancelAnimationFrame(frame)
}

const paintRows = (context, rows, W, H) => {
  const h = rows.length
  const w = rows[0].length
  const cellW = W / w
  const cellH = H / h

  rows.forEach((row, y) => row.forEach((cell, x) => {
    context.fillStyle = rgb(cell ?? GREY)
    const rx = Math.round(x * cellW)
    const ry = Math.round(y * cellH)
    context.fillRect(rx, ry, Math.round((x + 1) * cellW) - rx + 1, Math.round((y + 1) * cellH) - ry + 1)
  }))
}

// A static pixel grid, as the app shows the poster's SVG with crisp edges
export const PixelGrid = ({ pixels, className }) => {
  const canvas = useRef(null)

  useLayoutEffect(() => {
    if (!pixels || !canvas.current) {
      return
    }

    const draw = () => {
      const { context, W, H } = size(canvas.current)
      paintRows(context, pixels, W, H)
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas.current)
    return () => observer.disconnect()
  }, [pixels])

  return <canvas ref={canvas} className={className} aria-hidden='true' />
}

// PixelSplitOverlay: coarse over fine, or over the original poster on the final reveal
export const PixelSplit = ({ coarse, fine, onComplete, className }) => {
  const canvas = useRef(null)
  const complete = useRef(onComplete)
  complete.current = onComplete

  useLayoutEffect(() => {
    const { context, W, H } = size(canvas.current)
    paintRows(context, coarse, W, H)
  }, [coarse])

  useEffect(() => {
    if (still()) {
      complete.current()
      return
    }

    const w = coarse[0].length
    const h = coarse.length
    const total = w * h
    // Final reveal: longer, more dramatic. Tiny grids fly by. Otherwise duration scales with the grid
    const duration = !fine ? 1200 : total < 30 ? 400 : total < 100 ? 600 : total < 2000 ? 700 : 600
    const resolveStart = !fine ? 400 : total < 30 ? 100 : total < 100 ? 150 : 200
    const under = fine && ((context, W, H) => paintRows(context, fine, W, H))
    let finished = false
    return crackle(canvas.current, w, h, coarse.flat().map((cell) => rgb(cell ?? GREY)), { duration, resolveStart, under }, () => {
      if (!finished) {
        finished = true
        complete.current()
      }
    })
  }, [coarse, fine])

  return <canvas ref={canvas} className={className} aria-hidden='true' />
}

// The page background the PixelatedText cells are composited onto
const BACKGROUND = { r: 14, g: 13, b: 14 }

// PixelatedText. One change from the app: the hidden text is never in the page, only its mosaic,
// so the answer cannot be read before the end. Its box is measured from the text instead of laid out by it
export const PixelatedText = ({ text, mosaic, revealed, resolution = 3, fontSize = 16, fontWeight = 400, fontFamily = "'Hanken Grotesk', sans-serif", color = 'rgba(255, 255, 255, 0.85)', block = false, className, children }) => {
  const wrapper = useRef(null)
  const canvas = useRef(null)
  const [coarse, setCoarse] = useState(null)
  const [animating, setAnimating] = useState(false)
  const was = useRef(revealed)

  useLayoutEffect(() => {
    if (revealed && !was.current && coarse) {
      setAnimating(true)
    }

    was.current = revealed
  }, [revealed])

  useLayoutEffect(() => {
    if (revealed && !animating) {
      return
    }

    if (mosaic) {
      setCoarse(mosaic)
      return
    }

    const measure = () => {
      const parent = wrapper.current?.parentElement
      const offscreen = document.createElement('canvas').getContext('2d')
      const font = `${fontWeight} ${fontSize}px ${fontFamily}`
      offscreen.font = font
      const maxWidth = block && parent ? parent.clientWidth : 600
      const lines = []
      let line = ''

      text.split(' ').forEach((word) => {
        const next = line ? `${line} ${word}` : word

        if (offscreen.measureText(next).width > maxWidth && line) {
          lines.push(line)
          line = word
        } else {
          line = next
        }
      })

      if (line) lines.push(line)
      const lineHeight = fontSize * 1.3
      const width = block ? maxWidth : Math.ceil(Math.max(...lines.map((l) => offscreen.measureText(l).width)))
      const height = Math.ceil(lines.length * lineHeight + fontSize * 0.3)
      const scale = Math.max(0.03, Math.min(0.4, resolution * 0.04))
      const w = Math.max(4, Math.round(width * scale))
      const h = Math.max(2, Math.round(height * scale))
      const small = document.createElement('canvas')
      small.width = w
      small.height = h
      const context = small.getContext('2d')
      context.scale(scale, scale)
      context.font = font
      context.fillStyle = color
      context.textBaseline = 'top'
      lines.forEach((l, i) => context.fillText(l, 0, i * lineHeight + fontSize * 0.15))
      const data = context.getImageData(0, 0, w, h).data
      const colors = Array.from({ length: w * h }, (_, i) => {
        const a = data[i * 4 + 3] / 255
        const mix = (channel, bg) => Math.round(data[i * 4 + channel] * a + bg * (1 - a))
        return a ? `rgb(${mix(0, BACKGROUND.r)},${mix(1, BACKGROUND.g)},${mix(2, BACKGROUND.b)})` : rgb(BACKGROUND)
      })
      setCoarse({ w, h, width, height, colors })
    }

    let live = true
    const remeasure = () => live && measure()
    measure()
    document.fonts?.ready.then(remeasure)
    const observer = new ResizeObserver(remeasure)
    block && wrapper.current?.parentElement && observer.observe(wrapper.current.parentElement)
    return () => {
      live = false
      observer.disconnect()
    }
  }, [text, mosaic, resolution, fontSize, fontWeight, fontFamily, color, block, revealed])

  useLayoutEffect(() => {
    if (!coarse || animating || revealed || !canvas.current) {
      return
    }

    const { context, W, H } = size(canvas.current)
    const cellW = W / coarse.w
    const cellH = H / coarse.h
    coarse.colors.forEach((fill, i) => {
      context.fillStyle = fill
      context.fillRect(Math.round((i % coarse.w) * cellW), Math.round(Math.floor(i / coarse.w) * cellH), Math.ceil(cellW) + 1, Math.ceil(cellH) + 1)
    })
  }, [coarse, animating, revealed])

  useEffect(() => {
    if (!animating) {
      return
    }

    if (still() || !coarse) {
      setAnimating(false)
      return
    }

    return crackle(canvas.current, coarse.w, coarse.h, coarse.colors, { duration: 700, resolveStart: 200 }, () => setAnimating(false))
  }, [animating])

  if (revealed && !animating) {
    return children ?? <span className={className} style={{ fontSize, fontWeight, fontFamily, color }}>{text}</span>
  }

  return (
    <span ref={wrapper} className={`cd__pixelated ${className ?? ''}`} style={{ width: coarse?.width, height: coarse?.height, display: block ? 'block' : 'inline-block' }}>
      {animating && (children ?? <span style={{ fontSize, fontWeight, fontFamily, color }}>{text}</span>)}
      <canvas ref={canvas} aria-hidden='true' />
    </span>
  )
}

// usePixelatedImages: each image shrunk to a tiny grid, as a data URL to show and as rows to crackle
export const usePixelatedImages = (sources, grid) => {
  const [results, setResults] = useState([])
  const key = sources.join(',')

  useEffect(() => {
    let cancelled = false

    Promise.all(sources.map((src) => new Promise((resolve) => {
      if (!src) {
        resolve(null)
        return
      }

      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => {
        const small = document.createElement('canvas')
        small.width = grid.w
        small.height = grid.h
        const context = small.getContext('2d')
        context.drawImage(image, 0, 0, grid.w, grid.h)
        const data = context.getImageData(0, 0, grid.w, grid.h).data
        const pixels = Array.from({ length: grid.h }, (_, y) => Array.from({ length: grid.w }, (_, x) => {
          const i = (y * grid.w + x) * 4
          return { r: data[i], g: data[i + 1], b: data[i + 2] }
        }))
        resolve({ dataUrl: small.toDataURL('image/png'), pixels })
      }
      image.onerror = () => resolve(null)
      image.src = src
    }))).then((out) => !cancelled && setResults(out))

    return () => { cancelled = true }
  }, [key, grid.w, grid.h])

  return results
}
