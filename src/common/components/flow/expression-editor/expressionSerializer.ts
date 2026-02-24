/**
 * Serializer to convert between Tiptap editor JSON and expression strings.
 *
 * Expression format: free text with {{$prefix.path}} embedded expressions.
 * Example: "Hello {{$workflow.initiator.name}}, your amount is {{$steps.step_0.formData.amount}}"
 */

import type { ExpressionSourceType, ExpressionPillData } from './types/expressionTypes'

/**
 * Detect the source type from an expression string prefix.
 */
export function detectSourceType(expression: string): ExpressionSourceType {
  if (
    expression.startsWith('$workflow.input.formData') ||
    expression.startsWith('$workflow.input.inputData') ||
    expression.startsWith('$workflow.input.inputValues')
  ) {
    return 'trigger'
  }
  if (expression.startsWith('$workflow')) return 'workflow'
  if (expression.startsWith('$steps')) return 'steps'
  if (expression.startsWith('$catalog')) return 'catalog'
  if (expression.startsWith('$entity')) return 'entity'
  if (expression.startsWith('$orgchart')) return 'orgchart'
  return 'workflow'
}

/**
 * Extract a display label from an expression path.
 * e.g. '$steps.step_0.formData.amount' -> 'step_0.amount'
 */
export function expressionToLabel(expression: string): string {
  const parts = expression.split('.')
  if (parts.length <= 2) return expression
  // Show second segment (step name / key) and last segment (field name)
  return `${parts[1]}.${parts[parts.length - 1]}`
}

/**
 * Convert an expression string (with {{...}}) to Tiptap editor JSON content.
 */
export function expressionToEditorJSON(value: string): Record<string, unknown> {
  const content: Array<Record<string, unknown>> = []
  const regex = /\{\{([^}]*)\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(value)) !== null) {
    // Add text before the expression
    if (match.index > lastIndex) {
      const textBefore = value.slice(lastIndex, match.index)
      if (textBefore) {
        content.push({ type: 'text', text: textBefore })
      }
    }

    // Add expression pill mention
    const expr = match[1]
    const source = detectSourceType(expr)
    const label = expressionToLabel(expr)

    content.push({
      type: 'mention',
      attrs: {
        id: expr,
        label,
        mentionType: source,
        expression: expr
      }
    })

    lastIndex = regex.lastIndex
  }

  // Add remaining text
  if (lastIndex < value.length) {
    content.push({ type: 'text', text: value.slice(lastIndex) })
  }

  if (content.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }

  return {
    type: 'doc',
    content: [{ type: 'paragraph', content }]
  }
}

/**
 * Convert Tiptap editor JSON back to an expression string with {{...}} delimiters.
 */
export function editorJSONToExpression(json: Record<string, unknown>): string {
  let result = ''

  function walk(node: Record<string, unknown>) {
    if (node.type === 'mention') {
      const attrs = (node.attrs ?? {}) as Record<string, string>
      const expr = attrs.expression || attrs.id || ''
      result += `{{${expr}}}`
    } else if (node.type === 'text') {
      result += (node.text as string) || ''
    } else if (node.type === 'paragraph') {
      if (result.length > 0) result += '\n'
      const children = (node.content ?? []) as Array<Record<string, unknown>>
      children.forEach(walk)
    } else {
      const children = (node.content ?? []) as Array<Record<string, unknown>>
      children.forEach(walk)
    }
  }

  const contents = (json.content ?? []) as Array<Record<string, unknown>>
  contents.forEach(walk)

  return result.trim()
}

/**
 * Parse all expression pills from a value string.
 */
export function parseExpressionPills(value: string): ExpressionPillData[] {
  const pills: ExpressionPillData[] = []
  const regex = /\{\{([^}]*)\}\}/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(value)) !== null) {
    const expression = match[1]
    pills.push({
      expression,
      label: expressionToLabel(expression),
      source: detectSourceType(expression)
    })
  }

  return pills
}
