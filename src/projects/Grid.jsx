import { useCallback, useEffect, useRef, useState } from 'react'
import ResponsiveVirtualGrid from 'react-responsive-virtual-grid'
import { Links, Tags, useReveal } from './shared'

const CELLS = 10000
const SHADES = ['#e3e3e3', '#ccc', '#e6e6e6', '#b0b0b0', '#e3e3e3', '#f2f2f2', '#ccc']

const SNIPPET = `import VirtualGrid
  from 'react-responsive-virtual-grid'

<VirtualGrid
  total={${CELLS}}
  cell={{ height: 64, width: 64 }}
  child={Cell}
  scrollContainer={frame}
/>`

const Cell = ({ style, index }) => (
  <div style={style} className='grid__cell'>
    <span style={{ backgroundColor: SHADES[index % SHADES.length] }}>{index + 1}</span>
  </div>
)

export const Grid = () => {
  const [frame, setFrame] = useState(null)
  const [rendered, setRendered] = useState(0)
  const [ref, shown] = useReveal()
  const raf = useRef(0)

  // The grid calls it while it renders: the count waits for the next frame
  const onRender = useCallback((children) => {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => setRendered(children.length))
  }, [])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return (
    <article className='band grid' aria-labelledby='grid'>
      <div ref={ref} className='band__column band__split band__split--reverse'>
        <div className='band__text'>
          <h3 id='grid' className='grid__title'>
            <span aria-hidden='true'>💀🚟</span>
            <span>react-<wbr />responsive-<wbr />virtual-<wbr />grid</span>
          </h3>
          <p className='band__body'>
            Dead-simple react virtual grid library that act like a normal <code>{'<div>'}</code>.
          </p>
          <pre className='grid__snippet'><code>{SNIPPET}</code></pre>
          <Tags items={['React', 'JavaScript']} />
          <Links links={[
            ['npm', 'https://www.npmjs.com/package/react-responsive-virtual-grid'],
            ['GitHub', 'https://github.com/thcolin/react-responsive-virtual-grid'],
            ['Example', 'https://thcolin.github.io/react-responsive-virtual-grid/'],
          ]} />
        </div>
        <div className={shown ? 'band__demo grid__stage is-shown' : 'band__demo grid__stage'}>
          <div
            ref={setFrame}
            tabIndex={0}
            role='region'
            aria-label={`Virtual grid of ${CELLS} cells, scroll it`}
            className='grid__frame'
          >
            <div className='grid__track'>
              {frame && (
                <ResponsiveVirtualGrid
                  total={CELLS}
                  cell={{ height: 64, width: 64 }}
                  child={Cell}
                  onRender={onRender}
                  scrollContainer={frame}
                  scrollDirection='vertical'
                />
              )}
            </div>
          </div>
          <p aria-live='polite' className='grid__counter'>
            <span className='grid__count'>{rendered}</span>
            <span>rendered of 10&nbsp;000 cells</span>
          </p>
        </div>
      </div>
    </article>
  )
}
