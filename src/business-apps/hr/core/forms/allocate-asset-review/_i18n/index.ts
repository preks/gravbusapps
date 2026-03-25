import translations from '../../_i18n'

import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

export default {
  enUS: translations.enUS + '\n' + enUS,
  deDE: translations.deDE + '\n' + deDE,
  roRO: translations.roRO + '\n' + roRO
} as { enUS: string; deDE: string; roRO: string }
