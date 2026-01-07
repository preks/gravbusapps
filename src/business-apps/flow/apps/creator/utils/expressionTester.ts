/**
 * Expression Tester Utility
 *
 * Provides fast expression resolution testing without creating/executing workflows
 * Uses the custom-flow-engine test endpoint for rapid iteration
 */

import { env } from '@/common/env/EnvUtils'

export interface WorkflowContext {
  id: string
  name: string
  initiator: string
  input?: Record<string, any>
  status?: string
}

export interface StepData {
  status: string
  formData: Record<string, any>
  executedBy?: string
  timestamp?: string
  output?: Record<string, any>
  comment?: string
  commentVisibility?: string
}

export interface TestContext {
  workflow: WorkflowContext
  steps: Record<string, StepData>
}

export interface ResolveResult {
  success: boolean
  originalExpression: string
  resolvedValue: any
  resolvedIn: string
  error?: string
}

export interface BatchResolveResult {
  success: boolean
  totalExpressions: number
  results: ResolveResult[]
  totalTime: string
}

/**
 * Test a single expression with mock context
 */
export async function testResolveExpression(expression: string, context: TestContext): Promise<ResolveResult> {
  const apiUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

  try {
    const response = await fetch(`${apiUrl}/api/expressions/test-resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expression,
        context
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        originalExpression: expression,
        resolvedValue: null,
        resolvedIn: '0ms',
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return await response.json()
  } catch (error) {
    return {
      success: false,
      originalExpression: expression,
      resolvedValue: null,
      resolvedIn: '0ms',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Test multiple expressions with the same context
 */
export async function testResolveBatch(expressions: string[], context: TestContext): Promise<BatchResolveResult> {
  const apiUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

  try {
    const response = await fetch(`${apiUrl}/api/expressions/test-resolve-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expressions,
        context
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    return {
      success: false,
      totalExpressions: expressions.length,
      results: expressions.map(expr => ({
        success: false,
        originalExpression: expr,
        resolvedValue: null,
        resolvedIn: '0ms',
        error: error instanceof Error ? error.message : 'Unknown error'
      })),
      totalTime: '0ms'
    }
  }
}

/**
 * Get example context structures for testing
 */
export async function getExampleContext(): Promise<{
  success: boolean
  examples: {
    basic: TestContext
    multiStep: TestContext
  }
  documentation: any
}> {
  const apiUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

  try {
    const response = await fetch(`${apiUrl}/api/expressions/example-context`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to fetch example context:', error)
    // Return fallback examples
    return {
      success: false,
      examples: {
        basic: createBasicContext(),
        multiStep: createMultiStepContext()
      },
      documentation: {}
    }
  }
}

/**
 * Create a basic test context (single step)
 */
export function createBasicContext(overrides?: Partial<TestContext>): TestContext {
  return {
    workflow: {
      id: 'test-workflow-123',
      name: 'Test Workflow',
      initiator: 'test.user',
      input: {},
      status: 'RUNNING'
    },
    steps: {
      step_0: {
        status: 'COMPLETED',
        formData: {
          field1: 'Test Value 1',
          field2: 'Test Value 2'
        },
        executedBy: 'test.user',
        timestamp: new Date().toISOString()
      }
    },
    ...overrides
  }
}

/**
 * Create a multi-step test context
 */
export function createMultiStepContext(stepCount: number = 3): TestContext {
  const steps: Record<string, StepData> = {}

  for (let i = 0; i < stepCount; i++) {
    steps[`step_${i}`] = {
      status: 'COMPLETED',
      formData: {
        field1: `Step ${i} Value 1`,
        field2: `Step ${i} Value 2`
      },
      executedBy: `user${i}`,
      timestamp: new Date(Date.now() - (stepCount - i) * 60000).toISOString()
    }
  }

  return {
    workflow: {
      id: 'test-workflow-multi',
      name: 'Multi-Step Test Workflow',
      initiator: 'test.user',
      input: { initialData: 'test' },
      status: 'RUNNING'
    },
    steps
  }
}

/**
 * Create a context from a template for testing
 */
export function createContextFromTemplate(
  template: any,
  stepIndex: number = 0,
  mockFormData?: Record<string, any>
): TestContext {
  const steps: Record<string, StepData> = {}

  // Create mock data for all previous steps
  for (let i = 0; i < stepIndex; i++) {
    const step = template.steps[i]
    const formData: Record<string, any> = {}

    // Generate mock form data based on form fields
    if (step.form && Array.isArray(step.form)) {
      step.form.forEach((field: any) => {
        formData[field.name] = `mock-${field.name}-${i}`
      })
    }

    steps[`step_${i}`] = {
      status: 'COMPLETED',
      formData,
      executedBy: 'test.user',
      timestamp: new Date(Date.now() - (stepIndex - i) * 60000).toISOString()
    }
  }

  // Add current step with provided mock data
  if (mockFormData) {
    steps[`step_${stepIndex}`] = {
      status: 'IN_PROGRESS',
      formData: mockFormData,
      executedBy: 'test.user',
      timestamp: new Date().toISOString()
    }
  }

  return {
    workflow: {
      id: 'test-workflow-from-template',
      name: template.name || 'Test Workflow',
      initiator: 'test.user',
      input: template.input || {},
      status: 'RUNNING'
    },
    steps
  }
}

/**
 * Quick test helper for console testing
 * Usage: quickTest('{{$steps.step_0.output.formData.name}}')
 */
export async function quickTest(expression: string, context?: TestContext): Promise<void> {
  const testContext = context || createBasicContext()

  console.group('🧪 Expression Test')
  console.log('Expression:', expression)
  console.log('Context:', testContext)

  const result = await testResolveExpression(expression, testContext)

  if (result.success) {
    console.log('✅ Result:', result.resolvedValue)
    console.log('⏱️  Resolved in:', result.resolvedIn)
  } else {
    console.error('❌ Error:', result.error)
  }

  console.groupEnd()
}
