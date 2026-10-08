import { cloneElement } from 'react'
import en from './en'

// The few calls of i18next and react-i18next the looks make, over sensorr's English copy and its ICU messages:
// `{name}`, `{count, plural, …}`, `{rank, selectordinal, …}`, `{mode, select, …}`
const LANGUAGE = 'en'
const plurals = new Intl.PluralRules(LANGUAGE)
const ordinals = new Intl.PluralRules(LANGUAGE, { type: 'ordinal' })

// The index after the brace that closes the one opened at `start`
const close = (text, start) => {
  let depth = 0

  for (let index = start; index < text.length; index++) {
    depth += text[index] === '{' ? 1 : text[index] === '}' ? -1 : 0

    if (!depth) {
      return index + 1
    }
  }

  throw new Error(`Unbalanced message: ${text}`)
}

// `=0 {Nobody} one {# person} other {# people}` as [[key, message], …]
const branchesOf = (text) => {
  const branches = []
  let index = 0

  while (index < text.length) {
    const open = text.indexOf('{', index)

    if (open < 0) {
      break
    }

    const end = close(text, open)
    branches.push([text.slice(index, open).trim(), text.slice(open + 1, end - 1)])
    index = end
  }

  return branches
}

const format = (message, values, count) => {
  let result = ''
  let index = 0

  while (index < message.length) {
    const char = message[index]

    if (char === '#' && count !== undefined) {
      // As intl-messageformat: `#` is a localised number, a plain `{value}` is its string
      result += count.toLocaleString(LANGUAGE)
      index++
      continue
    }

    if (char !== '{') {
      result += char
      index++
      continue
    }

    const end = close(message, index)
    const [name, type, ...rest] = message.slice(index + 1, end - 1).split(',')
    const value = values[name.trim()]

    if (!type) {
      result += String(value ?? '')
    } else {
      const branches = branchesOf(rest.join(','))
      const pick = (key) => branches.find(([branch]) => branch === key)?.[1]
      const kind = type.trim()
      const chosen = kind === 'select'
        ? pick(String(value)) ?? pick('other')
        : pick(`=${value}`) ?? pick((kind === 'selectordinal' ? ordinals : plurals).select(value)) ?? pick('other')
      result += format(chosen ?? '', values, kind === 'select' ? count : value)
    }

    index = end
  }

  return result
}

const t = (key, values = {}) => {
  const message = key.split('.').reduce((node, part) => node?.[part], en)
  return typeof message === 'string' ? format(message, values) : key
}

const i18n = { language: LANGUAGE, t }

export default i18n

export const useTranslation = () => ({ t, i18n })

// `<0>…</0>` and `<1/>` of a message, each drawn as the component at that index
export const Trans = ({ i18nKey, values, components = [] }) => {
  const text = t(i18nKey, values)
  const parts = []
  const tag = /<(\d+)>([\s\S]*?)<\/\1>|<(\d+)\/>/g
  let cursor = 0

  for (const match of text.matchAll(tag)) {
    parts.push(text.slice(cursor, match.index))
    parts.push(
      match[3] !== undefined
        ? cloneElement(components[match[3]], { key: match.index })
        : cloneElement(components[match[1]], { key: match.index }, match[2]),
    )
    cursor = match.index + match[0].length
  }

  parts.push(text.slice(cursor))
  return parts
}
