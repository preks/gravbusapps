import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobApplicationInterviews } from '@/common/data/recruiting/hooks/useJobApplicationInterviews'
import { DataDisplay, DataTable } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { JobApplicationInterview } from '@/common/data/recruiting/types/jobApplicationInterviewTypes'

interface InterviewsViewProps extends BusinessAppContextProps {
  jobApplicationId: string
}

export const InterviewsView: React.FC<InterviewsViewProps> = ({ jobApplicationId, accessToken }) => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'scheduledDate', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })

  // Fetch interviews filtered by this job application
  const { jobApplicationInterviews, total, loading, error } = useJobApplicationInterviews(
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
      <div className="gba:flex gba:justify-start gba:gap-2">
        <AppActionButton
          data-testid={`interview-actions-${row.original.id}`}
          size="icon"
          contextsArray={[FlowContextName.jobApplicationInterviewEntity]}
          externalContextData={{ jobApplicationInterviewId: row.original.id }}
          prefixDataTestId="interview-actions"
          accessToken={accessToken}
          emptyStateBehavior="enable"
          deferMainContextRequestsUntilClick
          onClick={e => e.stopPropagation()}
        />
      </div>
    ),
    [accessToken]
  )

  // Columns
  const columns = useMemo<ColumnDef<JobApplicationInterview>[]>(
    () => [
      {
        id: 'scheduledDate', // Backend OrderBy uses 'scheduledDate'
        accessorKey: 'scheduledAt', // Data field uses 'scheduledAt'
        header: getTranslationFromI18nKeyAndLabel('recruiting.scheduledDate', 'Scheduled Date'),
        cell: info => {
          const value = info.getValue() as string
          return value ? (
            <div className="gba:text-sm gba:font-medium">{new Date(value).toLocaleString()}</div>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )
        },
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
        id: 'meetingPlace', // Backend OrderBy uses 'meetingPlace'
        accessorKey: 'location', // Data field uses 'location'
        header: getTranslationFromI18nKeyAndLabel('recruiting.location', 'Location'),
        cell: info => {
          const value = info.getValue() as string
          return <div className="gba:text-sm">{value || '-'}</div>
        },
        meta: { type: 'text' as const }
      }
    ],
    []
  )

  return (
    <div
      className="gba:col-span-1 gba:sm:col-span-12 gba:md:col-span-12 gba:lg:col-span-12"
      data-testid="job-application-interviews-view"
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
        <DataTable<JobApplicationInterview>
          data={jobApplicationInterviews}
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
          data-testid="job-application-interviews-list"
        />
      </DataDisplay>
    </div>
  )
}
