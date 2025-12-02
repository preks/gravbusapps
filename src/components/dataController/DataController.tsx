import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { PiFunnelSimple, PiFunnelSimpleX, PiMagnifyingGlass, PiXCircle, PiX } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DataControllerActions } from './DataControllerActions'

/**
 * Column configuration interface for table column visibility
 */
export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  disabled?: boolean // For columns that can't be hidden (like Actions)
}

/**
 * Column visibility configuration for DataController
 */
export interface ColumnVisibilityConfig {
  columns: ColumnConfig[]
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void
  'data-testid'?: string
}

/**
 * PlusSquareIcon - SVG icon for the Add button.
 */
export const PlusSquareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
    <path
      d="M14.25 0.5H1.75C1.41848 0.5 1.10054 0.631696 0.866116 0.866116C0.631696 1.10054 0.5 1.41848 0.5 1.75V14.25C0.5 14.5815 0.631696 14.8995 0.866116 15.1339C1.10054 15.3683 1.41848 15.5 1.75 15.5H14.25C14.5815 15.5 14.8995 15.3683 15.1339 15.1339C15.3683 14.8995 15.5 14.5815 15.5 14.25V1.75C15.5 1.41848 15.3683 1.10054 15.1339 0.866116C14.8995 0.631696 14.5815 0.5 14.25 0.5ZM14.25 14.25H1.75V1.75H14.25V14.25ZM11.75 8C11.75 8.16576 11.6842 8.32473 11.5669 8.44194C11.4497 8.55915 11.2908 8.625 11.125 8.625H8.625V11.125C8.625 11.2908 8.55915 11.4497 8.44194 11.5669C8.32473 11.6842 8.16576 11.75 8 11.75C7.83424 11.75 7.67527 11.6842 7.55806 11.5669C7.44085 11.4497 7.375 11.2908 7.375 11.125V8.625H4.875C4.70924 8.625 4.55027 8.55915 4.43306 8.44194C4.31585 8.32473 4.25 8.16576 4.25 8C4.25 7.83424 4.31585 7.67527 4.43306 7.55806C4.55027 7.44085 4.70924 7.375 4.875 7.375H7.375V4.875C7.375 4.70924 7.44085 4.55027 7.55806 4.43306C7.67527 4.31585 7.83424 4.25 8 4.25C8.16576 4.25 8.32473 4.31585 8.44194 4.43306C8.55915 4.55027 8.625 4.70924 8.625 4.875V7.375H11.125C11.2908 7.375 11.4497 7.44085 11.5669 7.55806C11.6842 7.67527 11.75 7.83424 11.75 8Z"
      fill="black"
    />
  </svg>
)

/**
 * Generic DataController for DataContainer listHeader.
 * Contains a filter toggle button and a search button/field.
 *
 * @param showDataFilter - Whether the filter sidebar is open
 * @param onToggleDataFilter - Callback to toggle the filter sidebar
 * @param search - Current search value
 * @param setSearch - Callback to update search value
 * @param placeholder - Placeholder for the search input
 * @param className - Optional additional class names
 */
/**
 * Props for DataController component.
 * @param listTitle - Optional title to display next to the search bar
 * @param listIcon - Optional icon to display in front of amount
 * @param listAmount - Optional amount to display after the title
 * @param actions - Optional actions to display right-aligned. This can be a single ReactNode or an array of ReactNodes (e.g., multiple action buttons such as Export, Archive, etc.).
 * @param addButton - Optional Add button. If provided, will be rendered in the actions-frame with dedicated design.
 */
export interface DataControllerProps {
  showDataFilter: boolean
  onToggleDataFilter: () => void
  search: string
  setSearch: (v: string) => void
  debounceDelay?: number
  filter: string[]
  setFilter: (v: string[]) => void
  filterLabelMap?: Record<string, string> // Maps filter values (IDs) to display labels
  placeholder?: string
  className?: string
  listTitle?: React.ReactNode
  listIcon?: React.ReactNode
  listAmount?: React.ReactNode
  /**
   * If true, the filter button will be hidden
   */
  hideFilter?: boolean
  /**
   * Optional actions to display on the right side of the bar. Can be a single ReactNode or an array of ReactNodes (e.g., multiple action buttons such as Add, Export, Archive).
   */
  actions?: React.ReactNode | React.ReactNode[]
  /**
   * Optional Add button. If provided, will be rendered in the actions-frame with dedicated design.
   */
  addButton?: {
    onClick: () => void
    label: string
    icon?: React.ReactNode
    'data-testid'?: string
  }
  /**
   * Optional date range filter state
   */
  dateRange?: {
    createdAfter?: string
    createdBefore?: string
    onClear?: () => void
  }
  /**
   * Optional column visibility configuration. When provided, a column visibility dropdown will be automatically added to the actions.
   */
  columnVisibility?: ColumnVisibilityConfig
}

export const DataController: React.FC<Readonly<DataControllerProps>> = ({
  showDataFilter,
  onToggleDataFilter,
  search,
  setSearch,
  debounceDelay = 300,
  filter = [],
  setFilter,
  filterLabelMap,
  placeholder = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_list.employee_report_filter.job_search',
    'Search'
  ) + '...',
  listTitle,
  listIcon,
  listAmount,
  actions,
  addButton,
  hideFilter = false,
  dateRange,
  columnVisibility
}) => {
  const [localSearch, setLocalSearch] = useState(search)
  const [showSearchInput, setShowSearchInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Local state for immediate UI feedback
  // Keep local search in sync with external changes to search prop
  useEffect(() => {
    setLocalSearch(search || '')
  }, [search])

  // Use the useDebounce hook to debounce the local search value
  const debouncedSearch = useDebounce(localSearch, debounceDelay)

  // Call setSearch only when the debounced value changes and differs from current search
  useEffect(() => {
    // Only update if the debounced value differs from the current search prop
    // This prevents recursion and unnecessary updates
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch)
    }
  }, [debouncedSearch, search, setSearch])

  // Simple handler for input changes - updates local state immediately
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value)
  }, [])

  useEffect(() => {
    if (showSearchInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showSearchInput])

  // Helper function to format date range labels
  const formatDateRangeLabel = useCallback((createdAfter?: string, createdBefore?: string): string => {
    if (createdAfter && createdBefore) {
      const startDate = new Date(createdAfter).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      const endDate = new Date(createdBefore).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      return `${startDate} - ${endDate}`
    } else if (createdAfter) {
      const startDate = new Date(createdAfter).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      return `after ${startDate}`
    } else if (createdBefore) {
      const endDate = new Date(createdBefore).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      return `before ${endDate}`
    }
    return ''
  }, [])

  //

  // Check if date range filter is active
  const hasDateRangeFilter = dateRange && (dateRange.createdAfter || dateRange.createdBefore)

  return (
    <div className="gba:w-full gba:bg-white gba:px-2 gba:pt-2" data-testid="data-controller-container">
      <div
        className="gba:flex gba:flex-row gba:items-center gba:w-full gba:gap-2"
        data-testid="data-controller-main-bar"
      >
        {/* Left: Filter and Search */}
        <div
          className="gba:flex gba:flex-row gba:items-center gba:gap-2 gba:pb-5 gba:shrink-0"
          data-testid="data-controller-left-section"
        >
          {!hideFilter && (
            <>
              <button
                className={`gba:flex gba:flex-row gba:justify-center gba:items-center gba:p-0 gba:w-8 gba:h-8 gba:rounded gba:flex-none gba:order-0 gba:grow-0 ${
                  showDataFilter ? 'gba:!bg-black gba:text-white' : 'gba:!bg-black/[0.04] gba:text-black'
                }`}
                aria-label={showDataFilter ? 'Close filter sidebar' : 'Open filter sidebar'}
                onClick={onToggleDataFilter}
                type="button"
                data-testid="data-controller-filter-toggle-button"
              >
                <div className="gba:w-5 gba:h-5 gba:flex-none order-0 gba:grow-0">
                  {showDataFilter ? <PiFunnelSimpleX fill="#fff" size={20} /> : <PiFunnelSimple size={20} />}
                </div>
              </button>
            </>
          )}
          {!showSearchInput ? (
            <button
              className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:p-0 gba:w-8 gba:h-8 gba:rounded gba:!bg-black/[0.04] gba:flex-none gba:order-0 gba:grow-0"
              aria-label="Open search"
              onClick={() => setShowSearchInput(true)}
              type="button"
              data-testid="data-controller-search-toggle-button"
            >
              <div className="gba:w-5 gba:h-5 gba:flex-none gba:order-0 gba:grow-0">
                <PiMagnifyingGlass size={20} />
              </div>
            </button>
          ) : (
            <div
              className="gba:flex gba:items-center gba:bg-black/[0.04] gba:rounded gba:px-2 gba:h-8 gba:w-[240px]"
              data-testid="data-controller-search-container"
            >
              <span className="gba:text-gray-500 gba:mr-2">
                <PiMagnifyingGlass size={20} />
              </span>
              <input
                ref={inputRef}
                className="gba:bg-transparent gba:border-none gba:outline-none gba:w-full gba:text-sm"
                type="text"
                placeholder={placeholder}
                value={localSearch}
                onChange={e => handleSearchChange(e.target.value)}
                data-testid="data-controller-search-input"
              />
            </div>
          )}
          {/* Center: List Title */}
          {listTitle && (
            <div
              className="gba:flex-1 gba:ml-1 gba:font-semibold gba:text-base gba:text-black gba:truncate"
              data-testid="data-controller-list-title"
            >
              {listTitle}
            </div>
          )}
          {/* Optional: Icon and Amount */}
          {(listIcon || listAmount) && (
            <div
              className="gba:flex gba:flex-row gba:items-center gba:gap-2 gba:ml-2"
              data-testid="data-controller-list-info"
            >
              {listIcon && <span data-testid="data-controller-list-icon">{listIcon}</span>}
              {listAmount && (
                <span
                  className="gba:font-semibold gba:text-base gba:text-gray-700"
                  data-testid="data-controller-list-amount"
                >
                  {listAmount}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions (memoized to avoid unnecessary re-renders) */}
        {(addButton || actions || columnVisibility) && (
          <DataControllerActions
            addButton={useMemo(() => {
              if (!addButton) return undefined
              return {
                ...addButton,
                icon: addButton.icon ?? <PlusSquareIcon />
              }
            }, [addButton])}
            actions={actions}
            columnVisibility={columnVisibility}
          />
        )}
      </div>
      {/* Filter pills row: always below the bar group, left-aligned */}
      {((filter && filter.length > 0) || hasDateRangeFilter) && (
        <div
          className="gba:flex gba:flex-wrap gba:items-start gba:gap-2 gba:self-start gba:mb-4 gba:max-w-full"
          data-testid="data-controller-filters-section"
        >
          {/* Date range filter pill */}
          {hasDateRangeFilter && (
            <div
              className="gba:flex gba:min-h-6 gba:py-1 gba:px-3 gba:items-center gba:gap-3 gba:rounded-full gba:bg-blue-100 gba:max-w-80 gba:break-words gba:filter-pill gba:flex-shrink-0"
              data-testid="data-controller-date-range-filter"
            >
              <span className="gba:text-blue-800 gba:text-sm gba:leading-tight gba:whitespace-normal gba:filter-pill-text">
                {formatDateRangeLabel(dateRange?.createdAfter, dateRange?.createdBefore)}
              </span>
              <button
                className="gba:ml-0.5 gba:bg-transparent gba:border-none gba:text-blue-800 gba:w-3 gba:h-3 gba:flex gba:items-center gba:justify-center gba:p-0 gba:cursor-pointer gba:rounded-full gba:hover:bg-blue-200 gba:transition-colors"
                onClick={dateRange?.onClear}
                aria-label="Remove date range filter"
                tabIndex={0}
                type="button"
                data-testid="data-controller-date-range-clear-button"
              >
                <PiX size={12} />
              </button>
            </div>
          )}

          {/* Regular filter pills */}
          {filter &&
            filter.length > 0 &&
            setFilter &&
            filter.map(val => (
              <div
                key={val}
                className="gba:flex gba:min-h-6 gba:py-1 gba:px-3 gba:items-center gba:gap-3 gba:rounded-full gba:bg-gray-100 gba:max-w-80 gba:break-words gba:filter-pill gba:flex-shrink-0"
                data-testid={`data-controller-filter-pill-${val}`}
              >
                <span className="gba:text-sm gba:leading-tight gba:whitespace-normal gba:filter-pill-text">
                  {filterLabelMap?.[val] ?? val}
                </span>
                <button
                  className="gba:ml-0.5 gba:bg-transparent gba:border-none gba:text-gray-800 gba:w-3 gba:h-3 gba:flex gba:items-center gba:justify-center gba:p-0 gba:cursor-pointer gba:rounded-full gba:hover:bg-gray-200 gba:transition-colors gba:flex-shrink-0"
                  onClick={() => setFilter(filter.filter(f => f !== val))}
                  aria-label={`Remove filter ${filterLabelMap?.[val] ?? val}`}
                  tabIndex={0}
                  type="button"
                  data-testid={`data-controller-filter-remove-button-${val}`}
                >
                  <PiX size={12} />
                </button>
              </div>
            ))}

          {/* Clear all filters button */}
          <button
            className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:text-gray-600 gba:hover:text-gray-800 gba:transition-colors"
            onClick={() => {
              if (setFilter) setFilter([])
              if (dateRange?.onClear) dateRange.onClear()
            }}
            type="button"
            data-testid="data-controller-clear-all-filters-button"
          >
            <span>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.clear_all_filters_btn',
                'Clear all filters'
              )}
            </span>
            <span className="gba:flex gba:items-center gba:justify-center">
              <PiXCircle size={16} />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
