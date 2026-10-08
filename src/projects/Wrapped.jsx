import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Links, Tags } from './shared'
import { sheetsOf, t } from './wrapped/sheets'
import share from './wrapped/share.json'
import './wrapped.css'

// Alex's year, the wrapped of sensorr's public demo, as its API answers it
const DEMO = 'https://thcolin.github.io/sensorr/demo/wrapped/demo/'

// The five looks of apps/wrapped, each a story module with its own sheet and fonts, loaded when first shown
const LOADERS = {
  tele: () => import('./wrapped/themes/tele/Story'),
  labo: () => import('./wrapped/themes/labo/Story'),
  videoclub: () => import('./wrapped/themes/videoclub/Story'),
  scenario: () => import('./wrapped/themes/scenario/Story'),
  affiche: () => import('./wrapped/themes/affiche/Story'),
}
const STORIES = Object.fromEntries(Object.entries(LOADERS).map(([id, loader]) => [id, lazy(loader)]))
const LOOKS = Object.keys(LOADERS)

// As `demo.art` in apps/wrapped: every poster of the demo is TMDB's
const SIZES = { 320: 'w342', 640: 'w780', 1280: 'w1280' }
const art = (item, kind = 'thumb', width = 640) => item[kind] ? `https://image.tmdb.org/t/p/${SIZES[width]}${item[kind]}` : undefined

const { sheets, colophon, closed } = sheetsOf(share)
const stories = [...sheets, { kind: 'summary', label: t('wrapped.title', { name: share.name, year: share.year }) }]

// The size every story is composed at, as in apps/wrapped, and the segments above it and the bar under it
const STORY = { width: 396, height: 704 }
const CHROME = { top: 24, bottom: 64 }
// The phone's bezel, on each side
const BEZEL = 10

// The phone shrinks with the column, never with the story it shows. On desktop the band is one screen high, and the
// phone fits the height left under it, its badge included
const DESKTOP = '(min-width: 901px)'
const BADGE = 40

const useScale = (ref) => {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const element = ref.current

    if (!element || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const tall = matchMedia(DESKTOP).matches ? (height - BADGE - CHROME.top - CHROME.bottom - BEZEL * 2) / STORY.height : 1
      setScale(Math.max(0.1, Math.min(1, (width - BEZEL * 2) / STORY.width, tall)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return scale
}

// The first look loads a screen before the band shows
const useNear = (ref) => {
  const [near, setNear] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (!element || typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNear(true)
        observer.disconnect()
      }
    }, { rootMargin: '100% 0px' })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return near
}

// The look switch of apps/wrapped, `Switch` in Wrapped.tsx, here on every story
const Switch = ({ theme, onChoose }) => (
  <label className='theme-switch'>
    <span>{t('wrapped.switch.start')}</span>
    <select name='theme' value={theme} onChange={(event) => onChoose(event.target.value)}>
      {LOOKS.map((id) => <option key={id} value={id}>{t(`wrapped.themes.${id}`)}</option>)}
    </select>
    <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M7 10l5 5 5-5' /></svg>
  </label>
)

// `Stories` of apps/wrapped in a phone of fixed size: tap a side, swipe, or the arrow keys once the story has focus
const Stories = ({ index, onIndex, label, scale, bar, children }) => {
  const count = stories.length
  const frame = useRef(null)
  const shown = useRef(index)
  const swipe = useRef(null)

  // The story that comes is read next, wherever focus was in the phone
  useEffect(() => {
    if (shown.current !== index) {
      shown.current = index
      frame.current?.closest('.stories')?.contains(document.activeElement) && frame.current.focus({ preventScroll: true })
    }
  }, [index])

  const step = (by) => {
    const next = index + by
    next >= 0 && next < count && onIndex(next)
  }

  const keydown = (event) => {
    if (event.target instanceof HTMLSelectElement) {
      return
    }

    const by = { ArrowRight: 1, ArrowLeft: -1 }[event.key]

    if (by) {
      event.preventDefault()
      step(by)
    }
  }

  const down = (event) => (swipe.current = { x: event.clientX, y: event.clientY, moved: false })
  const up = (event) => {
    if (!swipe.current) {
      return
    }

    const [x, y] = [event.clientX - swipe.current.x, event.clientY - swipe.current.y]

    // A horizontal drag turns the page, and keeps the tap zone under it from turning it again
    if (Math.abs(x) > 40 && Math.abs(x) > Math.abs(y)) {
      swipe.current.moved = true
      step(x < 0 ? 1 : -1)
    }
  }
  const tap = (by) => () => {
    swipe.current?.moved || step(by)
    swipe.current = null
  }

  return (
    <div
      className='stories'
      onKeyDown={keydown}
      style={{ '--scale': scale, '--story-width': `${STORY.width}px`, '--story-height': `${STORY.height}px` }}
    >
      <div className='stories-stage'>
        <ol className='stories-segments' aria-hidden='true'>
          {stories.map((_, at) => <li key={at} data-done={at < index || undefined} data-current={at === index || undefined} />)}
        </ol>
        <div
          ref={frame}
          className='stories-frame'
          role='group'
          tabIndex={0}
          aria-roledescription='story'
          aria-label={t('wrapped.stories.position', { index: index + 1, count, label })}
          onPointerDown={down}
          onPointerUp={up}
        >
          <div className='stories-page'>{children}</div>
          {/* Touch zones over the page, kept away from screen readers exploring it: the bar has the same steps as buttons */}
          <button type='button' className='stories-tap stories-tap-previous' tabIndex={-1} aria-hidden='true' disabled={index === 0} onClick={tap(-1)} />
          <button type='button' className='stories-tap stories-tap-next' tabIndex={-1} aria-hidden='true' disabled={index === count - 1} onClick={tap(1)} />
        </div>
        <div className='stories-bar'>
          <button type='button' className='stories-step' aria-disabled={index === 0} onClick={() => step(-1)}>{t('wrapped.stories.previous')}</button>
          {bar}
          <button type='button' className='stories-step' aria-disabled={index === count - 1} onClick={() => step(1)}>{t('wrapped.stories.next')}</button>
        </div>
      </div>
    </div>
  )
}

export const Wrapped = () => {
  const demo = useRef(null)
  const near = useNear(demo)
  const scale = useScale(demo)
  const [theme, setTheme] = useState(share.look.theme)
  const [index, setIndex] = useState(0)
  const Story = STORIES[theme]
  const story = stories[index]

  // Loaded first, so the phone never shows the new look's colours without its story
  const choose = async (next) => {
    try {
      await LOADERS[next]()
    } catch (error) {
      console.error(`Unable to load the "${next}" look`, error)
      return
    }

    setTheme(next)
  }

  return (
    <article className='band wrapped' data-look={theme} aria-labelledby='wrapped'>
      <div className='band__column band__split band__split--reverse'>
        <div className='band__text'>
          <h3 id='wrapped' className='wrapped__title'>Sensorr Wrapped</h3>
          <p className='wrapped__tagline'>A wrapped for every friend, every year.</p>
          <p className='band__body'>
            Friends link their Plex account to sensorr. Each year, Tautulli’s watch history gives them a wrapped of their year on your server, in five looks, in English and French.
          </p>
          <p className='wrapped__sample'>
            Sample data: Alex’s {share.year}, from sensorr’s public demo. Tap or swipe the story, or focus it and use the arrow keys.
          </p>
          <Tags items={['React', 'TypeScript', 'framer-motion', 'WebGL', 'i18next']} />
          <Links links={[['Demo', DEMO], ['GitHub', 'https://github.com/thcolin/sensorr/tree/main/apps/wrapped']]} />
        </div>
        <div ref={demo} className='band__demo wrapped__demo'>
          <div
            className='wrapped__phone'
            style={{
              width: `${STORY.width * scale + BEZEL * 2}px`,
              height: `${STORY.height * scale + CHROME.top + CHROME.bottom + BEZEL * 2}px`,
            }}
          >
            <div className='wrapped__look' data-theme={theme}>
              <Stories index={index} onIndex={setIndex} label={story.label} scale={scale} bar={<Switch theme={theme} onChoose={choose} />}>
                {near && (
                  <Suspense fallback={null}>
                    <Story key={`${theme}-${index}`} story={story} index={index} share={share} sheets={sheets} colophon={colophon} closed={closed} art={art} />
                  </Suspense>
                )}
              </Stories>
            </div>
          </div>
          <p className='wrapped__badge' aria-hidden='true'>Sample data</p>
        </div>
      </div>
    </article>
  )
}
