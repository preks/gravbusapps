import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_LEARNING_ASSIGNMENTS, type GetLearningAssignmentsResponse } from '../queries/learningAssignmentQueries'
import type {
  LearningAssignmentApi,
  LearningAssignmentGroup,
  LearningAssignmentProgressRow,
  LearningEmployeeApi,
  LearningAttemptApi
} from '../types'

export interface UseLearningAssignmentsResult {
  assignments: LearningAssignmentApi[]
  groups: LearningAssignmentGroup[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function toNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function latestAttemptForEmployee(
  attempts: LearningAttemptApi[] | undefined,
  employeeId: string
): LearningAttemptApi | undefined {
  return attempts?.find(attempt => attempt.employeeId === employeeId)
}

function formatEmployeeName(employee: LearningEmployeeApi | null | undefined): string {
  const fullName = [employee?.firstName, employee?.lastName].filter(Boolean).join(' ').trim()
  return employee?.displayName?.trim() || fullName || 'Unknown employee'
}

export function formatLearningAssignmentStatus(value: string | null | undefined): string {
  if (!value) return '-'
  return value
    .replace(/_LEARNING_(ASSIGNMENT|ATTEMPT)$/u, '')
    .replace(/_/gu, ' ')
    .toLowerCase()
    .replace(/^\w/u, char => char.toUpperCase())
}

function isOverdue(row: LearningAssignmentProgressRow): boolean {
  if (!row.availableUntil || row.submittedAt || row.gradedAt) return false
  const dueDate = new Date(row.availableUntil)
  return Number.isFinite(dueDate.getTime()) && dueDate < new Date()
}

export function mapLearningAssignmentGroups(assignments: LearningAssignmentApi[]): LearningAssignmentGroup[] {
  const groups = new Map<string, LearningAssignmentGroup>()

  assignments.forEach(assignment => {
    const courseId = assignment.learningCourseId ?? assignment.learningCourse?.id ?? 'unknown-course'
    const group =
      groups.get(courseId) ??
      ({
        courseId,
        courseTitle: assignment.learningCourse?.title ?? assignment.title ?? 'Untitled course',
        assignments: [],
        rows: [],
        summary: {
          assigned: 0,
          inProgress: 0,
          submittedOrGraded: 0,
          passed: 0,
          overdue: 0
        }
      } satisfies LearningAssignmentGroup)

    group.assignments.push(assignment)

    const targetEmployeeIds = Array.from(
      new Set((assignment.learningAssignmentTargets ?? []).map(target => target.employeeId).filter(Boolean) as string[])
    )

    targetEmployeeIds.forEach(employeeId => {
      const target = assignment.learningAssignmentTargets?.find(item => item.employeeId === employeeId)
      const attempt = latestAttemptForEmployee(assignment.learningAttempts, employeeId)
      const employee = target?.employee ?? attempt?.employee
      const row: LearningAssignmentProgressRow = {
        employeeId,
        employeeName: formatEmployeeName(employee),
        employeePictureThumbnail: employee?.pictureThumbnail ?? undefined,
        assignmentTargetId: target?.id,
        attemptId: attempt?.id,
        assignmentStatus: assignment.status ?? '-',
        assignmentStatusLabel: formatLearningAssignmentStatus(assignment.status),
        attemptStatus: attempt?.status ?? 'NOT_STARTED_LEARNING_ATTEMPT',
        attemptStatusLabel: formatLearningAssignmentStatus(attempt?.status ?? 'NOT_STARTED_LEARNING_ATTEMPT'),
        startedAt: attempt?.startedAt ?? undefined,
        submittedAt: attempt?.submittedAt ?? undefined,
        gradedAt: attempt?.gradedAt ?? undefined,
        scorePct: toNumber(attempt?.scorePct),
        passed: attempt?.passed ?? undefined,
        availableUntil: assignment.availableUntil ?? undefined
      }
      group.rows.push(row)
    })

    groups.set(courseId, group)
  })

  return Array.from(groups.values()).map(group => {
    const summary = group.rows.reduce(
      (acc, row) => {
        acc.assigned += 1
        if (row.attemptStatus === 'IN_PROGRESS_LEARNING_ATTEMPT') acc.inProgress += 1
        if (['SUBMITTED_LEARNING_ATTEMPT', 'GRADED_LEARNING_ATTEMPT'].includes(row.attemptStatus))
          acc.submittedOrGraded += 1
        if (row.passed) acc.passed += 1
        if (isOverdue(row)) acc.overdue += 1
        return acc
      },
      { assigned: 0, inProgress: 0, submittedOrGraded: 0, passed: 0, overdue: 0 }
    )
    return { ...group, summary }
  })
}

export function useLearningAssignments(accessToken: string | undefined): UseLearningAssignmentsResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [assignments, setAssignments] = useState<LearningAssignmentApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAssignments = useCallback(async () => {
    if (!accessToken) {
      setAssignments([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetLearningAssignmentsResponse>(GET_LEARNING_ASSIGNMENTS)
      setAssignments(result?.LearningAssignment ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load learning assignments')
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchAssignments().catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to load learning assignments')
    })
  }, [fetchAssignments])

  const groups = useMemo(() => mapLearningAssignmentGroups(assignments), [assignments])

  return { assignments, groups, loading, error, refetch: fetchAssignments }
}
