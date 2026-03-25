import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'

function sanitizeUrlParam(value: string | null, maxLength: number): string {
  if (!value) return ''
  return value.replace(/[<>]/g, '').slice(0, maxLength)
}

function sanitizeIntParam(value: string | null, fallback: number, minValue: number): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback
  if (Number.isNaN(parsed)) return fallback
  return Math.max(parsed, minValue)
}

export interface UseExpenseRequestsTableUrlSearchOptions {
  searchFromParent?: string
  onSearchChange?: (search: string) => void
  handleSearch: (value: string) => void
}

export function useExpenseRequestsTableUrlSearch(options: UseExpenseRequestsTableUrlSearchOptions) {
  const { searchFromParent, onSearchChange, handleSearch } = options

  const [initialParams] = useState(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    return {
      search: sanitizeUrlParam(urlParams.get('search'), 200),
      page: sanitizeIntParam(urlParams.get('page'), 1, 1),
      pageSize: sanitizeIntParam(urlParams.get('pageSize'), 20, 1),
      status: sanitizeUrlParam(urlParams.get('status'), 50),
      department: sanitizeUrlParam(urlParams.get('department'), 100)
    }
  })

  const [searchText, setSearchText] = useState<string>(searchFromParent ?? initialParams.search)
  const debouncedSearchText = useDebounce(searchText, 300)

  const setOrDeleteParam = useCallback(
    (searchParams: URLSearchParams, key: string, value: string | number | undefined, shouldKeep: boolean) => {
      if (value === undefined) {
        return
      }
      if (shouldKeep) {
        searchParams.set(key, String(value))
      } else {
        searchParams.delete(key)
      }
    },
    []
  )

  const updateURLParams = useCallback(
    (params: { search?: string; page?: number; pageSize?: number; status?: string; department?: string }) => {
      const newSearchParams = new URLSearchParams(globalThis.location.search)

      setOrDeleteParam(newSearchParams, 'search', params.search, !!params.search)
      setOrDeleteParam(newSearchParams, 'page', params.page, params.page !== undefined && params.page > 1)
      setOrDeleteParam(
        newSearchParams,
        'pageSize',
        params.pageSize,
        params.pageSize !== undefined && params.pageSize !== 20
      )
      setOrDeleteParam(newSearchParams, 'status', params.status, !!params.status)
      setOrDeleteParam(newSearchParams, 'department', params.department, !!params.department)

      const queryString = newSearchParams.toString()
      const separator = queryString ? '?' : ''
      globalThis.history.replaceState({}, '', `${globalThis.location.pathname}${separator}${queryString}`)
    },
    [setOrDeleteParam]
  )

  useEffect(() => {
    if (searchText !== initialParams.search) {
      updateURLParams({ search: searchText })
    }
  }, [searchText, initialParams.search, updateURLParams])

  useEffect(() => {
    handleSearch(debouncedSearchText)
  }, [debouncedSearchText, handleSearch])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value)
      onSearchChange?.(value)
    },
    [onSearchChange]
  )

  return {
    searchText,
    setSearchText,
    debouncedSearchText,
    handleSearchChange,
    initialParams
  }
}
