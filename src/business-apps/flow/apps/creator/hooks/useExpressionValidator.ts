import { useState, useCallback } from 'react'
import { FlowTemplate } from '../types/flowTemplate'
import { env } from '@/common/env/EnvUtils'
import { EntitySchema } from './useEntitySchemas'

export interface ValidationResult {
  isValid: boolean
  message?: string
  details?: string[]
}

/**
 * Hook for validating expressions against custom-flow-engine backend
 */
export const useExpressionValidator = (
  template: FlowTemplate,
  stepIndex: number,
  entitySchemas?: Record<string, EntitySchema>
) => {
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
      const clientValidation = validateExpressionClient(expression, entitySchemas)
      if (!clientValidation.isValid) {
        return clientValidation
      }

      try {
        // Call backend validation API
        const apiUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
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
 * Client-side expression validation (syntax and entity type check)
 */
const validateExpressionClient = (
  expression: string,
  entitySchemas?: Record<string, EntitySchema>
): ValidationResult => {
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
    if (
      !expr.startsWith('$workflow.') &&
      !expr.startsWith('$steps.') &&
      !expr.startsWith('$catalog.') &&
      !expr.startsWith('$entity.') &&
      !expr.startsWith('$orgchart.')
    ) {
      return {
        isValid: false,
        message: `Invalid expression prefix: ${expr}. Must start with $workflow, $steps, $catalog, $entity, or $orgchart`
      }
    }

    // Check for empty expressions
    if (
      expr === '$workflow' ||
      expr === '$steps' ||
      expr === '$catalog' ||
      expr === '$entity' ||
      expr === '$orgchart'
    ) {
      return {
        isValid: false,
        message: 'Incomplete expression. Specify a field after the prefix.'
      }
    }

    // Validate entity type exists
    if (expr.startsWith('$entity.')) {
      // Extract entity type: $entity.costCenters.{id}.name -> costCenters
      const entityPart = expr.substring(8) // Remove "$entity."
      const entityType = entityPart.split('.')[0].split('{')[0].trim() // Get first part before . or {

      if (entityType && entitySchemas) {
        // Check if entity type exists (case-insensitive)
        const entityTypeLower = entityType.toLowerCase()
        const availableTypes = Object.keys(entitySchemas)

        if (!availableTypes.includes(entityTypeLower)) {
          const availableList = availableTypes.map(t => entitySchemas[t].displayName || t).join(', ')
          return {
            isValid: false,
            message: `Invalid entity type: "${entityType}". Available entities: ${availableList}`
          }
        }
      }
    }
  }

  return { isValid: true }
}
