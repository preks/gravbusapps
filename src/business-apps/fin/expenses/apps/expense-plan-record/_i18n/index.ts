import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

export default {
  'en-US': enUS,
  'de-DE': deDE,
  'ro-RO': roRO
} as Record<'en-US' | 'de-DE' | 'ro-RO', string>
