import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Spinner,
  Button,
  RecordLayout,
  Badge,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
  IconAvatar,
  HeaderSlot
} from '@newwork/nw-design-system'
import { UsersIcon, FolderIcon, AddressBookIcon, FlagIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { buildIrmRelatedEntityRecordUrl } from '@/common/utils/relatedEntityRecordUrls'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { StatusProgression } from './components/StatusProgression'
import { useInvestmentLead } from '@/common/data/investment/hooks/useInvestmentLead'
import { buildLeadStatusesQuery } from '@/common/data/relations/queries/leadQueries'
import {
  useGetInvestmentActivitiesByLeadId,
  useGetInvestmentNotesByLeadId,
  useGetInvestmentTasksByLeadId
} from '@/common/data/investment/hooks/useInvestmentLeads'
import { LeadDocuments } from './components/LeadDocuments'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import InvestmentSection from '@/common/components/common-relations/record-sections/investment-section/InvestmentSection'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import {
  buildInvestmentAccountFromLead,
  buildInvestmentContactFromLead,
  buildInvestmentFromLead
} from './utils/leadDataTransformers'
import { buildFormFieldsFromCatalogData } from '../utils/investmentFieldsBuilder'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import { RecordSectionsRefreshProvider } from '@/common/components/common-relations/record-sections/RecordSectionsRefreshContext'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import { TASK_TYPE, TASK_PRIORITY, ACTIVITY_TYPE } from '@/common/data/investment/constants/investmentCatalogs'
import {
  APPROVAL_TASK_TYPE_REF,
  FILE_CONTEXT,
  APP_NAME,
  getFileEntityFromType
} from '@/common/data/investment/constants/investmentConstants'
import { getReferenceEntityType } from '@/common/data/investment/utils/referenceEntityUtils'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { buildInvestmentTaskPayload } from '@/common/data/investment/types/investmentTaskTypes'
import { buildInvestmentActivityPayload } from '@/common/data/investment/types/investmentActivityTypes'
import { buildInvestmentNotePayload } from '@/common/data/investment/types/investmentNoteTypes'
import { AiActions } from '@/common/components/common-relations/record-sections/header-section/ai-actions'
import { useAiSummary } from './hooks/useAiSummary'
import { AppAction } from '@/components/app-action'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { useProspectRejectionReasons } from '@/common/data/investment/hooks/useProspectRejectionReasons'
import type { RejectionReason } from '@/common/data/investment/types/rejectionReasonTypes'

interface LeadRecordContentProps extends BusinessAppContextProps {
  leadId: string
  onBack: () => void
  fromEntity?: string
}

const InvestmentLeadRecordContent: React.FC<LeadRecordContentProps> = ({ leadId, onBack, fromEntity, ...props }) => {
  const ALLOWED_TABS = ['overview', 'documents'] as const
  type LeadRecordTab = (typeof ALLOWED_TABS)[number]

  const getValidTab = (value: string | null): LeadRecordTab =>
    (ALLOWED_TABS as readonly string[]).includes(value ?? '') ? (value as LeadRecordTab) : 'overview'

  const [activeTab, setActiveTab] = useState<LeadRecordTab>(() => {
    if (typeof window === 'undefined') return 'overview'
    return getValidTab(new URLSearchParams(window.location.search).get('tab'))
  })

  // Use new declarative hook for lead data with additional leadStatuses query
  const additionalQueries = useMemo(
    () => [
      {
        query: buildLeadStatusesQuery('InvestmentLeadStatus'),
        data: (result: any) => result.leadStatuses || [],
        key: 'leadStatuses' as const
      }
    ],
    []
  )

  const {
    lead: leadData,
    leadStatuses,
    loading,
    error,
    refetch
  } = useInvestmentLead(props.accessToken, leadId, {
    additionalQueries
  })

  const docuSignEnabled = useFeature<boolean>(Feature.IRM.DocuSign.Key) === true
  const fileClient = useFileClient({ accessToken: props.accessToken, userInfo: props.userInfo })
  const taskPreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo: props.userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.TASK,
      appName: APP_NAME,
      entityId: leadId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [props.userInfo, fileClient, leadId]
  )
  const activityPreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo: props.userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.ACTIVITY,
      appName: APP_NAME,
      entityId: leadId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [props.userInfo, fileClient, leadId]
  )
  const notePreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo: props.userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.NOTE,
      appName: APP_NAME,
      entityId: leadId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: false
    }),
    [props.userInfo, fileClient, leadId]
  )

  // Always call useAiSummary hook, but conditionally use its result
  const aiSummary = useAiSummary(leadId, props.accessToken, leadData)

  // Use leadData for lead reference (for compatibility)
  const lead = leadData

  // Data fetching hooks for sections
  const { fetchInvestmentActivitiesByLeadId } = useGetInvestmentActivitiesByLeadId(props)
  const { fetchInvestmentNotesByLeadId } = useGetInvestmentNotesByLeadId(props)
  const { fetchInvestmentTasksByLeadId } = useGetInvestmentTasksByLeadId(props)

  // State for section data
  const [activities, setActivities] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsError, setSectionsError] = useState<string | null>(null)

  // State for rejection reasons
  const [rejectionReasons, setRejectionReasons] = useState<RejectionReason[]>([])
  const [rejectionReasonsError, setRejectionReasonsError] = useState<string | null>(null)
  const { fetchByLead } = useProspectRejectionReasons(props)

  // Build reference URLs for IRM context
  const buildReferenceUrl = (reference: TaskReference): string => {
    switch (reference.type) {
      case 'lead':
        return buildPlatformUrl('/platform/irm/lead-record', { leadId: reference.id })
      case 'account':
        return buildPlatformUrl('/platform/irm/account-record', { accountId: reference.id })
      case 'contact':
        return buildPlatformUrl('/platform/irm/contact-record', { contactId: reference.id })
      case 'opportunity':
        return buildPlatformUrl('/platform/irm/opportunity-record', { opportunityId: reference.id })
      case 'investment':
        return buildPlatformUrl('/platform/irm/investment-record', { investmentId: reference.id })
      default:
        return ''
    }
  }

  // Load section data
  const loadSectionData = useCallback(
    async (silent = false) => {
      if (!leadId || !props.accessToken) return

      if (!silent) {
        setSectionsLoading(true)
        setSectionsError(null)
      }

      try {
        const [activitiesData, notesData, tasksData] = await Promise.all([
          fetchInvestmentActivitiesByLeadId(leadId),
          fetchInvestmentNotesByLeadId(leadId),
          fetchInvestmentTasksByLeadId(leadId)
        ])

        // Sort notes and tasks by creation date (newest first). Activity order is applied in ActivitySection.
        const sortedNotes = (notesData || []).sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        const sortedTasks = (tasksData || []).sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        // Separate tasks from approvals based on taskType catalog entry
        const regularTasks = sortedTasks.filter((task: any) => {
          const taskTypeCode = task?.taskType?.code || ''
          const taskTypeValue = task?.taskType?.value || ''
          return taskTypeCode?.toUpperCase() !== 'APPROVAL' && taskTypeValue?.toUpperCase() !== 'APPROVAL'
        })
        const approvalTasks = sortedTasks.filter((task: any) => {
          const taskTypeCode = task?.taskType?.code || ''
          const taskTypeValue = task?.taskType?.value || ''
          return taskTypeCode?.toUpperCase() === 'APPROVAL' || taskTypeValue?.toUpperCase() === 'APPROVAL'
        })

        setActivities(activitiesData || [])
        setNotes(sortedNotes)
        setTasks(regularTasks)
        setApprovals(approvalTasks)
      } catch (error) {
        console.error('Error loading section data:', error)
        if (!silent) {
          setSectionsError(
            error instanceof Error
              ? error.message
              : getTranslationFromI18nKeyAndLabel('common.loadFailed', 'Failed to load data')
          )
        }
      } finally {
        if (!silent) {
          setSectionsLoading(false)
        }
      }
    },
    [
      leadId,
      props.accessToken,
      fetchInvestmentActivitiesByLeadId,
      fetchInvestmentNotesByLeadId,
      fetchInvestmentTasksByLeadId
    ]
  )

  const refreshSectionDataSilently = useCallback(() => {
    void refetch()
    void loadSectionData(true)
  }, [loadSectionData, refetch])

  // Load data when component mounts or leadId changes
  useEffect(() => {
    void loadSectionData(false)
  }, [loadSectionData])

  // Load rejection reasons function
  const loadRejectionReasons = useCallback(async () => {
    if (!leadId || !props.accessToken) return
    setRejectionReasonsError(null)
    try {
      const reasons = await fetchByLead(leadId)
      setRejectionReasons(reasons)
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : getTranslationFromI18nKeyAndLabel('rejection.error.loadFailed', 'Failed to load rejection reasons')
      setRejectionReasonsError(errorMessage)
      setRejectionReasons([])
    }
  }, [leadId, props.accessToken, fetchByLead])

  const refreshLeadRejectionBadgeData = useCallback(() => {
    refreshSectionDataSilently()
    void loadRejectionReasons()
  }, [loadRejectionReasons, refreshSectionDataSilently])

  // Load rejection reasons on mount
  useEffect(() => {
    loadRejectionReasons()
  }, [loadRejectionReasons])

  const getBackButtonText = () => {
    if (fromEntity === 'investment-relations') {
      return 'Back to Investment Relations'
    }
    return 'Back to Investment Leads'
  }

  // Refresh section lists after Kogito flows without reloading the whole record
  useProcessCompletion({
    onSuccess: refreshLeadRejectionBadgeData
  })

  // Rejection reasons badge - MUST be defined before headerTitle
  const rejectionReasonsBadge = useMemo(() => {
    if (!props.accessToken || !leadId) return null

    // Show error state if rejection reasons failed to load
    if (rejectionReasonsError) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="destructive"
                className="gba:cursor-pointer gba:hover:opacity-80"
                data-testid="lead-rejection-reasons-error-badge"
                onClick={loadRejectionReasons}
              >
                {getTranslationFromI18nKeyAndLabel('rejection.badge.error', 'Error Loading Reasons')}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{rejectionReasonsError}</p>
              <p className="gba:text-xs gba:mt-1">
                {getTranslationFromI18nKeyAndLabel('rejection.tooltip.retry', 'Click to retry')}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    // Determine badge variant and text based on rejection reasons
    const hasReasons = rejectionReasons.length > 0
    const badgeVariant = hasReasons ? 'destructive' : 'secondary'
    const badgeText = hasReasons
      ? getTranslationFromI18nKeyAndLabel('rejection.badge.rejected', 'Rejection Reasons')
      : getTranslationFromI18nKeyAndLabel('rejection.badge.noReasons', 'No Rejection Reason')

    return (
      <AppAction
        contextsArray={[FlowContextName.investmentLeadReject]}
        externalContextData={{ leadId }}
        prefixDataTestId="lead-rejection-reasons"
        accessToken={props.accessToken}
        emptyStateBehavior="enable"
        deferMainContextRequestsUntilClick
      >
        <Badge
          variant={badgeVariant}
          className="gba:cursor-pointer gba:hover:opacity-80"
          data-testid="lead-rejection-reasons-badge"
        >
          {badgeText}
        </Badge>
      </AppAction>
    )
  }, [props.accessToken, leadId, rejectionReasons, rejectionReasonsError, loadRejectionReasons])

  // Transform catalog referenceFields to formFields format for InvestmentSection
  const investmentFields = useMemo(
    () => buildFormFieldsFromCatalogData(leadData?.investmentType, leadData?.investmentGroup),
    [leadData?.investmentType, leadData?.investmentGroup]
  )

  // Header meta with badges
  const headerMeta = useMemo(() => {
    return (
      <div className="gba:flex gba:items-center gba:gap-2">
        {/* Rejection Reasons Badge */}
        {rejectionReasonsBadge}
      </div>
    )
  }, [rejectionReasonsBadge])

  // Prepare header content for RecordLayout - MUST be before conditional returns
  const headerTitle = (
    <div className="gba:flex gba:items-center gba:gap-2">
      <span>
        {`${lead?.firstName || ''} ${lead?.lastName || ''}`.trim() ||
          lead?.companyName ||
          getTranslationFromI18nKeyAndLabel('crm.investments.lead.title', 'Investment Lead')}
      </span>
      {lead?.sensitive === true && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                data-testid="lead-sensitive-badge"
                variant="warning"
                className="gba:rounded-full gba:p-1 gba:h-5 gba:w-5 gba:flex gba:items-center gba:justify-center"
              >
                <FlagIcon className="gba:h-3 gba:w-3" data-testid="lead-sensitive-badge-icon" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent data-testid="lead-sensitive-tooltip">
              {getTranslationFromI18nKeyAndLabel('crm.lead.sensitive', 'Sensitive')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )

  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'lead-details',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('crm.lead.source', 'Source'),
            value: lead?.leadSource?.value || getTranslationFromI18nKeyAndLabel('crm.common.unknown', 'Unknown'),
            icon: UsersIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.lead.rating', 'Rating'),
            value: lead?.leadRating?.value || getTranslationFromI18nKeyAndLabel('crm.common.unknown', 'Unknown'),
            icon: AddressBookIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.owner', 'Owner'),
            value: lead?.ownerEmployee
              ? `${lead.ownerEmployee.firstName} ${lead.ownerEmployee.lastName}`
              : getTranslationFromI18nKeyAndLabel('crm.common.unknown', 'Unknown'),
            icon: UsersIcon
          }
        ]
      }
    ],
    [lead?.leadSource?.value, lead?.leadRating?.value, lead?.ownerEmployee]
  )

  const headerActions = (
    <AiActions
      entityType="investment-lead"
      entityId={leadId}
      features={['summary']}
      hooks={{ summary: aiSummary }}
      requireAccessToken
      accessToken={props.accessToken}
    />
  )

  const leadDisplayName =
    `${lead?.firstName || ''} ${lead?.lastName || ''}`.trim() || lead?.companyName || 'Investment Lead'

  const headerActionButton = useMemo(
    () =>
      props.accessToken && (
        <AppAction
          data-testid="investment-lead-record-action-button"
          variant="header"
          contexts={[
            {
              context: FlowContextName.investmentLeadEntity,
              contextData: { leadId }
            }
          ]}
          shareContext={{
            entityType: 'investment-lead',
            entityId: leadId,
            entityName: leadDisplayName,
            entityUrl: `/platform/irm/lead-record?leadId=${leadId}`
          }}
          prefixDataTestId="lead-record-action"
          accessToken={props.accessToken}
        />
      ),
    [props.accessToken, leadId, leadDisplayName]
  )

  // Tab handling hooks - MUST be before conditional returns to comply with Rules of Hooks
  const handleTabChange = useCallback((value: string) => {
    const tab = getValidTab(value)
    setActiveTab(tab)
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url.toString())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.get('tab')) {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', activeTab)
      window.history.replaceState(null, '', url.toString())
    }
    const onPop = () => {
      setActiveTab(getValidTab(new URLSearchParams(window.location.search).get('tab')))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [activeTab])

  if (loading && !leadData) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">
            {error || getTranslationFromI18nKeyAndLabel('crm.investments.lead.notFound', 'Lead not found')}
          </p>
          <Button onClick={onBack} className="gba:mt-4" variant="default">
            {getBackButtonText()}
          </Button>
        </div>
      </div>
    )
  }

  // Status progression content
  const headerContent = (
    <>
      {leadStatuses && Array.isArray(leadStatuses) && leadStatuses.length > 0 && lead && (
        <StatusProgression
          currentStatus={lead?.leadStatus?.value || getTranslationFromI18nKeyAndLabel('crm.common.status.new', 'New')}
          statuses={leadStatuses}
          leadId={leadId}
          leadVersion={
            typeof leadData?.version === 'string' ? Number.parseInt(leadData.version, 10) : leadData?.version || 0
          }
          accessToken={props.accessToken}
        />
      )}
    </>
  )

  // Configure subViews for RecordLayout
  const subViewsConfig = {
    defaultValue: activeTab,
    onValueChange: handleTabChange,
    items: [
      {
        value: 'overview',
        label: getTranslationFromI18nKeyAndLabel('crm.common.overview', 'Overview'),
        icon: <UsersIcon />,
        content: (
          <RecordSectionsRefreshProvider value={refreshSectionDataSilently}>
            <>
              {/* Account Information - 1/4 width */}
              <SectionWrapper
                className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-3 gba:lg:col-span-3 gba:row-span-1"
                sections={[
                  {
                    id: 'account-section',
                    component: AccountSection,
                    props: {
                      ...props,
                      account: buildInvestmentAccountFromLead(leadData),
                      accounts: leadData ? [buildInvestmentAccountFromLead(leadData)].filter(Boolean) : undefined
                    }
                  }
                ]}
                data-testid="lead-account-section-wrapper"
              />

              {/* Contact Information - 1/4 width */}
              <SectionWrapper
                className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-3 gba:lg:col-span-3 gba:row-span-1"
                sections={[
                  {
                    id: 'contact-section',
                    component: ContactSection,
                    props: {
                      ...props,
                      contact: buildInvestmentContactFromLead(leadData),
                      contacts: leadData ? [buildInvestmentContactFromLead(leadData)].filter(Boolean) : undefined
                    }
                  }
                ]}
                data-testid="lead-contact-section-wrapper"
              />

              {/* Investment Information - 2/4 width (half) */}
              <SectionWrapper
                className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-1"
                sections={[
                  {
                    id: 'investment-section',
                    component: InvestmentSection,
                    props: {
                      ...props,
                      investment: buildInvestmentFromLead(leadData) || undefined,
                      investments: leadData
                        ? [buildInvestmentFromLead(leadData)].filter((inv): inv is Investment => inv !== null)
                        : undefined,
                      fields: investmentFields,
                      recordUrl: undefined, // No navigation - investment data is part of lead, not a separate entity
                      isLoading: loading && !leadData,
                      error: error
                    }
                  }
                ]}
                data-testid="lead-investment-section-wrapper"
              />

              {/* Tasks & Approvals - 1/2 width, spans 2 rows */}
              <SectionWrapper
                className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-2"
                sections={[
                  {
                    id: 'tasks-section',
                    component: TaskSection,
                    props: {
                      ...props,
                      leadId: leadId,
                      buildReferenceUrl,
                      tasks: tasks,
                      taskActionProps: {
                        contextsArray: [FlowContextName.investmentTaskCreate],
                        externalContextData: { leadId },
                        prefixDataTestId: 'lead-tasks',
                        emptyStateBehavior: 'enable'
                      },
                      taskEntityActionProps: {
                        contextsArray: [FlowContextName.investmentTaskEntity],
                        externalContextData: { leadId },
                        prefixDataTestId: 'lead-task-entity',
                        emptyStateBehavior: 'enable'
                      },
                      typeCatalog: TASK_TYPE,
                      priorityCatalog: TASK_PRIORITY,
                      buildTaskPayload: buildInvestmentTaskPayload,
                      defaultTaskStatusRef: 'InvestmentTaskStatus:v1:IN_PROGRESS',
                      preSubmit: taskPreSubmit,
                      docuSignEnabled
                    }
                  },
                  {
                    id: 'approval-tasks-section',
                    component: TaskSection,
                    props: {
                      ...props,
                      sectionTitle: 'Approval Tasks',
                      leadId: leadId,
                      buildReferenceUrl,
                      tasks: approvals,
                      taskEntityActionProps: {
                        contextsArray: [FlowContextName.investmentTaskEntity],
                        externalContextData: { leadId },
                        prefixDataTestId: 'lead-approval-entity',
                        emptyStateBehavior: 'enable'
                      },
                      taskActionProps: {
                        contextsArray: [FlowContextName.investmentTaskCreate],
                        externalContextData: {
                          leadId,
                          lead: leadId,
                          typeRef: APPROVAL_TASK_TYPE_REF,
                          investmentTask: { lead: leadId, type: APPROVAL_TASK_TYPE_REF }
                        },
                        prefixDataTestId: 'lead-approvals',
                        emptyStateBehavior: 'enable'
                      },
                      isApprovalTaskSection: true,
                      approvalTaskTypeRef: APPROVAL_TASK_TYPE_REF,
                      defaultTaskStatusRef: 'InvestmentTaskStatus:v1:IN_PROGRESS',
                      typeCatalog: TASK_TYPE,
                      priorityCatalog: TASK_PRIORITY,
                      buildTaskPayload: buildInvestmentTaskPayload,
                      preSubmit: taskPreSubmit,
                      docuSignEnabled
                    }
                  }
                ]}
                data-testid="lead-tasks-approvals-section-wrapper"
              />

              {/* Activities & Notes - 1/2 width, spans 2 rows */}
              <SectionWrapper
                className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-2"
                sections={[
                  {
                    id: 'activities-section',
                    component: ActivitySection,
                    props: {
                      ...props,
                      leadId,
                      activities: activities,
                      activitiesLoading: sectionsLoading,
                      activitiesError: sectionsError,
                      onReloadActivities: refreshSectionDataSilently,
                      activitySectionActionProps: {
                        contextsArray: [FlowContextName.investmentActivityCreate],
                        externalContextData: {
                          leadId,
                          lead: leadId,
                          investmentActivity: { lead: leadId },
                          ...(props.userInfo?.employeeDetails?.employeeId && {
                            ownerEmployeeId: props.userInfo.employeeDetails.employeeId
                          }),
                          ...(props.userInfo?.id && {
                            employeeId: props.userInfo.id,
                            userId: props.userInfo.id,
                            employeeDetails: { userId: props.userInfo.id }
                          })
                        },
                        prefixDataTestId: 'lead-activities',
                        emptyStateBehavior: 'enable'
                      },
                      activityEntityActionProps: {
                        contextsArray: [FlowContextName.investmentActivityEntity],
                        externalContextData: { leadId },
                        prefixDataTestId: 'lead-activity-entity',
                        emptyStateBehavior: 'enable'
                      },
                      activityTypeCatalog: ACTIVITY_TYPE,
                      buildActivityPayload: buildInvestmentActivityPayload,
                      alignment: 'right',
                      preSubmit: activityPreSubmit,
                      getRelatedRecordUrl: buildIrmRelatedEntityRecordUrl
                    }
                  },
                  {
                    id: 'notes-section',
                    component: NoteSection as React.ComponentType<any>,
                    props: {
                      ...props,
                      leadId,
                      notes: notes,
                      noteActionProps: {
                        contextsArray: [FlowContextName.investmentNoteCreate],
                        externalContextData: { leadId },
                        prefixDataTestId: 'lead-notes',
                        emptyStateBehavior: 'enable'
                      },
                      noteEntityActionProps: {
                        contextsArray: [FlowContextName.investmentNoteEntity],
                        externalContextData: { leadId },
                        prefixDataTestId: 'lead-note-entity',
                        emptyStateBehavior: 'enable'
                      },
                      buildNotePayload: buildInvestmentNotePayload,
                      preSubmit: notePreSubmit
                    }
                  }
                ]}
                data-testid="lead-activities-notes-section-wrapper"
              />
            </>
          </RecordSectionsRefreshProvider>
        )
      },
      {
        value: 'documents',
        label: getTranslationFromI18nKeyAndLabel('crm.common.documents', 'Documents'),
        icon: <FolderIcon />,
        content: (
          <div className="gba:col-span-12">
            <LeadDocuments leadId={leadId} context={props} />
          </div>
        )
      }
    ]
  }

  return (
    <RecordLayout
      data-testid="investment-lead-detail"
      headerOrientation="horizontal"
      headerAvatar={<IconAvatar icon={AddressBookIcon} variant="decorative" size="xl" />}
      headerOverline={getTranslationFromI18nKeyAndLabel('crm.lead.category', 'LEAD')}
      onBack={onBack}
      headerTitle={headerTitle}
      headerMeta={headerMeta}
      headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
      headerActions={headerActions}
      headerActionButton={headerActionButton}
      headerSlotAfter={headerContent}
      views={subViewsConfig.items}
      defaultView={subViewsConfig.defaultValue}
      onViewChange={subViewsConfig.onValueChange}
    />
  )
}

interface LeadRecordProps extends BusinessAppContextProps {
  leadId?: string
  source?: string
  fromEntity?: string
  onBack?: () => void
}

const LeadRecord: React.FC<LeadRecordProps> = props => {
  const leadId = props.leadId || new URLSearchParams(window.location.search).get('leadId')

  const fromEntity = useMemo(() => {
    const urlFromEntity = new URLSearchParams(window.location.search).get('fromEntity')
    return props.fromEntity || urlFromEntity
  }, [props.fromEntity, window.location.search])

  const handleBack = () => {
    if (props.onBack) {
      props.onBack()
    } else {
      // Always navigate to investment relations
      navigateTo('/platform/irm/investment-relations?view=leads')
    }
  }

  if (!leadId) {
    return (
      <div data-testid="investment-lead-record-no-id">
        <p>{getTranslationFromI18nKeyAndLabel('crm.investments.lead.noIdProvided', 'No lead ID provided')}</p>
      </div>
    )
  }
  return (
    <InvestmentLeadRecordContent {...props} leadId={leadId} onBack={handleBack} fromEntity={fromEntity || undefined} />
  )
}

export { LeadRecord, InvestmentLeadRecordContent }

export default LeadRecord
