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
import { RefreshCw, Check, AlertTriangle, Bot, Sparkles, X, Copy, CheckCheck, Users } from 'lucide-react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { Case, AddFlowRequest, LinkedEntity, LinkedFlow } from '../types'
import { formatDate, canCompleteCase, formatCaseId, isFlowTerminal } from '../utils'
import { CaseStatusBadge } from './CaseStatusBadge'
import { FlowManagementPanel } from './FlowManagementPanel'
import { CaseNotesPanel } from './CaseNotesPanel'
import { EntityLinkingPanel } from './EntityLinkingPanel'
import { CaseActivityFeed } from './CaseActivityFeed'
import { useCaseData } from '../hooks'
import { openEveryAI } from '@/common/utils/openEveryAI'
import { useEmployeeNamesBatch } from '@/business-apps/ser/hooks/useEmployeeNamesBatch'
import { Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'

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
  allowEdit = true
}) => {
  const { caseData, linkedFlows, isLoading, refetch } = useCaseData(caseId, context)
  const [activeTab, setActiveTab] = useState('overview')
  const [isCompleting, setIsCompleting] = useState(false)
  const [showAiSummary, setShowAiSummary] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)

  // Calculate active flows and participants (must be before hook calls)
  const activeFlows = linkedFlows.filter(f => !f.removedAt)
  const allParticipantIds = [
    ...new Set(
      activeFlows.flatMap(
        f => [f.initiator, f.addedBy, f.currentAssignee, ...(f.participants || [])].filter(Boolean) as string[]
      )
    )
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

      {/* KPIs Row */}
      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
        <Card>
          <CardContent className="gba:pt-4">
            <div className="gba:text-sm gba:text-muted-foreground">Status</div>
            <div className="gba:mt-1">{metadata?.status ? <CaseStatusBadge status={metadata.status} /> : 'N/A'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:pt-4">
            <div className="gba:text-sm gba:text-muted-foreground">Flows</div>
            <div className="gba:text-2xl gba:font-bold">{linkedFlows.filter(f => !f.removedAt).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:pt-4">
            <div className="gba:text-sm gba:text-muted-foreground">Created</div>
            <div className="gba:text-sm">{formatDate(caseData.createdAt)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:pt-4">
            <div className="gba:text-sm gba:text-muted-foreground">Priority</div>
            <div className="gba:text-sm gba:capitalize">{metadata?.priority || 'medium'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
        <TabsList className="gba:w-full gba:justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="flows">Flows ({linkedFlows.filter(f => !f.removedAt).length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({metadata?.notes?.length || 0})</TabsTrigger>
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
              <Card>
                <CardHeader className="gba:pb-3">
                  <CardTitle className="gba:text-base">Case Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="gba:grid gba:grid-cols-2 gba:gap-x-6 gba:gap-y-3">
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
                        Assigned To
                      </dt>
                      <dd className="gba:mt-0.5 gba:text-sm">{metadata?.assignedTo || 'Unassigned'}</dd>
                    </div>
                    <div>
                      <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                        Created At
                      </dt>
                      <dd className="gba:mt-0.5 gba:text-sm">{formatDate(caseData.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                        Due Date
                      </dt>
                      <dd className="gba:mt-0.5 gba:text-sm">
                        {metadata?.dueDate ? formatDate(metadata.dueDate) : 'Not set'}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {metadata?.description && (
                <Card>
                  <CardHeader className="gba:pb-3">
                    <CardTitle className="gba:text-base">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="gba:text-sm gba:whitespace-pre-wrap">{metadata.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Participants from linked flows */}
              {allParticipantIds.length > 0 && (
                <Card>
                  <CardHeader className="gba:pb-3">
                    <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
                      <Users className="gba:h-4 gba:w-4" />
                      Participants ({allParticipantIds.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingEmployees ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <div className="gba:animate-spin gba:rounded-full gba:h-4 gba:w-4 gba:border-b-2 gba:border-primary" />
                        <span className="gba:text-sm gba:text-muted-foreground">Loading participants...</span>
                      </div>
                    ) : (
                      <div className="gba:flex gba:flex-wrap gba:gap-3">
                        {allParticipantIds.map(userId => {
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
                                    className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:rounded-lg gba:border gba:border-border gba:bg-card hover:gba:bg-accent gba:transition-colors gba:cursor-pointer"
                                    onClick={() => {
                                      window.open(`/platform/employee/profile/${userId}`, '_blank')
                                    }}
                                  >
                                    <Avatar className="gba:h-8 gba:w-8">
                                      {employee?.pictureThumbnail ? (
                                        <AvatarImage
                                          src={`data:image/png;base64,${employee.pictureThumbnail}`}
                                          alt={displayName}
                                        />
                                      ) : null}
                                      <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
                                    </Avatar>
                                    <span className="gba:text-sm gba:font-medium gba:max-w-[120px] gba:truncate">
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
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
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
            onAddNote={(content, visibility) => onAddNote(caseId, content, visibility)}
            currentUserId={context.userInfo?.id || 'system'}
            readOnly={!allowEdit}
          />
        </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links" className="gba:mt-4">
          <EntityLinkingPanel
            linkedEntities={metadata?.linkedEntities || []}
            onLinkEntity={entity => onLinkEntity(caseId, entity)}
            onUnlinkEntity={entityId => onUnlinkEntity(caseId, entityId)}
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
    </div>
  )
}
