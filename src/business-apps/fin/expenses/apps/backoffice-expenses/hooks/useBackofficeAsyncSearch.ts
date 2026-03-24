import { useEffect, useState } from 'react'
import { getErrorMessage } from '../utils/errorUtils'

interface UseBackofficeAsyncSearchParams<TResult> {
  query: string
  searchFn: (query: string) => Promise<TResult[]>
  logContext: string
}

export function useBackofficeAsyncSearch<TResult>({
  query,
  searchFn,
  logContext
}: UseBackofficeAsyncSearchParams<TResult>) {
  const [results, setResults] = useState<TResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (trimmedQuery.length === 0) {
      setResults([])
      setLoading(false)
      return
    }

    let isCancelled = false

    const runSearch = async () => {
      setLoading(true)

      try {
        const nextResults = await searchFn(trimmedQuery)
        if (!isCancelled) {
          setResults(nextResults)
        }
      } catch (error) {
        console.error(logContext, getErrorMessage(error))
        if (!isCancelled) {
          setResults([])
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void runSearch()

    return () => {
      isCancelled = true
    }
  }, [query, searchFn, logContext])

  return {
    results,
    loading
  }
}
