import React, { useEffect, useState } from 'react'
import { Input, useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'

interface SearchInputProps {
  onSearch: (query: string) => void
  className?: string
  placeholder?: string
  autoReset?: boolean
}

/**
 * Reusable search input component with debouncing
 */
const SearchInput: React.FC<SearchInputProps> = ({ onSearch, className = '', placeholder, autoReset = false }) => {
  const { t } = useTranslation(translations)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('')

  // Reset search query if autoReset is true
  useEffect(() => {
    if (autoReset) {
      setSearchQuery('')
      setDebouncedSearchQuery('')
    }
  }, [autoReset])

  // Implement debouncing with standard setTimeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Trigger the search callback when the debounced query changes
  useEffect(() => {
    onSearch(debouncedSearchQuery)
  }, [debouncedSearchQuery, onSearch])

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  return (
    <Input
      data-testid="content-search-input"
      name="searchContents"
      placeholder={placeholder ?? t('search_articles')}
      value={searchQuery}
      onChange={handleSearchChange}
      className={className}
    />
  )
}

export default SearchInput
