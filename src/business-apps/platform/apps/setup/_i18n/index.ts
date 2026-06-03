import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

/** Fluent translation module for platform setup (registered once via useTranslation). */
const setupTranslations = {
  'en-US': enUS,
  'de-DE': deDE,
  'ro-RO': roRO
} as const

export default setupTranslations
