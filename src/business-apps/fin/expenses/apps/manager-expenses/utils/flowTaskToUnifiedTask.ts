import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import { UnifiedTask, TaskStatus } from '@/business-apps/core/every/apps/every-api/types'

const mapStateToTaskStatus = (state?: string): TaskStatus => {
  if (!state) return 'IN_PROGRESS'
  const normalized = state.toUpperCase()
  if (normalized === 'COMPLETED' || normalized === 'CLOSED') return 'COMPLETED'
  if (normalized === 'FAILED' || normalized === 'ERROR') return 'FAILED'
  if (normalized === 'CANCELLED' || normalized === 'ABORTED') return 'CANCELLED'
  if (normalized === 'SCHEDULED' || normalized === 'READY') return 'SCHEDULED'
  return 'IN_PROGRESS'
}

export const mapFlowExecutionTaskToUnifiedTask = (task: FlowExecutionTask): UnifiedTask => {
  const title = task.referenceName || task.name || 'Untitled Task'

  return {
    id: task.id,
    name: task.name,
    title,
    referenceTaskName: task.referenceName,
    description: task.description,
    status: mapStateToTaskStatus(task.state || task.status),
    priority: task.priority ?? 0,
    createdAt: task.started || task.createdAt || task.lastUpdate,
    dueDate: task.dueDate,
    source: 'kogito',
    inputs: task.inputs ? [task.inputs] : undefined,
    availableActions: {
      canComplete: true,
      canReject: true,
      canClaim: false,
      canUnclaim: false,
      canReassign: false
    },
    sourceMetadata: {
      endpoint: task.endpoint,
      processInstanceId: task.processInstanceId,
      processDefinitionId: task.processDefinitionId,
      taskDefinitionId: task.taskDefinitionId,
      creatorUserId: task.creatorUserId,
      creatorName: task.creatorName,
      actualOwner: task.actualOwner,
      ownerName: task.ownerName,
      inputs: task.inputs,
      variables: task.variables
    }
  }
}
