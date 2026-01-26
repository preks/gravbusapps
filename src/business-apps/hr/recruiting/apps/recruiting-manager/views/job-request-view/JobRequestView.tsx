import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobRequests } from '@/common/data/recruiting/hooks/useJobRequests'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DataDisplay, DataTable, Badge } from '@newwork/nw-design-system'
import type { ColumnDef, PaginationState, SortingState, CellContext } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { JobRequest } from '@/common/data/recruiting/types/jobRequestTypes'
import { getJobRequestTypeLabel, getJobRequestStatusLabel } from '@/common/data/recruiting/types/enums'

export type JobRequestViewProps = BusinessAppContextProps

// Cell Components
const NameCell = (info: CellContext<JobRequest, unknown>) => {
  const jobRequest = info.row.original
  const name = (info.getValue() as string) || '-'
  return (
    <div className="gba:flex gba:flex-col">
      <span className="gba:text-sm gba:font-medium">{name}</span>
      {jobRequest.code && <span className="gba:text-xs gba:text-muted-foreground">{jobRequest.code}</span>}
    </div>
  )
}

const JobRequestTypeCell = (info: CellContext<JobRequest, unknown>) => {
  const value = info.getValue() as string
  return value ? (
    <Badge variant="outline" className="gba:text-xs">
      {getJobRequestTypeLabel(value)}
    </Badge>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

const JobRequestStatusCell = (info: CellContext<JobRequest, unknown>) => {
  const value = info.getValue() as string
  return value ? (
    <Badge variant="secondary" className="gba:text-xs">
      {getJobRequestStatusLabel(value)}
    </Badge>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

const ContractTypeCell = (info: CellContext<JobRequest, unknown>) => {
  const value = info.getValue() as any
  const contractTypeValue = value?.value
  return contractTypeValue ? (
    <span className="gba:text-sm gba:truncate gba:block" title={contractTypeValue}>
      {contractTypeValue}
    </span>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

const ExperienceLevelCell = (info: CellContext<JobRequest, unknown>) => {
  const value = info.getValue() as any
  const experienceLevelValue = value?.value
  return experienceLevelValue ? (
    <span className="gba:text-sm gba:truncate gba:block" title={experienceLevelValue}>
      {experienceLevelValue}
    </span>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

const DateCell = (info: CellContext<JobRequest, unknown>) => {
  const value = info.getValue() as string
  return value ? (
    <div className="gba:text-sm">{new Date(value).toLocaleDateString()}</div>
  ) : (
    <span className="gba:text-sm gba:text-muted-foreground">-</span>
  )
}

// Primary action component
const JobRequestPrimaryAction: React.FC<{ accessToken: string }> = ({ accessToken }) => (
  <AppAction
    variant="create-primary"
    contexts={[
      {
        context: FlowContextName.jobRequestCreate,
        contextData: {}
      }
    ]}
    accessToken={accessToken}
    emptyState="hide"
    data-testid="add-job-request-action"
  >
    {getTranslationFromI18nKeyAndLabel('recruiting.addJobRequest', 'Add Job Request')}
  </AppAction>
)

// Row actions component
const JobRequestRowActions: React.FC<{ row: any; accessToken: string }> = ({ row, accessToken }) => {
  return (
    <AppAction
      data-testid={`job-request-actions-${row.original.id}`}
      variant="table-row"
      contexts={[
        {
          context: FlowContextName.jobRequestEntity,
          contextData: { jobRequestId: row.original.id }
        }
      ]}
      shareContext={{
        entityType: 'jobRequest',
        entityId: row.original.id,
        entityName: row.original.name || row.original.code,
        entityUrl: buildPlatformUrl('/platform/hr/recruiting/job-request-record', {
          jobRequestId: row.original.id
        })
      }}
      prefixDataTestId="job-request-actions"
      accessToken={accessToken}
      lazyLoad
      onClick={e => e.stopPropagation()}
    />
  )
}

// Row actions wrapper component
const JobRequestRowActionsWrapper: React.FC<{ row: any; accessToken: string }> = ({ row, accessToken }) => (
  <JobRequestRowActions row={row} accessToken={accessToken} />
)

export const JobRequestView: React.FC<JobRequestViewProps> = context => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })

  const { jobRequests, total, loading, error, refetch } = useJobRequests(
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

  // Primary action for creating new job request
  const primaryAction = useMemo(
    () => <JobRequestPrimaryAction accessToken={context.accessToken} />,
    [context.accessToken]
  )

  // Row actions
  const rowActions = useMemo(
    () => (row: any) => <JobRequestRowActionsWrapper row={row} accessToken={context.accessToken} />,
    [context.accessToken]
  )

  // Columns
  const columns = useMemo<ColumnDef<JobRequest>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: getTranslationFromI18nKeyAndLabel('recruiting.name', 'Name'),
        cell: NameCell,
        meta: { type: 'text' as const }
      },
      {
        id: 'jobRequestType',
        accessorKey: 'jobRequestType',
        header: getTranslationFromI18nKeyAndLabel('recruiting.requestType', 'Request Type'),
        cell: JobRequestTypeCell,
        meta: { type: 'text' as const }
      },
      {
        id: 'jobRequestStatus',
        accessorKey: 'jobRequestStatus',
        header: getTranslationFromI18nKeyAndLabel('recruiting.status', 'Status'),
        cell: JobRequestStatusCell,
        meta: { type: 'text' as const }
      },
      {
        id: 'contractType',
        accessorKey: 'contractType',
        header: getTranslationFromI18nKeyAndLabel('recruiting.contractType', 'Contract Type'),
        cell: ContractTypeCell,
        meta: { type: 'text' as const }
      },
      {
        id: 'jobExperienceLevel',
        accessorKey: 'jobExperienceLevel',
        header: getTranslationFromI18nKeyAndLabel('recruiting.experienceLevel', 'Experience Level'),
        cell: ExperienceLevelCell,
        meta: { type: 'text' as const }
      },
      {
        id: 'plannedHireDate',
        accessorKey: 'plannedHireDate',
        header: getTranslationFromI18nKeyAndLabel('recruiting.plannedHireDate', 'Planned Hire Date'),
        cell: DateCell,
        meta: { type: 'date' as const }
      },
      {
        id: 'plannedExitDate',
        accessorKey: 'plannedExitDate',
        header: getTranslationFromI18nKeyAndLabel('recruiting.plannedExitDate', 'Planned Exit Date'),
        cell: DateCell,
        meta: { type: 'date' as const }
      }
    ],
    []
  )

  return (
    <div data-testid="job-request-view" className="gba:h-full">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('recruiting.allJobRequests', 'All Job Requests'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('recruiting.searchJobRequests', 'Search job requests...')}
        onSearchChange={setSearch}
        primaryAction={primaryAction}
        toolbarDensity="default"
      >
        <DataTable<JobRequest>
          data={jobRequests}
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
          emptyMessage={getTranslationFromI18nKeyAndLabel('recruiting.noJobRequestsFound', 'No job requests found')}
          actions={rowActions}
          data-testid="job-request-list"
        />
      </DataDisplay>
    </div>
  )
}
