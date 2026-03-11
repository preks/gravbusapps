import { useEffect, useState } from 'react'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailLabelSuggestion } from '../types'

interface UseLabelSuggestionsOptions {
  query: string
  existingLabels: string[]
  limit?: number
  debounceMs?: number
  refreshKey?: number
}

export function useLabelSuggestions({
  query,
  existingLabels,
  limit = 10,
  debounceMs = 250,
  refreshKey = 0
}: UseLabelSuggestionsOptions) {
  const [suggestions, setSuggestions] = useState<EmailLabelSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    const timeoutId = setTimeout(async () => {
      try {
        const results = await EmailApiService.searchLabelSuggestions(normalizedQuery, limit)
        if (cancelled) return

        const existing = new Set(existingLabels.map(label => label.toLowerCase()))
        setSuggestions(results.filter(suggestion => !existing.has(suggestion.name.toLowerCase())))
      } catch {
        if (!cancelled) setSuggestions([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }, debounceMs)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [query, existingLabels, limit, debounceMs, refreshKey])

  return { suggestions, isLoading }
}
