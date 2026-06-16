import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

export function containsFlowTemplateExpressions(text: string): boolean {
  return text.includes('{{') && text.includes('}}')
}

interface ResolveFlowTemplateTextArgs {
  text: string
  flowId: string
  accessToken: string
}

interface TestResolveResponse {
  success?: boolean
  resolvedValue?: unknown
  error?: string
  message?: string
}

/**
 * Resolves `{{$steps...}}` and other flow template expressions using the real workflow
 * execution context from custom-flow-engine (POST /api/expressions/test-resolve).
 */
export async function resolveFlowTemplateText({
  text,
  flowId,
  accessToken
}: ResolveFlowTemplateTextArgs): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed || !flowId || !accessToken || !containsFlowTemplateExpressions(trimmed)) {
    return trimmed
  }

  const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/expressions/test-resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      expression: trimmed,
      workflowId: flowId
    })
  })

  const result = (await response.json()) as TestResolveResponse
  if (!response.ok || !result.success) {
    return trimmed
  }

  if (result.resolvedValue === null || result.resolvedValue === undefined) {
    return trimmed
  }

  return String(result.resolvedValue)
}
