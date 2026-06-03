export { default as enUS } from './en-US.ftl?raw'
export { default as deDE } from './de-DE.ftl?raw'
export { default as roRO } from './ro-RO.ftl?raw'

import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

// Default export for wrapper compatibility
export default {
  'en-US': enUS,
  'de-DE': deDE,
  'ro-RO': roRO
}
