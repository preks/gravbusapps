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
