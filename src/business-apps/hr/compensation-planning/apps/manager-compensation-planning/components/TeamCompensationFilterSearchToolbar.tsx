import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { PiFunnelSimple, PiFunnelSimpleX, PiMagnifyingGlass } from 'react-icons/pi'
import { useDebounce } from '@/common/hooks/useDebounce'
import translations from '../_i18n'

export interface TeamCompensationFilterSearchToolbarProps {
  searchQuery: string
  onSearchChange: (search: string) => void
  onPageChange?: (page: number) => void
  showDataFilter: boolean
  onToggleDataFilter: () => void
  searchPlaceholder: string
  searchAriaLabel: string
}

export const TeamCompensationFilterSearchToolbar: React.FC<TeamCompensationFilterSearchToolbarProps> = ({
  searchQuery: searchQueryProp,
  onSearchChange,
  onPageChange,
  showDataFilter,
  onToggleDataFilter,
  searchPlaceholder,
  searchAriaLabel
}) => {
  const { t } = useTranslation(translations)
  const [localSearch, setLocalSearch] = useState(searchQueryProp)
  const [showSearchInput, setShowSearchInput] = useState(!!searchQueryProp)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchAreaRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(localSearch, 300)

  useEffect(() => {
    setLocalSearch(searchQueryProp)
  }, [searchQueryProp])

  useEffect(() => {
    if (debouncedSearch !== searchQueryProp) {
      onSearchChange(debouncedSearch)
      onPageChange?.(1)
    }
  }, [debouncedSearch, searchQueryProp, onSearchChange, onPageChange])

  useEffect(() => {
    if (showSearchInput && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearchInput])

  useEffect(() => {
    if (!showSearchInput) return
    const handleMouseDown = (e: MouseEvent) => {
      if (searchAreaRef.current && !searchAreaRef.current.contains(e.target as Node)) {
        setShowSearchInput(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [showSearchInput])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value)
  }, [])

  return (
    <div ref={searchAreaRef} className="gba:flex gba:flex-wrap gba:items-center gba:gap-4">
      <button
        type="button"
        className={`gba:flex gba:h-8 gba:w-8 gba:flex-none gba:shrink-0 gba:flex-row gba:items-center gba:justify-center gba:rounded gba:p-0 ${
          showDataFilter ? 'gba:!bg-black gba:text-white' : 'gba:!bg-black/[0.04] gba:text-black'
        }`}
        aria-label={t('filters-toggle-aria')}
        aria-pressed={showDataFilter}
        onClick={onToggleDataFilter}
        data-testid="manager-team-filter-toggle-button"
      >
        <span className="gba:flex-none gba:h-5 gba:w-5">
          {showDataFilter ? <PiFunnelSimpleX fill="currentColor" size={20} /> : <PiFunnelSimple size={20} />}
        </span>
      </button>
      {!showSearchInput ? (
        <button
          type="button"
          className="gba:flex gba:h-8 gba:w-8 gba:flex-none gba:shrink-0 gba:flex-row gba:items-center gba:justify-center gba:rounded gba:!bg-black/[0.04] gba:p-0 gba:text-black"
          aria-label={searchAriaLabel}
          onClick={() => setShowSearchInput(true)}
          data-testid="manager-team-search-toggle-button"
        >
          <span className="gba:flex-none gba:h-5 gba:w-5">
            <PiMagnifyingGlass size={20} />
          </span>
        </button>
      ) : (
        <div
          className="gba:flex gba:h-8 gba:min-w-52 gba:max-w-72 gba:flex-1 gba:items-center gba:rounded gba:bg-black/[0.04] gba:px-2"
          data-testid="manager-team-search-container"
        >
          <span className="gba:mr-2 gba:shrink-0 gba:text-gray-500" aria-hidden>
            <PiMagnifyingGlass size={20} />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={localSearch}
            onChange={handleInputChange}
            placeholder={searchPlaceholder}
            className="gba:flex-1 gba:min-w-0 gba:border-0 gba:bg-transparent gba:text-sm gba:outline-none gba:ring-0 gba:placeholder:text-gray-400"
            aria-label={searchAriaLabel}
            data-testid="manager-team-search-input"
          />
        </div>
      )}
    </div>
  )
}
