import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Spinner,
  Button,
  RecordLayout,
  Badge,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
} from '@newwork/nw-design-system'
import {
  User,
  FileText,
  Star,
  Lightbulb as LightbulbIcon,
  Trash as Trash2,
  PencilSimple as Edit
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useInvestmentOpportunity } from '@/common/data/investment/hooks/useInvestmentOpportunity'
import { formatCurrency, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { getOpportunityStatusBadgeVariant, getOpportunityForecastBadgeVariant } from '@/common/utils/badgeUtils'
import { useAiSummary } from './hooks/useAiSummary'
import { AiActions, AiAction } from '@/common/components/common-relations/record-sections/header-section/ai-actions'
import { AppAction } from '@/components/app-action'
import { Bot } from 'lucide-react'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { useProspectRejectionReasons } from '@/common/data/investment/hooks/useProspectRejectionReasons'
import type { RejectionReason } from '@/common/data/investment/types/rejectionReasonTypes'
import ConditionSection from '@/common/components/common-relations/record-sections/condition-section/ConditionSection'
import InvestmentSection from '@/common/components/common-relations/record-sections/investment-section/InvestmentSection'
import { OpportunityStageProgression } from '@/common/components/common-relations/record-sections/opportunity-pipeline-section/OpportunityStageProgression'
import type { OpportunityPipelineContextConfig } from '@/common/components/common-relations/record-sections/opportunity-pipeline-section/types'
import { getEmployeeName } from '@/common/components/common-relations/record-sections/opportunity-pipeline-section/utils'
import type { Stage, StageCondition } from '@/components/stage-progression/types'
import { isOpportunityOpen } from './utils/opportunityStatusUtils'
import { buildInvestmentFromOpportunity } from './utils/opportunityDataTransformers'
import { buildFormFieldsFromCatalogData } from '../utils/investmentFieldsBuilder'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import { DocumentSection, type DocumentItem } from '@/components/document-section'
import {
  useGetInvestmentActivitiesByOpportunityId,
  useGetInvestmentNotesByOpportunityId,
  useGetInvestmentTasksByOpportunityId
} from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { useInvestment } from '@/common/data/investment/hooks/useInvestment.new'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { startProcess } from '@/common/utils/start-process'
import {
  getIrmDocumentApiConfig,
  useGetIrmDocuments,
  transformInvestmentDocuments
} from '@/business-apps/irm/common/utils/documentUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface OpportunityRecordContentProps extends BusinessAppContextProps {
  opportunityId: string
  fromEntity?: string | null
}

const InvestmentOpportunityRecordContent: React.FC<OpportunityRecordContentProps> = ({ opportunityId, ...props }) => {
  const ALLOWED_TABS = ['overview', 'documents'] as const
  type TabKey = (typeof ALLOWED_TABS)[number]
  const [activeTab, setActiveTab] = useState('overview')

  // Initialize activeTab from URL on mount and write default if missing
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const initial = params.get('tab') || 'overview'
    const validated = ALLOWED_TABS.includes(initial as TabKey) ? (initial as TabKey) : 'overview'
    setActiveTab(validated)
    if (!params.get('tab') || initial !== validated) {
      params.set('tab', validated)
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    }
    const onPopState = () => {
      const p = new URLSearchParams(window.location.search)
      const t = p.get('tab') || 'overview'
      setActiveTab(ALLOWED_TABS.includes(t as TabKey) ? (t as TabKey) : 'overview')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  // Use new declarative hook for opportunity data
  const {
    opportunity: opportunityData,
    loading,
    error,
    refetch
  } = useInvestmentOpportunity(props.accessToken, opportunityId)
  const graphQLClient = useGraphQLClient(props.accessToken)

  const [stageConditionStatuses, setStageConditionStatuses] = useState<any[]>([])
  const [opportunityStages, setOpportunityStages] = useState<any[]>([])
  const [catalogStageConditions, setCatalogStageConditions] = useState<any[]>([])
  const [loadingStages, setLoadingStages] = useState(false)
  const [stagesError, setStagesError] = useState<string | null>(null)

  // Divestment investment data (fetched separately for DIVESTMENT_DEAL using declarative hook)
  const divestmentId = opportunityData?.dealType === 'DIVESTMENT_DEAL' ? opportunityData?.divestmentId : undefined
  const { investment: divestmentInvestment, loading: divestmentLoading } = useInvestment(
    props.accessToken,
    divestmentId
  )

  // Back navigation based on deal type
  const handleDealTypeBack = useCallback(async () => {
    if (opportunityData?.dealType === 'DIVESTMENT_DEAL') {
      // Divestment deals → back to exit opportunities
      navigateTo(
        buildPlatformUrl('/platform/irm/investment-management', {
          view: 'divestments',
          tab: 'exit-opportunities'
        })
      )
    } else {
      // Investment deals (and others) → back to investment relations
      navigateTo(buildPlatformUrl('/platform/irm/investment-relations', { view: 'opportunities' }))
    }
  }, [opportunityData?.dealType])

  const getDealTypeBackButtonText = useCallback(() => {
    if (opportunityData?.dealType === 'DIVESTMENT_DEAL') {
      return 'Back to Exit Opportunities'
    }
    return 'Back to Investment Relations'
  }, [opportunityData?.dealType])

  // Helper function to extract IRM stage conditions (reduces cognitive complexity)
  const extractIrmStageConditions = useCallback(
    (stageConditionStatuses: any[], stage: Stage): StageCondition[] => {
      const stageCatalogConditions = catalogStageConditions.filter(
        catalogCondition => catalogCondition.parentEntryId === stage.id
      )

      return stageCatalogConditions.map(catalogCondition => {
        const statusRecord = stageConditionStatuses.find(
          statusData => statusData.opportunityPipelineStageConditionRef === catalogCondition.id
        )

        const config = statusRecord?.configSnapshot || catalogCondition.objectValue || {}
        const checkedType = config.check_type === 'MANUAL' ? 'User' : 'Automated'

        return {
          id: catalogCondition.id,
          title: catalogCondition.value || 'Unknown Condition',
          isCompleted: statusRecord?.completed || false,
          checkedType: checkedType as 'Automated' | 'User' | 'Manager' | 'Owner',
          completedBy: statusRecord?.completedByEmployee ? getEmployeeName(statusRecord.completedByEmployee) : null
        }
      })
    },
    [catalogStageConditions]
  )

  // IRM-specific configuration for OpportunityStageProgression
  const irmPipelineConfig: OpportunityPipelineContextConfig = useMemo(
    () => ({
      transitionFlowContext: FlowContextName.investmentOpportunityStageTransition,
      opportunityIdField: 'opportunityId',
      targetStageRefField: 'targetStageRef',
      extractStageConditions: extractIrmStageConditions,
      isTooltipEnabled: isOpportunityOpen
    }),
    [extractIrmStageConditions]
  )

  // Extract stageConditionStatuses from opportunityData
  useEffect(() => {
    if (opportunityData?.opportunityStageConditions) {
      setStageConditionStatuses(opportunityData.opportunityStageConditions)
    } else {
      setStageConditionStatuses([])
    }
  }, [opportunityData?.opportunityStageConditions])

  // Refetch function for process completion events
  const refetchOpportunityData = useCallback(async () => {
    await refetch()
  }, [refetch])

  // Fetch catalog conditions for stages
  const fetchCatalogConditions = useCallback(
    async (stageIds: string[]) => {
      if (!stageIds.length || !props.accessToken) {
        setCatalogStageConditions([])
        return
      }

      try {
        const GET_STAGE_CONDITIONS = `
        query GetStageConditions($stageIds: [String!]!) {
          conditions: CatalogEntry(
            where: {
              catalog: { identifier: { _eq: "InvestmentOpportunityPipelineStageCondition" } }
              parentEntryId: { _in: $stageIds }
              isDeleted: { _eq: false }
            }
            orderBy: { additionalValue1: ASC }
          ) {
            id
            code
            value
            parentEntryId
            additionalValue1
            objectValue
            type
          }
        }
      `

        const result = await graphQLClient.request<{ conditions: any[] }>(GET_STAGE_CONDITIONS, { stageIds })
        setCatalogStageConditions(result.conditions || [])
      } catch (err) {
        console.error('Error fetching catalog stage conditions:', err)
        setCatalogStageConditions([])
      }
    },
    [props.accessToken, graphQLClient]
  )

  // Fetch opportunity stages from pipeline childEntries
  const fetchOpportunityStages = useCallback(async () => {
    try {
      setLoadingStages(true)
      setStagesError(null)
      const childEntries = (opportunityData?.opportunityPipeline as any)?.childEntries
      if (childEntries?.length) {
        const sorted = [...(childEntries as any[])].sort(
          (a: any, b: any) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0)
        )
        const stageData = sorted.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value,
          alternativeCode: entry.alternativeCode
        }))
        setOpportunityStages(stageData)

        // Fetch catalog conditions for all stages
        await fetchCatalogConditions(stageData.map(s => s.id))
      } else {
        setOpportunityStages([])
        setCatalogStageConditions([])
      }
    } catch (err) {
      console.error('Error mapping investment opportunity pipeline stages:', err)
      setStagesError(err instanceof Error ? err.message : 'Failed to fetch stages')
      setOpportunityStages([])
      setCatalogStageConditions([])
    } finally {
      setLoadingStages(false)
    }
  }, [opportunityData?.opportunityPipeline, fetchCatalogConditions])

  // Fetch stages when opportunityData is available
  useEffect(() => {
    if (opportunityData) {
      fetchOpportunityStages()
    }
  }, [opportunityData, fetchOpportunityStages])

  // AI Summary hook for HeaderSection
  const aiSummaryHook = useAiSummary(opportunityId, props.accessToken)

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

  // Activity data loading
  const { fetchInvestmentActivitiesByOpportunityId } = useGetInvestmentActivitiesByOpportunityId(props)
  const [activities, setActivities] = useState<any[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)

  // Notes and Tasks data loading
  const { fetchInvestmentNotesByOpportunityId } = useGetInvestmentNotesByOpportunityId(props)
  const { fetchInvestmentTasksByOpportunityId } = useGetInvestmentTasksByOpportunityId(props)
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])

  // Documents data loading
  const { fetchDocuments: fetchOpportunityDocuments } = useGetIrmDocuments('opportunity', props)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsError, setDocumentsError] = useState<string | null>(null)

  // State for rejection reasons
  const [rejectionReasons, setRejectionReasons] = useState<RejectionReason[]>([])
  const [rejectionReasonsError, setRejectionReasonsError] = useState<string | null>(null)
  const { fetchByOpportunity } = useProspectRejectionReasons(props)

  const loadActivities = async () => {
    if (!opportunityId) return

    setActivitiesLoading(true)
    setActivitiesError(null)

    try {
      const result = await fetchInvestmentActivitiesByOpportunityId(opportunityId)
      const sortedActivities = (result || []).sort((a, b) => {
        const dateA = new Date(a.occurredAt || a.createdAt).getTime()
        const dateB = new Date(b.occurredAt || b.createdAt).getTime()
        return dateB - dateA
      })
      setActivities(sortedActivities)
    } catch (err) {
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities')
    } finally {
      setActivitiesLoading(false)
    }
  }

  const loadNotes = async () => {
    if (!opportunityId) return
    try {
      const result = await fetchInvestmentNotesByOpportunityId(opportunityId)
      setNotes(result || [])
    } catch (err) {
      console.error('Failed to load notes:', err)
    }
  }

  const loadTasksAndApprovals = async () => {
    if (!opportunityId) return
    try {
      const result = await fetchInvestmentTasksByOpportunityId(opportunityId)
      const allTasks = result || []

      // Separate regular tasks from approval tasks
      const regularTasks = allTasks.filter(task => {
        const taskTypeValue = task.taskType?.value || task.taskType?.code
        const isApprovalTask = taskTypeValue?.toLowerCase() === 'approval'
        return !isApprovalTask
      })

      const approvalTasks = allTasks.filter(task => {
        const taskTypeValue = task.taskType?.value || task.taskType?.code
        const isApprovalTask = taskTypeValue?.toLowerCase() === 'approval'
        return isApprovalTask
      })

      setTasks(regularTasks)
      setApprovals(approvalTasks)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
  }

  const loadDocuments = async () => {
    if (!opportunityId) return

    setDocumentsLoading(true)
    setDocumentsError(null)

    try {
      const result = await fetchOpportunityDocuments(opportunityId)
      const transformedDocuments = transformInvestmentDocuments(result || [])
      setDocuments(transformedDocuments)
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setDocumentsLoading(false)
    }
  }

  // Load all data on mount and when opportunityId changes
  useEffect(() => {
    loadActivities()
    loadNotes()
    loadTasksAndApprovals()
    loadDocuments()
  }, [opportunityId])

  // Load rejection reasons function
  const loadRejectionReasons = useCallback(async () => {
    if (!opportunityId || !props.accessToken) return
    setRejectionReasonsError(null)
    try {
      const reasons = await fetchByOpportunity(opportunityId)
      setRejectionReasons(reasons)
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : getTranslationFromI18nKeyAndLabel('rejection.error.loadFailed', 'Failed to load rejection reasons')
      setRejectionReasonsError(errorMessage)
      setRejectionReasons([])
    }
  }, [opportunityId, props.accessToken, fetchByOpportunity])

  // Load rejection reasons on mount
  useEffect(() => {
    loadRejectionReasons()
  }, [loadRejectionReasons])

  useProcessCompletion({
    onSuccess: () => {
      refetchOpportunityData()
      fetchOpportunityStages() // Refetch stages and catalog conditions after stage transition
      loadActivities()
      loadNotes()
      loadTasksAndApprovals()
      loadDocuments()
      loadRejectionReasons() // Refresh rejection reasons after process completion
    }
  })

  // Memoize stage condition action props to prevent recreation
  const stageConditionActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentOpportunityConditionUpdate],
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
            context: FlowContextName.investmentOpportunityEntity,
            contextData: { opportunityId }
          }
        ]}
        shareContext={{
          entityType: 'investment-opportunity',
          entityId: opportunityId,
          entityName: opportunityData?.name || 'Opportunity',
          entityUrl: `/platform/irm/opportunity-record?opportunityId=${opportunityId}`
        }}
        prefixDataTestId="opportunity-record-action"
        accessToken={props.accessToken}
      />
    ),
    [opportunityId, opportunityData?.name, props.accessToken]
  )

  // Memoize action props to prevent recreation and unnecessary re-renders
  const taskActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentTaskCreate],
      externalContextData: { opportunityId },
      prefixDataTestId: 'opportunity-task'
    }),
    [opportunityId]
  )

  const approvalActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentTaskCreate],
      externalContextData: { opportunityId, typeRef: 'InvestmentTaskType:v1:APPROVAL' },
      prefixDataTestId: 'opportunity-approval'
    }),
    [opportunityId]
  )

  const noteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentNoteCreate],
      externalContextData: { opportunityId },
      prefixDataTestId: 'opportunity-note'
    }),
    [opportunityId]
  )

  const noteEntityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentNoteEntity],
      externalContextData: { opportunityId },
      prefixDataTestId: 'opportunity-note-entity'
    }),
    [opportunityId]
  )

  const approvalEntityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentTaskEntity],
      externalContextData: { opportunityId },
      prefixDataTestId: 'opportunity-approval-entity'
    }),
    [opportunityId]
  )

  const activityEntityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentActivityEntity],
      externalContextData: { opportunityId },
      prefixDataTestId: 'opportunity-activity-entity'
    }),
    [opportunityId]
  )

  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        opportunityId,
        folder: true
      },
      prefixDataTestId: 'opportunity-document-create-folder'
    }),
    [opportunityId]
  )

  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        opportunityId
      },
      prefixDataTestId: 'opportunity-document-upload'
    }),
    [opportunityId]
  )

  const activityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentActivityCreate],
      externalContextData: {
        opportunityId,
        opportunity: opportunityId,
        investmentActivity: { opportunity: opportunityId }
      },
      prefixDataTestId: 'add-activity'
    }),
    [opportunityId]
  )

  // Rejection reasons badge - MUST be defined before headerTitle
  const rejectionReasonsBadge = useMemo(() => {
    if (!props.accessToken || !opportunityId) return null

    // Show error state if rejection reasons failed to load
    if (rejectionReasonsError) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="destructive"
                className="gba:cursor-pointer gba:hover:opacity-80"
                data-testid="opportunity-rejection-reasons-error-badge"
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
      ? getTranslationFromI18nKeyAndLabel('rejection.badge.rejected', 'Rejected')
      : getTranslationFromI18nKeyAndLabel('rejection.badge.noReasons', 'No Rejection Reason')

    return (
      <AppAction
        contextsArray={[FlowContextName.investmentOpportunityReject]}
        externalContextData={{ opportunityId }}
        prefixDataTestId="opportunity-rejection-reasons"
        accessToken={props.accessToken}
        emptyStateBehavior="enable"
        deferMainContextRequestsUntilClick
      >
        <Badge
          variant={badgeVariant}
          className="gba:cursor-pointer gba:hover:opacity-80"
          data-testid="opportunity-rejection-reasons-badge"
        >
          {badgeText}
        </Badge>
      </AppAction>
    )
  }, [props.accessToken, opportunityId, rejectionReasons, rejectionReasonsError, loadRejectionReasons])

  // Memoize RecordLayout data to prevent unnecessary re-renders (must be before early returns)
  const headerMeta = useMemo(() => {
    // Forecast badge
    const forecast = opportunityData?.opportunityForecast
    const forecastValue = forecast?.value || forecast?.code || ''
    const forecastAdditionalValue1 = forecast?.additionalValue1 || ''
    const forecastDisplayValue = forecastAdditionalValue1
      ? `${forecastValue}: ${forecastAdditionalValue1}`
      : forecastValue

    // Get associated investment (1-to-1 relationship)
    const associatedInvestment = opportunityData?.investment?.find((inv: any) => !inv.isDeleted)

    return (
      <div className="gba:flex gba:items-center gba:gap-2">
        {opportunityData?.opportunityStatus?.value && (
          <AppAction
            contextsArray={[FlowContextName.investmentOpportunityStatusUpdate]}
            externalContextData={{ opportunityId }}
            prefixDataTestId="opportunity-status-update"
            accessToken={props.accessToken}
            emptyStateBehavior="enable"
            deferMainContextRequestsUntilClick
          >
            <Badge
              variant={getOpportunityStatusBadgeVariant(opportunityData.opportunityStatus)}
              className="gba:gap-1 gba:cursor-pointer hover:gba:opacity-80"
              data-testid="opportunity-status-badge"
            >
              {opportunityData.opportunityStatus.value}
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
        {/* Associated Investment Badge - Only show if association exists */}
        {associatedInvestment?.id && (
          <button
            type="button"
            onClick={() =>
              navigateTo(
                buildPlatformUrl('/platform/irm/investment-record', {
                  investmentId: associatedInvestment.id
                })
              )
            }
            className="gba:bg-transparent gba:border-0 gba:p-0"
            data-testid="opportunity-associated-investment-link"
          >
            <Badge variant="outline" className="gba:cursor-pointer gba:hover:opacity-80">
              {getTranslationFromI18nKeyAndLabel('opportunity.associatedInvestment.label', 'Associated Investment')}:{' '}
              {associatedInvestment.name}
            </Badge>
          </button>
        )}
      </div>
    )
  }, [
    opportunityData?.estimatedAmount,
    opportunityData?.currency?.id,
    opportunityData?.opportunityStatus?.value,
    opportunityData?.opportunityForecast,
    opportunityData?.investment,
    opportunityId,
    props.accessToken
  ])

  // Transform catalog referenceFields to formFields format for InvestmentSection
  const investmentFields = useMemo(
    () => buildFormFieldsFromCatalogData(opportunityData?.investmentType, opportunityData?.investmentGroup),
    [opportunityData?.investmentType, opportunityData?.investmentGroup]
  )

  // Helper function to convert deal type codes to human-readable values
  const getDealTypeDisplayValue = (dealType: string | undefined): string => {
    if (!dealType) return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')

    const dealTypeMap: Record<string, string> = {
      INVESTMENT_DEAL: getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType.investment', 'Investment Deal'),
      DIVESTMENT_DEAL: getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType.divestment', 'Divestment Deal'),
      REFINANCING_DEAL: getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType.refinancing', 'Refinancing Deal'),
      ACQUISITION_DEAL: getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType.acquisition', 'Acquisition Deal'),
      MERGER_DEAL: getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType.merger', 'Merger Deal')
    }

    return dealTypeMap[dealType] || dealType // Fallback to original value if not mapped
  }

  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'opportunity-details',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType', 'Deal Type'),
            value: getDealTypeDisplayValue(opportunityData?.dealType),
            icon: Star
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
              : getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.currency', 'Currency'),
            value: extractCurrencyCode(opportunityData?.currency?.id || 'Currency:v1:EUR')
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.opportunity.estimatedAmount', 'Estimated Amount'),
            value: opportunityData?.estimatedAmount
              ? formatCurrency(opportunityData.estimatedAmount, opportunityData.currency?.id || 'Currency:v1:EUR')
              : getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.owner', 'Owner'),
            value: opportunityData?.ownerEmployee
              ? `${opportunityData.ownerEmployee.firstName} ${opportunityData.ownerEmployee.lastName}`
              : getTranslationFromI18nKeyAndLabel('crm.common.notAssigned', 'Not assigned'),
            icon: User
          }
        ]
      }
    ],
    [
      opportunityData?.dealType,
      opportunityData?.closeDate,
      opportunityData?.currency?.id,
      opportunityData?.estimatedAmount,
      opportunityData?.ownerEmployee
    ]
  )

  const headerActions = useMemo(() => {
    const actions: AiAction[] = [
      {
        key: 'ai-summary',
        label: getTranslationFromI18nKeyAndLabel('crm.ai.summary', 'AI Summary'),
        icon: <Bot size={16} />,
        hook: aiSummaryHook,
        config: {
          entityType: 'opportunity',
          loadingMessage: getTranslationFromI18nKeyAndLabel('crm.ai.summary.loading', 'Generating AI Summary...'),
          loadingSubtitle: getTranslationFromI18nKeyAndLabel(
            'crm.ai.summary.subtitle',
            'Analyzing opportunity data and activities'
          )
        }
      }
    ]

    return (
      <AiActions
        actions={actions}
        dataTestId={`opportunity-update-button-${opportunityId}`}
        buttonText={getTranslationFromI18nKeyAndLabel('crm.ai.summary', 'AI Summary')}
      />
    )
  }, [aiSummaryHook, opportunityId])

  const headerContent = useMemo(() => {
    const isReadonly = !isOpportunityOpen(opportunityData?.opportunityStatus?.value)

    return !loadingStages &&
      !stagesError &&
      opportunityStages.length > 0 &&
      opportunityData?.opportunityPipelineStage ? (
      <OpportunityStageProgression
        currentStage={opportunityData?.opportunityPipelineStage?.value || 'Discovery'}
        stages={opportunityStages}
        opportunityId={opportunityId}
        stageConditionStatuses={stageConditionStatuses || []}
        accessToken={props.accessToken}
        readonly={isReadonly}
        opportunityStatus={opportunityData?.opportunityStatus?.value}
        contextConfig={irmPipelineConfig}
      />
    ) : loadingStages ? (
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
    ) : stagesError ? (
      <div style={{ textAlign: 'center', padding: 'var(--nw-spacing-lg)', color: 'var(--nw-color-danger-500)' }}>
        <p>
          {getTranslationFromI18nKeyAndLabel('crm.opportunity.failedToLoadStages', 'Failed to load pipeline stages')}:{' '}
          {stagesError}
        </p>
      </div>
    ) : !opportunityData?.opportunityPipelineStage ? (
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
            'No pipeline stage assigned to this opportunity'
          )}
        </p>
      </div>
    ) : undefined
  }, [
    loadingStages,
    stagesError,
    opportunityStages,
    opportunityData?.opportunityPipelineStage,
    opportunityData?.opportunityPipelineStage?.value,
    opportunityId,
    stageConditionStatuses,
    props.accessToken,
    opportunityData?.opportunityStatus?.value
  ])

  if (loading) {
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
            {error || getTranslationFromI18nKeyAndLabel('crm.opportunity.notFound', 'Investment Opportunity not found')}
          </p>
          <Button
            onClick={handleDealTypeBack}
            style={{ marginTop: 'var(--nw-spacing-md)' }}
            variant="default"
            data-testid="opportunity-error-back-button"
          >
            {getTranslationFromI18nKeyAndLabel('crm.opportunity.back', getDealTypeBackButtonText())}
          </Button>
        </div>
      </div>
    )
  }

  const subViewsConfig = {
    defaultValue: activeTab,
    onValueChange: (val: string) => {
      const next = ALLOWED_TABS.includes(val as TabKey) ? (val as TabKey) : 'overview'
      setActiveTab(next)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        params.set('tab', next)
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
      }
    },
    items: [
      {
        value: 'overview',
        label: getTranslationFromI18nKeyAndLabel('crm.common.overview', 'Overview'),
        icon: <User size={16} style={{ marginRight: 'var(--nw-spacing-xs)' }} />,
        content: (
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
                    accounts: opportunityData?.opportunityAccounts?.map(a => a.account).filter(Boolean) || [],
                    account: opportunityData?.opportunityAccounts?.[0]?.account,
                    accountId: opportunityData?.opportunityAccounts?.[0]?.accountId,
                    accountIds: opportunityData?.opportunityAccounts?.map(a => a.accountId).filter(Boolean),
                    recordUrl: opportunityData?.opportunityAccounts?.[0]?.accountId
                      ? buildPlatformUrl('/platform/irm/account-record', {
                          accountId: opportunityData.opportunityAccounts[0].accountId,
                          source: 'opportunity-relations',
                          fromEntity: 'opportunities'
                        })
                      : undefined,
                    actionButtonProps: {
                      contextsArray: [FlowContextName.investmentAccountEntity],
                      externalContextData: { accountId: opportunityData?.opportunityAccounts?.[0]?.accountId },
                      prefixDataTestId: 'investment-opportunity-account-action'
                    }
                  }
                }
              ]}
              data-testid="opportunity-account-section-wrapper"
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
                    contacts: opportunityData?.opportunityContacts
                      ?.map((ioc: any) => ({
                        ...ioc.contact,
                        contactType: ioc.contactType
                      }))
                      .filter(Boolean),
                    contactId: opportunityData?.opportunityContacts?.[0]?.contact?.id,
                    recordUrl: opportunityData?.opportunityContacts?.[0]?.contact?.id
                      ? buildPlatformUrl('/platform/irm/contact-record', {
                          contactId: opportunityData.opportunityContacts[0].contact.id,
                          source: 'opportunity-relations',
                          fromEntity: 'opportunities'
                        })
                      : undefined,
                    actionButtonProps: {
                      contextsArray: [FlowContextName.investmentContactEntity],
                      externalContextData: {
                        contactId: opportunityData?.opportunityContacts?.[0]?.contact?.id
                      },
                      prefixDataTestId: 'investment-opportunity-contact-action'
                    }
                  }
                }
              ]}
              data-testid="opportunity-contact-section-wrapper"
            />

            {/* Investment Information - 2/4 width (half) */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-1"
              sections={[
                {
                  id: 'investment-section',
                  component: InvestmentSection,
                  props:
                    opportunityData?.dealType === 'DIVESTMENT_DEAL'
                      ? {
                          // DIVESTMENT_DEAL: Use full investment entity fetched separately
                          // No fields prop - let InvestmentSection fetch from catalog (record: true)
                          ...props,
                          investment: divestmentInvestment || undefined,
                          investments: divestmentInvestment ? [divestmentInvestment] : undefined,
                          // recordUrl not needed - InvestmentSection auto-generates for real entities
                          isLoading: loading || divestmentLoading,
                          error: error,
                          actionButtonProps: divestmentInvestment?.id
                            ? {
                                contextsArray: [FlowContextName.investmentEntity],
                                externalContextData: { investmentId: divestmentInvestment.id },
                                prefixDataTestId: 'opportunity-divestment-investment'
                              }
                            : undefined
                        }
                      : {
                          // INVESTMENT_DEAL (and others): Keep existing behavior
                          // Use synthetic investment built from opportunity + parent-provided fields
                          ...props,
                          investment: buildInvestmentFromOpportunity(opportunityData) || undefined,
                          investments: opportunityData
                            ? [buildInvestmentFromOpportunity(opportunityData)].filter(
                                (inv): inv is NonNullable<typeof inv> => inv !== null
                              )
                            : undefined,
                          fields: investmentFields,
                          recordUrl: undefined, // No navigation - investment data is part of opportunity
                          isLoading: loading,
                          error: error
                        }
                }
              ]}
              data-testid="opportunity-investment-section-wrapper"
            />

            {/* Stage Conditions - 1/2 of left side, row span 2 */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4 gba:row-span-2"
              key={`condition-section-${opportunityId}-${stageConditionStatuses.length}-${stageConditionStatuses.filter(s => s.completed).length}`}
              sections={[
                {
                  id: 'condition-section',
                  component: ConditionSection,
                  props: {
                    ...props,
                    opportunity: opportunityData,
                    stageConditionStatuses: stageConditionStatuses || [],
                    stageConditionActionProps: {
                      ...stageConditionActionProps,
                      emptyStateBehavior: 'enable'
                    }
                  }
                }
              ]}
              data-testid="opportunity-condition-section-wrapper"
            />

            {/* Tasks/Approvals Tabbed - 1/2 of left side, row span 2 */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4 gba:row-span-2"
              sections={[
                {
                  id: 'tasks-section',
                  component: TaskSection,
                  props: {
                    ...props,
                    opportunityId: opportunityId,
                    buildReferenceUrl,
                    tasks: tasks,
                    taskActionProps: {
                      ...taskActionProps,
                      emptyStateBehavior: 'enable'
                    },
                    taskEntityActionProps: {
                      contextsArray: [FlowContextName.investmentTaskEntity],
                      externalContextData: { opportunityId },
                      prefixDataTestId: 'opportunity-task-entity',
                      emptyStateBehavior: 'enable'
                    }
                  }
                },
                {
                  id: 'approval-tasks-section',
                  component: TaskSection,
                  props: {
                    ...props,
                    sectionTitle: 'Approval Tasks',
                    buildReferenceUrl,
                    tasks: approvals,
                    taskActionProps: {
                      ...approvalActionProps,
                      emptyStateBehavior: 'enable'
                    },
                    taskEntityActionProps: {
                      ...approvalEntityActionProps,
                      emptyStateBehavior: 'enable'
                    }
                  }
                }
              ]}
              data-testid="opportunity-tasks-approvals-section-wrapper"
            />

            {/* Activities - Right aligned, row span 4, starts same row as conditions/tasks */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4 gba:row-span-4"
              sections={[
                {
                  id: 'activities-section',
                  component: ActivitySection,
                  props: {
                    ...props,
                    activities: activities,
                    activitiesLoading: activitiesLoading,
                    activitiesError: activitiesError,
                    onReloadActivities: loadActivities,
                    alignment: 'right',
                    activitySectionActionProps: {
                      ...activityActionProps,
                      emptyStateBehavior: 'enable'
                    },
                    activityEntityActionProps: {
                      ...activityEntityActionProps,
                      emptyStateBehavior: 'enable'
                    }
                  }
                }
              ]}
              data-testid="opportunity-activities-section-wrapper"
            />

            {/* Notes - Full width of left side (2/2) */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-8 gba:lg:col-span-8 gba:row-span-2"
              sections={[
                {
                  id: 'notes-section',
                  component: NoteSection,
                  props: {
                    ...props,
                    notes: notes,
                    noteActionProps: {
                      ...noteActionProps,
                      emptyStateBehavior: 'enable'
                    },
                    noteEntityActionProps: {
                      ...noteEntityActionProps,
                      emptyStateBehavior: 'enable'
                    }
                  }
                }
              ]}
              data-testid="opportunity-notes-section-wrapper"
            />
          </>
        )
      },
      {
        value: 'documents',
        label: getTranslationFromI18nKeyAndLabel('crm.common.documents', 'Documents'),
        icon: <FileText size={16} style={{ marginRight: 'var(--nw-spacing-xs)' }} />,
        content: (
          <div className="gba:col-span-12">
            <DocumentSection
              entityId={opportunityId}
              documents={documents}
              isLoading={documentsLoading}
              error={documentsError}
              onRefresh={loadDocuments}
              apiConfig={getIrmDocumentApiConfig('opportunity')}
              customActions={[
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <Trash2 size={16} />,
                  apiEndpoint: '/investment-relations/deleteInvestmentDocument',
                  confirmMessage: 'Are you sure you want to delete this document? This action cannot be undone.'
                },
                {
                  key: 'update',
                  label: 'Update',
                  icon: <Edit size={16} />,
                  onClick: (documentId: string, document: any, entityId: string) => {
                    // Open the document update popup
                    startProcess({
                      domain: 'investment-relations',
                      processName: 'updateInvestmentDocument',
                      payload: {
                        documentId: documentId,
                        opportunityId: entityId,
                        investmentDocument: {
                          id: documentId,
                          version: document.version,
                          name: document.name,
                          documentGroupRef: document.documentGroup?.id,
                          documentTypeRef: document.documentType?.id,
                          expirationDate: document.expirationDate,
                          description: document.description,
                          folder: document.folder || false
                        }
                      },
                      builderType: 'NATIVE_SCREEN'
                    })
                  }
                }
              ]}
              createFolderActionProps={documentCreateFolderActionProps}
              uploadActionProps={documentUploadActionProps}
              data-testid="opportunity-document-section"
              {...props}
            />
          </div>
        )
      }
    ]
  }

  return (
    <div className="gba:opportunity-details-container" data-testid="investment-opportunity-detail">
      <RecordLayout
        headerOrientation="horizontal"
        headerIcon={LightbulbIcon}
        headerCategory="OPPORTUNITY"
        onBack={handleDealTypeBack}
        headerTitle={
          <div className="gba:flex gba:items-center gba:gap-2">
            <span>{opportunityData?.name || ''}</span>
            {rejectionReasonsBadge}
          </div>
        }
        headerMeta={headerMeta}
        headerActions={headerActions}
        headerActionButton={headerActionButton}
        headerDetailGroups={headerDetailGroups}
        headerContent={headerContent}
        subViews={subViewsConfig}
      />
    </div>
  )
}

interface InvestmentOpportunityRecordProps extends BusinessAppContextProps {
  opportunityId?: string
}

const OpportunityRecord: React.FC<InvestmentOpportunityRecordProps> = ({
  opportunityId: propOpportunityId,
  ...props
}) => {
  const opportunityId = useMemo(() => {
    if (propOpportunityId) return propOpportunityId
    if (typeof window === 'undefined') return undefined
    return new URLSearchParams(window.location.search).get('opportunityId') || undefined
  }, [propOpportunityId])

  if (!opportunityId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg" style={{ color: 'var(--nw-color-danger-500)' }}>
            Opportunity ID is required
          </p>
          <Button
            onClick={() =>
              navigateTo(buildPlatformUrl('/platform/irm/investment-relations', { view: 'opportunities' }))
            }
            className="gba:mt-4"
            variant="default"
          >
            Back to Investment Opportunities
          </Button>
        </div>
      </div>
    )
  }

  return <InvestmentOpportunityRecordContent opportunityId={opportunityId} {...props} />
}

export { OpportunityRecord, InvestmentOpportunityRecordContent }
export default OpportunityRecord
