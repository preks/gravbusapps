import commonTranslations from '../../../common/_i18n'

import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

export default {
  'en-US': commonTranslations['en-US'] + '\n' + enUS,
  'de-DE': commonTranslations['de-DE'] + '\n' + deDE,
  'ro-RO': commonTranslations['ro-RO'] + '\n' + roRO
} as Record<'en-US' | 'de-DE' | 'ro-RO', string>
