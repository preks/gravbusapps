import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { Button, DataDisplay, DataTable, TooltipProvider } from '@newwork/nw-design-system'
import type { TranslateFn } from '../../compensation-planning/components/views/budgetSetupDisplayUtils'
import type { SupervisorProposalTableRow } from './supervisorProposalTableRow'

/** Narrow props for the DataDisplay + DataTable block (same stack as compensation-planning Overview / Submissions). */
export interface SupervisorSubmittedProposalsDataDisplayProps {
  t: TranslateFn
  busy: boolean
  selectedIds: ReadonlySet<string>
  searchInput: string
  setSearchInput: (v: string) => void
  sorting: SortingState
  setSorting: (s: SortingState) => void
  pagination: { pageIndex: number; pageSize: number }
  visibleColumns: string[]
  setVisibleColumns: (value: string[] | ((prev: string[]) => string[])) => void
  filteredRows: SupervisorProposalTableRow[]
  emptyMessage: string
  visibleTableColumns: ColumnDef<SupervisorProposalTableRow>[]
  sortableColumns: { id: string; label: string }[]
  availableColumnsForDisplay: { id: string; label: string }[]
  handlePaginationChange: (next: { pageIndex: number; pageSize: number }) => void
  onApproveSelected: () => void
  onSendBackOpen: () => void
}

export function SupervisorSubmittedProposalsDataDisplay({
  t,
  busy,
  selectedIds,
  searchInput,
  setSearchInput,
  sorting,
  setSorting,
  pagination,
  visibleColumns,
  setVisibleColumns,
  filteredRows,
  emptyMessage,
  visibleTableColumns,
  sortableColumns,
  availableColumnsForDisplay,
  handlePaginationChange,
  onApproveSelected,
  onSendBackOpen
}: Readonly<SupervisorSubmittedProposalsDataDisplayProps>) {
  return (
    <div className="gba:mt-4 gba:space-y-3">
      <p className="gba:text-sm gba:text-muted-foreground">{t('supervisor-review-selection-hint')}</p>
      <DataDisplay
        data-testid="supervisor-submitted-proposals-display"
        titleSections={[
          {
            id: 'supervisor-submitted-proposals',
            label: t('supervisor-review-table-section-title'),
            metadata: { count: filteredRows.length, isLoading: busy }
          }
        ]}
        currentSection="supervisor-submitted-proposals"
        toolbarDensity="default"
        searchValue={searchInput}
        searchPlaceholder={t('supervisor-review-table-search-placeholder')}
        onSearchChange={setSearchInput}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={setSorting}
        availableColumns={availableColumnsForDisplay}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        primaryAction={
          <div
            className="gba:flex gba:min-w-0 gba:flex-wrap gba:items-center gba:justify-end gba:gap-2 gba:pl-2 gba:md:pl-3"
            data-testid="supervisor-review-toolbar-actions"
          >
            <Button
              type="button"
              variant="default"
              disabled={busy || selectedIds.size === 0}
              data-testid="supervisor-review-approve-selected"
              onClick={() => void onApproveSelected()}
            >
              {busy ? t('supervisor-review-busy') : t('supervisor-review-approve-selected')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || selectedIds.size === 0}
              data-testid="supervisor-review-send-back-open"
              onClick={() => onSendBackOpen()}
            >
              {t('supervisor-review-send-back')}
            </Button>
          </div>
        }
      >
        <TooltipProvider>
          <DataTable<SupervisorProposalTableRow>
            data={filteredRows}
            columns={visibleTableColumns}
            loading={false}
            sorting={sorting}
            onSortingChange={setSorting}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            enablePagination
            enableSorting
            enableSelection={false}
            enableColumnPinning={false}
            enableResizing={false}
            tableLayout="auto"
            rowsPerPageOptions={[10, 20, 50, 100]}
            showPageNumbers
            maxVisiblePages={7}
            emptyMessage={emptyMessage}
            data-testid="supervisor-submitted-proposals-table"
          />
        </TooltipProvider>
      </DataDisplay>
    </div>
  )
}
