import { useState, useCallback, useRef } from 'react'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

export interface SearchResult {
  rowId: string
  sheetId: string
  sheetName: string
  boardId: string
  boardName: string
  matchSnippet: string
  data: Record<string, unknown>
  source: 'keyword' | 'semantic'
  score?: number
  position?: number
}

export interface UseBoardSearchReturn {
  results: SearchResult[]
  isSearching: boolean
  error: string | null
  search: (boardId: string, query: string, options?: { sheetId?: string }) => Promise<void>
  searchAllBoards: (boards: Array<{ id: string; name: string }>, query: string) => Promise<void>
  clear: () => void
}

export function useBoardSearch(accessToken: string): UseBoardSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const search = useCallback(
    async (boardId: string, query: string, options?: { sheetId?: string }) => {
      if (!query.trim()) {
        setResults([])
        return
      }
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      setIsSearching(true)
      setError(null)

      try {
        const res = await fetchSearchResults(boardId, '', query, accessToken, options?.sheetId)
        setResults(res)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setIsSearching(false)
      }
    },
    [accessToken]
  )

  const searchAllBoards = useCallback(
    async (boards: Array<{ id: string; name: string }>, query: string) => {
      if (!query.trim()) {
        setResults([])
        return
      }
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      setIsSearching(true)
      setError(null)

      try {
        const recentBoards = boards.slice(0, 8)
        const promises = recentBoards.map(b =>
          fetchSearchResults(b.id, b.name, query, accessToken).catch(() => [] as SearchResult[])
        )
        const arrays = await Promise.all(promises)
        const all = arrays.flat()
        all.sort((a, b) => (b.score || 0) - (a.score || 0))
        setResults(all)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setIsSearching(false)
      }
    },
    [accessToken]
  )

  const clear = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  return { results, isSearching, error, search, searchAllBoards, clear }
}

async function fetchSearchResults(
  boardId: string,
  boardName: string,
  query: string,
  accessToken: string,
  sheetId?: string
): Promise<SearchResult[]> {
  const API_URL = getDocumentServiceApiUrl()
  const params = new URLSearchParams({ q: query })
  if (sheetId) params.set('sheetId', sheetId)

  const response = await fetch(`${API_URL}/boards/${boardId}/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!response.ok) return []
  const data = await response.json()

  return (
    data as Array<{
      rowId: string
      sheetId: string
      sheetName: string
      matchSnippet: string
      data: Record<string, unknown>
      position?: number
      similarity?: number
    }>
  ).map(r => ({
    ...r,
    boardId,
    boardName,
    source: (r.similarity && r.similarity < 1 ? 'semantic' : 'keyword') as SearchResult['source'],
    score: r.similarity ?? 1,
    position: r.position ?? 0
  }))
}
