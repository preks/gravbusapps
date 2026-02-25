import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

// Export with both camelCase and hyphenated keys so locale resolution works
// regardless of how the design system maps locale (e.g. "en-US" vs "enUS", "ro_RO" vs "ro-RO")
export default {
  enUS,
  deDE,
  roRO,
  'en-US': enUS,
  'de-DE': deDE,
  'ro-RO': roRO,
  en_US: enUS,
  de_DE: deDE,
  ro_RO: roRO
}
