import { useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../shared'
import { useTick } from './tick'
import './quicklook.css'

// chrome-download-quicklook-extension 1.0.3 (thcolin/chrome-download-quicklook-extension): the choo popup
// (toolbar, list, card, placeholder) ported to React, in a Chrome window of February 2018. The background
// script's icon draws the global progress; the downloads are simulated, chrome.downloads is not there.

const PLACEHOLDER = new URL('./quicklook-placeholder.png', import.meta.url)
const MIO = 1024 * 1024

const FILES = [
  ['1Mio.dat', MIO],
  ['10Mio.dat', 10 * MIO],
  ['100Mio.dat', 100 * MIO],
  ['1Gio.dat', 1024 * MIO],
  ['10Gio.dat', 10240 * MIO],
]

const URL_OF = (name) => `http://www.ovh.net/files/${name}`

// Material icons, the ones the popup names
const PATHS = {
  subject: 'M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z',
  search: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  cancel: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
  delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  file: 'M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z',
  clear: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  forward: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
  reload: 'M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
  info: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  star: 'M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
  more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
}

const Icon = ({ name, className }) => (
  <svg viewBox='0 0 24 24' width='24' height='24' className={className} aria-hidden='true'><path fill='currentColor' d={PATHS[name]} /></svg>
)

// src/background.js icon(): the arrow and its meter, blue while something downloads
const Badge = ({ progress }) => (
  <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true'>
    <polygon fill={progress ? '#3367d6' : '#666666'} points='21.884692 8.472682 16.236297 8.472682 16.236297 8.9e-05 7.763704 8.9e-05 7.763704 8.472682 2.115309 8.472682 12.000001 18.357374 21.884693 8.472682' />
    <rect fill={progress ? '#b3b3b3' : '#666666'} x='0.7' y='21.2' width='22.6' height='2.8' />
    <rect fill='#3367d6' x='0.7' y='21.2' width={progress / (100 / 22.6)} height='2.8' />
  </svg>
)

// components/card.js dhumanize and bhumanize
const dhumanize = (milliseconds) => {
  let seconds = Math.floor(milliseconds / 1000)
  let minutes = Math.floor(seconds / 60)
  let hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  seconds = (seconds % 60) || 1
  minutes = minutes % 60
  hours = hours % 24

  if (days) return `${days} days`
  if (hours) return `${hours} hours`
  if (minutes) return `${minutes} min`
  return `${seconds} s`
}

const bhumanize = (bytes, suffix = '') => {
  const e = (Math.log(bytes) / Math.log(1e3)) | 0
  return `${+((bytes || 0) / Math.pow(1e3, e)).toFixed(2)} ${'kMGTPEZY'[e - 1] || ''}o${suffix}`
}

let next = 100

const download = (name, total, patch = {}) => ({
  id: next++,
  url: URL_OF(name),
  filename: `/Users/me/Downloads/${name}`,
  totalBytes: total,
  bytesReceived: 0,
  speed: 0,
  state: 'in_progress',
  paused: false,
  exists: true,
  ...patch,
})

const initial = () => [
  download('100Mio.dat', 100 * MIO, { bytesReceived: 12.76e6, speed: 190.26e3 }),
  download('10Mio.dat', 10 * MIO, { state: 'complete', bytesReceived: 10 * MIO }),
  download('1Mio.dat', MIO, { state: 'complete', bytesReceived: MIO, exists: false }),
  download('1Gio.dat', 1024 * MIO, { state: 'interrupted', bytesReceived: 0 }),
]

const statusOf = (item) => item.state === 'in_progress' ? (item.paused ? 'paused' : 'ongoing') : item.state

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const Card = ({ item, onAction }) => {
  const name = String(item.filename || item.url).split('/').pop()
  const status = statusOf(item)
  const active = ['ongoing', 'paused'].includes(status)
  const remaining = item.speed ? ((item.totalBytes - item.bytesReceived) / item.speed) * 1000 : 0

  return (
    <li className={status === 'interrupted' ? 'cdqe-card is-interrupted' : 'cdqe-card'}>
      <div className='cdqe-card__icon'>
        <Icon name='file' />
      </div>
      <div className='cdqe-card__details'>
        <div className='cdqe-card__title'>
          <p title={name} className={status === 'ongoing' ? 'cdqe-card__name is-active' : 'cdqe-card__name'}>{name}</p>
          <span className='cdqe-card__state'>{status}</span>
        </div>
        <a href={item.url} title={item.url} className='cdqe-card__link' onClick={(event) => event.preventDefault()}>{item.url}</a>
        <div className='cdqe-card__progress'>
          {status === 'ongoing' && <span>{bhumanize(item.speed, '/s')} - </span>}
          {active && <span>{bhumanize(item.bytesReceived)} of {bhumanize(item.totalBytes)}</span>}
          {status === 'ongoing' && <span>, {dhumanize(remaining)}</span>}
          {active && (
            <div className='cdqe-card__meter' role='progressbar' aria-label={`${name} progress`} aria-valuenow={Math.round((item.bytesReceived / item.totalBytes) * 100)}>
              <span style={{ width: `${(item.bytesReceived / item.totalBytes) * 100}%` }} />
            </div>
          )}
        </div>
        <div className='cdqe-card__actions'>
          {active && (item.paused
            ? <button type='button' className='cdqe-action is-active' onClick={() => onAction('resume', item)}>resume</button>
            : <button type='button' className='cdqe-action is-active' onClick={() => onAction('pause', item)}>pause</button>)}
          {active && <button type='button' className='cdqe-action' onClick={() => onAction('stop', item)}>stop</button>}
          {status === 'interrupted' && <button type='button' className='cdqe-action' onClick={() => onAction('retry', item)}>retry</button>}
          {status === 'complete' && item.exists && <button type='button' className='cdqe-action' onClick={() => onAction('show', item)}>show</button>}
          {status === 'complete' && item.exists && <button type='button' className='cdqe-action' onClick={() => onAction('open', item)}>open</button>}
          {status === 'complete' && !item.exists && <button type='button' className='cdqe-action' onClick={() => onAction('redo', item)}>redo</button>}
        </div>
      </div>
      <button type='button' title='Remove' aria-label={`Remove ${name}`} className='cdqe-card__remove' onClick={() => onAction('remove', item)}>
        <Icon name='clear' />
      </button>
    </li>
  )
}

export const Quicklook = ({ awake }) => {
  const reduced = usePrefersReducedMotion()
  const timer = useRef(0)
  const [items, setItems] = useState(initial)
  const [input, setInput] = useState('')
  const [popup, setPopup] = useState(true)
  const [tab, setTab] = useState('files')
  const [bubble, setBubble] = useState(null)

  const ongoing = items.filter((item) => item.state === 'in_progress' && !item.paused)
  const running = items.filter((item) => item.state === 'in_progress')
  const progress = running.length ? Math.ceil(running.reduce((total, item) => total + (item.bytesReceived / item.totalBytes) * 100, 0) / running.length) : 0

  // The background script polls chrome.downloads every second; here the bytes arrive on their own
  useTick(() => {
    setItems((current) => current.map((item) => {
      if (item.state !== 'in_progress' || item.paused) {
        return item
      }

      const speed = Math.max(140e3, Math.min(3.2e6, (item.speed || 900e3) * (0.82 + Math.random() * 0.4)))
      const bytesReceived = Math.min(item.totalBytes, item.bytesReceived + speed / 2)

      return bytesReceived >= item.totalBytes
        ? { ...item, bytesReceived, speed: 0, state: 'complete' }
        : { ...item, bytesReceived, speed }
    }))
  }, 500, awake && !reduced && ongoing.length > 0)

  const say = (text) => {
    setBubble(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setBubble(null), 2600)
  }

  const start = (name, total) => {
    setItems((current) => [download(name, total, reduced ? { bytesReceived: total, state: 'complete' } : { speed: 600e3 }), ...current])
    setPopup(true)
  }

  const action = (type, item) => {
    const name = item.filename.split('/').pop()
    const alter = (patch) => setItems((current) => current.map((other) => other.id === item.id ? { ...other, ...patch } : other))

    switch (type) {
      case 'pause': return alter({ paused: true, speed: 0 })
      case 'resume': return alter({ paused: false, speed: 400e3 })
      case 'stop': return alter({ state: 'interrupted', paused: false, speed: 0 })
      case 'remove': return setItems((current) => current.filter((other) => other.id !== item.id))
      case 'show': return say(`chrome.downloads.show: ${name} in its folder`)
      case 'open': return say(`chrome.downloads.open: ${name}`)
      default: return start(name, item.totalBytes)
    }
  }

  const regexp = new RegExp(escape(input), 'gi')
  const results = items.filter((item) => !input || item.url.match(regexp) || item.filename.split('/').pop().match(regexp))

  return (
    <div className='cdqe'>
      <div className='cdqe-chrome'>
        <div className='cdqe-chrome__tabs'>
          <span className='cdqe-chrome__lights' aria-hidden='true'><i /><i /><i /></span>
          <div className='cdqe-chrome__strip' role='tablist' aria-label='Tabs'>
            <button type='button' role='tab' aria-selected={tab === 'files'} className='cdqe-tab' onClick={() => setTab('files')}>Index of /files</button>
            {tab === 'downloads' && <button type='button' role='tab' aria-selected className='cdqe-tab'>Downloads</button>}
          </div>
        </div>
        <div className='cdqe-chrome__toolbar'>
          <Icon name='back' className='cdqe-chrome__nav' />
          <Icon name='forward' className='cdqe-chrome__nav is-off' />
          <Icon name='reload' className='cdqe-chrome__nav' />
          <div className='cdqe-chrome__omnibox'>
            <Icon name='info' />
            <span>{tab === 'files' ? <><span className='is-dim'>www.ovh.net</span>/files/</> : 'chrome://downloads'}</span>
            <Icon name='star' className='cdqe-chrome__star' />
          </div>
          <button
            type='button'
            className={popup ? 'cdqe-chrome__extension is-open' : 'cdqe-chrome__extension'}
            title='A quicklook on your downloads ?'
            aria-label='Chrome Download Quicklook Extension'
            aria-expanded={popup}
            onClick={() => setPopup(!popup)}
          >
            <Badge progress={progress} />
          </button>
          <Icon name='more' className='cdqe-chrome__nav' />
        </div>
      </div>
      <div className='cdqe-page'>
        {tab === 'files' ? (
          <div className='cdqe-index'>
            <p className='cdqe-index__title'>Index of /files</p>
            <p>Test files, click one to download it.</p>
            <ul>
              {FILES.map(([name, total]) => (
                <li key={name}>
                  <a href={URL_OF(name)} onClick={(event) => { event.preventDefault(); start(name, total) }}>{name}</a>
                  <span>{bhumanize(total)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className='cdqe-downloads'>
            <p className='cdqe-downloads__title'>Downloads</p>
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <strong>{item.filename.split('/').pop()}</strong>
                  <span>{item.url}</span>
                  <em>{statusOf(item)}</em>
                </li>
              ))}
            </ul>
          </div>
        )}
        {bubble && <p className='cdqe-bubble' role='status'>{bubble}</p>}
      </div>
      {popup && (
        <div className='cdqe-popup' role='dialog' aria-label='Download Manager'>
          <div className='cdqe-toolbar'>
            <button type='button' title='Open Downloads' aria-label='Open Downloads' className='cdqe-toolbar__button' onClick={() => setTab('downloads')}>
              <Icon name='subject' />
            </button>
            <div className='cdqe-toolbar__search'>
              <Icon name='search' className='cdqe-toolbar__loupe' />
              <input type='text' value={input} placeholder='Search downloads' aria-label='Search downloads' onChange={(event) => setInput(event.target.value)} />
              {!!input.length && (
                <button type='button' aria-label='Clear the search' className='cdqe-toolbar__cancel' onClick={() => setInput('')}>
                  <Icon name='cancel' />
                </button>
              )}
            </div>
            <button type='button' title='Clear All' aria-label='Clear All' className='cdqe-toolbar__button' onClick={() => setItems([])}>
              <Icon name='delete' />
            </button>
          </div>
          <div className='cdqe-list'>
            {results.length ? (
              <ul className='cdqe-list__container'>
                {results.map((item) => <Card key={item.id} item={item} onAction={action} />)}
              </ul>
            ) : (
              <div className='cdqe-placeholder'>
                <img src={PLACEHOLDER} width='237' height='289' alt='' loading='lazy' />
                <p className='cdqe-placeholder__title'>{input ? 'No search results found' : 'Nothing to see here...'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
