import { Component, Suspense, lazy } from 'react'
import './intros/intros.css'

const intro = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })))

export const INTROS = {
  snes: intro(() => import('./intros/SnesIntro.jsx'), 'SnesIntro'),
  n64: intro(() => import('./intros/N64Intro.jsx'), 'N64Intro'),
  gba: intro(() => import('./intros/GbaIntro.jsx'), 'GbaIntro'),
  gamecube: intro(() => import('./intros/GamecubeIntro.jsx'), 'GamecubeIntro'),
  ps1: intro(() => import('./intros/Ps1Intro.jsx'), 'Ps1Intro'),
  ps2: intro(() => import('./intros/Ps2Intro.jsx'), 'Ps2Intro'),
  psp: intro(() => import('./intros/PspIntro.jsx'), 'PspIntro'),
  moonlight: intro(() => import('./intros/MoonlightIntro.jsx'), 'MoonlightIntro'),
}

export const POSTERS = {
  snes: new URL('../../assets/teevy/intros/snes.jpg', import.meta.url),
  n64: new URL('../../assets/teevy/intros/n64.jpg', import.meta.url),
  gba: new URL('../../assets/teevy/intros/gba.jpg', import.meta.url),
  gamecube: new URL('../../assets/teevy/intros/gamecube.jpg', import.meta.url),
  ps1: new URL('../../assets/teevy/intros/ps1.jpg', import.meta.url),
  ps2: new URL('../../assets/teevy/intros/ps2.jpg', import.meta.url),
  psp: new URL('../../assets/teevy/intros/psp.jpg', import.meta.url),
  moonlight: new URL('../../assets/teevy/intros/moonlight.jpg', import.meta.url),
}

const Poster = ({ id }) => <img className='teevy-boot__poster' src={POSTERS[id]} alt='' width='640' height='480' loading='lazy' />

// Without WebGL, a three.js boot screen leaves its still
class Fallback extends Component {
  state = { failed: false }

  static getDerivedStateFromError () {
    return { failed: true }
  }

  render () {
    return this.state.failed ? <Poster id={this.props.id} /> : this.props.children
  }
}

export const IntroChannel = ({ id, run, playing, onDone }) => {
  const Intro = INTROS[id]

  return (
    <div className='teevy-boot' data-console={id}>
      <span className='teevy-boot__zone' aria-hidden='true' />
      {playing
        ? (
          <Fallback key={`${id}-${run}`} id={id}>
            <Suspense fallback={<Poster id={id} />}>
              <Intro onDone={onDone} />
            </Suspense>
          </Fallback>
          )
        : <Poster id={id} />}
    </div>
  )
}
