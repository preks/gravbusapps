import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Spinner,
  RecordLayout,
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  IconAvatar,
  HeaderSlot
} from '@newwork/nw-design-system'
import { UserIcon, FolderIcon, FlagIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useCustomerLead } from '@/common/data/customer/hooks/useCustomerLead'
import { buildLeadStatusesQuery } from '@/common/data/relations/queries/leadQueries'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import { useCustomerNotes } from '@/common/data/customer/hooks/useCustomerNotes'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { APPROVAL_TASK_TYPE_REF } from '@/common/data/customer/constants/customerConstants'
import { AiActions } from '@/common/components/common-relations/record-sections/header-section/ai-actions'
import { useAiSummary } from './hooks/useAiSummary'
import { StatusProgression } from './components/StatusProgression'
import { HomeView } from './views/home-view/HomeView'
import { DocumentView } from './views/document-view/DocumentView'
import ComplianceSection from '@/common/components/common-relations/record-sections/compliance-section/ComplianceSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import { formatScoreValue, getGradeBadgeVariant } from '@/business-apps/crm/core/features/lead-scoring'

interface LeadRecordContentProps extends BusinessAppContextProps {
  leadId: string
  onBack: () => void
  fromEntity?: string
}

const LeadRecordContent: React.FC<LeadRecordContentProps> = ({ leadId, onBack, fromEntity, ...props }) => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return 'overview'
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') || 'overview'
  })

  // Use new declarative hook for lead data with additional leadStatuses query
  const additionalQueries = useMemo(
    () => [
      {
        query: buildLeadStatusesQuery('SalesLeadStatus'),
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
  } = useCustomerLead(props.accessToken, leadId, {
    additionalQueries
  })

  // Fetch lead data function for refetch
  const fetchLeadData = useCallback(async () => {
    await refetch()
  }, [refetch])

  // AI Summary hook - must be called before any conditional returns
  const aiSummaryHook = useAiSummary(leadId, props.accessToken)

  // Data fetching hooks for sections
  const { fetchCustomerActivitiesByLeadId } = useCustomerActivities(props)
  const { fetchCustomerNotesByLeadId } = useCustomerNotes(props)
  const { fetchCustomerTasksByLeadId } = useCustomerTasks(props)

  // State for section data
  const [activities, setActivities] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsError, setSectionsError] = useState<string | null>(null)

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
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
      const next = new URLSearchParams(window.location.search).get('tab') || 'overview'
      setActiveTab(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [activeTab])

  // Load section data
  const loadSectionData = useCallback(async () => {
    if (!leadId || !props.accessToken) return

    setSectionsLoading(true)
    setSectionsError(null)

    try {
      // Helpers: sleep and retry with exponential backoff on 429s
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
      const withRetry = async <T,>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 400): Promise<T> => {
        let attempt = 0

        while (true) {
          try {
            return await fn()
          } catch (err: any) {
            const message = typeof err?.message === 'string' ? err.message : ''
            const status = (err && (err.status || err.code)) as number | undefined
            const isRateLimited = status === 429 || message.includes('429') || message.includes('Too Many Requests')
            if (!isRateLimited || attempt >= maxRetries - 1) {
              throw err
            }
            const jitter = Math.floor(Math.random() * 150)
            const delay = baseDelayMs * Math.pow(2, attempt) + jitter
            attempt += 1
            await sleep(delay)
          }
        }
      }

      // Staggered serial execution to reduce burst load on API
      const activitiesData = await withRetry(() => fetchCustomerActivitiesByLeadId(leadId))
      await sleep(120)
      const notesData = await withRetry(() => fetchCustomerNotesByLeadId(leadId))
      await sleep(120)
      const tasksData = await withRetry(() => fetchCustomerTasksByLeadId(leadId))

      const sortedNotes = (notesData || []).sort(
        (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )
      const sortedTasks = (tasksData || []).sort(
        (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )

      // Separate regular tasks from approvals based on taskType catalog entry
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
    } catch (error: any) {
      console.error('Error loading section data:', error)
      const message = typeof error?.message === 'string' ? error.message : ''
      const status = (error && (error.status || error.code)) as number | undefined
      const is429 = status === 429 || message.includes('429') || message.includes('Too Many Requests')
      setSectionsError(
        is429
          ? getTranslationFromI18nKeyAndLabel('crm.errors.rateLimited', 'Rate limited. Please try again in a moment.')
          : error instanceof Error
            ? error.message
            : 'Failed to load data'
      )
    } finally {
      setSectionsLoading(false)
    }
  }, [
    leadId,
    props.accessToken,
    fetchCustomerActivitiesByLeadId,
    fetchCustomerNotesByLeadId,
    fetchCustomerTasksByLeadId
  ])

  // Load section data on mount
  useEffect(() => {
    loadSectionData()
  }, [loadSectionData])

  // Memoized callback for process completion
  const handleProcessSuccess = useCallback(() => {
    fetchLeadData()
    loadSectionData()
  }, [fetchLeadData, loadSectionData])

  // Listen for process completion events to refresh lead data
  useProcessCompletion({
    onSuccess: handleProcessSuccess
  })

  const getBackButtonText = () => {
    if (fromEntity === 'salesPerformance') {
      return getTranslationFromI18nKeyAndLabel('crm.navigation.backToSalesPerformance', 'Back to Sales Performance')
    }
    return getTranslationFromI18nKeyAndLabel('crm.navigation.backToLeads', 'Back to Leads')
  }

  // Memoize header data - must be called before conditional returns
  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'lead-details',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.source', 'Source'),
            value: leadData?.leadSource?.value || getTranslationFromI18nKeyAndLabel('crm.common.unknown', 'Unknown'),
            icon: UserIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.rating', 'Rating'),
            value: leadData?.leadRating?.value || getTranslationFromI18nKeyAndLabel('crm.common.unknown', 'Unknown'),
            icon: UserIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.owner', 'Owner'),
            value: leadData?.ownerEmployee
              ? `${leadData.ownerEmployee.firstName} ${leadData.ownerEmployee.lastName}`.trim()
              : getTranslationFromI18nKeyAndLabel('crm.common.notAssigned', 'Not assigned'),
            icon: UserIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.status', 'Status'),
            value: leadData?.leadStatus?.value || getTranslationFromI18nKeyAndLabel('crm.common.unknown', 'Unknown'),
            icon: UserIcon
          }
        ]
      }
    ],
    [leadData]
  )

  const headerActions = (
    <AiActions
      entityType="lead"
      entityId={leadId}
      features={['summary', 'meeting-planner', 'lead-scoring']}
      hooks={{ summary: aiSummaryHook, meetingPlanner: aiSummaryHook }}
      accessToken={props.accessToken}
      userInfo={props.userInfo}
      additionalData={props.additionalData}
      onLeadScored={fetchLeadData}
    />
  )

  // Calculate leadName early for use in headerActionButton
  const leadName =
    leadData?.companyName ||
    (leadData?.firstName && leadData?.lastName ? `${leadData.firstName} ${leadData.lastName}`.trim() : '') ||
    getTranslationFromI18nKeyAndLabel('crm.lead.unnamed', 'Unnamed Lead')

  const headerActionButton = useMemo(
    () => (
      <AppAction
        data-testid="lead-record-action-button"
        variant="header"
        contexts={[
          {
            context: FlowContextName.customerLeadEntity,
            contextData: { leadId }
          }
        ]}
        shareContext={{
          entityType: 'lead',
          entityId: leadId,
          entityName: leadName,
          entityUrl: `/platform/crm/lead-record?leadId=${leadId}`
        }}
        prefixDataTestId="lead-record-action"
        accessToken={props.accessToken}
      />
    ),
    [leadId, leadName, props.accessToken]
  )

  // Action props for sections - must be defined before subViewsConfig
  const activityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerActivityCreate],
      externalContextData: {
        leadId,
        lead: leadId,
        salesActivity: { lead: leadId },
        // Set current user as default owner
        ...(props.userInfo?.employeeDetails?.employeeId && {
          ownerEmployeeId: props.userInfo.employeeDetails.employeeId
        }),
        // Ensure employee details are present
        ...(props.userInfo?.id && {
          employeeId: props.userInfo.id,
          userId: props.userInfo.id,
          employeeDetails: { userId: props.userInfo.id }
        })
      },
      prefixDataTestId: 'lead-activity'
    }),
    [leadId, props.userInfo]
  )

  const noteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerNoteCreate],
      externalContextData: {
        leadId,
        lead: leadId,
        crmNote: { lead: leadId }
      },
      prefixDataTestId: 'lead-note'
    }),
    [leadId]
  )

  const taskActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerTaskCreate],
      externalContextData: { leadId },
      prefixDataTestId: 'lead-task',
      emptyStateBehavior: 'enable' as const
    }),
    [leadId]
  )

  const approvalActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerTaskCreate],
      externalContextData: {
        leadId,
        typeRef: APPROVAL_TASK_TYPE_REF,
        salesTask: { lead: leadId, type: APPROVAL_TASK_TYPE_REF }
      },
      prefixDataTestId: 'lead-approval',
      emptyStateBehavior: 'enable' as const
    }),
    [leadId]
  )

  // Header content with status progression
  const headerContent = useMemo(() => {
    if (leadStatuses && Array.isArray(leadStatuses) && leadStatuses.length > 0 && leadData) {
      return (
        <StatusProgression
          currentStatus={leadData?.leadStatus?.value || 'New'}
          statuses={leadStatuses}
          leadId={leadId}
          leadVersion={Number.parseInt(leadData?.version || '1', 10) || 0}
          accessToken={props.accessToken}
          onStatusUpdate={fetchLeadData}
        />
      )
    }
    return null
  }, [leadStatuses, leadData, leadId, props.accessToken, fetchLeadData])

  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'overview',
          label: getTranslationFromI18nKeyAndLabel('crm.common.overview', 'Overview'),
          icon: <UserIcon className="gba:mr-2" />,
          content: (
            <HomeView
              leadId={leadId}
              lead={leadData}
              rawLeadData={leadData}
              activities={activities}
              notes={notes}
              tasks={tasks}
              approvals={approvals}
              sectionsLoading={sectionsLoading}
              sectionsError={sectionsError}
              loadSectionData={loadSectionData}
              activityActionProps={activityActionProps}
              noteActionProps={noteActionProps}
              taskActionProps={taskActionProps}
              approvalActionProps={approvalActionProps}
              {...props}
            />
          )
        },
        {
          value: 'documents',
          label: getTranslationFromI18nKeyAndLabel('crm.common.documents', 'Documents'),
          icon: <FolderIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <DocumentView leadId={leadId} {...props} />
            </div>
          )
        },
        {
          value: 'compliance',
          label: getTranslationFromI18nKeyAndLabel('crm.common.compliance', 'Compliance'),
          icon: <CheckCircleIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <SectionWrapper
                className="gba:min-h-96"
                sections={[
                  {
                    id: 'compliance-section',
                    component: ComplianceSection,
                    props: {
                      entity: leadData,
                      accessToken: props.accessToken,
                      actionButtonConfig: {
                        type: 'AppAction',
                        config: {
                          contextsArray: [FlowContextName.leadUpdateComplianceData],
                          externalContextData: { leadId },
                          prefixDataTestId: 'lead-compliance-update',
                          emptyStateBehavior: 'enable',
                          deferMainContextRequestsUntilClick: true,
                          variant: 'custom',
                          children: (
                            <Button data-testid="lead-compliance-update-button" variant="default" size="sm">
                              {getTranslationFromI18nKeyAndLabel(
                                'crm.compliance.updateAction',
                                'Update Compliance Data'
                              )}
                            </Button>
                          )
                        }
                      },
                      'data-testid': 'lead-compliance-section'
                    }
                  }
                ]}
                data-testid="lead-compliance-section-wrapper"
              />
            </div>
          )
        }
      ]
    }),
    [
      activeTab,
      handleTabChange,
      leadId,
      leadData,
      props,
      tasks,
      approvals,
      notes,
      activities,
      sectionsLoading,
      sectionsError,
      loadSectionData,
      taskActionProps,
      approvalActionProps,
      noteActionProps,
      activityActionProps,
      leadStatuses,
      fetchLeadData
    ]
  )

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !leadData) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg" style={{ color: 'var(--nw-color-destructive-600)' }}>
            {error || getTranslationFromI18nKeyAndLabel('crm.lead.notFound', 'Lead not found')}
          </p>
          <Button
            onClick={onBack}
            style={{ marginTop: 'var(--nw-spacing-sm)' }}
            variant="default"
            data-testid="lead-error-back-button"
          >
            {getBackButtonText()}
          </Button>
        </div>
      </div>
    )
  }

  const hasAiScoreValue = leadData.aiLeadScore !== null && leadData.aiLeadScore !== undefined
  const hasAiScoreBadge = hasAiScoreValue || Boolean(leadData.aiLeadGrade)
  const aiScoreLabel = `${formatScoreValue(leadData.aiLeadScore)} · ${
    leadData.aiLeadGrade || getTranslationFromI18nKeyAndLabel('crm.common.notAvailable', 'N/A')
  }`

  // Create header title with sensitive badge
  const headerTitle = (
    <div className="gba:flex gba:items-center gba:gap-2">
      <span>{leadName}</span>
      {hasAiScoreBadge && (
        <Badge
          data-testid="lead-ai-score-badge"
          variant={getGradeBadgeVariant(leadData.aiLeadGrade)}
          className="gba:text-sm"
        >
          {aiScoreLabel}
        </Badge>
      )}
      {leadData?.sensitive === true && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge data-testid="lead-sensitive-badge" variant="warning" className="gba:text-sm">
                <FlagIcon className="gba:h-3 gba:w-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent data-testid="lead-sensitive-tooltip">
              {getTranslationFromI18nKeyAndLabel('crm.common.sensitive', 'Sensitive')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )

  return (
    <RecordLayout
      data-testid="lead-opportunity-investment-detail"
      headerOrientation="horizontal"
      headerAvatar={<IconAvatar icon={UserIcon} variant="decorative" size="xl" />}
      headerOverline={getTranslationFromI18nKeyAndLabel('crm.common.lead', 'LEAD')}
      onBack={onBack}
      headerTitle={headerTitle}
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

  const source = useMemo(() => {
    return props.source || new URLSearchParams(window.location.search).get('source')
  }, [props.source])

  const fromEntity = useMemo(() => {
    const urlFromEntity = new URLSearchParams(window.location.search).get('fromEntity')
    return props.fromEntity || urlFromEntity
  }, [props.fromEntity])

  const handleBack = () => {
    if (props.onBack) {
      props.onBack()
    } else {
      // Navigate back based on fromEntity first, then source
      if (fromEntity === 'salesPerformance') {
        // Check if there's an employee ID to navigate back to specific employee performance
        const employeeId = new URLSearchParams(window.location.search).get('employeeId')
        const salesPerformanceUrl = employeeId
          ? buildPlatformUrl('/platform/crm/sales-performance', { employeeId })
          : buildPlatformUrl('/platform/crm/sales-performance', {})
        navigateTo(salesPerformanceUrl)
        return
      }

      // Default navigation based on source
      switch (source) {
        case 'investments':
          navigateTo(buildPlatformUrl('/platform/irm/investment-relations', { view: 'leads' }))
          break
        case 'customer-relations':
        default:
          navigateTo(buildPlatformUrl('/platform/crm/customer-relations', { view: 'leads' }))
          break
      }
    }
  }

  if (!leadId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p
            className="gba:text-lg"
            style={{ color: 'var(--nw-color-destructive-600)' }}
            data-testid="lead-no-id-message"
          >
            {getTranslationFromI18nKeyAndLabel('crm.lead.idRequired', 'Lead ID is required')}
          </p>
          <Button
            onClick={handleBack}
            style={{ marginTop: 'var(--nw-spacing-sm)' }}
            variant="default"
            data-testid="lead-no-id-back-button"
          >
            {getTranslationFromI18nKeyAndLabel('crm.navigation.backToLeads', 'Back to Leads')}
          </Button>
        </div>
      </div>
    )
  }

  return <LeadRecordContent leadId={leadId} onBack={handleBack} fromEntity={fromEntity || undefined} {...props} />
}

export { LeadRecord, LeadRecordContent }

export default LeadRecord
