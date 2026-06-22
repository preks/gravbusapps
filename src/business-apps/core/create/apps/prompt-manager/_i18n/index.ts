import translations from '@/business-apps/_i18n'

import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

export default {
  'en-US': translations['en-US'] + '\n' + enUS,
  'de-DE': translations['de-DE'] + '\n' + deDE,
  'ro-RO': translations['ro-RO'] + '\n' + roRO
} as Record<string, string>
