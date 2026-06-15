import React from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  DataDisplay,
  DataTable,
  TooltipProvider,
  useTranslation
} from '@newwork/nw-design-system'
import { useDataTablePaginationLabels } from '@/business-apps/hr/core/apps/shared/utils/dataTablePaginationLabels'
import type { SubmissionsOrgUnitTableRow } from './submissionsOrgUnitTableRows'
import { useSubmissionsOrgUnitTableModel } from './useSubmissionsOrgUnitTableModel'
import type { SubmissionsOrgUnitSelectionParams } from './buildSubmissionsOrgUnitTableColumns'
import translations from '../../_i18n'

export interface SubmissionsOrgUnitBudgetTableProps {
  rows: SubmissionsOrgUnitTableRow[]
  loading: boolean
  error: string | null
  hasCompanyBudgetRows: boolean
  /** When false, table shows a prompt to select a cycle (not “no company budgets”). */
  compensationPlanSelected: boolean
  /** Company selector aligned with the DataDisplay toolbar (search / filters / sort). */
  companyToolbar?: React.ReactNode
  /** Opens manager-compensation-planning for supervisor review (submitted proposals). */
  onReviewTeam?: (row: SubmissionsOrgUnitTableRow) => void
  selection?: SubmissionsOrgUnitSelectionParams
  selectedCount?: number
  executingSalaryAdjustments?: boolean
  canExecuteSalaryAdjustments?: boolean
  salaryAdjustmentMessage?: string | null
  salaryAdjustmentError?: string | null
  onExecuteSalaryAdjustments?: () => void | Promise<void>
}

export function SubmissionsOrgUnitBudgetTable({
  rows,
  loading,
  error,
  hasCompanyBudgetRows,
  compensationPlanSelected,
  companyToolbar,
  onReviewTeam,
  selection,
  selectedCount = 0,
  executingSalaryAdjustments = false,
  canExecuteSalaryAdjustments = true,
  salaryAdjustmentMessage,
  salaryAdjustmentError,
  onExecuteSalaryAdjustments
}: Readonly<SubmissionsOrgUnitBudgetTableProps>) {
  const { t } = useTranslation(translations)
  const paginationLabels = useDataTablePaginationLabels()
  const {
    searchInput,
    setSearchInput,
    sorting,
    setSorting,
    pagination,
    visibleColumns,
    setVisibleColumns,
    filterConfiguration,
    filteredRows,
    filtersObject,
    handleFilterChangeFromDisplay,
    emptyMessage,
    visibleTableColumns,
    sortableColumns,
    availableColumnsForDisplay,
    handlePaginationChange
  } = useSubmissionsOrgUnitTableModel(t, rows, hasCompanyBudgetRows, compensationPlanSelected, selection)

  const toolbarAction =
    companyToolbar || onExecuteSalaryAdjustments ? (
      <div className="gba:flex gba:min-w-0 gba:flex-wrap gba:items-center gba:gap-3 gba:pl-2 gba:md:pl-3">
        {onExecuteSalaryAdjustments && selectedCount > 0 ? (
          <Button
            type="button"
            variant="default"
            disabled={executingSalaryAdjustments || !canExecuteSalaryAdjustments}
            data-testid="submissions-execute-salary-adjustments"
            onClick={() => {
              Promise.resolve(onExecuteSalaryAdjustments()).catch(() => {})
            }}
          >
            {executingSalaryAdjustments
              ? t('submissions-execute-salary-adjustments-busy')
              : t('submissions-execute-salary-adjustments')}
          </Button>
        ) : null}
        {companyToolbar}
      </div>
    ) : undefined

  return (
    <div className="gba:space-y-3">
      {salaryAdjustmentError ? (
        <Alert variant="destructive" data-testid="submissions-salary-adjustment-error">
          <AlertDescription>{salaryAdjustmentError}</AlertDescription>
        </Alert>
      ) : null}
      {salaryAdjustmentMessage ? (
        <Alert data-testid="submissions-salary-adjustment-message">
          <AlertDescription>{salaryAdjustmentMessage}</AlertDescription>
        </Alert>
      ) : null}
      <DataDisplay
        data-testid="submissions-org-unit-table-display"
        titleSections={[
          {
            id: 'submissions-org-units',
            label: t('submissions-table-section-title'),
            metadata: { count: filteredRows.length, isLoading: loading }
          }
        ]}
        currentSection="submissions-org-units"
        toolbarDensity="default"
        searchValue={searchInput}
        searchPlaceholder={t('submissions-table-search-placeholder')}
        onSearchChange={setSearchInput}
        filters={filtersObject}
        filterConfiguration={filterConfiguration}
        onFilterChange={handleFilterChangeFromDisplay}
        enableLiveFiltering
        filterSheetTitle={t('submissions-table-filter-sheet-title')}
        filterSheetDescription={t('submissions-table-filter-sheet-description')}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={setSorting}
        availableColumns={availableColumnsForDisplay}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        primaryAction={toolbarAction}
      >
        <TooltipProvider>
          <DataTable<SubmissionsOrgUnitTableRow>
            data={filteredRows}
            columns={visibleTableColumns}
            loading={loading}
            error={error ?? undefined}
            sorting={sorting}
            onSortingChange={setSorting}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            enablePagination
            enableSorting
            enableSelection={false}
            enableColumnPinning
            enableResizing={false}
            tableLayout="auto"
            rowsPerPageOptions={[10, 20, 50, 100]}
            showPageNumbers
            maxVisiblePages={7}
            paginationLabels={paginationLabels}
            emptyMessage={emptyMessage}
            onRowClick={onReviewTeam}
            data-testid="submissions-org-unit-budget-table"
          />
        </TooltipProvider>
      </DataDisplay>
    </div>
  )
}
