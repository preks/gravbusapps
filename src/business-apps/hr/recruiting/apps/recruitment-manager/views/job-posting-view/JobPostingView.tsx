import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobPostings } from '@/common/data/recruiting/hooks/useJobPostings'
import { DataDisplay, DataTable, Badge } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { JobPosting } from '@/common/data/recruiting/types/jobPostingTypes'

export type JobPostingViewProps = BusinessAppContextProps

export const JobPostingView: React.FC<JobPostingViewProps> = context => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })

  const { jobPostings, total, loading, error } = useJobPostings(
    context.accessToken,
    {
      search,
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      orderBy: sorting.map(s => ({
        field: s.id,
        direction: s.desc ? ('DESC_NULLS_LAST' as const) : ('ASC_NULLS_LAST' as const)
      }))
    },
    'list'
  )

  // Row actions
  const rowActions = useMemo(
    () => (row: any) => (
      <div className="gba:flex gba:justify-start gba:gap-2">
        <AppActionButton
          data-testid={`job-posting-update-button-${row.original.id}`}
          size="icon"
          contextsArray={[]}
          externalContextData={{ jobPostingId: row.original.id }}
          prefixDataTestId="job-posting-update"
          accessToken={context.accessToken}
          emptyStateBehavior="enable"
          deferMainContextRequestsUntilClick
          onClick={e => e.stopPropagation()}
        />
      </div>
    ),
    [context.accessToken]
  )

  // Columns
  const columns = useMemo<ColumnDef<JobPosting>[]>(
    () => [
      {
        id: 'jobTitle',
        accessorKey: 'jobTitle',
        header: getTranslationFromI18nKeyAndLabel('recruiting.jobTitle', 'Job Title'),
        cell: info => <div className="gba:text-sm gba:font-medium">{(info.getValue() as string) || '-'}</div>,
        meta: { type: 'text' as const }
      },
      {
        id: 'department',
        accessorKey: 'department',
        header: getTranslationFromI18nKeyAndLabel('recruiting.department', 'Department'),
        cell: info => <div className="gba:text-sm">{(info.getValue() as string) || '-'}</div>,
        meta: { type: 'text' as const }
      },
      {
        id: 'location',
        accessorKey: 'location',
        header: getTranslationFromI18nKeyAndLabel('recruiting.location', 'Location'),
        cell: info => <div className="gba:text-sm">{(info.getValue() as string) || '-'}</div>,
        meta: { type: 'text' as const }
      },
      {
        id: 'contractType',
        accessorKey: 'contractType',
        header: getTranslationFromI18nKeyAndLabel('recruiting.contractType', 'Contract Type'),
        cell: info => {
          const value = info.getValue() as string
          return value ? (
            <Badge variant="secondary" className="gba:text-xs">
              {value}
            </Badge>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )
        },
        meta: { type: 'text' as const }
      },
      {
        id: 'remote',
        accessorKey: 'remote',
        header: getTranslationFromI18nKeyAndLabel('recruiting.remote', 'Remote'),
        cell: info => {
          const value = info.getValue() as string
          return value ? (
            <Badge variant="outline" className="gba:text-xs">
              {value}
            </Badge>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )
        },
        meta: { type: 'text' as const }
      }
    ],
    []
  )

  return (
    <div data-testid="job-posting-view" className="gba:h-full">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('recruiting.allJobPostings', 'All Job Postings'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('recruiting.searchJobPostings', 'Search job postings...')}
        onSearchChange={setSearch}
        toolbarDensity="default"
      >
        <DataTable<JobPosting>
          data={jobPostings}
          columns={columns}
          loading={loading}
          error={error || undefined}
          totalCount={total}
          sorting={sorting}
          onSortingChange={setSorting}
          pagination={pagination}
          onPaginationChange={setPagination}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          tableLayout="fixed"
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage={getTranslationFromI18nKeyAndLabel('recruiting.noJobPostingsFound', 'No job postings found')}
          actions={rowActions}
          data-testid="job-posting-list"
        />
      </DataDisplay>
    </div>
  )
}
