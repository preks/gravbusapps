import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { FunnelIcon } from '@phosphor-icons/react'
import { cn } from '@/common/utils/cn'
import { DataDisplay, DataToolbar, EscapeContextProvider } from '@newwork/nw-design-system'

type BaseDataDisplayProps = ComponentProps<typeof DataDisplay>

export interface BackofficeDataDisplayProps extends BaseDataDisplayProps {
  renderFilterSheet?: (open: boolean, onOpenChange: (open: boolean) => void) => ReactNode
  customFilterActionLabel?: string
  hideToolbarGeneratedFilterChips?: boolean
  customFilterSummary?: ReactNode
}

export function BackofficeDataDisplay({
  className,
  'data-testid': dataTestId,
  title,
  titleSections,
  currentSection,
  onSectionChange,
  searchValue = '',
  searchPlaceholder = 'Search...',
  onSearchChange,
  searchMode = 'input',
  searchOptions = [],
  onSearchSelect,
  searchLoading = false,
  searchError = false,
  searchErrorText,
  filters = {},
  filterConfiguration,
  onFilterChange,
  viewOptions,
  currentView,
  onViewChange,
  sorting = [],
  sortableColumns = [],
  onSortingChange,
  selectedCount = 0,
  bulkActions = [],
  onClearSelection,
  availableColumns = [],
  visibleColumns = [],
  onVisibleColumnsChange,
  primaryAction,
  secondaryActions,
  toolbarDensity = 'default',
  children,
  renderFilterSheet,
  customFilterActionLabel,
  hideToolbarGeneratedFilterChips = false,
  customFilterSummary
}: Readonly<BackofficeDataDisplayProps>) {
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const toolbarTitleSections = useMemo(
    () => (titleSections && titleSections.length > 0 ? titleSections : [{ id: 'main', label: title ?? 'Data' }]),
    [titleSections, title]
  )

  const primarySortEntry = sorting?.length > 0 ? sorting[0] : undefined
  const currentSortId = primarySortEntry?.id ?? undefined
  const resolvedDirection = primarySortEntry?.desc ? 'desc' : 'asc'
  const currentSortDirection = primarySortEntry ? resolvedDirection : undefined
  const effectiveFilterValues = hideToolbarGeneratedFilterChips ? {} : filters
  const effectiveFilterConfiguration = hideToolbarGeneratedFilterChips ? undefined : filterConfiguration
  const effectiveOnFilterChange = hideToolbarGeneratedFilterChips ? undefined : onFilterChange
  const resolvedSecondaryActions = useMemo(() => {
    if (!customFilterActionLabel || !filterConfiguration) {
      return secondaryActions
    }

    const filterAction = {
      id: 'filters',
      label: customFilterActionLabel,
      icon: FunnelIcon,
      onClick: () => setFilterSheetOpen(true)
    }

    return Array.isArray(secondaryActions) ? [filterAction, ...secondaryActions] : [filterAction]
  }, [customFilterActionLabel, filterConfiguration, secondaryActions])

  return (
    <EscapeContextProvider>
      <div className={cn('gba:flex gba:flex-col gba:h-full', className)} data-testid={dataTestId}>
        <DataToolbar
          titleSections={toolbarTitleSections}
          currentSection={currentSection}
          onSectionChange={onSectionChange}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchMode={searchMode}
          searchOptions={searchOptions}
          onSearchSelect={onSearchSelect}
          searchLoading={searchLoading}
          searchError={searchError}
          searchErrorText={searchErrorText}
          filterValues={effectiveFilterValues}
          filterConfiguration={effectiveFilterConfiguration}
          onFilterChange={effectiveOnFilterChange}
          onFilterClick={filterConfiguration && !customFilterActionLabel ? () => setFilterSheetOpen(true) : undefined}
          viewOptions={viewOptions}
          currentView={currentView}
          onViewChange={onViewChange}
          sortOptions={sortableColumns.map(c => ({ value: c.id, label: c.label }))}
          currentSort={currentSortId}
          sortDirection={currentSortDirection}
          onSortChange={
            onSortingChange
              ? (columnId, direction) => {
                  if (!columnId) {
                    onSortingChange([])
                    return
                  }
                  onSortingChange([{ id: columnId, desc: direction === 'desc' }])
                }
              : undefined
          }
          columns={availableColumns.map(c => ({
            id: c.id,
            label: c.label,
            visible: visibleColumns.includes(c.id)
          }))}
          onColumnToggle={
            onVisibleColumnsChange
              ? columnId => {
                  const isVisible = visibleColumns.includes(columnId)
                  onVisibleColumnsChange(
                    isVisible ? visibleColumns.filter(id => id !== columnId) : [...visibleColumns, columnId]
                  )
                }
              : undefined
          }
          primaryAction={primaryAction}
          secondaryActions={resolvedSecondaryActions}
          selectedItemsCount={selectedCount}
          bulkActions={bulkActions}
          onSelectionClear={onClearSelection}
          density={toolbarDensity}
        />
        {customFilterSummary}
        <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:overflow-x-hidden">{children}</div>
        {renderFilterSheet?.(filterSheetOpen, setFilterSheetOpen)}
      </div>
    </EscapeContextProvider>
  )
}
