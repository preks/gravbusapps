import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobApplications } from '@/common/data/recruiting/hooks/useJobApplications'
import { DataDisplay, DataTable, Badge, Avatar, AvatarFallback } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState, CellContext } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { JobApplication } from '@/common/data/recruiting/types/jobApplicationTypes'

interface ApplicationsViewProps extends BusinessAppContextProps {
  jobPostingId: string
}

// Helper function to get initials
const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0) || ''
  const last = lastName?.charAt(0) || ''
  return (first + last).toUpperCase() || 'A'
}

// Cell Components
const CandidateLinkCell: React.FC<{
  info: CellContext<JobApplication, unknown>
  onCandidateClick: (jobCandidateId: string) => void
}> = ({ info, onCandidateClick }) => {
  const application = info.row.original
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

const ApplicationStageCell: React.FC<{ info: CellContext<JobApplication, unknown> }> = ({ info }) => {
  const value = info.getValue() as string
  return value ? (
    <Badge variant="secondary" className="gba:text-xs">
      {value}
    </Badge>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

const ApplicationDateCellWrapper: React.FC<{ info: CellContext<JobApplication, unknown> }> = ({ info }) => {
  const value = info.getValue() as string
  return value ? (
    <div className="gba:text-sm">{new Date(value).toLocaleDateString()}</div>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

// Wrapper component for CandidateLinkCell
const CandidateLinkCellWrapper: React.FC<{
  info: CellContext<JobApplication, unknown>
  onCandidateClick: (jobCandidateId: string) => void
}> = ({ info, onCandidateClick }) => <CandidateLinkCell info={info} onCandidateClick={onCandidateClick} />

// Row actions wrapper component
const JobApplicationRowActionsWrapper: React.FC<{ row: any; accessToken: string }> = ({ row, accessToken }) => (
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
        : 'Application'
    }}
    prefixDataTestId="job-application-actions"
    accessToken={accessToken}
    lazyLoad
    onClick={e => e.stopPropagation()}
  />
)

// Factory function to create row actions handler
const createJobApplicationRowActions = (accessToken: string) => {
  return (row: any) => <JobApplicationRowActionsWrapper row={row} accessToken={accessToken} />
}

// Factory function to create candidate link cell wrapper
const createCandidateLinkCellWrapper = (onCandidateClick: (jobCandidateId: string) => void) => {
  return (info: CellContext<JobApplication, unknown>) => (
    <CandidateLinkCellWrapper info={info} onCandidateClick={onCandidateClick} />
  )
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({ jobPostingId, accessToken }) => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'applicationDate', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })

  // Fetch applications filtered by this job posting
  const { jobApplications, total, loading, error } = useJobApplications(
    accessToken,
    {
      search,
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      where: { jobPostingId: { _eq: jobPostingId } }, // Filter by job posting
      orderBy: sorting.map(s => ({
        field: s.id,
        direction: s.desc ? ('DESC_NULLS_LAST' as const) : ('ASC_NULLS_LAST' as const)
      }))
    },
    'list'
  )

  // Handle candidate click to navigate to candidate record
  const handleCandidateClick = useCallback((jobCandidateId: string) => {
    const url = buildPlatformUrl('/platform/hr/recruiting/job-candidate-record', {
      jobCandidateId
    })
    navigateTo(url)
  }, [])

  // Row actions
  const rowActionsHandler = useMemo(() => createJobApplicationRowActions(accessToken), [accessToken])

  const rowActions = rowActionsHandler

  // Candidate link cell wrapper
  const CandidateLinkCellWrapperForColumns = useMemo(
    () => createCandidateLinkCellWrapper(handleCandidateClick),
    [handleCandidateClick]
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
        cell: ApplicationStageCell,
        meta: { type: 'text' as const }
      }
    ],
    [handleCandidateClick]
  )

  return (
    <div
      className="gba:col-span-1 gba:sm:col-span-12 gba:md:col-span-12 gba:lg:col-span-12"
      data-testid="job-posting-applications-view"
    >
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('recruiting.applications', 'Applications'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('recruiting.searchApplications', 'Search applications...')}
        onSearchChange={setSearch}
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
            'recruiting.noApplicationsFound',
            'No applications found for this job posting'
          )}
          actions={rowActions}
          onRowClick={row => {
            if (row.id) {
              const url = buildPlatformUrl('/platform/hr/recruiting/job-application-record', {
                jobApplicationId: row.id
              })
              navigateTo(url)
            }
          }}
          data-testid="job-posting-applications-list"
        />
      </DataDisplay>
    </div>
  )
}
