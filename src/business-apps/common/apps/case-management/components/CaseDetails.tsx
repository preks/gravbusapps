/**
 * Case Details Component
 *
 * Detailed view of a case with tabbed sections
 */

import React, { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  PageHeader,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Badge
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
  Loader2,
  AlertCircle,
  CalendarClock,
  FileText
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
import { useCaseData } from '../hooks'
import { openEveryAI } from '@/common/utils/openEveryAI'
import { useEmployeeNamesBatch } from '@/business-apps/ser/hooks/useEmployeeNamesBatch'
import { Avatar, AvatarFallback, AvatarImage, Progress } from '@newwork/nw-design-system'

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
  onBack: () => void
  onCompleteCase: (caseId: string) => Promise<void>
  onAddFlow: (caseId: string, request: AddFlowRequest) => Promise<void>
  onRemoveFlow: (caseId: string, workflowId: string) => Promise<void>
  onAddNote: (caseId: string, content: string, visibility: 'internal' | 'external') => Promise<void>
  onLinkEntity: (caseId: string, entity: LinkedEntity) => Promise<void>
  onUnlinkEntity: (caseId: string, entityId: string) => Promise<void>
  onLinkCase?: (caseId: string, targetCaseId: string, relationship: 'parent' | 'child' | 'related') => Promise<void>
  onUnlinkCase?: (caseId: string, targetCaseId: string) => Promise<void>
  onNavigateToCase?: (caseId: string) => void
  onUpdateCase?: (
    caseId: string,
    updates: { title?: string; description?: string; priority?: CasePriority }
  ) => Promise<void>
  allowEdit?: boolean
}

export const CaseDetails: React.FC<CaseDetailsProps> = ({
  caseId,
  context,
  appTag,
  onBack,
  onCompleteCase,
  onAddFlow,
  onRemoveFlow,
  onAddNote,
  onLinkEntity,
  onUnlinkEntity,
  onLinkCase,
  onUnlinkCase,
  onNavigateToCase,
  onUpdateCase,
  allowEdit = true
}) => {
  const { caseData, linkedFlows, isLoading, refetch } = useCaseData(caseId, context)
  const [activeTab, setActiveTab] = useState('overview')
  const [isCompleting, setIsCompleting] = useState(false)
  const [showAiSummary, setShowAiSummary] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
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

  if (isLoading || !caseData) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <div className="gba:text-center">
          <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary gba:mx-auto gba:mb-4" />
          <p className="gba:text-muted-foreground">Loading case details...</p>
        </div>
      </div>
    )
  }

  const metadata = caseData.state?.metadata || {}
  const canComplete = canCompleteCase(caseData)

  // Calculate blocking flows (active flows not in terminal state)
  const blockingFlows = activeFlows.filter(f => !isFlowTerminal(f))

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
      await onUpdateCase(caseId, { assignedTo: currentUserId })
      await refetch()
    } catch (error) {
      console.error('Failed to assign case:', error)
    } finally {
      setIsAssigningToMe(false)
    }
  }

  // Check if case is already assigned to current user
  const isAssignedToMe = metadata?.assignedTo === context.userInfo?.id

  return (
    <div className="gba:flex gba:flex-col gba:gap-6 gba:p-6">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <PageHeader
          title={metadata?.title || formatCaseId(caseId)}
          subtitle={metadata?.description || 'Case details and management'}
          onBack={onBack}
        />
        <div className="gba:flex gba:items-center gba:gap-2">
          {/* Assign to me button - only show if not already assigned to current user */}
          {allowEdit && onUpdateCase && !isAssignedToMe && (
            <Button
              variant="outline"
              onClick={handleAssignToMe}
              disabled={isAssigningToMe}
              data-testid="case-assign-to-me-button"
            >
              <UserCheck className="gba:h-4 gba:w-4 gba:mr-2" />
              {isAssigningToMe ? 'Assigning...' : 'Assign to me'}
            </Button>
          )}
          {allowEdit && onUpdateCase && (
            <Button variant="outline" onClick={() => setShowEditModal(true)} data-testid="case-edit-button">
              <Pencil className="gba:h-4 gba:w-4 gba:mr-2" />
              Edit
            </Button>
          )}
          <Button
            variant="ai"
            onClick={() => {
              // Build the prompt with case data
              const prompt = buildCaseAiPrompt(caseData, linkedFlows, activeFlows, blockingFlows)
              setAiPrompt(prompt)

              // Send to Every AI
              openEveryAI({ prompt })

              // Also show local dialog
              setShowAiSummary(true)
              setPromptCopied(false)
            }}
            data-testid="case-ai-summary-button"
          >
            <Bot className="gba:h-4 gba:w-4 gba:mr-2" />
            AI Summary
          </Button>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
            Refresh
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleComplete}
                    disabled={!canComplete || isCompleting}
                    variant={blockingFlows.length > 0 ? 'outline' : 'default'}
                  >
                    {blockingFlows.length > 0 ? (
                      <AlertTriangle className="gba:h-4 gba:w-4 gba:mr-2 gba:text-yellow-600" />
                    ) : (
                      <Check className="gba:h-4 gba:w-4 gba:mr-2" />
                    )}
                    {isCompleting ? 'Completing...' : 'Complete Case'}
                  </Button>
                </span>
              </TooltipTrigger>
              {blockingFlows.length > 0 && (
                <TooltipContent side="bottom" className="gba:max-w-xs">
                  <div className="gba:flex gba:items-start gba:gap-2">
                    <AlertTriangle className="gba:h-4 gba:w-4 gba:text-yellow-600 gba:mt-0.5 gba:flex-shrink-0" />
                    <div>
                      <p className="gba:font-medium">Cannot complete case</p>
                      <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                        {blockingFlows.length} flow{blockingFlows.length > 1 ? 's are' : ' is'} not in terminal state.
                        All flows must be completed, failed, or terminated before the case can be closed.
                      </p>
                    </div>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* KPIs Row - Compact design for case detail context */}
      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
        {/* Status KPI */}
        <Card className="gba:shadow-none gba:border">
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <span className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wide">Status</span>
              <CaseStatusBadge status={metadata?.status || 'open'} />
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">Created {formatDate(caseData.createdAt)}</div>
          </CardContent>
        </Card>

        {/* Due In KPI */}
        <Card className="gba:shadow-none gba:border">
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <span className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wide">Due In</span>
              {(() => {
                if (!metadata?.dueDate) return null
                const dueDate = new Date(metadata.dueDate)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                dueDate.setHours(0, 0, 0, 0)
                const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                const isCompleted = metadata?.status === 'completed' || metadata?.status === 'closed'

                if (isCompleted) return <Badge variant="success">Completed</Badge>
                if (diffDays < 0) return <Badge variant="destructive">Overdue</Badge>
                if (diffDays <= 3) return <Badge variant="warning">Due soon</Badge>
                return <Badge variant="success">On track</Badge>
              })()}
            </div>
            <div className="gba:text-sm gba:font-medium">
              {(() => {
                if (!metadata?.dueDate) return 'Not set'
                const dueDate = new Date(metadata.dueDate)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                dueDate.setHours(0, 0, 0, 0)
                const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                const isCompleted = metadata?.status === 'completed' || metadata?.status === 'closed'

                if (isCompleted) return 'Done'
                if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`
                if (diffDays === 0) return 'Today'
                return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
              })()}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {metadata?.dueDate ? formatDate(metadata.dueDate) : 'No due date'}
            </div>
          </CardContent>
        </Card>

        {/* Progress KPI */}
        <Card className="gba:shadow-none gba:border">
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <span className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wide">Progress</span>
              <span className="gba:text-sm gba:font-semibold">
                {(() => {
                  const flows = activeFlows
                  if (flows.length === 0) return '0%'
                  const totalSteps = flows.reduce((sum, f) => sum + (f.totalSteps || 0), 0)
                  const completedSteps = flows.reduce((sum, f) => sum + (f.completedSteps || 0), 0)
                  return totalSteps > 0 ? `${Math.round((completedSteps / totalSteps) * 100)}%` : '0%'
                })()}
              </span>
            </div>
            <Progress
              value={(() => {
                const flows = activeFlows
                if (flows.length === 0) return 0
                const totalSteps = flows.reduce((sum, f) => sum + (f.totalSteps || 0), 0)
                const completedSteps = flows.reduce((sum, f) => sum + (f.completedSteps || 0), 0)
                return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
              })()}
              className="gba:h-1.5 gba:mb-2"
            />
            <div className="gba:text-xs gba:text-muted-foreground">
              {(() => {
                const flows = activeFlows
                if (flows.length === 0) return 'No flows'
                const totalSteps = flows.reduce((sum, f) => sum + (f.totalSteps || 0), 0)
                const completedSteps = flows.reduce((sum, f) => sum + (f.completedSteps || 0), 0)
                return `${completedSteps} of ${totalSteps} steps`
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Priority KPI */}
        <Card className="gba:shadow-none gba:border">
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <span className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wide">Priority</span>
              {(() => {
                const priority = metadata?.priority || 'medium'
                const variants: Record<string, 'default' | 'destructive' | 'warning' | 'info'> = {
                  low: 'default',
                  medium: 'info',
                  high: 'warning',
                  critical: 'destructive'
                }
                return (
                  <Badge variant={variants[priority] || 'info'} className="gba:capitalize">
                    {priority}
                  </Badge>
                )
              })()}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {metadata?.assignedTo ? 'Assigned' : 'Unassigned'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
        <TabsList className="gba:w-full gba:justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="flows">Flows ({linkedFlows.filter(f => !f.removedAt).length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({metadata?.notes?.length || 0})</TabsTrigger>
          <TabsTrigger value="related-cases">Related Cases ({metadata?.linkedCases?.length || 0})</TabsTrigger>
          <TabsTrigger value="links">Links ({metadata?.linkedEntities?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="gba:mt-4">
          <div
            className="gba:flex gba:flex-col gba:gap-4"
            style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1rem' }}
          >
            {/* Left Column - Case Info */}
            <div className="gba:space-y-4">
              {/* Case Information (left) + Flows Progress & Participants (right) */}
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                {/* Case Information with Description */}
                <Card className="gba:h-full">
                  <CardHeader className="gba:py-3 gba:px-4">
                    <CardTitle className="gba:flex gba:items-center gba:justify-between gba:text-base">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <FileText className="gba:h-4 gba:w-4" />
                        Case Information
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="gba:px-4 gba:pt-0 gba:space-y-4">
                    <dl className="gba:space-y-3">
                      <div className="gba:grid gba:grid-cols-2 gba:gap-x-4 gba:gap-y-3">
                        <div>
                          <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                            Case ID
                          </dt>
                          <dd className="gba:mt-0.5 gba:text-sm gba:font-mono">{formatCaseId(caseId)}</dd>
                        </div>
                        <div>
                          <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                            Status
                          </dt>
                          <dd className="gba:mt-0.5">
                            {metadata?.status ? <CaseStatusBadge status={metadata.status} /> : 'N/A'}
                          </dd>
                        </div>
                        <div>
                          <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                            Priority
                          </dt>
                          <dd className="gba:mt-0.5 gba:text-sm gba:capitalize">{metadata?.priority || 'medium'}</dd>
                        </div>
                        <div>
                          <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                            Created At
                          </dt>
                          <dd className="gba:mt-0.5 gba:text-sm">{formatDate(caseData.createdAt)}</dd>
                        </div>
                      </div>
                      <div className="gba:grid gba:grid-cols-2 gba:gap-x-4 gba:gap-y-3">
                        <div>
                          <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                            Assigned To
                          </dt>
                          <dd className="gba:mt-0.5 gba:text-sm">
                            {metadata?.assignedTo ? (
                              (() => {
                                const assigneeId = metadata.assignedTo
                                const assigneeName = userNames.get(assigneeId) || assigneeId.slice(0, 8) + '...'
                                const assigneeEmployee = userEmployees.get(assigneeId)
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
                              <span className="gba:text-muted-foreground">Unassigned</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                            Due Date
                          </dt>
                          <dd className="gba:mt-0.5 gba:text-sm">
                            {metadata?.dueDate ? (
                              (() => {
                                const dueDate = new Date(metadata.dueDate)
                                const today = new Date()
                                today.setHours(0, 0, 0, 0)
                                const isOverdue = dueDate < today && metadata?.status !== 'completed'
                                const isDueSoon =
                                  !isOverdue &&
                                  dueDate <= new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) &&
                                  metadata?.status !== 'completed'

                                return (
                                  <span
                                    className={`gba:flex gba:items-center gba:gap-1.5 ${isOverdue ? 'gba:text-destructive gba:font-medium' : isDueSoon ? 'gba:text-orange-600' : ''}`}
                                  >
                                    {isOverdue && <AlertCircle className="gba:h-3.5 gba:w-3.5" />}
                                    {isDueSoon && !isOverdue && <CalendarClock className="gba:h-3.5 gba:w-3.5" />}
                                    {formatDate(metadata.dueDate)}
                                    {isOverdue && <span className="gba:text-xs">(Overdue)</span>}
                                    {isDueSoon && !isOverdue && <span className="gba:text-xs">(Due soon)</span>}
                                  </span>
                                )
                              })()
                            ) : (
                              <span className="gba:text-muted-foreground">Not set</span>
                            )}
                          </dd>
                        </div>
                      </div>
                    </dl>

                    {/* Description Section */}
                    <div className="gba:pt-3 gba:border-t">
                      <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-2">
                        Description
                      </dt>
                      <dd className="gba:text-sm gba:whitespace-pre-wrap">
                        {metadata?.description || (
                          <span className="gba:text-muted-foreground">No description provided</span>
                        )}
                      </dd>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Column: Flows Progress + Participants */}
                <div className="gba:space-y-4">
                  {/* Flows Progress */}
                  <Card>
                    <CardHeader className="gba:py-3 gba:px-4">
                      <CardTitle className="gba:flex gba:items-center gba:justify-between gba:text-base">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Activity className="gba:h-4 gba:w-4" />
                          Flows Progress
                        </div>
                        {activeFlows.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gba:text-xs gba:h-7"
                            onClick={() => setActiveTab('flows')}
                          >
                            View all ({activeFlows.length})
                            <ArrowRight className="gba:h-3 gba:w-3 gba:ml-1" />
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="gba:px-4 gba:pt-0">
                      {activeFlows.length > 0 ? (
                        (() => {
                          // Calculate overall step-level progress across all flows
                          const totalStepsAll = activeFlows.reduce((sum, f) => sum + (f.totalSteps || 0), 0)
                          const completedStepsAll = activeFlows.reduce((sum, f) => sum + (f.completedSteps || 0), 0)
                          const overallPercentage =
                            totalStepsAll > 0 ? Math.round((completedStepsAll / totalStepsAll) * 100) : 0

                          return (
                            <div className="gba:space-y-3">
                              {/* Overall Progress Bar */}
                              <div className="gba:space-y-1.5">
                                <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                                  <span className="gba:text-muted-foreground">
                                    {completedStepsAll}/{totalStepsAll} steps
                                  </span>
                                  <span className="gba:font-medium">{overallPercentage}%</span>
                                </div>
                                <Progress value={overallPercentage} className="gba:h-2" />
                              </div>

                              {/* Individual Flow Progress */}
                              <div className="gba:space-y-2">
                                {activeFlows.slice(0, 3).map((flow, index) => {
                                  const flowName = flow.workflowName || flow.templateId || `Flow ${index + 1}`
                                  const flowProgress = flow.progressPercentage || 0
                                  const isCompleted = isFlowTerminal(flow)
                                  const totalSteps = flow.totalSteps || 0
                                  const completedSteps = flow.completedSteps || 0

                                  return (
                                    <TooltipProvider key={flow.workflowId || index}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            className="gba:w-full gba:text-left gba:p-2 gba:rounded-lg gba:border gba:border-border hover:gba:bg-muted/50 gba:transition-colors"
                                            onClick={() => setActiveTab('flows')}
                                          >
                                            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                                              <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                                                {isCompleted ? (
                                                  <CheckCircle2 className="gba:h-3.5 gba:w-3.5 gba:text-green-500 gba:flex-shrink-0" />
                                                ) : (
                                                  <Loader2 className="gba:h-3.5 gba:w-3.5 gba:text-blue-500 gba:flex-shrink-0 gba:animate-spin" />
                                                )}
                                                <span className="gba:text-xs gba:font-medium gba:truncate">
                                                  {flowName}
                                                </span>
                                              </div>
                                              <span className="gba:text-xs gba:text-muted-foreground gba:flex-shrink-0 gba:ml-2">
                                                {completedSteps}/{totalSteps}
                                              </span>
                                            </div>
                                            <Progress value={flowProgress} className="gba:h-1" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="gba:max-w-[250px]">
                                          <p className="gba:font-medium">{flowName}</p>
                                          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                                            {isCompleted ? 'Completed' : `${flow.status || 'In Progress'}`}
                                          </p>
                                          <p className="gba:text-xs gba:mt-1">
                                            {completedSteps} of {totalSteps} steps ({flowProgress}%)
                                          </p>
                                          {flow.currentStepName && !isCompleted && (
                                            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                                              Current: {flow.currentStepName}
                                            </p>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )
                                })}
                                {activeFlows.length > 3 && (
                                  <button
                                    className="gba:w-full gba:text-center gba:text-xs gba:text-muted-foreground gba:py-1 hover:gba:text-foreground"
                                    onClick={() => setActiveTab('flows')}
                                  >
                                    +{activeFlows.length - 3} more flows
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })()
                      ) : (
                        <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
                          No flows linked to this case
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Participants */}
                  <Card>
                    <CardHeader className="gba:py-3 gba:px-4">
                      <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
                        <Users className="gba:h-4 gba:w-4" />
                        Participants {allParticipantIds.length > 0 && `(${allParticipantIds.length})`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {allParticipantIds.length === 0 ? (
                        <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
                          No participants yet
                        </p>
                      ) : isLoadingEmployees ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <div className="gba:animate-spin gba:rounded-full gba:h-4 gba:w-4 gba:border-b-2 gba:border-primary" />
                          <span className="gba:text-sm gba:text-muted-foreground">Loading...</span>
                        </div>
                      ) : (
                        <div className="gba:flex gba:flex-wrap gba:gap-2">
                          {allParticipantIds.slice(0, 8).map(userId => {
                            const displayName = userNames.get(userId) || userId.slice(0, 8) + '...'
                            const employee = userEmployees.get(userId)
                            const initials = displayName
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)

                            return (
                              <TooltipProvider key={userId}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="gba:flex gba:items-center gba:gap-2 gba:p-1.5 gba:rounded-lg gba:border gba:border-border gba:bg-card hover:gba:bg-accent gba:transition-colors gba:cursor-pointer"
                                      onClick={() => {
                                        window.open(`/platform/employee/profile/${userId}`, '_blank')
                                      }}
                                    >
                                      <Avatar className="gba:h-6 gba:w-6">
                                        {employee?.pictureThumbnail ? (
                                          <AvatarImage
                                            src={`data:image/png;base64,${employee.pictureThumbnail}`}
                                            alt={displayName}
                                          />
                                        ) : null}
                                        <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
                                      </Avatar>
                                      <span className="gba:text-xs gba:font-medium gba:max-w-[80px] gba:truncate">
                                        {displayName}
                                      </span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>{displayName}</p>
                                    <p className="gba:text-xs gba:text-muted-foreground">Click to view profile</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })}
                          {allParticipantIds.length > 8 && (
                            <span className="gba:text-xs gba:text-muted-foreground gba:self-center gba:ml-1">
                              +{allParticipantIds.length - 8} more
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Recent Notes */}
              <Card>
                <CardHeader className="gba:py-3 gba:px-4">
                  <CardTitle className="gba:flex gba:items-center gba:justify-between gba:text-base">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <MessageSquare className="gba:h-4 gba:w-4" />
                      Recent Notes
                    </div>
                    {notes.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:text-xs gba:h-7"
                        onClick={() => setActiveTab('notes')}
                      >
                        View all ({notes.length})
                        <ArrowRight className="gba:h-3 gba:w-3 gba:ml-1" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notes.length === 0 ? (
                    <div className="gba:text-center gba:py-6 gba:text-muted-foreground">
                      <MessageSquare className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:opacity-40" />
                      <p className="gba:text-sm">No notes yet</p>
                      {allowEdit && (
                        <Button variant="link" size="sm" className="gba:mt-1" onClick={() => setActiveTab('notes')}>
                          Add a note
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="gba:space-y-3">
                      {notes.slice(0, 3).map(
                        (
                          note: {
                            id: string
                            content: string
                            createdBy: string
                            createdAt: string
                            visibility: string
                          },
                          index: number
                        ) => {
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
                              className="gba:flex gba:gap-3 gba:p-2 gba:rounded-lg gba:bg-muted/30"
                            >
                              <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                                {employee?.pictureThumbnail && (
                                  <AvatarImage
                                    src={`data:image/png;base64,${employee.pictureThumbnail}`}
                                    alt={displayName}
                                  />
                                )}
                                <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="gba:flex-1 gba:min-w-0">
                                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-0.5">
                                  <span className="gba:text-sm gba:font-medium gba:truncate">{displayName}</span>
                                  <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                                    <Clock className="gba:h-3 gba:w-3" />
                                    {formatRelativeTime(note.createdAt)}
                                  </span>
                                </div>
                                <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2">{note.content}</p>
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Activity Log */}
            <div>
              <CaseActivityFeed caseId={caseId} context={context} maxItems={20} />
            </div>
          </div>
        </TabsContent>

        {/* Flows Tab */}
        <TabsContent value="flows" className="gba:mt-4">
          <FlowManagementPanel
            caseId={caseId}
            linkedFlows={linkedFlows}
            onAddFlow={async request => {
              await onAddFlow(caseId, request)
              await refetch() // Refresh to show new flow
            }}
            onRemoveFlow={async workflowId => {
              await onRemoveFlow(caseId, workflowId)
              await refetch() // Refresh to remove from list
            }}
            context={context}
            appTag={appTag}
            readOnly={!allowEdit}
          />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="gba:mt-4">
          <CaseNotesPanel
            notes={metadata?.notes || []}
            onAddNote={async (content, visibility) => {
              await onAddNote(caseId, content, visibility)
              await refetch() // Refresh to show new note
            }}
            currentUserId={context.userInfo?.id || 'system'}
            readOnly={!allowEdit}
            accessToken={context.accessToken}
          />
        </TabsContent>

        {/* Related Cases Tab */}
        <TabsContent value="related-cases" className="gba:mt-4">
          <RelatedCasesPanel
            caseId={caseId}
            linkedCases={metadata?.linkedCases || []}
            parentCaseId={metadata?.parentCaseId}
            onLinkCase={async (targetCaseId, relationship) => {
              if (onLinkCase) {
                await onLinkCase(caseId, targetCaseId, relationship)
                await refetch() // Refresh to show linked case
              }
            }}
            onUnlinkCase={async targetCaseId => {
              if (onUnlinkCase) {
                await onUnlinkCase(caseId, targetCaseId)
                await refetch() // Refresh to remove from list
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
        </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links" className="gba:mt-4">
          <EntityLinkingPanel
            linkedEntities={metadata?.linkedEntities || []}
            onLinkEntity={async entity => {
              await onLinkEntity(caseId, entity)
              await refetch() // Refresh to show linked entity
            }}
            onUnlinkEntity={async entityId => {
              await onUnlinkEntity(caseId, entityId)
              await refetch() // Refresh to remove from list
            }}
            context={context}
            readOnly={!allowEdit}
          />
        </TabsContent>
      </Tabs>

      {/* AI Summary Dialog */}
      <Dialog open={showAiSummary} onOpenChange={setShowAiSummary}>
        <DialogContent className="gba:max-w-2xl gba:max-h-[80vh] gba:bg-gradient-to-br gba:from-white gba:to-purple-50 dark:gba:from-gray-900 dark:gba:to-purple-950/30">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:p-2 gba:rounded-lg gba:bg-gradient-to-br gba:from-purple-500 gba:to-blue-500">
                <Sparkles className="gba:h-5 gba:w-5 gba:text-white" />
              </div>
              <span>AI Case Analysis</span>
              <Badge
                variant="outline"
                className="gba:ml-2 gba:text-xs gba:font-normal gba:border-purple-300 gba:text-purple-600"
              >
                Sent to Every AI
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="gba:space-y-4 gba:py-4">
            {/* Info Banner */}
            <div className="gba:p-3 gba:rounded-lg gba:bg-purple-100 dark:gba:bg-purple-900/30 gba:border gba:border-purple-200 dark:gba:border-purple-800">
              <p className="gba:text-sm gba:text-purple-800 dark:gba:text-purple-200 gba:flex gba:items-center gba:gap-2">
                <Bot className="gba:h-4 gba:w-4" />
                This prompt has been sent to Every AI sidebar. You can also copy it below.
              </p>
            </div>

            {/* Prompt Display */}
            <div className="gba:relative">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <h4 className="gba:text-sm gba:font-medium gba:flex gba:items-center gba:gap-2">
                  <Sparkles className="gba:h-4 gba:w-4 gba:text-purple-600" />
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
                  className="gba:h-8"
                >
                  {promptCopied ? (
                    <>
                      <CheckCheck className="gba:h-4 gba:w-4 gba:mr-1 gba:text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="gba:h-4 gba:w-4 gba:mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="gba:p-4 gba:rounded-lg gba:bg-gray-900 dark:gba:bg-gray-950 gba:border gba:border-gray-700 gba:max-h-[40vh] gba:overflow-y-auto">
                <pre className="gba:text-xs gba:text-gray-100 gba:whitespace-pre-wrap gba:font-mono gba:leading-relaxed">
                  {aiPrompt}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:pt-2">
              <Sparkles className="gba:h-3 gba:w-3 gba:text-purple-400" />
              <span>Prompt includes case data, workflows, and notes for comprehensive AI analysis</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiSummary(false)}>
              <X className="gba:h-4 gba:w-4 gba:mr-2" />
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
        />
      )}
    </div>
  )
}
