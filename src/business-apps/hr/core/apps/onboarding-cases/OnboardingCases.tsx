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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  TimelineTitle,
  useTranslation
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
  Trash2,
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
  LinkedEntity,
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
import { OnboardingMetadata, WorkLocation } from './types'
import translations from './_i18n'
import { formatOnboardingFlowStatusLabel } from './utils/onboardingStatusLabels'

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

const buildOnboardingEmployeeProfileQuery = (employeeId?: string, employeeUserId?: string) => {
  const safeEmployeeId = employeeId?.replace(/"/g, '')
  const safeEmployeeUserId = employeeUserId?.replace(/"/g, '')
  const filters = [
    safeEmployeeId ? `{ id: { _eq: "${safeEmployeeId}" } }` : null,
    safeEmployeeUserId ? `{ userId: { _eq: "${safeEmployeeUserId}" } }` : null
  ].filter(Boolean)

  if (filters.length === 0) return null

  const where = filters.length === 1 ? filters[0] : `{ _or: [${filters.join(', ')}] }`

  return `
    query GetOnboardingEmployeeProfile {
      Employee(where: ${where}, limit: 1) {
        id
        userId
        firstName
        lastName
        fullName
        displayName
        preferredName
        pictureThumbnail
        employeePosition {
          jobPosition {
            name
          }
          organizationalUnit {
            id
            name
          }
        }
      }
    }
  `
}

type ViewState = 'dashboard' | 'list' | 'detail'
type DetailViewState = 'overview' | 'flows' | 'tasks'

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

interface OnboardingEmployeeProfile extends FlowInitiatorEmployee {
  employeePosition?: {
    jobPosition?: { name?: string }
    organizationalUnit?: { id?: string; name?: string }
  }
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
  const { t } = useTranslation(translations)
  const [view, setView] = useState<ViewState>(initialView)
  const [activeDetailView, setActiveDetailView] = useState<DetailViewState>('overview')
  const [cases, setCases] = useState<Case[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [selectedLinkedFlows, setSelectedLinkedFlows] = useState<LinkedFlow[]>([])
  const [selectedLinkedEntities, setSelectedLinkedEntities] = useState<LinkedEntity[]>([])
  const [isLoadingSelectedFlows, setIsLoadingSelectedFlows] = useState(false)
  const [selectedFlowsError, setSelectedFlowsError] = useState<string | null>(null)
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
  const [templateDetailsById, setTemplateDetailsById] = useState<Record<string, FlowTemplate>>({})
  const [loadingTemplateDetailId, setLoadingTemplateDetailId] = useState<string | null>(null)
  const [flowInitiatorsByUserId, setFlowInitiatorsByUserId] = useState<Record<string, FlowInitiatorEmployee>>({})
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState<OnboardingEmployeeProfile | null>(null)
  const [isLoadingSelectedEmployeeProfile, setIsLoadingSelectedEmployeeProfile] = useState(false)
  const [onboardingTemplates, setOnboardingTemplates] = useState<FlowTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(null)
  const [flowStartError, setFlowStartError] = useState<string | null>(null)
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null)
  const [casePendingRemoval, setCasePendingRemoval] = useState<Case | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const client = useMemo(() => new CaseApiClient(undefined, contextProps.accessToken), [contextProps.accessToken])
  const graphqlClient = useGraphQLClient(contextProps.accessToken)
  const requestedInitiatorUserIdsRef = useRef<Set<string>>(new Set())
  const startingFlowKeysRef = useRef<Set<string>>(new Set())

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
      setError(t('hr-onboarding-main-load-cases-failed'))
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
      setTemplatesError(t('hr-onboarding-main-load-flows-failed'))
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

  useEffect(() => {
    if (view !== 'detail' || !selectedCaseId) {
      setSelectedLinkedEntities([])
      return
    }

    let cancelled = false

    void client
      .getLinkedEntities(selectedCaseId)
      .then(entities => {
        if (!cancelled) {
          setSelectedLinkedEntities(entities)
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to load onboarding linked entities:', err)
          setSelectedLinkedEntities([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [client, selectedCaseId, view])

  useEffect(() => {
    if (view !== 'detail' || !selectedCase) {
      setSelectedEmployeeProfile(null)
      return
    }

    const metadata = selectedCase.state.metadata as Partial<OnboardingMetadata> | undefined
    const linkedEmployee =
      selectedLinkedEntities.find(entity => entity.type === 'employee') ||
      metadata?.linkedEntities?.find(entity => entity.type === 'employee')
    const linkedEmployeeMetadata = linkedEmployee?.metadata as { employeeUserId?: string; userId?: string } | undefined
    const query = buildOnboardingEmployeeProfileQuery(
      metadata?.employeeId || linkedEmployee?.id,
      metadata?.employeeUserId || linkedEmployeeMetadata?.employeeUserId || linkedEmployeeMetadata?.userId
    )

    if (!query) {
      setSelectedEmployeeProfile(null)
      return
    }

    let cancelled = false
    setIsLoadingSelectedEmployeeProfile(true)

    void graphqlClient
      .request<{ Employee: OnboardingEmployeeProfile[] }>(query)
      .then(response => {
        if (cancelled) return
        setSelectedEmployeeProfile(response.Employee?.[0] || null)
      })
      .catch(err => {
        if (cancelled) return
        console.error('Failed to load onboarding employee profile:', err)
        setSelectedEmployeeProfile(null)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSelectedEmployeeProfile(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [graphqlClient, selectedCase, selectedLinkedEntities, view])

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
  const activeSelectedTemplateIds = useMemo(
    () =>
      activeSelectedFlows
        .map(flow => flow.templateId)
        .filter((templateId): templateId is string => Boolean(templateId)),
    [activeSelectedFlows]
  )
  const {
    myTasks: currentUserOnboardingTasks,
    allTasks: allCaseOnboardingTasks,
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
    templateIds: activeSelectedTemplateIds,
    enabled: view === 'detail' && activeDetailView === 'tasks' && Boolean(selectedCaseId),
    loadErrorMessage: t('hr-onboarding-tasks-load-failed'),
    claimErrorMessage: t('hr-onboarding-tasks-claim-failed')
  })

  const refreshSelectedCaseFlows = useCallback(
    async (caseId: string) => {
      const flows = await client.getLinkedFlows(caseId)
      setSelectedLinkedFlows(flows)
      return flows
    },
    [client]
  )

  const loadSelectedCaseFlows = useCallback(
    async (caseId: string) => {
      setIsLoadingSelectedFlows(true)
      setSelectedFlowsError(null)

      try {
        await refreshSelectedCaseFlows(caseId)
      } catch (err) {
        console.error('Failed to load linked onboarding flows:', err)
        setSelectedFlowsError(t('hr-onboarding-main-load-flow-progress-failed'))
      } finally {
        setIsLoadingSelectedFlows(false)
      }
    },
    [refreshSelectedCaseFlows]
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

  const getEmployeeNameFromCaseTitle = (title: string | undefined) => {
    if (!title) return t('hr-onboarding-main-new-employee')
    return title.replace(/^Onboarding:\s*/i, '').trim() || title
  }

  const getPositionFromDescription = (description: string | undefined) => description?.split(' - ')[0]?.trim() || '-'

  const getDepartmentFromDescription = (description: string | undefined) => {
    const parts = description?.split(' - ') || []
    return parts.length > 1 ? parts.slice(1).join(' - ').trim() || '-' : '-'
  }

  const getOnboardingMetadata = (caseItem: Case): OnboardingMetadata => {
    const metadata = caseItem.state.metadata as Partial<OnboardingMetadata> | undefined
    const employeeName = metadata?.employeeName || getEmployeeNameFromCaseTitle(metadata?.title)
    const position = metadata?.position || getPositionFromDescription(metadata?.description)
    const department = metadata?.department || getDepartmentFromDescription(metadata?.description)

    return {
      title: metadata?.title || t('hr-onboarding-main-default-case-title'),
      description: metadata?.description,
      status: metadata?.status,
      priority: metadata?.priority,
      assignedTo: metadata?.assignedTo,
      dueDate: metadata?.dueDate,
      linkedEntities: metadata?.linkedEntities,
      linkedCases: metadata?.linkedCases,
      parentCaseId: metadata?.parentCaseId,
      notes: metadata?.notes,
      employeeId: metadata?.employeeId,
      employeeUserId: metadata?.employeeUserId,
      employeeName,
      position,
      department,
      jobPositionId: metadata?.jobPositionId,
      jobPositionName: metadata?.jobPositionName || position,
      organizationalUnitId: metadata?.organizationalUnitId,
      organizationName: metadata?.organizationName || department,
      managerId: metadata?.managerId,
      startDate: metadata?.startDate || metadata?.dueDate || caseItem.createdAt,
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
    setSelectedLinkedEntities([])
    setSelectedFlowsError(null)
    setFlowStartError(null)
    setSelectedCaseId(caseId)
    setActiveDetailView('overview')
    setView('detail')
  }

  const handleCaseCreated = (caseId: string) => {
    setIsCreateOpen(false)
    setSelectedCaseId(caseId)
    setFlowStartError(null)
    setActiveDetailView('overview')
    setView('detail')
    void loadCases()
  }

  const handleAddFlowToSelectedCase = async (caseId: string, request: AddFlowRequest) => {
    await client.addFlowToCase(caseId, request)
  }

  const requestRemoveCase = (event: React.MouseEvent, caseItem: Case) => {
    event.stopPropagation()
    setCasePendingRemoval(caseItem)
  }

  const handleRemoveCase = async () => {
    if (!casePendingRemoval) return

    setDeletingCaseId(casePendingRemoval.caseId)
    setError(null)

    try {
      await client.deleteCase(casePendingRemoval.caseId, contextProps.userInfo?.id, false)
      if (selectedCaseId === casePendingRemoval.caseId) {
        setSelectedCaseId(null)
        setSelectedLinkedFlows([])
        setSelectedLinkedEntities([])
        setActiveDetailView('overview')
        setView(initialView)
      }
      setCasePendingRemoval(null)
      await loadCases()
    } catch (err) {
      console.error('Failed to remove onboarding case:', err)
      setError(t('hr-onboarding-main-remove-failed'))
    } finally {
      setDeletingCaseId(null)
    }
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
    if (!flow) return t('hr-onboarding-flow-status-pending')
    return formatOnboardingFlowStatusLabel(flow.status || flow.flowStatus || 'IN_PROGRESS', t)
  }

  const getCaseStatusLabel = (status: string | undefined) => {
    const normalized = String(status || 'open')
      .replace(/_/g, '-')
      .toLowerCase()
    const knownStatusKeys: Record<string, string> = {
      open: 'hr-onboarding-status-open',
      'in-progress': 'hr-onboarding-status-in-progress',
      blocked: 'hr-onboarding-status-blocked',
      completed: 'hr-onboarding-status-completed',
      cancelled: 'hr-onboarding-status-cancelled'
    }
    const translationKey = knownStatusKeys[normalized]
    if (translationKey) return t(translationKey)
    return String(status || 'open').replace(/_/g, ' ')
  }

  const getEmployeeDisplayName = (employee: FlowInitiatorEmployee | undefined, fallback: string | undefined) =>
    employee?.displayName ||
    employee?.fullName ||
    employee?.preferredName ||
    [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') ||
    fallback ||
    t('hr-onboarding-common-unknown-user')

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
      setTemplatesError(t('hr-onboarding-main-load-flow-details-failed'))
    } finally {
      setLoadingTemplateDetailId(null)
    }
  }

  const startTemplateForCase = async (caseItem: Case, metadata: OnboardingMetadata, template: FlowTemplate) => {
    if (!template.id) {
      setFlowStartError(t('hr-onboarding-main-flow-template-missing'))
      return
    }

    const flowKey = `${caseItem.caseId}:${template.id}`
    if (startingFlowKeysRef.current.has(flowKey) || startingTemplateId) return

    const existingLinkedFlow = getLinkedFlowForTemplate(activeSelectedFlows, template.id)
    if (existingLinkedFlow) {
      setFlowStartError(
        t('hr-onboarding-main-flow-already-started-error', {
          flowName: template.name || t('hr-onboarding-common-flow')
        })
      )
      return
    }

    startingFlowKeysRef.current.add(flowKey)
    setStartingTemplateId(template.id)
    setFlowStartError(null)
    setSelectedFlowsError(null)

    try {
      const latestFlows = await refreshSelectedCaseFlows(caseItem.caseId)
      if (getLinkedFlowForTemplate(latestFlows, template.id)) {
        setFlowStartError(
          t('hr-onboarding-main-flow-already-started-error', {
            flowName: template.name || t('hr-onboarding-common-flow')
          })
        )
        return
      }

      await handleAddFlowToSelectedCase(caseItem.caseId, {
        templateId: template.id,
        initiator: contextProps.userInfo?.id || 'system',
        inputValues: {
          caseId: caseItem.caseId,
          employeeId: metadata.employeeId,
          employeeUserId: metadata.employeeUserId,
          employeeName: metadata.employeeName,
          position: metadata.position,
          department: metadata.department,
          jobPositionId: metadata.jobPositionId,
          jobPositionName: metadata.jobPositionName,
          organizationalUnitId: metadata.organizationalUnitId,
          organizationName: metadata.organizationName,
          startDate: metadata.startDate,
          managerId: metadata.managerId,
          mentorId: metadata.mentorId,
          workLocation: metadata.workLocation
        }
      })

      try {
        await refreshSelectedCaseFlows(caseItem.caseId)
      } catch (refreshErr) {
        console.error('Failed to refresh onboarding flows after start:', refreshErr)
        setSelectedFlowsError(
          refreshErr instanceof Error ? refreshErr.message : t('hr-onboarding-main-flow-refresh-after-start-failed')
        )
      }
    } catch (err) {
      console.error('Failed to start onboarding flow:', err)
      const message = err instanceof Error ? err.message : t('hr-onboarding-main-flow-start-failed')
      setFlowStartError(
        t('hr-onboarding-main-flow-start-failed', {
          flowName: template.name || t('hr-onboarding-common-flow'),
          message
        })
      )
    } finally {
      startingFlowKeysRef.current.delete(flowKey)
      setStartingTemplateId(current => (current === template.id ? null : current))
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
                  <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-2">
                    <Badge variant="outline" className="gba:capitalize">
                      {getCaseStatusLabel(metadata.status)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gba:h-8 gba:gap-1 gba:text-destructive hover:gba:text-destructive"
                      onClick={event => requestRemoveCase(event, caseItem)}
                      disabled={deletingCaseId === caseItem.caseId}
                      aria-label={t('hr-onboarding-main-remove-description', { employeeName: metadata.employeeName })}
                    >
                      <Trash2 className="gba:h-3.5 gba:w-3.5" />
                      {deletingCaseId === caseItem.caseId
                        ? t('hr-onboarding-common-removing')
                        : t('hr-onboarding-common-remove')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="gba:space-y-3">
                <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:text-sm">
                  <div>
                    <p className="gba:text-xs gba:text-muted-foreground">{t('hr-onboarding-common-department')}</p>
                    <p className="gba:font-medium">{metadata.department}</p>
                  </div>
                  <div>
                    <p className="gba:text-xs gba:text-muted-foreground">{t('hr-onboarding-common-status')}</p>
                    <p className="gba:font-medium gba:capitalize">{getCaseStatusLabel(metadata.status)}</p>
                  </div>
                </div>
                <div className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:text-muted-foreground">
                  <span className="gba:flex gba:items-center gba:gap-1.5">
                    <Calendar className="gba:h-4 gba:w-4" />
                    {new Date(metadata.startDate).toLocaleDateString()}
                  </span>
                  <span>{t('hr-onboarding-main-flows-count', { count: activeFlows.length })}</span>
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
        : 0
    const sortedTemplates = [...onboardingTemplates].sort(
      (left, right) => getTemplateOrder(left, 0) - getTemplateOrder(right, 0)
    )
    const formattedStartDate = new Date(metadata.startDate).toLocaleDateString()
    const linkedEmployee = selectedLinkedEntities.find(entity => entity.type === 'employee')
    const linkedEmployeeMetadata = linkedEmployee?.metadata as
      | {
          employeeUserId?: string
          jobPositionName?: string
          organizationalUnitId?: string
          organizationName?: string
          startDate?: string
        }
      | undefined
    const liveEmployeeName = getEmployeeDisplayName(selectedEmployeeProfile || undefined, metadata.employeeName)
    const liveJobPositionName =
      selectedEmployeeProfile?.employeePosition?.jobPosition?.name ||
      linkedEmployeeMetadata?.jobPositionName ||
      metadata.jobPositionName ||
      metadata.position
    const liveOrganizationName =
      selectedEmployeeProfile?.employeePosition?.organizationalUnit?.name ||
      linkedEmployeeMetadata?.organizationName ||
      metadata.organizationName ||
      metadata.department
    const displayMetadata: OnboardingMetadata = {
      ...metadata,
      employeeId: linkedEmployee?.id || metadata.employeeId,
      employeeUserId: linkedEmployeeMetadata?.employeeUserId || metadata.employeeUserId,
      employeeName: liveEmployeeName,
      position: liveJobPositionName,
      department: liveOrganizationName,
      jobPositionName: liveJobPositionName,
      organizationName: liveOrganizationName,
      organizationalUnitId:
        selectedEmployeeProfile?.employeePosition?.organizationalUnit?.id ||
        linkedEmployeeMetadata?.organizationalUnitId ||
        metadata.organizationalUnitId
    }
    const headerSubtitle = [liveJobPositionName, liveOrganizationName]
      .filter(value => value && value !== '-')
      .join(' - ')
    const employeeAvatarUrl = getAvatarUrl(selectedEmployeeProfile?.pictureThumbnail)
    const headerAvatar = (
      <Avatar className="gba:h-16 gba:w-16">
        {employeeAvatarUrl ? <AvatarImage src={employeeAvatarUrl} alt={liveEmployeeName} /> : null}
        <AvatarFallback className="gba:text-lg">{getInitials(liveEmployeeName)}</AvatarFallback>
      </Avatar>
    )

    const headerActions = (
      <Button
        variant="outline"
        size="sm"
        onClick={() => void Promise.all([loadCases(), loadSelectedCaseFlows(selectedCase.caseId)])}
        disabled={isLoading || isLoadingSelectedFlows}
      >
        <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
        {t('hr-onboarding-common-refresh')}
      </Button>
    )

    const headerDetailGroups = [
      {
        id: 'onboarding-kpis',
        items: [
          {
            id: 'status',
            label: t('hr-onboarding-common-status'),
            value: (
              <Badge variant="outline" className="gba:capitalize">
                {getCaseStatusLabel(metadata.status)}
              </Badge>
            ),
            icon: Flag
          },
          {
            id: 'start-date',
            label: t('hr-onboarding-common-first-working-day'),
            value: formattedStartDate,
            icon: CalendarClock
          },
          {
            id: 'progress',
            label: t('hr-onboarding-common-progress'),
            value: t('hr-onboarding-main-progress-value', {
              percentage: flowProgress,
              completed: completedFlows.length,
              total: activeFlows.length
            }),
            icon: Workflow
          }
        ]
      }
    ]

    const overviewContent = (
      <div className="gba:col-span-full">
        <OnboardingDetailsPanel
          caseData={selectedCase}
          metadata={displayMetadata}
          linkedFlows={linkedFlows}
          context={contextProps}
          employeeProfile={selectedEmployeeProfile}
          isLoadingEmployeeProfile={isLoadingSelectedEmployeeProfile}
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
        {flowStartError ? (
          <Alert variant="destructive">
            <AlertDescription>{flowStartError}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:justify-between gba:text-base">
              <span>
                {t('hr-onboarding-main-onboarding-flows-title', {
                  started: activeFlows.length,
                  total: sortedTemplates.length || 0
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadOnboardingTemplates()}
                disabled={isLoadingTemplates}
              >
                <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('hr-onboarding-common-refresh')}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTemplates ? (
              <div className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
                {t('hr-onboarding-main-loading-flows')}
              </div>
            ) : isLoadingSelectedFlows ? (
              <div className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
                {t('hr-onboarding-main-loading-flow-progress')}
              </div>
            ) : sortedTemplates.length === 0 ? (
              <div className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
                {t('hr-onboarding-main-no-templates')}
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
                  const isStartDisabled =
                    isStarted || Boolean(startingTemplateId) || !template.id || isLoadingSelectedFlows
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
                            {template.description ||
                              t('hr-onboarding-details-step-count', { completed: stepCount, total: stepCount })}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant={isStarted ? 'outline' : 'default'}
                          disabled={isStartDisabled}
                          onClick={event => {
                            event.stopPropagation()
                            void startTemplateForCase(selectedCase, displayMetadata, template)
                          }}
                          aria-label={
                            isStarted
                              ? t('hr-onboarding-main-flow-already-started')
                              : isStarting
                                ? t('hr-onboarding-main-starting-flow', { flowName: template.name })
                                : t('hr-onboarding-main-start-flow', { flowName: template.name })
                          }
                        >
                          {isStarted ? (
                            <CheckCircle2 className="gba:h-4 gba:w-4" />
                          ) : isStarting ? (
                            <RefreshCw className="gba:h-4 gba:w-4 gba:animate-spin" />
                          ) : (
                            <Play className="gba:h-4 gba:w-4" />
                          )}
                        </Button>
                      </div>

                      <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
                        <span>{t('hr-onboarding-details-step-count', { completed: stepCount, total: stepCount })}</span>
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
                              <span className="gba:truncate">
                                {t('hr-onboarding-main-started-by', { name: initiatorName })}
                              </span>
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
                          {t('hr-onboarding-main-started-times', { count: flowRuns.length })}
                        </Badge>
                      ) : null}

                      {isExpanded ? (
                        <div className="gba:border-t gba:pt-3 gba:space-y-3">
                          {loadingTemplateDetailId === template.id ? (
                            <div className="gba:text-xs gba:text-muted-foreground">
                              {t('hr-onboarding-main-loading-flow-details')}
                            </div>
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
                                          {formatOnboardingFlowStatusLabel(status, t)}
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
                                          {formatOnboardingFlowStatusLabel(step.status, t)}
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
                                        {step.assignee
                                          ? t('hr-onboarding-main-assigned-to', { assignee: step.assignee })
                                          : t('hr-onboarding-main-no-assignee')}
                                      </div>
                                      {(step.startedAt || step.completedAt) && (
                                        <div className="gba:mt-1 gba:flex gba:flex-wrap gba:gap-3">
                                          {step.startedAt ? (
                                            <span>
                                              {t('hr-onboarding-main-started-at', {
                                                date: new Date(step.startedAt).toLocaleString()
                                              })}
                                            </span>
                                          ) : null}
                                          {step.completedAt ? (
                                            <span>
                                              {t('hr-onboarding-main-completed-at', {
                                                date: new Date(step.completedAt).toLocaleString()
                                              })}
                                            </span>
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
                              {t('hr-onboarding-main-no-task-details')}
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
          myTasks={currentUserOnboardingTasks}
          allTasks={allCaseOnboardingTasks}
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
          headerOverline={t('hr-onboarding-main-title')}
          onBack={() => setView(initialView)}
          headerTitle={liveEmployeeName}
          headerSubtitle={headerSubtitle || t('hr-onboarding-main-header-subtitle')}
          headerAvatar={headerAvatar}
          headerActions={headerActions}
          headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
          currentView={activeDetailView}
          onViewChange={value => setActiveDetailView(value as DetailViewState)}
          views={[
            {
              value: 'overview',
              label: t('hr-onboarding-common-overview'),
              icon: <LayoutDashboard className="gba:h-4 gba:w-4" />,
              content: overviewContent,
              contentClassName: 'gba:p-6 layout-content gba:grid gba:gap-6 gba:grid-cols-1'
            },
            {
              value: 'flows',
              label: t('hr-onboarding-common-flows'),
              icon: <Workflow className="gba:h-4 gba:w-4" />,
              content: flowsContent,
              contentClassName: 'gba:p-6 layout-content gba:grid gba:gap-6 gba:grid-cols-1'
            },
            {
              value: 'tasks',
              label: t('hr-onboarding-common-tasks'),
              icon: <ListChecks className="gba:h-4 gba:w-4" />,
              content: tasksContent,
              contentClassName: 'gba:p-6 layout-content gba:grid gba:gap-6 gba:grid-cols-1'
            }
          ]}
        />
      </div>
    )
  }

  const pendingRemovalMetadata = casePendingRemoval ? getOnboardingMetadata(casePendingRemoval) : null
  const pendingRemovalActiveFlows = casePendingRemoval?.state.linkedFlows.filter(flow => !flow.removedAt).length || 0

  return (
    <div data-testid="onboarding-cases-container" className="gba:w-full gba:h-full gba:overflow-auto gba:p-6">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:mb-6">
        <div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-2">
            <Users className="gba:h-4 gba:w-4" />
            {t('hr-onboarding-main-overline')}
          </div>
          <h1 className="gba:text-2xl gba:font-semibold">{t('hr-onboarding-main-title')}</h1>
          <p className="gba:text-muted-foreground">{t('hr-onboarding-main-description')}</p>
        </div>
        <div className="gba:flex gba:gap-2">
          <Button variant="outline" onClick={() => void loadCases()} disabled={isLoading}>
            <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('hr-onboarding-common-refresh')}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('hr-onboarding-main-start-button')}
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

      <AlertDialog open={Boolean(casePendingRemoval)} onOpenChange={open => !open && setCasePendingRemoval(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('hr-onboarding-main-remove-title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('hr-onboarding-main-remove-description', {
                employeeName: pendingRemovalMetadata?.employeeName || t('hr-onboarding-main-new-employee')
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingRemovalActiveFlows > 0 ? (
            <div className="gba:rounded-md gba:border gba:border-yellow-200 gba:bg-yellow-50 gba:p-4 gba:text-sm gba:text-yellow-800">
              {t('hr-onboarding-main-remove-active-flows-warning', { count: pendingRemovalActiveFlows })}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingCaseId)}>{t('hr-onboarding-create-cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleRemoveCase()}
              disabled={Boolean(deletingCaseId)}
              className="gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90"
            >
              <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
              {deletingCaseId ? t('hr-onboarding-common-removing') : t('hr-onboarding-common-remove-case')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default OnboardingCases
