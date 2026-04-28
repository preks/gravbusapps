/**
 * Expression Parser Utility
 *
 * Parses {{$prefix.path}} expressions and extracts structured metadata
 * for rendering rich, contextual pill components.
 */

import { FlowTemplate, InputType } from '../types/flowTemplate'

/**
 * Source type for an expression
 */
export type ExpressionSourceType = 'workflow' | 'step' | 'catalog' | 'entity' | 'file' | 'unknown'

/**
 * Parsed expression metadata for rendering
 */
export interface ParsedExpression {
  raw: string
  label: string
  sourceType: ExpressionSourceType
  sourceContext: string
  icon: string
  dataType: 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'object' | 'array' | 'file' | 'user'
  stepIndex?: number
  entityType?: string
  catalogId?: string
}

/**
 * Segment of a mixed text/expression string
 */
export type ExpressionSegment =
  | { type: 'text'; content: string }
  | { type: 'expression'; expression: ParsedExpression }
  | { type: 'file-url'; id: ParsedExpression; name?: ParsedExpression; url?: ParsedExpression }
  | { type: 'entity-url'; entityType: string; id: ParsedExpression; name?: ParsedExpression }
  | { type: 'file-link'; fileName: ParsedExpression; downloadPath: ParsedExpression }
  | { type: 'entity-ref'; entityType: string; expression: ParsedExpression }
  | { type: 'entity-structured'; entityType: string; nameExpression: ParsedExpression; idExpression: ParsedExpression }

/**
 * Icon mapping for data types
 */
const DATA_TYPE_ICONS: Record<string, string> = {
  string: 'text',
  number: 'hash',
  date: 'calendar',
  datetime: 'calendar-clock',
  boolean: 'toggle-left',
  object: 'folder',
  array: 'list',
  file: 'file',
  user: 'user'
}

/**
 * Icon mapping for workflow fields
 */
const WORKFLOW_FIELD_ICONS: Record<string, string> = {
  initiator: 'user',
  name: 'text',
  workflowId: 'hash',
  correlationId: 'link',
  status: 'activity',
  input: 'folder'
}

/**
 * Icon mapping for step fields
 */
const STEP_FIELD_ICONS: Record<string, string> = {
  formData: 'clipboard-list',
  resultData: 'folder',
  status: 'activity',
  executedBy: 'user',
  timestamp: 'clock',
  success: 'check-circle',
  error: 'alert-circle'
}

/**
 * Parse a single expression and extract metadata
 */
export function parseExpression(
  expression: string,
  template?: FlowTemplate,
  readableOverrides?: Record<string, string>
): ParsedExpression {
  if (readableOverrides?.[expression]) {
    return {
      raw: expression,
      label: readableOverrides[expression],
      sourceType: 'unknown',
      sourceContext: '',
      icon: 'text',
      dataType: 'string'
    }
  }

  const innerExpression = expression.replace(/^\{\{/, '').replace(/\}\}$/, '').trim()

  if (innerExpression.startsWith('$workflow')) {
    return parseWorkflowExpression(expression, innerExpression)
  }

  if (innerExpression.startsWith('$steps')) {
    return parseStepExpression(expression, innerExpression, template)
  }

  if (innerExpression.startsWith('$catalog')) {
    return parseCatalogExpression(expression, innerExpression)
  }

  if (innerExpression.startsWith('$entity')) {
    return parseEntityExpression(expression, innerExpression)
  }

  return {
    raw: expression,
    label: innerExpression,
    sourceType: 'unknown',
    sourceContext: 'Expression',
    icon: 'code',
    dataType: 'string'
  }
}

/**
 * Parse workflow expression: {{$workflow.field}}
 */
function parseWorkflowExpression(raw: string, inner: string): ParsedExpression {
  const parts = inner.split('.')
  const fieldName = parts[1] || 'workflow'
  const nestedPath = parts.slice(2).join('.')

  let label = fieldName
  if (nestedPath) {
    label = nestedPath.split('.').pop() || fieldName
  }

  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1)

  let dataType: ParsedExpression['dataType'] = 'string'
  let icon = WORKFLOW_FIELD_ICONS[fieldName] || 'folder'

  if (fieldName === 'initiator') {
    dataType = 'user'
    icon = 'user'
  } else if (fieldName === 'input') {
    dataType = 'object'
    icon = 'folder'
  }

  return {
    raw,
    label: displayLabel,
    sourceType: 'workflow',
    sourceContext: 'Workflow',
    icon,
    dataType
  }
}

/**
 * Parse step expression: {{$steps.step_N.formData.field}}
 */
function parseStepExpression(raw: string, inner: string, template?: FlowTemplate): ParsedExpression {
  const parts = inner.split('.')
  const stepPart = parts[1] || ''
  const stepIndexMatch = /step_(\d+)/.exec(stepPart)
  const stepIndex = stepIndexMatch ? Number.parseInt(stepIndexMatch[1], 10) : 0

  const stepFieldType = parts[2] || ''
  const fieldName = parts.slice(3).join('.') || stepFieldType

  const filePathRegex = /^([^[]+)\[\d+\]\.(fileName|downloadPath)$/
  const filePathMatch = filePathRegex.exec(fieldName)
  const isFilePath = !!filePathMatch
  const baseFieldName = filePathMatch ? filePathMatch[1] : fieldName.split('[')[0]

  const step = template?.steps[stepIndex]
  const stepTitle = step?.title || `Step ${stepIndex + 1}`

  let label = baseFieldName
  let icon = STEP_FIELD_ICONS[stepFieldType] || 'text'
  let dataType: ParsedExpression['dataType'] = 'string'

  if (stepFieldType === 'formData' && step?.form) {
    const formField = step.form.find(field => field.name === baseFieldName)
    if (formField) {
      label = formField.label || formField.name
      dataType = mapInputTypeToDataType(formField.type)
      icon = getIconForInputType(formField.type)
    }

    if (isFilePath) {
      dataType = 'file'
      icon = 'file'
    }
  } else if (stepFieldType === 'resultData') {
    dataType = 'object'
    icon = 'folder'
    label = baseFieldName || 'Result Data'
  } else if (stepFieldType === 'executedBy') {
    dataType = 'user'
    icon = 'user'
    label = 'Executed By'
  } else if (stepFieldType === 'timestamp') {
    dataType = 'datetime'
    icon = 'clock'
    label = 'Timestamp'
  } else if (stepFieldType === 'status') {
    icon = 'activity'
    label = 'Status'
  }

  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1)

  return {
    raw,
    label: displayLabel,
    sourceType: 'step',
    sourceContext: `Step ${stepIndex + 1}: ${stepTitle}`,
    icon,
    dataType,
    stepIndex
  }
}

/**
 * Parse catalog expression: {{$catalog.catalogId['entryId'].field}}
 */
function parseCatalogExpression(raw: string, inner: string): ParsedExpression {
  const catalogRegex = /\$catalog\.([^.[]+)(?:\['?([^'\]]+)'?\])?(?:\.(.+))?/
  const catalogMatch = catalogRegex.exec(inner)

  if (!catalogMatch) {
    return {
      raw,
      label: 'Catalog Entry',
      sourceType: 'catalog',
      sourceContext: 'Catalog',
      icon: 'book-open',
      dataType: 'string'
    }
  }

  const catalogId = catalogMatch[1]
  const entryId = catalogMatch[2]
  const fieldPath = catalogMatch[3]

  const catalogName = catalogId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  let label = fieldPath || entryId || catalogId
  label = label.charAt(0).toUpperCase() + label.slice(1)

  return {
    raw,
    label,
    sourceType: 'catalog',
    sourceContext: `${catalogName} Catalog`,
    icon: 'book-open',
    dataType: 'string',
    catalogId
  }
}

/**
 * Parse entity expression: {{$entity.entityType.entityId.field}}
 */
function parseEntityExpression(raw: string, inner: string): ParsedExpression {
  const parts = inner.split('.')
  const entityType = parts[1] || 'entity'
  const entityId = parts[2] || ''
  const fieldName = parts.slice(3).join('.') || 'displayName'

  const entityTypeName = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  let icon = 'box'
  if (entityType === 'employee' || entityType === 'user') {
    icon = 'user'
  } else if (entityType === 'costCenter') {
    icon = 'building-2'
  } else if (entityType === 'contact') {
    icon = 'contact'
  } else if (entityType === 'account') {
    icon = 'briefcase'
  } else if (entityType === 'lead') {
    icon = 'user-plus'
  }

  const shortId = entityId.length > 8 ? `${entityId.slice(0, 8)}...` : entityId
  const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1)

  return {
    raw,
    label,
    sourceType: 'entity',
    sourceContext: `${entityTypeName} (${shortId})`,
    icon,
    dataType: 'string',
    entityType
  }
}

/**
 * Map InputType to data type
 */
function mapInputTypeToDataType(inputType: InputType): ParsedExpression['dataType'] {
  switch (inputType) {
    case InputType.NUMBER:
      return 'number'
    case InputType.DATE:
      return 'date'
    case InputType.DATETIME:
      return 'datetime'
    case InputType.CHECKBOX:
    case InputType.RADIO:
      return 'boolean'
    case InputType.FILE:
      return 'file'
    default:
      return 'string'
  }
}

/**
 * Get icon for input type
 */
function getIconForInputType(inputType: InputType): string {
  switch (inputType) {
    case InputType.TEXT:
    case InputType.TEXTAREA:
      return 'text'
    case InputType.NUMBER:
      return 'hash'
    case InputType.DATE:
    case InputType.DATETIME:
      return 'calendar'
    case InputType.CHECKBOX:
    case InputType.RADIO:
      return 'toggle-left'
    case InputType.SELECT:
    case InputType.MULTISELECT:
      return 'list'
    case InputType.FILE:
      return 'file'
    case InputType.SIGNATURE:
      return 'pen-tool'
    default:
      return 'text'
  }
}

/**
 * Parse a string containing mixed text and expressions into segments
 */
export function parseExpressionString(
  value: string,
  template?: FlowTemplate,
  readableOverrides?: Record<string, string>
): ExpressionSegment[] {
  if (!value) return []

  const segments: ExpressionSegment[] = []
  const specialSegments: Array<{ start: number; end: number; segment: ExpressionSegment }> = []

  const fileUrlRegex = /file:\/\/(\{\{[^}]+\}\})(?:\/name\/(\{\{[^}]+\}\}))?(?:\/url\/(\{\{[^}]+\}\}))?/g
  let fileUrlMatch

  while ((fileUrlMatch = fileUrlRegex.exec(value)) !== null) {
    const idExpression = fileUrlMatch[1]
    const nameExpression = fileUrlMatch[2]
    const urlExpression = fileUrlMatch[3]

    specialSegments.push({
      start: fileUrlMatch.index,
      end: fileUrlMatch.index + fileUrlMatch[0].length,
      segment: {
        type: 'file-url',
        id: parseExpression(idExpression, template, readableOverrides),
        name: nameExpression ? parseExpression(nameExpression, template, readableOverrides) : undefined,
        url: urlExpression ? parseExpression(urlExpression, template, readableOverrides) : undefined
      }
    })
  }

  specialSegments.push(...extractEntityUrlSegments(value, template, readableOverrides))

  const fileLinkRegex = /FILE_LINK::name(\{\{[^}]+\}\})::urlfile:\/\/(\{\{[^}]+\}\})/g
  let fileLinkMatch

  while ((fileLinkMatch = fileLinkRegex.exec(value)) !== null) {
    const nameExpression = fileLinkMatch[1]
    const downloadExpression = fileLinkMatch[2]

    specialSegments.push({
      start: fileLinkMatch.index,
      end: fileLinkMatch.index + fileLinkMatch[0].length,
      segment: {
        type: 'file-link',
        fileName: parseExpression(nameExpression, template, readableOverrides),
        downloadPath: parseExpression(downloadExpression, template, readableOverrides)
      }
    })
  }

  specialSegments.sort((leftSegment, rightSegment) => leftSegment.start - rightSegment.start)

  let currentPosition = 0

  for (const specialSegment of specialSegments) {
    if (specialSegment.start > currentPosition) {
      const beforeText = value.slice(currentPosition, specialSegment.start)
      parseTextAndExpressions(beforeText, segments, template, readableOverrides)
    }

    segments.push(specialSegment.segment)
    currentPosition = specialSegment.end
  }

  if (currentPosition < value.length) {
    const remainingText = value.slice(currentPosition)
    parseTextAndExpressions(remainingText, segments, template, readableOverrides)
  }

  return segments
}

/**
 * Extract entity URL patterns (e.g., employee://{{id}}) from value string
 */
function extractEntityUrlSegments(
  value: string,
  template?: FlowTemplate,
  readableOverrides?: Record<string, string>
): Array<{ start: number; end: number; segment: ExpressionSegment }> {
  const entityUrlRegex = /(\w+):\/\/(\{\{[^}]+\}\})/g
  const segments: Array<{ start: number; end: number; segment: ExpressionSegment }> = []
  let entityUrlMatch

  while ((entityUrlMatch = entityUrlRegex.exec(value)) !== null) {
    if (entityUrlMatch[1].toLowerCase() === 'file') continue

    const entityType = entityUrlMatch[1]
    const idExpression = entityUrlMatch[2]

    segments.push({
      start: entityUrlMatch.index,
      end: entityUrlMatch.index + entityUrlMatch[0].length,
      segment: {
        type: 'entity-url',
        entityType,
        id: parseExpression(idExpression, template, readableOverrides)
      }
    })
  }

  return segments
}

/**
 * Parse text containing {{expression}} patterns into segments
 */
function parseTextAndExpressions(
  text: string,
  segments: ExpressionSegment[],
  template?: FlowTemplate,
  readableOverrides?: Record<string, string>
): void {
  const expressionRegex = /\{\{([^}]+)\}\}/g
  let lastIndex = 0
  let expressionMatch

  while ((expressionMatch = expressionRegex.exec(text)) !== null) {
    if (expressionMatch.index > lastIndex) {
      const textContent = text.slice(lastIndex, expressionMatch.index)
      if (textContent) {
        segments.push({ type: 'text', content: textContent })
      }
    }

    const expression = expressionMatch[0]
    segments.push({
      type: 'expression',
      expression: parseExpression(expression, template, readableOverrides)
    })

    lastIndex = expressionMatch.index + expressionMatch[0].length
  }

  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    if (remainingText) {
      segments.push({ type: 'text', content: remainingText })
    }
  }
}

/**
 * Get icon component name for a parsed expression
 */
export function getExpressionIcon(expression: ParsedExpression): string {
  return expression.icon || DATA_TYPE_ICONS[expression.dataType] || 'text'
}
