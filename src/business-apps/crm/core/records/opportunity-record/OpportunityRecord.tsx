import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Spinner, Button, RecordLayout, Badge, IconAvatar, HeaderSlot } from '@newwork/nw-design-system'
import {
  UserIcon,
  FolderIcon,
  StarIcon,
  TrendUpIcon,
  LightbulbIcon,
  CurrencyDollarIcon,
  CalendarIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { useCustomerOpportunity } from '@/common/data/customer/hooks/useCustomerOpportunity'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import { useCustomerNotes } from '@/common/data/customer/hooks/useCustomerNotes'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { formatCurrency, extractCurrencyCode } from '@/business-apps/crm/common/utils/currencyUtils'
import { getOpportunityStatusBadgeVariant, getOpportunityForecastBadgeVariant } from '@/common/utils/badgeUtils'
import { AiScoreRecordBadge } from '@/common/components/ai-score/AiScoreRecordBadge'
import { useAiSummary } from './hooks/useAiSummary'
import { AiActions } from '@/common/components/common-relations/record-sections/header-section/ai-actions'
import { AppAction } from '@/components/app-action'
import { OpportunityStageProgression } from '@/common/components/common-relations/record-sections/opportunity-pipeline-section/OpportunityStageProgression'
import type { OpportunityPipelineContextConfig } from '@/common/components/common-relations/record-sections/opportunity-pipeline-section/types'
import { getEmployeeName } from '@/common/components/common-relations/record-sections/opportunity-pipeline-section/utils'
import { useOpportunityPipelineStages } from '@/common/components/common-relations/record-sections/opportunity-pipeline-section/hooks/useOpportunityPipelineStages'
import type { Stage, StageCondition } from '@/components/stage-progression/types'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { isOpportunityOpen } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/opportunityStatusUtils'
import { HomeView } from './views/home-view/HomeView'
import { DocumentView } from './views/document-view'

interface OpportunityRecordContentProps extends BusinessAppContextProps {
  opportunityId: string
  onBack: () => void
  getBackButtonText: () => string
  fromEntity?: string | null
}

const buildStageConditionStatusKey = (statusData: any): string =>
  [
    statusData?.id ?? '',
    statusData?.completed ?? false,
    statusData?.completedByEmployee?.id ?? '',
    statusData?.opportunityPipelineStageCondition?.id ?? '',
    statusData?.opportunityPipelineStageCondition?.parentEntryId ?? ''
  ].join(':')

const areStageConditionStatusesEqual = (left: any[], right: any[]): boolean =>
  left.length === right.length &&
  left.every(
    (statusData, index) => buildStageConditionStatusKey(statusData) === buildStageConditionStatusKey(right[index])
  )

const OpportunityRecordContent: React.FC<OpportunityRecordContentProps> = ({
  opportunityId,
  onBack,
  getBackButtonText,
  ...props
}) => {
  const ALLOWED_TABS = ['overview', 'documents'] as const
  type TabKey = (typeof ALLOWED_TABS)[number]
  const [activeTab, setActiveTab] = useState('overview')

  // Initialize activeTab from URL on mount and write default if missing
  useEffect(() => {
    if (globalThis.window === undefined) return
    const params = new URLSearchParams(globalThis.location.search)
    const initial = params.get('tab') || 'overview'
    const validated = ALLOWED_TABS.includes(initial as TabKey) ? (initial as TabKey) : 'overview'
    setActiveTab(validated)
    if (!params.get('tab') || initial !== validated) {
      params.set('tab', validated)
      globalThis.history.replaceState(null, '', `${globalThis.location.pathname}?${params.toString()}`)
    }
    const onPopState = () => {
      const p = new URLSearchParams(globalThis.location.search)
      const t = p.get('tab') || 'overview'
      setActiveTab(ALLOWED_TABS.includes(t as TabKey) ? (t as TabKey) : 'overview')
    }
    globalThis.addEventListener('popstate', onPopState)
    return () => globalThis.removeEventListener('popstate', onPopState)
  }, [])

  // Use new declarative hook for opportunity data
  const {
    opportunity: opportunityData,
    loading,
    error,
    refetch
  } = useCustomerOpportunity(props.accessToken, opportunityId)

  const [stageConditionStatuses, setStageConditionStatuses] = useState<any[]>([])

  // Use shared hook for fetching pipeline stages and catalog conditions
  const { opportunityStages, loadingStages, stagesError } = useOpportunityPipelineStages({
    opportunityData: opportunityData ?? undefined,
    stageConditionCatalog: 'SalesPipelineStageCondition',
    accessToken: props.accessToken,
    contextLabel: 'customer'
  })

  /**
   * Helper function to extract CRM stage conditions
   * Filters stageConditionStatuses directly by parentEntryId (like ConditionSection does)
   */
  const extractCrmStageConditions = useCallback((stageConditionStatuses: any[], stage: Stage): StageCondition[] => {
    // Filter stageConditionStatuses directly by parentEntryId (like ConditionSection does)
    const stageConditionStatusesForStage = stageConditionStatuses.filter(
      statusData => statusData.opportunityPipelineStageCondition?.parentEntryId === stage.id
    )

    return stageConditionStatusesForStage.map(statusData => {
      const conditionEntry = statusData.opportunityPipelineStageCondition
      const config = statusData.configSnapshot || conditionEntry?.objectValue || {}
      const checkedType = config.check_type === 'MANUAL' ? 'User' : 'Automated'

      return {
        id: conditionEntry?.id || statusData.id,
        title: conditionEntry?.value || 'Unknown Condition',
        isCompleted: statusData.completed || false,
        checkedType: checkedType as 'Automated' | 'User' | 'Manager' | 'Owner',
        completedBy: statusData.completedByEmployee ? getEmployeeName(statusData.completedByEmployee) : null
      }
    })
  }, [])

  // Extract stageConditionStatuses from opportunityData
  useEffect(() => {
    const nextStageConditionStatuses = opportunityData?.opportunityStageConditions ?? []
    setStageConditionStatuses(previous =>
      areStageConditionStatusesEqual(previous, nextStageConditionStatuses) ? previous : nextStageConditionStatuses
    )
  }, [opportunityData?.opportunityStageConditions])

  // CRM-specific configuration for OpportunityStageProgression
  const crmPipelineConfig: OpportunityPipelineContextConfig = useMemo(
    () => ({
      transitionFlowContext: FlowContextName.customerOpportunityStageTransition,
      opportunityIdField: 'opportunityId',
      targetStageRefField: 'targetStageRef',
      extractStageConditions: extractCrmStageConditions,
      isTooltipEnabled: (status?: string) => isOpportunityOpen(status)
    }),
    [extractCrmStageConditions]
  )

  // AI Summary hook for HeaderSection
  const aiSummaryHook = useAiSummary(opportunityId, props.accessToken)

  // Activity data loading - using central hooks
  const { fetchCustomerActivitiesByOpportunityId } = useCustomerActivities(props)
  const [activities, setActivities] = useState<any[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)

  // Notes and Tasks data loading - using central hooks
  const { fetchCustomerNotesByOpportunityId } = useCustomerNotes(props)
  const { fetchCustomerTasksByOpportunityId } = useCustomerTasks(props)
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])

  const loadActivities = async (silent = false) => {
    if (!opportunityId) return

    if (!silent) {
      setActivitiesLoading(true)
      setActivitiesError(null)
    }

    try {
      const activitiesData = await fetchCustomerActivitiesByOpportunityId(opportunityId)
      setActivities(activitiesData || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load activities'
      if (silent) {
        console.error('Failed to refresh activities:', message)
      } else {
        setActivitiesError(message)
      }
    } finally {
      if (!silent) {
        setActivitiesLoading(false)
      }
    }
  }

  const loadNotes = async () => {
    if (!opportunityId) return
    try {
      const notesData = await fetchCustomerNotesByOpportunityId(opportunityId)
      setNotes(notesData || [])
    } catch (err) {
      console.error('Failed to load notes:', err)
    }
  }

  const loadTasksAndApprovals = async () => {
    if (!opportunityId) return
    try {
      const tasksData = await fetchCustomerTasksByOpportunityId(opportunityId)
      const allTasks = tasksData || []

      // Separate regular tasks from approval tasks
      const regularTasks = allTasks.filter(task => {
        const taskTypeValue = task.type?.value || task.taskType?.value || ''
        const isApprovalTask = taskTypeValue?.toLowerCase() === 'approval'
        return !isApprovalTask
      })

      const approvalTasks = allTasks.filter(task => {
        const taskTypeValue = task.type?.value || task.taskType?.value || ''
        const isApprovalTask = taskTypeValue?.toLowerCase() === 'approval'
        return isApprovalTask
      })

      setTasks(regularTasks)
      setApprovals(approvalTasks)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
  }

  const loadSectionData = useCallback(
    (silent = false) => {
      loadActivities(silent)
      loadNotes()
      loadTasksAndApprovals()
    },
    [opportunityId]
  )

  const refreshSectionDataSilently = useCallback(() => {
    void refetch()
    loadSectionData(true)
  }, [loadSectionData, refetch])

  // Load all data on mount and when opportunityId changes
  useEffect(() => {
    loadSectionData(false)
  }, [loadSectionData])

  // Refresh section lists after Kogito flows without reloading the whole record
  useProcessCompletion({
    onSuccess: refreshSectionDataSilently
  })

  // Memoize stage condition action props to prevent recreation
  const stageConditionActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerOpportunityConditionUpdate],
      externalContextData: undefined,
      prefixDataTestId: 'stage-condition-status-icon'
    }),
    []
  )

  // Memoize header action button to prevent recreation
  const headerActionButton = useMemo(
    () => (
      <AppAction
        variant="header"
        contexts={[
          {
            context: FlowContextName.customerOpportunityEntity,
            contextData: { opportunityId }
          }
        ]}
        shareContext={{
          entityType: 'opportunity',
          entityId: opportunityId,
          entityName: opportunityData?.name || 'Opportunity',
          entityUrl: `/platform/crm/opportunity-record?opportunityId=${opportunityId}`
        }}
        prefixDataTestId="opportunity-record-action"
        accessToken={props.accessToken}
      />
    ),
    [opportunityId, opportunityData?.name, props.accessToken]
  )

  // Memoize RecordLayout data to prevent unnecessary re-renders (must be before early returns)
  const headerMeta = useMemo(() => {
    // Only display status if opportunityStatus catalog entry exists
    const rawStatus = opportunityData?.opportunityStatus?.value || opportunityData?.opportunityStatus?.code

    // Format status to remove prefixes like "OPPORTUNITY_OPEN" -> "Open"
    const formatStatus = (status?: string): string => {
      if (!status) return ''
      return status
        .replace(/^OPPORTUNITY_/, '')
        .replace(/^INVESTMENT_/, '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }

    const statusLabel = opportunityData?.opportunityStatus ? formatStatus(rawStatus) : ''

    // Forecast badge
    const forecast = opportunityData?.opportunityForecast
    const forecastValue = forecast?.value || forecast?.code || ''
    const forecastAdditionalValue1 = forecast?.additionalValue1 || ''
    const forecastDisplayValue = forecastAdditionalValue1
      ? `${forecastValue}: ${forecastAdditionalValue1}`
      : forecastValue

    return (
      <div className="gba:flex gba:items-center gba:gap-2">
        {statusLabel && (
          <AppAction
            contextsArray={[FlowContextName.customerOpportunityStatusUpdate]}
            externalContextData={{ opportunityId }}
            prefixDataTestId="opportunity-status-update"
            accessToken={props.accessToken}
            emptyStateBehavior="enable"
            deferMainContextRequestsUntilClick
          >
            <Badge
              variant={getOpportunityStatusBadgeVariant(opportunityData?.opportunityStatus)}
              className="gba:gap-1 gba:cursor-pointer hover:gba:opacity-80"
              data-testid="opportunity-status-badge"
            >
              {statusLabel}
            </Badge>
          </AppAction>
        )}
        {forecast && forecastDisplayValue && (
          <Badge variant={getOpportunityForecastBadgeVariant(forecast)} data-testid="opportunity-forecast-badge">
            {forecastDisplayValue}
          </Badge>
        )}
        {opportunityData?.estimatedAmount && (
          <Badge variant="outline" className="gba:gap-1">
            {formatCurrency(opportunityData.estimatedAmount, opportunityData?.currency?.id || 'Currency:v1:EUR')}
          </Badge>
        )}
      </div>
    )
  }, [
    opportunityData?.estimatedAmount,
    opportunityData?.currency?.id,
    opportunityData?.opportunityStatus,
    opportunityData?.opportunityForecast,
    opportunityId,
    props.accessToken
  ])

  const headerDetailGroups = useMemo(() => {
    // Format status to remove prefixes - only if opportunityStatus catalog exists
    const formatStatus = (status?: string): string => {
      if (!status) return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
      return status
        .replace(/^OPPORTUNITY_/, '')
        .replace(/^INVESTMENT_/, '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }

    // Only use status if opportunityStatus catalog entry exists
    const rawStatus = opportunityData?.opportunityStatus?.value || opportunityData?.opportunityStatus?.code

    return [
      {
        id: 'opportunity-details',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('crm.opportunity.status', 'Status'),
            value: opportunityData?.opportunityStatus
              ? formatStatus(rawStatus)
              : getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: StarIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.opportunity.stage', 'Stage'),
            value:
              opportunityData?.opportunityPipelineStage?.value ||
              getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: StarIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.opportunity.expectedCloseDate', 'Expected Close Date'),
            value: opportunityData?.closeDate
              ? (() => {
                  const dateOnly = opportunityData.closeDate.split('T')[0]
                  const formatted = formatDate(dateOnly, 'date.short')
                  // Fallback: if formatDate returns ISO format, manually format the date
                  return formatted?.includes('T') ? dateOnly : formatted
                })()
              : getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: CalendarIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.currency', 'Currency'),
            value: extractCurrencyCode(opportunityData?.currency?.id || 'Currency:v1:EUR'),
            icon: CurrencyDollarIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.opportunity.winningChance', 'Winning Chance'),
            value:
              opportunityData?.winningChance !== undefined && opportunityData?.winningChance !== null
                ? `${opportunityData.winningChance}%`
                : getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: TrendUpIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.opportunity.estimatedAmount', 'Estimated Amount'),
            value: opportunityData?.estimatedAmount
              ? formatCurrency(opportunityData.estimatedAmount, opportunityData.currency?.id || 'Currency:v1:EUR')
              : getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: CurrencyDollarIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.owner', 'Owner'),
            value:
              opportunityData?.ownerEmployee?.displayName ||
              (opportunityData?.ownerEmployee?.firstName && opportunityData?.ownerEmployee?.lastName
                ? `${opportunityData.ownerEmployee.firstName} ${opportunityData.ownerEmployee.lastName}`.trim()
                : getTranslationFromI18nKeyAndLabel('crm.common.notAssigned', 'Not assigned')),
            icon: UserIcon
          }
        ]
      }
    ]
  }, [
    opportunityData?.opportunityStatus?.value,
    opportunityData?.opportunityPipelineStage?.code,
    opportunityData?.closeDate,
    opportunityData?.currency?.id,
    opportunityData?.winningChance,
    opportunityData?.estimatedAmount,
    opportunityData?.ownerEmployee
  ])

  const headerActions = (
    <AiActions
      entityType="opportunity"
      entityId={opportunityId}
      features={['summary', 'meeting-planner', 'ai-scoring']}
      hooks={{ summary: aiSummaryHook, meetingPlanner: aiSummaryHook }}
      accessToken={props.accessToken}
      requireAccessToken
      onIcpScored={refetch}
    />
  )

  const headerContent = useMemo(() => {
    // Show stage progression if data is ready
    if (!stagesError && opportunityStages.length > 0 && opportunityData?.opportunityPipelineRef) {
      return (
        <OpportunityStageProgression
          currentStage={opportunityData?.opportunityPipelineStage?.value || 'Discovery'}
          stages={opportunityStages}
          opportunityId={opportunityId || ''}
          accessToken={props.accessToken}
          stageConditionStatuses={stageConditionStatuses}
          contextConfig={crmPipelineConfig}
          opportunityStatus={opportunityData?.opportunityStatus?.value}
        />
      )
    }

    // Show loading state
    if (loadingStages && opportunityStages.length === 0) {
      return (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--nw-spacing-lg)'
          }}
        >
          <Spinner size="sm" />
          <span style={{ marginLeft: 'var(--nw-spacing-sm)' }}>
            {getTranslationFromI18nKeyAndLabel('crm.opportunity.loadingStages', 'Loading pipeline stages...')}
          </span>
        </div>
      )
    }

    // Show error state
    if (stagesError) {
      return (
        <div style={{ textAlign: 'center', padding: 'var(--nw-spacing-lg)', color: 'var(--nw-color-danger-500)' }}>
          <p>
            {getTranslationFromI18nKeyAndLabel('crm.opportunity.failedToLoadStages', 'Failed to load pipeline stages')}:{' '}
            {stagesError}
          </p>
        </div>
      )
    }

    // Show no pipeline assigned message
    if (opportunityData && !opportunityData.opportunityPipelineRef) {
      return (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--nw-spacing-lg)',
            color: 'var(--nw-color-text-secondary)'
          }}
        >
          <p>
            {getTranslationFromI18nKeyAndLabel(
              'crm.opportunity.noStageAssigned',
              'No sales pipeline assigned to this opportunity'
            )}
          </p>
        </div>
      )
    }

    return undefined
  }, [
    loadingStages,
    stagesError,
    opportunityStages,
    opportunityData?.opportunityPipelineRef,
    crmPipelineConfig,
    opportunityData?.opportunityPipelineStage?.value,
    opportunityId,
    stageConditionStatuses,
    props.accessToken,
    opportunityData?.opportunityStatus?.value
  ])

  if (loading && !opportunityData) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !opportunityData) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p style={{ color: 'var(--nw-color-danger-500)' }} data-testid="opportunity-error-text">
            {error || getTranslationFromI18nKeyAndLabel('crm.opportunity.notFound', 'Opportunity not found')}
          </p>
          <Button
            onClick={onBack}
            style={{ marginTop: 'var(--nw-spacing-md)' }}
            variant="default"
            data-testid="opportunity-error-back-button"
          >
            {getTranslationFromI18nKeyAndLabel('crm.opportunity.back', getBackButtonText())}
          </Button>
        </div>
      </div>
    )
  }

  const gradeFallback = getTranslationFromI18nKeyAndLabel('crm.common.notAvailable', 'N/A')

  const headerTitle = (
    <div className="gba:flex gba:items-center gba:gap-2">
      <span>
        {opportunityData.name || getTranslationFromI18nKeyAndLabel('crm.opportunity.unnamed', 'Unnamed Opportunity')}
      </span>
      <AiScoreRecordBadge
        score={opportunityData.aiOpportunityScore}
        grade={opportunityData.aiOpportunityGrade}
        gradeFallback={gradeFallback}
        dataTestId="opportunity-ai-score-badge"
      />
    </div>
  )

  const subViewsConfig = {
    defaultValue: activeTab,
    onValueChange: (val: string) => {
      const next = ALLOWED_TABS.includes(val as TabKey) ? (val as TabKey) : 'overview'
      setActiveTab(next)
      if (globalThis.window !== undefined) {
        const params = new URLSearchParams(globalThis.location.search)
        params.set('tab', next)
        globalThis.history.replaceState(null, '', `${globalThis.location.pathname}?${params.toString()}`)
      }
    },
    items: [
      {
        value: 'overview',
        label: getTranslationFromI18nKeyAndLabel('crm.common.overview', 'Overview'),
        icon: <UserIcon size={16} style={{ marginRight: 'var(--nw-spacing-xs)' }} />,
        content: (
          <HomeView
            opportunityId={opportunityId}
            opportunityData={opportunityData}
            activities={activities}
            notes={notes}
            tasks={tasks}
            approvals={approvals}
            stageConditionStatuses={stageConditionStatuses || []}
            activitiesLoading={activitiesLoading}
            activitiesError={activitiesError}
            loadSectionData={refreshSectionDataSilently}
            stageConditionActionProps={stageConditionActionProps}
            {...props}
          />
        )
      },
      {
        value: 'documents',
        label: getTranslationFromI18nKeyAndLabel('crm.common.documents', 'Documents'),
        icon: <FolderIcon size={16} style={{ marginRight: 'var(--nw-spacing-xs)' }} />,
        content: (
          <div className="gba:col-span-12">
            <DocumentView opportunityId={opportunityId} {...props} />
          </div>
        )
      }
    ]
  }

  return (
    <RecordLayout
      data-testid="opportunity-record-detail"
      className="gba:opportunity-details-container"
      headerOrientation="horizontal"
      headerAvatar={<IconAvatar icon={LightbulbIcon} variant="decorative" size="xl" />}
      headerOverline="OPPORTUNITY"
      onBack={onBack}
      headerTitle={headerTitle}
      headerMeta={headerMeta}
      headerActions={headerActions}
      headerActionButton={headerActionButton}
      headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
      headerSlotAfter={headerContent}
      views={subViewsConfig.items}
      defaultView={subViewsConfig.defaultValue}
      onViewChange={subViewsConfig.onValueChange}
    />
  )
}

interface OpportunityRecordProps extends BusinessAppContextProps {
  opportunityId?: string
  source?: string
  onBack?: () => void
}

const OpportunityRecord: React.FC<OpportunityRecordProps> = props => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const opportunityId = props.opportunityId || urlParams.get('opportunityId') || urlParams.get('id')

  const source = props.source || urlParams.get('source')
  const fromEntity = urlParams.get('fromEntity')

  const getBackButtonText = () => {
    switch (fromEntity) {
      case 'leads':
        return 'Back to Leads'
      case 'accounts':
        return 'Back to Accounts'
      case 'contacts':
        return 'Back to Contacts'
      case 'salesPerformance':
        return 'Back to Sales Performance'
      default:
        return 'Back to Opportunities'
    }
  }

  const handleBack = () => {
    if (props.onBack) {
      props.onBack()
    } else {
      // Navigate back based on fromEntity first, then source
      switch (fromEntity) {
        case 'salesPerformance':
          // Check if there's an employee ID to navigate back to specific employee performance
          const employeeId = urlParams.get('employeeId')
          const salesPerformanceUrl = employeeId
            ? `/platform/crm/sales-performance?employeeId=${employeeId}`
            : '/platform/crm/sales-performance'
          navigateTo(salesPerformanceUrl)
          break
        default:
          // Default back navigation based on source
          switch (source) {
            case 'investments':
              navigateTo('/platform/irm/investment-relations?view=opportunities')
              break
            case 'customer-relations':
            default:
              navigateTo('/platform/crm/customer-relations?view=opportunities')
              break
          }
          break
      }
    }
  }

  if (!opportunityId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg" style={{ color: 'var(--nw-color-danger-500)' }}>
            {getTranslationFromI18nKeyAndLabel('crm.opportunity.idRequired', 'Opportunity ID is required')}
          </p>
          <Button onClick={handleBack} className="gba:mt-4" variant="default">
            {getBackButtonText()}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <OpportunityRecordContent
      {...props}
      opportunityId={opportunityId}
      onBack={handleBack}
      getBackButtonText={getBackButtonText}
      fromEntity={fromEntity}
    />
  )
}

export { OpportunityRecord, OpportunityRecordContent }

export default OpportunityRecord
