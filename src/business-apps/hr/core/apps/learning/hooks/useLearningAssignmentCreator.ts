import { useCallback, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { RESOLVE_LEARNING_COMPANY, type ResolveLearningCompanyResponse } from '../queries/learningAssignmentQueries'
import {
  createLearningAssignmentWithTargets,
  type CreateLearningAssignmentRequest,
  type CreateLearningAssignmentResult
} from '../services/learningAssignmentApi'
import { createLearningQuizTasks, type LearningQuizTaskEmployee } from '../services/learningQuizTaskFlowService'

export interface CreateLearningAssignmentInput {
  courseId: string
  courseTitle: string
  courseVersionId: string
  employeeIds: string[]
  employeeUserIdsByEmployeeId?: Record<string, string | undefined>
  teamIds: string[]
  availableFrom: string
  availableUntil: string
  sourceDocumentId?: string
}

export interface UseLearningAssignmentCreatorResult {
  createAssignment: (input: CreateLearningAssignmentInput) => Promise<CreateLearningAssignmentResult>
  loading: boolean
  error: string | null
}

function readCompanyIdFromContext(context: BusinessAppContextProps): string | undefined {
  const additionalData = context.additionalData ?? {}
  const userInfo = context.userInfo as Record<string, unknown> | undefined
  const userCompanyId = typeof userInfo?.companyId === 'string' ? userInfo.companyId : undefined
  const additionalCompanyId = typeof additionalData.companyId === 'string' ? additionalData.companyId : undefined
  return userCompanyId ?? additionalCompanyId
}

function buildLearningQuizTaskEmployees(
  employeeIds: string[],
  userIdsByEmployeeId?: Record<string, string | undefined>
): LearningQuizTaskEmployee[] {
  return employeeIds.map(employeeId => {
    const userId = userIdsByEmployeeId?.[employeeId]
    return userId ? { employeeId, userId } : { employeeId }
  })
}

export function useLearningAssignmentCreator(context: BusinessAppContextProps): UseLearningAssignmentCreatorResult {
  const graphqlClient = useGraphqlClient(context.accessToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolveCompanyId = useCallback(async (): Promise<string> => {
    const contextCompanyId = readCompanyIdFromContext(context)
    if (contextCompanyId) return contextCompanyId

    const employeeId = context.userInfo?.employeeDetails?.employeeId
    if (!employeeId) throw new Error('Company context is missing.')

    const result = await graphqlClient.request<ResolveLearningCompanyResponse>(RESOLVE_LEARNING_COMPANY, { employeeId })
    const companyId = result?.Employee?.[0]?.companyEmployees?.[0]?.companyId
    if (!companyId) throw new Error('Company context is missing.')
    return companyId
  }, [context, graphqlClient])

  const createAssignment = useCallback(
    async (input: CreateLearningAssignmentInput) => {
      try {
        setLoading(true)
        setError(null)
        const companyId = await resolveCompanyId()
        const employeeIds = Array.from(new Set(input.employeeIds.filter(Boolean)))
        if (employeeIds.length === 0) throw new Error('Select at least one employee.')

        const request: CreateLearningAssignmentRequest = {
          ...input,
          companyId,
          employeeIds
        }
        const result = await createLearningAssignmentWithTargets(context.accessToken, request)
        const initiatorId = context.userInfo?.id ?? context.userInfo?.employeeDetails?.employeeId ?? ''
        if (initiatorId) {
          try {
            await createLearningQuizTasks({
              accessToken: context.accessToken,
              initiatorId,
              courseId: input.courseId,
              courseTitle: input.courseTitle,
              courseVersionId: input.courseVersionId,
              assignmentId: result.assignmentId,
              sourceDocumentId: input.sourceDocumentId,
              availableUntil: input.availableUntil,
              employees: buildLearningQuizTaskEmployees(employeeIds, input.employeeUserIdsByEmployeeId)
            })
          } catch (err) {
            console.warn(err instanceof Error ? err.message : 'Learning quiz task creation failed')
          }
        }
        globalThis.dispatchEvent(new CustomEvent('learning-assignment-created', { detail: result }))
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not create learning assignment.'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [context.accessToken, resolveCompanyId]
  )

  return { createAssignment, loading, error }
}
