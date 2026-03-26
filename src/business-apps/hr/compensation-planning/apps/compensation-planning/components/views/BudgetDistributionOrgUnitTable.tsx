import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { DataDisplay, DataTable, useTranslation, type FilterConfiguration } from '@newwork/nw-design-system'
import { useDebounce } from '@/common/hooks/useDebounce'
import {
  useCompanyOrganizationalUnits,
  type CompanyOrganizationalUnit
} from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import translations from '../../_i18n'

const VISIBLE_COLUMN_IDS = ['name', 'salaryBudget', 'bonusBudget'] as const

/** NumberFilter uses `placeholderMin || "Min"` (falsy `""` still falls back). ZWSP is truthy so inputs stay visually empty next to the Min/Max addons. */
const EMPTY_RANGE_INPUT_PLACEHOLDER = '\u200b'

const BUDGET_SORT_FALLBACK = Number.NEGATIVE_INFINITY

function formatBudgetAmount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return ''
  }
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
}

function applyBudgetRangeFromFilters(
  amt: { min?: number | null; max?: number | null } | undefined,
  setRange: (range: { min?: number | null; max?: number | null } | null) => void
): void {
  if (amt && (amt.min !== undefined || amt.max !== undefined)) {
    setRange({ min: amt.min, max: amt.max })
  } else {
    setRange(null)
  }
}

function budgetMatchesRange(
  value: number | null | undefined,
  range: { min?: number | null; max?: number | null } | null
): boolean {
  if (!range) {
    return true
  }
  const hasMin = range.min != null && !Number.isNaN(range.min)
  const hasMax = range.max != null && !Number.isNaN(range.max)
  if (!hasMin && !hasMax) {
    return true
  }
  const v = value ?? 0
  if (hasMin && v < range.min!) {
    return false
  }
  if (hasMax && v > range.max!) {
    return false
  }
  return true
}

function buildBudgetDistributionColumns(
  colOrgUnit: string,
  colSalaryBudget: string,
  colBonusBudget: string
): ColumnDef<CompanyOrganizationalUnit>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: colOrgUnit,
      cell: ({ getValue }) => {
        const raw = getValue()
        const label = typeof raw === 'string' ? raw : ''
        return <span className="gba:font-medium gba:text-sm">{label}</span>
      },
      meta: { type: 'text' }
    },
    {
      id: 'salaryBudget',
      header: colSalaryBudget,
      accessorFn: row => row.salaryBudget ?? BUDGET_SORT_FALLBACK,
      cell: ({ row }) => {
        const formatted = formatBudgetAmount(row.original.salaryBudget)
        return (
          <span className="gba:text-right gba:text-sm gba:font-mono gba:text-muted-foreground">{formatted || '-'}</span>
        )
      },
      meta: { align: 'right', type: 'number' }
    },
    {
      id: 'bonusBudget',
      header: colBonusBudget,
      accessorFn: row => row.bonusBudget ?? BUDGET_SORT_FALLBACK,
      cell: ({ row }) => {
        const formatted = formatBudgetAmount(row.original.bonusBudget)
        return (
          <span className="gba:text-right gba:text-sm gba:font-mono gba:text-muted-foreground">{formatted || '-'}</span>
        )
      },
      meta: { align: 'right', type: 'number' }
    }
  ]
}

export interface BudgetDistributionOrgUnitTableProps {
  accessToken: string
  companyId: string
}

export const BudgetDistributionOrgUnitTable: React.FC<BudgetDistributionOrgUnitTableProps> = ({
  accessToken,
  companyId
}) => {
  const { t } = useTranslation(translations)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [selectedOrgUnitIds, setSelectedOrgUnitIds] = useState<string[]>([])
  const [salaryBudgetRange, setSalaryBudgetRange] = useState<{
    min?: number | null
    max?: number | null
  } | null>(null)
  const [bonusBudgetRange, setBonusBudgetRange] = useState<{
    min?: number | null
    max?: number | null
  } | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...VISIBLE_COLUMN_IDS])

  const { units, loading, error } = useCompanyOrganizationalUnits(accessToken, companyId, 100, debouncedSearch)

  const orgUnitFilterOptions = useMemo(() => {
    return [...units].sort((a, b) => a.name.localeCompare(b.name)).map(u => ({ id: u.id, label: u.name }))
  }, [units])

  const filterConfiguration = useMemo((): FilterConfiguration => {
    const numberRangeConfig = {
      mode: 'range' as const,
      min: 0,
      max: 100_000_000,
      step: 1,
      placeholderMin: EMPTY_RANGE_INPUT_PLACEHOLDER,
      placeholderMax: EMPTY_RANGE_INPUT_PLACEHOLDER
    }
    return {
      id: 'budget-distribution-org-units-filters',
      name: t('budget-distribution-filter-sheet-title'),
      groups: [
        {
          id: 'org-unit-group',
          label: t('budget-distribution-filter-org-unit-group'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'orgUnitIds',
              field: 'orgUnitIds',
              label: t('budget-distribution-filter-org-unit-label'),
              type: 'multi-select',
              config: { options: orgUnitFilterOptions }
            }
          ]
        },
        {
          id: 'salary-budget-filter-group',
          label: t('budget-distribution-filter-salary-budget-group'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'salaryBudgetRange',
              field: 'salaryBudgetRange',
              label: '',
              type: 'number',
              config: numberRangeConfig
            }
          ]
        },
        {
          id: 'bonus-budget-filter-group',
          label: t('budget-distribution-filter-bonus-budget-group'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'bonusBudgetRange',
              field: 'bonusBudgetRange',
              label: '',
              type: 'number',
              config: numberRangeConfig
            }
          ]
        }
      ]
    }
  }, [t, orgUnitFilterOptions])

  const filteredUnits = useMemo(() => {
    let list = units
    if (selectedOrgUnitIds.length > 0) {
      const idSet = new Set(selectedOrgUnitIds)
      list = list.filter(u => idSet.has(u.id))
    }
    list = list.filter(
      u => budgetMatchesRange(u.salaryBudget, salaryBudgetRange) && budgetMatchesRange(u.bonusBudget, bonusBudgetRange)
    )
    return list
  }, [units, selectedOrgUnitIds, salaryBudgetRange, bonusBudgetRange])

  const hasActiveFilters = useMemo(() => {
    const hasRange = (range: { min?: number | null; max?: number | null } | null) =>
      !!(range && (range.min !== undefined || range.max !== undefined))
    return (
      debouncedSearch.trim() !== '' ||
      selectedOrgUnitIds.length > 0 ||
      hasRange(salaryBudgetRange) ||
      hasRange(bonusBudgetRange)
    )
  }, [debouncedSearch, selectedOrgUnitIds, salaryBudgetRange, bonusBudgetRange])

  const emptyMessage = hasActiveFilters
    ? t('budget-distribution-empty-filtered')
    : t('budget-distribution-empty-org-units')

  const filtersObject = useMemo(() => {
    const hasRange = (range: { min?: number | null; max?: number | null } | null) =>
      !!(range && (range.min !== undefined || range.max !== undefined))
    const obj: Record<string, unknown> = {}
    if (selectedOrgUnitIds.length > 0) {
      obj.orgUnitIds = selectedOrgUnitIds
    }
    if (hasRange(salaryBudgetRange)) {
      obj.salaryBudgetRange = { ...salaryBudgetRange }
    }
    if (hasRange(bonusBudgetRange)) {
      obj.bonusBudgetRange = { ...bonusBudgetRange }
    }
    return obj
  }, [selectedOrgUnitIds, salaryBudgetRange, bonusBudgetRange])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const orgIds = (filters.orgUnitIds as string[] | undefined) ?? []
    setSelectedOrgUnitIds(orgIds)
    applyBudgetRangeFromFilters(
      filters.salaryBudgetRange as { min?: number | null; max?: number | null } | undefined,
      setSalaryBudgetRange
    )
    applyBudgetRangeFromFilters(
      filters.bonusBudgetRange as { min?: number | null; max?: number | null } | undefined,
      setBonusBudgetRange
    )
  }, [])

  const colOrgUnit = t('budget-distribution-col-org-unit')
  const colSalaryBudget = t('budget-distribution-col-salary-budget')
  const colBonusBudget = t('budget-distribution-col-bonus-budget')

  const columns = useMemo(
    () => buildBudgetDistributionColumns(colOrgUnit, colSalaryBudget, colBonusBudget),
    [colOrgUnit, colSalaryBudget, colBonusBudget]
  )

  const visibleTableColumns = useMemo(
    () =>
      columns.filter(col =>
        visibleColumns.includes(String((col as ColumnDef<CompanyOrganizationalUnit> & { id?: string }).id ?? ''))
      ),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'name', label: colOrgUnit },
      { id: 'salaryBudget', label: colSalaryBudget },
      { id: 'bonusBudget', label: colBonusBudget }
    ],
    [colOrgUnit, colSalaryBudget, colBonusBudget]
  )

  const availableColumnsForDisplay = useMemo(
    () => [
      { id: 'name', label: colOrgUnit },
      { id: 'salaryBudget', label: colSalaryBudget },
      { id: 'bonusBudget', label: colBonusBudget }
    ],
    [colOrgUnit, colSalaryBudget, colBonusBudget]
  )

  const handlePaginationChange = useCallback((next: { pageIndex: number; pageSize: number }) => {
    setPagination(next)
  }, [])

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [debouncedSearch, selectedOrgUnitIds, salaryBudgetRange, bonusBudgetRange, sorting])

  return (
    <DataDisplay
      data-testid="budget-distribution-org-units-display"
      titleSections={[
        {
          id: 'org-units',
          label: t('budget-distribution-org-units-table-title'),
          metadata: { count: filteredUnits.length, isLoading: loading }
        }
      ]}
      currentSection="org-units"
      toolbarDensity="default"
      searchValue={searchInput}
      searchPlaceholder={t('budget-distribution-search-placeholder')}
      onSearchChange={setSearchInput}
      filters={filtersObject}
      filterConfiguration={filterConfiguration}
      onFilterChange={handleFilterChangeFromDisplay}
      enableLiveFiltering
      filterSheetTitle={t('budget-distribution-filter-sheet-title')}
      filterSheetDescription={t('budget-distribution-filter-sheet-description')}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={setSorting}
      availableColumns={availableColumnsForDisplay}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={setVisibleColumns}
    >
      <DataTable<CompanyOrganizationalUnit>
        data={filteredUnits}
        columns={visibleTableColumns}
        loading={loading}
        error={error}
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        enablePagination
        enableSorting
        enableSelection={false}
        enableColumnPinning
        enableResizing={false}
        tableLayout="fixed"
        rowsPerPageOptions={[10, 20, 50, 100]}
        showPageNumbers
        maxVisiblePages={7}
        emptyMessage={emptyMessage}
        data-testid="budget-distribution-org-units-table"
      />
    </DataDisplay>
  )
}
