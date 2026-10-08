// The daily's data, in the shapes of the beta's API: GET /daily, GET /search, POST /daily/guess, GET /daily/reveal.
// Today it is daily #190, frozen on 8 October 2026, because the API only answers its own origin.
// Going live means swapping these five functions for fetches to https://beta.cinetropes.com/api, nothing else.

import puzzle from '../../assets/cinetropes-daily/daily.json'

const POSTER = new URL('../../assets/cinetropes-daily/poster.webp', import.meta.url).href

export const FROZEN = true

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

let catalogue = null
const films = () => catalogue ??= import('../../assets/cinetropes-daily/films.json')
  .then((module) => (module.default ?? module).map(([id, title, year, poster]) => ({ id, title, year, poster, key: normalize(title) })))

// The answer is only read once a guess is sent, as the API does on POST /daily/guess
const answer = () => import('../../assets/cinetropes-daily/answer.json').then((module) => module.default ?? module)

const tmdb = (path, size) => path ? `https://image.tmdb.org/t/p/${size}${path}` : null

// GET /daily
// titleMosaic is the frozen data's own: the beta's mosaic of the title, so the page can show its shape without its letters
export const getPuzzle = async () => ({ gameDay: puzzle.gameDay, maxGuesses: puzzle.maxGuesses, mystery: puzzle.mystery, titleMosaic: puzzle.titleMosaic })

// GET /daily/poster/:level for levels 0 to 4, already parsed to the rows of RGB the app reads from the SVG
export const getPosterPixels = async (level) => {
  const w = 2 ** (level + 1)
  const cells = puzzle.posters[level].match(/.{6}/g).map((hex) => ({ r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) }))
  return Array.from({ length: cells.length / w }, (_, y) => cells.slice(y * w, (y + 1) * w))
}

// GET /search?q=, films only, five at most
export const search = async (query, excludeIds = []) => {
  const key = normalize(query)
  const found = (await films()).filter((film) => film.key.includes(key) && !excludeIds.includes(film.id))
  return [...found.filter((film) => film.key.startsWith(key)), ...found.filter((film) => !film.key.startsWith(key))]
    .slice(0, 5)
    .map(({ id, title, year }) => ({ id, type: 'film', title, subtitle: String(year) }))
}

// POST /daily/guess
export const submitGuess = async (filmId, attemptsUsed) => {
  const [film, mystery] = await Promise.all([films().then((all) => all.find(({ id }) => id === filmId)), answer()])
  const correct = filmId === mystery.id
  const over = correct || attemptsUsed + 1 >= puzzle.maxGuesses
  return {
    correct,
    guessFilm: { id: film.id, title: film.title, year: film.year, posterUrl: tmdb(film.poster, 'w342') },
    ...(over && { mysteryFilm: { id: mystery.id, title: mystery.title, posterUrl: POSTER, slug: null } }),
  }
}

// GET /daily/reveal, and level 5 of the poster
export const revealMysteryFilm = async () => {
  const mystery = await answer()
  return { id: mystery.id, title: mystery.title, posterUrl: POSTER, slug: null }
}
