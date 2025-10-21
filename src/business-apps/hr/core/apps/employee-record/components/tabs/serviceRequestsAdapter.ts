import { env } from '@/common/env/EnvUtils'

/**
 * Simple adapter to fetch service requests from custom-flow-engine API
 * This is a lightweight implementation with minimal dependencies
 */

const API_BASE =
  (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine') + '/api'

// Use the standard SubmittedRequest type from SER for compatibility with MyRequestsTable
export interface SubmittedRequest {
  id: string
  templateId: string
  templateVersion: number
  requesterId: string
  createdAt: string
  status: 'open' | 'in_progress' | 'completed' | 'canceled'
  titleSnapshot: string
  categoryIdSnapshot: string
  formData: any
  steps: StepInstance[]
  timeline: Array<{ at: string; message: string }>
}

export interface StepInstance {
  id: string
  name: string
  status: string
  assignedToUserId?: string
  startedAt?: string
  finishedAt?: string
  dueDate?: string
  comments: any[]
}

/**
 * Fetch service requests initiated by a specific user
 * @param userId - The user ID
 * @param accessToken - Authentication token
 * @returns Array of service requests
 */
export async function getUserRequests(userId: string, accessToken: string): Promise<SubmittedRequest[]> {
  try {
    // Step 1: Get list of flows initiated by the user
    const listResponse = await fetch(`${API_BASE}/flows/user/${userId}/initiated?limit=50&offset=0`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!listResponse.ok) {
      throw new Error(`Failed to fetch requests: ${listResponse.status} ${listResponse.statusText}`)
    }

    const listData = await listResponse.json()
    const flows = listData.data?.flows || listData.flows || []

    // Step 2: Get detailed information for each flow in parallel
    const detailPromises = flows.map(async (flow: any) => {
      try {
        const flowId = flow.flowId || flow.id

        const detailResponse = await fetch(`${API_BASE}/flows/${flowId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!detailResponse.ok) {
          return null
        }

        const detailData = await detailResponse.json()
        const transformed = transformFlowToServiceRequest(detailData)
        return transformed
      } catch {
        return null
      }
    })

    const detailedFlows = await Promise.all(detailPromises)
    const validFlows = detailedFlows.filter((flow): flow is SubmittedRequest => flow !== null)

    return validFlows
  } catch (error) {
    throw new Error(`Failed to fetch user requests: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Transform flow data from API to SubmittedRequest format
 */
function transformFlowToServiceRequest(flowData: any): SubmittedRequest {
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

/**
 * Map Conductor task/step status to our standard status
 * Handles both task statuses and step statuses from flow.steps
 */
function mapTaskStatus(status: string): string {
  const statusMap: Record<string, string> = {
    // Task statuses
    SCHEDULED: 'QUEUED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    TIMED_OUT: 'FAILED',
    CANCELED: 'REJECTED',
    SKIPPED: 'COMPLETED',

    // Step statuses (from flow.steps)
    PENDING: 'QUEUED',
    AVAILABLE: 'QUEUED',
    CLAIMED: 'IN_PROGRESS',
    DONE: 'COMPLETED'
  }
  return statusMap[status] || status
}

/**
 * Map Conductor workflow status to our standard status
 */
function mapFlowStatus(status: string): 'open' | 'in_progress' | 'completed' | 'canceled' {
  const statusMap: Record<string, 'open' | 'in_progress' | 'completed' | 'canceled'> = {
    RUNNING: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'canceled',
    TIMED_OUT: 'canceled',
    TERMINATED: 'canceled',
    PAUSED: 'open'
  }
  return statusMap[status] || 'open'
}

/**
 * Format technical template/flow names into readable titles
 * Converts "flow_request_new_hardware" -> "Request New Hardware"
 * Converts "employee-onboarding" -> "Employee Onboarding"
 */
function formatRequestTitle(name: string): string {
  if (!name) return 'Service Request'

  // Remove common prefixes
  let formatted = name
    .replace(/^flow_/, '')
    .replace(/^request_/, '')
    .replace(/^service_/, '')

  // Replace underscores and hyphens with spaces
  formatted = formatted.replace(/[_-]/g, ' ')

  // Capitalize each word
  formatted = formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return formatted || 'Service Request'
}

/**
 * Extract category from template ID
 */
function extractCategoryFromTemplate(templateId: string): string {
  const categoryMapping: Record<string, string> = {
    'employee-onboarding': 'hr',
    'employee-offboarding': 'hr',
    onboarding: 'hr',
    offboarding: 'hr',
    hardware: 'it',
    software: 'it',
    access: 'security',
    travel: 'travel',
    working: 'hr',
    time: 'hr',
    leave: 'hr',
    absence: 'hr'
  }

  const lowerTemplateId = (templateId || '').toLowerCase()
  for (const [keyword, category] of Object.entries(categoryMapping)) {
    if (lowerTemplateId.includes(keyword)) {
      return category
    }
  }

  return 'general'
}
