/**
 * AI Hooks for EveryBox
 *
 * Provides React hooks for AI-powered features:
 * - useAiCapabilities: Check what AI features are available
 * - useAiSearch: Semantic search with fallback to lexical
 * - useTaskSummary: AI-generated task summaries
 * - useTaskSuggestions: AI-generated suggested actions
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  fetchAiCapabilities,
  searchTasks,
  fetchTaskSummary,
  fetchTaskSuggestions,
  suggestReply,
  improveDraft,
  adjustTone,
  expandText,
  shortenText,
  customInstruction,
  storeCommunication,
  fetchTaskPrediction,
  fetchQuickPrediction,
  recordFeedback,
  recordDecision,
  recordCommunication,
  fetchFeedbackStats,
  AiCapabilities,
  TaskSearchResult,
  TaskSummaryResponse,
  TaskSuggestionsResponse,
  ToneOption,
  AiAction,
  TaskPrediction,
  DecisionType,
  FeedbackType,
  FeedbackStats
} from '@/business-apps/core/every/apps/every-api/services/AiService'
import type { TaskSource } from '@/business-apps/core/every/apps/every-api/types/UnifiedTask'

// ─────────────────────────────────────────────────────────────────────────────
// useAiCapabilities
// ─────────────────────────────────────────────────────────────────────────────

interface UseAiCapabilitiesResult {
  capabilities: AiCapabilities | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAiCapabilities(accessToken?: string): UseAiCapabilitiesResult {
  const [capabilities, setCapabilities] = useState<AiCapabilities | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)

  const fetchCapabilities = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchAiCapabilities(accessToken)
      setCapabilities(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch AI capabilities')
      setCapabilities({
        aiEnabled: false,
        semanticSearchAvailable: false,
        summariesAvailable: false,
        suggestionsAvailable: false,
        autoPriorityAvailable: false,
        clusteringAvailable: false
      })
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchCapabilities()
    }
  }, [fetchCapabilities])

  return {
    capabilities,
    isLoading,
    error,
    refetch: fetchCapabilities
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAiSearch
// ─────────────────────────────────────────────────────────────────────────────

interface UseAiSearchResult {
  results: TaskSearchResult[]
  searchMode: 'semantic' | 'lexical' | null
  isSearching: boolean
  error: string | null
  search: (query: string) => Promise<void>
  clearResults: () => void
}

export function useAiSearch(accessToken?: string, options?: { limit?: number }): UseAiSearchResult {
  const [results, setResults] = useState<TaskSearchResult[]>([])
  const [searchMode, setSearchMode] = useState<'semantic' | 'lexical' | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(
    async (query: string) => {
      const trimmed = query.trim()
      if (!trimmed) {
        setResults([])
        setSearchMode(null)
        return
      }

      setIsSearching(true)
      setError(null)

      try {
        const response = await searchTasks(trimmed, accessToken, { limit: options?.limit })
        setResults(response.results)
        setSearchMode(response.mode)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
        setSearchMode(null)
      } finally {
        setIsSearching(false)
      }
    },
    [accessToken, options?.limit]
  )

  const clearResults = useCallback(() => {
    setResults([])
    setSearchMode(null)
    setError(null)
  }, [])

  return {
    results,
    searchMode,
    isSearching,
    error,
    search,
    clearResults
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useTaskSummary
// ─────────────────────────────────────────────────────────────────────────────

interface UseTaskSummaryResult {
  summary: TaskSummaryResponse | null
  isLoading: boolean
  error: string | null
  fetchSummary: (forceRefresh?: boolean) => Promise<void>
}

export function useTaskSummary(
  taskId: string | undefined,
  source: TaskSource | undefined,
  accessToken?: string
): UseTaskSummaryResult {
  const [summary, setSummary] = useState<TaskSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummaryFn = useCallback(
    async (forceRefresh?: boolean) => {
      if (!taskId || !source) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchTaskSummary(taskId, source, accessToken, { forceRefresh })
        setSummary(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch summary')
        setSummary(null)
      } finally {
        setIsLoading(false)
      }
    },
    [taskId, source, accessToken]
  )

  // Reset when task changes
  useEffect(() => {
    setSummary(null)
    setError(null)
  }, [taskId, source])

  return {
    summary,
    isLoading,
    error,
    fetchSummary: fetchSummaryFn
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useTaskSuggestions
// ─────────────────────────────────────────────────────────────────────────────

interface UseTaskSuggestionsResult {
  suggestions: TaskSuggestionsResponse | null
  isLoading: boolean
  error: string | null
  fetchSuggestions: (forceRefresh?: boolean) => Promise<void>
}

export function useTaskSuggestions(
  taskId: string | undefined,
  source: TaskSource | undefined,
  accessToken?: string
): UseTaskSuggestionsResult {
  const [suggestions, setSuggestions] = useState<TaskSuggestionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSuggestionsFn = useCallback(
    async (forceRefresh?: boolean) => {
      if (!taskId || !source) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchTaskSuggestions(taskId, source, accessToken, { forceRefresh })
        setSuggestions(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch suggestions')
        setSuggestions(null)
      } finally {
        setIsLoading(false)
      }
    },
    [taskId, source, accessToken]
  )

  // Reset when task changes
  useEffect(() => {
    setSuggestions(null)
    setError(null)
  }, [taskId, source])

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions: fetchSuggestionsFn
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAiAssistant
// ─────────────────────────────────────────────────────────────────────────────

interface UseAiAssistantResult {
  suggestedReply: string | null
  isLoading: boolean
  error: string | null
  lastAction: AiAction | null

  // Actions
  getSuggestedReply: (recipientId?: string) => Promise<string | null>
  improve: (draft: string) => Promise<string | null>
  changeTone: (text: string, tone: ToneOption) => Promise<string | null>
  expand: (text: string) => Promise<string | null>
  shorten: (text: string) => Promise<string | null>
  applyCustom: (instruction: string, text?: string) => Promise<string | null>
  saveCommunication: (params: {
    messageType: 'completion' | 'rejection' | 'reply' | 'comment'
    content: string
    recipientId?: string
    aiAssisted?: boolean
    aiAction?: AiAction
  }) => Promise<void>
  clearSuggestion: () => void
}

export function useAiAssistant(
  taskId: string | undefined,
  source: TaskSource | undefined,
  accessToken?: string
): UseAiAssistantResult {
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<AiAction | null>(null)

  // Reset when task changes
  useEffect(() => {
    setSuggestedReply(null)
    setError(null)
    setLastAction(null)
  }, [taskId, source])

  const handleRequest = useCallback(
    async (action: AiAction, request: () => Promise<{ result: string }>): Promise<string | null> => {
      if (!taskId || !source) {
        setError('Task not selected')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await request()
        setSuggestedReply(response.result)
        setLastAction(action)
        return response.result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI request failed'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [taskId, source]
  )

  const getSuggestedReply = useCallback(
    (recipientId?: string) =>
      handleRequest('suggested', () => suggestReply(taskId!, source!, accessToken, recipientId)),
    [taskId, source, accessToken, handleRequest]
  )

  const improve = useCallback(
    (draft: string) => handleRequest('improved', () => improveDraft(taskId!, source!, draft, accessToken)),
    [taskId, source, accessToken, handleRequest]
  )

  const changeTone = useCallback(
    (text: string, tone: ToneOption) =>
      handleRequest('tone', () => adjustTone(taskId!, source!, text, tone, accessToken)),
    [taskId, source, accessToken, handleRequest]
  )

  const expand = useCallback(
    (text: string) => handleRequest('expanded', () => expandText(taskId!, source!, text, accessToken)),
    [taskId, source, accessToken, handleRequest]
  )

  const shorten = useCallback(
    (text: string) => handleRequest('shortened', () => shortenText(taskId!, source!, text, accessToken)),
    [taskId, source, accessToken, handleRequest]
  )

  const applyCustom = useCallback(
    (instruction: string, text?: string) =>
      handleRequest('custom', () => customInstruction(taskId!, source!, instruction, text, accessToken)),
    [taskId, source, accessToken, handleRequest]
  )

  const saveCommunication = useCallback(
    async (params: {
      messageType: 'completion' | 'rejection' | 'reply' | 'comment'
      content: string
      recipientId?: string
      aiAssisted?: boolean
      aiAction?: AiAction
    }) => {
      if (!taskId || !source) return

      try {
        await storeCommunication(
          {
            taskId,
            source,
            ...params
          },
          accessToken
        )
      } catch (err) {
        // Silent failure for analytics - don't interrupt user flow
        console.warn('[useAiAssistant] Failed to store communication:', err)
      }
    },
    [taskId, source, accessToken]
  )

  const clearSuggestion = useCallback(() => {
    setSuggestedReply(null)
    setError(null)
    setLastAction(null)
  }, [])

  return {
    suggestedReply,
    isLoading,
    error,
    lastAction,
    getSuggestedReply,
    improve,
    changeTone,
    expand,
    shorten,
    applyCustom,
    saveCommunication,
    clearSuggestion
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useTaskPrediction
// ─────────────────────────────────────────────────────────────────────────────

interface UseTaskPredictionResult {
  prediction: TaskPrediction | null
  isLoading: boolean
  error: string | null
  fetchPrediction: (options?: {
    title?: string
    description?: string
    contactId?: string
    teamId?: string
  }) => Promise<void>
}

export function useTaskPrediction(
  taskId: string | undefined,
  source: TaskSource | undefined,
  accessToken?: string
): UseTaskPredictionResult {
  const [prediction, setPrediction] = useState<TaskPrediction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPredictionFn = useCallback(
    async (options?: { title?: string; description?: string; contactId?: string; teamId?: string }) => {
      if (!taskId || !source) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchTaskPrediction(taskId, source, accessToken, options)
        setPrediction(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch prediction')
        setPrediction(null)
      } finally {
        setIsLoading(false)
      }
    },
    [taskId, source, accessToken]
  )

  // Reset when task changes
  useEffect(() => {
    setPrediction(null)
    setError(null)
  }, [taskId, source])

  return {
    prediction,
    isLoading,
    error,
    fetchPrediction: fetchPredictionFn
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useQuickPrediction
// ─────────────────────────────────────────────────────────────────────────────

interface UseQuickPredictionResult {
  action: DecisionType | null
  confidence: number
  cached: boolean
  isLoading: boolean
  error: string | null
  fetchQuick: () => Promise<void>
}

export function useQuickPrediction(
  taskId: string | undefined,
  source: TaskSource | undefined,
  accessToken?: string
): UseQuickPredictionResult {
  const [action, setAction] = useState<DecisionType | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [cached, setCached] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuick = useCallback(async () => {
    if (!taskId || !source) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchQuickPrediction(taskId, source, accessToken)
      setAction(response.action)
      setConfidence(response.confidence)
      setCached(response.cached)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prediction')
      setAction(null)
      setConfidence(0)
      setCached(false)
    } finally {
      setIsLoading(false)
    }
  }, [taskId, source, accessToken])

  // Reset when task changes
  useEffect(() => {
    setAction(null)
    setConfidence(0)
    setCached(false)
    setError(null)
  }, [taskId, source])

  return {
    action,
    confidence,
    cached,
    isLoading,
    error,
    fetchQuick
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAiFeedback
// ─────────────────────────────────────────────────────────────────────────────

interface UseAiFeedbackResult {
  stats: FeedbackStats | null
  isLoading: boolean
  error: string | null

  // Actions
  submitFeedback: (params: {
    taskId: string
    source: TaskSource
    feedbackType: FeedbackType
    predictedValue?: string
    actualValue?: string
    wasHelpful?: boolean
  }) => Promise<void>

  submitDecision: (params: {
    taskId: string
    source: TaskSource
    title: string
    description?: string
    decisionType: DecisionType
    contactId?: string
    teamId?: string
    responseContent?: string
  }) => Promise<void>

  submitCommunication: (params: {
    taskId: string
    source: TaskSource
    recipientId?: string
    messageContent: string
    aiAssisted: boolean
    aiAction?: string
  }) => Promise<void>

  fetchStats: () => Promise<void>
}

export function useAiFeedback(accessToken?: string): UseAiFeedbackResult {
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitFeedback = useCallback(
    async (params: {
      taskId: string
      source: TaskSource
      feedbackType: FeedbackType
      predictedValue?: string
      actualValue?: string
      wasHelpful?: boolean
    }) => {
      try {
        await recordFeedback(params, accessToken)
      } catch (err) {
        console.warn('[useAiFeedback] Failed to submit feedback:', err)
      }
    },
    [accessToken]
  )

  const submitDecision = useCallback(
    async (params: {
      taskId: string
      source: TaskSource
      title: string
      description?: string
      decisionType: DecisionType
      contactId?: string
      teamId?: string
      responseContent?: string
    }) => {
      try {
        await recordDecision(params, accessToken)
      } catch (err) {
        console.warn('[useAiFeedback] Failed to submit decision:', err)
      }
    },
    [accessToken]
  )

  const submitCommunication = useCallback(
    async (params: {
      taskId: string
      source: TaskSource
      recipientId?: string
      messageContent: string
      aiAssisted: boolean
      aiAction?: string
    }) => {
      try {
        await recordCommunication(params, accessToken)
      } catch (err) {
        console.warn('[useAiFeedback] Failed to submit communication:', err)
      }
    },
    [accessToken]
  )

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchFeedbackStats(accessToken)
      setStats(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  return {
    stats,
    isLoading,
    error,
    submitFeedback,
    submitDecision,
    submitCommunication,
    fetchStats
  }
}
