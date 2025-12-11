import { useState, useCallback, useRef } from 'react'
import { flowbotClient } from '@/common/network/flowbot'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'

export interface TranslatedItem {
  id: string
  title?: string
  preview?: string
}

export interface UsePortalTranslationResult {
  targetLanguage: string | null
  translatedItems: Record<string, TranslatedItem>
  isTranslating: boolean
  error: string | null
  translateAllContent: (items: ContentEntry[], targetLanguage: string) => Promise<void>
  setTargetLanguage: (languageId: string | null) => void
  resetTranslation: () => void
}

export const usePortalTranslation = (accessToken: string): UsePortalTranslationResult => {
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null)
  const [translatedItems, setTranslatedItems] = useState<Record<string, TranslatedItem>>({})
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isTranslatingRef = useRef(false)

  // Set access token for flowbot client
  flowbotClient.setAccessToken(accessToken)

  /**
   * Translate all content items in the active tab
   */
  const translateAllContent = useCallback(async (items: ContentEntry[], targetLang: string) => {
    if (!items || items.length === 0) {
      setError('No content items to translate')
      return
    }

    // Skip if already translating
    if (isTranslatingRef.current) {
      return
    }

    isTranslatingRef.current = true
    setIsTranslating(true)
    setError(null)

    try {
      // Collect all texts to translate (title and preview for each item)
      const textsToTranslate: string[] = []
      const itemTextMap: Array<{ itemId: string; titleIndex?: number; previewIndex?: number }> = []

      items.forEach(item => {
        const titleIndex = item.title ? textsToTranslate.length : undefined
        if (item.title) {
          textsToTranslate.push(item.title)
        }

        const previewIndex = item.preview ? textsToTranslate.length : undefined
        if (item.preview) {
          textsToTranslate.push(item.preview)
        }

        itemTextMap.push({
          itemId: item.id || '',
          titleIndex,
          previewIndex
        })
      })

      if (textsToTranslate.length === 0) {
        setError('No texts found to translate')
        setIsTranslating(false)
        return
      }

      // Call translation API
      const response = await flowbotClient.translate(textsToTranslate, targetLang)

      if (response.translations && response.translations.length === textsToTranslate.length) {
        // Map translations back to items
        const translated: Record<string, TranslatedItem> = {}

        itemTextMap.forEach(({ itemId, titleIndex, previewIndex }) => {
          translated[itemId] = {
            id: itemId,
            title: titleIndex === undefined ? undefined : response.translations[titleIndex],
            preview: previewIndex === undefined ? undefined : response.translations[previewIndex]
          }
        })

        setTranslatedItems(translated)
        setTargetLanguage(targetLang)
      } else {
        setError('Translation response incomplete')
      }
    } catch (err) {
      console.error('Error translating portal content:', err)
      setError(err instanceof Error ? err.message : 'Failed to translate content')
      setTranslatedItems({})
    } finally {
      isTranslatingRef.current = false
      setIsTranslating(false)
    }
  }, [])

  /**
   * Reset translation state
   */
  const resetTranslation = useCallback(() => {
    setTargetLanguage(null)
    setTranslatedItems({})
    setError(null)
  }, [])

  const setTargetLanguageDirect = useCallback((languageId: string | null) => {
    setTargetLanguage(languageId)
    if (!languageId) {
      setTranslatedItems({})
      setError(null)
    }
  }, [])

  return {
    targetLanguage,
    translatedItems,
    isTranslating,
    error,
    translateAllContent,
    setTargetLanguage: setTargetLanguageDirect,
    resetTranslation
  }
}
