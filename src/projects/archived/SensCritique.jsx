import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../shared'
import { useTick } from './tick'
import data from './senscritique.json'
import './senscritique.css'

// senscritique-api reads SensCritique's HTML with DiDom: the README's getArtwork(438579) runs again here on a
// rebuilt 2016 details page, each getter pointing at the selector src/Models/Artwork.php reads. The values are
// the ones tests/ClientTests.php asserted; the rating was read once, its date is in senscritique.json.

const { serialized: work, rating } = data

// Artwork::serialize() walks get_class_methods(): this is their order
const GETTERS = [
  ['id', 'getId', 'body[data-sc-page-object-id]'],
  ['url', 'getUrl', '$this->uri'],
  ['type', 'getType', 'static::TYPE'],
  ['title', 'getTitle', '.pco-cover-title'],
  ['year', 'getYear', '.d-grid-aside « Première diffusion »'],
  ['directors', 'getDirectors', '.d-grid-main « Créateurs » .ecot-contact-label'],
  ['actors', 'getActors', '.d-grid-main .d-rubric « Acteurs »'],
  ['genres', 'getGenres', '.d-grid-aside « Genre » a'],
  ['duration', 'getDuration', '.d-grid-aside « Durée »'],
  ['countries', 'getCountries', '.d-grid-aside « Pays d\'origine » li'],
  ['storyline', 'getStoryline', 'sc2/product/storyline/438579.json'],
]

// The README's example, the artwork part of it
const SCRIPT = [
  ['client', '$client = new Client();'],
  ['artwork', '$tvshow = $client->getArtwork(438579);'],
  ['storyline', 'echo $tvshow->getStoryline();'],
  ['serialize', 'print_r($tvshow->serialize());'],
]

// One tick per line of the script, then one per getter that serialize() calls
const STEPS = [
  { line: 0 },
  { line: 1, target: 'id' },
  { line: 2, target: 'storyline' },
  ...GETTERS.map(([key]) => ({ line: 3, target: key, getter: key })),
  { line: 4 },
]

const LAST = STEPS.length - 1

const Rubric = ({ name, label, active, children }) => (
  <div className={active === name ? 'd-rubric is-targeted' : 'd-rubric'} data-scrape={name}>
    <p className='d-rubric__label'>{label}</p>
    {children}
  </div>
)

export const SensCritique = ({ awake }) => {
  const reduced = usePrefersReducedMotion()
  // Shown finished while asleep, run again from the start each time it wakes up
  const [step, setStep] = useState(LAST)
  const [hovered, setHovered] = useState(null)
  const page = useRef(null)
  const output = useRef(null)

  useEffect(() => {
    if (awake && !reduced) {
      setStep(0)
    }
  }, [awake, reduced])

  useTick(() => setStep((current) => Math.min(LAST, current + 1)), 650, awake && !reduced && step < LAST)

  const current = STEPS[step]
  const active = hovered ?? (step < LAST ? current.target : null)
  const done = (key) => STEPS.findIndex((item) => item.getter === key) < step
  const target = (name) => active === name ? 'is-targeted' : undefined
  const selector = GETTERS.find(([key]) => key === active)?.[2]

  // The terminal follows its last line
  useEffect(() => {
    output.current?.scrollTo({ top: output.current.scrollHeight })
  }, [step])

  // Scrolls the page, never the window, to what the scraper reads
  useEffect(() => {
    const element = page.current?.querySelector('.is-targeted')

    if (!element) {
      page.current?.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
      return
    }

    const top = element.getBoundingClientRect().top - page.current.getBoundingClientRect().top + page.current.scrollTop
    const bottom = top + element.offsetHeight

    if (top < page.current.scrollTop || bottom > page.current.scrollTop + page.current.clientHeight) {
      page.current.scrollTo({ top: Math.max(0, top - 24), behavior: reduced ? 'auto' : 'smooth' })
    }
  }, [active, reduced])

  return (
    <div className='sc'>
      <div ref={page} className='sc-page' data-sc-page-object-id={work.id}>
        <div className={active === 'id' ? 'sc-header is-targeted' : 'sc-header'}>
          <span className='sc-header__logo'><i aria-hidden='true' />SensCritique</span>
          <span className='sc-header__universes' aria-hidden='true'>
            <span>Films</span><span className='is-active'>Séries</span><span>Jeux</span><span>Livres</span><span>BD</span><span>Musique</span>
          </span>
        </div>
        <div className='pco-cover'>
          <div className='pco-cover__poster' aria-hidden='true'>
            <span>Black</span><span>Mirror</span>
          </div>
          <div className='pco-cover__text'>
            <p className='pco-cover__crumbs'>SensCritique › Séries › Thriller › Black Mirror</p>
            <p className={['pco-cover-title', target('title')].filter(Boolean).join(' ')} data-scrape='title'>{work.title}</p>
            <p className='pco-cover__meta'>Série · {work.year}</p>
            <div className='pvi-scrating'>
              <span className='pvi-scrating-value' aria-label={`Note moyenne ${rating.value} sur 10`}>{rating.value}</span>
              <span className='pvi-scrating-details'>
                {rating.count.toLocaleString('fr-FR').replace(/\s/g, '\u00a0')} notes
                <small>relevé le {new Date(rating.read).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</small>
              </span>
            </div>
          </div>
        </div>
        <div className='d-grid'>
          <div className='d-grid-main'>
            <Rubric name='directors' label='Créateurs' active={active}>
              <ul><li className='ecot-contact-label'>{work.directors}</li></ul>
            </Rubric>
            <Rubric name='actors' label='Acteurs' active={active}>
              <ul>{work.actors.split(', ').map((actor) => <li key={actor} className='ecot-contact-label'>{actor}</li>)}</ul>
            </Rubric>
            <p className={['pvi-productDetails-resume', target('storyline')].filter(Boolean).join(' ')} data-scrape='storyline'>{work.storyline}</p>
          </div>
          <dl className='d-grid-aside'>
            <div className={target('year')}><dt>Première diffusion</dt><dd>4 décembre {work.year}</dd></div>
            <div className={target('duration')}><dt>Durée</dt><dd>{work.duration}</dd></div>
            <div className={target('genres')}><dt>Genre</dt><dd>{work.genres.split(', ').map((genre) => <a key={genre} href='#genre' onClick={(event) => event.preventDefault()}>{genre}</a>)}</dd></div>
            <div className={target('countries')}><dt>Pays d'origine</dt><dd><ul><li>{work.countries}</li></ul></dd></div>
          </dl>
        </div>
        {selector && <p className='sc-selector' aria-hidden='true'>{selector}</p>}
      </div>
      <div className='sc-term'>
        <div className='sc-term__bar'>
          <span>php example.php</span>
        </div>
        <pre ref={output} className='sc-term__output' aria-live='polite'>
          {SCRIPT.slice(0, Math.min(current.line + 1, SCRIPT.length)).map(([key, code], index) => (
            <span key={key}>
              <span className='sc-term__prompt'>php &gt; </span>{code}{'\n'}
              {key === 'storyline' && (step > 2 || index < current.line) && <span className='sc-term__echo'>{work.storyline}{'\n'}</span>}
              {key === 'serialize' && (
                <>
                  {'Array\n(\n'}
                  {GETTERS.filter(([name]) => done(name) || step === LAST).map(([name]) => (
                    <span
                      key={name}
                      tabIndex={0}
                      className={hovered === name ? 'sc-term__pair is-hovered' : 'sc-term__pair'}
                      onPointerEnter={() => setHovered(name)}
                      onPointerLeave={() => setHovered(null)}
                      onFocus={() => setHovered(name)}
                      onBlur={() => setHovered(null)}
                    >
                      {'    '}[{name}] =&gt; {String(work[name])}{'\n'}
                    </span>
                  ))}
                  {step === LAST && ')\n'}
                </>
              )}
            </span>
          ))}
          {step < LAST && <span className='sc-term__cursor'>▋</span>}
        </pre>
      </div>
    </div>
  )
}
