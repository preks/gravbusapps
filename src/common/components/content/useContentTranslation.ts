import { useState, useCallback } from 'react'
import { flowbotClient } from '@/common/network/flowbot'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  collectAllTexts,
  mapTranslationsToContentEntry,
  extractTextFromHTML
} from '@/business-apps/core/content/utils/translationUtils'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'

export interface TranslatedTexts {
  title?: string
  preview?: string
  content?: string
}

export interface DetectedLanguage {
  languageId: string
  confidence: number
  catalogEntryValue?: string
}

export interface UseContentTranslationResult {
  detectedLanguage: DetectedLanguage | null
  targetLanguage: string | null
  translatedTexts: TranslatedTexts | null
  isTranslating: boolean
  isDetecting: boolean
  error: string | null
  detectLanguage: (content: string) => Promise<void>
  setLanguageFromRef: (languageId: string, catalogValue?: string) => Promise<void>
  translateContent: (contentEntry: ContentEntry, targetLanguage: string) => Promise<void>
  translateComments: (commentTexts: string[], targetLanguage: string) => Promise<string[]>
  loadLanguageCatalogEntry: (languageId: string) => Promise<string | null>
  resetTranslation: () => void
}

export const useContentTranslation = (accessToken: string): UseContentTranslationResult => {
  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguage | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null)
  const [translatedTexts, setTranslatedTexts] = useState<TranslatedTexts | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken)

  // Set access token for flowbot client
  flowbotClient.setAccessToken(accessToken)

  /**
   * Load Language Catalog Entry by ID
   */
  const loadLanguageCatalogEntry = useCallback(
    async (languageId: string): Promise<string | null> => {
      try {
        // Extract catalog ID from language ID format (e.g., "Language:v1:De" -> "Language:v1:De")
        // The languageId from API should match the catalog entry ID
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'Language',
            version: 'v1'
          },
          {
            limit: 1000,
            offset: 0,
            returnTotalRecords: false
          }
        )

        const entries = response.data || []
        const entry = entries.find((e: any) => e.id === languageId)

        return entry?.value || null
      } catch (err) {
        console.error('Error loading language catalog entry:', err)
        return null
      }
    },
    [catalogClient]
  )

  /**
   * Detect language from content text
   */
  const detectLanguage = useCallback(
    async (content: string) => {
      if (!content?.trim()) {
        setError('No content provided for language detection')
        return
      }

      setIsDetecting(true)
      setError(null)

      try {
        // Extract plain text from HTML if needed (using safe DOMParser)
        const plainText = extractTextFromHTML(content)
        if (!plainText) {
          setError('No text content found')
          setIsDetecting(false)
          return
        }

        // Call translation API without target language for detection only
        const response = await flowbotClient.translate([plainText.substring(0, 1000)]) // Limit to first 1000 chars for detection

        if (response.languages && response.languages.length > 0) {
          const detectedLangId = response.languages[0]
          const confidence = response.confidences?.[0] || 0

          // Load catalog entry for display
          const catalogValue = await loadLanguageCatalogEntry(detectedLangId)

          setDetectedLanguage({
            languageId: detectedLangId,
            confidence,
            catalogEntryValue: catalogValue || undefined
          })
        } else {
          setError('Could not detect language')
        }
      } catch (err) {
        console.error('Error detecting language:', err)
        setError(err instanceof Error ? err.message : 'Failed to detect language')
      } finally {
        setIsDetecting(false)
      }
    },
    [loadLanguageCatalogEntry]
  )

  /**
   * Set language from existing languageRef (no API detection needed)
   */
  const setLanguageFromRef = useCallback(
    async (languageId: string, catalogValue?: string) => {
      if (!languageId) return

      setIsDetecting(true)
      setError(null)

      try {
        // If catalog value not provided, load it
        let displayValue: string | undefined = catalogValue
        if (!displayValue) {
          const loadedValue = await loadLanguageCatalogEntry(languageId)
          displayValue = loadedValue || undefined
        }

        setDetectedLanguage({
          languageId,
          confidence: 1, // 100% confidence since it's stored in the database
          catalogEntryValue: displayValue
        })
      } catch (err) {
        console.error('Error setting language from ref:', err)
        setError(err instanceof Error ? err.message : 'Failed to set language')
      } finally {
        setIsDetecting(false)
      }
    },
    [loadLanguageCatalogEntry]
  )

  /**
   * Translate all texts in a ContentEntry
   */
  const translateContent = useCallback(async (contentEntry: ContentEntry, targetLang: string) => {
    if (!contentEntry) {
      setError('No content entry provided')
      return
    }

    setIsTranslating(true)
    setError(null)

    try {
      // Collect all texts to translate
      const textsToTranslate = collectAllTexts(contentEntry)

      if (textsToTranslate.length === 0) {
        setError('No texts found to translate')
        setIsTranslating(false)
        return
      }

      // Call translation API
      const response = await flowbotClient.translate(textsToTranslate, targetLang)

      if (response.translations && response.translations.length === textsToTranslate.length) {
        // Map translations back to content structure
        const translated = mapTranslationsToContentEntry(response.translations, contentEntry)
        setTranslatedTexts(translated)
        setTargetLanguage(targetLang)
      } else {
        setError('Translation response incomplete')
      }
    } catch (err) {
      console.error('Error translating content:', err)
      setError(err instanceof Error ? err.message : 'Failed to translate content')
      // Fallback: keep original texts
      setTranslatedTexts(null)
    } finally {
      setIsTranslating(false)
    }
  }, [])

  /**
   * Translate comment texts
   */
  const translateComments = useCallback(async (commentTexts: string[], targetLang: string): Promise<string[]> => {
    if (!commentTexts || commentTexts.length === 0) {
      return []
    }

    try {
      const response = await flowbotClient.translate(commentTexts, targetLang)
      return response.translations || commentTexts // Fallback to original if translation fails
    } catch (err) {
      console.error('Error translating comments:', err)
      return commentTexts // Fallback to original texts
    }
  }, [])

  /**
   * Reset translation state
   */
  const resetTranslation = useCallback(() => {
    setTargetLanguage(null)
    setTranslatedTexts(null)
    setError(null)
  }, [])

  return {
    detectedLanguage,
    targetLanguage,
    translatedTexts,
    isTranslating,
    isDetecting,
    error,
    detectLanguage,
    setLanguageFromRef,
    translateContent,
    translateComments,
    loadLanguageCatalogEntry,
    resetTranslation
  }
}
