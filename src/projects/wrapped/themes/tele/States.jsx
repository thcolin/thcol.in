import './tele.css'

const BARS = ['paper', 'yellow', 'cyan', 'green', 'magenta', 'red', 'blue']

const STRIP = ['blue', 'ink', 'magenta', 'ink', 'cyan', 'ink', 'paper']

// The card a channel shows between programmes, on a set's screen
export const TestCard = ({ rolling }) => (
  <div className={`tele-screen${rolling ? ' tele-screen-rolling' : ''}`} aria-hidden='true'>
    <svg className='tele-screen-card' viewBox='0 0 280 160'>
      {BARS.map((fill, index) => (
        <rect key={fill} x={index * 40} y='0' width='40' height='112' style={{ fill: `var(--${fill})` }} />
      ))}
      {STRIP.map((fill, index) => (
        <rect key={index} x={index * 40} y='112' width='40' height='16' style={{ fill: `var(--${fill})` }} />
      ))}
      <rect x='0' y='128' width='280' height='32' style={{ fill: 'var(--ink)' }} />
      <circle cx='140' cy='64' r='44' fill='none' strokeWidth='3' style={{ stroke: 'var(--ink)' }} />
    </svg>
  </div>
)
