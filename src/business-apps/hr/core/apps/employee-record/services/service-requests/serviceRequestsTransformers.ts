import type { SubmittedRequest, StepInstance } from './serviceRequestsTypes'
import {
  formatRequestTitle,
  extractCategoryFromTemplate,
  mapTaskStatus,
  mapFlowStatus
} from '../../utils/serviceRequestsUtils'

/**
 * Data transformation functions for service requests
 */

/**
 * Transform flow data from API to SubmittedRequest format
 */
export function transformFlowToServiceRequest(flowData: any): SubmittedRequest {
  const flow = flowData.data || flowData

  // Extract steps from flow.steps (not tasks!)
  const steps: StepInstance[] = (flow.steps || []).map((step: any, index: number) => {
    return {
      id: step.taskId || `${flow.flowId || flow.id}-step-${index}`,
      name: step.title || step.name || `Step ${index + 1}`,
      status: mapTaskStatus(step.status),
      assignedToUserId: step.assignedTo === 'AVAILABLE' ? undefined : step.assignedTo,
      startedAt: step.startedAt || step.scheduledAt || undefined,
      finishedAt: step.finishedAt || undefined,
      dueDate: step.dueDate || undefined,
      comments: step.comments || []
    }
  })

  // Build timeline from step updates
  const timeline = (flow.steps || []).map((step: any) => ({
    at: step.finishedAt || step.startedAt || step.scheduledAt || new Date().toISOString(),
    message: `${step.title || 'Step'} ${step.status || 'updated'}`
  }))

  // Get a proper display name for the request
  const displayName = formatRequestTitle(flow.flowName || flow.name || flow.templateId || flow.workflowName)

  return {
    id: flow.workflowId || flow.flowId || flow.id || '',
    templateId: flow.templateId || flow.workflowName || 'unknown',
    templateVersion: 1,
    requesterId: flow.initiatedBy || flow.createdBy || flow.requesterId || 'unknown',
    createdAt: flow.startTime || flow.createTime || flow.createdAt || new Date().toISOString(),
    status: mapFlowStatus(flow.status),
    titleSnapshot: displayName,
    categoryIdSnapshot: extractCategoryFromTemplate(flow.templateId || flow.workflowName || ''),
    formData: flow.input || flow.formData || {},
    steps,
    timeline
  }
}
