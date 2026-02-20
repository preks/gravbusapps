import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { FLOW_ENGINE_API_BASE, ONBOARDING_APP_TAG } from '../constants'

/** Payload for POST /cases – only these fields are sent (no metadata). */
export interface CreateCasePayload {
  initiator: string
  tags: Record<string, string>
  title: string
  assignment?: { assignmentMode: string; assignTo: string }
}

/** Case as returned by flow-engine API in list (GET /cases). */
export interface FlowEngineCase {
  caseId: string
  taskId?: string
  title: string
  initiator: string
  tags: string[]
  workflowStatus?: string
  state: {
    metadata?: {
      tags?: string[]
      title?: string
      status?: string
      priority?: string
      description?: string
    }
    initiator?: string
    tags?: string[]
    linkedFlows?: { workflowId: string; status?: string }[]
  }
  createdAt: string
  updatedAt: string
}

/** Response from POST /cases – backend returns { status, data: { success, caseId, message } }. */
export interface CreateCaseResponse {
  success: boolean
  caseId: string
  message: string
}

/** Payload for DELETE /cases/:caseId – soft delete with optional flow termination. */
export interface DeleteCasePayload {
  deletedBy: string
  terminateFlows: boolean
}

/** Payload for POST /cases/:caseId/flows – add one flow (template) to a case. One flow per request. */
export interface AddFlowToCasePayload {
  templateId: string
  initiator: string
  /** Optional initial context for the flow (e.g. employeeName, department). Start with {}; extend when template requires specific keys. */
  inputValues?: Record<string, unknown>
  /**
   * Required when template has steps with assignmentMode ASSIGN and targets null (runtime assignment).
   * Map step id -> userId to assign that step to (e.g. { step_0: "user-uuid" }).
   */
  stepAssignments?: Record<string, string>
}

/** Response from POST /cases/:caseId/flows – returns the linked workflow id. */
export interface AddFlowToCaseResponse {
  workflowId?: string
}

/** Response from GET /cases – backend returns { status, data: { success, cases, total } }. */
export interface GetCasesListData {
  success: boolean
  cases: FlowEngineCase[]
  total: number
}

export interface GetCasesResponse {
  status?: string
  data?: GetCasesListData
}

/** Response from GET /cases/:caseId – backend returns { status, data: { success, caseId, state } }. */
export interface GetCaseByIdData {
  success: boolean
  caseId: string
  state: {
    metadata?: {
      tags?: string[]
      title?: string
      status?: string
      priority?: string
      description?: string
    }
    initiator?: string
    tags?: string[]
    linkedFlows?: { workflowId: string; status?: string }[]
  }
}

export interface GetCaseByIdResponse {
  status?: string
  data?: GetCaseByIdData
}

export interface UseCasesResult {
  cases: FlowEngineCase[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createCase: (payload: CreateCasePayload) => Promise<CreateCaseResponse>
  getCase: (caseId: string) => Promise<FlowEngineCase | null>
  addFlowToCase: (caseId: string, payload: AddFlowToCasePayload) => Promise<AddFlowToCaseResponse>
  deleteCase: (caseId: string, payload: DeleteCasePayload) => Promise<void>
}

export interface UseCaseResult {
  case: FlowEngineCase | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function normalizeListResponse(raw: GetCasesResponse): { cases: FlowEngineCase[]; total: number } {
  const data = raw?.data
  if (data && Array.isArray(data.cases)) {
    return { cases: data.cases, total: typeof data.total === 'number' ? data.total : data.cases.length }
  }
  return { cases: [], total: 0 }
}

export function useCases(accessToken: string): UseCasesResult {
  const client = useRestClient(FLOW_ENGINE_API_BASE)
  const headers = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken])

  const [cases, setCases] = useState<FlowEngineCase[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** Tags filter: API expects comma-separated string (e.g. "app:AppCatalog:1:HR_ONBOARDING"), not array. */
  const tagsParam = useMemo(() => `app:${ONBOARDING_APP_TAG}`, [])

  const refetch = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await client.get<GetCasesResponse>('/cases', {
        headers,
        params: { tags: tagsParam }
      })
      const { cases: list, total: totalCount } = normalizeListResponse(res ?? {})
      setCases(list)
      setTotal(totalCount)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cases')
      setCases([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [accessToken, client, headers, tagsParam])

  useEffect(() => {
    refetch()
  }, [refetch])

  const createCase = useCallback(
    async (payload: CreateCasePayload): Promise<CreateCaseResponse> => {
      const res = await client.post<{ status?: string; data?: CreateCaseResponse }>('/cases', payload, { headers })
      if (res && typeof (res as any).data === 'object' && (res as any).data?.caseId != null) {
        return (res as { data: CreateCaseResponse }).data
      }
      throw new Error('Unexpected create case response')
    },
    [client, headers]
  )

  const getCase = useCallback(
    async (caseId: string): Promise<FlowEngineCase | null> => {
      try {
        const res = await client.get<GetCaseByIdResponse>(`/cases/${caseId}`, { headers })
        const data = res?.data
        if (!data?.caseId) return null
        const s = data.state
        return {
          caseId: data.caseId,
          title: s?.metadata?.title ?? '',
          initiator: s?.initiator ?? '',
          tags: s?.tags ?? [],
          state: {
            metadata: s?.metadata,
            initiator: s?.initiator,
            tags: s?.tags,
            linkedFlows: s?.linkedFlows
          },
          createdAt: '',
          updatedAt: ''
        }
      } catch {
        return null
      }
    },
    [client, headers]
  )

  const addFlowToCase = useCallback(
    async (caseId: string, payload: AddFlowToCasePayload): Promise<AddFlowToCaseResponse> => {
      const body: Record<string, unknown> = {
        templateId: payload.templateId,
        initiator: payload.initiator,
        inputValues: payload.inputValues ?? {},
        runtimeAssignments: {}
      }
      const res = await client.post<{ data?: AddFlowToCaseResponse; workflowId?: string }>(
        `/cases/${caseId}/flows`,
        body,
        { headers }
      )
      const out = (res as any)?.data ?? res
      return { workflowId: out?.workflowId }
    },
    [client, headers]
  )

  const deleteCase = useCallback(
    async (caseId: string, payload: DeleteCasePayload): Promise<void> => {
      await client.delete(`/cases/${caseId}`, {
        headers,
        body: payload
      })
    },
    [client, headers]
  )

  return { cases, total, loading, error, refetch, createCase, getCase, addFlowToCase, deleteCase }
}

/** Hook to fetch a single case by id (for detail page). */
export function useCase(accessToken: string, caseId: string | null): UseCaseResult {
  const { getCase } = useCases(accessToken)
  const [caseData, setCaseData] = useState<FlowEngineCase | null>(null)
  const [loading, setLoading] = useState(!!caseId)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!caseId) return
    setLoading(true)
    setError(null)
    try {
      const c = await getCase(caseId)
      setCaseData(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load case')
      setCaseData(null)
    } finally {
      setLoading(false)
    }
  }, [caseId, getCase])

  useEffect(() => {
    if (!caseId) {
      setCaseData(null)
      setLoading(false)
      setError(null)
      return
    }
    refetch()
  }, [caseId, refetch])

  return { case: caseData, loading, error, refetch }
}
