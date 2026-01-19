/**
 * DataSourceMultiSelect Component
 *
 * A searchable multi-select component that dynamically fetches options from
 * the custom-flow-engine datasource endpoint.
 *
 * Features:
 * - Dynamic search with debouncing
 * - Multiple selection with badges
 * - Loading states
 * - Error handling
 * - Supports both ENTITY and CATALOG data sources
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Input, Spinner } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, XIcon, CheckIcon, WarningIcon } from '@phosphor-icons/react'
import { useDataSource, DataSourceOption } from '../hooks/useDataSource'
import { DataSourceConfig } from '../types/flowTemplate'

export interface DataSourceMultiSelectProps {
  id: string
  value?: string[]
  onChange: (values: string[]) => void
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

export const DataSourceMultiSelect: React.FC<DataSourceMultiSelectProps> = ({
  id,
  value = [],
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
  // Memoize to stabilize reference and prevent unnecessary re-renders
  const safeInitialOptions = React.useMemo(() => initialOptions ?? [], [initialOptions])

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

  // Track selected options with their labels (for display when not in dropdown)
  const [selectedLabels, setSelectedLabels] = useState<Map<string, string>>(() => {
    // Initialize with labels from initialOptions
    const labels = new Map<string, string>()
    safeInitialOptions.forEach(opt => {
      if (value.includes(opt.value)) {
        labels.set(opt.value, opt.label)
      }
    })
    return labels
  })

  // Update selected labels when options load or value changes
  useEffect(() => {
    const newLabels = new Map<string, string>()
    options.forEach(opt => {
      if (value.includes(String(opt.value))) {
        newLabels.set(String(opt.value), opt.label)
      }
    })
    setSelectedLabels(newLabels)
  }, [options, value])

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value
      setSearchTerm(term)
      search(term)
    },
    [search]
  )

  // Handle option toggle
  const handleToggle = useCallback(
    (option: DataSourceOption) => {
      const optionValue = String(option.value)
      const isSelected = value.includes(optionValue)

      if (isSelected) {
        // Remove from selection
        onChange(value.filter(v => v !== optionValue))
        setSelectedLabels(prev => {
          const next = new Map(prev)
          next.delete(optionValue)
          return next
        })
      } else {
        // Add to selection
        onChange([...value, optionValue])
        setSelectedLabels(prev => new Map(prev).set(optionValue, option.label))
      }
    },
    [value, onChange]
  )

  // Handle remove badge
  const handleRemove = useCallback(
    (optionValue: string) => {
      onChange(value.filter(v => v !== optionValue))
      setSelectedLabels(prev => {
        const next = new Map(prev)
        next.delete(optionValue)
        return next
      })
    },
    [value, onChange]
  )

  // Handle clear all
  const handleClearAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange([])
      setSelectedLabels(new Map())
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

  // Get label for a value
  const getLabelForValue = (val: string): string => {
    // First check our cached labels
    if (selectedLabels.has(val)) {
      return selectedLabels.get(val)!
    }
    // Then check current options
    const option = options.find(opt => String(opt.value) === val)
    if (option?.label) return option.label
    // Finally check initial options
    const initialOption = safeInitialOptions.find(opt => String(opt.value) === val)
    return initialOption?.label || val
  }

  return (
    <div
      ref={containerRef}
      className={`gba:relative ${className}`}
      data-testid={testId || `datasource-multiselect-${id}`}
    >
      {/* Selected Values Display / Trigger */}
      <div
        className={`gba:min-h-[40px] gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:flex gba:flex-wrap gba:gap-1.5 gba:items-center gba:cursor-pointer ${
          disabled ? 'gba:opacity-50 gba:cursor-not-allowed gba:bg-muted' : 'gba:hover:border-primary'
        } ${isOpen ? 'gba:border-primary gba:ring-2 gba:ring-primary/20' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        data-testid={`${testId || id}-trigger`}
      >
        {value.length === 0 ? (
          <span className="gba:text-muted-foreground gba:text-sm">{placeholder}</span>
        ) : (
          <>
            {value.map(val => (
              <span
                key={val}
                className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:bg-primary gba:px-2 gba:py-0.5 gba:text-xs gba:text-primary-foreground gba:max-w-[150px]"
              >
                <span className="gba:truncate">{getLabelForValue(val)}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      handleRemove(val)
                    }}
                    className="gba:ml-0.5 gba:hover:bg-primary/80 gba:rounded-full gba:p-0.5"
                    data-testid={`${testId || id}-remove-${val}`}
                  >
                    <XIcon className="gba:w-3 gba:h-3" />
                  </button>
                )}
              </span>
            ))}
          </>
        )}

        {/* Clear all button */}
        {value.length > 1 && !disabled && (
          <button
            type="button"
            onClick={handleClearAll}
            className="gba:ml-auto gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:underline"
            data-testid={`${testId || id}-clear-all`}
          >
            Clear all
          </button>
        )}

        {/* Dropdown indicator */}
        <span
          className={`gba:ml-auto gba:text-muted-foreground gba:transition-transform ${isOpen ? 'gba:rotate-180' : ''}`}
        >
          ▼
        </span>
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

          {/* Selection count - always show when items are selected */}
          {value.length > 0 && (
            <div className="gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground gba:border-b gba:bg-muted/30">
              {value.length} item{value.length !== 1 ? 's' : ''} selected
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
                {options.map(option => {
                  const isSelected = value.includes(String(option.value))
                  return (
                    <div
                      key={String(option.value)}
                      className={`gba:px-3 gba:py-2.5 gba:text-sm gba:cursor-pointer gba:flex gba:items-center gba:gap-2 gba:hover:bg-accent gba:hover:text-accent-foreground ${
                        isSelected ? 'gba:bg-primary/10' : ''
                      }`}
                      onClick={() => handleToggle(option)}
                      data-testid={`${testId || id}-option-${option.value}`}
                    >
                      {/* Checkbox indicator */}
                      <div
                        className={`gba:w-4 gba:h-4 gba:border gba:rounded gba:flex gba:items-center gba:justify-center gba:shrink-0 ${
                          isSelected
                            ? 'gba:bg-primary gba:border-primary gba:text-primary-foreground'
                            : 'gba:border-input'
                        }`}
                      >
                        {isSelected && <CheckIcon className="gba:w-3 gba:h-3" weight="bold" />}
                      </div>

                      <span className="gba:flex-1 gba:truncate">{option.label}</span>
                      {option.metadata?.code && option.metadata.code !== option.label && (
                        <span className="gba:text-xs gba:text-muted-foreground gba:shrink-0">
                          ({option.metadata.code})
                        </span>
                      )}
                    </div>
                  )
                })}

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

export default DataSourceMultiSelect
