import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface ManagerFeedbackResult {
  /** Days since last feedback was given to any team member */
  daysSinceLastFeedback: number | null
  /** Date of last feedback given */
  lastFeedbackDate: Date | null
  /** Whether the manager has given feedback in the last 30 days */
  hasFeedbackRecently: boolean
  /** Total feedback count to team members */
  totalFeedbackCount: number
  loading: boolean
  error: Error | null
}

interface UseManagerFeedbackProps {
  accessToken: string
  managerId: string
  /** List of direct report employee IDs */
  directReportIds: string[]
}

/**
 * Hook to check when the manager last gave feedback to their team members
 */
export const useManagerFeedback = ({
  accessToken,
  managerId,
  directReportIds
}: UseManagerFeedbackProps): ManagerFeedbackResult => {
  const [daysSinceLastFeedback, setDaysSinceLastFeedback] = useState<number | null>(null)
  const [lastFeedbackDate, setLastFeedbackDate] = useState<Date | null>(null)
  const [hasFeedbackRecently, setHasFeedbackRecently] = useState(true)
  const [totalFeedbackCount, setTotalFeedbackCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)

  const fetchManagerFeedback = useCallback(async () => {
    if (!managerId || !accessToken || directReportIds.length === 0) {
      setLoading(false)
      setDaysSinceLastFeedback(null)
      setHasFeedbackRecently(true) // No team, so no feedback needed
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Query feedback where the manager is the sender and recipients are team members
      const feedbackQuery = `
        query GetManagerFeedbackToTeam($managerId: uuid!, $teamMemberIds: [uuid!]!) {
          EmployeeFeedback(
            where: {
              senderEmployeeId: { _eq: $managerId },
              employeeId: { _in: $teamMemberIds },
              isDeleted: { _eq: false }
            },
            orderBy: { feedbackDate: DESC },
            limit: 1
          ) {
            id
            feedbackDate
            employeeId
          }
          
          EmployeeFeedbackAggregate(
            where: {
              senderEmployeeId: { _eq: $managerId },
              employeeId: { _in: $teamMemberIds },
              isDeleted: { _eq: false }
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `

      const response = await graphQLClient.request(feedbackQuery, {
        managerId,
        teamMemberIds: directReportIds
      })

      const feedbackRecords = response?.EmployeeFeedback || []
      const totalCount = response?.EmployeeFeedbackAggregate?.aggregate?.count || 0

      setTotalFeedbackCount(totalCount)

      if (feedbackRecords.length > 0) {
        const lastFeedback = feedbackRecords[0]
        const feedbackDate = new Date(lastFeedback.feedbackDate)
        const today = new Date()
        const diffTime = today.getTime() - feedbackDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        setLastFeedbackDate(feedbackDate)
        setDaysSinceLastFeedback(diffDays)
        setHasFeedbackRecently(diffDays <= 30)
      } else {
        // No feedback ever given to team members
        setLastFeedbackDate(null)
        setDaysSinceLastFeedback(null)
        setHasFeedbackRecently(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch manager feedback data'))
      console.error('Error fetching manager feedback:', err)
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, directReportIds, graphQLClient])

  useEffect(() => {
    fetchManagerFeedback()
  }, [fetchManagerFeedback])

  return {
    daysSinceLastFeedback,
    lastFeedbackDate,
    hasFeedbackRecently,
    totalFeedbackCount,
    loading,
    error
  }
}

