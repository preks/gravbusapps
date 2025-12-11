import { useState, useCallback } from 'react'
import type { MentionOption } from './useMentions'

/**
 * Hook for fetching mention suggestions
 * This is a simplified version that can be extended with actual API calls
 */
export function useMentionSuggestions(accessToken: string) {
  const [suggestions, setSuggestions] = useState<MentionOption[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setSuggestions([])
        return
      }

      setIsLoading(true)

      try {
        // TODO: Implement actual API call to fetch employees/entities
        // For now, return empty array - this will be populated by backend search

        // Placeholder implementation - can be extended with:
        // - GraphQL employee search
        // - Entity search across different types
        // - Catalog entry search

        setSuggestions([])
      } catch (error) {
        console.error('Failed to fetch mention suggestions:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken]
  )

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  return {
    suggestions,
    isLoading,
    fetchSuggestions,
    clearSuggestions
  }
}
