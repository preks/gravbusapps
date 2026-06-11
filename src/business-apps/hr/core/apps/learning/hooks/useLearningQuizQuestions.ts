import { useCallback, useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_LEARNING_QUIZ_QUESTIONS } from '../queries/learningCourseQueries'
import { mapLearningQuizQuestion } from '../services/learningQuestionMapper'
import type { GetLearningQuizQuestionsResponse, LearningQuizQuestion } from '../types'

export interface UseLearningQuizQuestionsResult {
  questions: LearningQuizQuestion[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function dedupeLearningQuizQuestions(questions: LearningQuizQuestion[]): LearningQuizQuestion[] {
  const byOrderNo = new Map<number, LearningQuizQuestion>()
  for (const question of questions) {
    if (!byOrderNo.has(question.orderNo)) {
      byOrderNo.set(question.orderNo, question)
    }
  }
  return Array.from(byOrderNo.values()).sort((a, b) => a.orderNo - b.orderNo)
}

export function useLearningQuizQuestions(
  courseVersionId: string | null | undefined,
  accessToken: string | undefined
): UseLearningQuizQuestionsResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [questions, setQuestions] = useState<LearningQuizQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuestions = useCallback(async () => {
    if (!accessToken || !courseVersionId) {
      setQuestions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetLearningQuizQuestionsResponse>(GET_LEARNING_QUIZ_QUESTIONS, {
        courseVersionId
      })
      const version = result.LearningCourseVersion?.[0]
      setQuestions(
        dedupeLearningQuizQuestions(
          (version?.learningQuestions ?? []).map((question, index) => mapLearningQuizQuestion(question, index))
        )
      )
    } catch (err) {
      setQuestions([])
      setError(err instanceof Error ? err.message : 'Failed to load quiz questions')
    } finally {
      setLoading(false)
    }
  }, [accessToken, courseVersionId, graphqlClient])

  useEffect(() => {
    fetchQuestions().catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to load quiz questions')
    })
  }, [fetchQuestions])

  return { questions, loading, error, refetch: fetchQuestions }
}
