import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import type { CustomerSubjectType } from '../types'

/** Normalized flow instance shape, tolerant to the flow-engine response envelope. */
export interface CustomerFlowInstance {
  id: string
  title?: string
  status?: string
  priority?: string
  createdAt?: string
  templateName?: string
  templateId?: string
}

interface RawFlow {
  flowId?: string
  workflowId?: string
  id?: string
  flowName?: string
  name?: string
  title?: string
  status?: string
  priority?: string
  startTime?: string
  createdAt?: string
  templateName?: string
  templateId?: string
}

interface FlowListEnvelope {
  status?: string
  data?: { flows?: RawFlow[]; totalCount?: number }
  flows?: RawFlow[]
}

function normalizeFlow(flow: RawFlow): CustomerFlowInstance {
  return {
    id: flow.flowId || flow.workflowId || flow.id || '',
    title: flow.flowName || flow.name || flow.title,
    status: flow.status,
    priority: flow.priority,
    createdAt: flow.startTime || flow.createdAt,
    templateName: flow.templateName,
    templateId: flow.templateId
  }
}

/**
 * Lists custom-flow-engine flow instances correlated to a customer subject.
 * Follows the documented contract:
 *   GET /api/flows/list?correlationEntity=account|contact&correlationEntityId=<id>
 */
export async function listCustomerFlows(params: {
  accessToken: string
  subjectType: CustomerSubjectType
  subjectId: string
  limit?: number
}): Promise<CustomerFlowInstance[]> {
  const query = new URLSearchParams({
    correlationEntity: params.subjectType,
    correlationEntityId: params.subjectId,
    limit: String(params.limit ?? 100),
    offset: '0'
  })

  const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/flows/list?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${params.accessToken}` }
  })

  if (!response.ok) {
    throw new Error(`Flow list request failed: ${response.status}`)
  }

  const json = (await response.json()) as FlowListEnvelope
  const flows = json.data?.flows ?? json.flows ?? []
  return flows.map(normalizeFlow).filter(flow => flow.id)
}

/** One workflow step of a flow instance, tolerant to engine field aliases. */
export interface CustomerFlowStep {
  title?: string
  status?: string
  /** Stable Service Desk task id (task_business_id) for this step, if materialized. */
  taskId?: string
  taskBusinessId?: string
  actionId?: string
  lifecycleId?: string
  stepReference?: string
  completedAt?: string
}

/** Detail view of one flow instance: progress + per-step statuses. */
export interface CustomerFlowDetail {
  id: string
  title?: string
  status?: string
  progress?: number
  steps: CustomerFlowStep[]
}

interface RawFlowStep {
  title?: string
  name?: string
  stepTitle?: string
  status?: string
  state?: string
  taskId?: string
  task_id?: string
  taskBusinessId?: string
  actionId?: string
  lifecycleId?: string
  stepReference?: string
  completedAt?: string
  endTime?: string
}

interface FlowDetailEnvelope {
  data?: { flow?: Record<string, unknown> } & Record<string, unknown>
  [key: string]: unknown
}

function unwrapFlowDetail(json: FlowDetailEnvelope): Record<string, unknown> {
  if (json.data && typeof json.data === 'object') {
    const data = json.data as Record<string, unknown>
    if (data.flow && typeof data.flow === 'object') return data.flow as Record<string, unknown>
    return data
  }
  return json
}

function normalizeStep(step: RawFlowStep): CustomerFlowStep {
  const taskBusinessId = step.taskBusinessId || step.taskId || step.task_id
  return {
    title: step.title || step.name || step.stepTitle,
    status: step.status || step.state,
    taskId: taskBusinessId,
    taskBusinessId,
    actionId: step.actionId,
    lifecycleId: step.lifecycleId,
    stepReference: step.stepReference,
    completedAt: step.completedAt || step.endTime
  }
}

/** Extract a 0-100 percentage from either a numeric progress or a FlowProgress object. */
function normalizeProgress(progress: unknown): number | undefined {
  if (typeof progress === 'number') return progress
  if (progress && typeof progress === 'object') {
    const pct = (progress as Record<string, unknown>).percentage
    if (typeof pct === 'number') return pct
  }
  return undefined
}

/**
 * Loads the detail of a single flow instance (steps, statuses, progress).
 *   GET /api/flows/{flowId}
 */
export async function getCustomerFlowDetail(params: {
  accessToken: string
  flowId: string
}): Promise<CustomerFlowDetail> {
  const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/flows/${params.flowId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${params.accessToken}` }
  })

  if (!response.ok) {
    throw new Error(`Flow detail request failed: ${response.status}`)
  }

  const json = (await response.json()) as FlowDetailEnvelope
  const flow = unwrapFlowDetail(json)
  const rawSteps = Array.isArray(flow.steps) ? (flow.steps as RawFlowStep[]) : []

  return {
    id: String(flow.flowId || flow.id || params.flowId),
    title: (flow.name || flow.title) as string | undefined,
    status: flow.status as string | undefined,
    progress: normalizeProgress(flow.progress),
    steps: rawSteps.map(normalizeStep)
  }
}
