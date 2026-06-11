import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import type { LearningStatus } from '../constants/learningStatus'

const SAVE_LEARNING_COURSE_PATH = '/processes/employee/saveLearningCourse'

export interface SaveLearningCoursePayload {
  changeMode: 'INSERT' | 'UPDATE' | 'DELETE'
  learningCourse: {
    id?: string
    version?: number
    title: string
    description?: string
    sourceDocumentId?: string
    sourceDocumentHash?: string
    ownerEmployeeId?: string
    passThreshold?: number
    timeLimitMinutes?: number
    maxAttempts?: number
    allowRetake?: boolean
    anonymous?: boolean
    status?: LearningStatus
  }
}

export interface SaveLearningCourseResponse {
  id?: string
  learningCourse?: {
    id?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

const createEmployeeProcessClient = (accessToken: string) => {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  return new RestClient(baseUrl, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
}

export async function saveLearningCourse(
  accessToken: string,
  payload: SaveLearningCoursePayload
): Promise<SaveLearningCourseResponse> {
  return createEmployeeProcessClient(accessToken).post<SaveLearningCourseResponse>(SAVE_LEARNING_COURSE_PATH, payload, {
    headers: { 'Content-Type': 'application/json' }
  })
}

export function resolveSavedLearningCourseId(response: SaveLearningCourseResponse): string | null {
  if (typeof response.learningCourse?.id === 'string' && response.learningCourse.id) return response.learningCourse.id
  if (typeof response.id === 'string' && response.id) return response.id
  return null
}

export function resolveSavedLearningCourseVersion(response: SaveLearningCourseResponse): number | undefined {
  const version = response.learningCourse?.version ?? response.version
  if (typeof version === 'number') return version
  if (typeof version === 'string' && Number.isFinite(Number(version))) return Number(version)
  return undefined
}
