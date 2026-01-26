import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobPostings } from '@/common/data/recruiting/hooks/useJobPostings'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DataDisplay, DataTable, Avatar, AvatarFallback, Badge } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState, ExpandedState, CellContext } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { JobPosting } from '@/common/data/recruiting/types/jobPostingTypes'
import type { JobApplication } from '@/common/data/recruiting/types/jobApplicationTypes'

export type JobPostingViewProps = BusinessAppContextProps

// Cell Components
const ApplicationDateCell: React.FC<{ value: string }> = ({ value }) => {
  return value ? (
    <div className="gba:text-sm">{new Date(value).toLocaleDateString()}</div>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

const ApplicationStageCell: React.FC<{ value: string }> = ({ value }) => {
  return value && value !== '-' ? (
    <Badge variant="secondary" className="gba:text-xs">
      {value}
    </Badge>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

const TitleCell = (info: CellContext<JobPosting, unknown>) => (
  <div className="gba:text-sm gba:font-medium">{(info.getValue() as string) || '-'}</div>
)

const CountCell = (info: CellContext<JobPosting, unknown>) => (
  <div className="gba:text-sm gba:text-center">{(info.getValue() as number) || 0}</div>
)

const CreatedDateCell = (info: CellContext<JobPosting, unknown>) => {
  const value = info.getValue() as string
  if (!value) return <span className="gba:text-sm gba:text-muted-foreground">-</span>
  const date = new Date(value)
  return <div className="gba:text-sm">{date.toLocaleDateString()}</div>
}

// Primary action component
const JobPostingPrimaryAction: React.FC<{ accessToken: string }> = ({ accessToken }) => (
  <AppAction
    variant="create-primary"
    contexts={[
      {
        context: FlowContextName.jobPostingCreate,
        contextData: {}
      }
    ]}
    accessToken={accessToken}
    emptyState="hide"
    data-testid="add-job-posting-action"
  >
    {getTranslationFromI18nKeyAndLabel('recruiting.addJobPosting', 'Add Job Posting')}
  </AppAction>
)

// Row actions component
const JobPostingRowActions: React.FC<{ row: any; accessToken: string }> = ({ row, accessToken }) => {
  return (
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
        entityName: row.original.title || 'Job Posting',
        entityUrl: buildPlatformUrl('/platform/hr/recruiting/job-posting-record', {
          jobPostingId: row.original.id
        })
      }}
      prefixDataTestId="job-posting-actions"
      accessToken={accessToken}
      lazyLoad
      onClick={e => e.stopPropagation()}
    />
  )
}

// Factory function to create row actions handler
const createJobPostingRowActions = (accessToken: string) => {
  return (row: any) => <JobPostingRowActionsWrapper row={row} accessToken={accessToken} />
}

// Helper to get initials
const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0) || ''
  const last = lastName?.charAt(0) || ''
  return (first + last).toUpperCase() || 'A'
}

// Wrapper components for cell renderers
const createCandidateLinkCellWrapper = (
  onCandidateClick: (jobCandidateId: string) => void
): React.FC<{ info: CellContext<JobApplication, unknown> }> => {
  return ({ info }) => (
    <CandidateLinkCell application={info.row.original} onCandidateClick={onCandidateClick} getInitials={getInitials} />
  )
}

const ApplicationDateCellWrapper: React.FC<{ info: CellContext<JobApplication, unknown> }> = ({ info }) => (
  <ApplicationDateCell value={info.getValue() as string} />
)

const ApplicationStageCellWrapper: React.FC<{ info: CellContext<JobApplication, unknown> }> = ({ info }) => (
  <ApplicationStageCell value={info.getValue() as string} />
)

const JobPostingRowActionsWrapper: React.FC<{ row: any; accessToken: string }> = ({ row, accessToken }) => (
  <JobPostingRowActions row={row} accessToken={accessToken} />
)

// Component for candidate link in application table
const CandidateLinkCell: React.FC<{
  application: JobApplication
  onCandidateClick: (jobCandidateId: string) => void
  getInitials: (firstName: string, lastName: string) => string
}> = ({ application, onCandidateClick, getInitials }) => {
  const candidate = application.jobCandidate
  if (!candidate) return <span className="gba:text-sm gba:text-muted-foreground">-</span>

  return (
    <button
      onClick={e => {
        e.stopPropagation()
        if (candidate.id) {
          onCandidateClick(candidate.id)
        }
      }}
      className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer hover:gba:opacity-80 gba:transition-opacity gba:text-left gba:w-full"
      data-testid={`candidate-link-${candidate.id}`}
    >
      <Avatar className="gba:h-8 gba:w-8">
        <AvatarFallback className="gba:text-xs">{getInitials(candidate.firstName, candidate.lastName)}</AvatarFallback>
      </Avatar>
      <div className="gba:flex gba:flex-col">
        <span className="gba:text-sm gba:font-medium gba:text-primary hover:gba:underline">
          {candidate.firstName} {candidate.lastName}
        </span>
        {candidate.code && <span className="gba:text-xs gba:text-muted-foreground">{candidate.code}</span>}
      </div>
    </button>
  )
}

// Component to render expanded row content for applications
const ExpandedApplicationsContent: React.FC<{
  posting: JobPosting
  applicationColumns: ColumnDef<JobApplication>[]
}> = ({ posting, applicationColumns }) => {
  const postingId = posting.id || ''
  const jobApplications = posting.jobApplications || []

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
          data-testid={`applications-table-${postingId}`}
        />
      </div>
    </div>
  )
}

export const JobPostingView: React.FC<JobPostingViewProps> = context => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({})

  const { jobPostings, total, loading, error, refetch } = useJobPostings(
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

  // Handle row click to navigate to job posting record
  const handleRowClick = useCallback((row: JobPosting) => {
    if (!row.id) return
    const url = buildPlatformUrl('/platform/hr/recruiting/job-posting-record', {
      jobPostingId: row.id
    })
    navigateTo(url)
  }, [])

  // Handle candidate click to navigate to candidate record
  const handleCandidateClick = useCallback((jobCandidateId: string) => {
    const url = buildPlatformUrl('/platform/hr/recruiting/job-candidate-record', {
      jobCandidateId
    })
    navigateTo(url)
  }, [])

  // Primary action for creating new job posting
  const primaryAction = useMemo(
    () => <JobPostingPrimaryAction accessToken={context.accessToken} />,
    [context.accessToken]
  )

  const rowActionsHandler = useMemo(() => createJobPostingRowActions(context.accessToken), [context.accessToken])

  const rowActions = rowActionsHandler

  // Application columns for expanded rows
  const CandidateLinkCellWrapperForColumns = useMemo(
    () => createCandidateLinkCellWrapper(handleCandidateClick),
    [handleCandidateClick]
  )

  const applicationColumns = useMemo<ColumnDef<JobApplication>[]>(
    () => [
      {
        id: 'candidate',
        accessorFn: row => {
          const candidate = row.jobCandidate
          if (!candidate) return '-'
          return `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || '-'
        },
        header: getTranslationFromI18nKeyAndLabel('recruiting.candidate', 'Candidate'),
        cell: CandidateLinkCellWrapperForColumns,
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
    []
  )

  // Columns
  const columns = useMemo<ColumnDef<JobPosting>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: getTranslationFromI18nKeyAndLabel('recruiting.title', 'Job Title'),
        cell: TitleCell,
        meta: { type: 'text' as const }
      },
      {
        id: 'applicationCount',
        accessorKey: 'applicationCount',
        header: getTranslationFromI18nKeyAndLabel('recruiting.applications', 'Applications'),
        cell: CountCell,
        meta: { type: 'number' as const }
      },
      {
        id: 'positionCount',
        accessorKey: 'positionCount',
        header: getTranslationFromI18nKeyAndLabel('recruiting.positions', 'Positions'),
        cell: CountCell,
        meta: { type: 'number' as const }
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: getTranslationFromI18nKeyAndLabel('recruiting.postedDate', 'Posted Date'),
        cell: CreatedDateCell,
        meta: { type: 'date' as const }
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
          enableExpansion={true}
          expanded={expandedRows}
          onExpandedChange={handleExpandedChange}
          getRowCanExpand={(row: JobPosting) => (row.applicationCount || 0) > 0}
          renderExpandedRow={row => {
            const posting = row.original
            const postingFromState = jobPostings.find((p: any) => p.id === posting.id)
            return (
              <ExpandedApplicationsContent
                posting={postingFromState || posting}
                applicationColumns={applicationColumns}
              />
            )
          }}
          data-testid="job-posting-list"
        />
      </DataDisplay>
    </div>
  )
}
