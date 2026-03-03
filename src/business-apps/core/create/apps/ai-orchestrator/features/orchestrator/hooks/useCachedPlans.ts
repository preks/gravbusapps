/**
 * useCachedPlans - Wrapper around useListPlans with localStorage caching
 *
 * Implements stale-while-revalidate pattern:
 * - Returns cached data immediately if available
 * - Refreshes in background if cache is stale (>5 minutes)
 * - Improves perceived performance for history sidebar
 */

import { useCallback, useEffect, useState } from 'react'
import { useListPlans, type UseListPlansOptions, type UseListPlansResult } from './useListPlans'
import type { BuildPlan } from '../types'

const CACHE_KEY_PREFIX = 'orchestrator-plans-cache'
const STALE_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  data: BuildPlan[]
  timestamp: number
}

function isEntryStale(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > STALE_MS
}

function getCacheKey(accessToken: string, params: UseListPlansOptions['params']): string {
  const tokenTail = (accessToken || '').slice(-20)
  const paramsStr = JSON.stringify(params || {})
  return `${CACHE_KEY_PREFIX}:${btoa(tokenTail)}:${paramsStr}`
}

function getFromCache(key: string): CacheEntry | null {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const entry = JSON.parse(cached) as CacheEntry
    return entry
  } catch (e) {
    console.warn('[useCachedPlans] Cache read error:', e)
    return null
  }
}

function saveToCache(key: string, data: BuildPlan[]): void {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch (e) {
    console.warn('[useCachedPlans] Cache write error:', e)
  }
}

export function useCachedPlans(options: UseListPlansOptions): UseListPlansResult {
  const { accessToken, params, enabled = true } = options

  const cacheKey = getCacheKey(accessToken, params)
  const [cachedEntry, setCachedEntry] = useState<CacheEntry | null>(() => {
    if (!enabled || !accessToken) return null
    return getFromCache(cacheKey)
  })

  useEffect(() => {
    if (!enabled || !accessToken) {
      setCachedEntry(null)
      return
    }
    setCachedEntry(getFromCache(cacheKey))
  }, [cacheKey, enabled, accessToken])

  const isStale = cachedEntry !== null && isEntryStale(cachedEntry)
  const enabledForFetch = enabled && (!cachedEntry || isStale)

  // Use the underlying hook; only fetch when no cache or cache is stale
  const result = useListPlans({ ...options, enabled: enabledForFetch })

  // Update cache when fresh data arrives
  useEffect(() => {
    if (result.data.length > 0 && !result.loading && !result.error) {
      saveToCache(cacheKey, result.data)
    }
  }, [result.data, result.loading, result.error, cacheKey])

  // Use cached data when we have it and (we're loading a refresh, or cache is fresh so we're not fetching)
  const shouldUseCached = enabled && cachedEntry !== null && cachedEntry.data.length > 0 && (result.loading || !isStale)

  // Wrapped refetch that updates cache
  const refetch = useCallback(async () => {
    await result.refetch()
  }, [result])

  // Return cached data immediately when appropriate; show loading only when stale and refreshing
  if (shouldUseCached) {
    return {
      data: cachedEntry.data,
      paging: result.paging,
      links: result.links,
      loading: isStale && result.loading,
      error: result.error,
      refetch
    }
  }

  return {
    ...result,
    refetch
  }
}

/**
 * Clear all cached plans (useful on logout or when cache needs invalidation)
 */
export function clearPlansCache(): void {
  try {
    const keys = Object.keys(localStorage)
    const plansCacheKeys = keys.filter(k => k.startsWith(CACHE_KEY_PREFIX))
    plansCacheKeys.forEach(key => localStorage.removeItem(key))
  } catch (e) {
    console.warn('[useCachedPlans] Cache clear error:', e)
  }
}
