import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobApplications } from '@/common/data/recruiting/hooks/useJobApplications'
import { DataDisplay, DataTable, Badge, Avatar, AvatarFallback } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { JobApplication } from '@/common/data/recruiting/types/jobApplicationTypes'

export type JobApplicationViewProps = BusinessAppContextProps

export const JobApplicationView: React.FC<JobApplicationViewProps> = context => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'applicationDate', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })

  const { jobApplications, total, loading, error } = useJobApplications(
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

  // Helper to get initials
  const getInitials = (firstName: string, lastName: string): string => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'A'
  }

  // Row actions
  const rowActions = useMemo(
    () => (row: any) => (
      <div className="gba:flex gba:justify-start gba:gap-2">
        <AppActionButton
          data-testid={`job-application-update-button-${row.original.id}`}
          size="icon"
          contextsArray={[]}
          externalContextData={{ jobApplicationId: row.original.id }}
          prefixDataTestId="job-application-update"
          accessToken={context.accessToken}
          emptyStateBehavior="enable"
          deferMainContextRequestsUntilClick
          onClick={e => e.stopPropagation()}
        />
      </div>
    ),
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
        cell: info => {
          const application = info.row.original
          const candidate = application.jobCandidate
          if (!candidate) return <span className="gba:text-sm gba:text-muted-foreground">-</span>

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
                {candidate.code && <span className="gba:text-xs gba:text-muted-foreground">{candidate.code}</span>}
              </div>
            </div>
          )
        },
        meta: { type: 'text' as const }
      },
      {
        id: 'jobPosting',
        accessorFn: row => row.jobPosting?.jobTitle || '-',
        header: getTranslationFromI18nKeyAndLabel('recruiting.jobPosting', 'Job Posting'),
        cell: info => {
          const posting = info.row.original.jobPosting
          return posting?.jobTitle ? (
            <div className="gba:text-sm gba:font-medium">{posting.jobTitle}</div>
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
