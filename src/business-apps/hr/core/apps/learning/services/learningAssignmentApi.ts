import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import type { LearningAssignmentPayload, LearningAssignmentTargetPayload, LearningAttemptPayload } from '../types'

const CREATE_ASSIGNMENT_PATH = '/processes/employee/createLearningAssignment'
const CREATE_ASSIGNMENT_TARGET_PATH = '/processes/employee/createLearningAssignmentTarget'
const CREATE_ATTEMPT_PATH = '/processes/employee/createLearningAttempt'

interface ProcessResponse {
  id?: string
  [key: string]: unknown
}

export interface CreateLearningAssignmentRequest {
  courseId: string
  courseTitle: string
  courseVersionId: string
  companyId: string
  employeeIds: string[]
  teamIds: string[]
  availableFrom: string
  availableUntil: string
}

export interface CreateLearningAssignmentResult {
  assignmentId: string
  targetIds: string[]
  attemptIds: string[]
}

const createEmployeeProcessClient = (accessToken: string) => {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  return new RestClient(baseUrl, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
}

function resolveProcessId<T extends string>(response: ProcessResponse, key: T): string {
  const nested = response[key]
  if (typeof nested === 'object' && nested && 'id' in nested && typeof nested.id === 'string' && nested.id) {
    return nested.id
  }
  if (typeof response.id === 'string' && response.id) return response.id
  throw new Error(`Employee service did not return ${key} id`)
}

export async function createLearningAssignment(
  accessToken: string,
  payload: LearningAssignmentPayload
): Promise<ProcessResponse> {
  return createEmployeeProcessClient(accessToken).post<ProcessResponse>(
    CREATE_ASSIGNMENT_PATH,
    { learningAssignment: payload },
    { headers: { 'Content-Type': 'application/json' } }
  )
}

export async function createLearningAssignmentTarget(
  accessToken: string,
  payload: LearningAssignmentTargetPayload
): Promise<ProcessResponse> {
  return createEmployeeProcessClient(accessToken).post<ProcessResponse>(
    CREATE_ASSIGNMENT_TARGET_PATH,
    { learningAssignmentTarget: payload },
    { headers: { 'Content-Type': 'application/json' } }
  )
}

export async function createLearningAttempt(
  accessToken: string,
  payload: LearningAttemptPayload
): Promise<ProcessResponse> {
  return createEmployeeProcessClient(accessToken).post<ProcessResponse>(
    CREATE_ATTEMPT_PATH,
    { learningAttempt: payload },
    { headers: { 'Content-Type': 'application/json' } }
  )
}

export async function createLearningAssignmentWithTargets(
  accessToken: string,
  request: CreateLearningAssignmentRequest
): Promise<CreateLearningAssignmentResult> {
  const employeeIds = Array.from(new Set(request.employeeIds.filter(Boolean)))
  const assignmentResponse = await createLearningAssignment(accessToken, {
    title: request.courseTitle,
    audienceMode: request.teamIds.length > 0 ? 'TEAMS_LEARNING_AUDIENCE' : 'USERS_LEARNING_AUDIENCE',
    audienceTargets: {
      employeeIds,
      teamIds: request.teamIds
    },
    availableFrom: request.availableFrom,
    availableUntil: request.availableUntil,
    status:
      new Date(request.availableFrom) > new Date() ? 'SCHEDULED_LEARNING_ASSIGNMENT' : 'ACTIVE_LEARNING_ASSIGNMENT',
    company: request.companyId,
    learningCourse: request.courseId,
    learningCourseVersion: request.courseVersionId
  })
  const assignmentId = resolveProcessId(assignmentResponse, 'learningAssignment')

  const targetIds: string[] = []
  const attemptIds: string[] = []
  for (const employeeId of employeeIds) {
    const targetResponse = await createLearningAssignmentTarget(accessToken, {
      learningAssignment: assignmentId,
      employee: employeeId,
      resolutionSource: 'DIRECT_LEARNING_TARGET'
    })
    targetIds.push(resolveProcessId(targetResponse, 'learningAssignmentTarget'))

    const attemptResponse = await createLearningAttempt(accessToken, {
      learningAssignment: assignmentId,
      learningCourseVersion: request.courseVersionId,
      employee: employeeId,
      status: 'IN_PROGRESS_LEARNING_ATTEMPT',
      startedAt: request.availableFrom,
      passed: false,
      gradingMetadata: { seededByAssignment: true }
    })
    attemptIds.push(resolveProcessId(attemptResponse, 'learningAttempt'))
  }

  return { assignmentId, targetIds, attemptIds }
}
