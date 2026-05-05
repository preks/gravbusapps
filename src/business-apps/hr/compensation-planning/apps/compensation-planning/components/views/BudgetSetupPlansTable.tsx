import React from 'react'
import { DataDisplay, DataTable, TooltipProvider, useTranslation } from '@newwork/nw-design-system'
import type {
  CompensationBudgetPlanCompanyRow,
  CompensationBudgetPlanListItem
} from '../../hooks/useBudgetSetupForCompany'
import type { BudgetSetupCompanyOption, BudgetSetupPlanTableRow } from './budgetSetupPlanTableRows'
import { useBudgetSetupPlansTableModel } from './useBudgetSetupPlansTableModel'
import translations from '../../_i18n'

export interface BudgetSetupPlansTableProps {
  /** Legal entity selected in the app — table shows `compensation_budget_plan_company` for this id only. */
  companyId: string | null
  companyBudgetPlanRows: CompensationBudgetPlanCompanyRow[]
  currencyCode: string
  plans: CompensationBudgetPlanListItem[]
  companies?: BudgetSetupCompanyOption[]
  showCompanyColumn?: boolean
  loading: boolean
  error: string | null
  /** Compensation cycle selector — use `CompensationCycleSelector` with `variant="toolbar"` (same layout as `BudgetPlanSelector`). */
  cycleToolbar?: React.ReactNode
  /** Primary button in the DataDisplay toolbar (e.g. create plan). */
  toolbarEnd?: React.ReactNode
  onEditRow: (row: BudgetSetupPlanTableRow) => void
  onOpenDepartmentsBreakdown?: (row: BudgetSetupPlanTableRow) => void
  /** Filters rows to this compensation cycle (toolbar selector). */
  selectedCompensationPlanId: string | null
}

export const BudgetSetupPlansTable: React.FC<BudgetSetupPlansTableProps> = ({
  companyId,
  companyBudgetPlanRows,
  currencyCode,
  plans,
  companies = [],
  showCompanyColumn = false,
  loading,
  error,
  cycleToolbar,
  toolbarEnd,
  onEditRow,
  onOpenDepartmentsBreakdown,
  selectedCompensationPlanId
}) => {
  const { t } = useTranslation(translations)
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
  } = useBudgetSetupPlansTableModel(
    t,
    companyBudgetPlanRows,
    companyId,
    currencyCode,
    plans,
    onEditRow,
    selectedCompensationPlanId,
    companies,
    showCompanyColumn
  )

  return (
    <DataDisplay
      data-testid="budget-setup-plans-display"
      titleSections={[
        {
          id: 'budget-plans',
          label: t('budget-setup-table-section-title'),
          metadata: { count: filteredRows.length, isLoading: loading }
        }
      ]}
      currentSection="budget-plans"
      toolbarDensity="default"
      searchValue={searchInput}
      searchPlaceholder={t('budget-setup-table-search-placeholder')}
      onSearchChange={setSearchInput}
      filters={filtersObject}
      filterConfiguration={filterConfiguration}
      onFilterChange={handleFilterChangeFromDisplay}
      enableLiveFiltering
      filterSheetTitle={t('budget-setup-table-filter-sheet-title')}
      filterSheetDescription={t('budget-setup-table-filter-sheet-description')}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={setSorting}
      availableColumns={availableColumnsForDisplay}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={setVisibleColumns}
      primaryAction={
        <div className="gba:inline-flex gba:shrink-0 gba:items-center gba:gap-2">
          {cycleToolbar}
          {toolbarEnd}
        </div>
      }
    >
      <TooltipProvider>
        <DataTable<BudgetSetupPlanTableRow>
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
          emptyMessage={emptyMessage}
          onRowClick={onOpenDepartmentsBreakdown}
          data-testid="budget-setup-plans-table"
        />
      </TooltipProvider>
    </DataDisplay>
  )
}
