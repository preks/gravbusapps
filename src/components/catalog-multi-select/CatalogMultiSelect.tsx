import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Chip, cn } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface CatalogMultiSelectOption {
  id: string
  value: string
  label: string
  isNew?: boolean
}

interface CatalogMultiSelectProps extends BusinessAppContextProps {
  catalogIdentifier: string
  catalogVersion?: string
  value: string[]
  onValueChange: (value: string[]) => void
  onNewItemsChange?: (items: CatalogMultiSelectOption[]) => void
  placeholder?: string
  createNewLabel?: string
  allowCreate?: boolean
  'data-testid'?: string
}

export const CatalogMultiSelect = React.forwardRef<any, CatalogMultiSelectProps>(
  (
    {
      catalogIdentifier,
      catalogVersion = 'v1',
      value = [],
      onValueChange,
      onNewItemsChange,
      placeholder = 'Type to add...',
      createNewLabel = 'Create',
      allowCreate = true,
      accessToken,
      'data-testid': dataTestId
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState('')
    const [options, setOptions] = useState<CatalogMultiSelectOption[]>([])
    const [filteredOptions, setFilteredOptions] = useState<CatalogMultiSelectOption[]>([])
    const [loading, setLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const [newItems, setNewItems] = useState<Map<string, CatalogMultiSelectOption>>(new Map())
    const [offset, setOffset] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)
    const observerTarget = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const catalogClient = useCatalogManagerClient(accessToken)
    const PAGE_SIZE = 50

    // Load catalog entries with pagination
    const loadCatalogEntries = useCallback(
      async (searchQuery?: string, currentOffset = 0, append = false) => {
        setLoading(true)
        try {
          const response = await catalogClient.getCatalogEntriesList(
            {
              catalogIdentifier,
              version: catalogVersion
            },
            {
              limit: PAGE_SIZE,
              offset: currentOffset,
              returnTotalRecords: true,
              includeChildCatalogEntries: true,
              ...(searchQuery && { searchCriteria: searchQuery })
            }
          )

          const catalogOptions: CatalogMultiSelectOption[] = (response.data || []).map((entry: any) => ({
            id: entry.id,
            value: entry.id,
            label: entry.value || entry.code || entry.id,
            isNew: false
          }))

          setOptions(prev => (append ? [...prev, ...catalogOptions] : catalogOptions))
          setTotalCount(response.paging?.totalRecords || catalogOptions.length)
          setHasMore(currentOffset + catalogOptions.length < (response.paging?.totalRecords || 0))
          setOffset(currentOffset + catalogOptions.length)
        } catch (error) {
          console.error(`Error loading catalog ${catalogIdentifier}:`, error)
          if (!append) {
            setOptions([])
          }
        } finally {
          setLoading(false)
        }
      },
      [catalogClient, catalogIdentifier, catalogVersion, PAGE_SIZE]
    )

    // Initial load
    useEffect(() => {
      if (accessToken) {
        loadCatalogEntries(undefined, 0, false)
      }
    }, [accessToken]) // Only on mount

    // Load more when scrolling
    const loadMore = useCallback(() => {
      if (!loading && hasMore) {
        loadCatalogEntries(inputValue || undefined, offset, true)
      }
    }, [loading, hasMore, offset, inputValue, loadCatalogEntries])

    // Intersection Observer for infinite scroll
    useEffect(() => {
      const observer = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasMore && !loading) {
            loadMore()
          }
        },
        { threshold: 0.1 }
      )

      const target = observerTarget.current
      if (target) {
        observer.observe(target)
      }

      return () => {
        if (target) {
          observer.unobserve(target)
        }
      }
    }, [hasMore, loading, loadMore])

    // Filter options based on input - only filter locally if searching
    useEffect(() => {
      if (!inputValue.trim()) {
        // Show all loaded options when no search
        setFilteredOptions(options.filter(opt => !value.includes(opt.id)))
        return
      }

      // When typing, search in backend
      const searchLower = inputValue.toLowerCase()

      // Show local filtered results immediately
      const localFiltered = allOptions.filter(
        opt => !value.includes(opt.id) && opt.label.toLowerCase().includes(searchLower)
      )
      setFilteredOptions(localFiltered)

      // Trigger backend search after delay
      const timeoutId = setTimeout(() => {
        setOffset(0)
        loadCatalogEntries(inputValue, 0, false)
      }, 300)

      return () => clearTimeout(timeoutId)
    }, [inputValue, value])

    // Update filtered options when options change (for pagination)
    useEffect(() => {
      if (!inputValue.trim()) {
        setFilteredOptions(options.filter(opt => !value.includes(opt.id)))
      }
    }, [options, value, inputValue])

    // Combine options with new items
    const allOptions = useMemo(() => {
      const combined = [...options]
      newItems.forEach(item => {
        if (!combined.some(opt => opt.id === item.id)) {
          combined.push(item)
        }
      })
      return combined
    }, [options, newItems])

    // Get selected items
    const selectedItems = useMemo(() => {
      return value.map(v => allOptions.find(opt => opt.id === v)).filter(Boolean) as CatalogMultiSelectOption[]
    }, [value, allOptions])

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      setShowSuggestions(true)
      setHighlightedIndex(-1)
    }

    // Handle input focus - show suggestions immediately
    const handleInputFocus = () => {
      setShowSuggestions(true)
      // If no options loaded yet and no search, load initial set
      if (options.length === 0 && !inputValue.trim()) {
        loadCatalogEntries(undefined, 0, false)
      }
    }

    // Handle input blur with delay to allow clicking on suggestions
    const handleInputBlur = () => {
      setTimeout(() => {
        setShowSuggestions(false)
        setHighlightedIndex(-1)
      }, 200)
    }

    // Add existing option
    const addOption = useCallback(
      (option: CatalogMultiSelectOption) => {
        onValueChange([...value, option.id])
        setInputValue('')
        setShowSuggestions(false)
        setHighlightedIndex(-1)
        inputRef.current?.focus()
      },
      [value, onValueChange]
    )

    // Create and add new option
    const createNewOption = useCallback(() => {
      if (!inputValue.trim() || !allowCreate) return

      const tempId = `new-${Date.now()}-${inputValue}`
      const newOption: CatalogMultiSelectOption = {
        id: tempId,
        value: tempId,
        label: inputValue.trim(),
        isNew: true
      }

      // Add to newItems map
      const updated = new Map(newItems)
      updated.set(tempId, newOption)
      setNewItems(updated)

      // Notify parent
      if (onNewItemsChange) {
        onNewItemsChange(Array.from(updated.values()))
      }

      // Add to selected values
      onValueChange([...value, tempId])
      setInputValue('')
      setShowSuggestions(false)
      setHighlightedIndex(-1)
      inputRef.current?.focus()
    }, [inputValue, allowCreate, newItems, value, onValueChange, onNewItemsChange])

    // Remove option
    const removeOption = useCallback(
      (optionId: string) => {
        onValueChange(value.filter(v => v !== optionId))

        // Remove from newItems if it was new
        if (newItems.has(optionId)) {
          const updated = new Map(newItems)
          updated.delete(optionId)
          setNewItems(updated)

          if (onNewItemsChange) {
            onNewItemsChange(Array.from(updated.values()))
          }
        }
      },
      [value, onValueChange, newItems, onNewItemsChange]
    )

    // Check if search matches existing
    const searchMatchesExisting = useMemo(() => {
      return allOptions.some(opt => opt.label.toLowerCase() === inputValue.toLowerCase())
    }, [allOptions, inputValue])

    // Helper: Handle Enter key
    const handleEnterKey = useCallback(() => {
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        addOption(filteredOptions[highlightedIndex])
      } else if (
        highlightedIndex === filteredOptions.length &&
        allowCreate &&
        inputValue.trim() &&
        !searchMatchesExisting
      ) {
        createNewOption()
      } else if (inputValue.trim() && allowCreate) {
        createNewOption()
      }
    }, [highlightedIndex, filteredOptions, addOption, allowCreate, inputValue, searchMatchesExisting, createNewOption])

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions) return

      const totalSuggestions =
        filteredOptions.length + (allowCreate && inputValue.trim() && !searchMatchesExisting ? 1 : 0)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex(prev => (prev < totalSuggestions - 1 ? prev + 1 : prev))
        setShowSuggestions(true)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleEnterKey()
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
        setHighlightedIndex(-1)
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        removeOption(value[value.length - 1])
      }
    }

    // Get new items for ref
    const getNewItems = useCallback((): CatalogMultiSelectOption[] => {
      return Array.from(newItems.values())
    }, [newItems])

    // Expose methods via ref
    React.useImperativeHandle(
      ref,
      () => ({
        getNewItems,
        focus: () => inputRef.current?.focus()
      }),
      [getNewItems]
    )

    return (
      <div className="gba:relative gba:w-full" data-testid={dataTestId}>
        {/* Tags + Input Container */}
        <div
          ref={containerRef}
          className={cn(
            'gba:min-h-[40px] gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background',
            'gba:px-3 gba:py-2 gba:text-sm',
            'focus-within:gba:ring-2 focus-within:gba:ring-ring focus-within:gba:ring-offset-2',
            'gba:flex gba:flex-wrap gba:gap-2 gba:items-center'
          )}
        >
          {/* Selected Tags */}
          {selectedItems.map(item => (
            <Chip
              key={item.id}
              size="sm"
              variant={item.isNew ? 'status' : 'default'}
              intent={item.isNew ? 'info' : undefined}
              removable
              onRemove={() => removeOption(item.id)}
              className="gba:flex-shrink-0"
            >
              {item.isNew && <Plus className="gba:h-3 gba:w-3 gba:mr-1" />}
              {item.label}
            </Chip>
          ))}

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={selectedItems.length === 0 ? placeholder : ''}
            className={cn(
              'gba:flex-1 gba:min-w-[120px] gba:bg-transparent gba:outline-none',
              'placeholder:gba:text-muted-foreground'
            )}
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div
            ref={suggestionsRef}
            style={{ width: containerRef.current?.offsetWidth || 'auto' }}
            className={cn(
              'gba:absolute gba:z-50 gba:mt-1 gba:left-0 gba:rounded-md gba:border gba:border-border',
              'gba:bg-popover gba:shadow-md gba:max-h-[300px] gba:overflow-y-auto'
            )}
          >
            <div className="gba:p-1">
              {/* Loading indicator at top when initial load */}
              {loading && filteredOptions.length === 0 && (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                  Loading...
                </div>
              )}

              {/* No results */}
              {!loading && filteredOptions.length === 0 && !allowCreate && (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                  No results found
                </div>
              )}

              {/* Existing options */}
              {filteredOptions.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    'gba:px-3 gba:py-2 gba:text-sm gba:cursor-pointer gba:rounded-sm gba:w-full gba:text-left',
                    'hover:gba:bg-accent hover:gba:text-accent-foreground',
                    'gba:flex gba:items-center gba:gap-2 gba:bg-transparent gba:border-0',
                    highlightedIndex === index && 'gba:bg-accent gba:text-accent-foreground'
                  )}
                  onMouseDown={e => {
                    e.preventDefault()
                    addOption(option)
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => addOption(option)}
                >
                  {option.isNew && <Plus className="gba:h-3 gba:w-3 gba:text-muted-foreground" />}
                  <span>{option.label}</span>
                </button>
              ))}

              {/* Infinite scroll trigger */}
              {hasMore && (
                <output
                  ref={observerTarget}
                  className="gba:px-3 gba:py-2 gba:text-sm gba:text-muted-foreground gba:text-center"
                  aria-live="polite"
                >
                  {loading ? 'Loading more...' : ''}
                </output>
              )}

              {/* Create new option - always at the bottom */}
              {allowCreate && inputValue.trim() && !searchMatchesExisting && (
                <button
                  type="button"
                  className={cn(
                    'gba:px-3 gba:py-2 gba:text-sm gba:cursor-pointer gba:rounded-sm',
                    'hover:gba:bg-accent hover:gba:text-accent-foreground',
                    'gba:flex gba:items-center gba:gap-2',
                    'gba:text-primary gba:font-medium',
                    'gba:border-t gba:border-border gba:mt-1 gba:pt-2',
                    'gba:w-full gba:text-left gba:bg-transparent gba:border-0',
                    highlightedIndex === filteredOptions.length && 'gba:bg-accent gba:text-accent-foreground'
                  )}
                  onMouseDown={e => {
                    e.preventDefault()
                    createNewOption()
                  }}
                  onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                  onClick={() => createNewOption()}
                >
                  <Plus className="gba:h-4 gba:w-4" />
                  <span>
                    {createNewLabel} "{inputValue.trim()}"
                  </span>
                </button>
              )}

              {/* Total count info */}
              {!loading && filteredOptions.length > 0 && (
                <div className="gba:px-3 gba:py-1 gba:text-xs gba:text-muted-foreground gba:text-center gba:border-t gba:border-border gba:mt-1">
                  Showing {filteredOptions.length} of {totalCount} {inputValue.trim() ? 'matches' : 'items'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
)

CatalogMultiSelect.displayName = 'CatalogMultiSelect'

// Export helper to get new items from ref
export const getNewItemsFromMultiSelect = (ref: React.RefObject<any>): CatalogMultiSelectOption[] => {
  return ref.current?.getNewItems?.() || []
}
