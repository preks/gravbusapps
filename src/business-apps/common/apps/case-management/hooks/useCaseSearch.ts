/**
 * useCaseSearch Hook
 *
 * Hook for searching cases to link (excludes current case and already linked cases)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { CaseApiClient } from '../services/CaseApiClient'
import { LinkedCase } from '../types'

export interface CaseSearchResult {
  caseId: string
  title: string
  status: string
  priority?: string
  createdAt: string
}

interface UseCaseSearchProps {
  context: BusinessAppContextProps
  currentCaseId: string
  linkedCases: LinkedCase[]
  tags?: Record<string, string>
}

export const useCaseSearch = ({ context, currentCaseId, linkedCases, tags }: UseCaseSearchProps) => {
  const [searchResults, setSearchResults] = useState<CaseSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Cache ref to avoid repeated API calls for the same query
  const cacheRef = useRef<Map<string, CaseSearchResult[]>>(new Map())

  // Create API client instance
  const apiClient = new CaseApiClient(context.customFlowEngineApiUrl, context.accessToken)

  // Get list of case IDs that should be excluded
  const excludeLinkedCaseIds = linkedCases.map(c => c.caseId)

  /**
   * Search for cases to link
   * @param query Search query string (searches title and case ID)
   */
  const searchCases = useCallback(
    async (query: string) => {
      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // If query is too short, clear results
      if (!query.trim() || query.length < 2) {
        setSearchResults([])
        return
      }

      // Check cache first
      const cacheKey = `${query.toLowerCase()}_${tags ? JSON.stringify(tags) : ''}`
      if (cacheRef.current.has(cacheKey)) {
        setSearchResults(cacheRef.current.get(cacheKey)!)
        return
      }

      // Debounce the search
      debounceTimerRef.current = setTimeout(async () => {
        try {
          setIsSearching(true)
          setError(null)

          const cases = await apiClient.searchCasesForLinking(currentCaseId, excludeLinkedCaseIds, query, tags)

          const results: CaseSearchResult[] = cases.map(c => ({
            caseId: c.caseId,
            title: c.state?.metadata?.title || 'Untitled Case',
            status: c.state?.metadata?.status || 'open',
            priority: c.state?.metadata?.priority,
            createdAt: c.createdAt
          }))

          // Cache the results
          cacheRef.current.set(cacheKey, results)

          setSearchResults(results)
        } catch (err) {
          console.error('Error searching cases:', err)
          setError(err instanceof Error ? err : new Error('Failed to search cases'))
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      }, 300) // 300ms debounce
    },
    [currentCaseId, excludeLinkedCaseIds, tags, context.accessToken, context.customFlowEngineApiUrl]
  )

  /**
   * Clear search results and cache
   */
  const clearResults = useCallback(() => {
    setSearchResults([])
    setError(null)
  }, [])

  /**
   * Clear the cache (useful when linked cases change)
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  // Clear cache when linked cases change
  useEffect(() => {
    clearCache()
  }, [linkedCases.length, clearCache])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    searchResults,
    isSearching,
    error,
    searchCases,
    clearResults,
    clearCache
  }
}
