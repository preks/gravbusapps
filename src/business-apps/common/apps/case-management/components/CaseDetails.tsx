/**
 * Case Details Component
 *
 * Detailed view of a case using RecordLayout from nw-design-system
 */

import React, { useState, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Badge,
  RecordLayout,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Progress
} from '@newwork/nw-design-system'
import {
  RefreshCw,
  Check,
  AlertTriangle,
  Bot,
  Sparkles,
  X,
  Copy,
  CheckCheck,
  Users,
  Pencil,
  MessageSquare,
  Clock,
  ArrowRight,
  UserCheck,
  Activity,
  CheckCircle2,
  FileText,
  Flag,
  CalendarClock,
  Loader2,
  LayoutDashboard,
  GitBranch,
  Link2,
  Trash2,
  RotateCcw,
  Network
} from 'lucide-react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { Case, AddFlowRequest, LinkedEntity, LinkedFlow, CasePriority } from '../types'
import { formatDate, canCompleteCase, formatCaseId, isFlowTerminal, formatRelativeTime } from '../utils'
import { CaseStatusBadge } from './CaseStatusBadge'
import { FlowManagementPanel } from './FlowManagementPanel'
import { CaseNotesPanel } from './CaseNotesPanel'
import { EntityLinkingPanel } from './EntityLinkingPanel'
import { RelatedCasesPanel } from './RelatedCasesPanel'
import { CaseActivityFeed } from './CaseActivityFeed'
import { EditCaseModal } from './EditCaseModal'
import { CaseRelationshipGraph } from './CaseRelationshipGraph'
import { useCaseData } from '../hooks'
import { openEveryAI } from '@/common/utils/openEveryAI'
import { useEmployeeNamesBatch } from '@/business-apps/ser/hooks/useEmployeeNamesBatch'

/**
 * Builds a comprehensive AI prompt for case analysis with actual case data
 */
function buildCaseAiPrompt(
  caseData: Case,
  linkedFlows: LinkedFlow[],
  activeFlows: LinkedFlow[],
  blockingFlows: LinkedFlow[]
): string {
  const metadata = caseData.state?.metadata
  const flowsSummary = activeFlows
    .map(
      f =>
        `- ${f.workflowName || f.templateId || 'Unnamed Flow'} (Status: ${f.status || 'Unknown'}, Progress: ${f.progressPercentage || 0}%)`
    )
    .join('\n')

  const notesSummary =
    metadata?.notes
      ?.slice(0, 5)
      .map(n => `- [${n.visibility}] ${n.content.slice(0, 100)}${n.content.length > 100 ? '...' : ''}`)
      .join('\n') || 'No notes recorded'

  return `Analyze this Case Management record and provide actionable insights.

## Case Information
- Case ID: ${formatCaseId(caseData.caseId)}
- Title: ${metadata?.title || 'Untitled Case'}
- Description: ${metadata?.description || 'No description'}
- Status: ${metadata?.status || 'Unknown'}
- Priority: ${metadata?.priority || 'Medium'}
- Created: ${formatDate(caseData.createdAt)}
- Due Date: ${metadata?.dueDate ? formatDate(metadata.dueDate) : 'Not set'}
- Assigned To: ${metadata?.assignedTo || 'Unassigned'}

## Linked Workflows (${activeFlows.length} active)
${flowsSummary || 'No workflows linked'}

## Blocking Issues
${
  blockingFlows.length > 0
    ? `${blockingFlows.length} workflow(s) must complete before case closure:\n${blockingFlows.map(f => `- ${f.workflowName || f.templateId}`).join('\n')}`
    : 'No blocking issues - case can be completed'
}

## Recent Notes
${notesSummary}

## Analysis Request
Please provide:
1. Executive summary of the case status
2. Key risks or blockers that need attention
3. Recommended next steps to move this case forward
4. Any patterns or insights from the linked workflows
5. Priority actions for the case owner

Focus on actionable insights that help resolve this case efficiently.`
}

interface CaseDetailsProps {
  caseId: string
  context: BusinessAppContextProps
  appTag: string
  /** Category label shown above the title in the header */
  headerCategory?: string
  onBack: () => void
  onCompleteCase: (caseId: string) => Promise<void>
  onAddFlow: (caseId: string, request: AddFlowRequest) => Promise<void>
  onRemoveFlow: (caseId: string, workflowId: string) => Promise<void>
  onAddNote: (caseId: string, content: string, visibility: 'internal' | 'external') => Promise<void>
  onEditNote?: (caseId: string, noteId: string, content: string) => Promise<void>
  onDeleteNote?: (caseId: string, noteId: string) => Promise<void>
  onLinkEntity: (caseId: string, entity: LinkedEntity) => Promise<void>
  onUnlinkEntity: (caseId: string, entityId: string) => Promise<void>
  onLinkCase?: (caseId: string, targetCaseId: string, relationship: 'parent' | 'child' | 'related') => Promise<void>
  onUnlinkCase?: (caseId: string, targetCaseId: string) => Promise<void>
  onNavigateToCase?: (caseId: string) => void
  onUpdateCase?: (
    caseId: string,
    updates: { title?: string; description?: string; priority?: CasePriority }
  ) => Promise<void>
  /** Handler for soft deleting a case. terminateFlows param controls whether linked flows are terminated */
  onDeleteCase?: (caseId: string, terminateFlows: boolean) => Promise<void>
  /** Handler for restoring a soft-deleted case */
  onRestoreCase?: (caseId: string) => Promise<void>
  allowEdit?: boolean
}

export const CaseDetails: React.FC<CaseDetailsProps> = ({
  caseId,
  context,
  appTag,
  headerCategory = 'Case',
  onBack,
  onCompleteCase,
  onAddFlow,
  onRemoveFlow,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onLinkEntity,
  onUnlinkEntity,
  onLinkCase,
  onUnlinkCase,
  onNavigateToCase,
  onUpdateCase,
  onDeleteCase,
  onRestoreCase,
  allowEdit = true
}) => {
  const { caseData, linkedFlows, isLoading, refetch } = useCaseData(caseId, context)
  const [activeTab, setActiveTab] = useState('overview')
  const [isCompleting, setIsCompleting] = useState(false)
  const [showAiSummary, setShowAiSummary] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isAssigningToMe, setIsAssigningToMe] = useState(false)

  // Calculate active flows and participants (must be before hook calls)
  const activeFlows = linkedFlows.filter(f => !f.removedAt)
  const notes = caseData?.state?.metadata?.notes || []
  const noteCreatorIds = notes.map((n: { createdBy: string }) => n.createdBy).filter(Boolean)
  const assignedToId = caseData?.state?.metadata?.assignedTo
  // Include linked entities (employees and users) in participants
  const linkedEntitiesForParticipants = caseData?.state?.metadata?.linkedEntities || []
  const linkedEntityIds = linkedEntitiesForParticipants
    .filter((e: LinkedEntity) => e.type === 'employee' || e.type === 'user')
    .map((e: LinkedEntity) => e.id)
  const allParticipantIds = [
    ...new Set([
      ...activeFlows.flatMap(
        f => [f.initiator, f.addedBy, f.currentAssignee, ...(f.participants || [])].filter(Boolean) as string[]
      ),
      ...noteCreatorIds,
      ...(assignedToId ? [assignedToId] : []),
      ...linkedEntityIds
    ])
  ]

  // Fetch employee data for all participants (hook must be called unconditionally)
  const {
    displayNames: userNames,
    employees: userEmployees,
    isLoading: isLoadingEmployees
  } = useEmployeeNamesBatch({
    userIds: allParticipantIds,
    accessToken: context.accessToken,
    enabled: allParticipantIds.length > 0
  })

  // Computed values
  const metadata = caseData?.state?.metadata || {}
  const canComplete = caseData ? canCompleteCase(caseData) : false
  const blockingFlows = activeFlows.filter(f => !isFlowTerminal(f))
  const isAssignedToMe = metadata?.assignedTo === context.userInfo?.id

  // Progress calculations
  const progressData = useMemo(() => {
    if (activeFlows.length === 0) return { percentage: 0, completed: 0, total: 0 }
    const totalSteps = activeFlows.reduce((sum, f) => sum + (f.totalSteps || 0), 0)
    const completedSteps = activeFlows.reduce((sum, f) => sum + (f.completedSteps || 0), 0)
    return {
      percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      completed: completedSteps,
      total: totalSteps
    }
  }, [activeFlows])

  // Due date calculations
  const dueInfo = useMemo(() => {
    if (!metadata?.dueDate)
      return { status: 'none', text: 'Not set', badgeVariant: null as string | null, badgeText: null as string | null }
    const dueDate = new Date(metadata.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const isCompleted = metadata?.status === 'completed' || metadata?.status === 'closed'

    if (isCompleted) return { status: 'completed', text: 'Completed', badgeVariant: 'success', badgeText: 'Done' }
    if (diffDays < 0)
      return {
        status: 'overdue',
        text: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`,
        badgeVariant: 'destructive',
        badgeText: 'Overdue'
      }
    if (diffDays === 0) return { status: 'today', text: 'Due today', badgeVariant: 'warning', badgeText: 'Due today' }
    if (diffDays <= 3)
      return {
        status: 'soon',
        text: `${diffDays} day${diffDays !== 1 ? 's' : ''}`,
        badgeVariant: 'warning',
        badgeText: 'Due soon'
      }
    return {
      status: 'ok',
      text: `${diffDays} day${diffDays !== 1 ? 's' : ''}`,
      badgeVariant: 'success',
      badgeText: 'On track'
    }
  }, [metadata?.dueDate, metadata?.status])

  if (isLoading || !caseData) {
    return (
      <div className="nw:flex nw:items-center nw:justify-center nw:h-64">
        <div className="nw:text-center">
          <div className="nw:animate-spin nw:rounded-full nw:h-12 nw:w-12 nw:border-b-2 nw:border-primary nw:mx-auto nw:mb-4" />
          <p className="nw:text-muted-foreground">Loading case details...</p>
        </div>
      </div>
    )
  }

  const handleComplete = async () => {
    if (!canComplete || isCompleting) return
    try {
      setIsCompleting(true)
      await onCompleteCase(caseId)
      await refetch()
    } catch (error) {
      console.error('Failed to complete case:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleAssignToMe = async () => {
    if (!onUpdateCase || isAssigningToMe) return
    const currentUserId = context.userInfo?.id
    if (!currentUserId) return
    try {
      setIsAssigningToMe(true)
      await onUpdateCase(caseId, { assignedTo: currentUserId } as any)
      await refetch()
    } catch (error) {
      console.error('Failed to assign case:', error)
    } finally {
      setIsAssigningToMe(false)
    }
  }

  const handleDelete = async (terminateFlows: boolean) => {
    if (!onDeleteCase) return
    await onDeleteCase(caseId, terminateFlows)
    // Navigation back will be handled by the parent component
  }

  const handleRestore = async () => {
    if (!onRestoreCase || isRestoring) return
    try {
      setIsRestoring(true)
      await onRestoreCase(caseId)
      await refetch()
    } catch (error) {
      console.error('Failed to restore case:', error)
    } finally {
      setIsRestoring(false)
    }
  }

  // Check if case is deleted (soft deleted)
  const isDeleted = metadata?.deleted === true

  // Build header actions
  const headerActions = (
    <div className="nw:flex nw:items-center nw:gap-2">
      {allowEdit && onUpdateCase && !isAssignedToMe && (
        <Button variant="outline" size="sm" onClick={handleAssignToMe} disabled={isAssigningToMe}>
          <UserCheck className="nw:h-4 nw:w-4 nw:mr-2" />
          {isAssigningToMe ? 'Assigning...' : 'Assign to me'}
        </Button>
      )}
      {allowEdit && onUpdateCase && (
        <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
          <Pencil className="nw:h-4 nw:w-4 nw:mr-2" />
          Edit
        </Button>
      )}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          const prompt = buildCaseAiPrompt(caseData, linkedFlows, activeFlows, blockingFlows)
          setAiPrompt(prompt)
          openEveryAI({ prompt })
          setShowAiSummary(true)
          setPromptCopied(false)
        }}
      >
        <Bot className="nw:h-4 nw:w-4 nw:mr-2" />
        AI Summary
      </Button>
      <Button variant="outline" size="sm" onClick={refetch}>
        <RefreshCw className="nw:h-4 nw:w-4 nw:mr-2" />
        Refresh
      </Button>
      {!isDeleted && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={handleComplete}
                  disabled={!canComplete || isCompleting}
                  variant={blockingFlows.length > 0 ? 'outline' : 'default'}
                  size="sm"
                >
                  {blockingFlows.length > 0 ? (
                    <AlertTriangle className="nw:h-4 nw:w-4 nw:mr-2 nw:text-yellow-600" />
                  ) : (
                    <Check className="nw:h-4 nw:w-4 nw:mr-2" />
                  )}
                  {isCompleting ? 'Completing...' : 'Complete Case'}
                </Button>
              </span>
            </TooltipTrigger>
            {blockingFlows.length > 0 && (
              <TooltipContent side="bottom" className="nw:max-w-xs">
                <div className="nw:flex nw:items-start nw:gap-2">
                  <AlertTriangle className="nw:h-4 nw:w-4 nw:text-yellow-600 nw:mt-0.5 nw:flex-shrink-0" />
                  <div>
                    <p className="nw:font-medium">Cannot complete case</p>
                    <p className="nw:text-xs nw:text-muted-foreground nw:mt-1">
                      {blockingFlows.length} flow{blockingFlows.length > 1 ? 's are' : ' is'} not in terminal state.
                    </p>
                  </div>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
      {/* Restore button - only show for deleted cases */}
      {isDeleted && onRestoreCase && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          disabled={isRestoring}
          className="nw:text-green-600 nw:border-green-600 hover:nw:bg-green-50"
        >
          <RotateCcw className="nw:h-4 nw:w-4 nw:mr-2" />
          {isRestoring ? 'Restoring...' : 'Restore Case'}
        </Button>
      )}
    </div>
  )

  // Build header detail groups for KPIs - using simple values as per HorizontalHeader expectations
  const headerDetailGroups = [
    {
      id: 'kpis',
      items: [
        {
          id: 'status',
          label: 'Status',
          value: <CaseStatusBadge status={metadata?.status || 'open'} />,
          icon: CheckCircle2
        },
        {
          id: 'due',
          label: 'Due In',
          value: (
            <span className="nw:flex nw:items-center nw:gap-2">
              <span>{dueInfo.text}</span>
              {dueInfo.badgeVariant && (
                <Badge variant={dueInfo.badgeVariant as any} className="nw:text-xs">
                  {dueInfo.badgeText}
                </Badge>
              )}
            </span>
          ),
          icon: CalendarClock
        },
        {
          id: 'progress',
          label: 'Progress',
          value: `${progressData.percentage}% (${progressData.completed} of ${progressData.total})`,
          icon: Activity
        },
        {
          id: 'priority',
          label: 'Priority',
          value: (() => {
            const priority = metadata?.priority || 'medium'
            const variants: Record<string, 'default' | 'destructive' | 'warning' | 'info'> = {
              low: 'default',
              medium: 'info',
              high: 'warning',
              critical: 'destructive'
            }
            return (
              <Badge variant={variants[priority] || 'info'} className="nw:capitalize">
                {priority}
              </Badge>
            )
          })(),
          icon: Flag
        }
      ]
    }
  ]

  // Custom grid class for auto-height rows
  const autoHeightGridClass =
    'layout-content nw:py-6 nw:grid nw:gap-6 nw:grid-cols-1 nw:lg:grid-cols-12 nw:auto-rows-auto'

  // Overview Tab Content
  const overviewContent = (
    <>
      {/* Left Column - Main Content */}
      <div className="nw:lg:col-span-8 nw:space-y-6">
        {/* Two Column Row: Case Information + Flows Progress */}
        <div className="nw:grid nw:grid-cols-1 nw:md:grid-cols-2 nw:gap-6">
          {/* Case Information */}
          <Card>
            <CardHeader className="gba:pb-4">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
                <FileText className="gba:h-4 gba:w-4" />
                Case Information
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-6">
              {/* Row 1: Case ID and Created */}
              <div className="gba:grid gba:grid-cols-2 gba:gap-x-6">
                <div>
                  <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-2">
                    Case ID
                  </dt>
                  <dd className="gba:text-sm gba:font-mono">{formatCaseId(caseId)}</dd>
                </div>
                <div>
                  <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-2">
                    Created
                  </dt>
                  <dd className="gba:text-sm">{formatDate(caseData.createdAt)}</dd>
                </div>
              </div>

              {/* Row 2: Assigned To and Due Date */}
              <div className="gba:grid gba:grid-cols-2 gba:gap-x-6">
                <div>
                  <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-2">
                    Assigned To
                  </dt>
                  <dd>
                    {metadata?.assignedTo ? (
                      (() => {
                        const assigneeName =
                          userNames.get(metadata.assignedTo) || metadata.assignedTo.slice(0, 8) + '...'
                        const assigneeEmployee = userEmployees.get(metadata.assignedTo)
                        const assigneeInitials = assigneeName
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                        return (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Avatar className="gba:h-6 gba:w-6">
                              {assigneeEmployee?.pictureThumbnail && (
                                <AvatarImage
                                  src={`data:image/png;base64,${assigneeEmployee.pictureThumbnail}`}
                                  alt={assigneeName}
                                />
                              )}
                              <AvatarFallback className="gba:text-xs">{assigneeInitials}</AvatarFallback>
                            </Avatar>
                            <span className="gba:text-sm">{assigneeName}</span>
                          </div>
                        )
                      })()
                    ) : (
                      <span className="gba:text-sm gba:text-muted-foreground">Unassigned</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-2">
                    Due Date
                  </dt>
                  <dd className="gba:text-sm">
                    {metadata?.dueDate ? (
                      formatDate(metadata.dueDate)
                    ) : (
                      <span className="gba:text-muted-foreground">Not set</span>
                    )}
                  </dd>
                </div>
              </div>

              {/* Row 3: Description (full width) */}
              {metadata?.description && (
                <div>
                  <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-2">
                    Description
                  </dt>
                  <dd className="gba:text-sm gba:text-muted-foreground">{metadata.description}</dd>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flows Progress */}
          <Card>
            <CardHeader className="nw:pb-4">
              <CardTitle className="nw:flex nw:items-center nw:justify-between nw:text-base">
                <div className="nw:flex nw:items-center nw:gap-2">
                  <Activity className="nw:h-4 nw:w-4" />
                  Flows Progress
                </div>
                {activeFlows.length > 0 && (
                  <Button variant="ghost" size="sm" className="nw:text-xs nw:h-7" onClick={() => setActiveTab('flows')}>
                    View all ({activeFlows.length})
                    <ArrowRight className="nw:h-3 nw:w-3 nw:ml-1" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeFlows.length === 0 ? (
                <div className="nw:text-center nw:py-8 nw:text-muted-foreground">
                  <Activity className="nw:h-10 nw:w-10 nw:mx-auto nw:mb-3 nw:opacity-30" />
                  <p className="nw:text-sm nw:font-medium">No flows yet</p>
                  <p className="nw:text-xs nw:mt-1">Flows will appear here once added</p>
                </div>
              ) : (
                <div className="nw:space-y-4">
                  {/* Overall Progress */}
                  <div className="nw:space-y-2">
                    <div className="nw:flex nw:items-center nw:justify-between nw:text-sm">
                      <span className="nw:text-muted-foreground">
                        {progressData.completed}/{progressData.total} steps
                      </span>
                      <span className="nw:font-medium">{progressData.percentage}%</span>
                    </div>
                    <Progress value={progressData.percentage} className="nw:h-2" />
                  </div>

                  {/* Individual Flows */}
                  <div className="nw:space-y-3">
                    {activeFlows.slice(0, 3).map(flow => {
                      const totalSteps = flow.totalSteps || 0
                      const completedSteps = flow.completedSteps || 0
                      const flowProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
                      return (
                        <div key={flow.workflowId} className="nw:space-y-1.5">
                          <div className="nw:flex nw:items-center nw:justify-between">
                            <div className="nw:flex nw:items-center nw:gap-2 nw:min-w-0">
                              <Loader2 className="nw:h-4 nw:w-4 nw:text-primary nw:animate-spin nw:flex-shrink-0" />
                              <span className="nw:text-sm nw:truncate">
                                {flow.workflowName || flow.templateId || 'Unnamed Flow'}
                              </span>
                            </div>
                            <span className="nw:text-xs nw:text-muted-foreground nw:flex-shrink-0 nw:ml-2">
                              {completedSteps}/{totalSteps}
                            </span>
                          </div>
                          <Progress value={flowProgress} className="nw:h-1.5" />
                        </div>
                      )
                    })}
                    {activeFlows.length > 3 && (
                      <button
                        className="nw:text-xs nw:text-primary nw:text-center nw:pt-1 nw:w-full hover:nw:underline nw:cursor-pointer"
                        onClick={() => setActiveTab('flows')}
                      >
                        +{activeFlows.length - 3} more flows
                      </button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Participants Card */}
        <Card>
          <CardHeader className="nw:pb-4">
            <CardTitle className="nw:text-base nw:flex nw:items-center nw:gap-2">
              <Users className="nw:h-4 nw:w-4" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allParticipantIds.length === 0 ? (
              <p className="nw:text-sm nw:text-muted-foreground nw:text-center nw:py-4">No participants yet</p>
            ) : isLoadingEmployees ? (
              <div className="nw:flex nw:items-center nw:gap-2">
                <div className="nw:animate-spin nw:rounded-full nw:h-4 nw:w-4 nw:border-b-2 nw:border-primary" />
                <span className="nw:text-sm nw:text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <div className="nw:flex nw:flex-wrap nw:gap-3">
                {allParticipantIds.slice(0, 8).map(userId => {
                  const displayName = userNames.get(userId) || userId.slice(0, 8) + '...'
                  const employee = userEmployees.get(userId)
                  const initials = displayName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                  return (
                    <TooltipProvider key={userId}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="nw:flex nw:items-center nw:gap-2 nw:py-1.5 nw:px-2.5 nw:rounded-lg nw:border nw:border-border nw:bg-card hover:nw:bg-accent nw:transition-colors nw:cursor-pointer"
                            onClick={() => window.open(`/platform/employee/profile/${userId}`, '_blank')}
                          >
                            <Avatar className="nw:h-6 nw:w-6">
                              {employee?.pictureThumbnail ? (
                                <AvatarImage
                                  src={`data:image/png;base64,${employee.pictureThumbnail}`}
                                  alt={displayName}
                                />
                              ) : null}
                              <AvatarFallback className="nw:text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="nw:text-sm nw:font-medium nw:max-w-[100px] nw:truncate">
                              {displayName}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>{displayName}</p>
                          <p className="nw:text-xs nw:text-muted-foreground">Click to view profile</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                })}
                {allParticipantIds.length > 8 && (
                  <div className="nw:flex nw:items-center nw:justify-center nw:py-1.5 nw:px-2.5 nw:rounded-lg nw:border nw:border-dashed nw:border-border nw:bg-muted/30 nw:text-sm nw:text-muted-foreground">
                    +{allParticipantIds.length - 8} more
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader className="nw:pb-4">
            <CardTitle className="nw:flex nw:items-center nw:justify-between nw:text-base">
              <div className="nw:flex nw:items-center nw:gap-2">
                <MessageSquare className="nw:h-4 nw:w-4" />
                Recent Notes
              </div>
              {notes.length > 0 && (
                <Button variant="ghost" size="sm" className="nw:text-xs nw:h-7" onClick={() => setActiveTab('notes')}>
                  View all ({notes.length})
                  <ArrowRight className="nw:h-3 nw:w-3 nw:ml-1" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <div className="nw:text-center nw:py-8 nw:text-muted-foreground">
                <MessageSquare className="nw:h-10 nw:w-10 nw:mx-auto nw:mb-3 nw:opacity-30" />
                <p className="nw:text-sm nw:font-medium">No notes yet</p>
                <p className="nw:text-xs nw:mt-1">Notes will appear here once added</p>
                {allowEdit && (
                  <Button variant="outline" size="sm" className="nw:mt-4" onClick={() => setActiveTab('notes')}>
                    Add a note
                  </Button>
                )}
              </div>
            ) : (
              <div className="nw:space-y-3">
                {notes.slice(0, 3).map((note: any, index: number) => {
                  const displayName = userNames.get(note.createdBy) || note.createdBy.slice(0, 8) + '...'
                  const employee = userEmployees.get(note.createdBy)
                  const initials = displayName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                  return (
                    <div
                      key={note.id || index}
                      className="nw:flex nw:gap-3 nw:p-3 nw:rounded-lg nw:bg-muted/40 nw:border nw:border-border/50"
                    >
                      <Avatar className="nw:h-8 nw:w-8 nw:flex-shrink-0">
                        {employee?.pictureThumbnail && (
                          <AvatarImage src={`data:image/png;base64,${employee.pictureThumbnail}`} alt={displayName} />
                        )}
                        <AvatarFallback className="nw:text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="nw:flex-1 nw:min-w-0">
                        <div className="nw:flex nw:items-center nw:gap-2 nw:mb-1">
                          <span className="nw:text-sm nw:font-medium nw:truncate">{displayName}</span>
                          <Badge variant="outline" className="nw:text-xs nw:capitalize">
                            {note.visibility}
                          </Badge>
                          <span className="nw:text-xs nw:text-muted-foreground nw:flex nw:items-center nw:gap-1 nw:ml-auto">
                            <Clock className="nw:h-3 nw:w-3" />
                            {formatRelativeTime(note.createdAt)}
                          </span>
                        </div>
                        <p className="nw:text-sm nw:text-muted-foreground nw:line-clamp-2">{note.content}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Activity Feed */}
      <div className="nw:lg:col-span-4">
        <CaseActivityFeed caseId={caseId} context={context} maxItems={20} />
      </div>
    </>
  )

  // Flows Tab Content
  const flowsContent = (
    <div className="nw:col-span-full">
      <FlowManagementPanel
        caseId={caseId}
        linkedFlows={linkedFlows}
        onAddFlow={async request => {
          await onAddFlow(caseId, request)
          await refetch()
        }}
        onRemoveFlow={async workflowId => {
          await onRemoveFlow(caseId, workflowId)
          await refetch()
        }}
        context={context}
        appTag={appTag}
        readOnly={!allowEdit}
        caseCreatedAt={caseData.createdAt}
        caseDueDate={metadata?.dueDate}
      />
    </div>
  )

  // Notes Tab Content
  const notesContent = (
    <div className="nw:col-span-full">
      <CaseNotesPanel
        notes={metadata?.notes || []}
        onAddNote={async (content, visibility) => {
          await onAddNote(caseId, content, visibility)
          await refetch()
        }}
        onEditNote={
          onEditNote
            ? async (noteId, content) => {
                await onEditNote(caseId, noteId, content)
                await refetch()
              }
            : undefined
        }
        onDeleteNote={
          onDeleteNote
            ? async noteId => {
                await onDeleteNote(caseId, noteId)
                await refetch()
              }
            : undefined
        }
        currentUserId={context.userInfo?.id || 'system'}
        readOnly={!allowEdit}
        accessToken={context.accessToken}
      />
    </div>
  )

  // Related Cases Tab Content
  const relatedCasesContent = (
    <div className="nw:col-span-full">
      <RelatedCasesPanel
        caseId={caseId}
        linkedCases={metadata?.linkedCases || []}
        parentCaseId={metadata?.parentCaseId}
        onLinkCase={async (targetCaseId, relationship) => {
          if (onLinkCase) {
            await onLinkCase(caseId, targetCaseId, relationship)
            await refetch()
          }
        }}
        onUnlinkCase={async targetCaseId => {
          if (onUnlinkCase) {
            await onUnlinkCase(caseId, targetCaseId)
            await refetch()
          }
        }}
        onNavigateToCase={navigateCaseId => {
          if (onNavigateToCase) {
            onNavigateToCase(navigateCaseId)
          }
        }}
        context={context}
        tags={appTag ? { app: appTag } : undefined}
        readOnly={!allowEdit || !onLinkCase}
      />
    </div>
  )

  // Diagram Tab Content - Case Relationship Graph
  const diagramContent = (
    <div className="nw:col-span-full">
      <CaseRelationshipGraph
        caseId={caseId}
        context={context}
        currentCase={caseData}
        linkedCases={metadata?.linkedCases || []}
        onCaseSelect={selectedCaseId => {
          console.log('Case selected in diagram:', selectedCaseId)
        }}
        onNavigateToCase={navigateCaseId => {
          if (onNavigateToCase) {
            onNavigateToCase(navigateCaseId)
          }
        }}
        height={600}
        showMinimap={true}
      />
    </div>
  )

  // Links Tab Content
  const linksContent = (
    <div className="nw:col-span-full">
      <EntityLinkingPanel
        linkedEntities={metadata?.linkedEntities || []}
        onLinkEntity={async entity => {
          await onLinkEntity(caseId, entity)
          await refetch()
        }}
        onUnlinkEntity={async entityId => {
          await onUnlinkEntity(caseId, entityId)
          await refetch()
        }}
        context={context}
        readOnly={!allowEdit}
      />
    </div>
  )

  return (
    <>
      {/* Deleted Case Banner */}
      {isDeleted && (
        <div className="nw:bg-destructive/10 nw:border-b nw:border-destructive/20 nw:px-4 nw:py-3">
          <div className="nw:flex nw:items-center nw:justify-center nw:gap-3">
            <Trash2 className="nw:h-5 nw:w-5 nw:text-destructive" />
            <div className="nw:text-center">
              <span className="nw:font-medium nw:text-destructive">This case has been deleted</span>
              {metadata?.deletedAt && (
                <span className="nw:text-sm nw:text-muted-foreground nw:ml-2">on {formatDate(metadata.deletedAt)}</span>
              )}
            </div>
            {onRestoreCase && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestore}
                disabled={isRestoring}
                className="nw:ml-4 nw:text-green-600 nw:border-green-600 hover:nw:bg-green-50"
              >
                <RotateCcw className="nw:h-4 nw:w-4 nw:mr-2" />
                {isRestoring ? 'Restoring...' : 'Restore'}
              </Button>
            )}
          </div>
        </div>
      )}

      <RecordLayout
        headerCategory={headerCategory}
        onBack={onBack}
        headerTitle={metadata?.title || formatCaseId(caseId)}
        headerSubtitle={metadata?.description || 'Case details and management'}
        headerActions={headerActions}
        headerDetailGroups={headerDetailGroups}
        subViews={{
          value: activeTab,
          onValueChange: setActiveTab,
          items: [
            {
              value: 'overview',
              label: 'Overview',
              icon: <LayoutDashboard className="nw:h-4 nw:w-4" />,
              content: overviewContent,
              contentClassName: autoHeightGridClass
            },
            {
              value: 'flows',
              label: 'Flows',
              icon: <Activity className="nw:h-4 nw:w-4" />,
              content: flowsContent,
              contentClassName: autoHeightGridClass
            },
            {
              value: 'notes',
              label: 'Notes',
              icon: <MessageSquare className="nw:h-4 nw:w-4" />,
              content: notesContent,
              contentClassName: autoHeightGridClass
            },
            {
              value: 'related-cases',
              label: 'Related Cases',
              icon: <GitBranch className="nw:h-4 nw:w-4" />,
              content: relatedCasesContent,
              contentClassName: autoHeightGridClass
            },
            {
              value: 'diagram',
              label: 'Diagram',
              icon: <Network className="nw:h-4 nw:w-4" />,
              content: diagramContent,
              contentClassName: autoHeightGridClass
            },
            {
              value: 'links',
              label: 'Links',
              icon: <Link2 className="nw:h-4 nw:w-4" />,
              content: linksContent,
              contentClassName: autoHeightGridClass
            }
          ]
        }}
      />

      {/* AI Summary Dialog */}
      <Dialog open={showAiSummary} onOpenChange={setShowAiSummary}>
        <DialogContent className="nw:max-w-2xl nw:max-h-[80vh] nw:bg-gradient-to-br nw:from-white nw:to-purple-50 dark:nw:from-gray-900 dark:nw:to-purple-950/30">
          <DialogHeader>
            <DialogTitle className="nw:flex nw:items-center nw:gap-2">
              <div className="nw:p-2 nw:rounded-lg nw:bg-gradient-to-br nw:from-purple-500 nw:to-blue-500">
                <Sparkles className="nw:h-5 nw:w-5 nw:text-white" />
              </div>
              <span>AI Case Analysis</span>
              <Badge
                variant="outline"
                className="nw:ml-2 nw:text-xs nw:font-normal nw:border-purple-300 nw:text-purple-600"
              >
                Sent to Every AI
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="nw:space-y-4 nw:py-4">
            <div className="nw:p-3 nw:rounded-lg nw:bg-purple-100 dark:nw:bg-purple-900/30 nw:border nw:border-purple-200 dark:nw:border-purple-800">
              <p className="nw:text-sm nw:text-purple-800 dark:nw:text-purple-200 nw:flex nw:items-center nw:gap-2">
                <Bot className="nw:h-4 nw:w-4" />
                This prompt has been sent to Every AI sidebar. You can also copy it below.
              </p>
            </div>

            <div className="nw:relative">
              <div className="nw:flex nw:items-center nw:justify-between nw:mb-2">
                <h4 className="nw:text-sm nw:font-medium nw:flex nw:items-center nw:gap-2">
                  <Sparkles className="nw:h-4 nw:w-4 nw:text-purple-600" />
                  Generated Prompt
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(aiPrompt)
                    setPromptCopied(true)
                    setTimeout(() => setPromptCopied(false), 2000)
                  }}
                  className="nw:h-8"
                >
                  {promptCopied ? (
                    <>
                      <CheckCheck className="nw:h-4 nw:w-4 nw:mr-1 nw:text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="nw:h-4 nw:w-4 nw:mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="nw:p-4 nw:rounded-lg nw:bg-gray-900 dark:nw:bg-gray-950 nw:border nw:border-gray-700 nw:max-h-[40vh] nw:overflow-y-auto">
                <pre className="nw:text-xs nw:text-gray-100 nw:whitespace-pre-wrap nw:font-mono nw:leading-relaxed">
                  {aiPrompt}
                </pre>
              </div>
            </div>

            <div className="nw:flex nw:items-center nw:gap-2 nw:text-xs nw:text-muted-foreground nw:pt-2">
              <Sparkles className="nw:h-3 nw:w-3 nw:text-purple-400" />
              <span>Prompt includes case data, workflows, and notes for comprehensive AI analysis</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiSummary(false)}>
              <X className="nw:h-4 nw:w-4 nw:mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Case Modal */}
      {onUpdateCase && (
        <EditCaseModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          caseData={caseData}
          accessToken={context.accessToken}
          onSave={async updates => {
            await onUpdateCase(caseId, updates)
            await refetch()
          }}
          onDelete={onDeleteCase ? handleDelete : undefined}
          activeFlowsCount={activeFlows.length}
        />
      )}
    </>
  )
}
