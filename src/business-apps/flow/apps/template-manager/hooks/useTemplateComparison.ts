/**
 * useTemplateComparison Hook
 * Compares templates between two instances
 */

import { useState, useCallback } from 'react'
import { FlowEngineInstance } from '../types/instance'
import { TemplateComparison, ComparisonSummary } from '../types/comparison'
import { templateApi } from '../services/templateApi'
import { comparisonEngine } from '../services/comparisonEngine'

export const useTemplateComparison = (accessToken: string) => {
  const [comparisons, setComparisons] = useState<TemplateComparison[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const compareInstances = useCallback(
    async (sourceInstance: FlowEngineInstance, targetInstance: FlowEngineInstance, retryCount = 0, maxRetries = 2) => {
      setIsLoading(true)
      setError(null)

      try {
        console.log(
          `Comparing templates: ${sourceInstance.name} → ${targetInstance.name}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`
        )

        // Use accessToken for instances without apiKey (current platform)
        const sourceApiKey = sourceInstance.apiKey || accessToken
        const targetApiKey = targetInstance.apiKey || accessToken

        // Fetch templates from both instances in parallel
        const [sourceTemplates, targetTemplates] = await Promise.all([
          templateApi.getTemplates(sourceInstance.baseUrl, sourceApiKey),
          templateApi.getTemplates(targetInstance.baseUrl, targetApiKey)
        ])

        console.log(`Fetched ${sourceTemplates.length} templates from source, ${targetTemplates.length} from target`)

        // Compare templates using frontend logic
        const comparisonResults = comparisonEngine.compareTemplateLists(sourceTemplates, targetTemplates)

        setComparisons(comparisonResults)
        console.log(`Comparison complete: ${comparisonResults.length} templates analyzed`)

        return comparisonResults
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Comparison failed'

        // Retry with exponential backoff if database might still be committing
        if (retryCount < maxRetries && errorMessage.includes('Failed to fetch templates')) {
          const delayMs = 1000 * Math.pow(2, retryCount) // 1s, 2s, 4s
          console.warn(`Comparison failed, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})...`)

          await new Promise(resolve => setTimeout(resolve, delayMs))
          return compareInstances(sourceInstance, targetInstance, retryCount + 1, maxRetries)
        }

        setError(errorMessage)
        console.error('Template comparison failed', err)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken]
  )

  const getSummary = useCallback((): ComparisonSummary => {
    return comparisonEngine.generateSummary(comparisons)
  }, [comparisons])

  const clearComparisons = useCallback(() => {
    setComparisons([])
    setError(null)
  }, [])

  return {
    comparisons,
    isLoading,
    error,
    compareInstances,
    getSummary,
    clearComparisons
  }
}
