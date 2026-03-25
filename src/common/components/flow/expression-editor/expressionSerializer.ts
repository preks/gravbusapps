/**
 * Serializer to convert between Tiptap editor JSON and expression strings.
 *
 * Expression format: free text with {{$prefix.path}} embedded expressions.
 * Example: "Hello {{$workflow.initiator.name}}, your amount is {{$steps.step_0.formData.amount}}"
 */

import type { ExpressionSourceType, ExpressionPillData, ExpressionSuggestionItem } from './types/expressionTypes'

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

function getExpressionAliases(expression: string): string[] {
  const expr = String(expression || '').trim()
  if (!expr) return []

  const aliases = new Set<string>([expr])

  const triggerInputValuesMatch = expr.match(/^\$workflow\.input\.inputValues\.(.+)$/)
  if (triggerInputValuesMatch) {
    const suffix = triggerInputValuesMatch[1]
    aliases.add(`$workflow.input.${suffix}`)
    aliases.add(`$workflow.input.formData.${suffix}`)
    aliases.add(`$workflow.input.inputData.${suffix}`)
  }

  const stepResultMatch = expr.match(/^\$steps\.([^.]+)\.resultData\.(.+)$/)
  if (stepResultMatch) {
    aliases.add(`$steps.${stepResultMatch[1]}.${stepResultMatch[2]}`)
  }

  return Array.from(aliases)
}

/**
 * Convert an expression string (with {{...}}) to Tiptap editor JSON content.
 */
export function expressionToEditorJSON(
  value: string,
  suggestions?: ExpressionSuggestionItem[]
): Record<string, unknown> {
  const content: Array<Record<string, unknown>> = []
  let lastIndex = 0
  let searchFrom = 0

  const byExpression = (() => {
    const map = new Map<string, ExpressionSuggestionItem>()
    for (const s of suggestions ?? []) {
      const expr = String(s?.expression || '').trim()
      if (!expr) continue
      for (const alias of getExpressionAliases(expr)) {
        if (!map.has(alias)) map.set(alias, s)
      }
    }
    return map
  })()

  while (searchFrom <= value.length) {
    const openIdx = value.indexOf('{{', searchFrom)
    if (openIdx === -1) break

    if (openIdx > lastIndex) {
      const textBefore = value.slice(lastIndex, openIdx)
      if (textBefore) {
        content.push({ type: 'text', text: textBefore })
      }
    }

    const closeIdx = value.indexOf('}}', openIdx + 2)
    if (closeIdx === -1) {
      break
    }

    const expr = value.slice(openIdx + 2, closeIdx)
    const match = byExpression.get(expr)
    const source = (match?.source as ExpressionSourceType | undefined) ?? detectSourceType(expr)
    const label = String(match?.label || '').trim() || expressionToLabel(expr)

    content.push({
      type: 'mention',
      attrs: {
        id: expr,
        label,
        mentionType: source,
        expression: expr
      }
    })

    lastIndex = closeIdx + 2
    searchFrom = closeIdx + 2
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
  let searchFrom = 0

  while (searchFrom < value.length) {
    const openIdx = value.indexOf('{{', searchFrom)
    if (openIdx === -1) break
    const closeIdx = value.indexOf('}}', openIdx + 2)
    if (closeIdx === -1) break
    const expression = value.slice(openIdx + 2, closeIdx)
    pills.push({
      expression,
      label: expressionToLabel(expression),
      source: detectSourceType(expression)
    })
    searchFrom = closeIdx + 2
  }

  return pills
}
