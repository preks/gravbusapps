import { useState, useCallback } from 'react'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { FlowTemplate } from '../types/workflowTypes'

export interface TestResult {
  success: boolean
  resolvedValue?: string
  error?: string
  resolvedIn?: string
  info?: string // Backend message about placeholder replacement
  warning?: string // Backend warning about null/undefined results
  isNull?: boolean // Flag indicating if result is null/undefined
}

export interface ExpressionTestingHook {
  testExpression: (expression: string) => Promise<void>
  testResult: TestResult | null
  isTesting: boolean
  clearResult: () => void
}

/**
 * Hook to test expression resolution using the existing API
 * POST /api/expressions/test-resolve
 */
export const useExpressionTesting = (
  template: FlowTemplate,
  stepIndex: number,
  accessToken: string,
  authenticatedUserId?: string
): ExpressionTestingHook => {
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  /**
   * Build mock context from current template
   * Generates realistic sample data based on form field types
   */
  const buildMockContext = useCallback(() => {
    return {
      workflow: {
        id: 'test-workflow-123',
        name: template.name,
        initiator: 'test.user', // Placeholder - backend will replace with authenticatedUserId if provided
        input: {},
        status: 'RUNNING'
      },
      steps: template.steps.slice(0, stepIndex + 1).reduce(
        (acc, step, idx) => {
          acc[`step_${idx}`] = {
            status: idx < stepIndex ? 'COMPLETED' : 'IN_PROGRESS',
            formData: generateSampleFormData(step.form),
            executedBy: 'test.user',
            timestamp: new Date().toISOString()
          }
          return acc
        },
        {} as Record<string, any>
      )
    }
  }, [template, stepIndex])

  /**
   * Test expression using existing API endpoint
   */
  const testExpression = useCallback(
    async (expression: string) => {
      if (!expression.trim()) {
        setTestResult(null)
        return
      }

      setIsTesting(true)
      try {
        const apiUrl = CUSTOM_FLOW_ENGINE_API_URL
        const mockContext = buildMockContext()

        const response = await fetch(`${apiUrl}/expressions/test-resolve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            expression,
            context: mockContext,
            authenticatedUserId // Pass authenticated user ID for orgchart expressions
          })
        })

        const result = await response.json()

        if (result.success) {
          setTestResult({
            success: true,
            resolvedValue: result.resolvedValue !== null ? String(result.resolvedValue) : 'null',
            resolvedIn: result.resolvedIn,
            info: result.info, // Placeholder replacement message
            warning: result.warning, // Null/undefined warning
            isNull: result.isNull // Null flag
          })
        } else {
          setTestResult({
            success: false,
            error: result.message || result.error || 'Failed to resolve expression'
          })
        }
      } catch (error) {
        setTestResult({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to connect to API'
        })
      } finally {
        setIsTesting(false)
      }
    },
    [accessToken, authenticatedUserId, buildMockContext]
  )

  const clearResult = useCallback(() => {
    setTestResult(null)
  }, [])

  return {
    testExpression,
    testResult,
    isTesting,
    clearResult
  }
}

/**
 * Generate sample form data based on input types
 * Creates realistic test data for expression resolution
 */
const generateSampleFormData = (form: any): Record<string, any> => {
  // form is already an array of InputBlock[], not an object with inputs property
  const formInputs = Array.isArray(form) ? form : []
  if (formInputs.length === 0) return {}

  const sampleData: Record<string, any> = {}

  formInputs.forEach((input: any) => {
    const fieldName = input.name
    const fieldLabel = input.label || fieldName

    switch (input.type) {
      case 'TEXT':
      case 'TEXTAREA':
        sampleData[fieldName] = `Sample ${fieldLabel}`
        break

      case 'NUMBER':
        sampleData[fieldName] = 42
        break

      case 'DATE':
        sampleData[fieldName] = new Date().toISOString().split('T')[0]
        break

      case 'DATETIME':
        sampleData[fieldName] = new Date().toISOString()
        break

      case 'EMAIL':
        sampleData[fieldName] = `${fieldName.toLowerCase()}@example.com`
        break

      case 'PHONE':
        sampleData[fieldName] = '+1-555-0123'
        break

      case 'URL':
        sampleData[fieldName] = `https://example.com/${fieldName}`
        break

      case 'SELECT':
      case 'RADIO':
        if (input.options && input.options.length > 0) {
          sampleData[fieldName] = input.options[0].value
        } else {
          sampleData[fieldName] = 'option1'
        }
        break

      case 'MULTISELECT':
      case 'CHECKBOX_GROUP':
        if (input.options && input.options.length > 0) {
          sampleData[fieldName] = [input.options[0].value]
        } else {
          sampleData[fieldName] = ['option1']
        }
        break

      case 'CHECKBOX':
        sampleData[fieldName] = true
        break

      case 'CURRENCY':
        sampleData[fieldName] = 1234.56
        break

      case 'PERCENTAGE':
        sampleData[fieldName] = 75
        break

      default:
        // Generic fallback
        sampleData[fieldName] = `Sample ${fieldLabel}`
    }
  })

  return sampleData
}
