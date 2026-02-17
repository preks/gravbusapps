/**
 * Session Storage Cache Management for Flight Risk Feature
 * Handles cleanup of old sentiment analysis results and other cached data
 */

const CACHE_KEYS = {
  SENTIMENT_PREFIX: 'flightRisk_sentiment_',
  RISK_SCORES_PREFIX: 'flightRisk_scores_',
  LAST_FETCH: 'flightRisk_lastFetch'
} as const

const CACHE_TTL = {
  SENTIMENT: 24 * 60 * 60 * 1000, // 24 hours
  RISK_SCORES: 60 * 60 * 1000, // 1 hour
  LAST_FETCH: 5 * 60 * 1000 // 5 minutes
} as const

const hasSessionStorage = (): boolean => globalThis.sessionStorage !== undefined

/**
 * Get all cache keys with a specific prefix
 */
const getKeysWithPrefix = (prefix: string): string[] => {
  if (!hasSessionStorage()) return []

  const keys: string[] = []
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(prefix)) {
        keys.push(key)
      }
    }
  } catch (err) {
    console.warn('Failed to read session storage keys:', err)
  }
  return keys
}

/**
 * Clear all flight risk related cache
 */
export const clearAllFlightRiskCache = (): void => {
  if (!hasSessionStorage()) return

  try {
    const allKeys = [
      ...getKeysWithPrefix(CACHE_KEYS.SENTIMENT_PREFIX),
      ...getKeysWithPrefix(CACHE_KEYS.RISK_SCORES_PREFIX),
      CACHE_KEYS.LAST_FETCH
    ]

    allKeys.forEach(key => sessionStorage.removeItem(key))
    console.log(`Cleared ${allKeys.length} flight risk cache entries`)
  } catch (err) {
    console.error('Failed to clear flight risk cache:', err)
  }
}

/**
 * Clear expired cache entries based on TTL
 */
export const clearExpiredFlightRiskCache = (): void => {
  if (!hasSessionStorage()) return

  try {
    const now = Date.now()

    // Clear old sentiment cache
    const sentimentKeys = getKeysWithPrefix(CACHE_KEYS.SENTIMENT_PREFIX)
    sentimentKeys.forEach(key => {
      try {
        const item = sessionStorage.getItem(key)
        if (item) {
          const parsed = JSON.parse(item)
          if (parsed.timestamp && now - parsed.timestamp > CACHE_TTL.SENTIMENT) {
            sessionStorage.removeItem(key)
          }
        }
      } catch {
        // If parsing fails, remove the corrupted entry
        sessionStorage.removeItem(key)
      }
    })

    // Clear old risk scores cache
    const scoresKeys = getKeysWithPrefix(CACHE_KEYS.RISK_SCORES_PREFIX)
    scoresKeys.forEach(key => {
      try {
        const item = sessionStorage.getItem(key)
        if (item) {
          const parsed = JSON.parse(item)
          if (parsed.timestamp && now - parsed.timestamp > CACHE_TTL.RISK_SCORES) {
            sessionStorage.removeItem(key)
          }
        }
      } catch {
        sessionStorage.removeItem(key)
      }
    })

    // Clear old last fetch timestamp
    try {
      const lastFetch = sessionStorage.getItem(CACHE_KEYS.LAST_FETCH)
      if (lastFetch) {
        const timestamp = Number.parseInt(lastFetch, 10)
        if (now - timestamp > CACHE_TTL.LAST_FETCH) {
          sessionStorage.removeItem(CACHE_KEYS.LAST_FETCH)
        }
      }
    } catch {
      sessionStorage.removeItem(CACHE_KEYS.LAST_FETCH)
    }
  } catch (err) {
    console.error('Failed to clear expired cache:', err)
  }
}

/**
 * Get cache statistics for debugging
 */
export const getFlightRiskCacheStats = (): {
  sentimentCount: number
  riskScoresCount: number
  totalSize: number
} => {
  if (!hasSessionStorage()) {
    return { sentimentCount: 0, riskScoresCount: 0, totalSize: 0 }
  }

  try {
    const sentimentKeys = getKeysWithPrefix(CACHE_KEYS.SENTIMENT_PREFIX)
    const scoresKeys = getKeysWithPrefix(CACHE_KEYS.RISK_SCORES_PREFIX)

    let totalSize = 0
    ;[...sentimentKeys, ...scoresKeys].forEach(key => {
      try {
        const item = sessionStorage.getItem(key)
        if (item) {
          totalSize += new Blob([item]).size
        }
      } catch {
        // Ignore size calculation errors
      }
    })

    return {
      sentimentCount: sentimentKeys.length,
      riskScoresCount: scoresKeys.length,
      totalSize
    }
  } catch (err) {
    console.error('Failed to get cache stats:', err)
    return { sentimentCount: 0, riskScoresCount: 0, totalSize: 0 }
  }
}

/**
 * Initialize cache management
 * Should be called when the flight risk feature loads
 */
export const initFlightRiskCache = (): void => {
  // Clear expired entries on init
  clearExpiredFlightRiskCache()

  // Set up periodic cleanup (every 5 minutes)
  if (globalThis.addEventListener !== undefined) {
    const cleanupInterval = setInterval(
      () => {
        clearExpiredFlightRiskCache()
      },
      5 * 60 * 1000
    )

    // Clean up interval on page unload
    globalThis.addEventListener('beforeunload', () => {
      clearInterval(cleanupInterval)
    })
  }
}
