import expenseFormsTranslations from '../../_i18n'

import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

export default {
  'en-US': expenseFormsTranslations['en-US'] + '\n' + enUS,
  'de-DE': expenseFormsTranslations['de-DE'] + '\n' + deDE,
  'ro-RO': expenseFormsTranslations['ro-RO'] + '\n' + roRO
} as Record<string, string>
