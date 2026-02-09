import { RestClient } from '@/common/network/rest/RestClient'
import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'

const SAVE_COMPANY_VALUE_PATH = '/processes/employee/saveCompanyValue'
const UPDATE_COMPANY_VALUE_PATH = '/processes/employee/updateCompanyValue'

export interface SaveCompanyValuePayload {
  changeMode: 'INSERT' | 'UPDATE' | 'DELETE'
  companyValue: {
    id?: string
    version?: number
    title: string
    description: string
    recordState: string
  }
}

export interface SaveCompanyValueResponse {
  id?: string
  version?: number
  [key: string]: unknown
}

/** Company value body (nested under `companyValue` in request). */
export interface CompanyValueBody {
  id: string
  version?: number
  businessKey?: string
  activeTo?: string
  title: string
  description: string
  recordState: string
  notes?: string
}

/** Payload for updateCompanyValue (POST): top-level key is `companyValue`. */
export interface UpdateCompanyValuePayload {
  companyValue: CompanyValueBody
}

export interface UpdateCompanyValueResponse {
  id?: string
  version?: number
  [key: string]: unknown
}

/**
 * POST to saveCompanyValue API (create new company value only).
 */
export async function saveCompanyValue(
  accessToken: string,
  payload: SaveCompanyValuePayload
): Promise<SaveCompanyValueResponse> {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  const client = new RestClient(baseUrl, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
  return client.post<SaveCompanyValueResponse>(SAVE_COMPANY_VALUE_PATH, payload, {
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * POST to updateCompanyValue API. Body shape: { companyValue: { id, version?, title, description, active, ... } }.
 */
export async function updateCompanyValue(
  accessToken: string,
  payload: UpdateCompanyValuePayload
): Promise<UpdateCompanyValueResponse> {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  const client = new RestClient(baseUrl, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
  return client.post<UpdateCompanyValueResponse>(UPDATE_COMPANY_VALUE_PATH, payload, {
    headers: { 'Content-Type': 'application/json' }
  })
}
