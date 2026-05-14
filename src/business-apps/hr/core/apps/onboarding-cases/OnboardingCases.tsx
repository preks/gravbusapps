/**
 * Employee Onboarding Cases Application
 *
 * Lightweight standalone onboarding dashboard.
 * It intentionally uses only the case API client and keeps onboarding UI outside
 * the shared CaseManagement app while the onboarding experience is still evolving.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  HeaderSlot,
  Progress,
  RecordLayout,
  Timeline,
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle
} from '@newwork/nw-design-system'
import {
  Activity,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Flag,
  LayoutDashboard,
  ListChecks,
  Play,
  RefreshCw,
  UserPlus,
  Users,
  Workflow
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CaseApiClient } from '@/business-apps/common/apps/case-management/services'
import type {
  AddFlowRequest,
  Case,
  CaseAnalytics,
  CaseStatus,
  LinkedFlow
} from '@/business-apps/common/apps/case-management/types'
import { FlowTemplateClient, type FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

import {
  CreateOnboardingDialog,
  OnboardingKPICards,
  OnboardingDetailsPanel,
  OnboardingEmptyState,
  OnboardingTasksTab
} from './components'
import { useOnboardingTasks } from './hooks/useOnboardingTasks'
import { OnboardingMetadata, OnboardingStage, WorkLocation, getStageProgress, onboardingStageLabels } from './types'

const ONBOARDING_APP_TAG = 'AppCatalog:1:HR_ONBOARDING'

const GET_EMPLOYEES_BY_USER_IDS = `
  query GetEmployeesByUserIds($userIds: [String!]!) {
    Employee(where: { userId: { _in: $userIds } }) {
      id
      userId
      firstName
      lastName
      fullName
      displayName
      preferredName
      pictureThumbnail
    }
  }
`

type ViewState = 'dashboard' | 'list' | 'detail'

interface FlowInitiatorEmployee {
  id: string
  userId: string
  firstName?: string
  lastName?: string
  fullName?: string
  displayName?: string
  preferredName?: string
  pictureThumbnail?: string
}

export interface OnboardingCasesProps extends BusinessAppContextProps {
  /**
   * Default view to show on load
   */
  initialView?: 'dashboard' | 'list'
}

/**
 * Employee Onboarding Cases component for the HR module.
 *
 * Uses tag filtering to show only onboarding-related cases (AppCatalog:1:HR_ONBOARDING).
 */
export const OnboardingCases: React.FC<OnboardingCasesProps> = ({ initialView = 'dashboard', ...contextProps }) => {
  const [view, setView] = useState<ViewState>(initialView)
  const [cases, setCases] = useState<Case[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [selectedLinkedFlows, setSelectedLinkedFlows] = useState<LinkedFlow[]>([])
  const [isLoadingSelectedFlows, setIsLoadingSelectedFlows] = useState(false)
  const [selectedFlowsError, setSelectedFlowsError] = useState<string | null>(null)
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
  const [templateDetailsById, setTemplateDetailsById] = useState<Record<string, FlowTemplate>>({})
  const [loadingTemplateDetailId, setLoadingTemplateDetailId] = useState<string | null>(null)
  const [flowInitiatorsByUserId, setFlowInitiatorsByUserId] = useState<Record<string, FlowInitiatorEmployee>>({})
  const [onboardingTemplates, setOnboardingTemplates] = useState<FlowTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const client = useMemo(() => new CaseApiClient(undefined, contextProps.accessToken), [contextProps.accessToken])
  const graphqlClient = useGraphQLClient(contextProps.accessToken)
  const requestedInitiatorUserIdsRef = useRef<Set<string>>(new Set())

  const loadCases = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await client.getCasesList({
        tags: { app: ONBOARDING_APP_TAG }
      })
      setCases(response.cases)
    } catch (err) {
      console.error('Failed to load onboarding cases:', err)
      setError(err instanceof Error ? err.message : 'Failed to load onboarding cases')
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    void loadCases()
  }, [loadCases])

  const loadOnboardingTemplates = useCallback(async () => {
    setIsLoadingTemplates(true)
    setTemplatesError(null)

    try {
      const templateClient = new FlowTemplateClient(contextProps.accessToken)
      const response = await templateClient.getTemplatesList({
        onlyLatest: true,
        includeDrafts: true,
        tags: { app: ONBOARDING_APP_TAG },
        limit: 100
      })
      setOnboardingTemplates(response.templates || [])
    } catch (err) {
      console.error('Failed to load onboarding templates:', err)
      setTemplatesError(err instanceof Error ? err.message : 'Failed to load onboarding flows')
    } finally {
      setIsLoadingTemplates(false)
    }
  }, [contextProps.accessToken])

  useEffect(() => {
    if (view === 'detail' && selectedCaseId) {
      void loadOnboardingTemplates()
    }
  }, [loadOnboardingTemplates, selectedCaseId, view])

  const analytics = useMemo<CaseAnalytics>(() => {
    const statusDistribution: Record<CaseStatus, number> = {
      open: 0,
      in_progress: 0,
      blocked: 0,
      completed: 0,
      cancelled: 0
    }

    for (const onboardingCase of cases) {
      const status = onboardingCase.state.metadata?.status ?? 'open'
      if (status in statusDistribution) {
        statusDistribution[status as CaseStatus] += 1
      }
    }

    return {
      totalCases: cases.length,
      activeCases: cases.filter(c => {
        const status = c.state.metadata?.status ?? 'open'
        return status !== 'completed' && status !== 'cancelled'
      }).length,
      completedCases: statusDistribution.completed,
      averageCompletionTime: 0,
      casesRequiringAttention: statusDistribution.blocked,
      statusDistribution
    }
  }, [cases])

  const selectedCase = useMemo(
    () => cases.find(onboardingCase => onboardingCase.caseId === selectedCaseId) ?? null,
    [cases, selectedCaseId]
  )

  const selectedCaseLinkedFlows = useMemo(
    () => (selectedLinkedFlows.length > 0 ? selectedLinkedFlows : selectedCase?.state.linkedFlows || []),
    [selectedCase?.state.linkedFlows, selectedLinkedFlows]
  )

  const activeSelectedFlows = useMemo(
    () => selectedCaseLinkedFlows.filter(flow => !flow.removedAt),
    [selectedCaseLinkedFlows]
  )
  const activeSelectedWorkflowIds = useMemo(
    () => activeSelectedFlows.map(flow => flow.workflowId).filter(Boolean),
    [activeSelectedFlows]
  )
  const {
    tasks: currentUserOnboardingTasks,
    isLoading: isLoadingCurrentUserTasks,
    claimingTaskId,
    error: currentUserTasksError,
    claimTask,
    refetch: refreshCurrentUserTasks
  } = useOnboardingTasks({
    accessToken: contextProps.accessToken,
    userId: contextProps.userInfo?.id,
    appTag: ONBOARDING_APP_TAG,
    workflowIds: activeSelectedWorkflowIds,
    enabled: view === 'detail' && Boolean(selectedCaseId)
  })

  const loadSelectedCaseFlows = useCallback(
    async (caseId: string) => {
      setIsLoadingSelectedFlows(true)
      setSelectedFlowsError(null)

      try {
        const flows = await client.getLinkedFlows(caseId)
        setSelectedLinkedFlows(flows)
      } catch (err) {
        console.error('Failed to load linked onboarding flows:', err)
        setSelectedFlowsError(err instanceof Error ? err.message : 'Failed to load onboarding flow progress')
      } finally {
        setIsLoadingSelectedFlows(false)
      }
    },
    [client]
  )

  useEffect(() => {
    if (view !== 'detail' || !selectedCaseId) return
    void loadSelectedCaseFlows(selectedCaseId)
  }, [loadSelectedCaseFlows, selectedCaseId, view])

  useEffect(() => {
    requestedInitiatorUserIdsRef.current.clear()
  }, [selectedCaseId])

  useEffect(() => {
    if (view !== 'detail' || activeSelectedFlows.length === 0) return

    const userIds = [
      ...new Set(
        activeSelectedFlows
          .map(flow => flow.initiator || flow.addedBy)
          .filter((userId): userId is string =>
            Boolean(userId && !flowInitiatorsByUserId[userId] && !requestedInitiatorUserIdsRef.current.has(userId))
          )
      )
    ]

    if (userIds.length === 0) return
    userIds.forEach(userId => requestedInitiatorUserIdsRef.current.add(userId))

    void graphqlClient
      .request<{ Employee: FlowInitiatorEmployee[] }>(GET_EMPLOYEES_BY_USER_IDS, { userIds })
      .then(response => {
        setFlowInitiatorsByUserId(previous => {
          const next = { ...previous }
          response.Employee.forEach(employee => {
            next[employee.userId] = employee
          })
          return next
        })
      })
      .catch(err => {
        console.error('Failed to load onboarding flow initiators:', err)
      })
  }, [activeSelectedFlows, flowInitiatorsByUserId, graphqlClient, view])

  const getOnboardingMetadata = (caseItem: Case): OnboardingMetadata => {
    const metadata = caseItem.state.metadata as Partial<OnboardingMetadata> | undefined

    return {
      title: metadata?.title || 'Onboarding case',
      description: metadata?.description,
      status: metadata?.status,
      priority: metadata?.priority,
      assignedTo: metadata?.assignedTo,
      dueDate: metadata?.dueDate,
      linkedEntities: metadata?.linkedEntities,
      linkedCases: metadata?.linkedCases,
      parentCaseId: metadata?.parentCaseId,
      notes: metadata?.notes,
      employeeName: metadata?.employeeName || metadata?.title || 'New employee',
      position: metadata?.position || '-',
      department: metadata?.department || '-',
      managerId: metadata?.managerId,
      startDate: metadata?.startDate || metadata?.dueDate || caseItem.createdAt,
      onboardingStage: (metadata?.onboardingStage || 'pre_arrival') as OnboardingStage,
      mentorId: metadata?.mentorId,
      workLocation: (metadata?.workLocation || 'office') as WorkLocation,
      equipmentRequested: metadata?.equipmentRequested,
      equipmentCompleted: metadata?.equipmentCompleted,
      accessRequested: metadata?.accessRequested,
      accessGranted: metadata?.accessGranted,
      welcomeEmailSent: metadata?.welcomeEmailSent,
      documentsCompleted: metadata?.documentsCompleted,
      trainingCompleted: metadata?.trainingCompleted
    }
  }

  const openCase = (caseId: string) => {
    const caseItem = cases.find(onboardingCase => onboardingCase.caseId === caseId)
    setSelectedLinkedFlows(caseItem?.state.linkedFlows || [])
    setSelectedFlowsError(null)
    setSelectedCaseId(caseId)
    setView('detail')
  }

  const handleCaseCreated = (caseId: string) => {
    setIsCreateOpen(false)
    setSelectedCaseId(caseId)
    setView('detail')
    void loadCases()
  }

  const handleAddFlowToSelectedCase = async (caseId: string, request: AddFlowRequest) => {
    await client.addFlowToCase(caseId, request)
    await Promise.all([loadCases(), loadSelectedCaseFlows(caseId)])
  }

  const getTemplateOrder = (template: FlowTemplate, fallbackIndex: number) => {
    const rawOrder = Number((template.tags as Record<string, string> | undefined)?.onboardingOrder)
    return Number.isFinite(rawOrder) ? rawOrder : fallbackIndex + 1
  }

  const getLinkedFlowForTemplate = (linkedFlows: LinkedFlow[], templateId: string | undefined) => {
    if (!templateId) return undefined
    return linkedFlows
      .filter(flow => !flow.removedAt && flow.templateId === templateId)
      .sort((left, right) => new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime())[0]
  }

  const isCompletedFlow = (flow: LinkedFlow | undefined) => {
    const status = String(flow?.status || flow?.flowStatus || '').toUpperCase()
    return status === 'COMPLETED' || status === 'DONE' || status === 'FINISHED'
  }

  const getFlowProgress = (flow: LinkedFlow | undefined) => {
    if (!flow) return 0
    if (isCompletedFlow(flow)) return 100
    if (typeof flow.progressPercentage === 'number') return flow.progressPercentage
    if (!flow.totalSteps) return 0
    return Math.round(((flow.completedSteps || 0) / flow.totalSteps) * 100)
  }

  const getFlowStatusLabel = (flow: LinkedFlow | undefined) => {
    if (!flow) return 'Not started'
    const status = String(flow.status || flow.flowStatus || 'In progress')
      .replace(/_/g, ' ')
      .toLowerCase()
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const getEmployeeDisplayName = (employee: FlowInitiatorEmployee | undefined, fallback: string | undefined) =>
    employee?.displayName ||
    employee?.fullName ||
    employee?.preferredName ||
    [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') ||
    fallback ||
    'Unknown user'

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'

  const getAvatarUrl = (pictureThumbnail: string | undefined) => {
    if (!pictureThumbnail) return undefined
    if (pictureThumbnail.startsWith('data:') || pictureThumbnail.startsWith('http')) return pictureThumbnail
    return `data:image/png;base64,${pictureThumbnail}`
  }

  const getTemplateSteps = (template: FlowTemplate | undefined) => template?.steps || []

  const getTemplateStepCount = (template: FlowTemplate | undefined) => {
    const steps = getTemplateSteps(template)
    if (steps.length > 0) return steps.length

    const listStepCount = (template as (FlowTemplate & { stepsCount?: number }) | undefined)?.stepsCount
    return typeof listStepCount === 'number' ? listStepCount : 0
  }

  const getStepStatus = (
    flow: LinkedFlow | undefined,
    step: NonNullable<FlowTemplate['steps']>[number],
    index: number
  ) => {
    if (!flow) return 'pending'
    const historyItem = flow.stepHistory?.find(history => {
      const stepTitle = step.title
      return (
        history.reference === step.reference ||
        history.reference === step.id ||
        history.name === stepTitle ||
        history.index === index
      )
    })

    if (historyItem?.status) return historyItem.status
    if (isCompletedFlow(flow)) return 'completed'
    return 'pending'
  }

  const toggleTemplateExpansion = async (template: FlowTemplate) => {
    if (!template.id) return

    const nextTemplateId = expandedTemplateId === template.id ? null : template.id
    setExpandedTemplateId(nextTemplateId)

    if (!nextTemplateId || templateDetailsById[nextTemplateId]) return

    setLoadingTemplateDetailId(nextTemplateId)
    try {
      const templateClient = new FlowTemplateClient(contextProps.accessToken)
      const templateDetail = await templateClient.getTemplate(nextTemplateId)
      setTemplateDetailsById(previous => ({
        ...previous,
        [nextTemplateId]: templateDetail
      }))
    } catch (err) {
      console.error('Failed to load onboarding template details:', err)
      setTemplatesError(err instanceof Error ? err.message : 'Failed to load flow details')
    } finally {
      setLoadingTemplateDetailId(null)
    }
  }

  const startTemplateForCase = async (caseItem: Case, metadata: OnboardingMetadata, template: FlowTemplate) => {
    if (!template.id || startingTemplateId) return

    setStartingTemplateId(template.id)
    try {
      await handleAddFlowToSelectedCase(caseItem.caseId, {
        templateId: template.id,
        initiator: contextProps.userInfo?.id || 'system',
        inputValues: {
          caseId: caseItem.caseId,
          employeeName: metadata.employeeName,
          position: metadata.position,
          department: metadata.department,
          startDate: metadata.startDate,
          managerId: metadata.managerId,
          mentorId: metadata.mentorId,
          workLocation: metadata.workLocation
        }
      })
    } finally {
      setStartingTemplateId(null)
    }
  }

  const renderCaseList = () => {
    if (cases.length === 0 && !isLoading) {
      return (
        <OnboardingEmptyState
          view={view === 'list' ? 'list' : 'dashboard'}
          onCreateCase={() => setIsCreateOpen(true)}
        />
      )
    }

    return (
      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
        {cases.map(caseItem => {
          const metadata = getOnboardingMetadata(caseItem)
          const activeFlows = caseItem.state.linkedFlows.filter(flow => !flow.removedAt)

          return (
            <Card
              key={caseItem.caseId}
              className="gba:cursor-pointer gba:border gba:shadow-sm gba:bg-white gba:hover:shadow-lg gba:transition-shadow"
              onClick={() => openCase(caseItem.caseId)}
            >
              <CardHeader className="gba:pb-3">
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                  <div>
                    <CardTitle className="gba:text-base">{metadata.employeeName}</CardTitle>
                    <p className="gba:text-sm gba:text-muted-foreground">{metadata.position}</p>
                  </div>
                  <Badge variant="outline" className="gba:capitalize">
                    {metadata.status || 'open'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="gba:space-y-3">
                <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:text-sm">
                  <div>
                    <p className="gba:text-xs gba:text-muted-foreground">Department</p>
                    <p className="gba:font-medium">{metadata.department}</p>
                  </div>
                  <div>
                    <p className="gba:text-xs gba:text-muted-foreground">Stage</p>
                    <p className="gba:font-medium">{onboardingStageLabels[metadata.onboardingStage]}</p>
                  </div>
                </div>
                <div className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:text-muted-foreground">
                  <span className="gba:flex gba:items-center gba:gap-1.5">
                    <Calendar className="gba:h-4 gba:w-4" />
                    {new Date(metadata.startDate).toLocaleDateString()}
                  </span>
                  <span>{activeFlows.length} flows</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  if (view === 'detail' && selectedCase) {
    const metadata = getOnboardingMetadata(selectedCase)
    const linkedFlows = selectedCaseLinkedFlows
    const activeFlows = activeSelectedFlows
    const completedFlows = activeFlows.filter(isCompletedFlow)
    const flowProgress =
      activeFlows.length > 0
        ? Math.round(activeFlows.reduce((sum, flow) => sum + getFlowProgress(flow), 0) / activeFlows.length)
        : getStageProgress(metadata.onboardingStage)
    const sortedTemplates = [...onboardingTemplates].sort(
      (left, right) => getTemplateOrder(left, 0) - getTemplateOrder(right, 0)
    )
    const formattedStartDate = new Date(metadata.startDate).toLocaleDateString()

    const headerActions = (
      <Button
        variant="outline"
        size="sm"
        onClick={() => void Promise.all([loadCases(), loadSelectedCaseFlows(selectedCase.caseId)])}
        disabled={isLoading || isLoadingSelectedFlows}
      >
        <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
        Refresh
      </Button>
    )

    const headerDetailGroups = [
      {
        id: 'onboarding-kpis',
        items: [
          {
            id: 'status',
            label: 'Status',
            value: (
              <Badge variant="outline" className="gba:capitalize">
                {metadata.status || 'open'}
              </Badge>
            ),
            icon: Flag
          },
          {
            id: 'start-date',
            label: 'Start Date',
            value: formattedStartDate,
            icon: CalendarClock
          },
          {
            id: 'stage',
            label: 'Stage',
            value: onboardingStageLabels[metadata.onboardingStage],
            icon: Activity
          },
          {
            id: 'progress',
            label: 'Progress',
            value: `${flowProgress}% (${completedFlows.length} of ${activeFlows.length} flows)`,
            icon: Workflow
          }
        ]
      }
    ]

    const overviewContent = (
      <div className="gba:col-span-full">
        <OnboardingDetailsPanel
          caseData={selectedCase}
          metadata={metadata}
          linkedFlows={linkedFlows}
          context={contextProps}
        />
      </div>
    )

    const flowsContent = (
      <div className="gba:col-span-full gba:space-y-4">
        {templatesError ? (
          <Alert variant="destructive">
            <AlertDescription>{templatesError}</AlertDescription>
          </Alert>
        ) : null}
        {selectedFlowsError ? (
          <Alert variant="destructive">
            <AlertDescription>{selectedFlowsError}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:justify-between gba:text-base">
              <span>
                Onboarding Flows ({activeFlows.length}/{sortedTemplates.length || 0})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadOnboardingTemplates()}
                disabled={isLoadingTemplates}
              >
                <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTemplates ? (
              <div className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
                Loading onboarding flows...
              </div>
            ) : isLoadingSelectedFlows ? (
              <div className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
                Loading flow progress...
              </div>
            ) : sortedTemplates.length === 0 ? (
              <div className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
                No onboarding flow templates found for this tag.
              </div>
            ) : (
              <div className="gba:grid gba:grid-cols-1 gba:items-start gba:md:grid-cols-2 gba:xl:grid-cols-3 gba:gap-3">
                {sortedTemplates.map((template, index) => {
                  const linkedFlow = getLinkedFlowForTemplate(activeFlows, template.id)
                  const flowRuns = template.id
                    ? activeFlows.filter(flow => !flow.removedAt && flow.templateId === template.id)
                    : []
                  const templateDetail = template.id ? templateDetailsById[template.id] || template : template
                  const templateSteps = getTemplateSteps(templateDetail)
                  const templateStepCount = getTemplateStepCount(templateDetail)
                  const progress = getFlowProgress(linkedFlow)
                  const stepCount = templateStepCount || linkedFlow?.totalSteps || 0
                  const completedTaskCount = linkedFlow
                    ? isCompletedFlow(linkedFlow)
                      ? linkedFlow.totalSteps || stepCount
                      : linkedFlow.completedSteps || 0
                    : 0
                  const isStarted = Boolean(linkedFlow)
                  const isStarting = startingTemplateId === template.id
                  const isExpanded = expandedTemplateId === template.id
                  const initiatorUserId = linkedFlow?.initiator || linkedFlow?.addedBy
                  const initiator = initiatorUserId ? flowInitiatorsByUserId[initiatorUserId] : undefined
                  const initiatorName = getEmployeeDisplayName(initiator, initiatorUserId)
                  const avatarUrl = getAvatarUrl(initiator?.pictureThumbnail)

                  return (
                    <div
                      key={template.id || template.name}
                      className="gba:rounded-lg gba:border gba:bg-background gba:p-4 gba:space-y-3 gba:text-left gba:transition-colors hover:gba:bg-muted/30"
                    >
                      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => void toggleTemplateExpansion(template)}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              void toggleTemplateExpansion(template)
                            }
                          }}
                          className="gba:min-w-0"
                        >
                          <div className="gba:flex gba:items-center gba:gap-2">
                            {isExpanded ? (
                              <ChevronDown className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
                            ) : (
                              <ChevronRight className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
                            )}
                            <span className="gba:text-xs gba:text-muted-foreground">
                              #{getTemplateOrder(template, index)}
                            </span>
                            <h3 className="gba:text-sm gba:font-semibold gba:truncate">{template.name}</h3>
                          </div>
                          <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground gba:line-clamp-2">
                            {template.description || `${stepCount} tasks`}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant={isStarted ? 'outline' : 'default'}
                          disabled={isStarted || isStarting || !template.id}
                          onClick={event => {
                            event.stopPropagation()
                            void startTemplateForCase(selectedCase, metadata, template)
                          }}
                          aria-label={isStarted ? 'Flow already started' : `Start ${template.name}`}
                        >
                          {isStarted ? (
                            <CheckCircle2 className="gba:h-4 gba:w-4" />
                          ) : (
                            <Play className="gba:h-4 gba:w-4" />
                          )}
                        </Button>
                      </div>

                      <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
                        <span>{stepCount} tasks</span>
                        <Badge variant="outline">{getFlowStatusLabel(linkedFlow)}</Badge>
                      </div>

                      {isStarted ? <Progress value={progress} className="gba:h-1.5" /> : null}

                      {isStarted ? (
                        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:text-xs gba:text-muted-foreground">
                          <span>
                            {completedTaskCount}/{linkedFlow?.totalSteps || stepCount} tasks
                          </span>
                          {initiatorUserId ? (
                            <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                              <span className="gba:truncate">Started by {initiatorName}</span>
                              <Avatar className="gba:h-5 gba:w-5 gba:shrink-0">
                                {avatarUrl ? <AvatarImage src={avatarUrl} alt={initiatorName} /> : null}
                                <AvatarFallback className="gba:text-[10px]">
                                  {getInitials(initiatorName)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {flowRuns.length > 1 ? (
                        <Badge variant="outline" className="gba:w-fit">
                          Started {flowRuns.length} times
                        </Badge>
                      ) : null}

                      {isExpanded ? (
                        <div className="gba:border-t gba:pt-3 gba:space-y-3">
                          {loadingTemplateDetailId === template.id ? (
                            <div className="gba:text-xs gba:text-muted-foreground">Loading flow details...</div>
                          ) : templateSteps.length > 0 ? (
                            <Timeline progressive={false} className="gba:max-w-none gba:px-2">
                              {templateSteps.map((step, stepIndex) => {
                                const status = getStepStatus(linkedFlow, step, stepIndex)
                                const isCompleted = status === 'completed'
                                const isCurrent = status === 'current'
                                const stepNumber = stepIndex + 1

                                return (
                                  <TimelineItem
                                    key={step.reference || step.id || `${template.id}-${stepIndex}`}
                                    step={stepNumber}
                                  >
                                    <TimelineHeader>
                                      <TimelineSeparator />
                                      <TimelineTitle className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                                        <span className="gba:truncate">{step.title}</span>
                                        <Badge variant="outline" className="gba:capitalize">
                                          {status}
                                        </Badge>
                                      </TimelineTitle>
                                      <TimelineIndicator className="gba:flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-full gba:border gba:bg-background">
                                        {isCompleted ? (
                                          <CheckCircle2 className="gba:h-4 gba:w-4 gba:text-green-600" />
                                        ) : isCurrent ? (
                                          <Activity className="gba:h-4 gba:w-4 gba:text-primary" />
                                        ) : (
                                          <Circle className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                                        )}
                                      </TimelineIndicator>
                                    </TimelineHeader>
                                    <TimelineContent className="gba:pb-5 gba:pr-4 gba:text-xs gba:text-muted-foreground">
                                      {step.message ? <div className="gba:line-clamp-2">{step.message}</div> : null}
                                    </TimelineContent>
                                  </TimelineItem>
                                )
                              })}
                            </Timeline>
                          ) : linkedFlow?.stepHistory?.length ? (
                            <Timeline progressive={false} className="gba:max-w-none gba:px-2">
                              {linkedFlow.stepHistory.map(step => {
                                const isCompleted = step.status === 'completed'
                                const isCurrent = step.status === 'current'
                                const stepNumber = step.index + 1

                                return (
                                  <TimelineItem
                                    key={`${linkedFlow.workflowId}-${step.index}-${step.name}`}
                                    step={stepNumber}
                                  >
                                    <TimelineHeader>
                                      <TimelineSeparator />
                                      <TimelineTitle className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                                        <span className="gba:truncate">{step.name}</span>
                                        <Badge variant="outline" className="gba:capitalize">
                                          {step.status}
                                        </Badge>
                                      </TimelineTitle>
                                      <TimelineIndicator className="gba:flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-full gba:border gba:bg-background">
                                        {isCompleted ? (
                                          <CheckCircle2 className="gba:h-4 gba:w-4 gba:text-green-600" />
                                        ) : isCurrent ? (
                                          <Activity className="gba:h-4 gba:w-4 gba:text-primary" />
                                        ) : (
                                          <Circle className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                                        )}
                                      </TimelineIndicator>
                                    </TimelineHeader>
                                    <TimelineContent className="gba:pb-5 gba:pr-4 gba:text-xs gba:text-muted-foreground">
                                      <div>
                                        {step.assignee ? `Assigned to ${step.assignee}` : 'No assignee available'}
                                      </div>
                                      {(step.startedAt || step.completedAt) && (
                                        <div className="gba:mt-1 gba:flex gba:flex-wrap gba:gap-3">
                                          {step.startedAt ? (
                                            <span>Started: {new Date(step.startedAt).toLocaleString()}</span>
                                          ) : null}
                                          {step.completedAt ? (
                                            <span>Completed: {new Date(step.completedAt).toLocaleString()}</span>
                                          ) : null}
                                        </div>
                                      )}
                                    </TimelineContent>
                                  </TimelineItem>
                                )
                              })}
                            </Timeline>
                          ) : (
                            <div className="gba:text-xs gba:italic gba:text-muted-foreground">
                              No task details available.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )

    const tasksContent = (
      <div className="gba:col-span-full gba:space-y-4">
        <OnboardingTasksTab
          accessToken={contextProps.accessToken}
          tasks={currentUserOnboardingTasks}
          linkedFlows={activeFlows}
          isLoading={isLoadingCurrentUserTasks}
          claimingTaskId={claimingTaskId}
          error={currentUserTasksError}
          onRefresh={() => void refreshCurrentUserTasks()}
          onClaimTask={taskId => void claimTask(taskId)}
        />
      </div>
    )

    return (
      <div data-testid="onboarding-cases-container" className="gba:w-full gba:h-full">
        <RecordLayout
          headerOverline="Employee Onboarding"
          onBack={() => setView(initialView)}
          headerTitle={metadata.employeeName}
          headerSubtitle={`${metadata.position} - ${metadata.department}`}
          headerActions={headerActions}
          headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
          views={[
            {
              value: 'overview',
              label: 'Overview',
              icon: <LayoutDashboard className="gba:h-4 gba:w-4" />,
              content: overviewContent,
              contentClassName: 'gba:p-6 layout-content gba:grid gba:gap-6 gba:grid-cols-1'
            },
            {
              value: 'flows',
              label: 'Flows',
              icon: <Workflow className="gba:h-4 gba:w-4" />,
              content: flowsContent,
              contentClassName: 'gba:p-6 layout-content gba:grid gba:gap-6 gba:grid-cols-1'
            },
            {
              value: 'tasks',
              label: 'Tasks',
              icon: <ListChecks className="gba:h-4 gba:w-4" />,
              content: tasksContent,
              contentClassName: 'gba:p-6 layout-content gba:grid gba:gap-6 gba:grid-cols-1'
            }
          ]}
        />
      </div>
    )
  }

  return (
    <div data-testid="onboarding-cases-container" className="gba:w-full gba:h-full gba:overflow-auto gba:p-6">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:mb-6">
        <div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-2">
            <Users className="gba:h-4 gba:w-4" />
            HR Onboarding
          </div>
          <h1 className="gba:text-2xl gba:font-semibold">Employee Onboarding</h1>
          <p className="gba:text-muted-foreground">Manage new employee onboarding cases and workflows.</p>
        </div>
        <div className="gba:flex gba:gap-2">
          <Button variant="outline" onClick={() => void loadCases()} disabled={isLoading}>
            <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="gba:h-4 gba:w-4 gba:mr-2" />
            Start Onboarding
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="gba:mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="gba:mb-6">
        <OnboardingKPICards analytics={analytics} isLoading={isLoading} />
      </div>

      {renderCaseList()}

      <CreateOnboardingDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCaseCreated={handleCaseCreated}
        context={contextProps}
        appTag={ONBOARDING_APP_TAG}
        userId={contextProps.userInfo?.id}
      />
    </div>
  )
}

export default OnboardingCases
