import { useState, useCallback } from 'react'
import { FlowTemplate } from '../types/flowTemplate'
import { env } from '@/common/env/EnvUtils'

export interface ValidationResult {
  isValid: boolean
  message?: string
  details?: string[]
}

/**
 * Hook for validating expressions against custom-flow-engine backend
 */
export const useExpressionValidator = (template: FlowTemplate, stepIndex: number) => {
  const [validationCache, setValidationCache] = useState<Map<string, ValidationResult>>(new Map())

  /**
   * Validate expression using backend API
   */
  const validateExpression = useCallback(
    async (expression: string): Promise<ValidationResult> => {
      // Check cache first
      if (validationCache.has(expression)) {
        return validationCache.get(expression)!
      }

      // Empty expressions are valid
      if (!expression.trim()) {
        return { isValid: true }
      }

      // Client-side basic validation
      const clientValidation = validateExpressionClient(expression)
      if (!clientValidation.isValid) {
        return clientValidation
      }

      try {
        // Call backend validation API
        const apiUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'http://localhost:8081'
        const response = await fetch(`${apiUrl}/api/templates/validate-expressions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            template,
            expressions: [expression],
            currentStepIndex: stepIndex
          })
        })

        if (!response.ok) {
          return {
            isValid: false,
            message: 'Failed to validate expression'
          }
        }

        const result = await response.json()
        const validation = result.results?.[0] || { isValid: true }

        // Cache result
        setValidationCache(prev => new Map(prev).set(expression, validation))

        return validation
      } catch (error) {
        console.error('Expression validation error:', error)
        // Fallback to client-side validation
        return clientValidation
      }
    },
    [template, stepIndex, validationCache]
  )

  /**
   * Clear validation cache
   */
  const clearCache = useCallback(() => {
    setValidationCache(new Map())
  }, [])

  return {
    validateExpression,
    clearCache
  }
}

/**
 * Client-side expression validation (syntax check only)
 */
const validateExpressionClient = (expression: string): ValidationResult => {
  // Check for balanced braces
  const openBraces = (expression.match(/\{\{/g) || []).length
  const closeBraces = (expression.match(/\}\}/g) || []).length

  if (openBraces !== closeBraces) {
    return {
      isValid: false,
      message: 'Unbalanced expression braces'
    }
  }

  // Extract expressions
  const expressionRegex = /\{\{([^}]+)\}\}/g
  const matches = Array.from(expression.matchAll(expressionRegex))

  for (const match of matches) {
    const expr = match[1].trim()

    // Check for valid prefixes
    if (!expr.startsWith('$workflow.') && !expr.startsWith('$steps.') && !expr.startsWith('$catalog.')) {
      return {
        isValid: false,
        message: `Invalid expression prefix: ${expr}. Must start with $workflow, $steps, or $catalog`
      }
    }

    // Check for empty expressions
    if (expr === '$workflow' || expr === '$steps' || expr === '$catalog') {
      return {
        isValid: false,
        message: 'Incomplete expression. Specify a field after the prefix.'
      }
    }
  }

  return { isValid: true }
}
