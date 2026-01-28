/**
 * Hook for fetching AI analysis of expense requests
 *
 * This hook fetches AI-generated analysis for an expense request.
 * The analysis includes warnings or informational messages about
 * potential issues with the expense request.
 *
 * API Documentation: /flowbot/docs#/API%20for%20Agent/get_expense_insights_flowbot_api_agent_expense_insights_post
 */

import { useState, useEffect, useCallback } from 'react'

export type AnalysisType = 'WARNING' | 'INFO'

export interface ExpenseRequestAnalysis {
  type: AnalysisType
  user_text: string
}

// API response may have user_text as string or array
interface ApiResponse {
  type: AnalysisType
  user_text: string | string[]
}

interface UseExpenseRequestAnalysisProps {
  expenseRequestId: string | null
  accessToken?: string
}

interface UseExpenseRequestAnalysisReturn {
  analysis: ExpenseRequestAnalysis | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

/** API endpoint for expense insights (relative URL) */
const EXPENSE_INSIGHTS_ENDPOINT = '/flowbot/api/agent/expense-insights'

/**
 * Fetch expense insights from the API
 * @param expenseRequestId - The expense request ID to analyze
 * @param accessToken - The access token for authentication
 * @returns Promise with the analysis response
 */
const fetchExpenseInsights = async (expenseRequestId: string, accessToken: string): Promise<ExpenseRequestAnalysis> => {
  const url = EXPENSE_INSIGHTS_ENDPOINT

  // Send as form-urlencoded (required by the flowbot API)
  const formBody = new URLSearchParams()
  formBody.append('expense_request_id', expenseRequestId)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    credentials: 'include',
    body: formBody
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch expense insights: ${response.status} ${response.statusText}`)
  }

  const data: ApiResponse = await response.json()

  // Validate the response structure
  if (!data.type || !data.user_text) {
    throw new Error('Invalid response format from expense insights API')
  }

  // Handle user_text as either string or array
  let userText: string
  if (Array.isArray(data.user_text)) {
    // Join array items with newlines
    userText = data.user_text.join('\n')
  } else {
    userText = data.user_text
  }

  return {
    type: data.type,
    user_text: userText
  }
}

/**
 * Hook to fetch AI analysis for an expense request
 */
export const useExpenseRequestAnalysis = ({
  expenseRequestId,
  accessToken
}: UseExpenseRequestAnalysisProps): UseExpenseRequestAnalysisReturn => {
  const [analysis, setAnalysis] = useState<ExpenseRequestAnalysis | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [fetchTrigger, setFetchTrigger] = useState<number>(0)

  const fetchAnalysis = useCallback(async () => {
    if (!expenseRequestId) {
      setAnalysis(null)
      setLoading(false)
      return
    }

    if (!accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchExpenseInsights(expenseRequestId, accessToken)
      setAnalysis(data)
    } catch (err) {
      console.error('[useExpenseRequestAnalysis] Error fetching analysis:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch expense request analysis'))
      setAnalysis(null)
    } finally {
      setLoading(false)
    }
  }, [expenseRequestId, accessToken, fetchTrigger])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  const refetch = useCallback(() => {
    setFetchTrigger(prev => prev + 1)
  }, [])

  return {
    analysis,
    loading,
    error,
    refetch
  }
}

export default useExpenseRequestAnalysis
