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

const isAnalysisType = (value: unknown): value is AnalysisType => value === 'WARNING' || value === 'INFO'

const looksLikeJson = (value: string): boolean => {
  const trimmed = value.trim()
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))
}

/**
 * Some environments occasionally return a double-encoded payload where `user_text`
 * is a JSON string that itself contains `{ type, user_text }` (or an array of strings).
 * We normalize aggressively so the UI never renders raw JSON blobs.
 */
const normalizeExpenseInsightsResponse = (input: unknown): ExpenseRequestAnalysis => {
  // If we got a JSON string, attempt to parse it first.
  if (typeof input === 'string') {
    if (looksLikeJson(input)) {
      try {
        return normalizeExpenseInsightsResponse(JSON.parse(input))
      } catch {
        // fall through: treat as plain text
      }
    }
    return { type: 'INFO', user_text: input }
  }

  // If we got an array, join as multiline text.
  if (Array.isArray(input)) {
    const lines = input.map(v => (typeof v === 'string' ? v : String(v))).filter(Boolean)
    return { type: 'INFO', user_text: lines.join('\n') }
  }

  // Object-like: attempt to read `{ type, user_text }`.
  if (input && typeof input === 'object') {
    const maybe = input as { type?: unknown; user_text?: unknown }
    const type: AnalysisType = isAnalysisType(maybe.type) ? maybe.type : 'INFO'
    const rawUserText = maybe.user_text

    // If user_text itself is JSON-ish, parse it (this fixes the “raw JSON displayed” symptom).
    if (typeof rawUserText === 'string' && looksLikeJson(rawUserText)) {
      try {
        const nested = normalizeExpenseInsightsResponse(JSON.parse(rawUserText))
        // Prefer nested type if present (prevents “Analysis Complete” + WARNING blob mismatch)
        return { type: nested.type ?? type, user_text: nested.user_text }
      } catch {
        // ignore
      }
    }

    if (Array.isArray(rawUserText)) {
      const lines = rawUserText.map(v => (typeof v === 'string' ? v : String(v))).filter(Boolean)
      return { type, user_text: lines.join('\n') }
    }

    if (typeof rawUserText === 'string') {
      return { type, user_text: rawUserText }
    }

    if (rawUserText == null) {
      return { type, user_text: '' }
    }

    // Last resort: stringify unknown shapes rather than crashing the UI.
    return { type, user_text: String(rawUserText) }
  }

  // Unknown primitive (number/boolean/etc.)
  return { type: 'INFO', user_text: String(input ?? '') }
}

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

  return normalizeExpenseInsightsResponse(data)
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
