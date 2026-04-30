import { useCallback, useState } from 'react'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { FlowTemplate } from '../types/flowTemplate'
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
      if (validationCache.has(expression)) {
        return validationCache.get(expression)!
      }

      if (!expression.trim()) {
        return { isValid: true }
      }

      const clientValidation = validateExpressionClient(expression, entitySchemas)
      if (!clientValidation.isValid) {
        return clientValidation
      }

      try {
        const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/templates/validate-expressions`, {
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
        const validationResult = result.results?.[0] || { isValid: true }
        setValidationCache(previousCache => new Map(previousCache).set(expression, validationResult))
        return validationResult
      } catch (error) {
        console.error('Expression validation error:', error)
        return clientValidation
      }
    },
    [entitySchemas, stepIndex, template, validationCache]
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
  const openBraces = (expression.match(/\{\{/g) || []).length
  const closeBraces = (expression.match(/\}\}/g) || []).length

  if (openBraces !== closeBraces) {
    return {
      isValid: false,
      message: 'Unbalanced expression braces'
    }
  }

  const expressionRegex = /\{\{([^}]+)\}\}/g
  const expressionMatches = Array.from(expression.matchAll(expressionRegex))

  for (const match of expressionMatches) {
    const trimmedExpression = match[1].trim()

    if (
      !trimmedExpression.startsWith('$workflow.') &&
      !trimmedExpression.startsWith('$steps.') &&
      !trimmedExpression.startsWith('$catalog.') &&
      !trimmedExpression.startsWith('$entity.') &&
      !trimmedExpression.startsWith('$orgchart.')
    ) {
      return {
        isValid: false,
        message: `Invalid expression prefix: ${trimmedExpression}. Must start with $workflow, $steps, $catalog, $entity, or $orgchart`
      }
    }

    if (
      trimmedExpression === '$workflow' ||
      trimmedExpression === '$steps' ||
      trimmedExpression === '$catalog' ||
      trimmedExpression === '$entity' ||
      trimmedExpression === '$orgchart'
    ) {
      return {
        isValid: false,
        message: 'Incomplete expression. Specify a field after the prefix.'
      }
    }

    if (trimmedExpression.startsWith('$entity.')) {
      const entityPart = trimmedExpression.substring(8)
      const entityType = entityPart.split('.')[0].split('{')[0].trim()

      if (entityType && entitySchemas) {
        const normalizedEntityType = entityType.toLowerCase()
        const availableTypes = Object.keys(entitySchemas)

        if (!availableTypes.includes(normalizedEntityType)) {
          const availableList = availableTypes.map(type => entitySchemas[type].displayName || type).join(', ')
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
