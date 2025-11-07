import { useState, useCallback } from 'react'
import { FlowTemplate } from '../types/flowTemplate'
import { env } from '@/common/env/EnvUtils'

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  expressionCount: number
}

/**
 * Hook for validating JSONPath expressions in templates
 * Calls the custom-flow-engine validation endpoint
 */
export const useExpressionValidator = (accessToken?: string) => {
  const [isValidating, setIsValidating] = useState(false)
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null)

  const validateTemplate = useCallback(
    async (template: FlowTemplate): Promise<ValidationResult> => {
      setIsValidating(true)

      try {
        // Get API URL from environment or default
        const apiUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'http://localhost:3000'

        const response = await fetch(`${apiUrl}/api/templates/validate-expressions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify({ template })
        })

        if (!response.ok) {
          throw new Error(`Validation failed: ${response.statusText}`)
        }

        const result: ValidationResult = await response.json()
        setLastValidation(result)
        return result
      } catch (error) {
        console.error('Expression validation error:', error)

        // Return error result
        const errorResult: ValidationResult = {
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Validation failed'],
          warnings: [],
          expressionCount: 0
        }
        setLastValidation(errorResult)
        return errorResult
      } finally {
        setIsValidating(false)
      }
    },
    [accessToken]
  )

  const validateExpression = useCallback(
    async (expression: string, template: FlowTemplate): Promise<{ isValid: boolean; message?: string }> => {
      // Basic client-side validation for single expression
      if (!expression.trim()) {
        return { isValid: true }
      }

      const expressionRegex = /\{\{(.+?)\}\}/g
      const matches = expression.match(expressionRegex)

      if (!matches) {
        return { isValid: true } // No expressions found
      }

      // Check for basic syntax errors
      for (const match of matches) {
        const expr = match.slice(2, -2).trim()

        // Check for valid prefixes
        if (
          !expr.startsWith('$workflow') &&
          !expr.startsWith('$steps') &&
          !expr.startsWith('$catalog') &&
          !expr.startsWith('$entity') &&
          !expr.startsWith('$fn')
        ) {
          return {
            isValid: false,
            message: 'Expression must start with $workflow, $steps, $catalog, $entity, or $fn'
          }
        }

        // Check for unclosed brackets
        const openCount = (match.match(/\{/g) || []).length
        const closeCount = (match.match(/\}/g) || []).length
        if (openCount !== closeCount) {
          return {
            isValid: false,
            message: 'Unclosed brackets in expression'
          }
        }

        // Check step references
        const stepMatch = expr.match(/\$steps\.step_(\d+)/)
        if (stepMatch) {
          const stepIndex = parseInt(stepMatch[1])
          if (stepIndex >= template.steps.length) {
            return {
              isValid: false,
              message: `Step ${stepIndex} does not exist (only ${template.steps.length} steps)`
            }
          }
        }
      }

      return { isValid: true }
    },
    []
  )

  return {
    validateTemplate,
    validateExpression,
    isValidating,
    lastValidation
  }
}
