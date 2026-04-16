import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ContentRole, ContentGroup } from '@/common/data/content/constants/contentConstants'

export interface ContentStatistics {
  recentNewsCount: number
  recentKnowledgeCount: number
  recentDocumentsCount: number
  unansweredQuestionsCount: number
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface StatisticsResponse {
  newsAggregate: {
    aggregate: {
      count: number
    }
  }
  knowledgeAggregate: {
    aggregate: {
      count: number
    }
  }
  documentsAggregate: {
    aggregate: {
      count: number
    }
  }
  questions: Array<{
    id: string
    childContentEntries: Array<{
      accepted: boolean
    }>
  }>
}

/**
 * Hook to fetch all content statistics in a single query
 */
export const useContentStatistics = (accessToken?: string): ContentStatistics => {
  const [recentNewsCount, setRecentNewsCount] = useState(0)
  const [recentKnowledgeCount, setRecentKnowledgeCount] = useState(0)
  const [recentDocumentsCount, setRecentDocumentsCount] = useState(0)
  const [unansweredQuestionsCount, setUnansweredQuestionsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchStatistics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query getContentStatistics {
          newsAggregate: ContentEntryAggregate(
            where: {
              role: { _eq: "${ContentRole.ROOT}" }
              contentGroup: { _eq: "${ContentGroup.NEWS}" }
              isDeleted: { _eq: false }
            }
          ) {
            aggregate {
              count
            }
          }
          knowledgeAggregate: ContentEntryAggregate(
            where: {
              role: { _eq: "${ContentRole.ROOT}" }
              contentGroup: { _eq: "${ContentGroup.KNOWLEDGE}" }
              isDeleted: { _eq: false }
            }
          ) {
            aggregate {
              count
            }
          }
          documentsAggregate: ContentEntryAggregate(
            where: {
              role: { _eq: "${ContentRole.ROOT}" }
              contentGroup: { _eq: "${ContentGroup.DOCUMENT}" }
              isDeleted: { _eq: false }
            }
          ) {
            aggregate {
              count
            }
          }
          questions: ContentEntry(
            where: {
              role: { _eq: "${ContentRole.ROOT}" }
              contentGroup: { _eq: "${ContentGroup.QUESTION}" }
              isDeleted: { _eq: false }
            }
            limit: 1000
          ) {
            id
            childContentEntries(
              where: { isDeleted: { _eq: false } }
            ) {
              accepted
            }
          }
        }
      `

      const response = await graphqlClient.request<StatisticsResponse>(query)

      // Set counts from aggregates
      setRecentNewsCount(response.newsAggregate?.aggregate?.count || 0)
      setRecentKnowledgeCount(response.knowledgeAggregate?.aggregate?.count || 0)
      setRecentDocumentsCount(response.documentsAggregate?.aggregate?.count || 0)

      // Calculate unanswered questions (questions without accepted answers)
      const unansweredCount =
        response.questions?.filter(question => {
          const hasAcceptedAnswer = question.childContentEntries?.some(answer => answer.accepted) || false
          return !hasAcceptedAnswer
        }).length || 0
      setUnansweredQuestionsCount(unansweredCount)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch content statistics')
      setError(errorObj)
      console.error('Error fetching content statistics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient])

  useEffect(() => {
    if (accessToken) {
      fetchStatistics()
    }
  }, [accessToken, fetchStatistics])

  return {
    recentNewsCount,
    recentKnowledgeCount,
    recentDocumentsCount,
    unansweredQuestionsCount,
    isLoading,
    error,
    refetch: fetchStatistics
  }
}
