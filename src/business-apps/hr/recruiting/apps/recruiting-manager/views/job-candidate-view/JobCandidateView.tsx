import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobCandidates } from '@/common/data/recruiting/hooks/useJobCandidates'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DataDisplay, DataTable, Avatar, AvatarFallback, Badge } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState, ExpandedState, CellContext } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { JobCandidate } from '@/common/data/recruiting/types/jobCandidateTypes'
import type { JobApplication } from '@/common/data/recruiting/types/jobApplicationTypes'

export type JobCandidateViewProps = BusinessAppContextProps

// Component for job posting link in application table
const JobPostingLinkCell: React.FC<{
  application: JobApplication
  onPostingClick: (jobPostingId: string) => void
}> = ({ application, onPostingClick }) => {
  const posting = application.jobPosting
  if (!posting) return <span className="gba:text-sm gba:text-muted-foreground">-</span>

  return (
    <button
      onClick={e => {
        e.stopPropagation()
        if (posting.id) {
          onPostingClick(posting.id)
        }
      }}
      className="gba:text-sm gba:font-medium gba:text-primary hover:gba:underline gba:cursor-pointer gba:text-left"
      data-testid={`posting-link-${posting.id}`}
    >
      {posting.title || '-'}
    </button>
  )
}

// Component for application date cell
const ApplicationDateCell: React.FC<{ value: string }> = ({ value }) => {
  return value ? (
    <div className="gba:text-sm">{new Date(value).toLocaleDateString()}</div>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

// Component for application stage cell
const ApplicationStageCell: React.FC<{ value: string }> = ({ value }) => {
  return value && value !== '-' ? (
    <Badge variant="secondary" className="gba:text-xs">
      {value}
    </Badge>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

// Component for candidate cell
const CandidateCell: React.FC<{
  candidate: JobCandidate
  getInitials: (firstName: string, lastName: string) => string
}> = ({ candidate, getInitials }) => {
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

// Component for application count cell
const ApplicationCountCell: React.FC<{ value: number }> = ({ value }) => {
  return <div className="gba:text-sm gba:text-center">{value || 0}</div>
}

// Primary action component
const JobCandidatePrimaryAction: React.FC<{ accessToken: string }> = ({ accessToken }) => (
  <AppAction
    variant="create-primary"
    contexts={[
      {
        context: FlowContextName.jobCandidateCreate,
        contextData: {}
      }
    ]}
    accessToken={accessToken}
    emptyState="hide"
    data-testid="add-job-candidate-action"
  >
    {getTranslationFromI18nKeyAndLabel('recruiting.addJobCandidate', 'Add Job Candidate')}
  </AppAction>
)

// Row actions component
const JobCandidateRowActions: React.FC<{ row: any; accessToken: string }> = ({ row, accessToken }) => {
  return (
    <AppAction
      data-testid={`job-candidate-actions-${row.original.id}`}
      variant="table-row"
      contexts={[
        {
          context: FlowContextName.jobCandidateEntity,
          contextData: { jobCandidateId: row.original.id }
        }
      ]}
      shareContext={{
        entityType: 'jobCandidate',
        entityId: row.original.id,
        entityName: `${row.original.firstName} ${row.original.lastName}`.trim(),
        entityUrl: buildPlatformUrl('/platform/hr/recruiting/job-candidate-record', {
          jobCandidateId: row.original.id
        })
      }}
      prefixDataTestId="job-candidate-actions"
      accessToken={accessToken}
      lazyLoad
      onClick={e => e.stopPropagation()}
    />
  )
}

// Helper to get initials
const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0) || ''
  const last = lastName?.charAt(0) || ''
  return (first + last).toUpperCase() || 'C'
}

// Factory function to create job posting link cell wrapper
const createJobPostingLinkCellWrapper = (
  onPostingClick: (jobPostingId: string) => void
): React.FC<{ info: CellContext<JobApplication, unknown> }> => {
  return ({ info }) => <JobPostingLinkCell application={info.row.original} onPostingClick={onPostingClick} />
}

const ApplicationDateCellWrapper: React.FC<{ info: CellContext<JobApplication, unknown> }> = ({ info }) => (
  <ApplicationDateCell value={info.getValue() as string} />
)

const ApplicationStageCellWrapper: React.FC<{ info: CellContext<JobApplication, unknown> }> = ({ info }) => (
  <ApplicationStageCell value={info.getValue() as string} />
)

const CandidateCellWrapper: React.FC<{ info: CellContext<JobCandidate, unknown> }> = ({ info }) => (
  <CandidateCell candidate={info.row.original} getInitials={getInitials} />
)

const ApplicationCountCellWrapper: React.FC<{ info: CellContext<JobCandidate, unknown> }> = ({ info }) => (
  <ApplicationCountCell value={info.getValue() as number} />
)

const CreatedDateCellWrapper: React.FC<{ info: CellContext<JobCandidate, unknown> }> = ({ info }) => (
  <ApplicationDateCell value={info.getValue() as string} />
)

const JobCandidateRowActionsWrapper: React.FC<{ row: any; accessToken: string }> = ({ row, accessToken }) => (
  <JobCandidateRowActions row={row} accessToken={accessToken} />
)

// Component to render expanded row content for candidate applications
const ExpandedCandidateApplicationsContent: React.FC<{
  candidate: JobCandidate
  applicationColumns: ColumnDef<JobApplication>[]
}> = ({ candidate, applicationColumns }) => {
  const candidateId = candidate.id || ''
  const jobApplications = candidate.jobApplications || []

  if (jobApplications.length === 0) {
    return (
      <div className="gba:py-4 gba:px-6 gba:bg-muted/30">
        <p className="gba:text-sm gba:text-muted-foreground gba:text-center">
          {getTranslationFromI18nKeyAndLabel('recruiting.noApplicationsFound', 'No applications found')}
        </p>
      </div>
    )
  }

  return (
    <div className="gba:py-4 gba:px-6 gba:bg-muted/30">
      <div className="gba:mb-2">
        <h4 className="gba:text-sm gba:font-medium gba:mb-3">
          {getTranslationFromI18nKeyAndLabel('recruiting.applications', 'Applications')} ({jobApplications.length})
        </h4>
      </div>
      <div className="gba:overflow-x-auto">
        <DataTable<JobApplication>
          data={jobApplications}
          columns={applicationColumns}
          loading={false}
          totalCount={jobApplications.length}
          enablePagination={false}
          enableSorting={false}
          enableSelection={false}
          enableColumnPinning={false}
          enableResizing={false}
          tableLayout="fixed"
          onRowClick={row => {
            if (row.id) {
              const url = buildPlatformUrl('/platform/hr/recruiting/job-application-record', {
                jobApplicationId: row.id
              })
              navigateTo(url)
            }
          }}
          data-testid={`applications-table-${candidateId}`}
        />
      </div>
    </div>
  )
}

export const JobCandidateView: React.FC<JobCandidateViewProps> = context => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({})

  const { jobCandidates, total, loading, error, refetch } = useJobCandidates(
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

  // Handle expanded state change
  const handleExpandedChange = useCallback((expanded: ExpandedState) => {
    setExpandedRows(expanded)
  }, [])

  // Handle row click to navigate to candidate record
  const handleRowClick = useCallback((row: JobCandidate) => {
    if (!row.id) return
    const url = buildPlatformUrl('/platform/hr/recruiting/job-candidate-record', {
      jobCandidateId: row.id
    })
    navigateTo(url)
  }, [])

  // Handle posting click to navigate to posting record
  const handlePostingClick = useCallback((jobPostingId: string) => {
    const url = buildPlatformUrl('/platform/hr/recruiting/job-posting-record', {
      jobPostingId
    })
    navigateTo(url)
  }, [])

  // Primary action for creating new job candidate
  const primaryAction = useMemo(
    () => <JobCandidatePrimaryAction accessToken={context.accessToken} />,
    [context.accessToken]
  )

  const rowActions = useMemo(
    () => (row: any) => <JobCandidateRowActionsWrapper row={row} accessToken={context.accessToken} />,
    [context.accessToken]
  )

  // Application columns for expanded rows
  const JobPostingLinkCellWrapperForColumns = useMemo(
    () => createJobPostingLinkCellWrapper(handlePostingClick),
    [handlePostingClick]
  )

  const applicationColumns = useMemo<ColumnDef<JobApplication>[]>(
    () => [
      {
        id: 'jobPosting',
        accessorFn: row => row.jobPosting?.title || '-',
        header: getTranslationFromI18nKeyAndLabel('recruiting.jobPosting', 'Job Posting'),
        cell: JobPostingLinkCellWrapperForColumns,
        meta: { type: 'text' as const }
      },
      {
        id: 'applicationDate',
        accessorKey: 'applicationDate',
        header: getTranslationFromI18nKeyAndLabel('recruiting.applicationDate', 'Application Date'),
        cell: ApplicationDateCellWrapper,
        meta: { type: 'date' as const }
      },
      {
        id: 'jobApplicationStage',
        accessorFn: row => row.jobApplicationStage?.value || row.jobApplicationStageRef || '-',
        header: getTranslationFromI18nKeyAndLabel('recruiting.jobApplicationStage', 'Current Stage'),
        cell: ApplicationStageCellWrapper,
        meta: { type: 'text' as const }
      }
    ],
    [JobPostingLinkCellWrapperForColumns]
  )

  // Columns
  const columns = useMemo<ColumnDef<JobCandidate>[]>(
    () => [
      {
        id: 'candidate',
        accessorFn: row => `${row.firstName} ${row.lastName}`,
        header: getTranslationFromI18nKeyAndLabel('recruiting.candidate', 'Candidate'),
        cell: CandidateCellWrapper,
        meta: { type: 'text' as const }
      },
      {
        id: 'applicationCount',
        accessorKey: 'applicationCount',
        header: getTranslationFromI18nKeyAndLabel('recruiting.applications', 'Applications'),
        cell: ApplicationCountCellWrapper,
        meta: { type: 'number' as const }
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: getTranslationFromI18nKeyAndLabel('recruiting.createdAt', 'Created'),
        cell: CreatedDateCellWrapper,
        meta: { type: 'date' as const }
      }
    ],
    []
  )

  return (
    <div data-testid="job-candidate-view" className="gba:h-full">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('recruiting.allJobCandidates', 'All Job Candidates'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          'recruiting.searchJobCandidates',
          'Search job candidates...'
        )}
        onSearchChange={setSearch}
        primaryAction={primaryAction}
        toolbarDensity="default"
      >
        <DataTable<JobCandidate>
          data={jobCandidates}
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
          emptyMessage={getTranslationFromI18nKeyAndLabel('recruiting.noJobCandidatesFound', 'No job candidates found')}
          actions={rowActions}
          onRowClick={handleRowClick}
          enableExpansion={true}
          expanded={expandedRows}
          onExpandedChange={handleExpandedChange}
          getRowCanExpand={(row: JobCandidate) => (row.applicationCount || 0) > 0}
          renderExpandedRow={row => {
            const candidate = row.original
            const candidateFromState = jobCandidates.find((c: any) => c.id === candidate.id)
            return (
              <ExpandedCandidateApplicationsContent
                candidate={candidateFromState || candidate}
                applicationColumns={applicationColumns}
              />
            )
          }}
          data-testid="job-candidate-list"
        />
      </DataDisplay>
    </div>
  )
}
