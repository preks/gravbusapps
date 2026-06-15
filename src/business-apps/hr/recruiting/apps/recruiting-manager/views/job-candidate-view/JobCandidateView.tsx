import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobCandidates } from '@/common/data/recruiting/hooks/useJobCandidates'
import { useJobCandidate } from '@/common/data/recruiting/hooks/useJobCandidate'
import { useCompany } from '@/common/data/orgchart/hooks/useCompany'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DataDisplay, DataTable, Avatar, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { useDataTablePaginationLabels } from '@/business-apps/hr/core/apps/shared/utils/dataTablePaginationLabels'
import type { ColumnDef, PaginationState, SortingState, ExpandedState, CellContext } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { JobCandidate } from '@/common/data/recruiting/types/jobCandidateTypes'
import type { JobApplication } from '@/common/data/recruiting/types/jobApplicationTypes'
import { GenerateDocumentDialog } from '@/business-apps/core/office/apps/documents/components/GenerateDocumentDialog'
import { DocumentApiService } from '@/business-apps/core/office/apps/documents/services/DocumentApiService'
import { exportToWord } from '@/business-apps/core/office/apps/documents/utils/exportUtils'
import { toast } from 'sonner'

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
const JobCandidateRowActions: React.FC<{
  row: any
  accessToken: string
  onGenerateDocument?: (candidate: JobCandidate) => void
}> = ({ row, accessToken, onGenerateDocument }) => {
  const candidate = row.original as JobCandidate
  const customActions = useMemo(() => {
    if (!onGenerateDocument) return undefined
    return [
      {
        key: 'generate-document',
        label: getTranslationFromI18nKeyAndLabel('recruiting.generateDocument', 'Generate document'),
        onClick: () => onGenerateDocument(candidate)
      }
    ]
  }, [onGenerateDocument, candidate])

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
      customActions={customActions}
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
const createJobPostingLinkCellWrapper = (onPostingClick: (jobPostingId: string) => void) => {
  return (info: CellContext<JobApplication, unknown>) => (
    <JobPostingLinkCell application={info.row.original} onPostingClick={onPostingClick} />
  )
}

const ApplicationDateCellWrapper = (info: CellContext<JobApplication, unknown>) => (
  <ApplicationDateCell value={info.getValue() as string} />
)

const ApplicationStageCellWrapper = (info: CellContext<JobApplication, unknown>) => (
  <ApplicationStageCell value={info.getValue() as string} />
)

const CandidateCellWrapper = (info: CellContext<JobCandidate, unknown>) => (
  <CandidateCell candidate={info.row.original} getInitials={getInitials} />
)

const ApplicationCountCellWrapper = (info: CellContext<JobCandidate, unknown>) => (
  <ApplicationCountCell value={info.getValue() as number} />
)

const CreatedDateCellWrapper = (info: CellContext<JobCandidate, unknown>) => (
  <ApplicationDateCell value={info.getValue() as string} />
)

const JobCandidateRowActionsWrapper: React.FC<{
  row: any
  accessToken: string
  onGenerateDocument?: (candidate: JobCandidate) => void
}> = ({ row, accessToken, onGenerateDocument }) => (
  <JobCandidateRowActions row={row} accessToken={accessToken} onGenerateDocument={onGenerateDocument} />
)

// Factory function to create row actions handler
const createJobCandidateRowActions = (accessToken: string, onGenerateDocument?: (candidate: JobCandidate) => void) => {
  return (row: any) => (
    <JobCandidateRowActionsWrapper row={row} accessToken={accessToken} onGenerateDocument={onGenerateDocument} />
  )
}

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
  const paginationLabels = useDataTablePaginationLabels()
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({})
  const [generateDocOpen, setGenerateDocOpen] = useState(false)
  const [generateDocCandidate, setGenerateDocCandidate] = useState<JobCandidate | null>(null)

  // When "Generate document" is open, load full candidate by ID so placeholders (address, catalogs, job_request, etc.) resolve
  const candidateIdForDoc = generateDocOpen && generateDocCandidate?.id ? generateDocCandidate.id : undefined
  const { jobCandidate: fullCandidateForDoc, loading: fullCandidateLoading } = useJobCandidate(
    context.accessToken,
    candidateIdForDoc,
    'record'
  )

  // Company ID from first application (job candidate → job_application → job_posting → job_request → company)
  // Support both camelCase and snake_case (GraphQL backend may return either)
  const applicationsForCompany =
    (fullCandidateForDoc as Record<string, unknown> | null)?.jobApplications ??
    (fullCandidateForDoc as Record<string, unknown> | null)?.job_applications
  const firstAppForCompany = Array.isArray(applicationsForCompany) ? applicationsForCompany[0] : undefined
  const firstPostingForCompany = firstAppForCompany
    ? ((firstAppForCompany as Record<string, unknown>).jobPosting ??
      (firstAppForCompany as Record<string, unknown>).job_posting)
    : undefined
  const firstJobRequestForCompany = firstPostingForCompany
    ? ((firstPostingForCompany as Record<string, unknown>).jobRequest ??
      (firstPostingForCompany as Record<string, unknown>).job_request)
    : undefined
  const companyIdForDoc =
    (firstJobRequestForCompany as Record<string, unknown> | undefined)?.companyId ??
    (firstJobRequestForCompany as Record<string, unknown> | undefined)?.company_id
  const { company: companyForDoc } = useCompany(context.accessToken, companyIdForDoc as string | undefined, 'record')

  // Build entity map for placeholder resolution from linked data: job_candidate → job_application → job_posting → job_request → company
  // Support both camelCase and snake_case response keys (GraphQL backends may return either)
  const entityDataMapForDoc = useMemo(() => {
    const candidate = fullCandidateForDoc ?? generateDocCandidate ?? {}
    const company = companyForDoc ?? {}
    const addresses =
      companyForDoc?.addresses ??
      (companyForDoc == null ? undefined : (companyForDoc as unknown as Record<string, unknown>).addresses)
    const firstAddress =
      addresses && Array.isArray(addresses) && addresses.length > 0 ? (addresses[0] as Record<string, unknown>) : {}
    const applications =
      (fullCandidateForDoc as Record<string, unknown> | null)?.jobApplications ??
      (fullCandidateForDoc as Record<string, unknown> | null)?.job_applications
    const applicationsList = Array.isArray(applications) ? applications : []
    const firstApplicationWithPosting = applicationsList.find(
      (app: Record<string, unknown>) => app?.jobPosting != null || app?.job_posting != null
    ) as Record<string, unknown> | undefined
    const firstJobPosting = firstApplicationWithPosting
      ? (firstApplicationWithPosting.jobPosting ?? firstApplicationWithPosting.job_posting)
      : undefined
    const firstJobRequest = firstJobPosting?.jobRequest ?? firstJobPosting?.job_request ?? {}
    const firstJobPostingData = firstJobPosting ?? {}
    const firstJobApplicationData = firstApplicationWithPosting ?? {}
    return {
      job_candidate: candidate,
      job_application: firstJobApplicationData,
      job_posting: firstJobPostingData,
      job_request: firstJobRequest,
      company,
      company_address: firstAddress
    } as Record<string, Record<string, unknown>>
  }, [fullCandidateForDoc, generateDocCandidate, companyForDoc])

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

  const onGenerateDocument = useCallback((candidate: JobCandidate) => {
    setGenerateDocCandidate(candidate)
    setGenerateDocOpen(true)
  }, [])

  const rowActionsHandler = useMemo(
    () => createJobCandidateRowActions(context.accessToken, onGenerateDocument),
    [context.accessToken, onGenerateDocument]
  )

  const rowActions = rowActionsHandler

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
          paginationLabels={paginationLabels}
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

      <GenerateDocumentDialog
        open={generateDocOpen}
        onOpenChange={setGenerateDocOpen}
        entityDataMap={entityDataMapForDoc}
        entityDataLoading={candidateIdForDoc != null && fullCandidateLoading}
        defaultTitle={
          `${generateDocCandidate?.firstName ?? ''} ${generateDocCandidate?.lastName ?? ''}`.trim() || 'Candidate'
        }
        onSuccess={async documentId => {
          if (!context.accessToken) return
          DocumentApiService.setAccessToken(context.accessToken)
          try {
            const doc = await DocumentApiService.getDocument(documentId)
            if (doc?.content != null) {
              await exportToWord(doc.title || 'Document', doc.content)
              toast.success('Document downloaded')
            }
          } catch (err) {
            console.error('Failed to download document:', err)
            toast.error('Failed to download document')
          }
        }}
        data-testid="job-candidate-generate-document-dialog"
      />
    </div>
  )
}
