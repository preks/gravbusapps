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
  /** The raw expression string including {{ }} */
  raw: string
  /** Human-readable label for the field */
  label: string
  /** Source type (workflow, step, catalog, entity) */
  sourceType: ExpressionSourceType
  /** Contextual source description (e.g., "Step 1: Submit Request") */
  sourceContext: string
  /** Icon name to display */
  icon: string
  /** Data type of the field */
  dataType: 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'object' | 'array' | 'file' | 'user'
  /** For step expressions, the step index */
  stepIndex?: number
  /** For entity expressions, the entity type */
  entityType?: string
  /** For catalog expressions, the catalog identifier */
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
  | { type: 'file-link'; fileName: ParsedExpression; downloadPath: ParsedExpression } // Legacy support
  | { type: 'entity-ref'; entityType: string; expression: ParsedExpression } // Legacy support
  | { type: 'entity-structured'; entityType: string; nameExpression: ParsedExpression; idExpression: ParsedExpression } // Legacy support

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
  // Check for readable override first
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

  // Remove {{ }} wrapper
  const inner = expression.replace(/^\{\{/, '').replace(/\}\}$/, '').trim()

  // Parse based on prefix
  if (inner.startsWith('$workflow')) {
    return parseWorkflowExpression(expression, inner)
  }

  if (inner.startsWith('$steps')) {
    return parseStepExpression(expression, inner, template)
  }

  if (inner.startsWith('$catalog')) {
    return parseCatalogExpression(expression, inner)
  }

  if (inner.startsWith('$entity')) {
    return parseEntityExpression(expression, inner)
  }

  // Unknown expression type
  return {
    raw: expression,
    label: inner,
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

  // Determine label
  let label = fieldName
  if (nestedPath) {
    label = nestedPath.split('.').pop() || fieldName
  }

  // Capitalize first letter for display
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1)

  // Determine data type and icon
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
  // parts: ['$steps', 'step_0', 'formData', 'fieldName', ...]

  const stepPart = parts[1] || ''
  const stepIndexMatch = /step_(\d+)/.exec(stepPart)
  const stepIndex = stepIndexMatch ? Number.parseInt(stepIndexMatch[1], 10) : 0

  const stepFieldType = parts[2] || '' // formData, resultData, status, etc.
  const fieldName = parts.slice(3).join('.') || stepFieldType

  // Handle file paths like field1[0].fileName or field1[0].downloadPath
  // Extract the base field name (without array accessor and property)
  const filePathRegex = /^([^[]+)\[\d+\]\.(fileName|downloadPath)$/
  const filePathMatch = filePathRegex.exec(fieldName)
  const isFilePath = !!filePathMatch
  const baseFieldName = filePathMatch ? filePathMatch[1] : fieldName.split('[')[0]

  // Get step info from template
  const step = template?.steps[stepIndex]
  const stepTitle = step?.title || `Step ${stepIndex + 1}`

  // Determine label
  let label = baseFieldName
  let icon = STEP_FIELD_ICONS[stepFieldType] || 'text'
  let dataType: ParsedExpression['dataType'] = 'string'

  if (stepFieldType === 'formData' && step?.form) {
    // Try to find the field in the form using the base field name
    const formField = step.form.find(f => f.name === baseFieldName)
    if (formField) {
      label = formField.label || formField.name
      // Map input type to data type
      dataType = mapInputTypeToDataType(formField.type)
      icon = getIconForInputType(formField.type)
    }

    // For file paths, use the field label with "File" prefix
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

  // Capitalize first letter if not already
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
  // Match patterns like: $catalog.Countries['DE'].label or $catalog.Countries[DE].label
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

  // Format catalog name for display
  const catalogName = catalogId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  let label = fieldPath || entryId || catalogId
  // Capitalize first letter
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
  // parts: ['$entity', 'employee', 'uuid-or-code', 'fieldName']

  const entityType = parts[1] || 'entity'
  const entityId = parts[2] || ''
  const fieldName = parts.slice(3).join('.') || 'displayName'

  // Format entity type for display
  const entityTypeName = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  // Determine icon based on entity type
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

  // Short entity ID for display
  const shortId = entityId.length > 8 ? `${entityId.slice(0, 8)}...` : entityId

  // Label shows field, context shows entity
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

  // Handle new URL-style file pattern: file://{{id}}/name/{{name}}/url/{{url}}
  const fileUrlRegex = /file:\/\/(\{\{[^}]+\}\})(?:\/name\/(\{\{[^}]+\}\}))?(?:\/url\/(\{\{[^}]+\}\}))?/g
  let fileUrlMatch

  while ((fileUrlMatch = fileUrlRegex.exec(value)) !== null) {
    const idExpr = fileUrlMatch[1]
    const nameExpr = fileUrlMatch[2]
    const urlExpr = fileUrlMatch[3]

    specialSegments.push({
      start: fileUrlMatch.index,
      end: fileUrlMatch.index + fileUrlMatch[0].length,
      segment: {
        type: 'file-url',
        id: parseExpression(idExpr, template, readableOverrides),
        name: nameExpr ? parseExpression(nameExpr, template, readableOverrides) : undefined,
        url: urlExpr ? parseExpression(urlExpr, template, readableOverrides) : undefined
      }
    })
  }

  // Handle new URL-style entity pattern: employee://{{id}}
  specialSegments.push(...extractEntityUrlSegments(value, template, readableOverrides))

  // Legacy: Handle FILE_LINK pattern: FILE_LINK::name{{...}}::urlfile://{{...}}
  const fileLinkRegex = /FILE_LINK::name(\{\{[^}]+\}\})::urlfile:\/\/(\{\{[^}]+\}\})/g
  let fileLinkMatch

  while ((fileLinkMatch = fileLinkRegex.exec(value)) !== null) {
    const nameExpr = fileLinkMatch[1]
    const downloadExpr = fileLinkMatch[2]

    specialSegments.push({
      start: fileLinkMatch.index,
      end: fileLinkMatch.index + fileLinkMatch[0].length,
      segment: {
        type: 'file-link',
        fileName: parseExpression(nameExpr, template, readableOverrides),
        downloadPath: parseExpression(downloadExpr, template, readableOverrides)
      }
    })
  }

  // Sort all special segments by position
  specialSegments.sort((a, b) => a.start - b.start)

  // Now parse the remaining text and regular expressions
  let currentPos = 0

  for (const special of specialSegments) {
    // Process text before this special segment
    if (special.start > currentPos) {
      const beforeText = value.slice(currentPos, special.start)
      parseTextAndExpressions(beforeText, segments, template, readableOverrides)
    }

    // Add the special segment
    segments.push(special.segment)
    currentPos = special.end
  }

  // Process remaining text after all special segments
  if (currentPos < value.length) {
    const remainingText = value.slice(currentPos)
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
    // Skip if already matched by file URL pattern
    if (entityUrlMatch[1].toLowerCase() === 'file') continue

    const entityType = entityUrlMatch[1]
    const idExpr = entityUrlMatch[2]

    segments.push({
      start: entityUrlMatch.index,
      end: entityUrlMatch.index + entityUrlMatch[0].length,
      segment: {
        type: 'entity-url',
        entityType,
        id: parseExpression(idExpr, template, readableOverrides)
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
  let match

  while ((match = expressionRegex.exec(text)) !== null) {
    // Add text before expression
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index)
      if (textContent) {
        segments.push({ type: 'text', content: textContent })
      }
    }

    // Add expression
    const expression = match[0]
    segments.push({
      type: 'expression',
      expression: parseExpression(expression, template, readableOverrides)
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
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
