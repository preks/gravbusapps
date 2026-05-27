import translations from '../../_i18n'

import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

export default {
  'en-US': translations.enUS + '\n' + enUS,
  'de-DE': translations.deDE + '\n' + deDE,
  'ro-RO': translations.roRO + '\n' + roRO
} as Record<'en-US' | 'de-DE' | 'ro-RO', string>
