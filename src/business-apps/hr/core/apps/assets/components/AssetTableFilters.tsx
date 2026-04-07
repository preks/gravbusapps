import React, { useState, useEffect, useRef, useCallback } from 'react'
import { PiFunnelSimple, PiFunnelSimpleX, PiMagnifyingGlass } from 'react-icons/pi'
import { useDebounce } from '@/common/hooks/useDebounce'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AssetTableFiltersProps {
  searchQuery: string
  onSearchChange: (search: string) => void
  onPageChange?: (page: number) => void
  /** When provided, shows the filter toggle button (Category/Location/Status sidebar) inline with search */
  showDataFilter?: boolean
  onToggleDataFilter?: () => void
  /** Override search field placeholder and aria (defaults: Assets copy) */
  searchPlaceholder?: string
  searchAriaLabel?: string
}

export const AssetTableFilters: React.FC<AssetTableFiltersProps> = ({
  searchQuery: searchQueryProp,
  onSearchChange,
  onPageChange,
  showDataFilter = false,
  onToggleDataFilter,
  searchPlaceholder,
  searchAriaLabel
}) => {
  const searchPlaceholderResolved =
    searchPlaceholder || getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.search_assets', 'Search assets...')
  const searchAriaResolved =
    searchAriaLabel || getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.search_assets', 'Search assets...')
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
    <div ref={searchAreaRef} className="gba:flex gba:gap-4 gba:flex-wrap gba:items-center">
      {onToggleDataFilter && (
        <button
          type="button"
          className={`gba:flex gba:flex-row gba:justify-center gba:items-center gba:p-0 gba:w-8 gba:h-8 gba:rounded gba:flex-none gba:shrink-0 ${
            showDataFilter ? 'gba:!bg-black gba:text-white' : 'gba:!bg-black/[0.04] gba:text-black'
          }`}
          aria-label={showDataFilter ? 'Close filter sidebar' : 'Open filter sidebar'}
          onClick={onToggleDataFilter}
          data-testid="asset-table-filter-toggle-button"
        >
          <span className="gba:w-5 gba:h-5 gba:flex-none">
            {showDataFilter ? <PiFunnelSimpleX fill="currentColor" size={20} /> : <PiFunnelSimple size={20} />}
          </span>
        </button>
      )}
      {!showSearchInput ? (
        <button
          type="button"
          className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:p-0 gba:w-8 gba:h-8 gba:rounded gba:!bg-black/[0.04] gba:text-black gba:flex-none gba:shrink-0"
          aria-label={searchAriaResolved}
          onClick={() => setShowSearchInput(true)}
          data-testid="asset-table-search-toggle-button"
        >
          <span className="gba:w-5 gba:h-5 gba:flex-none">
            <PiMagnifyingGlass size={20} />
          </span>
        </button>
      ) : (
        <div
          className="gba:flex gba:items-center gba:bg-black/[0.04] gba:rounded gba:px-2 gba:h-8 gba:min-w-[200px] gba:max-w-[280px] gba:flex-1"
          data-testid="asset-search-container"
        >
          <span className="gba:text-gray-500 gba:mr-2 gba:shrink-0" aria-hidden>
            <PiMagnifyingGlass size={20} />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={localSearch}
            onChange={handleInputChange}
            placeholder={searchPlaceholderResolved}
            className="gba:flex-1 gba:min-w-0 gba:bg-transparent gba:border-0 gba:outline-none gba:ring-0 gba:text-sm gba:placeholder:text-gray-400"
            aria-label={searchAriaResolved}
            data-testid="asset-search-input"
          />
        </div>
      )}
    </div>
  )
}
