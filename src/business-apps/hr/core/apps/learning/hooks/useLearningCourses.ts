import { useCallback, useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { LEARNING_STATUS } from '../constants/learningStatus'
import { GET_LEARNING_COURSES, type GetLearningCoursesResponse } from '../queries/learningCourseQueries'
import type { LearningCourseApi, LearningCourseListItem } from '../types'

export interface UseLearningCoursesResult {
  courses: LearningCourseListItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function toNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeStatus(status: string | null | undefined): string {
  if (!status) return LEARNING_STATUS.DRAFT
  const upper = status.toUpperCase()
  if (upper === LEARNING_STATUS.PUBLISHED || upper.includes('PUBLISHED')) return LEARNING_STATUS.PUBLISHED
  if (upper === LEARNING_STATUS.ARCHIVED || upper.includes('ARCHIVED')) return LEARNING_STATUS.ARCHIVED
  return LEARNING_STATUS.DRAFT
}

function formatEmployeeName(employee: LearningCourseApi['ownerEmployee']): string | undefined {
  const fullName = [employee?.firstName, employee?.lastName].filter(Boolean).join(' ').trim()
  return employee?.displayName?.trim() || fullName || undefined
}

export function mapLearningCourseFromApi(api: LearningCourseApi): LearningCourseListItem {
  return {
    id: api.id,
    version: api.version ?? 0,
    title: api.title ?? '',
    description: api.description ?? '',
    status: normalizeStatus(api.status),
    sourceDocumentId: api.sourceDocumentId ?? undefined,
    sourceDocumentHash: api.sourceDocumentHash ?? undefined,
    passThreshold: toNumber(api.passThreshold),
    timeLimitMinutes: api.timeLimitMinutes ?? undefined,
    maxAttempts: api.maxAttempts ?? undefined,
    allowRetake: api.allowRetake ?? false,
    anonymous: api.anonymous ?? false,
    ownerEmployeeId: api.ownerEmployeeId ?? undefined,
    ownerEmployeeName: formatEmployeeName(api.ownerEmployee),
    createdAt: api.createdAt ?? undefined,
    updatedAt: api.updatedAt ?? api.createdAt ?? undefined
  }
}

export function useLearningCourses(accessToken: string | undefined): UseLearningCoursesResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [courses, setCourses] = useState<LearningCourseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    if (!accessToken) {
      setCourses([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetLearningCoursesResponse>(GET_LEARNING_COURSES)
      setCourses((result?.LearningCourse ?? []).map(mapLearningCourseFromApi))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load learning courses')
      setCourses([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  return { courses, loading, error, refetch: fetchCourses }
}
