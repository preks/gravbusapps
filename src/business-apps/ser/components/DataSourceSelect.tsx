/**
 * DataSourceSelect Component
 *
 * A searchable select component that dynamically fetches options from
 * the custom-flow-engine datasource endpoint.
 *
 * Features:
 * - Dynamic search with debouncing
 * - Loading states
 * - Error handling
 * - Supports both ENTITY and CATALOG data sources
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Input, Spinner } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, CaretDownIcon, XCircleIcon, WarningIcon } from '@phosphor-icons/react'
import { useDataSource, DataSourceOption } from '../hooks/useDataSource'
import { DataSourceConfig } from '../types/flowTemplate'

export interface DataSourceSelectProps {
  id: string
  value?: string
  onChange: (value: string) => void
  // Optional dataSource - if not provided, only static options will be shown
  dataSource?: DataSourceConfig
  accessToken: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  'data-testid'?: string
  // Static options to show (used as initial/fallback when dataSource is provided, or as only options when not)
  initialOptions?: Array<{ value: string; label: string }>
}

export const DataSourceSelect: React.FC<DataSourceSelectProps> = ({
  id,
  value = '',
  onChange,
  dataSource,
  accessToken,
  placeholder = 'Search and select...',
  // required - kept in interface for future form validation integration
  disabled = false,
  className = '',
  'data-testid': testId,
  initialOptions
}) => {
  // Ensure initialOptions is always an array (handles explicit undefined)
  const safeInitialOptions = initialOptions ?? []

  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    options: apiOptions,
    isLoading,
    error,
    search,
    loadMore,
    hasMore,
    totalCount
  } = useDataSource(dataSource, accessToken)

  // Merge initial options with API options, preferring API when available
  // If API fails or no results, fall back to initial options
  const options = React.useMemo(() => {
    // Convert initial options to DataSourceOption format
    const initialOpts: DataSourceOption[] = safeInitialOptions.map(opt => ({
      value: opt.value,
      label: opt.label
    }))

    // If API has returned options, use them
    if (apiOptions.length > 0) {
      return apiOptions
    }

    // If API failed (error) or still loading, show initial options as fallback
    if (initialOpts.length > 0) {
      return initialOpts
    }

    return []
  }, [apiOptions, safeInitialOptions])

  // Only show error if we have no fallback options to display
  const showError = error && safeInitialOptions.length === 0

  // Determine if search input should be shown (hide for 10 or fewer options)
  const SEARCH_THRESHOLD = 10
  const estimatedTotalOptions = Math.max(totalCount, apiOptions.length, safeInitialOptions.length)
  const showSearchInput = estimatedTotalOptions > SEARCH_THRESHOLD || hasMore

  // Find the selected option's label (check both API and initial options)
  const selectedOption =
    options.find(opt => String(opt.value) === String(value)) ||
    safeInitialOptions.find(opt => String(opt.value) === String(value))
  const displayValue = selectedOption?.label || ''

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value
      setSearchTerm(term)
      search(term)
    },
    [search]
  )

  // Handle option selection
  const handleSelect = useCallback(
    (option: DataSourceOption) => {
      onChange(String(option.value))
      setIsOpen(false)
      setSearchTerm('')
    },
    [onChange]
  )

  // Handle clear selection
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange('')
      setSearchTerm('')
    },
    [onChange]
  )

  // Handle scroll for infinite loading
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement
      const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50
      if (bottom && hasMore && !isLoading) {
        loadMore()
      }
    },
    [hasMore, isLoading, loadMore]
  )

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={`gba:relative ${className}`} data-testid={testId || `datasource-select-${id}`}>
      {/* Selected Value Display / Trigger */}
      <div
        className={`gba:min-h-[40px] gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:flex gba:items-center gba:justify-between gba:cursor-pointer ${
          disabled ? 'gba:opacity-50 gba:cursor-not-allowed gba:bg-muted' : 'gba:hover:border-primary'
        } ${isOpen ? 'gba:border-primary gba:ring-2 gba:ring-primary/20' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        data-testid={`${testId || id}-trigger`}
      >
        <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
          {value && displayValue ? (
            <span className="gba:truncate">{displayValue}</span>
          ) : (
            <span className="gba:text-muted-foreground">{placeholder}</span>
          )}
        </div>

        <div className="gba:flex gba:items-center gba:gap-1 gba:ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="gba:p-1 gba:rounded gba:hover:bg-muted gba:text-muted-foreground gba:hover:text-foreground"
              data-testid={`${testId || id}-clear`}
            >
              <XCircleIcon className="gba:w-4 gba:h-4" />
            </button>
          )}
          <CaretDownIcon
            className={`gba:w-4 gba:h-4 gba:text-muted-foreground gba:transition-transform ${isOpen ? 'gba:rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:z-50 gba:mt-1 gba:rounded-md gba:border gba:bg-popover gba:shadow-lg">
          {/* Search Input - only show when more than 10 options */}
          {showSearchInput && (
            <div className="gba:p-2 gba:border-b">
              <div className="gba:relative">
                <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder={`Search ${dataSource?.entity || dataSource?.catalog || 'options'}...`}
                  className="gba:pl-9 gba:h-9"
                  data-testid={`${testId || id}-search`}
                />
                {isLoading && (
                  <div className="gba:absolute gba:right-3 gba:top-1/2 gba:transform gba:-translate-y-1/2">
                    <Spinner size="sm" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error State - only show if no fallback options available */}
          {showError && (
            <div className="gba:p-3 gba:text-sm gba:text-destructive gba:bg-destructive/10 gba:border-b gba:flex gba:items-center gba:gap-2">
              <WarningIcon className="gba:w-4 gba:h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Options List */}
          <div
            className="gba:max-h-60 gba:overflow-y-auto"
            onScroll={handleScroll}
            data-testid={`${testId || id}-options`}
          >
            {options.length === 0 && !isLoading ? (
              <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">
                {searchTerm ? 'No results found' : 'No options available'}
              </div>
            ) : (
              <>
                {options.map(option => (
                  <div
                    key={String(option.value)}
                    className={`gba:px-3 gba:py-2.5 gba:text-sm gba:cursor-pointer gba:flex gba:items-center gba:gap-2 gba:hover:bg-accent gba:hover:text-accent-foreground ${
                      String(option.value) === String(value) ? 'gba:bg-primary/10 gba:text-primary' : ''
                    }`}
                    onClick={() => handleSelect(option)}
                    data-testid={`${testId || id}-option-${option.value}`}
                  >
                    <span className="gba:flex-1 gba:truncate">{option.label}</span>
                    {option.metadata?.code && option.metadata.code !== option.label && (
                      <span className="gba:text-xs gba:text-muted-foreground gba:shrink-0">
                        ({option.metadata.code})
                      </span>
                    )}
                  </div>
                ))}

                {/* Loading indicator at bottom - only show when loading API data */}
                {isLoading && apiOptions.length > 0 && (
                  <div className="gba:p-3 gba:flex gba:items-center gba:justify-center">
                    <Spinner size="sm" />
                    <span className="gba:ml-2 gba:text-sm gba:text-muted-foreground">Loading more...</span>
                  </div>
                )}

                {/* Load more indicator - only show when using API options and there's more to load */}
                {hasMore && !isLoading && apiOptions.length > 0 && totalCount > 0 && (
                  <div className="gba:p-2 gba:text-center gba:text-xs gba:text-muted-foreground gba:border-t">
                    Scroll for more ({apiOptions.length} of {totalCount})
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DataSourceSelect
