import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tags } from './shared'
import { getPosterPixels, getPuzzle, revealMysteryFilm, search, submitGuess } from './cinetropes-daily/source'
import { PixelGrid, PixelSplit, PixelatedText, POSTER_GRIDS, usePixelatedImages } from './cinetropes-daily/pixels'
import { HistoryCard, MysteryCard } from './cinetropes-daily/card'
import { confettiOn } from './cinetropes-daily/confetti'
import { Atmosphere, Reception, Tropes } from './cinetropes-daily/radars'
import './cinetropes-daily.css'

// The beta's /daily page, its DailyPage and useDailyState ported as they are, laid out on one screen

const LOGO = new URL('../assets/cinetropes/logo.svg', import.meta.url)
const STORAGE = 'daily-state-v1-'
const ONBOARDING = 'daily-onboarding-seen'
const CAST_LIMIT = 4
const CREW_JOBS = ['Director', 'Co-Director', 'Writer', 'Screenplay']
const SIMILAR_GRID = { w: 4, h: 6 }
const KONAMI = 'daily-konami-'
const KONAMI_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const KONAMI_LABELS = ['▲', '▲', '▼', '▼', '◀', '▶', '◀', '▶', 'B', 'A']

const runtimeOf = (minutes) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
// The API's titleMask: capitals X, small letters x, digits 0, the rest kept
const maskOf = (text) => [...text].map((c) => /\p{Lu}/u.test(c) ? 'X' : /\p{Ll}/u.test(c) ? 'x' : /\d/.test(c) ? '0' : c).join('')

// The client never has the title before the end, only its mask: a role with the title's shape, as a whole or in one
// of its words, stays hidden to the end. The app gives the answer away there at the third attempt (Nikita, for #190)
const mayBeTitle = (role, titleMask) => !!role && !!titleMask && (maskOf(role) === titleMask || (!titleMask.includes(' ') && role.split(/[\s,]+/).some((word) => maskOf(word) === titleMask)))

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

const shareText = (gameDay, attempts, won, konami) => {
  const grid = attempts.map((attempt, i) => attempt.type === 'skip' ? '⬛' : won && i === attempts.length - 1 ? '🟩' : '\u{1F7E5}')
  while (grid.length < 6) grid.push('⬛')
  return `CineTropes #${gameDay}\n\n${grid.join('')} ${won ? attempts.length : 'X'}/6 ${konami ? '🔮' : '🎬'}\n\nhttps://cinetropes.com`
}

// Confetti in the poster's own colours: the most saturated cells of its 4×6 grid, brought to 60% lightness
const confettiColors = (pixels) => {
  const seen = new Set()
  const candidates = []

  pixels.flat().forEach(({ r, g, b }) => {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const lightness = (max + min) / 2
    const saturation = max === min ? 0 : (max - min) / (lightness > 127 ? 510 - max - min : max + min)

    if (lightness > 240 || saturation < 0.15) {
      return
    }

    let hue = 0
    const d = max - min
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) hue = ((b - r) / d + 2) * 60
    else hue = ((r - g) / d + 4) * 60
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`

    if (!seen.has(key)) {
      seen.add(key)
      candidates.push({ hue, saturation })
    }
  })

  candidates.sort((a, b) => b.saturation - a.saturation)
  return candidates.length ? candidates.slice(0, 6).map(({ hue, saturation }) => {
    const s = Math.min(saturation * 1.3, 1)
    const h = hue / 360
    const l = 0.6
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const channel = (t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    return `#${[channel(h + 1 / 3), channel(h), channel(h - 1 / 3)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`
  }) : null
}

// The film page's radar input: rarity on a log scale, the nine most confident tropes, spread from 1.5 to 5
const topTropes = (tropes) => {
  const picked = [...tropes].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)).slice(0, 9)
  const values = picked.map((t) => 1 / Math.log2(2 + (t.usageCount || 1)))
  const min = Math.min(...values)
  const max = Math.max(...values)
  return picked.map((t, i) => ({ name: t.name, value: max === min ? values[i] : Math.round((1.5 + ((values[i] - min) / (max - min)) * 3.5) * 100) / 100 }))
}

const SkipIcon = () => (
  <svg className='cd__skip-icon' viewBox='0 0 24 24' aria-hidden='true'>
    <path d='M4 9h8v-3.586a1 1 0 0 1 1.707 -.707l6.586 6.586a1 1 0 0 1 0 1.414l-6.586 6.586a1 1 0 0 1 -1.707 -.707v-3.586h-8a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1z' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

const Chevron = ({ open }) => (
  <svg className={open ? 'cd__chevron is-open' : 'cd__chevron'} viewBox='0 0 24 24' width='14' height='14' aria-hidden='true'>
    <path d='M6 9l6 6l6 -6' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

// A casting or crew row; before its tier, the photo shrinks to 4×4 and the words to a mosaic
const Person = ({ name, role, imageUrl, revealed, hideRole }) => {
  const [pixelated] = usePixelatedImages(useMemo(() => [revealed ? null : imageUrl], [revealed, imageUrl]), { w: 4, h: 4 })

  return (
    <li className='cd__person'>
      <span className='cd__avatar'>
        {revealed && imageUrl && <img src={imageUrl} alt='' width='185' height='278' loading='lazy' />}
        {!revealed && pixelated && <img src={pixelated.dataUrl} alt='' width='4' height='4' className='is-pixelated' />}
      </span>
      <span className='cd__person-info'>
        <PixelatedText text={name} revealed={revealed} resolution={2} fontSize={13} fontWeight={600} color='rgba(255, 255, 255, 0.85)'>
          <b>{name}</b>
        </PixelatedText>
        {role && (
          <PixelatedText text={role} revealed={revealed && !hideRole} resolution={2} fontSize={11} color='rgba(255, 255, 255, 0.4)'>
            <small>{role}</small>
          </PixelatedText>
        )}
      </span>
    </li>
  )
}

// KonamiOverlay: the keys typed so far, above the dock; a wrong key fades them out, the full code dismisses them
const KonamiOverlay = ({ progress, activated }) => {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [count, setCount] = useState(0)
  const previous = useRef(0)

  useEffect(() => {
    if (progress > 0 && progress > previous.current) {
      setVisible(true)
      setFadeOut(false)
      setCount(progress)
    }

    if (progress === 0 && previous.current > 0 && !activated) {
      setFadeOut(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setFadeOut(false)
        setCount(0)
      }, 400)
      previous.current = progress
      return () => clearTimeout(timer)
    }

    previous.current = progress
  }, [progress, activated])

  useEffect(() => {
    if (!activated || !visible) {
      return
    }

    let inner
    const timer = setTimeout(() => {
      setFadeOut(true)
      inner = setTimeout(() => {
        setVisible(false)
        setCount(0)
      }, 500)
    }, 1200)
    return () => { clearTimeout(timer); clearTimeout(inner) }
  }, [activated, visible])

  if (!visible) {
    return null
  }

  return (
    <div className={fadeOut ? 'cd__konami-track is-fading' : 'cd__konami-track'} aria-hidden='true'>
      <div className='cd__konami-keys'>
        {KONAMI_LABELS.slice(0, count).map((label, i) => <kbd key={i} className='cd__konami-key'>{label}</kbd>)}
      </div>
    </div>
  )
}

const Section = ({ id, label, open, onToggle, children }) => (
  <div className='cd__section'>
    <h5 className='cd__section-header' data-expanded={open || undefined}>
      <button type='button' aria-expanded={open} aria-controls={`cd-section-${id}`} onClick={() => onToggle(open ? '' : id)}>
        <span>{label}</span>
        <Chevron open={open} />
      </button>
    </h5>
    <div id={`cd-section-${id}`} className={open ? 'cd__section-body is-open' : 'cd__section-body'} inert={open ? undefined : ''}>
      <div className='cd__section-inner'>{children}</div>
    </div>
  </div>
)

export const CinetropesDaily = () => {
  const root = useRef(null)
  const [puzzle, setPuzzle] = useState(null)
  const [state, setState] = useState({ phase: 'loading', gameDay: 0, mystery: null, attempts: [], maxAttempts: 6, mysteryFilm: null })
  const [onboarded, setOnboarded] = useState(() => read(ONBOARDING) === true)
  const [onboardingLeaving, setOnboardingLeaving] = useState(false)
  const [revealTier, setRevealTier] = useState(0)
  const [victoryRevealed, setVictoryRevealed] = useState(false)
  const [basePosterLevel, setBasePosterLevel] = useState(0)
  const [pixels, setPixels] = useState([])
  const [transition, setTransition] = useState(null)
  const [cascade, setCascade] = useState(false)
  const [lastGuessIndex, setLastGuessIndex] = useState(null)
  const [lastGuessResult, setLastGuessResult] = useState(null)
  const [pendingBar, setPendingBar] = useState(null)
  const [revealingBar, setRevealingBar] = useState(null)
  const [openSection, setOpenSection] = useState('casting')
  const [similarPhase, setSimilarPhase] = useState('hidden')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [staged, setStaged] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const cascadeQueue = useRef([])
  const correctBar = useRef(null)
  const colors = useRef(null)
  const attemptsCount = useRef(0)
  const restored = useRef(false)
  const card = useRef(null)
  const confettiCanvas = useRef(null)
  const confetti = useRef(null)
  const timers = useRef([])
  const similarCount = useRef(0)
  const [konami, setKonami] = useState(false)
  const [konamiProgress, setKonamiProgress] = useState(0)
  const [listening, setListening] = useState({ visible: false, focus: false })
  const konamiRef = useRef(false)
  const konamiStep = useRef(0)

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => () => { timers.current.forEach(clearTimeout); confetti.current?.reset() }, [])

  const { phase, gameDay, mystery, attempts, maxAttempts, mysteryFilm } = state
  attemptsCount.current = attempts.length
  const finished = phase === 'won' || phase === 'lost'
  const attemptsUsed = attempts.length
  const loading = phase === 'loading'

  // GET /daily, then the saved game of that day if it is the same film
  useEffect(() => {
    getPuzzle().then((data) => {
      setPuzzle(data)
      const saved = read(`${STORAGE}${data.gameDay}`)
      const same = saved?.mystery && saved.mystery.year === data.mystery.year && saved.mystery.runtime === data.mystery.runtime && saved.mystery.director === data.mystery.director
      setState(same ? saved : { phase: 'playing', gameDay: data.gameDay, mystery: data.mystery, attempts: [], maxAttempts: data.maxGuesses, mysteryFilm: null })
      Promise.all(POSTER_GRIDS.map((_, level) => getPosterPixels(level))).then(setPixels)
    })
  }, [])

  useEffect(() => {
    if (!loading && gameDay > 0) {
      write(`${STORAGE}${gameDay}`, state)
    }
  }, [state])

  // A reloaded game shows where it stood, without any animation
  useEffect(() => {
    if (loading || restored.current) {
      return
    }

    restored.current = true
    const bonus = read(`${KONAMI}${gameDay}`) === 1 ? 1 : 0

    if (bonus) {
      konamiRef.current = true
      setKonami(true)
    }

    if (attempts.length > 0 || bonus) {
      const tier = attempts.length + bonus
      setRevealTier(tier)
      setBasePosterLevel(finished ? 5 : Math.min(tier, 4))
      finished && setVictoryRevealed(true)
      finished && setSimilarPhase('done')
    }
  }, [phase])

  useEffect(() => {
    if (finished && !mysteryFilm) {
      revealMysteryFilm().then((film) => {
        setState((s) => ({ ...s, mysteryFilm: film }))
        phase === 'lost' && setVictoryRevealed(true)
      })
    }
  }, [phase, mysteryFilm])

  useEffect(() => {
    if (revealTier === 2) setOpenSection('equipe')
    else if (revealTier === 3) setOpenSection('casting')
    else if (revealTier === 4) setOpenSection('similar')
  }, [revealTier])

  // The Konami code gives one clue tier for free, once a day. Keys count only while the band is on screen
  // or holds the focus, so the rest of the page keeps its keyboard
  useEffect(() => {
    const element = root.current
    const observer = new IntersectionObserver(([entry]) => setListening((l) => ({ ...l, visible: entry.isIntersecting })), { threshold: 0.5 })
    const focusIn = () => setListening((l) => ({ ...l, focus: true }))
    const focusOut = (event) => !element.contains(event.relatedTarget) && setListening((l) => ({ ...l, focus: false }))
    observer.observe(element)
    element.addEventListener('focusin', focusIn)
    element.addEventListener('focusout', focusOut)
    return () => {
      observer.disconnect()
      element.removeEventListener('focusin', focusIn)
      element.removeEventListener('focusout', focusOut)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'playing' || konami || !(listening.visible || listening.focus)) {
      return
    }

    const keyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key

      if (key === KONAMI_SEQUENCE[konamiStep.current]) {
        konamiStep.current++
        setKonamiProgress(konamiStep.current)

        if (konamiStep.current === KONAMI_SEQUENCE.length) {
          write(`${KONAMI}${gameDay}`, 1)
          konamiRef.current = true
          setKonami(true)
          setRevealTier((tier) => tier + 1)
        }
      } else {
        konamiStep.current = 0
        setKonamiProgress(0)
      }
    }

    document.addEventListener('keydown', keyDown)
    return () => document.removeEventListener('keydown', keyDown)
  }, [phase, konami, listening, gameDay])

  // Search, debounced 300 ms, the films already guessed left out
  const guessedIds = useMemo(() => attempts.filter((a) => a.type === 'guess').map((a) => a.film.id), [attempts])

  useEffect(() => {
    if (staged) {
      return
    }

    if (query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    let live = true
    const timer = setTimeout(() => search(query, guessedIds).then((found) => {
      if (live) {
        setResults(found)
        setOpen(found.length > 0)
        setActive(-1)
      }
    }), 300)
    return () => { live = false; clearTimeout(timer) }
  }, [query, staged, guessedIds])

  const select = (id, title) => {
    setStaged(id)
    setQuery(title)
    setOpen(false)
    setActive(-1)
  }

  const guess = async (filmId) => {
    if (submitting || phase !== 'playing' || guessedIds.includes(filmId)) {
      return
    }

    setSubmitting(true)
    setOpen(false)
    setQuery('')
    setStaged(null)

    try {
      const res = await submitGuess(filmId, attemptsUsed)
      const next = [...attempts, { type: 'guess', film: res.guessFilm, revealTier: attemptsUsed }]
      setState((s) => ({ ...s, attempts: next, phase: res.correct ? 'won' : next.length >= s.maxAttempts ? 'lost' : 'playing', mysteryFilm: res.mysteryFilm ?? s.mysteryFilm }))
      setPendingBar(attemptsUsed)
      setLastGuessIndex(attemptsUsed)
      setLastGuessResult(res.correct ? 'correct' : attemptsUsed + 1 >= maxAttempts ? 'lost' : 'wrong')
    } catch {
      setToast({ type: 'error', message: 'Something went wrong', at: Date.now() })
    } finally {
      setSubmitting(false)
    }
  }

  const skip = async () => {
    if (phase !== 'playing') {
      return
    }

    const willLose = attemptsUsed + 1 >= maxAttempts
    const next = [...attempts, { type: 'skip' }]
    setState((s) => ({ ...s, attempts: next, phase: willLose ? 'lost' : 'playing' }))
    setRevealTier(attemptsUsed + 1 + (konamiRef.current ? 1 : 0))

    // A loss by skipping reveals everything at once
    if (willLose) {
      setVictoryRevealed(true)
      const film = mysteryFilm ?? await revealMysteryFilm()
      setState((s) => ({ ...s, mysteryFilm: film }))
    }
  }

  const keyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (open && active >= 0 && results[active]) select(results[active].id, results[active].title)
      else if (staged !== null) guess(staged)
    } else if (event.key === 'Escape') {
      setOpen(false)
    } else if (open && results.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      setActive((index) => event.key === 'ArrowDown' ? Math.min(index + 1, results.length - 1) : Math.max(index - 1, -1))
    }
  }

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText(gameDay, attempts, phase === 'won', konamiRef.current))
      setToast({ type: 'success', message: 'Copied!', at: Date.now() })
    } catch {
      setToast({ type: 'error', message: 'Unable to copy', at: Date.now() })
    }
  }

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  // Confetti from the poster, at 40% of its height, behind it
  const fireConfetti = useCallback(() => {
    if (still() || !card.current || !confettiCanvas.current) {
      return
    }

    confetti.current ??= confettiOn(confettiCanvas.current)
    const band = root.current.getBoundingClientRect()
    const rect = card.current.getBoundingClientRect()
    const origin = { x: (rect.left - band.left + rect.width / 2) / band.width, y: (rect.top - band.top + rect.height * 0.4) / band.height }
    const palette = colors.current || ['#ff3021', '#fddd0f', '#59d045', '#32d8ff', '#ce1cff']
    const fire = (ratio, opts) => confetti.current({ ...opts, origin, colors: palette, particleCount: Math.floor(200 * ratio) })
    fire(0.25, { spread: 26, startVelocity: 55 })
    fire(0.2, { spread: 60 })
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    fire(0.1, { spread: 120, startVelocity: 45 })
  }, [])

  // The poster follows the tier, one pixel split per level; the victory cascade drives it on its own
  const targetPosterLevel = victoryRevealed ? 5 : Math.min(revealTier, 4)

  useEffect(() => {
    if (cascade || targetPosterLevel === basePosterLevel || !pixels.length) {
      return
    }

    if (still() || basePosterLevel > 4) {
      setBasePosterLevel(targetPosterLevel)
      return
    }

    setTransition({ coarse: pixels[basePosterLevel], fine: targetPosterLevel <= 4 ? pixels[targetPosterLevel] : null })
    setBasePosterLevel(targetPosterLevel)
  }, [targetPosterLevel, basePosterLevel, pixels, cascade])

  const advanceCascade = (queue, from) => {
    if (!queue.length) {
      setCascade(false)
      setPendingBar(null)

      if (correctBar.current !== null) {
        const index = correctBar.current
        setRevealingBar(index)
        later(() => setRevealingBar(null), 600)
        correctBar.current = null
      }

      fireConfetti()
      setRevealTier(7)
      setVictoryRevealed(true)
      return
    }

    const to = queue[0]
    cascadeQueue.current = queue
    setBasePosterLevel(to)
    to === 5 && setRevealTier(7)
    setTransition({ coarse: pixels[from], fine: to <= 4 ? pixels[to] : null })
  }

  const startVictoryCascade = () => {
    colors.current = pixels[1] ? confettiColors(pixels[1]) : null

    if (still()) {
      setBasePosterLevel(5)
      setRevealTier(7)
      fireConfetti()
      setVictoryRevealed(true)
      return
    }

    const queue = []
    for (let level = basePosterLevel + 1; level <= 5; level++) queue.push(level)

    if (!queue.length) {
      fireConfetti()
      setRevealTier(7)
      setVictoryRevealed(true)
      return
    }

    setCascade(true)
    advanceCascade(queue, basePosterLevel)
  }

  const transitionDone = () => {
    setTransition(null)
    const queue = cascadeQueue.current

    if (queue.length) {
      const [done, ...rest] = queue
      cascadeQueue.current = rest
      advanceCascade(rest, done)
    }
  }

  // The verdict lands on the mini card: the bar takes its colour, then the clues move on
  const onResult = (index) => () => {
    const result = lastGuessResult

    if (result === 'correct') {
      correctBar.current = index
      later(startVictoryCascade, 500)
      return
    }

    setPendingBar(null)
    setRevealingBar(index)
    later(() => setRevealingBar(null), 600)
    later(() => {
      setRevealTier(attemptsCount.current + (konamiRef.current ? 1 : 0))
      setLastGuessIndex(null)
      setLastGuessResult(null)
      result === 'lost' && later(() => setVictoryRevealed(true), 500)
    }, 1300)
  }

  // Similar films: their 4×6 posters, cleared all at once at their tier
  const similarRevealed = revealTier >= 4 || victoryRevealed
  const similarSources = useMemo(() => (mystery?.similarFilms ?? []).map((film) => film.posterUrlSmall), [mystery])
  const similarPixels = usePixelatedImages(similarSources, SIMILAR_GRID)

  useEffect(() => {
    if (similarRevealed && similarPhase === 'hidden') {
      const count = similarPixels.filter(Boolean).length
      similarCount.current = 0
      setSimilarPhase(count && !still() ? 'animating' : 'done')
    }
  }, [similarRevealed])

  const similarDone = () => {
    similarCount.current++
    similarCount.current >= similarPixels.filter(Boolean).length && setSimilarPhase('done')
  }

  const play = () => {
    setOnboardingLeaving(true)
    later(() => {
      write(ONBOARDING, true)
      setOnboarded(true)
    }, 400)
  }

  const tropes = useMemo(() => mystery ? topTropes(mystery.tropes) : null, [mystery])
  const castRevealed = revealTier >= 3 || victoryRevealed
  const crewRevealed = revealTier >= 2 || victoryRevealed
  const won = phase === 'won'
  const answer = mysteryFilm?.title
  const titleRevealed = revealTier >= 7 || victoryRevealed
  const titleText = titleRevealed && answer ? answer : mystery?.titleMask ?? 'Xxxxxx'
  const twins = new Map()
  results.forEach(({ title }) => twins.set(normalize(title), (twins.get(normalize(title)) ?? 0) + 1))
  const resultMode = victoryRevealed || phase === 'lost'

  const roundClass = (attempt, i) => {
    let className = 'cd__round'

    if (attempt) {
      if (attempt.type === 'guess') {
        className += pendingBar === i ? ' is-suspense' : won && i === attempts.length - 1 ? ' is-correct' : ' is-guess'
        if (revealingBar === i) className += ' is-revealing'
      } else {
        className += ' is-skip'
      }
    } else if (i === attemptsUsed && lastGuessIndex === null && !finished) {
      className += ' is-current'
    }

    return className
  }

  return (
    <article ref={root} className='band cd' aria-labelledby='cinetropes-daily'>
      <div className='cd__backdrop' aria-hidden='true'>
        {pixels[4] && <PixelGrid pixels={pixels[4]} className='cd__backdrop-image' />}
      </div>
      <canvas ref={confettiCanvas} className='cd__confetti' aria-hidden='true' />

      <header className='cd__nav'>
        <h3 id='cinetropes-daily' className='cd__nav-title'>Film of the day</h3>
        <div className='cd__nav-side'>
          <Tags items={['TypeScript', 'React', 'Canvas', 'Hono', 'Drizzle', 'sharp']} />
          {puzzle?.sample && (
            <p className='cd__sample' title='The beta’s API did not answer: this is daily #190, taken from the beta on 8 October 2026.'>
              <span>Sample data</span> <span className='cd__sample-text'>Daily #190 from the beta, 8 October 2026</span>
            </p>
          )}
        </div>
      </header>

      <div className='cd__banner'>
        <ol className='cd__rounds' aria-label='Attempts'>
          {Array.from({ length: maxAttempts }, (_, i) => {
            const attempt = attempts[i]
            const suspenseSlot = lastGuessIndex === i
            return (
              <li key={i} className={roundClass(attempt, i)}>
                {attempt?.type === 'guess' ? (
                  <div className='cd__slot is-filled'>
                    <HistoryCard
                      film={attempt.film}
                      suspense={suspenseSlot ? lastGuessResult : null}
                      overlayVisible={suspenseSlot && lastGuessResult === 'correct' ? victoryRevealed : undefined}
                      onResult={suspenseSlot ? onResult(i) : undefined}
                    />
                  </div>
                ) : (
                  <div className={attempt?.type === 'skip' ? 'cd__slot is-skip' : 'cd__slot'}>
                    {attempt?.type === 'skip' && <SkipIcon />}
                  </div>
                )}
                <div className='cd__round-bar' />
              </li>
            )
          })}
        </ol>
        <p className='cd__attempts' aria-live='polite'>
          {loading ? '—/6 attempts' : `${attemptsUsed}/${maxAttempts} attempts`}
        </p>
      </div>

      <div className='cd__body'>
        <div className='cd__card-area' ref={card}>
          <MysteryCard holo={victoryRevealed}>
            {basePosterLevel === 5 && mysteryFilm?.posterUrl && <img className='cd__poster' src={mysteryFilm.posterUrl} alt={answer ?? ''} width='500' height='750' />}
            {basePosterLevel < 5 && pixels[basePosterLevel] && <PixelGrid pixels={pixels[basePosterLevel]} className='cd__poster' />}
            {transition && <PixelSplit key={`${basePosterLevel}`} coarse={transition.coarse} fine={transition.fine} onComplete={transitionDone} className='cd__pixel-split' />}
          </MysteryCard>
        </div>

        <div className='cd__panel'>
          <h4 className='cd__film-title'>
            <PixelatedText text={titleText} revealed={!loading && titleRevealed && !!answer} resolution={1} fontSize={48} fontWeight={800} fontFamily="'Poppins', sans-serif" color='rgba(255, 255, 255, 0.95)'>
              <span>{answer}</span>
            </PixelatedText>
          </h4>

          {mystery && (
            <>
              <p className='cd__meta'>
                <span>{mystery.year}</span>
                <PixelatedText text={`  ${mystery.genres.map((g) => g.name).join(', ')}  ·  ${runtimeOf(mystery.runtime)}`} revealed={revealTier >= 1 || victoryRevealed} resolution={2} fontSize={13} color='rgba(255, 255, 255, 0.5)'>
                  <span className='cd__meta-rest'>
                    <i aria-hidden='true' />
                    <span>{mystery.genres.map((g) => g.name).join(', ')}</span>
                    <i aria-hidden='true' />
                    <span>{runtimeOf(mystery.runtime)}</span>
                  </span>
                </PixelatedText>
              </p>

              <p className='cd__director'>
                <PixelatedText text={`a film by ${mystery.director}`} revealed={revealTier >= 2 || victoryRevealed} resolution={2} fontSize={13} color='rgba(255, 255, 255, 0.5)'>
                  <span><span className='cd__director-prefix'>a film by </span><b>{mystery.director}</b></span>
                </PixelatedText>
              </p>

              <div className='cd__synopsis'>
                <PixelatedText text={mystery.overview} revealed={revealTier >= 5 || victoryRevealed} resolution={2} fontSize={13} color='rgba(255, 255, 255, 0.6)' block>
                  <p>{mystery.overview}</p>
                </PixelatedText>
              </div>

              <div className='cd__signature'>
                <Reception scores={mystery.scores} />
                <Atmosphere emotions={mystery.emotions} />
                <Tropes tropes={tropes} />
              </div>

              <div className='cd__accordion'>
                <Section id='casting' label='Casting' open={openSection === 'casting'} onToggle={setOpenSection}>
                  <ul className='cd__people'>
                    {mystery.castDetailed.slice(0, CAST_LIMIT).map((person) => (
                      <Person key={person.personId} name={person.name} role={person.character} imageUrl={person.imageUrl} revealed={castRevealed} hideRole={!victoryRevealed && mayBeTitle(person.character, mystery.titleMask)} />
                    ))}
                  </ul>
                </Section>
                <Section id='equipe' label='Crew' open={openSection === 'equipe'} onToggle={setOpenSection}>
                  <ul className='cd__people'>
                    {mystery.crewDetailed.filter((person) => CREW_JOBS.includes(person.job)).map((person) => (
                      <Person key={`${person.personId}-${person.job}`} name={person.name} role={person.job} imageUrl={person.imageUrl} revealed={crewRevealed} />
                    ))}
                  </ul>
                </Section>
                <Section id='similar' label='Similar' open={openSection === 'similar'} onToggle={setOpenSection}>
                  <ul className='cd__similar'>
                    {mystery.similarFilms.map((film, i) => (
                      <li key={film.id}>
                        <span className='cd__similar-poster'>
                          {similarPhase !== 'hidden' && <img src={film.posterUrlSmall} alt={similarPhase === 'done' ? `${film.title} (${film.year})` : ''} width='92' height='138' loading='lazy' />}
                          {similarPhase === 'hidden' && similarPixels[i] && <img className='is-pixelated' src={similarPixels[i].dataUrl} alt='' width='4' height='6' />}
                          {similarPhase === 'animating' && similarPixels[i] && <PixelSplit coarse={similarPixels[i].pixels} fine={null} onComplete={similarDone} className='cd__pixel-split' />}
                        </span>
                        <PixelatedText text={film.title} revealed={similarPhase !== 'hidden'} resolution={2} fontSize={12} fontWeight={500} color='rgba(255, 255, 255, 0.85)'>
                          <b>{film.title}</b>
                        </PixelatedText>
                        <PixelatedText text={String(film.year)} revealed={similarPhase !== 'hidden'} resolution={2} fontSize={11} color='rgba(255, 255, 255, 0.4)'>
                          <small>{film.year}</small>
                        </PixelatedText>
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>
            </>
          )}
        </div>
      </div>

      <div className='cd__dock'>
        <KonamiOverlay progress={konamiProgress} activated={konami} />
        <div className={resultMode ? 'cd__glass is-result' : 'cd__glass'}>
          <div className='cd__dock-header'>
            <img src={LOGO} alt='cinetropes' width='275' height='40' />
            <span className='cd__dock-daily'>#{loading ? '—' : gameDay}</span>
          </div>

          {konami && !victoryRevealed && phase !== 'lost' && (
            <div className='cd__konami-badge'>
              <span>+1 clue level</span>
              <svg viewBox='0 0 24 24' width='14' height='14' aria-hidden='true'><path d='M7 11l5 -5l5 5M7 17l5 -5l5 5' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' /></svg>
            </div>
          )}

          {(loading || phase === 'playing' || (won && !victoryRevealed)) && (
            <div className='cd__dock-action'>
              <div className='cd__input-area'>
                {open && results.length > 0 && (
                  <div id='cd-autocomplete' className='cd__autocomplete' role='listbox' aria-label='Film suggestions'>
                    {results.map((film, i) => (
                      <div
                        key={film.id}
                        id={`cd-option-${i}`}
                        role='option'
                        aria-selected={i === active}
                        className={i === active ? 'cd__option is-active' : 'cd__option'}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => select(film.id, film.title)}
                        onPointerEnter={() => setActive(i)}
                      >
                        <span className='cd__option-title'>{film.title}</span>
                        {twins.get(normalize(film.title)) > 1 && <span className='cd__option-year'>{film.subtitle}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <input
                  type='text'
                  className='cd__input'
                  placeholder={loading ? 'Loading...' : 'Guess the film...'}
                  value={loading ? '' : query}
                  onChange={(event) => { setQuery(event.target.value); setStaged(null) }}
                  onKeyDown={keyDown}
                  onFocus={() => results.length > 0 && staged === null && setOpen(true)}
                  onBlur={() => setOpen(false)}
                  disabled={loading || submitting || phase !== 'playing'}
                  role='combobox'
                  aria-expanded={open && results.length > 0}
                  aria-controls='cd-autocomplete'
                  aria-activedescendant={active >= 0 ? `cd-option-${active}` : undefined}
                  aria-autocomplete='list'
                  aria-label='Search for a film'
                />
              </div>
              {staged !== null
                ? <button type='button' className='cd__button' onClick={() => guess(staged)} disabled={submitting || phase !== 'playing'}>Send</button>
                : <button type='button' className='cd__button' onClick={skip} disabled={loading || submitting || phase !== 'playing'}>Skip</button>}
            </div>
          )}

          {resultMode && (
            <div className='cd__result'>
              <div className='cd__result-hero'>
                <h5 className='cd__result-title'><i>{won ? 'Won!' : 'Lost...'}</i></h5>
                <p className='cd__result-subtitle'>{won ? `${attempts.length}/${maxAttempts} attempts` : `${maxAttempts}/${maxAttempts} attempts used`}</p>
              </div>
              <div className='cd__result-bars'>
                {Array.from({ length: maxAttempts }, (_, i) => {
                  const attempt = attempts[i]
                  const kind = !attempt ? '' : attempt.type === 'skip' ? ' is-skip' : won && i === attempts.length - 1 ? ' is-correct' : ' is-guess'
                  return <div key={i} className={`cd__result-bar${kind}`} />
                })}
              </div>
              <button type='button' className='cd__button cd__share' onClick={share}>Share</button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div key={toast.at} className={`cd__toast is-${toast.type}`} role='status' aria-live='polite'>
          <span className='cd__toast-icon' aria-hidden='true'>
            <svg viewBox='0 0 24 24'><path d={toast.type === 'success' ? 'M5 12l5 5l10 -10' : 'M18 6l-12 12M6 6l12 12'} fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' /></svg>
          </span>
          <p>{toast.message}</p>
          <button type='button' className='cd__toast-close' aria-label='Close the notification' onClick={() => setToast(null)}>
            <svg viewBox='0 0 24 24' width='14' height='14' aria-hidden='true'><path d='M18 6l-12 12M6 6l12 12' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' /></svg>
          </button>
          <span className='cd__toast-progress' aria-hidden='true' />
        </div>
      )}

      {!onboarded && (
        <div className={onboardingLeaving ? 'cd__onboarding is-leaving' : 'cd__onboarding'}>
          <div className='cd__onboarding-content'>
            <p className='cd__hero-title'><i>Guess<br />the Film of the Day</i></p>
            <p className='cd__hero-subtitle'>
              Can you recognise today’s film simply<br />from its tropes, its atmosphere and its ratings?
              <br /><br />
              You have 6 attempts to find it: with each miss,<br />another clue is revealed.
            </p>
            <button type='button' className='cd__button cd__play' onClick={play}>Play</button>
          </div>
        </div>
      )}
    </article>
  )
}
