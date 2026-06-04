import React, { useCallback, useMemo, useState } from 'react'
import { DataDisplay, DataTable, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import customer360I18n from '../../../_i18n'
import type { CustomerPortfolioRow } from '../../../data/portfolio/types'
import type { Customer360HomeViewProps } from '../../types'
import { createExplorerColumns, EXPLORER_SORTABLE_COLUMNS } from './explorerColumns'

type SortState = Array<{ id: string; desc: boolean }>

type ExplorerSection = 'all' | 'account' | 'contact' | 'attention'

const DEFAULT_PAGE_SIZE = 20

function compareRows(a: CustomerPortfolioRow, b: CustomerPortfolioRow, sort: { id: string; desc: boolean }): number {
  const direction = sort.desc ? -1 : 1
  switch (sort.id) {
    case 'displayName':
      return a.displayName.localeCompare(b.displayName) * direction
    case 'status':
      return (a.status ?? '').localeCompare(b.status ?? '') * direction
    case 'health':
      return ((a.summary.health ?? -1) - (b.summary.health ?? -1)) * direction
    default:
      return (a.attentionScore - b.attentionScore) * direction
  }
}

function filterBySection(rows: CustomerPortfolioRow[], section: ExplorerSection): CustomerPortfolioRow[] {
  if (section === 'account' || section === 'contact') return rows.filter(row => row.type === section)
  if (section === 'attention') return rows.filter(row => row.attentionReasons.length > 0)
  return rows
}

function filterBySearch(rows: CustomerPortfolioRow[], search: string): CustomerPortfolioRow[] {
  const term = search.trim().toLowerCase()
  if (!term) return rows
  return rows.filter(
    row => row.displayName.toLowerCase().includes(term) || (row.secondary ?? '').toLowerCase().includes(term)
  )
}

/**
 * Portfolio Explorer — the full all-customers table (accounts + contacts) with
 * search, segment filtering, sorting and health/attention columns. Operates
 * client-side over the loaded portfolio; row click opens the 360° detail.
 */
const ExplorerView: React.FC<Customer360HomeViewProps> = ({ portfolio, openCustomer }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { rows, loading } = portfolio

  const [search, setSearch] = useState('')
  const [section, setSection] = useState<ExplorerSection>('all')
  const [sorting, setSorting] = useState<SortState>([{ id: 'attentionScore', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE })

  const columns = useMemo(() => createExplorerColumns({ t, openCustomer }), [t, openCustomer])

  const filtered = useMemo(() => {
    const bySection = filterBySection(rows, section)
    const bySearch = filterBySearch(bySection, search)
    const sort = sorting[0]
    return sort ? [...bySearch].sort((a, b) => compareRows(a, b, sort)) : bySearch
  }, [rows, section, search, sorting])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleSection = useCallback((next: string) => {
    setSection(next as ExplorerSection)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const titleSections = useMemo(
    () => [
      { id: 'all', label: t('explorer-segment-all'), metadata: { count: rows.length, isLoading: loading } },
      {
        id: 'account',
        label: t('explorer-segment-accounts'),
        metadata: { count: rows.filter(r => r.type === 'account').length, isLoading: loading }
      },
      {
        id: 'contact',
        label: t('explorer-segment-contacts'),
        metadata: { count: rows.filter(r => r.type === 'contact').length, isLoading: loading }
      },
      {
        id: 'attention',
        label: t('explorer-segment-attention'),
        metadata: { count: rows.filter(r => r.attentionReasons.length > 0).length, isLoading: loading }
      }
    ],
    [rows, loading, t]
  )

  return (
    <div data-testid="customer-360-explorer-view" className="gba:flex gba:flex-col gba:gap-4">
      <DataDisplay
        titleSections={titleSections}
        currentSection={section}
        onSectionChange={handleSection}
        searchValue={search}
        searchPlaceholder={t('explorer-search-placeholder')}
        onSearchChange={handleSearch}
        sorting={sorting}
        sortableColumns={EXPLORER_SORTABLE_COLUMNS}
        onSortingChange={setSorting}
      >
        <DataTable<CustomerPortfolioRow>
          data={pageRows}
          columns={columns}
          loading={loading}
          totalCount={filtered.length}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={setPagination}
          onSortingChange={setSorting}
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
