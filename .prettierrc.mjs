// .prettierrc.mjs
import mod from '@newwork/prettier-config'

// shared package liefert { __esModule: true, default: { … } }
const base = mod && mod.default ? mod.default : mod

// Falls die Extension mit Namespace-Objekten bei plugins zickt,
// auf String-Namen normalisieren:
const normalizedPlugins = Array.isArray(base.plugins)
  ? base.plugins.map(p => (typeof p === 'string' ? p : 'prettier-plugin-ignored'))
  : ['prettier-plugin-ignored']

export default {
  ...base,
  plugins: normalizedPlugins,
  overrides: [...(base.overrides ?? [])]
}
