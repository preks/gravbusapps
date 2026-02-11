import { useState, useCallback } from 'react'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

export interface AIInsight {
  id: string
  text: string
  timestamp: Date
}

interface UseAIInsightsProps {
  accessToken: string
  managerId?: string
}

interface UseAIInsightsResult {
  insight: string | null
  isLoading: boolean
  error: string | null
  fetchInsight: () => Promise<void>
  refetch: () => Promise<void>
}

/**
 * Hook to fetch AI insights for the manager's team using FlowBot API
 * Provides real-time insights about sick leaves, availability, and events
 */
export const useAIInsights = ({ accessToken, managerId }: UseAIInsightsProps): UseAIInsightsResult => {
  const [insight, setInsight] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInsight = useCallback(async () => {
    if (!accessToken || !managerId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create FormData for the flowbot API
      const form = new FormData()
      form.append('session_id', '') // New session
      form.append(
        'user_input_text',
        'Give me a brief summary of my team status today. Focus on: who is on sick leave, team availability, and any upcoming important events like birthdays or anniversaries. Keep it concise and actionable.'
      )
      form.append('llm_model', 'gpt-4.1')
      form.append('use_web_search_tool', 'false')

      // Add page context for manager dashboard
      const pageContext = {
        type: 'overview',
        url: window.location.href,
        entity_name: 'employee'
      }
      form.append('current_page_context', JSON.stringify(pageContext))

      const baseUrl = resolveFlowbotBaseUrl()
      const response = await fetch(`${baseUrl}/flowbot/api/agent/v2/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/event-stream'
        },
        body: form
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body received')
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
              } catch (parseError) {
                console.warn('Failed to parse output item:', parseError)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      setInsight(accumulatedResponse || null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch AI insights'
      setError(errorMessage)
      console.error('Error fetching AI insights:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, managerId])

  return {
    insight,
    isLoading,
    error,
    fetchInsight,
    refetch: fetchInsight
  }
}
