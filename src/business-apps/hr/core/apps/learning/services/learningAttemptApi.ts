import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import type { LearningAttemptCommandResult, StartLearningAttemptPayload, SubmitLearningAttemptPayload } from '../types'

const START_ATTEMPT_PATH = '/processes/employee/startLearningAttempt'
const SUBMIT_ATTEMPT_PATH = '/processes/employee/submitLearningAttempt'

interface ProcessResponse {
  id?: string
  learningAttempt?: Partial<LearningAttemptCommandResult> & { id?: string }
  learningAttemptResult?: Partial<LearningAttemptCommandResult> & { id?: string; remainingAttempts?: number | string }
  startLearningAttempt?: Partial<LearningAttemptCommandResult>
  submitLearningAttempt?: Partial<LearningAttemptCommandResult>
  [key: string]: unknown
}

const createEmployeeProcessClient = (accessToken: string) => {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  return new RestClient(baseUrl, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

function findResultPayload(response: ProcessResponse, processKey: 'startLearningAttempt' | 'submitLearningAttempt') {
  const processPayload = response[processKey]
  if (typeof processPayload === 'object' && processPayload) return processPayload as Record<string, unknown>
  if (typeof response.learningAttemptResult === 'object' && response.learningAttemptResult) {
    return response.learningAttemptResult
  }
  if (typeof response.learningAttempt === 'object' && response.learningAttempt) return response.learningAttempt
  return response
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readAttemptId(value: unknown, parentKey = ''): string | undefined {
  if (!isRecord(value)) return undefined

  const directAttemptId = value.attemptId ?? value.learningAttemptId
  if (typeof directAttemptId === 'string' && directAttemptId) return directAttemptId

  const canUseNestedId = parentKey.toLowerCase().includes('attempt')
  if (canUseNestedId && typeof value.id === 'string' && value.id) return value.id

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === 'id') continue
    const nestedAttemptId = readAttemptId(nestedValue, key)
    if (nestedAttemptId) return nestedAttemptId
  }

  return undefined
}

function normalizeAttemptResult(
  response: ProcessResponse,
  processKey: 'startLearningAttempt' | 'submitLearningAttempt'
): LearningAttemptCommandResult {
  const payload = findResultPayload(response, processKey)
  const attemptId = readAttemptId(payload) ?? readAttemptId(response)
  if (typeof attemptId !== 'string' || !attemptId) {
    throw new Error('Employee service did not return learning attempt id. Check the Kogito response DTO mapping.')
  }

  const status = typeof payload.status === 'string' ? payload.status : 'IN_PROGRESS_LEARNING_ATTEMPT'
  const attemptsLeft = toNumber(payload.attemptsLeft ?? payload.remainingAttempts)
  return {
    attemptId,
    status,
    scoreRaw: toNumber(payload.scoreRaw),
    scorePct: toNumber(payload.scorePct),
    passed: toBoolean(payload.passed),
    bandLabel: typeof payload.bandLabel === 'string' ? payload.bandLabel : undefined,
    attemptsUsed: toNumber(payload.attemptsUsed),
    attemptsAllowed: toNumber(payload.attemptsAllowed),
    attemptsLeft,
    canRetake: toBoolean(payload.canRetake),
    message: typeof payload.message === 'string' ? payload.message : undefined
  }
}

export async function startLearningAttempt(
  accessToken: string,
  payload: StartLearningAttemptPayload
): Promise<LearningAttemptCommandResult> {
  const response = await createEmployeeProcessClient(accessToken).post<ProcessResponse>(
    START_ATTEMPT_PATH,
    { learningAttempt: payload },
    { headers: { 'Content-Type': 'application/json' } }
  )
  return normalizeAttemptResult(response, 'startLearningAttempt')
}

export async function submitLearningAttempt(
  accessToken: string,
  payload: SubmitLearningAttemptPayload
): Promise<LearningAttemptCommandResult> {
  const response = await createEmployeeProcessClient(accessToken).post<ProcessResponse>(
    SUBMIT_ATTEMPT_PATH,
    { learningAttempt: payload },
    { headers: { 'Content-Type': 'application/json' } }
  )
  return normalizeAttemptResult(response, 'submitLearningAttempt')
}
