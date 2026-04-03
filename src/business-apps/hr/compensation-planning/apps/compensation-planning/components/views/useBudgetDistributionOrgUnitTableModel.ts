import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { CompensationBudgetPlanOrganizationalUnitRow } from '../../hooks/useBudgetDistributionOrgUnitBudget'
import {
  buildBudgetDistributionOrgUnitTableRows,
  type BudgetDistributionOrgUnitTableRow
} from './budgetDistributionOrgUnitTableRows'
import {
  BUDGET_DISTRIBUTION_ORG_UNIT_VISIBLE_COLUMN_IDS,
  buildBudgetDistributionOrgUnitTableColumns
} from './buildBudgetDistributionOrgUnitTableColumns'
import { formatBudgetPlanStatusLabelForDisplay } from './budgetSetupDisplayUtils'
import type { TranslateFn } from './budgetSetupDisplayUtils'
import { applyNumberRangeFromFilters, budgetMatchesRange } from './budgetSetupPlansTableFilterUtils'
import { buildBudgetDistributionOrgUnitFilterConfiguration } from './buildBudgetDistributionOrgUnitFilterConfiguration'

const EMPTY_RANGE_INPUT_PLACEHOLDER = '\u200b'

export function useBudgetDistributionOrgUnitTableModel(
  t: TranslateFn,
  sourceRows: CompensationBudgetPlanOrganizationalUnitRow[],
  teamSalaryBaseline: number,
  currencyCode: string,
  hasSelectedPlan: boolean
) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [selectedOrgUnitBudgetStatuses, setSelectedOrgUnitBudgetStatuses] = useState<string[]>([])
  const [totalResolvedRange, setTotalResolvedRange] = useState<{ min?: number | null; max?: number | null } | null>(
    null
  )
  const [sorting, setSorting] = useState<SortingState>([{ id: 'organizationalUnitName', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [
    ...BUDGET_DISTRIBUTION_ORG_UNIT_VISIBLE_COLUMN_IDS
  ])

  const allRows = useMemo(
    () => buildBudgetDistributionOrgUnitTableRows(sourceRows, teamSalaryBaseline, currencyCode),
    [sourceRows, teamSalaryBaseline, currencyCode]
  )

  const orgUnitBudgetStatusOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const row of allRows) {
      if (row.orgUnitBudgetStatus) {
        ids.add(row.orgUnitBudgetStatus)
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
    () => buildBudgetDistributionOrgUnitFilterConfiguration(t, orgUnitBudgetStatusOptions, totalResolvedRangeConfig),
    [t, orgUnitBudgetStatusOptions, totalResolvedRangeConfig]
  )

  const filteredRows = useMemo(() => {
    let list = allRows

    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(row => {
        const name = (row.organizationalUnitName ?? '').toLowerCase()
        const statusLabel = formatBudgetPlanStatusLabelForDisplay(row.orgUnitBudgetStatus, t).toLowerCase()
        return (
          row.id.toLowerCase().includes(q) ||
          row.compensationBudgetPlanId.toLowerCase().includes(q) ||
          row.organizationalUnitId.toLowerCase().includes(q) ||
          name.includes(q) ||
          statusLabel.includes(q) ||
          String(row.salaryBudgetAmount).includes(q) ||
          String(row.salaryBudgetPercent).includes(q) ||
          String(row.bonusBudgetAmount).includes(q) ||
          String(row.bonusBudgetPercent).includes(q)
        )
      })
    }

    if (selectedOrgUnitBudgetStatuses.length > 0) {
      const set = new Set(selectedOrgUnitBudgetStatuses)
      list = list.filter(row => row.orgUnitBudgetStatus != null && set.has(row.orgUnitBudgetStatus))
    }

    list = list.filter(row => budgetMatchesRange(row.resolvedTotal, totalResolvedRange))

    return list
  }, [allRows, debouncedSearch, selectedOrgUnitBudgetStatuses, totalResolvedRange])

  const hasActiveFilters = useMemo(() => {
    const hasRange = (range: { min?: number | null; max?: number | null } | null) =>
      !!(range && (range.min !== undefined || range.max !== undefined))
    return debouncedSearch.trim() !== '' || selectedOrgUnitBudgetStatuses.length > 0 || hasRange(totalResolvedRange)
  }, [debouncedSearch, selectedOrgUnitBudgetStatuses, totalResolvedRange])

  const emptyMessage = useMemo(() => {
    if (!hasSelectedPlan) {
      return t('budget-distribution-table-empty-no-plan')
    }
    if (hasActiveFilters) {
      return t('budget-distribution-table-empty-filtered')
    }
    return t('budget-distribution-table-empty')
  }, [hasActiveFilters, hasSelectedPlan, t])

  const filtersObject = useMemo(() => {
    const hasRange = (range: { min?: number | null; max?: number | null } | null) =>
      !!(range && (range.min !== undefined || range.max !== undefined))
    const obj: Record<string, unknown> = {}
    if (selectedOrgUnitBudgetStatuses.length > 0) {
      obj.orgUnitBudgetStatuses = selectedOrgUnitBudgetStatuses
    }
    if (hasRange(totalResolvedRange)) {
      obj.totalResolvedRange = { ...totalResolvedRange }
    }
    return obj
  }, [selectedOrgUnitBudgetStatuses, totalResolvedRange])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const statuses = (filters.orgUnitBudgetStatuses as string[] | undefined) ?? []
    setSelectedOrgUnitBudgetStatuses(statuses)
    applyNumberRangeFromFilters(
      filters.totalResolvedRange as { min?: number | null; max?: number | null } | undefined,
      setTotalResolvedRange
    )
  }, [])

  const columns = useMemo(
    () => buildBudgetDistributionOrgUnitTableColumns(t, v => formatBudgetPlanStatusLabelForDisplay(v, t)),
    [t]
  )

  const visibleTableColumns = useMemo(
    () =>
      columns.filter(col =>
        visibleColumns.includes(
          String((col as ColumnDef<BudgetDistributionOrgUnitTableRow> & { id?: string }).id ?? '')
        )
      ),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'organizationalUnitName', label: t('budget-distribution-table-col-org-unit-name') },
      { id: 'orgUnitBudgetStatus', label: t('budget-setup-table-col-budget-plan-status') },
      { id: 'salaryBudgetAmount', label: t('budget-setup-table-col-salary-budget-amount') },
      { id: 'salaryBudgetPercent', label: t('budget-setup-table-col-salary-budget-percent') },
      { id: 'bonusBudgetAmount', label: t('budget-setup-table-col-bonus-budget-amount') },
      { id: 'bonusBudgetPercent', label: t('budget-setup-table-col-bonus-budget-percent') },
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
  }, [debouncedSearch, selectedOrgUnitBudgetStatuses, totalResolvedRange, sorting])

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
