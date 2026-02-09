import { RestClient } from '@/common/network/rest/RestClient'
import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'

const SAVE_PERFORMANCE_CYCLE_PATH = '/processes/employee/savePerformanceCycle'
const UPDATE_PERFORMANCE_CYCLE_PATH = '/processes/employee/updatePerformanceCycle'
const DELETE_PERFORMANCE_CYCLE_PATH = '/processes/employee/deletePerformanceCycle'

/** One participant entry in the save payload. */
export interface PerformanceCycleParticipantItem {
  id?: string
  version?: number
  participantType: string
  enabled: boolean
}

/** One entry in companyValues: links a company value to the performance cycle. */
export interface PerformanceCycleCompanyValueItem {
  /** ID for updates (optimistic locking) */
  id?: string
  /** Version for updates (optimistic locking) */
  version?: number
  /** Company value definition id */
  companyValue: string
  /** Cycle id (when updating); backend may set on insert */
  performanceCycle?: string
  /** Whether this value is mandatory for the cycle */
  mandatory?: boolean
}

export interface SavePerformanceCyclePayload {
  changeMode: 'INSERT' | 'UPDATE' | 'DELETE'
  performanceCycle: {
    id?: string
    version?: number
    name: string
    startDate: string
    endDate: string
    frequency: string
    /** API expects key "ratingScale" with id value (not ratingScaleId). */
    ratingScale?: string | null
    /** Participants with participantType (e.g. SELF, MANAGER) and enabled flag. */
    participants?: PerformanceCycleParticipantItem[]
    /** API expects key "active" (not isActive). */
    active?: boolean
    status?: string
    /** Company values linked to this cycle (nested inside performanceCycle). */
    companyValues?: PerformanceCycleCompanyValueItem[]
  }
}

export interface SavePerformanceCycleResponse {
  id?: string
  [key: string]: unknown
}

/**
 * POST payload to savePerformanceCycle API (create/update performance cycle).
 */
export async function savePerformanceCycle(
  accessToken: string,
  payload: SavePerformanceCyclePayload
): Promise<SavePerformanceCycleResponse> {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  const client = new RestClient(baseUrl, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
  return client.post<SavePerformanceCycleResponse>(SAVE_PERFORMANCE_CYCLE_PATH, payload, {
    headers: { 'Content-Type': 'application/json' }
  })
}

export interface UpdatePerformanceCyclePayload {
  performanceCycle: {
    id: string
    version: number
    status: string
  }
}

export interface UpdatePerformanceCycleResponse {
  id?: string
  [key: string]: unknown
}

/**
 * POST payload to updatePerformanceCycle API (e.g. activate/deactivate cycle).
 */
export async function updatePerformanceCycle(
  accessToken: string,
  payload: UpdatePerformanceCyclePayload
): Promise<UpdatePerformanceCycleResponse> {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  const client = new RestClient(baseUrl, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
  return client.post<UpdatePerformanceCycleResponse>(UPDATE_PERFORMANCE_CYCLE_PATH, payload, {
    headers: { 'Content-Type': 'application/json' }
  })
}

export interface DeletePerformanceCyclePayload {
  performanceCycle: {
    id: string
    version: number
  }
}

export interface DeletePerformanceCycleResponse {
  [key: string]: unknown
}

/**
 * POST to deletePerformanceCycle API (remove cycle from database).
 */
export async function deletePerformanceCycle(
  accessToken: string,
  payload: DeletePerformanceCyclePayload
): Promise<DeletePerformanceCycleResponse> {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  const client = new RestClient(baseUrl, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
  return client.post<DeletePerformanceCycleResponse>(DELETE_PERFORMANCE_CYCLE_PATH, payload, {
    headers: { 'Content-Type': 'application/json' }
  })
}
