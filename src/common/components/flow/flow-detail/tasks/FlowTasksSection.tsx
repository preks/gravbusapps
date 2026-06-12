import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { ListChecks } from 'lucide-react'
import { useEmployeeAvatarsBatch } from '@/business-apps/core/every/apps/every-box/hooks/useEmployeeAvatarsBatch'
import type { FlowComment } from '@/common/network/flows/useFlowProgressClient'
import { useFlowProgressClient } from '@/common/network/flows/useFlowProgressClient'
import type { FlowDetailData, FlowStep, HistoryEvent, StepAssignmentInfo } from '../types'
import { useResolvedActorNames } from '../useResolvedActorNames'
import { findStepIndexForTaskId } from './taskCommentUtils'
import { FlowTaskCard } from './FlowTaskCard'
import { FlowTriggerTaskCard } from './FlowTriggerTaskCard'

interface FlowTasksSectionProps {
  flowData: FlowDetailData
  flowSteps: FlowStep[]
  stepAssignmentsByStepIndex: Record<number, StepAssignmentInfo>
  historyEvents: HistoryEvent[]
  focusTaskId?: string
  accessToken?: string
  userId?: string
  onRefreshHistory?: () => Promise<void>
}

export const FlowTasksSection: React.FC<FlowTasksSectionProps> = ({
  flowData,
  flowSteps,
  stepAssignmentsByStepIndex,
  historyEvents,
  focusTaskId,
  accessToken,
  userId,
  onRefreshHistory
}) => {
  const [flowComments, setFlowComments] = useState<FlowComment[]>([])
  const contextForClient = { accessToken } as Parameters<typeof useFlowProgressClient>[0]
  const { getFlowComments } = useFlowProgressClient(contextForClient)

  const loadFlowComments = useCallback(async (): Promise<FlowComment[]> => {
    if (!accessToken || !flowData.flowId) {
      setFlowComments([])
      return []
    }

    try {
      const response = await getFlowComments(flowData.flowId)
      const comments = response.comments || []
      setFlowComments(comments)
      return comments
    } catch {
      setFlowComments([])
      return []
    }
  }, [accessToken, flowData.flowId, getFlowComments])

  useEffect(() => {
    void loadFlowComments()
  }, [accessToken, flowData.flowId, loadFlowComments])

  const sortedSteps = useMemo(() => [...flowSteps].sort((left, right) => left.stepIndex - right.stepIndex), [flowSteps])

  const focusedStepIndex = useMemo(
    () => (focusTaskId ? findStepIndexForTaskId(focusTaskId, historyEvents, flowSteps) : undefined),
    [focusTaskId, historyEvents, flowSteps]
  )

  const isTriggerFocused = useMemo(() => {
    if (!focusTaskId) return false
    if (focusTaskId === `start-${flowData.flowId}`) return true
    return focusTaskId.startsWith('start-')
  }, [focusTaskId, flowData.flowId])

  const actorIds = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...sortedSteps.flatMap(step => [
              step.assignedTo,
              ...(step.assignedToIds || []),
              ...(step.eligibleUserIds || []),
              step.completedBy
            ]),
            ...historyEvents.map(event => event.userId)
          ].filter((id): id is string => Boolean(id && String(id).trim()))
        )
      ),
    [sortedSteps, historyEvents]
  )

  const actorNames = useResolvedActorNames(accessToken, actorIds)
  const { employeeMap } = useEmployeeAvatarsBatch(accessToken || '', actorIds)

  return (
    <Card data-testid="flow-detail-tasks-section">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <ListChecks className="gba:h-4 gba:w-4" />
          Workflow Steps
        </CardTitle>
        <CardDescription>
          Track this request through {sortedSteps.length} workflow step{sortedSteps.length === 1 ? '' : 's'}. Expand a
          step to view captured data, comments, and activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        <FlowTriggerTaskCard
          flowData={flowData}
          accessToken={accessToken}
          initialOpen={isTriggerFocused || Boolean(flowData.triggerData)}
        />
        {sortedSteps.map((step, index) => (
          <FlowTaskCard
            key={step.id}
            step={step}
            stepNumber={index + 1}
            focusTaskId={focusTaskId}
            initialOpen={focusedStepIndex !== undefined && step.stepIndex === focusedStepIndex}
            flowData={flowData}
            stepAssignmentsByStepIndex={stepAssignmentsByStepIndex}
            historyEvents={historyEvents}
            flowComments={flowComments}
            actorNames={actorNames}
            employeeMap={employeeMap}
            accessToken={accessToken}
            userId={userId}
            onRefreshHistory={onRefreshHistory}
            onRefreshFlowComments={loadFlowComments}
          />
        ))}
      </CardContent>
    </Card>
  )
}
