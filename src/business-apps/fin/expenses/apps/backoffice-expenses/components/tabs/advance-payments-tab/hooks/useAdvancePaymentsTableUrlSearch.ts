import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'

function sanitizeUrlParam(value: string | null, maxLength: number): string {
  if (!value) return ''
  return value.replace(/[<>]/g, '').slice(0, maxLength)
}

interface UseAdvancePaymentsTableUrlSearchOptions {
  searchFromParent?: string
  onSearchChange?: (search: string) => void
}

export function useAdvancePaymentsTableUrlSearch(options: UseAdvancePaymentsTableUrlSearchOptions) {
  const { searchFromParent, onSearchChange } = options

  const [initialSearch] = useState(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    return sanitizeUrlParam(urlParams.get('search'), 200)
  })

  const [searchText, setSearchText] = useState<string>(searchFromParent ?? initialSearch)
  const debouncedSearchText = useDebounce(searchText, 300)

  const updateSearchParam = useCallback((value: string) => {
    const searchParams = new URLSearchParams(globalThis.location.search)
    if (value.trim() === '') {
      searchParams.delete('search')
    } else {
      searchParams.set('search', value)
    }

    const queryString = searchParams.toString()
    const separator = queryString ? '?' : ''
    globalThis.history.replaceState({}, '', `${globalThis.location.pathname}${separator}${queryString}`)
  }, [])

  useEffect(() => {
    updateSearchParam(searchText)
  }, [searchText, updateSearchParam])

  useEffect(() => {
    if (searchFromParent !== undefined && searchFromParent !== searchText) {
      setSearchText(searchFromParent)
    }
  }, [searchFromParent, searchText])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value)
      onSearchChange?.(value)
    },
    [onSearchChange]
  )

  return {
    searchText,
    debouncedSearchText,
    handleSearchChange
  }
}
