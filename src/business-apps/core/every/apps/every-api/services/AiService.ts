/**
 * AI Service
 *
 * Provides API calls for AI-powered features in EveryBox:
 * - Semantic search
 * - Task summaries
 * - Suggested actions
 * - AI capabilities
 */

import { getEveryboxServiceApiUrl } from '../utils/everyboxServiceUrl'
import type { TaskSource, SuggestedAction } from '../types/UnifiedTask'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AiCapabilities {
  aiEnabled: boolean
  semanticSearchAvailable: boolean
  summariesAvailable: boolean
  suggestionsAvailable: boolean
  autoPriorityAvailable: boolean
  clusteringAvailable: boolean
}

export interface AiCapabilitiesResponse {
  status: 'success' | 'error'
  aiEnabled: boolean
  semanticSearchAvailable: boolean
  summariesAvailable: boolean
  suggestionsAvailable: boolean
  autoPriorityAvailable: boolean
  clusteringAvailable: boolean
}

export interface TaskSearchResult {
  source: TaskSource
  taskId: string
  title: string | null
  description: string | null
  similarity?: number
}

export interface AiSearchResponse {
  status: 'success' | 'error'
  mode: 'semantic' | 'lexical'
  results: TaskSearchResult[]
}

export interface TaskSummaryResponse {
  status: 'success' | 'error'
  cached: boolean
  summaryShort: string | null
  summaryLong: string | null
  model?: string | null
  promptVersion?: string | null
  computedAt?: string | null
  expiresAt?: string | null
}

export interface TaskSuggestionsResponse {
  status: 'success' | 'error'
  cached: boolean
  suggestedActions: SuggestedAction[] | null
  model?: string | null
  promptVersion?: string | null
  computedAt?: string | null
  expiresAt?: string | null
}

// AI Assistant types
export type ToneOption = 'formal' | 'casual' | 'friendly' | 'professional' | 'concise'
export type AiAction = 'suggested' | 'improved' | 'tone' | 'expanded' | 'shortened' | 'custom'
export type DecisionType = 'approve' | 'reject' | 'delegate' | 'defer' | 'custom'
export type FeedbackType =
  | 'prediction_correct'
  | 'prediction_incorrect'
  | 'suggestion_used'
  | 'suggestion_edited'
  | 'suggestion_rejected'
  | 'tone_feedback'
  | 'priority_feedback'

export interface AiAssistantResponse {
  result: string
  aiAction: AiAction
  cached: boolean
}

// Prediction types
export interface ActionPrediction {
  action: DecisionType
  confidence: number
  reasoning: string
}

export interface ResponsePrediction {
  suggestedTone: string
  suggestedLength: 'short' | 'medium' | 'long'
  keyPoints: string[]
  confidence: number
}

export interface PriorityPrediction {
  priority: 'high' | 'medium' | 'low'
  confidence: number
  reasoning: string
}

export interface RelationshipInsight {
  tone: string
  formality: 'high' | 'medium' | 'low'
  rapport: 'strong' | 'moderate' | 'new'
  suggestedApproach: string
  commonTopics?: string[]
}

export interface TaskPrediction {
  taskId: string
  source: TaskSource
  actionPrediction: ActionPrediction | null
  responsePrediction: ResponsePrediction | null
  priorityPrediction: PriorityPrediction | null
  relationshipContext: RelationshipInsight | null
  overallConfidence: number
  reasoning: string[]
  computedAt: string
}

export interface FeedbackStats {
  totalFeedback: number
  helpfulCount: number
  predictionAccuracy: number
  suggestionUsageRate: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

async function aiRequest<T>(
  path: string,
  accessToken: string | undefined,
  options?: {
    method?: 'GET' | 'POST'
    body?: Record<string, unknown>
    params?: Record<string, string | number | boolean | undefined>
  }
): Promise<T> {
  const baseUrl = getEveryboxServiceApiUrl()
  const url = new URL(`${baseUrl}${path}`)

  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      if (v === undefined || v === null) return
      url.searchParams.set(k, String(v))
    })
  }

  const response = await fetch(url.toString(), {
    method: options?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {})
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`AI API HTTP ${response.status}: ${text || response.statusText}`)
  }

  return (await response.json()) as T
}

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch AI capabilities from the backend.
 * Returns what AI features are available and enabled.
 */
export async function fetchAiCapabilities(accessToken?: string): Promise<AiCapabilities> {
  try {
    const response = await aiRequest<AiCapabilitiesResponse>('/ai/capabilities', accessToken)
    return {
      aiEnabled: response.aiEnabled,
      semanticSearchAvailable: response.semanticSearchAvailable,
      summariesAvailable: response.summariesAvailable,
      suggestionsAvailable: response.suggestionsAvailable,
      autoPriorityAvailable: response.autoPriorityAvailable,
      clusteringAvailable: response.clusteringAvailable
    }
  } catch (error) {
    // If the endpoint is unavailable, return all capabilities as disabled
    console.warn('[AiService] Failed to fetch AI capabilities:', error)
    return {
      aiEnabled: false,
      semanticSearchAvailable: false,
      summariesAvailable: false,
      suggestionsAvailable: false,
      autoPriorityAvailable: false,
      clusteringAvailable: false
    }
  }
}

/**
 * Search tasks using AI-powered semantic search.
 * Falls back to lexical search if semantic search is unavailable.
 */
export async function searchTasks(
  query: string,
  accessToken?: string,
  options?: { limit?: number }
): Promise<AiSearchResponse> {
  return aiRequest<AiSearchResponse>('/ai/tasks/search', accessToken, {
    params: {
      q: query,
      limit: options?.limit
    }
  })
}

/**
 * Get AI-generated summary for a task.
 */
export async function fetchTaskSummary(
  taskId: string,
  source: TaskSource,
  accessToken?: string,
  options?: { forceRefresh?: boolean }
): Promise<TaskSummaryResponse> {
  return aiRequest<TaskSummaryResponse>(`/ai/tasks/${taskId}/summary`, accessToken, {
    method: 'POST',
    body: {
      source,
      forceRefresh: options?.forceRefresh ?? false
    }
  })
}

/**
 * Get AI-generated suggested actions for a task.
 */
export async function fetchTaskSuggestions(
  taskId: string,
  source: TaskSource,
  accessToken?: string,
  options?: { forceRefresh?: boolean }
): Promise<TaskSuggestionsResponse> {
  return aiRequest<TaskSuggestionsResponse>(`/ai/tasks/${taskId}/suggestions`, accessToken, {
    method: 'POST',
    body: {
      source,
      forceRefresh: options?.forceRefresh ?? false
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Assistant Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get AI-suggested reply for a task.
 */
export async function suggestReply(
  taskId: string,
  source: TaskSource,
  accessToken?: string,
  recipientId?: string
): Promise<AiAssistantResponse> {
  return aiRequest<AiAssistantResponse>('/ai/assistant/suggest', accessToken, {
    method: 'POST',
    body: { taskId, source, recipientId }
  })
}

/**
 * Improve a draft reply.
 */
export async function improveDraft(
  taskId: string,
  source: TaskSource,
  draft: string,
  accessToken?: string
): Promise<AiAssistantResponse> {
  return aiRequest<AiAssistantResponse>('/ai/assistant/improve', accessToken, {
    method: 'POST',
    body: { taskId, source, draft }
  })
}

/**
 * Adjust the tone of text.
 */
export async function adjustTone(
  taskId: string,
  source: TaskSource,
  text: string,
  tone: ToneOption,
  accessToken?: string
): Promise<AiAssistantResponse> {
  return aiRequest<AiAssistantResponse>('/ai/assistant/tone', accessToken, {
    method: 'POST',
    body: { taskId, source, text, tone }
  })
}

/**
 * Expand text with more detail.
 */
export async function expandText(
  taskId: string,
  source: TaskSource,
  text: string,
  accessToken?: string
): Promise<AiAssistantResponse> {
  return aiRequest<AiAssistantResponse>('/ai/assistant/expand', accessToken, {
    method: 'POST',
    body: { taskId, source, text }
  })
}

/**
 * Shorten text while keeping key points.
 */
export async function shortenText(
  taskId: string,
  source: TaskSource,
  text: string,
  accessToken?: string
): Promise<AiAssistantResponse> {
  return aiRequest<AiAssistantResponse>('/ai/assistant/shorten', accessToken, {
    method: 'POST',
    body: { taskId, source, text }
  })
}

/**
 * Apply custom instruction to text.
 */
export async function customInstruction(
  taskId: string,
  source: TaskSource,
  instruction: string,
  text?: string,
  accessToken?: string
): Promise<AiAssistantResponse> {
  return aiRequest<AiAssistantResponse>('/ai/assistant/custom', accessToken, {
    method: 'POST',
    body: { taskId, source, text, instruction }
  })
}

/**
 * Store a communication for AI learning.
 */
export async function storeCommunication(
  params: {
    taskId: string
    source: TaskSource
    messageType: 'completion' | 'rejection' | 'reply' | 'comment'
    content: string
    recipientId?: string
    aiAssisted?: boolean
    aiAction?: AiAction
  },
  accessToken?: string
): Promise<{ success: boolean }> {
  return aiRequest<{ success: boolean }>('/ai/assistant/store-communication', accessToken, {
    method: 'POST',
    body: params
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Prediction Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get AI prediction for a task (action, priority, response style).
 */
export async function fetchTaskPrediction(
  taskId: string,
  source: TaskSource,
  accessToken?: string,
  options?: {
    title?: string
    description?: string
    contactId?: string
    teamId?: string
  }
): Promise<TaskPrediction> {
  return aiRequest<TaskPrediction>(`/ai/predict/${taskId}`, accessToken, {
    params: {
      source,
      title: options?.title,
      description: options?.description,
      contactId: options?.contactId,
      teamId: options?.teamId
    }
  })
}

/**
 * Get quick prediction summary (cached only, for list views).
 */
export async function fetchQuickPrediction(
  taskId: string,
  source: TaskSource,
  accessToken?: string
): Promise<{ action: DecisionType | null; confidence: number; cached: boolean }> {
  return aiRequest<{ action: DecisionType | null; confidence: number; cached: boolean }>(
    `/ai/predict/${taskId}/quick`,
    accessToken,
    { params: { source } }
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Feedback Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record feedback on an AI prediction or suggestion.
 */
export async function recordFeedback(
  params: {
    taskId: string
    source: TaskSource
    feedbackType: FeedbackType
    predictedValue?: string
    actualValue?: string
    wasHelpful?: boolean
    feedbackData?: {
      actualAction?: DecisionType
      actualTone?: string
      actualPriority?: string
      editedContent?: string
      userComment?: string
    }
  },
  accessToken?: string
): Promise<{ id: string }> {
  return aiRequest<{ id: string }>('/ai/feedback', accessToken, {
    method: 'POST',
    body: params
  })
}

/**
 * Record a user decision (approve/reject/delegate) as implicit feedback.
 */
export async function recordDecision(
  params: {
    taskId: string
    source: TaskSource
    title: string
    description?: string
    decisionType: DecisionType
    contactId?: string
    teamId?: string
    responseContent?: string
  },
  accessToken?: string
): Promise<{ success: boolean }> {
  return aiRequest<{ success: boolean }>('/ai/feedback/decision', accessToken, {
    method: 'POST',
    body: params
  })
}

/**
 * Record a communication for learning.
 */
export async function recordCommunication(
  params: {
    taskId: string
    source: TaskSource
    recipientId?: string
    messageContent: string
    aiAssisted: boolean
    aiAction?: string
  },
  accessToken?: string
): Promise<{ success: boolean }> {
  return aiRequest<{ success: boolean }>('/ai/feedback/communication', accessToken, {
    method: 'POST',
    body: params
  })
}

/**
 * Get feedback statistics for the current user.
 */
export async function fetchFeedbackStats(accessToken?: string): Promise<FeedbackStats> {
  return aiRequest<FeedbackStats>('/ai/feedback/stats', accessToken)
}
