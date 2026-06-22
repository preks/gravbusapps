import platformTranslations from './platform'

import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

export default {
  'en-US': platformTranslations['en-US'] + '\n' + enUS,
  'de-DE': platformTranslations['de-DE'] + '\n' + deDE,
  'ro-RO': platformTranslations['ro-RO'] + '\n' + roRO
} as Record<string, string>
