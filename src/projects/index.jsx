import { createRoot } from 'react-dom/client'
import { Group } from './shared'
import { Sensorr } from './Sensorr'
import { Gmca } from './Gmca'
import { Oleoo } from './Oleoo'
import { Grid } from './Grid'
import './projects.css'

const Projects = () => (
  <>
    <Group id='released' title='released'>
      <Sensorr />
      <Gmca />
      <Oleoo />
      <Grid />
    </Group>
  </>
)

createRoot(document.getElementById('projects')).render(<Projects />)
