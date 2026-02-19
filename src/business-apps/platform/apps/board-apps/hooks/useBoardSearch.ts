/**
 * useBoardSearch - keyword + semantic hybrid search for boards.
 * Supports single-board and cross-board (global) search modes.
 */

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
  search: (boardId: string, query: string, options?: { sheetId?: string; semantic?: boolean }) => Promise<void>
  searchAllBoards: (
    boardIds: Array<{ id: string; name: string }>,
    query: string,
    options?: { semantic?: boolean }
  ) => Promise<void>
  clear: () => void
}

export function useBoardSearch(accessToken: string): UseBoardSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const search = useCallback(
    async (boardId: string, query: string, options?: { sheetId?: string; semantic?: boolean }) => {
      if (!query.trim()) {
        setResults([])
        return
      }
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      setIsSearching(true)
      setError(null)

      try {
        const keywordResults = await fetchKeywordResults(boardId, '', query, accessToken, options?.sheetId)

        let semanticResults: SearchResult[] = []
        if (options?.semantic !== false) {
          semanticResults = await fetchSemanticResults(query, accessToken, [boardId])
        }

        const merged = mergeAndRank(keywordResults, semanticResults)
        setResults(merged)
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
    async (boards: Array<{ id: string; name: string }>, query: string, options?: { semantic?: boolean }) => {
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
        const keywordPromises = recentBoards.map(b =>
          fetchKeywordResults(b.id, b.name, query, accessToken).catch(() => [] as SearchResult[])
        )
        const keywordArrays = await Promise.all(keywordPromises)
        const allKeyword = keywordArrays.flat()

        let semanticResults: SearchResult[] = []
        if (options?.semantic !== false) {
          semanticResults = await fetchSemanticResults(query, accessToken)
          for (const r of semanticResults) {
            if (!r.boardName) {
              const match = boards.find(b => b.id === r.boardId)
              if (match) r.boardName = match.name
            }
          }
        }

        const merged = mergeAndRank(allKeyword, semanticResults)
        setResults(merged)
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

async function fetchKeywordResults(
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
    }>
  ).map(r => ({
    ...r,
    boardId,
    boardName,
    source: 'keyword' as const,
    score: 1,
    position: r.position ?? 0
  }))
}

async function fetchSemanticResults(query: string, accessToken: string, boardIds?: string[]): Promise<SearchResult[]> {
  const API_URL = getDocumentServiceApiUrl()

  try {
    const body: Record<string, unknown> = {
      query,
      contentTypes: ['board'],
      limit: 20,
      similarityThreshold: 0.3
    }
    if (boardIds?.length) body.contentIds = boardIds

    const response = await fetch(`${API_URL}/embeddings/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body)
    })
    if (!response.ok) return []
    const data = await response.json()

    return (
      data as Array<{
        contentId: string
        chunkText: string
        similarity: number
        title?: string
        metadata?: Record<string, unknown>
      }>
    )
      .map(r => ({
        rowId: (r.metadata?.rowId as string) || '',
        sheetId: (r.metadata?.sheetId as string) || '',
        sheetName: (r.metadata?.sheetName as string) || '',
        boardId: r.contentId || '',
        boardName: r.title || '',
        matchSnippet: r.chunkText?.slice(0, 120) || '',
        data: {},
        source: 'semantic' as const,
        score: r.similarity
      }))
      .filter(r => r.rowId)
  } catch {
    return []
  }
}

function mergeAndRank(keyword: SearchResult[], semantic: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  const merged: SearchResult[] = []

  for (const r of keyword) {
    if (!seen.has(r.rowId)) {
      const semMatch = semantic.find(s => s.rowId === r.rowId)
      merged.push({ ...r, score: 0.6 + (semMatch ? semMatch.score! * 0.4 : 0) })
      seen.add(r.rowId)
    }
  }

  for (const r of semantic) {
    if (!seen.has(r.rowId)) {
      merged.push({ ...r, score: r.score! * 0.8 })
      seen.add(r.rowId)
    }
  }

  return merged.sort((a, b) => (b.score || 0) - (a.score || 0))
}
