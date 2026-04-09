import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ContentRole, ContentGroup } from '@/common/data/content/constants/contentConstants'

export interface UserEngagementData {
  articlesCreated: number
  questionsAsked: number
  documentsUploaded: number
  commentsMade: number
  answersGiven: number
  reactionsGiven: number
  totalScore: number
}

interface EngagementResponse {
  articlesCreated: {
    aggregate: {
      count: number
    }
  }
  questionsAsked: {
    aggregate: {
      count: number
    }
  }
  documentsUploaded: {
    aggregate: {
      count: number
    }
  }
  commentsMade: {
    aggregate: {
      count: number
    }
  }
  answersGiven: {
    aggregate: {
      count: number
    }
  }
  reactionsGiven: {
    aggregate: {
      count: number
    }
  }
}

const buildUserEngagementQuery = (userId: string): string => {
  return `
    query getUserEngagement {
      articlesCreated: ContentEntryAggregate(
        where: {
          role: { _eq: "${ContentRole.ROOT}" }
          contentGroup: { _in: ["${ContentGroup.NEWS}", "${ContentGroup.KNOWLEDGE}"] }
          createdBy: { _eq: "${userId}" }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      questionsAsked: ContentEntryAggregate(
        where: {
          role: { _eq: "${ContentRole.ROOT}" }
          contentGroup: { _eq: "${ContentGroup.QUESTION}" }
          createdBy: { _eq: "${userId}" }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      documentsUploaded: ContentDocumentAggregate(
        where: {
          createdBy: { _eq: "${userId}" }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      commentsMade: ContentEntryAggregate(
        where: {
          role: { _eq: "${ContentRole.COMMENT}" }
          createdBy: { _eq: "${userId}" }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      answersGiven: ContentEntryAggregate(
        where: {
          role: { _eq: "${ContentRole.COMMENT}" }
          parentContentEntryId: { _isNull: false }
          createdBy: { _eq: "${userId}" }
          isDeleted: { _eq: false }
          parentContentEntry: {
            contentGroup: { _eq: "${ContentGroup.QUESTION}" }
            role: { _eq: "${ContentRole.ROOT}" }
          }
        }
      ) {
        aggregate {
          count
        }
      }
      reactionsGiven: ContentEntryReactionAggregate(
        where: {
          createdBy: { _eq: "${userId}" }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

export const useUserEngagement = (userId: string | undefined, accessToken?: string) => {
  const [engagementData, setEngagementData] = useState<UserEngagementData>({
    articlesCreated: 0,
    questionsAsked: 0,
    documentsUploaded: 0,
    commentsMade: 0,
    answersGiven: 0,
    reactionsGiven: 0,
    totalScore: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const calculateScore = useCallback(
    (data: {
      articlesCreated: number
      questionsAsked: number
      documentsUploaded: number
      commentsMade: number
      answersGiven: number
      reactionsGiven: number
    }): number => {
      // Scoring system:
      // Articles Created: 2 points each
      // Questions Asked: 5 points each
      // Documents Uploaded: 3 points each
      // Comments Made: 3 points each
      // Answers Given: 10 points each
      // Reactions Given: 1 point each
      return (
        data.articlesCreated * 2 +
        data.questionsAsked * 5 +
        data.documentsUploaded * 3 +
        data.commentsMade * 3 +
        data.answersGiven * 10 +
        data.reactionsGiven * 1
      )
    },
    []
  )

  const fetchEngagement = useCallback(async () => {
    if (!userId || !accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = buildUserEngagementQuery(userId)
      const response = await graphqlClient.request<EngagementResponse>(query)

      const data: UserEngagementData = {
        articlesCreated: response.articlesCreated?.aggregate?.count || 0,
        questionsAsked: response.questionsAsked?.aggregate?.count || 0,
        documentsUploaded: response.documentsUploaded?.aggregate?.count || 0,
        commentsMade: response.commentsMade?.aggregate?.count || 0,
        answersGiven: response.answersGiven?.aggregate?.count || 0,
        reactionsGiven: response.reactionsGiven?.aggregate?.count || 0,
        totalScore: 0
      }

      data.totalScore = calculateScore(data)
      setEngagementData(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch engagement data'))
    } finally {
      setIsLoading(false)
    }
  }, [userId, accessToken, graphqlClient, calculateScore])

  useEffect(() => {
    fetchEngagement()
  }, [fetchEngagement])

  return {
    engagementData,
    isLoading,
    error,
    refetch: fetchEngagement
  }
}
