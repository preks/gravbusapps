import { useState, useCallback, useRef } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

const FEEDBACK_ANALYZER_EXPERT_ID = '699efff5ddbf12c3953b6686'

export interface SentimentDistribution {
  positive: number
  neutral: number
  negative: number
}

export interface FeedbackTheme {
  name: string
  sentiment: 'positive' | 'neutral' | 'negative'
  frequency: number
  evidence: string[]
}

export interface FeedbackAnalysisResult {
  employee_name: string
  period: string
  feedback_direction: 'received' | 'given' | 'both'
  total_entries: number
  sentiment: {
    overall_score: number
    label: string
    trend: string
    distribution: SentimentDistribution
  }
  themes: FeedbackTheme[]
  strengths: string[]
  growth_areas: string[]
  highlights: {
    most_positive: string
    most_constructive: string
  }
  recommendations: string[]
  summary: string
}

interface FeedbackEntry {
  content: string
  date: string
  rawDate?: string
  rating?: number
  feedbackPublic?: boolean | null
  type?: string
}

function parseAnalysisResponse(content: unknown): FeedbackAnalysisResult {
  if (typeof content !== 'string') {
    return content as FeedbackAnalysisResult
  }

  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed) as FeedbackAnalysisResult
  } catch {
    const fenced = extractFencedJson(trimmed)
    if (fenced) {
      return JSON.parse(fenced) as FeedbackAnalysisResult
    }
    throw new Error('Invalid analysis response format')
  }
}

/** Extract content between ``` or ```json and closing ``` without regex backtracking (S5852). */
function extractFencedJson(text: string): string | null {
  const open = '```'
  const openJson = '```json'
  const idxJson = text.indexOf(openJson)
  const idxPlain = text.indexOf(open)
  let startIdx: number
  if (idxJson >= 0 && (idxPlain < 0 || idxJson <= idxPlain)) {
    startIdx = idxJson + openJson.length
  } else if (idxPlain >= 0) {
    startIdx = idxPlain + open.length
  } else {
    startIdx = -1
  }
  if (startIdx < 0) return null
  const afterOpen = text.slice(startIdx).trimStart()
  const closeIdx = afterOpen.indexOf(open)
  if (closeIdx < 0) return null
  return afterOpen.slice(0, closeIdx).trim()
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Failed to analyze feedback'
}

function formatFeedbackForAnalyzer(entries: FeedbackEntry[]): string {
  return entries
    .map((entry, i) => {
      const parts: string[] = []
      if (entry.rating != null) parts.push(`Rating: ${entry.rating}/5`)
      if (entry.type) parts.push(`Type: ${entry.type}`)
      const dateStr = entry.rawDate ?? entry.date
      if (dateStr) {
        const parsed = new Date(dateStr)
        parts.push(`Date: ${isNaN(parsed.getTime()) ? dateStr : parsed.toISOString().split('T')[0]}`)
      }
      if (entry.feedbackPublic === false) parts.push('Private')
      const suffix = parts.length > 0 ? ` (${parts.join(', ')})` : ''
      return `${i + 1}. "${entry.content}"${suffix}`
    })
    .join('\n')
}

interface UseFeedbackAnalysisProps {
  accessToken: string
}

function detectPeriod(entries: FeedbackEntry[]): string {
  const dates = entries
    .map(e => new Date(e.rawDate ?? e.date))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
  if (dates.length === 0) return 'Unknown period'
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`
}

export interface AnalyzeInput {
  employeeName: string
  received?: FeedbackEntry[]
  given?: FeedbackEntry[]
  period?: string
}

export interface FeedbackAnalysisResults {
  received: FeedbackAnalysisResult | null
  given: FeedbackAnalysisResult | null
}

export const useFeedbackAnalysis = ({ accessToken }: UseFeedbackAnalysisProps) => {
  const [results, setResults] = useState<FeedbackAnalysisResults>({ received: null, given: null })
  const [pendingAnalyzes, setPendingAnalyzes] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const client = usePromptManagerClient(accessToken)
  const abortRef = useRef(false)
  const cancelEpochRef = useRef<{ received: number; given: number }>({ received: 0, given: 0 })
  const isAnalyzing = pendingAnalyzes > 0

  const analyzeStream = async (
    employeeName: string,
    entries: FeedbackEntry[],
    direction: 'received' | 'given',
    period: string
  ): Promise<FeedbackAnalysisResult | null> => {
    const feedbackData = formatFeedbackForAnalyzer(entries)
    const response = await client.executePromptWithOptions(FEEDBACK_ANALYZER_EXPERT_ID, {
      userParams: {
        employee_name: employeeName,
        period,
        analysis_type: 'comprehensive',
        feedback_direction: direction,
        feedback_data: feedbackData
      }
    })
    return parseAnalysisResponse(response.content)
  }

  const analyze = useCallback(
    async ({ employeeName, received = [], given = [], period }: AnalyzeInput) => {
      if (received.length === 0 && given.length === 0) {
        setError('No feedback entries to analyze')
        return null
      }

      abortRef.current = false
      setPendingAnalyzes(count => count + 1)
      setError(null)

      try {
        const allEntries = [...received, ...given]
        const detectedPeriod = period ?? detectPeriod(allEntries)
        const requestedDirections: Array<'received' | 'given'> = []
        if (received.length > 0) requestedDirections.push('received')
        if (given.length > 0) requestedDirections.push('given')
        const startEpoch = {
          received: cancelEpochRef.current.received,
          given: cancelEpochRef.current.given
        }

        const analysisTasks: Array<
          Promise<{ direction: 'received' | 'given'; result: FeedbackAnalysisResult | null }>
        > = []
        if (received.length > 0) {
          analysisTasks.push(
            analyzeStream(employeeName, received, 'received', detectedPeriod).then(result => ({
              direction: 'received',
              result
            }))
          )
        }
        if (given.length > 0) {
          analysisTasks.push(
            analyzeStream(employeeName, given, 'given', detectedPeriod).then(result => ({
              direction: 'given',
              result
            }))
          )
        }

        const settled = await Promise.allSettled(analysisTasks)
        const partial: FeedbackAnalysisResults = { received: null, given: null }
        const taskErrors: string[] = []

        settled.forEach(task => {
          if (task.status === 'fulfilled') {
            partial[task.value.direction] = task.value.result
            return
          }
          taskErrors.push(toErrorMessage(task.reason))
        })

        if (abortRef.current) return null
        requestedDirections.forEach(direction => {
          if (startEpoch[direction] !== cancelEpochRef.current[direction]) {
            partial[direction] = null
          }
        })
        if (!partial.received && !partial.given) {
          setError(taskErrors[0] ?? 'Failed to analyze feedback')
          return null
        }
        setResults(prev => ({
          received: partial.received ?? prev.received,
          given: partial.given ?? prev.given
        }))
        if (taskErrors.length > 0) {
          console.warn('Partial feedback analysis failure:', taskErrors)
        }
        return partial
      } catch (err: unknown) {
        if (!abortRef.current) {
          const message = toErrorMessage(err)
          setError(message)
          console.error('Feedback analysis error:', err)
        }
        return null
      } finally {
        if (!abortRef.current) {
          setPendingAnalyzes(count => Math.max(0, count - 1))
        }
      }
    },
    [client]
  )

  const clear = useCallback(() => {
    abortRef.current = true
    setResults({ received: null, given: null })
    setError(null)
    setPendingAnalyzes(0)
  }, [])

  const cancelAnalyzingForDirection = useCallback((direction: 'received' | 'given') => {
    // Invalidate in-flight results only for this direction.
    cancelEpochRef.current[direction] += 1
    setError(null)
  }, [])

  return { results, isAnalyzing, error, analyze, clear, cancelAnalyzingForDirection }
}
