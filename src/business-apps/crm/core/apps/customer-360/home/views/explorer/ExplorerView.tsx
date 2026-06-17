import React, { useCallback, useMemo, useState } from 'react'
import {
  DataDisplay,
  DataTable,
  type FilterConfiguration,
  useTranslation as useFluentTranslation
} from '@newwork/nw-design-system'
import customer360I18n from '../../../_i18n'
import { ATTENTION_THRESHOLD, type CustomerPortfolioRow } from '../../../data/portfolio/types'
import type { Customer360HomeViewProps } from '../../types'
import { createExplorerColumns, EXPLORER_SORTABLE_COLUMNS } from './explorerColumns'

type SortState = Array<{ id: string; desc: boolean }>
type SortStateUpdater = SortState | ((previous: SortState) => SortState)

const DEFAULT_PAGE_SIZE = 20
const OWNER_ASSIGNED_FILTER = 'assigned'
const OWNER_UNASSIGNED_FILTER = 'unassigned'
const ATTENTION_FILTER = 'needs-attention'
const ATTENTION_FILTER_PARAM = 'attention'

function compareRows(a: CustomerPortfolioRow, b: CustomerPortfolioRow, sort: { id: string; desc: boolean }): number {
  const direction = sort.desc ? -1 : 1
  switch (sort.id) {
    case 'displayName':
      return a.displayName.localeCompare(b.displayName) * direction
    case 'email':
      return (a.email ?? '').localeCompare(b.email ?? '') * direction
    case 'status':
      return (a.status ?? '').localeCompare(b.status ?? '') * direction
    case 'owner':
      return (a.ownerName ?? '').localeCompare(b.ownerName ?? '') * direction
    case 'health':
      return ((a.summary.health ?? -1) - (b.summary.health ?? -1)) * direction
    case 'reasons':
      return a.attentionReasons.join(' ').localeCompare(b.attentionReasons.join(' ')) * direction
    default:
      return (a.attentionScore - b.attentionScore) * direction
  }
}

function filterBySearch(rows: CustomerPortfolioRow[], search: string): CustomerPortfolioRow[] {
  const term = search.trim().toLowerCase()
  if (!term) return rows
  return rows.filter(
    row =>
      row.displayName.toLowerCase().includes(term) ||
      (row.secondary ?? '').toLowerCase().includes(term) ||
      (row.email ?? '').toLowerCase().includes(term)
  )
}

function selectedValues(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function needsAttention(row: CustomerPortfolioRow): boolean {
  return row.attentionScore >= ATTENTION_THRESHOLD || row.attentionReasons.length > 0
}

function filterBySelectedFilters(
  rows: CustomerPortfolioRow[],
  filters: Record<string, unknown>
): CustomerPortfolioRow[] {
  const ownerStatuses = selectedValues(filters.ownerStatus)
  const attentionStatuses = selectedValues(filters.attentionStatus)
  const filterOwner = ownerStatuses.length === 1
  const filterAttention = attentionStatuses.includes(ATTENTION_FILTER)

  return rows.filter(row => {
    const ownerMatches =
      !filterOwner ||
      (ownerStatuses.includes(OWNER_ASSIGNED_FILTER) && Boolean(row.ownerId)) ||
      (ownerStatuses.includes(OWNER_UNASSIGNED_FILTER) && !row.ownerId)

    return ownerMatches && (!filterAttention || needsAttention(row))
  })
}

function readFiltersFromUrl(): Record<string, unknown> {
  if (globalThis.window === undefined) return {}
  const params = new URLSearchParams(globalThis.window.location.search)
  return params.get(ATTENTION_FILTER_PARAM) === ATTENTION_FILTER ? { attentionStatus: [ATTENTION_FILTER] } : {}
}

/**
 * Portfolio Explorer — the full customer account table with
 * search, DataDisplay filters, sorting and health/attention columns. Operates
 * client-side over the loaded portfolio; row click opens the 360° detail.
 */
const ExplorerView: React.FC<Customer360HomeViewProps> = ({ portfolio, openCustomer }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { rows, loading } = portfolio

  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, unknown>>(readFiltersFromUrl)
  const [sorting, setSorting] = useState<SortState>([{ id: 'attentionScore', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE })

  const columns = useMemo(() => createExplorerColumns({ t, openCustomer }), [t, openCustomer])

  const filterConfiguration = useMemo<FilterConfiguration>(
    () => ({
      id: 'customer-360-explorer-filters',
      name: t('explorer-filter-title'),
      groups: [
        {
          id: 'owner-group',
          label: t('explorer-column-owner'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'ownerStatus',
              field: 'ownerStatus',
              label: t('explorer-column-owner'),
              type: 'multi-select',
              config: {
                options: [
                  { id: OWNER_ASSIGNED_FILTER, value: OWNER_ASSIGNED_FILTER, label: t('explorer-owner-assigned') },
                  {
                    id: OWNER_UNASSIGNED_FILTER,
                    value: OWNER_UNASSIGNED_FILTER,
                    label: t('explorer-owner-unassigned')
                  }
                ]
              }
            }
          ]
        },
        {
          id: 'attention-group',
          label: t('explorer-column-attention'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'attentionStatus',
              field: 'attentionStatus',
              label: t('explorer-column-attention'),
              type: 'multi-select',
              config: {
                options: [{ id: ATTENTION_FILTER, value: ATTENTION_FILTER, label: t('explorer-segment-attention') }]
              }
            }
          ]
        }
      ]
    }),
    [t]
  )

  const filtered = useMemo(() => {
    const byFilters = filterBySelectedFilters(rows, selectedFilters)
    const bySearch = filterBySearch(byFilters, search)
    const sort = sorting[0]
    return sort ? [...bySearch].sort((a, b) => compareRows(a, b, sort)) : bySearch
  }, [rows, selectedFilters, search, sorting])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    setSelectedFilters(filters)
    if (globalThis.window !== undefined) {
      const params = new URLSearchParams(globalThis.window.location.search)
      if (selectedValues(filters.attentionStatus).includes(ATTENTION_FILTER)) {
        params.set(ATTENTION_FILTER_PARAM, ATTENTION_FILTER)
      } else {
        params.delete(ATTENTION_FILTER_PARAM)
      }
      globalThis.window.history.replaceState(null, '', `${globalThis.window.location.pathname}?${params.toString()}`)
    }
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleSortingChange = useCallback((updater: SortStateUpdater) => {
    setSorting(previous => (typeof updater === 'function' ? updater(previous) : updater))
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const titleSections = useMemo(
    () => [{ id: 'all', label: t('explorer-segment-all'), metadata: { count: filtered.length, isLoading: loading } }],
    [filtered.length, loading, t]
  )

  return (
    <div data-testid="customer-360-explorer-view" className="gba:flex gba:flex-col gba:gap-4">
      <DataDisplay
        titleSections={titleSections}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={t('explorer-search-placeholder')}
        onSearchChange={handleSearch}
        filters={selectedFilters}
        filterConfiguration={filterConfiguration}
        onFilterChange={handleFilterChange}
        sorting={sorting}
        sortableColumns={EXPLORER_SORTABLE_COLUMNS}
        onSortingChange={handleSortingChange}
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={t('explorer-filter-title')}
      >
        <DataTable<CustomerPortfolioRow>
          data={pageRows}
          columns={columns}
          loading={loading}
          totalCount={filtered.length}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={setPagination}
          onSortingChange={handleSortingChange}
          enablePagination
          enableSorting
          enableSelection={false}
          enableResizing={false}
          tableLayout="fixed"
        />
      </DataDisplay>
    </div>
  )
}

export default ExplorerView
export { ExplorerView }
