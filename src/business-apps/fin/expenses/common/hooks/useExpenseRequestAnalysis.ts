/**
 * Hook for fetching AI analysis of expense requests
 *
 * This hook fetches AI-generated analysis for an expense request.
 * The analysis includes warnings or informational messages about
 * potential issues with the expense request.
 *
 * API Documentation: /flowbot/docs#/API%20for%20Expenses/get_expense_insights_flowbot_api_expense_expense_insights_post
 */

import { useState, useEffect, useCallback } from 'react'

import { flowbotClient } from '@/common/network/flowbot/FlowbotClient'

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

const isAnalysisType = (value: unknown): value is AnalysisType => value === 'WARNING' || value === 'INFO'

const looksLikeJson = (value: string): boolean => {
  const trimmed = value.trim()
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))
}

/**
 * Convert array of values to newline-separated string
 */
const arrayToMultilineText = (input: unknown[]): string => {
  return input
    .map(v => (typeof v === 'string' ? v : String(v)))
    .filter(Boolean)
    .join('\n')
}

/**
 * Try to parse JSON string and normalize recursively
 */
const tryParseJsonString = (input: string): ExpenseRequestAnalysis | null => {
  if (!looksLikeJson(input)) return null

  try {
    return normalizeExpenseInsightsResponse(JSON.parse(input))
  } catch {
    return null
  }
}

/**
 * Normalize string input to analysis response
 */
const normalizeStringInput = (input: string): ExpenseRequestAnalysis => {
  const parsed = tryParseJsonString(input)
  return parsed ?? { type: 'INFO', user_text: input }
}

/**
 * Normalize array input to analysis response
 */
const normalizeArrayInput = (input: unknown[]): ExpenseRequestAnalysis => {
  return { type: 'INFO', user_text: arrayToMultilineText(input) }
}

/**
 * Extract and normalize user_text from object response
 */
const normalizeUserText = (rawUserText: unknown, parentType: AnalysisType): ExpenseRequestAnalysis => {
  // Try parsing nested JSON string
  if (typeof rawUserText === 'string') {
    const parsed = tryParseJsonString(rawUserText)
    if (parsed) {
      return { type: parsed.type ?? parentType, user_text: parsed.user_text }
    }
    return { type: parentType, user_text: rawUserText }
  }

  // Handle array
  if (Array.isArray(rawUserText)) {
    return { type: parentType, user_text: arrayToMultilineText(rawUserText) }
  }

  // Handle null/undefined
  if (rawUserText == null) {
    return { type: parentType, user_text: '' }
  }

  // Fallback: stringify unknown types
  return { type: parentType, user_text: String(rawUserText) }
}

/**
 * Normalize object input to analysis response
 */
const normalizeObjectInput = (input: object): ExpenseRequestAnalysis => {
  const maybe = input as { type?: unknown; user_text?: unknown }
  const type: AnalysisType = isAnalysisType(maybe.type) ? maybe.type : 'INFO'
  return normalizeUserText(maybe.user_text, type)
}

/**
 * Some environments occasionally return a double-encoded payload where `user_text`
 * is a JSON string that itself contains `{ type, user_text }` (or an array of strings).
 * We normalize aggressively so the UI never renders raw JSON blobs.
 */
const normalizeExpenseInsightsResponse = (input: unknown): ExpenseRequestAnalysis => {
  if (typeof input === 'string') return normalizeStringInput(input)
  if (Array.isArray(input)) return normalizeArrayInput(input)
  if (input && typeof input === 'object') return normalizeObjectInput(input)

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
  flowbotClient.setAccessToken(accessToken)
  const data = (await flowbotClient.getExpenseInsights(expenseRequestId)) as ApiResponse

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
