import { useState, useCallback, useRef } from 'react'
import { DriveApiService } from '../services/DriveApiService'
import type { DriveSearchResult } from '../types/drive.types'

interface UseDriveSearchResult {
  results: DriveSearchResult[]
  isSearching: boolean
  query: string
  setQuery: (q: string) => void
  search: (q?: string) => Promise<void>
  clearSearch: () => void
}

export function useDriveSearch(): UseDriveSearchResult {
  const [results, setResults] = useState<DriveSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(
    async (q?: string) => {
      const searchQuery = q ?? query
      if (!searchQuery.trim()) {
        setResults([])
        return
      }
      setIsSearching(true)
      try {
        const searchResults = await DriveApiService.search(searchQuery, undefined, 20)
        setResults(searchResults)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [query]
  )

  const setQueryWithDebounce = useCallback(
    (q: string) => {
      setQuery(q)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (q.trim().length >= 2) {
        debounceRef.current = setTimeout(() => search(q), 300)
      } else {
        setResults([])
      }
    },
    [search]
  )

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  return { results, isSearching, query, setQuery: setQueryWithDebounce, search, clearSearch }
}
