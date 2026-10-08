// The physics of canvas-confetti 1.9.4, the library the daily fires on a win, reduced to its squares and circles.
// canvas-confetti, copyright (c) 2020 Kiril Vatev, ISC License, https://github.com/catdad/canvas-confetti

const DEFAULTS = { particleCount: 50, angle: 90, spread: 45, startVelocity: 45, decay: 0.9, gravity: 1, drift: 0, ticks: 200, scalar: 1 }

const hexToRgb = (hex) => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) })

const fetti = (opts, x, y, color, shape) => ({
  x,
  y,
  wobble: Math.random() * 10,
  wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05),
  velocity: opts.startVelocity * 0.5 + Math.random() * opts.startVelocity,
  angle2D: -opts.angle * (Math.PI / 180) + (0.5 * opts.spread * (Math.PI / 180) - Math.random() * opts.spread * (Math.PI / 180)),
  tiltAngle: (Math.random() * 0.5 + 0.25) * Math.PI,
  color,
  shape,
  tick: 0,
  totalTicks: opts.ticks,
  decay: opts.decay,
  drift: opts.drift,
  random: Math.random() + 2,
  gravity: opts.gravity * 3,
  scalar: opts.scalar,
})

const update = (context, f) => {
  f.x += Math.cos(f.angle2D) * f.velocity + f.drift
  f.y += Math.sin(f.angle2D) * f.velocity + f.gravity
  f.velocity *= f.decay
  f.wobble += f.wobbleSpeed
  const wobbleX = f.x + 10 * f.scalar * Math.cos(f.wobble)
  const wobbleY = f.y + 10 * f.scalar * Math.sin(f.wobble)
  f.tiltAngle += 0.1
  const tiltSin = Math.sin(f.tiltAngle)
  const tiltCos = Math.cos(f.tiltAngle)
  f.random = Math.random() + 2
  const progress = f.tick++ / f.totalTicks
  const x1 = f.x + f.random * tiltCos
  const y1 = f.y + f.random * tiltSin
  const x2 = wobbleX + f.random * tiltCos
  const y2 = wobbleY + f.random * tiltSin

  context.fillStyle = `rgba(${f.color.r}, ${f.color.g}, ${f.color.b}, ${1 - progress})`
  context.beginPath()

  if (f.shape === 'circle') {
    context.ellipse(f.x, f.y, Math.abs(x2 - x1) * 0.6, Math.abs(y2 - y1) * 0.6, (Math.PI / 10) * f.wobble, 0, 2 * Math.PI)
  } else {
    context.moveTo(Math.floor(f.x), Math.floor(f.y))
    context.lineTo(Math.floor(wobbleX), Math.floor(y1))
    context.lineTo(Math.floor(x2), Math.floor(y2))
    context.lineTo(Math.floor(x1), Math.floor(wobbleY))
  }

  context.closePath()
  context.fill()
  return f.tick < f.totalTicks
}

// One canvas, one running loop that every burst joins
export const confettiOn = (canvas) => {
  let fettis = []
  let frame = null

  const loop = () => {
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)
    fettis = fettis.filter((f) => update(context, f))
    frame = fettis.length ? requestAnimationFrame(loop) : null
  }

  const fire = (options) => {
    if (!frame) {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
    }

    const opts = { ...DEFAULTS, ...options }
    const colors = opts.colors.map(hexToRgb)

    for (let i = 0; i < opts.particleCount; i++) {
      fettis.push(fetti(opts, opts.origin.x * canvas.width, opts.origin.y * canvas.height, colors[i % colors.length], Math.random() < 0.5 ? 'square' : 'circle'))
    }

    frame ??= requestAnimationFrame(loop)
  }

  fire.reset = () => {
    cancelAnimationFrame(frame)
    frame = null
    fettis = []
  }

  return fire
}
