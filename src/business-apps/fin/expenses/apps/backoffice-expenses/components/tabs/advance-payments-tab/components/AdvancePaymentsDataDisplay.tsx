import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/common/utils/cn'
import { DataDisplay, DataToolbar, EscapeContextProvider } from '@newwork/nw-design-system'
import { AdvancePaymentFilterSheet, type ReporterFilterRenderProps } from './AdvancePaymentFilterSheet'

type BaseDataDisplayProps = ComponentProps<typeof DataDisplay>

export interface AdvancePaymentsDataDisplayProps extends BaseDataDisplayProps {
  renderReporterFilter?: (props: ReporterFilterRenderProps) => ReactNode
}

export function AdvancePaymentsDataDisplay({
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
  renderReporterFilter
}: Readonly<AdvancePaymentsDataDisplayProps>) {
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const toolbarTitleSections = useMemo(
    () => (titleSections && titleSections.length > 0 ? titleSections : [{ id: 'main', label: title ?? 'Data' }]),
    [titleSections, title]
  )

  const primarySortEntry = sorting?.length > 0 ? sorting[0] : undefined
  const currentSortId = primarySortEntry?.id ?? undefined
  const currentSortDirection = primarySortEntry ? (primarySortEntry.desc ? 'desc' : 'asc') : undefined

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
          filterValues={filters}
          filterConfiguration={filterConfiguration}
          onFilterChange={onFilterChange}
          onFilterClick={filterConfiguration ? () => setFilterSheetOpen(true) : undefined}
          viewOptions={viewOptions}
          currentView={currentView}
          onViewChange={onViewChange}
          sortOptions={sortableColumns.map(column => ({ value: column.id, label: column.label }))}
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
          columns={availableColumns.map(column => ({
            id: column.id,
            label: column.label,
            visible: visibleColumns.includes(column.id)
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
          secondaryActions={secondaryActions}
          selectedItemsCount={selectedCount}
          bulkActions={bulkActions}
          onSelectionClear={onClearSelection}
          density={toolbarDensity}
        />
        <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:overflow-x-hidden">{children}</div>
        {filterConfiguration ? (
          <AdvancePaymentFilterSheet
            open={filterSheetOpen}
            onOpenChange={setFilterSheetOpen}
            configuration={filterConfiguration}
            values={filters}
            onApply={onFilterChange}
            onChange={onFilterChange}
            enableLiveFiltering={enableLiveFiltering}
            title={filterSheetTitle}
            description={filterSheetDescription}
            renderReporterFilter={renderReporterFilter}
          />
        ) : null}
      </div>
    </EscapeContextProvider>
  )
}
