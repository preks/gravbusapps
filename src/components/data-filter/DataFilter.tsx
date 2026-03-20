import React, { useState } from 'react'
import { CaretUpIcon, CaretDownIcon } from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import { cn } from '../../common/utils/cn'
import { DebouncedInput } from './DebouncedInput'
import { getTranslationFromI18nKeyAndLabel } from '../../common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import dfTranslations from './_i18n'

/**
 * Data Filter Group type definition
 */
export interface DataFilterGroup {
  id: string
  title: string
  filters?: DataFilter[]
  type?: string // e.g., 'organizationalUnit', 'employee', etc.
  /**
   * Optional backend search hook or function. If provided, it should be a React hook or function
   * that takes a search string and returns { filters, loading, error }.
   * If not provided, local filtering will be used.
   */
  backendSearch?: (search: string) => {
    filters: DataFilter[]
    loading: boolean
    error: any
  }
  /**
   * Optional custom component to render instead of the default filter list.
   * If provided, the search input will be hidden for this group.
   */
  customComponent?: React.ReactNode
  /**
   * If true, hides the search input for this filter group
   */
  hideSearch?: boolean
  /**
   * Optional message when no filters are shown (e.g. "Type to search for an employee")
   */
  emptyMessage?: string
}

/**
 * Data Filter type definition
 */
export interface DataFilter {
  id: string
  label: string
  selected: boolean
  count?: number
}

/**
 * Generic Data Filter component with filter groups functionality.
 * @param show - Whether the sidebar is visible
 * @param onClose - Callback to close the sidebar
 * @param filterGroups - Array of filter groups to display
 * @param onFilterChange - Callback when a filter is toggled
 * @param className - Optional additional class names
 */
export interface DataFilterProps {
  show: boolean
  onClose: () => void
  filterGroups?: DataFilterGroup[]
  onFilterChange?: (filterId: string, selected: boolean) => void
  /** Called when user types in a group's search box; use to sync search for backend-search groups (e.g. employee). */
  onGroupSearchChange?: (groupId: string, value: string) => void
  className?: string
  children?: React.ReactNode
}

export const DataFilter: React.FC<Readonly<DataFilterProps>> = ({
  show,
  filterGroups = [],
  onFilterChange,
  onGroupSearchChange,
  className = '',
  children
}) => {
  const { t } = useTranslation(dfTranslations)
  // State for global search functionality
  const [searchQuery] = useState('')
  const [showSearchInput] = useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    // Initialize all groups as expanded by default
    ...filterGroups.reduce((acc, group) => ({ ...acc, [group.id]: true }), {})
  })
  // State for per-group search queries
  const [groupSearchQueries, setGroupSearchQueries] = useState<Record<string, string>>({})

  // Prepare backend search results for each group at the top level
  // This ensures hooks are called at the top, not conditionally
  const backendResults: Record<string, { filters: DataFilter[]; loading: boolean; error: any }> = {}
  filterGroups.forEach(group => {
    if (typeof group.backendSearch === 'function') {
      backendResults[group.id] = group.backendSearch(groupSearchQueries[group.id] || '')
    }
  })

  // Focus search input when it becomes visible
  React.useEffect(() => {
    if (showSearchInput && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearchInput])

  // Handle per-group search input changes
  const handleGroupSearchChange = (groupId: string, value: string) => {
    setGroupSearchQueries(prev => ({ ...prev, [groupId]: value }))
    onGroupSearchChange?.(groupId, value)
  }

  if (!show) return null

  // Filter groups based on search query
  const filteredGroups = searchQuery
    ? filterGroups.filter(
        group =>
          group.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (group.filters ?? []).some(f => f.label.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : filterGroups

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  // Count selected filters in a group
  const countSelectedFilters = (group: DataFilterGroup) => {
    return (group.filters ?? []).filter(f => f.selected).length
  }

  return (
    <aside
      className={cn(
        'gba:flex gba:flex-row gba:items-start gba:w-[336px] gba:h-full gba:pl-6 gba:pr-6 gba:relative',
        className
      )}
      data-testid="data-filter-sidebar"
    >
      <div
        className="gba:flex gba:flex-row gba:justify-center gba:items-start gba:p-0 gba:w-[336px] gba:max-w-[336px] gba:h-full gba:grow gba:overflow-hidden"
        data-testid="data-filter-container"
      >
        <form
          className="gba:min-w-0 gba:w-full gba:flex gba:flex-col gba:items-start gba:p-0 gba:gap-4 gba:h-full gba:grow gba:z-0 gba:overflow-hidden"
          onSubmit={e => e.preventDefault()}
          data-testid="data-filter-form"
        >
          <div
            className="gba:flex gba:flex-col gba:w-full gba:min-w-0 gba:gap-1 gba:grow gba:overflow-y-auto gba:overflow-x-hidden"
            data-testid="data-filter-groups-container"
          >
            {filteredGroups.map(group => {
              // Determine if this group uses backend-powered search
              const groupSearch = groupSearchQueries[group.id] || ''
              const isExpanded = expandedGroups[group.id]
              const groupId = `filter-group-${group.id}`

              // Get backend search results if available, otherwise do local filtering
              let filterOptions: DataFilter[] = []
              let loading = false
              let error: Error | null = null

              if (typeof group.backendSearch === 'function' && backendResults[group.id]) {
                filterOptions = backendResults[group.id].filters
                loading = backendResults[group.id].loading
                error = backendResults[group.id].error
              } else if (group.filters) {
                filterOptions = groupSearch
                  ? group.filters.filter(f => f.label.toLowerCase().includes(groupSearch.toLowerCase()))
                  : group.filters
              }

              const selectedCount = countSelectedFilters({
                ...group,
                filters: filterOptions
              })

              let filterContent: React.ReactNode
              if (loading) {
                filterContent = (
                  <div className="gba:p-2 gba:text-gray-400" data-testid={`data-filter-group-loading-${group.id}`}>
                    {t('df-loading')}
                  </div>
                )
              } else if (error) {
                filterContent = (
                  <div className="gba:p-2 gba:text-red-500" data-testid={`data-filter-group-error-${group.id}`}>
                    {t('df-error-loading-filters')}
                  </div>
                )
              } else if ((filterOptions ?? []).length > 0) {
                filterContent = (filterOptions ?? []).map(filter => (
                  <button
                    key={filter.id}
                    className="gba:flex gba:flex-row gba:items-center gba:w-full gba:p-2 gba:rounded gba:hover:bg-gray-100/50 gba:transition-colors"
                    onClick={() => onFilterChange?.(filter.id, !filter.selected)}
                    onKeyDown={e => e.key === 'Enter' && onFilterChange?.(filter.id, !filter.selected)}
                    type="button"
                    aria-pressed={filter.selected}
                    data-testid={`data-filter-option-${filter.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:justify-center gba:mr-2">
                      <input
                        type="checkbox"
                        checked={filter.selected}
                        onChange={() => onFilterChange?.(filter.id, !filter.selected)}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        name={filter.id}
                        data-testid={`data-filter-checkbox-${filter.id}`}
                        className="gba:w-4 gba:h-4 gba:text-primary-600 gba:bg-gray-100 gba:border-gray-300 gba:rounded gba:focus:ring-primary-500 gba:focus:ring-2"
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={`gba:text-sm gba:text-left gba:truncate gba:block gba:max-w-[280px] ${
                            filter.selected ? 'gba:font-medium gba:text-primary-500' : 'gba:text-gray-700'
                          }`}
                          data-testid={`data-filter-label-${filter.id}`}
                        >
                          {filter.label}
                          {typeof filter.count === 'number' ? ` (${filter.count})` : ''}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {filter.label + (typeof filter.count === 'number' ? ` (${filter.count})` : '')}
                      </TooltipContent>
                    </Tooltip>
                  </button>
                ))
              } else {
                filterContent = (
                  <div
                    className="gba:p-2 gba:text-gray-400 gba:text-sm"
                    data-testid={`data-filter-group-empty-${group.id}`}
                  >
                    {group.emptyMessage ??
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_backoffice.absence_details.no_filters_found',
                        'No filters found'
                      )}
                  </div>
                )
              }

              return (
                <div key={group.id} className="gba:w-full gba:min-w-0" data-testid={`data-filter-group-${group.id}`}>
                  <button
                    className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:w-full gba:pt-2 gba:!pl-2 gba:!pr-2 gba:!pb-[14px] gba:hover:bg-gray-100/50 gba:transition-colors gba:!border-b gba:!border-gray-200"
                    onClick={() => toggleGroup(group.id)}
                    onKeyDown={e => e.key === 'Enter' && toggleGroup(group.id)}
                    aria-expanded={isExpanded}
                    aria-controls={groupId}
                    type="button"
                    data-testid={`data-filter-group-toggle-${group.id}`}
                  >
                    <span
                      className="gba:text-sm gba:font-medium gba:text-gray-900"
                      data-testid={`data-filter-group-title-${group.id}`}
                    >
                      {group.title}
                    </span>
                    <div className="gba:flex gba:items-center">
                      {selectedCount > 0 && (
                        <div
                          className="gba:flex gba:items-center gba:justify-center gba:min-w-[20px] gba:h-5 gba:bg-primary-500 gba:text-white gba:text-xs gba:font-medium gba:rounded-full gba:px-1.5 gba:mr-2"
                          aria-label={`${selectedCount} selected filters`}
                          data-testid={`data-filter-group-count-${group.id}`}
                        >
                          <span>{selectedCount}</span>
                        </div>
                      )}
                      {isExpanded ? (
                        <CaretUpIcon size={20} className="gba:text-black" aria-hidden="true" />
                      ) : (
                        <CaretDownIcon size={20} className="gba:text-black" aria-hidden="true" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      className="gba:flex gba:flex-col gba:w-full gba:min-w-0 gba:max-w-full gba:pl-2"
                      id={groupId}
                      data-testid={`data-filter-group-content-${group.id}`}
                    >
                      {/* Render custom component if provided */}
                      {group.customComponent ? (
                        <div
                          className="gba:w-full gba:min-w-0 gba:max-w-full gba:mt-1"
                          data-testid={`data-filter-group-custom-${group.id}`}
                        >
                          {group.customComponent}
                        </div>
                      ) : (
                        <>
                          {/* Per-group search input with debounce - only show if not disabled */}
                          {!group.hideSearch && (
                            <div
                              className="gba:w-full gba:mb-2 gba:mt-1"
                              data-testid={`data-filter-group-search-container-${group.id}`}
                            >
                              <DebouncedInput
                                className="gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none"
                                placeholder={`${t('df-search-in')} ${group.title}...`}
                                value={groupSearch}
                                onChange={value => handleGroupSearchChange(group.id, value)}
                                ariaLabel={`${t('df-search-filters-in')} ${group.title}`}
                                debounceDelay={300}
                                data-testid={`data-filter-group-search-input-${group.id}`}
                              />
                            </div>
                          )}
                          {/* Show loading, error, or filter options */}
                          <div data-testid={`data-filter-group-options-${group.id}`}>{filterContent}</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {children}
        </form>
      </div>
      <div
        className="gba:absolute gba:top-0 gba:right-0 gba:w-px gba:h-[calc(100%-1.5rem)] gba:bg-gray-100"
        data-testid="data-filter-divider"
      />
    </aside>
  )
}
