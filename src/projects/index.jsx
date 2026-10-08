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

const Projects = () => (
  <>
    <Group id='released' title='released'>
      <Sensorr />
      <Wrapped />
      <Gmca />
      <Oleoo />
      <Grid />
    </Group>
    <Group id='soon' title='coming soon'>
      <Cinetropes />
      <CinetropesGame />
      <CinetropesDaily />
    </Group>
    <Group id='nfr' title='not for release'>
      <Teevy />
      <Workflow />
    </Group>
    <Group id='printing' title='3d printing'>
      <Printing />
    </Group>
    <Group id='archived' title='archived'>
      <Archived />
    </Group>
  </>
)

createRoot(document.getElementById('projects')).render(<Projects />)
