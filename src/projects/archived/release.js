// thcolin\SceneReleaseParser\Release (src/Release.php, 2017-08-05), ported line for line:
// same tables in the same order, same regular expressions, same passes on the name

export const MOVIE = 'movie'
export const TVSHOW = 'tvshow'
export const LANGUAGE_MULTI = 'MULTI'
export const LANGUAGE_DEFAULT = 'VO'
export const RESOLUTION_SD = 'SD'

export const SOURCE = [
  ['CAM', ['cam', 'camrip', 'cam-rip', 'ts', 'telesync', 'pdvd']],
  ['TC', ['tc', 'telecine']],
  ['DVDRip', ['dvdrip', 'dvd-rip']],
  ['DVDScr', ['dvdscr', 'dvd-scr', 'dvdscreener', 'screener', 'scr', 'DDC']],
  ['BDScr', ['bluray-scr', 'bdscr']],
  ['WEB-DL', ['webtv', 'web-tv', 'webdl', 'web-dl', 'webrip', 'web-rip', 'webhd', 'web']],
  ['BDRip', ['bdrip', 'bd-rip', 'brrip', 'br-rip']],
  ['DVD-R', ['dvd', 'dvdr', 'dvd-r', 'dvd-5', 'dvd-9', 'r6-dvd']],
  ['R5', ['r5']],
  ['HDRip', ['hdrip', 'hdlight', 'mhd', 'hd']],
  ['BLURAY', ['bluray', 'blu-ray', 'bdr']],
  ['PDTV', ['pdtv']],
  ['SDTV', ['sdtv', 'dsr', 'dsrip', 'satrip', 'dthrip', 'dvbrip']],
  ['HDTV', ['hdtv', 'hdtvrip', 'hdtv-rip']],
]

export const ENCODING = [
  ['DivX', ['divx']],
  ['XviD', ['xvid']],
  ['x264', ['x264', 'x.264']],
  ['x265', ['x265', 'x.265']],
  ['h264', ['h264', 'h.264']],
]

export const RESOLUTION = [
  ['SD', ['sd']],
  ['720p', ['720p']],
  ['1080p', ['1080p']],
]

export const DUB = [
  ['DUBBED', ['dubbed']],
  ['AC3', ['ac3.dubbed', 'ac3']],
  ['MD', ['md', 'microdubbed', 'micro-dubbed']],
  ['LD', ['ld', 'linedubbed', 'line-dubbed']],
]

export const LANGUAGE = [
  ['FRENCH', ['FRENCH', 'Français', 'Francais', 'FR']],
  ['TRUEFRENCH', ['TRUEFRENCH', 'VFF']],
  ['VFQ', ['VFQ']],
  ['VOSTFR', ['STFR', 'VOSTFR']],
  ...['PERSIAN', 'AMHARIC', 'ARABIC', 'CAMBODIAN', 'CHINESE', 'CREOLE', 'DANISH', 'DUTCH'].map((language) => [language, [language]]),
  ['ENGLISH', ['ENGLISH', 'EN', 'VOA']],
  ...[
    'ESTONIAN', 'FILIPINO', 'FINNISH', 'FLEMISH', 'GERMAN', 'GREEK', 'HEBREW', 'INDONESIAN', 'IRISH', 'ITALIAN',
    'JAPANESE', 'KOREAN', 'LAOTIAN', 'LATVIAN', 'LITHUANIAN', 'MALAY', 'MALAYSIAN', 'MAORI', 'NORWEGIAN', 'PASHTO',
    'POLISH', 'PORTUGUESE', 'ROMANIAN', 'RUSSIAN', 'SPANISH', 'SWAHILI', 'SWEDISH', 'SWISS', 'TAGALOG', 'TAJIK',
    'THAI', 'TURKISH', 'UKRAINIAN', 'VIETNAMESE', 'WELSH', 'MULTI',
  ].map((language) => [language, [language]]),
]

// PHP keeps a repeated array key at its first position with its last value: LIMITED, UNRATED and RERIP
export const FLAGS = [
  'PROPER', 'FASTSUB', 'LIMITED', 'SUBFRENCH', 'SUBFORCED', 'EXTENDED', 'THEATRICAL', 'WORKPRINT', 'FANSUB', 'REPACK',
  'UNRATED', 'NFOFIX', 'NTSC', 'PAL', 'INTERNAL', 'FESTIVAL', 'STV', 'RERIP', 'RETAIL', 'REMASTERED', 'RATED', 'CHRONO',
  'HDLIGHT', 'UNCUT', 'UNCENSORED', 'COMPLETE', 'UNTOUCHED', 'DC', 'DUBBED', 'SUBBED', 'REMUX', 'DUAL', 'FINAL',
  'COLORIZED', 'WS', 'DL', 'DOLBY DIGITAL', 'DTS', 'AAC', 'DTS-HD', 'DTS-MA', 'TRUEHD', '3D', 'HSBS', 'HOU', 'DOC',
  'DD5.1', 'READNFO',
].map((flag) => [flag, {
  WORKPRINT: ['WORKPRINT', 'WP'],
  INTERNAL: ['INTERNAL', 'INT'],
  RERIP: ['rerip', 're-rip'],
  'DD5.1': ['dd5.1', 'dd51', 'dd5-1', '5.1', '5-1'],
  READNFO: ['READ.NFO', 'READ-NFO', 'READNFO'],
}[flag] || [flag]])

export class SceneReleaseException extends Error {}

const quote = (pattern) => pattern.replace(/[.\\+*?[^\]$(){}=!<>|:\-#/]/g, '\\$&')

// preg_replace($pattern, $replacement, $subject, 1, $count)
const replaceOnce = (subject, regexp, replacement) => {
  let count = 0
  const result = subject.replace(regexp, (...match) => {
    count++
    return replacement(match)
  })
  return [result, count]
}

// strtolower and ucwords, both ASCII only as in PHP 8
const lower = (text) => text.replace(/[A-Z]+/g, (letters) => letters.toLowerCase())
const words = (text) => text.replace(/(^|[ \t\r\n\f\v])([a-z])/g, (match, space, letter) => space + letter.toUpperCase())

// PHP truthiness, where the string '0' is false
const truthy = (value) => !!value && value !== '0'

export class Release {
  constructor (name, strict = true) {
    this.strict = strict
    this.type = null
    this.title = null
    this.year = 0
    this.language = null
    this.resolution = null
    this.source = null
    this.dub = null
    this.encoding = null
    this.group = null
    this.flags = []
    this.season = 0
    this.episode = 0

    const cleaned = this.clean(name)
    this.original = name
    this.release = cleaned

    const title = { value: cleaned }
    this.language = this.parseLanguage(title)
    this.source = this.parseAttribute(title, SOURCE)
    this.encoding = this.parseAttribute(title, ENCODING)
    this.resolution = this.parseAttribute(title, RESOLUTION)
    this.dub = this.parseAttribute(title, DUB)
    this.year = this.parseYear(title)
    this.flags = this.parseFlags(title)
    this.type = this.parseType(title)
    this.group = this.parseGroup(title)
    this.title = this.parseTitle(title)
  }

  clean (name) {
    let release = name.replace(/[[\](),;:!]/g, ' ')
    release = release.replace(/\s+/g, ' ')
    return release.replaceAll(' ', '.')
  }

  parseAttribute (title, table) {
    for (const [key, patterns] of table) {
      for (const pattern of patterns) {
        const [value, count] = replaceOnce(title.value, new RegExp(`[.|\\-]${quote(pattern)}([.|\\- ]|$)`, 'i'), (match) => match[1])
        title.value = value

        if (count > 0) {
          return key
        }
      }
    }

    return null
  }

  parseLanguage (title) {
    const languages = []

    for (const [language, patterns] of LANGUAGE) {
      for (const pattern of patterns) {
        const [value, count] = replaceOnce(title.value, new RegExp(`[.|\\-]${quote(pattern)}([.|\\-]|$)`, 'i'), (match) => match[1])
        title.value = value

        if (count > 0) {
          languages.push(language)
          break
        }
      }
    }

    return languages.length === 1 ? languages[0] : languages.length > 1 ? LANGUAGE_MULTI : null
  }

  parseYear (title) {
    let year = null

    title.value = replaceOnce(title.value, /[.|-](\d{4})([.|-])?/, (match) => {
      year = match[1]
      return match[2] ?? ''
    })[0]

    return year
  }

  parseFlags (title) {
    const flags = []

    for (const [key, patterns] of FLAGS) {
      for (const pattern of patterns) {
        const [value, count] = replaceOnce(title.value, new RegExp(`[.|\\-]${quote(pattern)}([.|\\-]|$)`, 'i'), (match) => match[1])
        title.value = value

        if (count > 0) {
          flags.push(key)
        }
      }
    }

    return flags
  }

  parseType (title) {
    let type = null
    const [value, count] = replaceOnce(title.value, /[.-]S(\d+)[.-]?(E(\d+))?([.-])/i, (match) => {
      type = TVSHOW
      this.season = parseInt(match[1], 10)

      if (match[3]) {
        this.episode = parseInt(match[3], 10)
      }

      return match[4]
    })
    title.value = value

    if (count === 0) {
      if (this.strict && this.resolution === null && this.source === null && this.dub === null && this.encoding === null) {
        throw new SceneReleaseException('This is not a correct Scene Release name')
      }

      type = MOVIE
    }

    return type
  }

  parseGroup (title) {
    let group = null

    title.value = title.value.replace(/-([a-zA-Z0-9_.]+)$/, (match, name) => {
      if (name.length > 12) {
        name = name.match(/(\w+)/)[1]
      }

      group = name.replace(/^\.+|\.+$/g, '')
      return ''
    })

    return group
  }

  parseTitle (title) {
    let value = title.value
    let array = []
    let result = ''
    let last

    value = value.replace(/\.?-\./g, '.')
    value = value.replace(/\(.*?\)/g, '')
    value = value.replace(/\.+/g, '.')

    const remaining = value.split('.')
    const positions = this.release.split('.')

    for (const [key, part] of positions.entries()) {
      if (!remaining.includes(part)) {
        continue
      }

      last = last ?? 0

      if (key - last > 1) {
        result = array.join(' ')
        break
      }

      array.push(part)
      result = array.join(' ')
      last = key
    }

    return words(lower(result)).trim()
  }

  getScore () {
    return [this.title, this.year, this.language, this.resolution, this.source, this.encoding, this.dub].filter(truthy).length
  }

  toString () {
    const parts = [
      this.title,
      this.year,
      `${this.season ? `S${String(this.season).padStart(2, '0')}` : ''}${this.episode ? `E${String(this.episode).padStart(2, '0')}` : ''}`,
      this.language !== LANGUAGE_DEFAULT ? this.language : '',
      this.resolution !== RESOLUTION_SD ? this.resolution : '',
      this.source,
      this.encoding,
      this.dub,
    ].filter(truthy)

    return `${parts.join('.').replace(/\s+/g, '.')}-${this.group || 'NOTEAM'}`
  }
}
