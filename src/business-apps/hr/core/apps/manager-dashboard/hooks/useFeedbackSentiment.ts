/**
 * useFeedbackSentiment Hook
 * Analyzes employee feedback using FlowBot AI to determine sentiment scores
 */

import { useState, useCallback, useRef } from 'react'
import { RawFeedback } from '../types/flightRisk.types'

/**
 * Sentiment analysis result for a single employee
 */
export interface EmployeeSentimentResult {
  employeeId: string
  score: number // 0-100 (0=very positive, 50=neutral, 100=very negative)
  summary: string
  analyzedCount: number
  isAIAnalyzed: boolean
}

/**
 * Hook props
 */
interface UseFeedbackSentimentProps {
  accessToken: string
}

/**
 * Hook result
 */
interface UseFeedbackSentimentResult {
  sentimentResults: Map<string, EmployeeSentimentResult>
  isAnalyzing: boolean
  error: string | null
  analyzeFeedback: (employeeId: string, feedback: RawFeedback[]) => Promise<EmployeeSentimentResult | null>
  analyzeBatch: (feedbackByEmployee: Map<string, RawFeedback[]>) => Promise<Map<string, EmployeeSentimentResult>>
  clearResults: () => void
}

/**
 * Build the prompt for sentiment analysis
 */
const buildSentimentPrompt = (feedback: RawFeedback[]): string => {
  // Get last 6 months of feedback
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const recentFeedback = feedback.filter(f => new Date(f.feedbackDate) >= sixMonthsAgo).slice(0, 10) // Limit to 10 most recent to avoid token limits

  if (recentFeedback.length === 0) {
    return ''
  }

  const feedbackText = recentFeedback
    .map((f, i) => `${i + 1}. "${f.feedback}"${f.rating ? ` (Rating: ${f.rating}/5)` : ''}`)
    .join('\n')

  return `You are a sentiment analysis system that ONLY outputs JSON.

Task: Analyze employee feedback sentiment and return a JSON object.

Example input:
"Great work on the project!" (Rating: 5/5)
"Needs improvement on communication"

Example output (COPY THIS FORMAT EXACTLY):
{"score": 30, "summary": "Mixed feedback with both praise and areas for improvement."}

Now analyze this feedback:
${feedbackText}

OUTPUT FORMAT: Copy the example format exactly. Replace only the score (0-100) and summary text.
- 0-20 = Very positive
- 21-40 = Positive  
- 41-60 = Neutral
- 61-80 = Negative
- 81-100 = Very negative

YOUR RESPONSE (JSON only, no other text):`
}

/**
 * Parse the AI response to extract sentiment data
 */
const parseSentimentResponse = (
  response: string,
  employeeId: string,
  feedbackCount: number
): EmployeeSentimentResult | null => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('Sentiment analysis: No JSON found in response')
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (typeof parsed.score !== 'number' || typeof parsed.summary !== 'string') {
      console.warn('Sentiment analysis: Invalid response structure')
      return null
    }

    return {
      employeeId,
      score: Math.min(100, Math.max(0, parsed.score)),
      summary: parsed.summary.slice(0, 150),
      analyzedCount: feedbackCount,
      isAIAnalyzed: true
    }
  } catch (err) {
    console.error('Failed to parse sentiment response:', err)
    return null
  }
}

/**
 * Hook to analyze feedback sentiment using FlowBot AI
 */
export const useFeedbackSentiment = ({ accessToken }: UseFeedbackSentimentProps): UseFeedbackSentimentResult => {
  const [sentimentResults, setSentimentResults] = useState<Map<string, EmployeeSentimentResult>>(new Map())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cache to avoid re-analyzing the same feedback
  const cacheRef = useRef<Map<string, EmployeeSentimentResult>>(new Map())

  /**
   * Analyze feedback for a single employee
   */
  const analyzeFeedback = useCallback(
    async (employeeId: string, feedback: RawFeedback[]): Promise<EmployeeSentimentResult | null> => {
      // Check cache first
      const cacheKey = `${employeeId}-${feedback.length}`
      const cached = cacheRef.current.get(cacheKey)
      if (cached) {
        return cached
      }

      const prompt = buildSentimentPrompt(feedback)

      // If no feedback to analyze, return neutral score
      if (!prompt) {
        const result: EmployeeSentimentResult = {
          employeeId,
          score: 50, // Neutral
          summary: 'No recent feedback to analyze',
          analyzedCount: 0,
          isAIAnalyzed: false
        }
        cacheRef.current.set(cacheKey, result)
        return result
      }

      try {
        const form = new FormData()
        form.append('session_id', '')
        form.append('user_input_text', prompt)
        form.append('llm_model', 'gpt-4.1')
        form.append('use_web_search_tool', 'false')

        // Use proper page context format (similar to useFlowBot.ts)
        const pageContext = {
          type: 'overview' as const,
          entity_name: 'employee_feedback',
          url: window.location.href
        }
        form.append('current_page_context', JSON.stringify(pageContext))

        // Use full URL path like in useFlowBot
        const baseUrl = window.location.origin
        const response = await fetch(`${baseUrl}/flowbot/api/agent/v2/chat`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'text/event-stream'
          },
          body: form
        })

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
        let accumulatedResponse = ''
        let frames = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            frames += value
            const frameList = frames.split('\n\n')
            frames = frameList.pop() || ''

            for (const frame of frameList) {
              const lines = frame.split('\n')
              let eventType = ''
              let data = ''

              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  eventType = line.slice(7)
                } else if (line.startsWith('data: ')) {
                  data = line.slice(6)
                }
              }

              if (eventType === 'output-item' && data) {
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.type === 'answer' && parsed.displayData) {
                    for (const displayItem of parsed.displayData) {
                      if (displayItem.type === 'textBlock' && displayItem.text) {
                        accumulatedResponse += displayItem.text
                      }
                    }
                  }
                } catch {
                  // Ignore parse errors for individual frames
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }

        const result = parseSentimentResponse(
          accumulatedResponse,
          employeeId,
          feedback.filter(f => new Date(f.feedbackDate) >= new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)).length
        )

        if (result) {
          cacheRef.current.set(cacheKey, result)
          setSentimentResults(prev => new Map(prev).set(employeeId, result))
        }

        return result
      } catch (err) {
        console.error(`Failed to analyze sentiment for ${employeeId}:`, err)
        return null
      }
    },
    [accessToken]
  )

  /**
   * Analyze feedback for multiple employees in batches
   */
  const analyzeBatch = useCallback(
    async (feedbackByEmployee: Map<string, RawFeedback[]>): Promise<Map<string, EmployeeSentimentResult>> => {
      setIsAnalyzing(true)
      setError(null)

      const results = new Map<string, EmployeeSentimentResult>()
      const entries = Array.from(feedbackByEmployee.entries())

      // Process in batches of 3 to avoid rate limiting
      const batchSize = 3
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize)

        try {
          const batchResults = await Promise.all(
            batch.map(([employeeId, feedback]) => analyzeFeedback(employeeId, feedback))
          )

          batchResults.forEach(result => {
            if (result) {
              results.set(result.employeeId, result)
            }
          })

          // Small delay between batches to avoid rate limiting
          if (i + batchSize < entries.length) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } catch (err) {
          console.error('Batch analysis error:', err)
          setError('Some sentiment analyses failed')
        }
      }

      setSentimentResults(results)
      setIsAnalyzing(false)

      return results
    },
    [analyzeFeedback]
  )

  /**
   * Clear all cached results
   */
  const clearResults = useCallback(() => {
    setSentimentResults(new Map())
    cacheRef.current.clear()
  }, [])

  return {
    sentimentResults,
    isAnalyzing,
    error,
    analyzeFeedback,
    analyzeBatch,
    clearResults
  }
}

export default useFeedbackSentiment
