import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobRequests } from '@/common/data/recruiting/hooks/useJobRequests'
import { DataDisplay, DataTable, Badge } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { JobRequest } from '@/common/data/recruiting/types/jobRequestTypes'

export type JobRequestViewProps = BusinessAppContextProps

export const JobRequestView: React.FC<JobRequestViewProps> = context => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })

  const { jobRequests, total, loading, error } = useJobRequests(
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
      <AppAction
        data-testid={`job-requisition-update-button-${row.original.id}`}
        variant="table-row"
        contexts={[]}
        externalContextData={{ jobRequisitionId: row.original.id }}
        prefixDataTestId="job-requisition-update"
        accessToken={context.accessToken}
        lazyLoad
        onClick={e => e.stopPropagation()}
      />
    ),
    [context.accessToken]
  )

  // Columns
  const columns = useMemo<ColumnDef<JobRequest>[]>(
    () => [
      {
        id: 'code',
        accessorKey: 'code',
        header: getTranslationFromI18nKeyAndLabel('recruiting.code', 'Code'),
        cell: info => <div className="gba:text-sm">{(info.getValue() as string) || '-'}</div>,
        meta: { type: 'text' as const }
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: getTranslationFromI18nKeyAndLabel('recruiting.name', 'Name'),
        cell: info => <div className="gba:text-sm gba:font-medium">{(info.getValue() as string) || '-'}</div>,
        meta: { type: 'text' as const }
      },
      {
        id: 'headcount',
        accessorKey: 'headcount',
        header: getTranslationFromI18nKeyAndLabel('recruiting.headcount', 'Headcount'),
        cell: info => <div className="gba:text-sm gba:text-right">{(info.getValue() as number) || '-'}</div>,
        meta: { type: 'number' as const }
      },
      {
        id: 'contractType',
        accessorKey: 'contractType',
        header: getTranslationFromI18nKeyAndLabel('recruiting.contractType', 'Contract Type'),
        cell: info => {
          const value = info.getValue() as any
          return value?.value ? (
            <Badge variant="secondary" className="gba:text-xs">
              {value.value}
            </Badge>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )
        },
        meta: { type: 'text' as const }
      },
      {
        id: 'experienceLevel',
        accessorKey: 'experienceLevel',
        header: getTranslationFromI18nKeyAndLabel('recruiting.experienceLevel', 'Experience Level'),
        cell: info => {
          const value = info.getValue() as any
          return value?.value ? (
            <Badge variant="outline" className="gba:text-xs">
              {value.value}
            </Badge>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )
        },
        meta: { type: 'text' as const }
      },
      {
        id: 'endDate',
        accessorKey: 'endDate',
        header: getTranslationFromI18nKeyAndLabel('recruiting.endDate', 'End Date'),
        cell: info => {
          const value = info.getValue() as string
          return value ? (
            <div className="gba:text-sm">{new Date(value).toLocaleDateString()}</div>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )
        },
        meta: { type: 'date' as const }
      }
    ],
    []
  )

  return (
    <div data-testid="job-requisition-view" className="gba:h-full">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('recruiting.allJobRequisitions', 'All Job Requisitions'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          'recruiting.searchJobRequisitions',
          'Search job requisitions...'
        )}
        onSearchChange={setSearch}
        toolbarDensity="default"
      >
        <DataTable<JobRequest>
          data={jobRequests}
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
          emptyMessage={getTranslationFromI18nKeyAndLabel(
            'recruiting.noJobRequisitionsFound',
            'No job requisitions found'
          )}
          actions={rowActions}
          data-testid="job-requisition-list"
        />
      </DataDisplay>
    </div>
  )
}
