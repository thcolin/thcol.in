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
