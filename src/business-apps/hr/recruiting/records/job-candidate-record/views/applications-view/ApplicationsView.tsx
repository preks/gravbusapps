import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobApplications } from '@/common/data/recruiting/hooks/useJobApplications'
import { DataDisplay, DataTable, Badge } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { JobApplication } from '@/common/data/recruiting/types/jobApplicationTypes'

interface ApplicationsViewProps extends BusinessAppContextProps {
  jobCandidateId: string
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({ jobCandidateId, accessToken }) => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'applicationDate', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })

  // Fetch applications filtered by this job candidate
  const { jobApplications, total, loading, error } = useJobApplications(
    accessToken,
    {
      search,
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      where: { jobCandidateId: { _eq: jobCandidateId } }, // Filter by candidate
      orderBy: sorting.map(s => ({
        field: s.id,
        direction: s.desc ? ('DESC_NULLS_LAST' as const) : ('ASC_NULLS_LAST' as const)
      }))
    },
    'list'
  )

  // Handle job posting click to navigate to job posting record
  const handleJobPostingClick = useCallback((jobPostingId: string) => {
    const url = buildPlatformUrl('/platform/hr/recruiting/job-posting-record', {
      jobPostingId
    })
    navigateTo(url)
  }, [])

  // Row actions
  const rowActions = useMemo(
    () => (row: any) => (
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
          entityName: row.original.jobPosting?.jobTitle || 'Application'
        }}
        prefixDataTestId="job-application-actions"
        accessToken={accessToken}
        lazyLoad
        onClick={e => e.stopPropagation()}
      />
    ),
    [accessToken]
  )

  // Columns
  const columns = useMemo<ColumnDef<JobApplication>[]>(
    () => [
      {
        id: 'jobPosting',
        accessorFn: row => row.jobPosting?.jobTitle || '-',
        header: getTranslationFromI18nKeyAndLabel('recruiting.jobPosting', 'Job Posting'),
        cell: info => {
          const posting = info.row.original.jobPosting
          return posting?.jobTitle ? (
            <button
              onClick={e => {
                e.stopPropagation()
                if (posting.id) {
                  handleJobPostingClick(posting.id)
                }
              }}
              className="gba:text-sm gba:font-medium gba:text-primary hover:gba:underline gba:cursor-pointer gba:text-left"
              data-testid={`job-posting-link-${posting.id}`}
            >
              {posting.jobTitle}
            </button>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
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
        id: 'currentStage',
        accessorKey: 'currentStage',
        header: getTranslationFromI18nKeyAndLabel('recruiting.currentStage', 'Current Stage'),
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
      }
    ],
    [handleJobPostingClick]
  )

  return (
    <div
      className="gba:col-span-1 gba:sm:col-span-12 gba:md:col-span-12 gba:lg:col-span-12"
      data-testid="job-candidate-applications-view"
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
            'No applications found for this candidate'
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
          data-testid="job-candidate-applications-list"
        />
      </DataDisplay>
    </div>
  )
}
