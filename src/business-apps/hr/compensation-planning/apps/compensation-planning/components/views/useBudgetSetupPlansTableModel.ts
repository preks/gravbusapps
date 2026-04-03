import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type {
  CompensationBudgetPlanCompanyRow,
  CompensationBudgetPlanListItem
} from '../../hooks/useBudgetSetupForCompany'
import { buildBudgetSetupPlanTableRows, type BudgetSetupPlanTableRow } from './budgetSetupPlanTableRows'
import {
  BUDGET_SETUP_PLANS_VISIBLE_COLUMN_IDS,
  buildBudgetSetupPlansTableColumns
} from './buildBudgetSetupPlansTableColumns'
import { formatBudgetPlanStatusLabelForDisplay } from './budgetSetupDisplayUtils'
import type { TranslateFn } from './budgetSetupDisplayUtils'
import { buildBudgetSetupPlansFilterConfiguration } from './buildBudgetSetupPlansFilterConfiguration'

export function useBudgetSetupPlansTableModel(
  t: TranslateFn,
  companyBudgetPlanRows: CompensationBudgetPlanCompanyRow[],
  selectedCompanyId: string,
  currencyCode: string,
  plans: CompensationBudgetPlanListItem[]
) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [selectedCompanyBudgetStatuses, setSelectedCompanyBudgetStatuses] = useState<string[]>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'companyBudgetStatus', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...BUDGET_SETUP_PLANS_VISIBLE_COLUMN_IDS])

  const allRows = useMemo(
    () => buildBudgetSetupPlanTableRows(companyBudgetPlanRows, selectedCompanyId, currencyCode, plans),
    [companyBudgetPlanRows, selectedCompanyId, currencyCode, plans]
  )

  const companyBudgetStatusOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const row of allRows) {
      if (row.companyBudgetStatus) {
        ids.add(row.companyBudgetStatus)
      }
    }
    return [...ids].sort().map(id => ({ id, label: formatBudgetPlanStatusLabelForDisplay(id, t) || id }))
  }, [allRows, t])

  const filterConfiguration = useMemo(
    () => buildBudgetSetupPlansFilterConfiguration(t, companyBudgetStatusOptions),
    [t, companyBudgetStatusOptions]
  )

  const filteredRows = useMemo(() => {
    let list = allRows

    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(row => {
        const statusLabel = formatBudgetPlanStatusLabelForDisplay(row.companyBudgetStatus, t).toLowerCase()
        return (
          row.id.toLowerCase().includes(q) ||
          row.compensationBudgetPlanId.toLowerCase().includes(q) ||
          row.budgetPlanLabel.toLowerCase().includes(q) ||
          row.companyId.toLowerCase().includes(q) ||
          statusLabel.includes(q) ||
          String(row.salaryBudgetAmount).includes(q) ||
          String(row.salaryBudgetPercent).includes(q) ||
          String(row.bonusBudgetAmount).includes(q) ||
          String(row.bonusBudgetPercent).includes(q)
        )
      })
    }

    if (selectedCompanyBudgetStatuses.length > 0) {
      const set = new Set(selectedCompanyBudgetStatuses)
      list = list.filter(row => row.companyBudgetStatus != null && set.has(row.companyBudgetStatus))
    }

    return list
  }, [allRows, debouncedSearch, selectedCompanyBudgetStatuses, t])

  const hasActiveFilters = useMemo(
    () => debouncedSearch.trim() !== '' || selectedCompanyBudgetStatuses.length > 0,
    [debouncedSearch, selectedCompanyBudgetStatuses]
  )

  const emptyMessage = hasActiveFilters ? t('budget-setup-table-empty-filtered') : t('budget-setup-table-empty')

  const filtersObject = useMemo(() => {
    const obj: Record<string, unknown> = {}
    if (selectedCompanyBudgetStatuses.length > 0) {
      obj.companyBudgetStatuses = selectedCompanyBudgetStatuses
    }
    return obj
  }, [selectedCompanyBudgetStatuses])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const statuses = (filters.companyBudgetStatuses as string[] | undefined) ?? []
    setSelectedCompanyBudgetStatuses(statuses)
  }, [])

  const columns = useMemo(
    () => buildBudgetSetupPlansTableColumns(t, v => formatBudgetPlanStatusLabelForDisplay(v, t)),
    [t]
  )

  const visibleTableColumns = useMemo(
    () =>
      columns.filter(col =>
        visibleColumns.includes(String((col as ColumnDef<BudgetSetupPlanTableRow> & { id?: string }).id ?? ''))
      ),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'budgetPlanLabel', label: t('budget-setup-table-col-chosen-budget-plan') },
      { id: 'companyBudgetStatus', label: t('budget-setup-table-col-budget-plan-status') },
      { id: 'salaryBudgetAmount', label: t('budget-setup-table-col-salary-budget-amount') },
      { id: 'salaryBudgetPercent', label: t('budget-setup-table-col-salary-budget-percent') },
      { id: 'bonusBudgetAmount', label: t('budget-setup-table-col-bonus-budget-amount') },
      { id: 'bonusBudgetPercent', label: t('budget-setup-table-col-bonus-budget-percent') },
      { id: 'salaryBaseline', label: t('budget-setup-table-col-salary-baseline') }
    ],
    [t]
  )

  const availableColumnsForDisplay = useMemo(() => sortableColumns, [sortableColumns])

  const handlePaginationChange = useCallback((next: { pageIndex: number; pageSize: number }) => {
    setPagination(next)
  }, [])

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [debouncedSearch, selectedCompanyBudgetStatuses, sorting])

  return {
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
  }
}
