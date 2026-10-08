import { Trans, useTranslation } from './i18n'

// Rendered whole, its figures marked: Trans keeps the children of a component it is given as `<1/>`
const Marked = ({ text, figures }) => <>{figures(text)}</>

const Plain = ({ children }) => children

// One sentence of the edition: `<0>` the piece the look sets in its own tag, `<1/>` a text of the sheet with its figures marked
// « Tu éteins à <0>2 h 14</0><1/>. », « En <0>mars</0> : <1/> »
export const Sentence = ({ i18nKey, values, tag, text, figures }) => {
  const { t } = useTranslation()
  return <Trans t={t} i18nKey={i18nKey} values={values} components={[tag || <Plain />, <Marked text={text} figures={figures} />]} />
}
