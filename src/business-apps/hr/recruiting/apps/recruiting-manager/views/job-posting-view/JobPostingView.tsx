import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobPostings } from '@/common/data/recruiting/hooks/useJobPostings'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DataDisplay, DataTable, Avatar, AvatarFallback, Badge } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState, ExpandedState } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { JobPosting } from '@/common/data/recruiting/types/jobPostingTypes'
import type { JobApplication } from '@/common/data/recruiting/types/jobApplicationTypes'

export type JobPostingViewProps = BusinessAppContextProps

// Component to render expanded row content for applications
const ExpandedApplicationsContent: React.FC<{
  posting: JobPosting
  accessToken: string
  applicationColumns: ColumnDef<JobApplication>[]
}> = ({ posting, applicationColumns }) => {
  const postingId = posting.id || ''
  const jobApplications = posting.jobApplications || []

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'JobPostingView.tsx:24',
      message: 'ExpandedApplicationsContent received posting',
      data: {
        postingId,
        hasJobApplications: !!posting.jobApplications,
        jobApplicationsLength: jobApplications.length,
        jobApplicationsType: typeof posting.jobApplications,
        postingKeys: Object.keys(posting)
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'C'
    })
  }).catch(() => {})
  // #endregion

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
    // #region agent log
    const expandedKeys = Object.keys(expanded)
    fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'JobPostingView.tsx:104',
        message: 'Expanded state changed',
        data: { expandedKeys, expandedCount: expandedKeys.length },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B'
      })
    }).catch(() => {})
    // #endregion
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

  // Helper to get initials
  const getInitials = (firstName: string, lastName: string): string => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'A'
  }

  // Handle candidate click to navigate to candidate record
  const handleCandidateClick = useCallback((jobCandidateId: string) => {
    const url = buildPlatformUrl('/platform/hr/recruiting/job-candidate-record', {
      jobCandidateId
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

  // Application columns for expanded rows
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
        cell: info => {
          const application = info.row.original
          const candidate = application.jobCandidate
          if (!candidate) return <span className="gba:text-sm gba:text-muted-foreground">-</span>

          return (
            <button
              onClick={e => {
                e.stopPropagation()
                if (candidate.id) {
                  handleCandidateClick(candidate.id)
                }
              }}
              className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer hover:gba:opacity-80 gba:transition-opacity gba:text-left gba:w-full"
              data-testid={`candidate-link-${candidate.id}`}
            >
              <Avatar className="gba:h-8 gba:w-8">
                <AvatarFallback className="gba:text-xs">
                  {getInitials(candidate.firstName, candidate.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="gba:flex gba:flex-col">
                <span className="gba:text-sm gba:font-medium gba:text-primary hover:gba:underline">
                  {candidate.firstName} {candidate.lastName}
                </span>
                {candidate.code && <span className="gba:text-xs gba:text-muted-foreground">{candidate.code}</span>}
              </div>
            </button>
          )
        },
        meta: { type: 'text' as const }
      },
      {
        id: 'applicationDate',
        accessorKey: 'applicationDate',
        header: getTranslationFromI18nKeyAndLabel('recruiting.applicationDate', 'Application Date'),
        cell: info => {
          const value = info.getValue() as string
          return value ? (
            <div className="gba:text-sm">{new Date(value).toLocaleDateString()}</div>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )
        },
        meta: { type: 'date' as const }
      },
      {
        id: 'jobApplicationStage',
        accessorFn: row => row.jobApplicationStage?.value || row.jobApplicationStageRef || '-',
        header: getTranslationFromI18nKeyAndLabel('recruiting.jobApplicationStage', 'Current Stage'),
        cell: info => {
          const value = info.getValue() as string
          return value && value !== '-' ? (
            <Badge variant="secondary" className="gba:text-xs">
              {value}
            </Badge>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )
        },
        meta: { type: 'text' as const }
      }
    ],
    [handleCandidateClick]
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
        id: 'applicationCount',
        accessorKey: 'applicationCount',
        header: getTranslationFromI18nKeyAndLabel('recruiting.applications', 'Applications'),
        cell: info => <div className="gba:text-sm gba:text-center">{(info.getValue() as number) || 0}</div>,
        meta: { type: 'number' as const }
      },
      {
        id: 'positionCount',
        accessorKey: 'positionCount',
        header: getTranslationFromI18nKeyAndLabel('recruiting.positions', 'Positions'),
        cell: info => <div className="gba:text-sm gba:text-center">{(info.getValue() as number) || 0}</div>,
        meta: { type: 'number' as const }
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: getTranslationFromI18nKeyAndLabel('recruiting.postedDate', 'Posted Date'),
        cell: info => {
          const value = info.getValue() as string
          if (!value) return <span className="gba:text-sm gba:text-muted-foreground">-</span>
          const date = new Date(value)
          return <div className="gba:text-sm">{date.toLocaleDateString()}</div>
        },
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
            // #region agent log
            const posting = row.original
            const allPostings = jobPostings
            const postingFromState = allPostings.find((p: any) => p.id === posting.id)
            fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: 'JobPostingView.tsx:380',
                message: 'Rendering expanded row',
                data: {
                  postingId: posting.id,
                  rowOriginalHasJobApplications: !!posting.jobApplications,
                  rowOriginalJobApplicationsLength: posting.jobApplications?.length || 0,
                  rowOriginalKeys: Object.keys(posting),
                  postingFromStateId: postingFromState?.id,
                  postingFromStateHasJobApplications: !!postingFromState?.jobApplications,
                  postingFromStateJobApplicationsLength: postingFromState?.jobApplications?.length || 0,
                  applicationCount: posting.applicationCount
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'B'
              })
            }).catch(() => {})
            // #endregion
            return (
              <ExpandedApplicationsContent
                posting={postingFromState || posting}
                accessToken={context.accessToken}
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
