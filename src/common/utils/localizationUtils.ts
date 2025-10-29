export interface I18nModule {
  enUS: string
  deDE: string
  roRO: string
}

/**
 * Merges multiple translation modules by concatenating FTL strings.
 * Later modules have higher priority and override keys from earlier modules.
 */
export function mergeTranslations(...modules: I18nModule[]): I18nModule {
  const result: I18nModule = {
    enUS: '',
    deDE: '',
    roRO: ''
  }

  for (const module of modules) {
    result.enUS += module.enUS ? `\n${module.enUS}` : ''
    result.deDE += module.deDE ? `\n${module.deDE}` : ''
    result.roRO += module.roRO ? `\n${module.roRO}` : ''
  }

  return result
}

/**
 * Helper to create translation module from raw FTL imports.
 */
export function createTranslations(deDE: string, enUS: string, roRO: string): I18nModule {
  return {
    enUS,
    deDE,
    roRO
  }
}
