import { useEffect, useRef, useState } from 'react'
import { Links, Tags } from './shared'
import { Nipper } from './archived/Nipper'
import { Boaty } from './archived/Boaty'
import { Quicklook } from './archived/Quicklook'
import { SceneRelease } from './archived/SceneRelease'
import { SensCritique } from './archived/SensCritique'
import './archived.css'

// The faces each project was drawn with: nipper's Titillium Web, the Chrome popup's Roboto, SensCritique's condensed menu
const FONTS = 'https://fonts.googleapis.com/css2?family=Titillium+Web:ital,wght@0,400;0,700;0,900;1,200;1,300&family=Roboto:wght@400;500;700&family=Oswald:wght@400&display=swap'

const PROJECTS = [
  {
    id: 'nipper',
    title: '🌶 💽 nipper',
    years: '2017 – 2018',
    text: 'YouTube playlist and video ripper. Fixes the metadata, picks the codec and converts in the browser with ffmpeg.js, then downloads one by one or zipped.',
    tags: ['JavaScript', 'React', 'Redux', 'ffmpeg.js'],
    Demo: Nipper,
    sample: true,
  },
  {
    id: 'boaty',
    title: '🌊 ⛴️ boaty',
    years: '2018',
    text: 'A peer-to-peer boat for the terminal, a client meant to sail on WebTorrent and Dat.',
    tags: ['JavaScript', 'react-blessed', 'WebTorrent'],
    Demo: Boaty,
    sample: true,
  },
  {
    id: 'chrome-download-quicklook-extension',
    title: '💾 🔭 chrome-download-quicklook-extension',
    years: '2018',
    text: 'A Chrome extension for a quick look at your downloads, in Material Design.',
    tags: ['JavaScript', 'choo', 'Chrome extension'],
    Demo: Quicklook,
    sample: true,
  },
  {
    id: 'scene-release-parser-php',
    title: 'scene-release-parser-php',
    years: '2015 – 2018',
    text: 'PHP library that parses a scene release name into its title and tags.',
    tags: ['PHP', 'Composer'],
    Demo: SceneRelease,
  },
  {
    id: 'senscritique-api',
    title: 'senscritique-api',
    years: '2016 – 2017',
    text: 'PHP client for the SensCritique website, through curl and DOM parsing.',
    tags: ['PHP', 'Composer'],
    Demo: SensCritique,
  },
]

// Breaks the long names at their dashes
const breakable = (title) => title.split('-').flatMap((part, index) => index ? ['-', <wbr key={index} />, part] : [part])

// Asleep until looked at: hovered or focused, or on a touch screen, its demo mostly in view
const useAwake = () => {
  const ref = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (!element || typeof IntersectionObserver === 'undefined' || matchMedia('(hover: hover)').matches) {
      return
    }

    const observer = new IntersectionObserver(([entry]) => setSeen(entry.isIntersecting), { threshold: 0.6 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const handlers = {
    onPointerEnter: (event) => event.pointerType === 'mouse' && setHovered(true),
    onPointerLeave: (event) => event.pointerType === 'mouse' && setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: (event) => !event.currentTarget.contains(event.relatedTarget) && setFocused(false),
  }

  return [ref, hovered || focused || seen, handlers]
}

const Band = ({ id, title, years, text, tags, Demo, sample, index }) => {
  const [ref, awake, handlers] = useAwake()

  return (
    <article
      className={`band archived archived--${id} ${index % 2 ? 'archived--right' : 'archived--left'}`}
      data-awake={awake}
      aria-labelledby={`archived-${id}`}
      {...handlers}
    >
      <div className='archived__panel'>
        <h3 id={`archived-${id}`} className='archived__title'>{breakable(title)}</h3>
        <p className='band__body'>{text}</p>
        <p className='archived__years'>{years}</p>
        <Tags items={tags} />
        <Links links={[['GitHub', `https://github.com/thcolin/${id}`]]} />
      </div>
      <div ref={ref} className='archived__stage'>
        <Demo awake={awake} />
        {sample && <span className='archived__sample'>Sample data</span>}
      </div>
    </article>
  )
}

export const Archived = () => {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS}"]`)) {
      return
    }

    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS })
    document.head.append(link)
  }, [])

  return PROJECTS.map((project, index) => <Band key={project.id} index={index} {...project} />)
}
