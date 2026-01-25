import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobInterviews } from '@/common/data/recruiting/hooks/useJobInterviews'
import { DataDisplay, DataTable } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState, CellContext } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { JobInterview } from '@/common/data/recruiting/types/jobInterviewTypes'

interface InterviewsViewProps extends BusinessAppContextProps {
  jobApplicationId: string
}

// Cell Components
const ScheduledDateCell: React.FC<{ info: CellContext<JobInterview, unknown> }> = ({ info }) => {
  const value = info.getValue() as string
  return value ? (
    <div className="gba:text-sm gba:font-medium">{new Date(value).toLocaleString()}</div>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

const LocationCell: React.FC<{ info: CellContext<JobInterview, unknown> }> = ({ info }) => {
  const value = info.getValue() as string
  return <div className="gba:text-sm">{value || '-'}</div>
}

export const InterviewsView: React.FC<InterviewsViewProps> = ({ jobApplicationId, accessToken }) => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'scheduledAt', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })

  // Fetch interviews filtered by this job application
  const { jobInterviews, total, loading, error } = useJobInterviews(
    accessToken,
    {
      search,
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      where: { jobApplicationId: { _eq: jobApplicationId } }, // Filter by job application
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
        data-testid={`interview-actions-${row.original.id}`}
        variant="table-row"
        contexts={[
          {
            context: FlowContextName.jobInterviewEntity,
            contextData: { jobInterviewId: row.original.id }
          }
        ]}
        shareContext={{
          entityType: 'jobInterview',
          entityId: row.original.id,
          entityName: row.original.scheduledAt
            ? `Interview on ${new Date(row.original.scheduledAt).toLocaleDateString()}`
            : 'Interview'
        }}
        prefixDataTestId="interview-actions"
        accessToken={accessToken}
        lazyLoad
        onClick={e => e.stopPropagation()}
      />
    ),
    [accessToken]
  )

  // Columns
  const columns = useMemo<ColumnDef<JobInterview>[]>(
    () => [
      {
        id: 'scheduledAt',
        accessorKey: 'scheduledAt',
        header: getTranslationFromI18nKeyAndLabel('recruiting.scheduledAt', 'Scheduled Date & Time'),
        cell: ScheduledDateCell,
        meta: { type: 'date' as const }
      },
      {
        id: 'duration',
        accessorKey: 'duration',
        header: getTranslationFromI18nKeyAndLabel('recruiting.duration', 'Duration (min)'),
        cell: info => {
          const value = info.getValue() as number
          return value ? (
            <div className="gba:text-sm gba:text-right">{value}</div>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )
        },
        meta: { type: 'number' as const }
      },
      {
        id: 'location',
        accessorKey: 'location',
        header: getTranslationFromI18nKeyAndLabel('recruiting.location', 'Location'),
        cell: LocationCell,
        meta: { type: 'text' as const }
      }
    ],
    []
  )

  return (
    <div
      className="gba:col-span-1 gba:sm:col-span-12 gba:md:col-span-12 gba:lg:col-span-12"
      data-testid="job-interviews-view"
    >
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('recruiting.interviews', 'Interviews'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('recruiting.searchInterviews', 'Search interviews...')}
        onSearchChange={setSearch}
        toolbarDensity="default"
      >
        <DataTable<JobInterview>
          data={jobInterviews}
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
            'recruiting.noInterviewsFound',
            'No interviews found for this application'
          )}
          actions={rowActions}
          data-testid="job-interviews-list"
        />
      </DataDisplay>
    </div>
  )
}
