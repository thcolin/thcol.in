// The daily's data, from the prod's API, on daily.cinetropes.com: GET /daily, POST /daily/guess, GET /daily/reveal, GET /daily/poster/:level.
// Its CORS answers https://thcol.in only. Anywhere else, or when it fails, the band falls back to daily #190,
// frozen on 8 October 2026 and marked as sample data. Search is GET /search with the live daily, local with the sample

import frozen from '../../assets/cinetropes-daily/daily.json'

const API = 'https://daily.cinetropes.com/api'
const FROZEN_POSTER = new URL('../../assets/cinetropes-daily/poster.webp', import.meta.url).href
let language = 'en'

// The API answers in English or in French; the sample is in English only
export const setLanguage = (next) => {
  language = next
}

let live = null

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

let catalogue = null
const films = () => catalogue ??= import('../../assets/cinetropes-daily/films.json')
  .then((module) => (module.default ?? module).map(([id, title, year, poster]) => ({ id, title, year, poster, key: normalize(title) })))

// The fallback's answer, read only once a guess is sent
const answer = () => import('../../assets/cinetropes-daily/answer.json').then((module) => module.default ?? module)

const tmdb = (path, size) => path ? `https://image.tmdb.org/t/p/${size}${path}` : null

const request = async (path, options) => {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Accept-Language': language, ...options?.headers } })

  if (!response.ok) {
    throw new Error(`${path}: ${response.status}`)
  }

  return response
}

// GET /daily, or the frozen #190 with `sample` set
export const getPuzzle = async () => {
  try {
    const puzzle = await (await request('/daily')).json()
    live = puzzle.gameDay
    return { ...puzzle, sample: false }
  } catch {
    live = null
    return { gameDay: frozen.gameDay, maxGuesses: frozen.maxGuesses, mystery: frozen.mystery, sample: true }
  }
}

// The app's parseSvgPixels: one 1×1 rect per cell, grey where one is missing
const parseSvgPixels = (svg, w, h) => {
  const rows = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ r: 51, g: 51, b: 51 })))

  for (const [, x, y, r, g, b] of svg.matchAll(/<rect\s+x="(\d+)"\s+y="(\d+)"\s+width="1"\s+height="1"\s+fill="rgb\((\d+),(\d+),(\d+)\)"\/>/g)) {
    if (+y < h && +x < w) rows[+y][+x] = { r: +r, g: +g, b: +b }
  }

  for (const [, x, y, hex] of svg.matchAll(/<rect\s+x="(\d+)"\s+y="(\d+)"\s+width="1"\s+height="1"\s+fill="#([0-9a-fA-F]{3,6})"\/>/g)) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
    if (+y < h && +x < w) rows[+y][+x] = { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) }
  }

  return rows
}

// GET /daily/poster/:level for levels 0 to 4, as rows of RGB
export const getPosterPixels = async (level) => {
  const w = 2 ** (level + 1)
  const h = 3 * 2 ** level

  if (live !== null) {
    return parseSvgPixels(await (await request(`/daily/poster/${level}?d=${live}`)).text(), w, h)
  }

  const cells = frozen.posters[level].match(/.{6}/g).map((hex) => ({ r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) }))
  return Array.from({ length: h }, (_, y) => cells.slice(y * w, (y + 1) * w))
}

// The original poster, level 5, shown once the game is over
const posterOf = (film) => live !== null ? `${API}/daily/poster/5?d=${live}` : film.posterUrl ?? FROZEN_POSTER

// GET /search, films only, five at most. The sample's search stays within 2,327 of the app's best-known films,
// the ones its guesses can be checked against
export const search = async (query, excludeIds = []) => {
  if (live !== null) {
    const params = new URLSearchParams({ q: query })
    if (excludeIds.length) params.set('excludeFilmIds', excludeIds.join(','))
    const { results } = await (await request(`/search?${params}`)).json()
    return results.filter((result) => result.type === 'film').slice(0, 5)
  }

  const key = normalize(query)
  const found = (await films()).filter((film) => film.key.includes(key) && !excludeIds.includes(film.id))
  return [...found.filter((film) => film.key.startsWith(key)), ...found.filter((film) => !film.key.startsWith(key))]
    .slice(0, 5)
    .map(({ id, title, year }) => ({ id, type: 'film', title, subtitle: String(year) }))
}

// POST /daily/guess
export const submitGuess = async (filmId, attemptsUsed) => {
  if (live !== null) {
    const result = await (await request('/daily/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filmId, attemptsUsed }),
    })).json()
    if (!result.mysteryFilm) {
      return result
    }

    // The found film's card shows the daily's own poster, the one of the big card and of the app
    const mysteryFilm = { ...result.mysteryFilm, posterUrl: posterOf(result.mysteryFilm) }
    return { ...result, mysteryFilm, guessFilm: result.correct ? { ...result.guessFilm, posterUrl: mysteryFilm.posterUrl } : result.guessFilm }
  }

  const [film, mystery] = await Promise.all([films().then((all) => all.find(({ id }) => id === filmId)), answer()])
  const correct = filmId === mystery.id
  return {
    correct,
    guessFilm: { id: film.id, title: film.title, year: film.year, posterUrl: correct ? FROZEN_POSTER : tmdb(film.poster, 'w342') },
    ...((correct || attemptsUsed + 1 >= frozen.maxGuesses) && { mysteryFilm: { ...mystery, posterUrl: FROZEN_POSTER } }),
  }
}

// GET /daily/reveal, for a game lost by skipping, which never reaches the server
export const revealMysteryFilm = async () => {
  if (live !== null) {
    const film = await (await request('/daily/reveal')).json()
    return { ...film, posterUrl: posterOf(film) }
  }

  return { ...(await answer()), posterUrl: FROZEN_POSTER }
}
