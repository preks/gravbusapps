import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobPostings } from '@/common/data/recruiting/hooks/useJobPostings'
import { DataDisplay, DataTable, Badge } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
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

  // Handle row click to navigate to job posting record
  const handleRowClick = useCallback((row: JobPosting) => {
    if (!row.id) return
    const url = buildPlatformUrl('/platform/hr/recruiting/job-posting-record', {
      jobPostingId: row.id
    })
    navigateTo(url)
  }, [])

  // Primary action for creating new job posting
  const primaryAction = useMemo(
    () => (
      <AppAction
        variant="create-primary"
        contexts={[
          {
            context: FlowContextName.jobPostingCreate,
            contextData: {}
          }
        ]}
        accessToken={context.accessToken}
        emptyState="hide"
        data-testid="add-job-posting-action"
      >
        {getTranslationFromI18nKeyAndLabel('recruiting.addJobPosting', 'Add Job Posting')}
      </AppAction>
    ),
    [context.accessToken]
  )

  // Row actions
  const rowActions = useMemo(
    () => (row: any) => (
      <AppAction
        data-testid={`job-posting-actions-${row.original.id}`}
        variant="table-row"
        contexts={[
          {
            context: FlowContextName.jobPostingEntity,
            contextData: { jobPostingId: row.original.id }
          }
        ]}
        shareContext={{
          entityType: 'jobPosting',
          entityId: row.original.id,
          entityName: row.original.title
        }}
        prefixDataTestId="job-posting-actions"
        accessToken={context.accessToken}
        lazyLoad
        onClick={e => e.stopPropagation()}
      />
    ),
    [context.accessToken]
  )

  // Columns
  const columns = useMemo<ColumnDef<JobPosting>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: getTranslationFromI18nKeyAndLabel('recruiting.title', 'Job Title'),
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
        primaryAction={primaryAction}
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
          onRowClick={handleRowClick}
          data-testid="job-posting-list"
        />
      </DataDisplay>
    </div>
  )
}
