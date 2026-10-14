import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Group } from './shared'
import { Sensorr } from './Sensorr'
import { Wrapped } from './Wrapped'
import { Gmca } from './Gmca'
import { Oleoo } from './Oleoo'
import { Grid } from './Grid'
import { Cinetropes } from './Cinetropes'
import { CinetropesGame } from './CinetropesGame'
import { CinetropesDaily } from './CinetropesDaily'
import { Teevy } from './Teevy'
import { Workflow } from './Workflow'
import { Printing } from './Printing'
import { Archived } from './Archived'
import './projects.css'

const Projects = () => {
  // The bands only exist once rendered, so a link to one lands after the first render
  useEffect(() => {
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' })
  }, [])

  // The address follows the scroll: the hash of the last band or group whose top has passed the upper third
  useEffect(() => {
    let frame = 0

    // Read at each frame: the lower bands mount later
    const render = () => {
      frame = 0
      const targets = [...document.querySelectorAll('#projects a.anchor')].map((anchor) => document.getElementById(anchor.hash.slice(1))).filter(Boolean)
      const current = targets.filter((target) => target.getBoundingClientRect().top <= innerHeight / 3)
        .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0]
      const hash = current ? `#${current.id}` : ''

      if (hash !== location.hash) {
        history.replaceState(null, '', hash || location.pathname + location.search)
      }
    }
    const schedule = () => {
      frame ||= requestAnimationFrame(render)
    }

    addEventListener('scroll', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', schedule)
    }
  }, [])

  // Umami: the bands a visitor reaches, and the links they leave by
  useEffect(() => {
    const track = (name) => window.umami?.track(name)

    const seen = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          seen.unobserve(entry.target)
          track(`project: ${entry.target.hash.slice(1)}`)
        }
      }
    })
    document.querySelectorAll('#projects a.anchor').forEach((anchor) => {
      if (!anchor.closest('.group__screen')) {
        seen.observe(anchor)
      }
    })

    const click = (event) => {
      const link = event.target.closest('a[target=_blank]')

      if (link && !link.dataset.umamiEvent) {
        track(`link: ${link.closest('[id]')?.id ?? 'header'} · ${link.textContent.trim() || link.hostname}`)
      }
    }
    addEventListener('click', click)

    return () => {
      seen.disconnect()
      removeEventListener('click', click)
    }
  }, [])

  return (
    <>
      <Group id='released' title='released' phrase='Public, open source, try them below.' projects={['sensorr', 'sensorr wrapped', 'gmca', 'oleoo', 'react-responsive-virtual-grid']}>
        <Sensorr />
        <Wrapped />
        <Gmca />
        <Oleoo />
        <Grid />
      </Group>
      <Group id='coming-soon' title='coming soon' phrase='In beta, opening soon.' projects={['cinetropes', 'cinetropes meta-game', 'cinetropes daily']}>
        <Cinetropes />
        <CinetropesGame />
        <CinetropesDaily />
      </Group>
      <Group id='not-for-release' title='not for release' phrase='Built for me. No repo, no download.' projects={['teevy', 'workflow & obsidian']}>
        <Teevy />
        <Workflow />
      </Group>
      <Group id='3d-printing' title='3d printing' phrase='Parts I designed and printed.' projects={['top-fan', 'nas']}>
        <Printing />
      </Group>
      <Group id='archived' title='archived' phrase='Old projects, no longer maintained.' projects={['nipper', 'boaty', 'chrome-download-quicklook-extension', 'scene-release-parser-php', 'senscritique-api']}>
        <Archived />
      </Group>
    </>
  )
}

createRoot(document.getElementById('projects')).render(<Projects />)
