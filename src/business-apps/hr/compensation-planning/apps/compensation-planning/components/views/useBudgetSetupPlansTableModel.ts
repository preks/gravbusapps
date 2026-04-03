import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { CompensationBudgetPlanCompanyRow } from '../../hooks/useBudgetSetupForCompany'
import { buildBudgetSetupPlanTableRows, type BudgetSetupPlanTableRow } from './budgetSetupPlanTableRows'
import {
  BUDGET_SETUP_PLANS_VISIBLE_COLUMN_IDS,
  buildBudgetSetupPlansTableColumns
} from './buildBudgetSetupPlansTableColumns'
import {
  formatBudgetDistributionMethodLabelForDisplay,
  formatBudgetPlanStatusLabelForDisplay
} from './budgetSetupDisplayUtils'
import type { TranslateFn } from './budgetSetupDisplayUtils'
import { applyNumberRangeFromFilters, budgetMatchesRange } from './budgetSetupPlansTableFilterUtils'
import { buildBudgetSetupPlansFilterConfiguration } from './buildBudgetSetupPlansFilterConfiguration'

const EMPTY_RANGE_INPUT_PLACEHOLDER = '\u200b'

export function useBudgetSetupPlansTableModel(
  t: TranslateFn,
  companyBudgetPlanRows: CompensationBudgetPlanCompanyRow[],
  selectedCompanyId: string,
  teamSalaryBaseline: number,
  currencyCode: string
) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [selectedCompanyBudgetStatuses, setSelectedCompanyBudgetStatuses] = useState<string[]>([])
  const [totalResolvedRange, setTotalResolvedRange] = useState<{ min?: number | null; max?: number | null } | null>(
    null
  )
  const [sorting, setSorting] = useState<SortingState>([{ id: 'companyBudgetStatus', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...BUDGET_SETUP_PLANS_VISIBLE_COLUMN_IDS])

  const allRows = useMemo(
    () => buildBudgetSetupPlanTableRows(companyBudgetPlanRows, selectedCompanyId, teamSalaryBaseline, currencyCode),
    [companyBudgetPlanRows, selectedCompanyId, teamSalaryBaseline, currencyCode]
  )

  const companyBudgetStatusOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const row of allRows) {
      if (row.companyBudgetStatus) {
        ids.add(row.companyBudgetStatus)
      }
    }
    return [...ids].sort().map(id => ({ id, label: formatBudgetPlanStatusLabelForDisplay(id, t) || id }))
  }, [allRows])

  const totalResolvedRangeConfig = useMemo(
    () => ({
      mode: 'range' as const,
      min: 0,
      max: 100_000_000_000,
      step: 1,
      placeholderMin: EMPTY_RANGE_INPUT_PLACEHOLDER,
      placeholderMax: EMPTY_RANGE_INPUT_PLACEHOLDER
    }),
    []
  )

  const filterConfiguration = useMemo(
    () => buildBudgetSetupPlansFilterConfiguration(t, companyBudgetStatusOptions, totalResolvedRangeConfig),
    [t, companyBudgetStatusOptions, totalResolvedRangeConfig]
  )

  const filteredRows = useMemo(() => {
    let list = allRows

    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(row => {
        const statusLabel = formatBudgetPlanStatusLabelForDisplay(row.companyBudgetStatus, t).toLowerCase()
        const distLabel = formatBudgetDistributionMethodLabelForDisplay(row.distributionMethod, t).toLowerCase()
        const distRaw = (row.distributionMethod ?? '').toLowerCase()
        const currency = (row.currencyRef ?? '').toLowerCase()
        return (
          row.id.toLowerCase().includes(q) ||
          row.compensationBudgetPlanId.toLowerCase().includes(q) ||
          row.companyId.toLowerCase().includes(q) ||
          statusLabel.includes(q) ||
          distLabel.includes(q) ||
          distRaw.includes(q) ||
          currency.includes(q) ||
          String(row.salaryBudgetAmount).includes(q) ||
          String(row.salaryBudgetPercent).includes(q) ||
          String(row.bonusBudgetAmount).includes(q) ||
          String(row.bonusBudgetPercent).includes(q) ||
          String(row.headcount ?? '').includes(q)
        )
      })
    }

    if (selectedCompanyBudgetStatuses.length > 0) {
      const set = new Set(selectedCompanyBudgetStatuses)
      list = list.filter(row => row.companyBudgetStatus != null && set.has(row.companyBudgetStatus))
    }

    list = list.filter(row => budgetMatchesRange(row.resolvedTotal, totalResolvedRange))

    return list
  }, [allRows, debouncedSearch, selectedCompanyBudgetStatuses, totalResolvedRange, t])

  const hasActiveFilters = useMemo(() => {
    const hasRange = (range: { min?: number | null; max?: number | null } | null) =>
      !!(range && (range.min !== undefined || range.max !== undefined))
    return debouncedSearch.trim() !== '' || selectedCompanyBudgetStatuses.length > 0 || hasRange(totalResolvedRange)
  }, [debouncedSearch, selectedCompanyBudgetStatuses, totalResolvedRange])

  const emptyMessage = hasActiveFilters ? t('budget-setup-table-empty-filtered') : t('budget-setup-table-empty')

  const filtersObject = useMemo(() => {
    const hasRange = (range: { min?: number | null; max?: number | null } | null) =>
      !!(range && (range.min !== undefined || range.max !== undefined))
    const obj: Record<string, unknown> = {}
    if (selectedCompanyBudgetStatuses.length > 0) {
      obj.companyBudgetStatuses = selectedCompanyBudgetStatuses
    }
    if (hasRange(totalResolvedRange)) {
      obj.totalResolvedRange = { ...totalResolvedRange }
    }
    return obj
  }, [selectedCompanyBudgetStatuses, totalResolvedRange])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const statuses = (filters.companyBudgetStatuses as string[] | undefined) ?? []
    setSelectedCompanyBudgetStatuses(statuses)
    applyNumberRangeFromFilters(
      filters.totalResolvedRange as { min?: number | null; max?: number | null } | undefined,
      setTotalResolvedRange
    )
  }, [])

  const columns = useMemo(
    () =>
      buildBudgetSetupPlansTableColumns(
        t,
        v => formatBudgetPlanStatusLabelForDisplay(v, t),
        v => formatBudgetDistributionMethodLabelForDisplay(v, t)
      ),
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
      { id: 'companyBudgetStatus', label: t('budget-setup-table-col-budget-plan-status') },
      { id: 'salaryBudgetAmount', label: t('budget-setup-table-col-salary-budget-amount') },
      { id: 'salaryBudgetPercent', label: t('budget-setup-table-col-salary-budget-percent') },
      { id: 'bonusBudgetAmount', label: t('budget-setup-table-col-bonus-budget-amount') },
      { id: 'bonusBudgetPercent', label: t('budget-setup-table-col-bonus-budget-percent') },
      { id: 'distributionMethod', label: t('budget-setup-table-col-distribution') },
      { id: 'headcount', label: t('budget-setup-table-col-headcount') },
      { id: 'salaryBaseline', label: t('budget-setup-table-col-salary-baseline') },
      { id: 'currencyRef', label: t('budget-setup-table-col-currency') },
      { id: 'resolvedSalary', label: t('budget-setup-table-col-resolved-salary') },
      { id: 'resolvedBonus', label: t('budget-setup-table-col-resolved-bonus') },
      { id: 'resolvedTotal', label: t('budget-setup-table-col-resolved-total') }
    ],
    [t]
  )

  const availableColumnsForDisplay = useMemo(() => sortableColumns, [sortableColumns])

  const handlePaginationChange = useCallback((next: { pageIndex: number; pageSize: number }) => {
    setPagination(next)
  }, [])

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [debouncedSearch, selectedCompanyBudgetStatuses, totalResolvedRange, sorting])

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
