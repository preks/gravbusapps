import { RestClient } from '@/common/network/rest/RestClient'
import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'

const SAVE_RATING_SCALE_PATH = '/processes/employee/saveRatingScale'
const DELETE_RATING_SCALE_PATH = '/processes/employee/deleteRatingScale'

export interface RatingScaleValuePayload {
  value: string
  label: string
  description?: string
  numericEquivalent: number
  displayOrder: number
}

export interface SaveRatingScalePayload {
  changeMode: 'INSERT' | 'UPDATE' | 'DELETE'
  ratingScale: {
    name: string
    description?: string
    scaleType?: string
    active?: boolean
    notes?: string
    values: RatingScaleValuePayload[]
  }
}

export interface SaveRatingScaleResponse {
  id?: string
  [key: string]: unknown
}

/**
 * POST payload to saveRatingScale API (create/update rating scale).
 */
export async function saveRatingScale(
  accessToken: string,
  payload: SaveRatingScalePayload
): Promise<SaveRatingScaleResponse> {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  const client = new RestClient(baseUrl, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
  return client.post<SaveRatingScaleResponse>(SAVE_RATING_SCALE_PATH, payload, {
    headers: { 'Content-Type': 'application/json' }
  })
}

export interface DeleteRatingScalePayload {
  ratingScale: {
    id: string
    version: number
  }
}

export interface DeleteRatingScaleResponse {
  [key: string]: unknown
}

/**
 * POST to deleteRatingScale (id in payload, same pattern as deletePerformanceCycle).
 */
export async function deleteRatingScale(
  accessToken: string,
  payload: DeleteRatingScalePayload
): Promise<DeleteRatingScaleResponse> {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  const client = new RestClient(baseUrl, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
  return client.post<DeleteRatingScaleResponse>(DELETE_RATING_SCALE_PATH, payload, {
    headers: { 'Content-Type': 'application/json' }
  })
}
