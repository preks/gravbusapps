/**
 * Shared utilities for AI builder preview components (Agent, Function, etc.).
 */

export function friendlyLabel(key: string): string {
  const lower = key.toLowerCase().split('_').join(' ')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export interface SchemaTypeLabelOptions {
  stringLabel?: string
  objectLabel?: string
}

const DEFAULT_OPTIONS: Required<SchemaTypeLabelOptions> = {
  stringLabel: 'Text',
  objectLabel: 'Structured'
}

export function getSchemaTypeLabel(prop: Record<string, unknown>, options: SchemaTypeLabelOptions = {}): string {
  const { stringLabel, objectLabel } = { ...DEFAULT_OPTIONS, ...options }
  const type = (prop?.type as string) ?? 'string'
  const hasEnum = Array.isArray(prop?.enum) && (prop.enum as unknown[]).length > 0
  if (hasEnum) return 'Dropdown'
  switch (type) {
    case 'string':
      return stringLabel
    case 'number':
    case 'integer':
      return 'Number'
    case 'boolean':
      return 'Yes / No'
    case 'array':
      return 'List'
    case 'object':
      return objectLabel
    default:
      return stringLabel
  }
}
