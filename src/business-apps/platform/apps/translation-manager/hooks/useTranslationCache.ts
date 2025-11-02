import { useCallback, useEffect, useState } from 'react'

interface CachedTranslation {
  keyId: string
  locale: string
  value: any // AST Pattern
  timestamp: number
}

interface CachedReview {
  keyId: string
  reviewed: boolean
  timestamp: number
}

interface TranslationCache {
  scopePath: string
  translations: CachedTranslation[]
  reviews: CachedReview[]
}

const CACHE_KEY = 'translation-manager-cache'

/**
 * Hook for caching unsaved translations and review states in localStorage
 */
export function useTranslationCache(scopePath: string | null) {
  const [cache, setCache] = useState<TranslationCache | null>(null)

  // Load cache on mount or when scope changes
  useEffect(() => {
    if (!scopePath) {
      setCache(null)
      return
    }

    try {
      const stored = localStorage.getItem(CACHE_KEY)
      if (stored) {
        const allCaches: TranslationCache[] = JSON.parse(stored)
        const scopeCache = allCaches.find(c => c.scopePath === scopePath)
        setCache(scopeCache || { scopePath, translations: [], reviews: [] })
      } else {
        setCache({ scopePath, translations: [], reviews: [] })
      }
    } catch (e) {
      console.error('[useTranslationCache] Failed to load cache:', e)
      setCache({ scopePath, translations: [], reviews: [] })
    }
  }, [scopePath])

  // Save translation change to cache
  const cacheTranslation = useCallback(
    (keyId: string, locale: string, value: any) => {
      if (!cache) return

      const updated: TranslationCache = {
        ...cache,
        translations: [
          ...cache.translations.filter(t => !(t.keyId === keyId && t.locale === locale)),
          { keyId, locale, value, timestamp: Date.now() }
        ]
      }

      setCache(updated)
      saveToLocalStorage(updated)
    },
    [cache]
  )

  // Mark key as reviewed
  const markKeyReviewed = useCallback(
    (keyId: string, reviewed: boolean) => {
      if (!cache) return

      const updated: TranslationCache = {
        ...cache,
        reviews: [...cache.reviews.filter(r => r.keyId !== keyId), { keyId, reviewed, timestamp: Date.now() }]
      }

      setCache(updated)
      saveToLocalStorage(updated)
    },
    [cache]
  )

  // Get cached translation
  const getCachedTranslation = useCallback(
    (keyId: string, locale: string): any | null => {
      if (!cache) return null
      const cached = cache.translations.find(t => t.keyId === keyId && t.locale === locale)
      return cached?.value || null
    },
    [cache]
  )

  // Check if key is reviewed
  const isKeyReviewed = useCallback(
    (keyId: string): boolean => {
      if (!cache) return false
      const review = cache.reviews.find(r => r.keyId === keyId)
      return review?.reviewed || false
    },
    [cache]
  )

  // Get all reviewed keys
  const getReviewedKeys = useCallback((): string[] => {
    if (!cache) return []
    return cache.reviews.filter(r => r.reviewed).map(r => r.keyId)
  }, [cache])

  // Clear cache for current scope
  const clearCache = useCallback(() => {
    if (!cache) return

    try {
      const stored = localStorage.getItem(CACHE_KEY)
      if (stored) {
        const allCaches: TranslationCache[] = JSON.parse(stored)
        const filtered = allCaches.filter(c => c.scopePath !== cache.scopePath)
        localStorage.setItem(CACHE_KEY, JSON.stringify(filtered))
      }
      setCache({ scopePath: cache.scopePath, translations: [], reviews: [] })
    } catch (e) {
      console.error('[useTranslationCache] Failed to clear cache:', e)
    }
  }, [cache])

  return {
    cacheTranslation,
    markKeyReviewed,
    getCachedTranslation,
    isKeyReviewed,
    getReviewedKeys,
    clearCache
  }
}

// Helper to save cache to localStorage
function saveToLocalStorage(updated: TranslationCache) {
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    const allCaches: TranslationCache[] = stored ? JSON.parse(stored) : []

    // Update or add scope cache
    const index = allCaches.findIndex(c => c.scopePath === updated.scopePath)
    if (index >= 0) {
      allCaches[index] = updated
    } else {
      allCaches.push(updated)
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(allCaches))
  } catch (e) {
    console.error('[saveToLocalStorage] Failed to save cache:', e)
  }
}
