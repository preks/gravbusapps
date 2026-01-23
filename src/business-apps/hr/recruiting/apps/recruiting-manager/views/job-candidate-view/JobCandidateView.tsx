import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobCandidates } from '@/common/data/recruiting/hooks/useJobCandidates'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DataDisplay, DataTable, Avatar, AvatarFallback, Badge } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState, ExpandedState } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { JobCandidate } from '@/common/data/recruiting/types/jobCandidateTypes'
import type { JobApplication } from '@/common/data/recruiting/types/jobApplicationTypes'

export type JobCandidateViewProps = BusinessAppContextProps

// Component to render expanded row content for candidate applications
const ExpandedCandidateApplicationsContent: React.FC<{
  candidate: JobCandidate
  accessToken: string
  applicationColumns: ColumnDef<JobApplication>[]
}> = ({ candidate, applicationColumns }) => {
  const candidateId = candidate.id || ''
  const jobApplications = candidate.jobApplications || []

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'JobCandidateView.tsx:24',
      message: 'ExpandedCandidateApplicationsContent received candidate',
      data: {
        candidateId,
        hasJobApplications: !!candidate.jobApplications,
        jobApplicationsLength: jobApplications.length,
        jobApplicationsType: typeof candidate.jobApplications,
        candidateKeys: Object.keys(candidate)
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

  // Helper to get initials
  const getInitials = (firstName: string, lastName: string): string => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'C'
  }

  // Handle expanded state change
  const handleExpandedChange = useCallback((expanded: ExpandedState) => {
    // #region agent log
    const expandedKeys = Object.keys(expanded)
    fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'JobCandidateView.tsx:123',
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
    () => (
      <AppAction
        variant="create-primary"
        contexts={[
          {
            context: FlowContextName.jobCandidateCreate,
            contextData: {}
          }
        ]}
        accessToken={context.accessToken}
        emptyState="hide"
        data-testid="add-job-candidate-action"
      >
        {getTranslationFromI18nKeyAndLabel('recruiting.addJobCandidate', 'Add Job Candidate')}
      </AppAction>
    ),
    [context.accessToken]
  )

  // Row actions
  const rowActions = useMemo(
    () => (row: any) => (
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
          entityName: `${row.original.firstName} ${row.original.lastName}`.trim()
        }}
        prefixDataTestId="job-candidate-actions"
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
        id: 'jobPosting',
        accessorFn: row => row.jobPosting?.title || '-',
        header: getTranslationFromI18nKeyAndLabel('recruiting.jobPosting', 'Job Posting'),
        cell: info => {
          const application = info.row.original
          const posting = application.jobPosting
          if (!posting) return <span className="gba:text-sm gba:text-muted-foreground">-</span>

          return (
            <button
              onClick={e => {
                e.stopPropagation()
                if (posting.id) {
                  handlePostingClick(posting.id)
                }
              }}
              className="gba:text-sm gba:font-medium gba:text-primary hover:gba:underline gba:cursor-pointer gba:text-left"
              data-testid={`posting-link-${posting.id}`}
            >
              {posting.title || '-'}
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
    [handlePostingClick]
  )

  // Columns
  const columns = useMemo<ColumnDef<JobCandidate>[]>(
    () => [
      {
        id: 'candidate',
        accessorFn: row => `${row.firstName} ${row.lastName}`,
        header: getTranslationFromI18nKeyAndLabel('recruiting.candidate', 'Candidate'),
        cell: info => {
          const candidate = info.row.original
          return (
            <div className="gba:flex gba:items-center gba:gap-3">
              <Avatar className="gba:h-8 gba:w-8">
                <AvatarFallback className="gba:text-xs">
                  {getInitials(candidate.firstName, candidate.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="gba:flex gba:flex-col">
                <span className="gba:text-sm gba:font-medium">
                  {candidate.firstName} {candidate.lastName}
                </span>
              </div>
            </div>
          )
        },
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
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: getTranslationFromI18nKeyAndLabel('recruiting.createdAt', 'Created'),
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
            // #region agent log
            const candidate = row.original
            const allCandidates = jobCandidates
            const candidateFromState = allCandidates.find((c: any) => c.id === candidate.id)
            fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: 'JobCandidateView.tsx:373',
                message: 'Rendering expanded row',
                data: {
                  candidateId: candidate.id,
                  rowOriginalHasJobApplications: !!candidate.jobApplications,
                  rowOriginalJobApplicationsLength: candidate.jobApplications?.length || 0,
                  rowOriginalKeys: Object.keys(candidate),
                  candidateFromStateId: candidateFromState?.id,
                  candidateFromStateHasJobApplications: !!candidateFromState?.jobApplications,
                  candidateFromStateJobApplicationsLength: candidateFromState?.jobApplications?.length || 0,
                  applicationCount: candidate.applicationCount
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'B'
              })
            }).catch(() => {})
            // #endregion
            return (
              <ExpandedCandidateApplicationsContent
                candidate={candidateFromState || candidate}
                accessToken={context.accessToken}
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
