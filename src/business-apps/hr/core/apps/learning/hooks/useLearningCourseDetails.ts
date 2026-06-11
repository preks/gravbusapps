import { useCallback, useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { LEARNING_STATUS } from '../constants/learningStatus'
import { GET_LEARNING_COURSE_DETAILS, type GetLearningCourseDetailsResponse } from '../queries/learningCourseQueries'
import {
  isLearningRecord,
  mapLearningQuestionOptions,
  normalizeLearningQuestionType
} from '../services/learningQuestionMapper'
import type {
  EditableLearningQuestion,
  EditableLearningQuiz,
  LearningCourseDetails,
  LearningCourseDetailsApi,
  LearningCourseListItem,
  LearningQuestionApi
} from '../types'
import { mapLearningCourseFromApi } from './useLearningCourses'

export interface UseLearningCourseDetailsResult {
  details: LearningCourseDetails | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function toNumber(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value !== 'number' && typeof value !== 'string') return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function mapCorrectKeys(value: Record<string, unknown> | null | undefined): string[] {
  const keys = value?.keys ?? value?.correctOptionKeys
  if (Array.isArray(keys)) return keys.filter((key): key is string => typeof key === 'string')
  return []
}

function dedupeQuestions(questions: EditableLearningQuestion[]): EditableLearningQuestion[] {
  const byOrderNo = new Map<number, EditableLearningQuestion>()
  for (const question of questions) {
    byOrderNo.set(question.orderNo, question)
  }
  return Array.from(byOrderNo.values()).sort((a, b) => a.orderNo - b.orderNo)
}

function mapQuestion(question: LearningQuestionApi, index: number): EditableLearningQuestion {
  return {
    id: question.id,
    orderNo: question.orderNo ?? index + 1,
    prompt: question.prompt ?? '',
    questionType: normalizeLearningQuestionType(question.questionType),
    options: mapLearningQuestionOptions(question.options),
    correctOptionKeys: mapCorrectKeys(question.correctKeys),
    points: toNumber(question.points, 1),
    explanation: question.explanation ?? '',
    pageReference: question.pageReference ?? undefined,
    topic: ''
  }
}

function createEmptyQuiz(course: LearningCourseListItem): EditableLearningQuiz {
  return {
    title: course.title,
    description: course.description,
    passThreshold: course.passThreshold ?? 70,
    maxAttempts: course.maxAttempts ?? 1,
    questions: [],
    coveredTopics: [],
    uncoveredTopics: [],
    scoringGrid: {
      perQuestion: {},
      bandDefinitions: { bands: [] }
    }
  }
}

export function mapLearningCourseDetailsFromApi(api: LearningCourseDetailsApi): LearningCourseDetails {
  const course = mapLearningCourseFromApi(api)
  const latestVersion = api.learningCourseVersions?.[0]
  const scoringGrid = latestVersion?.learningScoringGrids?.[0]
  const snapshot = latestVersion?.snapshot
  const snapshotRecord = isLearningRecord(snapshot) ? snapshot : undefined
  const sourceDocumentId = api.learningMaterials?.[0]?.contentDocumentId ?? course.sourceDocumentId
  const quiz = createEmptyQuiz(course)

  quiz.passThreshold = toNumber(scoringGrid?.passThreshold, quiz.passThreshold)
  quiz.maxAttempts = toNumber(snapshotRecord?.maxAttempts, quiz.maxAttempts)
  quiz.coveredTopics = Array.isArray(snapshotRecord?.coveredTopics)
    ? snapshotRecord.coveredTopics.filter((topic): topic is string => typeof topic === 'string')
    : []
  quiz.uncoveredTopics = Array.isArray(snapshotRecord?.uncoveredTopics)
    ? snapshotRecord.uncoveredTopics.filter((topic): topic is string => typeof topic === 'string')
    : []
  quiz.scoringGrid = {
    perQuestion: scoringGrid?.perQuestion ?? {},
    bandDefinitions: scoringGrid?.bandDefinitions ?? { bands: [] }
  }
  quiz.questions = dedupeQuestions(
    (latestVersion?.learningQuestions ?? []).map((question, index) => mapQuestion(question, index))
  )

  if (!latestVersion && course.status !== LEARNING_STATUS.DRAFT) {
    quiz.questions = []
  }

  return {
    course,
    latestVersion,
    sourceDocumentId,
    quiz
  }
}

export function useLearningCourseDetails(
  courseId: string | null | undefined,
  accessToken: string | undefined
): UseLearningCourseDetailsResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [details, setDetails] = useState<LearningCourseDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetails = useCallback(async () => {
    if (!accessToken || !courseId) {
      setDetails(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetLearningCourseDetailsResponse>(GET_LEARNING_COURSE_DETAILS, {
        courseId
      })
      const course = result.LearningCourse?.[0]
      if (!course) throw new Error('Learning course not found')
      setDetails(mapLearningCourseDetailsFromApi(course))
    } catch (err) {
      setDetails(null)
      setError(err instanceof Error ? err.message : 'Failed to load learning course details')
    } finally {
      setLoading(false)
    }
  }, [accessToken, courseId, graphqlClient])

  useEffect(() => {
    fetchDetails().catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to load learning course details')
    })
  }, [fetchDetails])

  return { details, loading, error, refetch: fetchDetails }
}
