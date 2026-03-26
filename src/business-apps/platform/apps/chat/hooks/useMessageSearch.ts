import { useState, useEffect, useCallback, useRef } from 'react'
import type { Message } from '../types'
import type { ChatClient } from '@/common/network/chat/ChatClient'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

export interface UseMessageSearchOptions {
  apiClient: ChatClient | null
  conversationId: string | null
  enabled?: boolean
}

export function useMessageSearch({ apiClient, conversationId, enabled = true }: UseMessageSearchOptions) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [total, setTotal] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRequestRef = useRef<string | null>(null)

  const clearResults = useCallback(() => {
    setResults([])
    setTotal(0)
    setError(null)
  }, [])

  useEffect(() => {
    setQuery('')
    clearResults()
  }, [conversationId, enabled, clearResults])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH || !apiClient || !conversationId) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      clearResults()
      setIsLoading(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      const requestKey = `${conversationId}:${trimmed}`
      lastRequestRef.current = requestKey
      setIsLoading(true)
      setError(null)
      apiClient
        .searchMessages(conversationId, trimmed, { page: 1, limit: 20 })
        .then(res => {
          if (lastRequestRef.current !== requestKey) return
          setResults(res.data ?? [])
          setTotal(res.total ?? 0)
        })
        .catch(err => {
          if (lastRequestRef.current !== requestKey) return
          setError(err instanceof Error ? err : new Error(String(err)))
          setResults([])
          setTotal(0)
        })
        .finally(() => {
          if (lastRequestRef.current === requestKey) setIsLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [query, conversationId, apiClient, enabled, clearResults])

  const clearSearch = useCallback(() => {
    setQuery('')
    clearResults()
  }, [clearResults])

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    total,
    clearSearch
  }
}
