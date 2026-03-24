import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/common/utils/cn'
import { DataDisplay, DataToolbar, EscapeContextProvider } from '@newwork/nw-design-system'
import { ExpenseRequestFilterSheet, type EmployeeFilterRenderProps } from './ExpenseRequestFilterSheet'

type BaseDataDisplayProps = ComponentProps<typeof DataDisplay>

export interface ExpenseRequestsDataDisplayProps extends BaseDataDisplayProps {
  /** Single employee section: legacy search + results (see {@link ExpenseRequestFilterSheet}). */
  renderEmployeeFilter?: (props: EmployeeFilterRenderProps) => ReactNode
}

/**
 * Same layout as {@link DataDisplay} but uses {@link ExpenseRequestFilterSheet} so the employee
 * filter can use API search + dropdown like the pre–DataDisplay toolbar.
 */
export function ExpenseRequestsDataDisplay({
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
  enableLiveFiltering = false,
  filterSheetTitle = 'Filters',
  filterSheetDescription,
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
  renderEmployeeFilter
}: Readonly<ExpenseRequestsDataDisplayProps>) {
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const toolbarTitleSections = useMemo(
    () => (titleSections && titleSections.length > 0 ? titleSections : [{ id: 'main', label: title ?? 'Data' }]),
    [titleSections, title]
  )

  return (
    <EscapeContextProvider>
      <div className={cn('nw:flex nw:flex-col nw:h-full', className)} data-testid={dataTestId}>
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
          filterValues={filters}
          filterConfiguration={filterConfiguration}
          onFilterChange={onFilterChange}
          onFilterClick={filterConfiguration ? () => setFilterSheetOpen(true) : undefined}
          viewOptions={viewOptions}
          currentView={currentView}
          onViewChange={onViewChange}
          sortOptions={sortableColumns.map(c => ({ value: c.id, label: c.label }))}
          currentSort={sorting?.length > 0 && sorting[0]?.id ? sorting[0].id : undefined}
          sortDirection={sorting?.length > 0 && sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined}
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
                  const isOn = visibleColumns.includes(columnId)
                  onVisibleColumnsChange(
                    isOn ? visibleColumns.filter(id => id !== columnId) : [...visibleColumns, columnId]
                  )
                }
              : undefined
          }
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
          selectedItemsCount={selectedCount}
          bulkActions={bulkActions}
          onSelectionClear={onClearSelection}
          density={toolbarDensity}
        />
        <div className="nw:flex-1 nw:min-h-0 nw:overflow-y-auto nw:overflow-x-hidden">{children}</div>
        {filterConfiguration && (
          <ExpenseRequestFilterSheet
            open={filterSheetOpen}
            onOpenChange={setFilterSheetOpen}
            configuration={filterConfiguration}
            values={filters}
            onApply={onFilterChange}
            onChange={onFilterChange}
            enableLiveFiltering={enableLiveFiltering}
            title={filterSheetTitle}
            description={filterSheetDescription}
            renderEmployeeFilter={renderEmployeeFilter}
          />
        )}
      </div>
    </EscapeContextProvider>
  )
}
