import { flowbotClient } from '@/common/network/flowbot/FlowbotClient'

export interface Language {
  code: string
  label: string
  flag: string
}

export const LANGUAGES: Language[] = [
  { code: 'Original', label: 'Original', flag: '📄' },
  { code: 'English', label: 'English', flag: '🇺🇸' },
  { code: 'German', label: 'German', flag: '🇩🇪' },
  { code: 'Spanish', label: 'Spanish', flag: '🇪🇸' },
  { code: 'Croatian', label: 'Croatian', flag: '🇭🇷' },
  { code: 'Chinese', label: 'Chinese', flag: '🇨🇳' }
]

// Mapping from full language names to API language names
const LANGUAGE_API_CODES: Record<string, string> = {
  Original: 'original', // This won't be used for API calls
  English: 'english',
  German: 'german',
  Spanish: 'spanish',
  Croatian: 'croatian',
  Chinese: 'chinese'
}

// Convert full language name to API language name
const getApiLanguageCode = (languageName: string): string => {
  return LANGUAGE_API_CODES[languageName] || languageName.toLowerCase()
}

export interface TranslationRequest {
  text: string
  targetLanguage: string
  sourceLanguage?: string
}

export interface TranslationResponse {
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
}

export interface TranslationApiRequest {
  input_texts: string[]
  target_language: string
}

export interface TranslationApiResponse {
  translated_texts: string[]
}

// Translation service using direct fetch calls
export const translateText = async (request: TranslationRequest, accessToken: string): Promise<TranslationResponse> => {
  if (request.targetLanguage === 'Original' || request.targetLanguage === request.sourceLanguage) {
    return {
      translatedText: request.text,
      sourceLanguage: request.sourceLanguage || 'Original',
      targetLanguage: request.targetLanguage
    }
  }

  try {
    flowbotClient.setAccessToken(accessToken)
    const response = await flowbotClient.translateTexts([request.text], getApiLanguageCode(request.targetLanguage))

    let translatedTexts: string[]
    if (Array.isArray(response)) {
      translatedTexts = response as unknown as string[]
    } else if (response && response.translated_texts && Array.isArray(response.translated_texts)) {
      translatedTexts = response.translated_texts
    } else {
      console.warn('Invalid translation API response:', response)
      return {
        translatedText: request.text,
        sourceLanguage: request.sourceLanguage || 'Original',
        targetLanguage: request.targetLanguage
      }
    }

    return {
      translatedText: translatedTexts[0] || request.text,
      sourceLanguage: request.sourceLanguage || 'Original',
      targetLanguage: request.targetLanguage
    }
  } catch (error) {
    console.error('Translation API error:', error)
    return {
      translatedText: request.text,
      sourceLanguage: request.sourceLanguage || 'Original',
      targetLanguage: request.targetLanguage
    }
  }
}

export const translateMultipleTexts = async (
  texts: string[],
  targetLanguage: string,
  accessToken: string,
  sourceLanguage?: string
): Promise<string[]> => {
  if (targetLanguage === 'Original' || targetLanguage === sourceLanguage) {
    return texts
  }

  const nonEmptyTexts = texts.filter(text => text && text.trim())
  if (nonEmptyTexts.length === 0) {
    return texts
  }

  try {
    flowbotClient.setAccessToken(accessToken)
    const response = await flowbotClient.translateTexts(nonEmptyTexts, getApiLanguageCode(targetLanguage))

    // Handle both response formats: direct array or object with translated_texts property
    let translatedTexts: string[]
    if (Array.isArray(response)) {
      // Direct array response
      translatedTexts = response
    } else if (response && response.translated_texts && Array.isArray(response.translated_texts)) {
      // Object with translated_texts property
      translatedTexts = response.translated_texts
    } else {
      console.warn('Invalid translation API response:', response)
      return texts
    }

    // Make sure we have the same number of translations as inputs
    if (translatedTexts.length !== nonEmptyTexts.length) {
      console.warn('Translation count mismatch:', {
        input: nonEmptyTexts.length,
        output: translatedTexts.length
      })
      return texts
    }

    // Map the translations back to the original array (handling empty texts)
    let translationIndex = 0
    return texts.map(text => {
      if (text && text.trim()) {
        return translatedTexts[translationIndex++]
      }
      return text // Return empty text as is
    })
  } catch (error) {
    console.error('Translation API error:', error)
    return texts // Return original texts if translation fails
  }
}

// Utility function to get supported languages
export const getSupportedLanguages = (): Language[] => {
  return LANGUAGES
}

// Utility function to get language by code
export const getLanguageByCode = (code: string): Language | undefined => {
  return LANGUAGES.find(lang => lang.code === code)
}

// Utility function to check if a language is supported
export const isLanguageSupported = (code: string): boolean => {
  return LANGUAGES.some(lang => lang.code === code)
}
