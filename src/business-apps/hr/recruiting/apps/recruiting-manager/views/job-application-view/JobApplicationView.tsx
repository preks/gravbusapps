import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobApplications } from '@/common/data/recruiting/hooks/useJobApplications'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DataDisplay, DataTable, Badge, Avatar, AvatarFallback } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState, CellContext } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { JobApplication } from '@/common/data/recruiting/types/jobApplicationTypes'

export type JobApplicationViewProps = BusinessAppContextProps

// Cell Components
const CandidateCell: React.FC<{
  info: CellContext<JobApplication, unknown>
  getInitials: (firstName: string, lastName: string) => string
}> = ({ info, getInitials }) => {
  const application = info.row.original
  const candidate = application.jobCandidate
  if (!candidate) return <span className="gba:text-sm gba:text-muted-foreground">-</span>

  return (
    <div className="gba:flex gba:items-center gba:gap-3">
      <Avatar className="gba:h-8 gba:w-8">
        <AvatarFallback className="gba:text-xs">{getInitials(candidate.firstName, candidate.lastName)}</AvatarFallback>
      </Avatar>
      <div className="gba:flex gba:flex-col">
        <span className="gba:text-sm gba:font-medium">
          {candidate.firstName} {candidate.lastName}
        </span>
        {candidate.code && <span className="gba:text-xs gba:text-muted-foreground">{candidate.code}</span>}
      </div>
    </div>
  )
}

const JobPostingCell: React.FC<{ info: CellContext<JobApplication, unknown> }> = ({ info }) => {
  const posting = info.row.original.jobPosting
  return posting?.title ? (
    <div className="gba:text-sm gba:font-medium">{posting.title}</div>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

const ApplicationDateCell: React.FC<{ info: CellContext<JobApplication, unknown> }> = ({ info }) => {
  const value = info.getValue() as string
  return value ? (
    <div className="gba:text-sm">{new Date(value).toLocaleDateString()}</div>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

const JobApplicationStageCell: React.FC<{ info: CellContext<JobApplication, unknown> }> = ({ info }) => {
  const value = info.getValue() as string
  return value ? (
    <Badge variant="secondary" className="gba:text-xs">
      {value}
    </Badge>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

// Helper to get initials
const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0) || ''
  const last = lastName?.charAt(0) || ''
  return (first + last).toUpperCase() || 'A'
}

// Candidate cell wrapper component
const CandidateCellWrapper: React.FC<{ info: CellContext<JobApplication, unknown> }> = ({ info }) => (
  <CandidateCell info={info} getInitials={getInitials} />
)

// Primary action component
const JobApplicationPrimaryAction: React.FC<{ accessToken: string }> = ({ accessToken }) => (
  <AppAction
    variant="create-primary"
    contexts={[
      {
        context: FlowContextName.jobApplicationCreate,
        contextData: {}
      }
    ]}
    accessToken={accessToken}
    emptyState="hide"
    data-testid="add-job-application-action"
  >
    {getTranslationFromI18nKeyAndLabel('recruiting.addJobApplication', 'Add Job Application')}
  </AppAction>
)

// Row actions component
const JobApplicationRowActions: React.FC<{ row: any; accessToken: string }> = ({ row, accessToken }) => {
  return (
    <AppAction
      data-testid={`job-application-actions-${row.original.id}`}
      variant="table-row"
      contexts={[
        {
          context: FlowContextName.jobApplicationEntity,
          contextData: { jobApplicationId: row.original.id }
        }
      ]}
      shareContext={{
        entityType: 'jobApplication',
        entityId: row.original.id,
        entityName: row.original.jobCandidate
          ? `${row.original.jobCandidate.firstName} ${row.original.jobCandidate.lastName}`.trim()
          : 'Application',
        entityUrl: buildPlatformUrl('/platform/hr/recruiting/job-application-record', {
          jobApplicationId: row.original.id
        })
      }}
      prefixDataTestId="job-application-actions"
      accessToken={accessToken}
      lazyLoad
      onClick={e => e.stopPropagation()}
    />
  )
}

// Row actions wrapper component
const JobApplicationRowActionsWrapper: React.FC<{ row: any; accessToken: string }> = ({ row, accessToken }) => (
  <JobApplicationRowActions row={row} accessToken={accessToken} />
)

export const JobApplicationView: React.FC<JobApplicationViewProps> = context => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'applicationDate', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })

  const { jobApplications, total, loading, error, refetch } = useJobApplications(
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

  useProcessCompletion({
    onSuccess: () => {
      refetch()
    }
  })

  // Primary action for creating new job application
  const primaryAction = useMemo(
    () => <JobApplicationPrimaryAction accessToken={context.accessToken} />,
    [context.accessToken]
  )

  // Row actions
  const rowActions = useMemo(
    () => (row: any) => <JobApplicationRowActionsWrapper row={row} accessToken={context.accessToken} />,
    [context.accessToken]
  )

  // Columns
  const columns = useMemo<ColumnDef<JobApplication>[]>(
    () => [
      {
        id: 'candidate',
        accessorFn: row => {
          const candidate = row.jobCandidate
          if (!candidate) return '-'
          return `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || '-'
        },
        header: getTranslationFromI18nKeyAndLabel('recruiting.candidate', 'Candidate'),
        cell: CandidateCellWrapper,
        meta: { type: 'text' as const }
      },
      {
        id: 'jobPosting',
        accessorFn: row => row.jobPosting?.title || '-',
        header: getTranslationFromI18nKeyAndLabel('recruiting.jobPosting', 'Job Posting'),
        cell: JobPostingCell,
        meta: { type: 'text' as const }
      },
      {
        id: 'applicationDate',
        accessorKey: 'applicationDate',
        header: getTranslationFromI18nKeyAndLabel('recruiting.applicationDate', 'Application Date'),
        cell: ApplicationDateCell,
        meta: { type: 'date' as const }
      },
      {
        id: 'jobApplicationStage',
        accessorFn: row => row.jobApplicationStage?.value || row.jobApplicationStageRef || '-',
        header: getTranslationFromI18nKeyAndLabel('recruiting.jobApplicationStage', 'Current Stage'),
        cell: JobApplicationStageCell,
        meta: { type: 'text' as const }
      }
    ],
    []
  )

  return (
    <div data-testid="job-application-view" className="gba:h-full">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('recruiting.allJobApplications', 'All Job Applications'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          'recruiting.searchJobApplications',
          'Search job applications...'
        )}
        onSearchChange={setSearch}
        primaryAction={primaryAction}
        toolbarDensity="default"
      >
        <DataTable<JobApplication>
          data={jobApplications}
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
            'recruiting.noJobApplicationsFound',
            'No job applications found'
          )}
          actions={rowActions}
          data-testid="job-application-list"
        />
      </DataDisplay>
    </div>
  )
}
