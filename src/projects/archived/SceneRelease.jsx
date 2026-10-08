import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../shared'
import { useTick } from './tick'
import { Release, SceneReleaseException } from './release'
import './scene-release.css'

// The README's example.php as PHP printed it in 2015: highlight_string() for the code, Xdebug 2 for var_dump()
// and for the fatal error. The parse is the class itself, ported to JavaScript in ./release.js.

const README = 'Mr.Robot.S01E05.PROPER.VOSTFR.720p.WEB-DL.DD5.1.H264-ARK01'

// From utils/releases.json, the names the PHPUnit tests run on, and the README's guess example
const NAMES = [
  README,
  'Ex.Machina.2015.FRENCH.SUBFORCED.BRRip.XviD.AC3-CHARTAIR',
  'Arrow.S03E01.FASTSUB.VOSTFR.HDTV.x264-ADDiCTiON',
  'Ted.2012.TRUEFRENCH.720p.BluRay.x264.AC3',
  'Bataille a Seattle BDRip',
  'Enemy.2013.LIMITED.FRENCH.SUBFORCED.BRRip.x264.AC3-SP3CTR3',
]

const GETTERS = [
  ['getType', (release) => release.type],
  ['getTitle', (release) => release.title],
  ['getLanguage', (release) => release.language],
  ['getYear', (release) => release.year],
  ['getResolution', (release) => release.resolution],
  ['getSource', (release) => release.source],
  ['getDub', (release) => release.dub],
  ['getEncoding', (release) => release.encoding],
  ['getGroup', (release) => release.group],
  ['getFlags', (release) => release.flags.length ? `[${release.flags.join(', ')}]` : '[]'],
  ['getScore', (release) => release.getScore()],
  ['getSeason', (release) => release.season],
  ['getEpisode', (release) => release.episode],
]

const parse = (name, strict) => {
  try {
    return { release: new Release(name, strict) }
  } catch (error) {
    if (error instanceof SceneReleaseException) {
      return { error }
    }

    throw error
  }
}

// One Xdebug value, as its HTML var_dump writes it
const Value = ({ value, depth = 1 }) => {
  if (value === null || value === undefined) {
    return <span className='xd-null'>null</span>
  }

  if (typeof value === 'boolean') {
    return <><small>boolean</small> <span className='xd-bool'>{String(value)}</span></>
  }

  if (typeof value === 'number') {
    return <><small>int</small> <span className='xd-int'>{value}</span></>
  }

  if (Array.isArray(value)) {
    const indent = '  '.repeat(depth + 2)

    return (
      <>
        {'\n'}{'  '.repeat(depth + 1)}<b>array</b> <i>(size={value.length})</i>
        {value.length
          ? value.map((item, index) => <Fragment key={index}>{'\n'}{indent}{index} <span className='xd-arrow'>=&gt;</span> <Value value={item} depth={depth + 1} /></Fragment>)
          : <>{'\n'}{indent}<i className='xd-arrow'>empty</i></>}
      </>
    )
  }

  return <><small>string</small> <span className='xd-string'>'{value}'</span> <i>(length={new TextEncoder().encode(value).length})</i></>
}

// The flash on a property whose value just changed
const Property = ({ visibility, name, value }) => {
  const serialized = JSON.stringify(value)
  const previous = useRef(serialized)
  const [flash, setFlash] = useState(0)

  useEffect(() => {
    if (previous.current !== serialized) {
      previous.current = serialized
      setFlash((count) => count + 1)
    }
  }, [serialized])

  return (
    <span key={flash} className={flash ? 'xd-property is-changed' : 'xd-property'}>
      {'\n  '}<i>{visibility}</i> '{name}' <span className='xd-arrow'>=&gt;</span> <Value value={value} />
    </span>
  )
}

const Dump = ({ release, strict }) => (
  <pre className='xd-dump'>
    <b>object</b>(<i>thcolin\SceneReleaseParser\Release</i>)[<i>1</i>]
    {[
      ['protected', 'release', release.release],
      ['protected', 'strict', strict],
      ['protected', 'defaults', []],
      ['protected', 'type', release.type],
      ['protected', 'title', release.title],
      ['protected', 'year', release.year],
      ['protected', 'language', release.language],
      ['protected', 'resolution', release.resolution],
      ['protected', 'source', release.source],
      ['protected', 'dub', release.dub],
      ['protected', 'encoding', release.encoding],
      ['protected', 'group', release.group],
      ['protected', 'flags', release.flags],
      ['protected', 'season', release.season],
      ['protected', 'episode', release.episode],
      ['public', 'original', release.original],
    ].map(([visibility, name, value]) => <Property key={name} visibility={visibility} name={name} value={value} />)}
  </pre>
)

const Fatal = ({ error }) => (
  <table className='xd-error' dir='ltr'>
    <tbody>
      <tr>
        <th colSpan='4' className='xd-error__title'>
          <span className='xd-error__bang'>( ! )</span> Fatal error: Uncaught exception 'InvalidArgumentException' with message '{error.message}' in /var/www/vendor/thcolin/scene-release-parser/src/Release.php on line <i>635</i>
        </th>
      </tr>
      <tr><th colSpan='4' className='xd-error__stack'>Call Stack</th></tr>
      <tr className='xd-error__head'><th>#</th><th>Function</th><th colSpan='2'>Location</th></tr>
      {[
        ['{main}( )', '.../example.php:0'],
        ['thcolin\\SceneReleaseParser\\Release->__construct( )', '.../example.php:5'],
        ['thcolin\\SceneReleaseParser\\Release->parseType( )', '.../Release.php:397'],
      ].map(([call, location], index) => (
        <tr key={call}>
          <td>{index + 1}</td>
          <td>{call}</td>
          <td colSpan='2'>{location}</td>
        </tr>
      ))}
    </tbody>
  </table>
)

export const SceneRelease = ({ awake }) => {
  const reduced = usePrefersReducedMotion()
  const [name, setName] = useState(README)
  const [strict, setStrict] = useState(true)
  const [typing, setTyping] = useState({ on: true, index: 0, target: NAMES[0], hold: 10 })
  const result = useMemo(() => parse(name, strict), [name, strict])

  // The names of the test suite type themselves until someone types instead
  useTick(() => {
    if (typing.hold > 0) {
      setTyping({ ...typing, hold: typing.hold - 1 })
    } else if (name !== typing.target && typing.target.startsWith(name)) {
      setName(typing.target.slice(0, name.length + 1))
    } else if (name !== typing.target) {
      setName(name.slice(0, Math.max(0, name.length - 4)))
    } else {
      const index = (typing.index + 1) % NAMES.length
      setTyping({ ...typing, index, target: NAMES[index], hold: 70 })
    }
  }, 40, awake && !reduced && typing.on)

  const stop = () => typing.on && setTyping({ ...typing, on: false })

  return (
    <div className='srp'>
      <div className='srp__bar' aria-hidden='true'>localhost/scene-release-parser/example.php</div>
      <div className='srp__page'>
        <code className='php'>
          <span className='php-default'>&lt;?php</span>{'\n\n'}
          <span className='php-keyword'>use </span><span className='php-default'>thcolin\SceneReleaseParser\Release</span><span className='php-keyword'>;</span>{'\n\n'}
          <span className='php-default'>$Release </span><span className='php-keyword'>= new </span><span className='php-default'>Release</span><span className='php-keyword'>(</span>{'\n  '}
          <span className='php-string'>"</span>
          <input
            className='php-input'
            value={name}
            spellCheck={false}
            autoComplete='off'
            aria-label='Scene release name, parsed as you type'
            style={{ width: `${Math.max(12, name.length + 0.5)}ch` }}
            onFocus={stop}
            onPointerDown={stop}
            onChange={(event) => {
              stop()
              setName(event.target.value)
            }}
          />
          <span className='php-string'>"</span><span className='php-keyword'>,</span>{'\n  '}
          <button type='button' className='php-toggle' aria-pressed={strict} aria-label={`$strict is ${strict}, switch it`} onClick={() => setStrict(!strict)}>
            {strict ? 'true' : 'false'}
          </button>
          <span className='php-comment'> // $strict: no tag found, it throws</span>{'\n'}
          <span className='php-keyword'>);</span>{'\n'}
          {!result.error && (
            <span aria-live='polite'>
              {GETTERS.map(([getter, read]) => {
                const value = read(result.release)
                const printed = value === null || value === undefined ? 'null' : String(value)

                return (
                  <Fragment key={getter}>
                    {'\n'}<span className='php-keyword'>echo </span><span className='php-default'>$Release</span><span className='php-keyword'>-&gt;</span><span className='php-default'>{getter}</span><span className='php-keyword'>();</span>
                    <span className='php-comment'>{' '.repeat(Math.max(1, 14 - getter.length))}// {printed}</span>
                  </Fragment>
                )
              })}
              {'\n\n'}<span className='php-default'>var_dump</span><span className='php-keyword'>(</span><span className='php-default'>$Release</span><span className='php-keyword'>);</span>
            </span>
          )}
        </code>
        {result.error
          ? <Fatal error={result.error} />
          : <Dump release={result.release} strict={strict} />}
      </div>
    </div>
  )
}
