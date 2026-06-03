import commonTranslations from '../../../common/_i18n'

import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

/** Merges shared fin/expenses/common strings with backoffice copy (same pattern as manager-expenses). */
export default {
  'en-US': commonTranslations['en-US'] + '\n' + enUS,
  'de-DE': commonTranslations['de-DE'] + '\n' + deDE,
  'ro-RO': commonTranslations['ro-RO'] + '\n' + roRO
} as Record<string, string>
