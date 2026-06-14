import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

// TODO(customer-feedback): Revisit CRM custom survey API wiring once the backend response/result endpoints are finalized.
export type CrmFeedbackFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SELECT'
  | 'MULTISELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'RATING'
  | 'DATE'
  | 'DATETIME'
  | 'NUMBER'
  | 'FILE'

export interface CrmFeedbackFormField {
  type: CrmFeedbackFieldType
  name: string
  label: string
  required?: boolean
  options?: Array<{
    value: string
    label: string
  }>
  [key: string]: unknown
}

export interface CrmFeedbackAssignees {
  users?: string[]
  organizationalUnits?: string[]
  matrixTeams?: string[]
  companies?: string[]
  siteLocations?: string[]
  costCenters?: string[]
  capabilities?: string[]
}

export interface CrmCustomFeedbackPayload {
  surveyName?: string
  initiatorId?: string
  accountIds?: string[]
  assignees?: CrmFeedbackAssignees
  form?: CrmFeedbackFormField[]
  metadata?: Record<string, unknown>
  templateId?: string
  namespace?: string
  saveAsTemplate?: boolean
  saveAsDraft?: boolean
  execute?: boolean
}

export interface CrmCustomFeedbackExecutionResult {
  accountId: string
  success: boolean
  workflowId?: string
  error?: string
  message?: string
}

export interface CrmCustomFeedbackSurveyResult {
  id: string
  accountId: string
  surveyName?: string
  workflowId?: string
  status?: string
  submittedAt?: string
  respondentName?: string
  responses: Record<string, unknown>
}

export interface CrmCustomFeedbackResponse {
  success: boolean
  templateId?: string
  results: CrmCustomFeedbackExecutionResult[]
  message?: string
  raw: unknown
}

function endpoint(path: string): string {
  return `${CUSTOM_FLOW_ENGINE_API_URL.replace(/\/$/, '')}${path}`
}

async function postFeedbackRequest(
  accessToken: string,
  path: '/templates/crm/custom-feedback/execute' | '/templates/crm/custom-feedback/templates',
  payload: CrmCustomFeedbackPayload
): Promise<CrmCustomFeedbackResponse> {
  const response = await fetch(endpoint(path), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      typeof body?.message === 'string' ? body.message : `Custom feedback request failed: ${response.status}`
    throw new Error(message)
  }

  return normalizeFeedbackResponse(body)
}

function normalizeFeedbackResponse(raw: any): CrmCustomFeedbackResponse {
  const rawResults = raw?.results || raw?.executions || raw?.accountResults || []
  const results = Array.isArray(rawResults)
    ? rawResults.map((item: any) => ({
        accountId: String(item.accountId || item.correlationId || item.customerId || ''),
        success: item.success !== false && !item.error,
        workflowId: item.workflowId || item.flowId || item.id,
        error: item.error || item.errorMessage,
        message: item.message || item.status
      }))
    : []

  return {
    success: raw?.success !== false,
    templateId: raw?.templateId || raw?.id,
    results,
    message: raw?.message,
    raw
  }
}

export function executeCrmCustomFeedback(
  accessToken: string,
  payload: CrmCustomFeedbackPayload
): Promise<CrmCustomFeedbackResponse> {
  return postFeedbackRequest(accessToken, '/templates/crm/custom-feedback/execute', payload)
}

export function saveCrmCustomFeedbackTemplate(
  accessToken: string,
  payload: CrmCustomFeedbackPayload
): Promise<CrmCustomFeedbackResponse> {
  return postFeedbackRequest(accessToken, '/templates/crm/custom-feedback/templates', payload)
}

export async function listCrmCustomFeedbackSurveyResults(
  accessToken: string,
  accountId: string
): Promise<CrmCustomFeedbackSurveyResult[]> {
  const params = new URLSearchParams({ accountId })
  const response = await fetch(endpoint(`/templates/crm/custom-feedback/results?${params.toString()}`), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to load custom feedback results: ${response.status}`)
  }

  const body = await response.json().catch(() => ({}))
  const rawResults = Array.isArray(body) ? body : body.results || body.responses || body.data || []

  return Array.isArray(rawResults) ? rawResults.map(normalizeSurveyResult).filter(result => result.id) : []
}

function normalizeSurveyResult(raw: any): CrmCustomFeedbackSurveyResult {
  const responses = raw.responses || raw.answers || raw.formData || raw.data || {}
  return {
    id: String(raw.id || raw.responseId || raw.workflowId || raw.flowId || ''),
    accountId: String(raw.accountId || raw.customerId || ''),
    surveyName: raw.surveyName || raw.name || raw.templateName,
    workflowId: raw.workflowId || raw.flowId,
    status: raw.status,
    submittedAt: raw.submittedAt || raw.completedAt || raw.updatedAt || raw.createdAt,
    respondentName: raw.respondentName || raw.assigneeName || raw.userName,
    responses: responses && typeof responses === 'object' ? responses : {}
  }
}
