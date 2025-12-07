import commonEnUS from '../../_i18n/en-US.ftl?raw'
import commonDeDE from '../../_i18n/de-DE.ftl?raw'
import commonRoRO from '../../_i18n/ro-RO.ftl?raw'

import formEnUS from './en-US.ftl?raw'
import formDeDE from './de-DE.ftl?raw'
import formRoRO from './ro-RO.ftl?raw'

export default {
  enUS: commonEnUS + '\n' + formEnUS,
  deDE: commonDeDE + '\n' + formDeDE,
  roRO: commonRoRO + '\n' + formRoRO
}
