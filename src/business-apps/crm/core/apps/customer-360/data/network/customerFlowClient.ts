import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

export const CUSTOMER_SUPPORT_FLOW_TAGS = {
  app: 'AppCatalog:1:SVC',
  serviceCategory: 'ServicePortalCategory:1:CUSTOMER_SUPPORT',
  sourceApp: 'AppCatalog:1:CRM',
  solution: 'customer360'
} as const

export const CUSTOMER_SUPPORT_LIFECYCLE = {
  serviceTicket: 'service-ticket',
  serviceCase: 'service-case',
  reclamation: 'reclamation'
} as const

export type CustomerSupportLifecycleType = (typeof CUSTOMER_SUPPORT_LIFECYCLE)[keyof typeof CUSTOMER_SUPPORT_LIFECYCLE]

/** Normalized flow instance shape, tolerant to the flow-engine response envelope. */
export interface CustomerFlowInstance {
  id: string
  title?: string
  status?: string
  priority?: string
  createdAt?: string
  templateName?: string
  templateId?: string
  lifecycleType?: CustomerSupportLifecycleType
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
  lifecycleType?: string
  tags?: Record<string, unknown>
}

interface FlowListEnvelope {
  status?: string
  data?: { flows?: RawFlow[]; totalCount?: number }
  flows?: RawFlow[]
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.find(item => typeof item === 'string') as string | undefined
  return undefined
}

function normalizeLifecycleType(value: unknown): CustomerSupportLifecycleType | undefined {
  const lifecycleType = normalizeString(value)
  if (
    lifecycleType === CUSTOMER_SUPPORT_LIFECYCLE.serviceTicket ||
    lifecycleType === CUSTOMER_SUPPORT_LIFECYCLE.serviceCase ||
    lifecycleType === CUSTOMER_SUPPORT_LIFECYCLE.reclamation
  ) {
    return lifecycleType
  }
  return undefined
}

function normalizeFlow(flow: RawFlow): CustomerFlowInstance {
  return {
    id: flow.flowId || flow.workflowId || flow.id || '',
    title: flow.flowName || flow.name || flow.title,
    status: flow.status,
    priority: flow.priority,
    createdAt: flow.startTime || flow.createdAt,
    templateName: flow.templateName,
    templateId: flow.templateId,
    lifecycleType: normalizeLifecycleType(flow.lifecycleType || flow.tags?.lifecycleType)
  }
}

export function buildCustomerFlowListQuery(params: {
  subjectId: string
  lifecycleType?: CustomerSupportLifecycleType
  limit?: number
}): URLSearchParams {
  const query = new URLSearchParams({
    correlationEntity: 'account',
    correlationEntityId: params.subjectId,
    limit: String(params.limit ?? 100),
    offset: '0',
    'tag.app': CUSTOMER_SUPPORT_FLOW_TAGS.app,
    'tag.serviceCategory': CUSTOMER_SUPPORT_FLOW_TAGS.serviceCategory,
    'tag.sourceApp': CUSTOMER_SUPPORT_FLOW_TAGS.sourceApp,
    'tag.solution': CUSTOMER_SUPPORT_FLOW_TAGS.solution
  })

  if (params.lifecycleType) {
    query.set('tag.lifecycleType', params.lifecycleType)
  }

  return query
}

/**
 * Lists custom-flow-engine flow instances correlated to a customer account.
 * Follows the documented contract:
 *   GET /api/flows/list?correlationEntity=account&correlationEntityId=<id>
 */
export async function listCustomerFlows(params: {
  accessToken: string
  subjectId: string
  lifecycleType?: CustomerSupportLifecycleType
  limit?: number
}): Promise<CustomerFlowInstance[]> {
  const query = buildCustomerFlowListQuery(params)

  const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/flows/list?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${params.accessToken}` }
  })

  if (!response.ok) {
    throw new Error(`Flow list request failed: ${response.status}`)
  }

  const json = (await response.json()) as FlowListEnvelope
  const flows = json.data?.flows ?? json.flows ?? []
  const normalizedFlows = flows.map(normalizeFlow).filter(flow => flow.id)
  const responseIncludesLifecycle = normalizedFlows.some(flow => flow.lifecycleType)

  if (params.lifecycleType && responseIncludesLifecycle) {
    return normalizedFlows.filter(flow => flow.lifecycleType === params.lifecycleType)
  }

  return normalizedFlows
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
