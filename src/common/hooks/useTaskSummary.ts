import { useState, useCallback } from 'react'
import axios from 'axios'
import { env } from '@/common/env/EnvUtils'

interface TaskSummaryOptions {
  accessToken: string
  taskType: string
  taskData: Record<string, any>
}

/**
 * Hook to generate AI-powered task summaries using FlowBot's Text Generation API
 */
export const useTaskSummary = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSummary = useCallback(
    async ({ accessToken, taskType, taskData }: TaskSummaryOptions): Promise<string | null> => {
      setIsGenerating(true)
      setError(null)

      try {
        // Get base URL from environment
        let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
        baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

        const endpoint = `${baseUrl}/flowbot/api/text-generation/generate`

        // Build structured text to summarize
        const taskDescription = formatTaskForAI(taskType, taskData)

        // Call FlowBot summarize API
        const response = await axios.post(
          endpoint,
          {
            texts: [taskDescription],
            action: 'summarize' // Use the SUMMARIZE action
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (response.data?.generated_texts?.[0]) {
          return response.data.generated_texts[0]
        }

        return null
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate summary')
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  return { generateSummary, isGenerating, error }
}

/**
 * Helper to format task data for AI consumption
 */
const formatTaskForAI = (taskType: string, taskData: Record<string, any>): string => {
  const lines: string[] = [`Task Type: ${taskType}`, '']

  // Add all relevant task data
  Object.entries(taskData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()

      lines.push(`${formattedKey}: ${formatValue(value)}`)
    }
  })

  return lines.join('\n')
}

/**
 * Helper to format values nicely
 */
const formatValue = (value: any): string => {
  if (typeof value === 'object' && value !== null) {
    if ('employeeName' in value) return value.employeeName
    if ('name' in value) return value.name
    if ('value' in value) return value.value
    return JSON.stringify(value)
  }
  return String(value)
}
