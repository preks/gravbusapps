import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Spinner } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Clock, User } from 'lucide-react'
import type {
  FlowComment,
  StepDataResponse,
  TaskComment,
  TaskCommentVisibility
} from '@/common/network/flows/useFlowProgressClient'
import { useFlowProgressClient } from '@/common/network/flows/useFlowProgressClient'
import type { FlowDetailData, FlowStep, HistoryEvent, StepAssignmentInfo } from '../types'
import { getFlowStatusBadgeClass } from '../utils'
import { TaskStepDataView } from '../tabs/taskStepDataRendering'
import { FlowTaskActivity, filterEventsForStep } from './FlowTaskActivity'
import { FlowTaskComments } from './FlowTaskComments'
import { flowCommentsForStep, mergeTaskComments, resolveStepTaskId, stepMatchesTaskId } from './taskCommentUtils'

interface FlowTaskCardProps {
  step: FlowStep
  stepNumber: number
  focusTaskId?: string
  initialOpen?: boolean
  flowData: FlowDetailData
  stepAssignmentsByStepIndex: Record<number, StepAssignmentInfo>
  historyEvents: HistoryEvent[]
  flowComments: FlowComment[]
  actorNames: Record<string, string>
  employeeMap: Map<string, { displayName?: string; avatarUrl?: string }>
  accessToken?: string
  userId?: string
  onRefreshHistory?: () => Promise<void>
  onRefreshFlowComments?: () => Promise<FlowComment[]>
}

function resolveAssigneeLabel(step: FlowStep, actorNames: Record<string, string>): string | undefined {
  const assigneeId = step.assignedTo || step.assignedToIds?.[0]
  if (!assigneeId) return undefined
  if (['MULTIPLE', 'UNASSIGNED', 'AVAILABLE', 'PENDING'].includes(assigneeId)) {
    return assigneeId.charAt(0) + assigneeId.slice(1).toLowerCase()
  }
  return actorNames[assigneeId] || assigneeId
}

function formatStepTimestamp(value?: string): string | undefined {
  if (!value) return undefined
  return new Date(value).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export const FlowTaskCard: React.FC<FlowTaskCardProps> = ({
  step,
  stepNumber,
  focusTaskId,
  initialOpen = false,
  flowData,
  stepAssignmentsByStepIndex,
  historyEvents,
  flowComments,
  actorNames,
  employeeMap,
  accessToken,
  userId,
  onRefreshHistory,
  onRefreshFlowComments
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stepData, setStepData] = useState<StepDataResponse | null>(null)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [resolvedTaskId, setResolvedTaskId] = useState<string | undefined>()
  const cardRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false)

  const contextForClient = { accessToken } as Parameters<typeof useFlowProgressClient>[0]
  const { getStepDataByReference, getTaskComments, addTaskComment } = useFlowProgressClient(contextForClient)

  const assigneeLabel = resolveAssigneeLabel(step, actorNames)
  const startedLabel = formatStepTimestamp(step.startedAt)
  const completedLabel = formatStepTimestamp(step.completedAt)

  const taskIds = useMemo(() => {
    const ids = new Set<string>()
    if (resolvedTaskId) ids.add(resolvedTaskId)
    stepData?.data.forEach(row => {
      if (row.taskId) ids.add(row.taskId)
    })
    return Array.from(ids)
  }, [resolvedTaskId, stepData])

  const stepEvents = useMemo(
    () =>
      filterEventsForStep(historyEvents, {
        stepIndex: step.stepIndex,
        stepTitle: step.title,
        taskIds
      }),
    [historyEvents, step.stepIndex, step.title, taskIds]
  )

  const stepFlowComments = useMemo(
    () => flowCommentsForStep(flowComments, step.stepIndex),
    [flowComments, step.stepIndex]
  )

  const displayCommentCount = comments.length > 0 ? comments.length : stepFlowComments.length

  const reloadStepComments = useCallback(
    async (nextStepData?: StepDataResponse | null, sourceFlowComments?: FlowComment[]) => {
      const data = nextStepData ?? stepData
      const effectiveFlowComments = sourceFlowComments ?? flowComments
      const taskId = resolveStepTaskId(step, data, historyEvents, flowData.flowId)

      if (taskId) {
        setResolvedTaskId(taskId)
      }

      const stepCommentsFromFlow = flowCommentsForStep(effectiveFlowComments, step.stepIndex)
      let taskComments: TaskComment[] = []

      if (taskId) {
        try {
          const commentsResponse = await getTaskComments(taskId)
          taskComments = commentsResponse.comments || []
        } catch {
          taskComments = []
        }
      }

      setComments(mergeTaskComments(stepCommentsFromFlow, taskComments))
    },
    [flowComments, flowData.flowId, getTaskComments, historyEvents, step, stepData]
  )

  const loadDetails = useCallback(async () => {
    if (!accessToken || !flowData.flowId) return

    setIsLoading(true)
    setLoadError(null)

    try {
      const stepReference = `step_${step.stepIndex}`
      const nextStepData = await getStepDataByReference(flowData.flowId, stepReference, { limit: 20 })
      setStepData(nextStepData)
      await reloadStepComments(nextStepData, flowComments)
      setHasLoaded(true)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load step details')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, flowComments, flowData.flowId, getStepDataByReference, reloadStepComments, step.stepIndex])

  useEffect(() => {
    if (!initialOpen) return
    setIsOpen(true)
    if (!hasLoaded && !isLoading) {
      void loadDetails()
    }
  }, [hasLoaded, initialOpen, isLoading, loadDetails])

  useEffect(() => {
    if (!focusTaskId || hasLoaded || isLoading) return
    if (!stepMatchesTaskId(step, focusTaskId, historyEvents, stepData, flowData.flowId)) return

    setIsOpen(true)
    void loadDetails()
  }, [focusTaskId, flowData.flowId, hasLoaded, historyEvents, isLoading, loadDetails, step, stepData])

  useEffect(() => {
    if (!isOpen || !hasLoaded || hasScrolledRef.current) return
    const shouldScroll =
      initialOpen ||
      Boolean(focusTaskId && stepMatchesTaskId(step, focusTaskId, historyEvents, stepData, flowData.flowId))
    if (!shouldScroll) return

    hasScrolledRef.current = true
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusTaskId, flowData.flowId, hasLoaded, historyEvents, initialOpen, isOpen, step, stepData])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && !hasLoaded && !isLoading) {
      void loadDetails()
    }
  }

  const handleAddComment = async (comment: string, visibility: TaskCommentVisibility) => {
    const taskId = resolvedTaskId || resolveStepTaskId(step, stepData, historyEvents, flowData.flowId)

    if (!taskId || !userId) {
      throw new Error('Cannot add comment without a task reference')
    }

    if (!resolvedTaskId) {
      setResolvedTaskId(taskId)
    }

    await addTaskComment(taskId, { userId, comment, commentVisibility: visibility })

    const freshFlowComments = onRefreshFlowComments ? await onRefreshFlowComments() : flowComments
    await reloadStepComments(stepData, freshFlowComments)

    if (onRefreshHistory) {
      await onRefreshHistory()
    }
  }

  const taskProgressLabel =
    typeof step.totalTasks === 'number' && step.totalTasks > 0
      ? `${step.completedTasks ?? 0} of ${step.totalTasks} tasks`
      : undefined

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} data-testid={`flow-task-card-${step.stepIndex}`}>
      <div ref={cardRef} className="gba:rounded-xl gba:border gba:border-border gba:bg-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="gba:flex gba:w-full gba:items-start gba:justify-between gba:gap-3 gba:p-4 gba:text-left"
            data-testid={`flow-task-card-toggle-${step.stepIndex}`}
          >
            <div className="gba:flex gba:min-w-0 gba:flex-1 gba:items-start gba:gap-3">
              <div className="gba:mt-0.5 gba:text-muted-foreground">
                {isOpen ? <ChevronDown className="gba:h-4 gba:w-4" /> : <ChevronRight className="gba:h-4 gba:w-4" />}
              </div>
              <div className="gba:min-w-0 gba:flex-1 gba:space-y-2">
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                  <span className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                    Step {stepNumber}
                  </span>
                  <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{step.title}</h3>
                  <Badge
                    className={`gba:border-none gba:text-xs gba:font-semibold ${getFlowStatusBadgeClass(step.status)}`}
                  >
                    {step.status}
                  </Badge>
                </div>
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                  {assigneeLabel ? (
                    <span className="gba:inline-flex gba:items-center gba:gap-1">
                      <User className="gba:h-3.5 gba:w-3.5" />
                      {assigneeLabel}
                    </span>
                  ) : null}
                  {startedLabel ? (
                    <span className="gba:inline-flex gba:items-center gba:gap-1">
                      <Clock className="gba:h-3.5 gba:w-3.5" />
                      Started {startedLabel}
                    </span>
                  ) : null}
                  {completedLabel ? <span>Completed {completedLabel}</span> : null}
                  {taskProgressLabel ? <span>{taskProgressLabel}</span> : null}
                  {displayCommentCount > 0 ? <span>{displayCommentCount} comments</span> : null}
                </div>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="gba:space-y-6 gba:border-t gba:border-border gba:px-4 gba:pb-4 gba:pt-4">
            {isLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-8 gba:text-sm gba:text-muted-foreground">
                <Spinner className="gba:h-5 gba:w-5" />
                Loading step details...
              </div>
            ) : null}

            {loadError ? (
              <div className="gba:rounded-md gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-sm gba:text-destructive">
                {loadError}
                <Button
                  variant="link"
                  size="sm"
                  className="gba:ml-2 gba:h-auto gba:p-0"
                  onClick={() => void loadDetails()}
                >
                  Retry
                </Button>
              </div>
            ) : null}

            {hasLoaded && !isLoading ? (
              <>
                <div className="gba:space-y-3">
                  <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">Captured data</h4>
                  <TaskStepDataView
                    step={step}
                    stepData={stepData}
                    stepAssignmentsByStepIndex={stepAssignmentsByStepIndex}
                    actorNames={actorNames}
                    employeeMap={employeeMap}
                    accessToken={accessToken}
                  />
                </div>

                <FlowTaskActivity events={stepEvents} actorNames={actorNames} />

                <FlowTaskComments
                  comments={comments}
                  isLoading={false}
                  canAddComment={Boolean(
                    userId && (resolvedTaskId || resolveStepTaskId(step, stepData, historyEvents, flowData.flowId))
                  )}
                  userId={userId}
                  actorNames={actorNames}
                  employeeAvatars={employeeMap}
                  onAddComment={handleAddComment}
                />
              </>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
