export const DEFAULT_LANGUAGES = ['en-US', 'de-DE', 'ro-RO']

export const LANGUAGE_NAMES: Record<string, string> = {
  'en-US': 'English',
  'de-DE': 'German',
  'ro-RO': 'Romanian'
}

export function getLanguageDisplayName(langCode: string): string {
  return LANGUAGE_NAMES[langCode] || langCode.toUpperCase()
}

export function getAllLanguageCodes(
  translations: Record<string, string>,
  defaultLanguages: string[] = DEFAULT_LANGUAGES
): string[] {
  const translatedLanguageCodes = Object.keys(translations)
  return Array.from(new Set([...defaultLanguages, ...translatedLanguageCodes]))
}

export function updateMainFieldTranslation(
  newValue: string,
  defaultLanguage: string,
  currentTranslations: Record<string, string>
): Record<string, string> {
  return {
    ...currentTranslations,
    [defaultLanguage]: newValue
  }
}

export function updateTranslation(
  langCode: string,
  translationValue: string,
  defaultLanguage: string,
  currentTranslations: Record<string, string>
): {
  newTranslations: Record<string, string>
  shouldUpdateMainField: boolean
  newMainValue: string | null
} {
  const newTranslations = {
    ...currentTranslations,
    [langCode]: translationValue
  }

  return {
    newTranslations,
    shouldUpdateMainField: langCode === defaultLanguage,
    newMainValue: langCode === defaultLanguage ? translationValue : null
  }
}

export function changeDefaultLanguage(
  newLanguage: string,
  currentValue: string,
  defaultLanguage: string,
  currentTranslations: Record<string, string>
): {
  newTranslations: Record<string, string>
  newMainValue: string
} {
  const newDefaultValue = currentTranslations[newLanguage] || ''

  return {
    newTranslations: {
      ...currentTranslations,
      [defaultLanguage]: currentValue,
      [newLanguage]: newDefaultValue
    },
    newMainValue: newDefaultValue
  }
}

export function removeTranslationLanguage(
  langToRemove: string,
  defaultLanguage: string,
  currentTranslations: Record<string, string>
): Record<string, string> | null {
  if (langToRemove === defaultLanguage) {
    return null
  }

  const newTranslations = { ...currentTranslations }
  delete newTranslations[langToRemove]
  return newTranslations
}
