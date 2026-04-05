function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

export function hasMeaningfulSchema(schema: unknown): schema is Record<string, unknown> {
  if (!isPlainObject(schema)) return false
  if (Object.keys(schema).length === 0) return false

  if (typeof schema.$ref === 'string' && schema.$ref.trim()) return true
  if (hasNonEmptyArray(schema.oneOf) || hasNonEmptyArray(schema.anyOf) || hasNonEmptyArray(schema.allOf)) return true
  if (schema.not && typeof schema.not === 'object') return true
  if (hasNonEmptyArray(schema.enum) || Object.prototype.hasOwnProperty.call(schema, 'const')) return true

  if (typeof schema.pattern === 'string' && schema.pattern.trim()) return true
  if (typeof schema.format === 'string' && schema.format.trim()) return true
  if (typeof schema.minimum === 'number' || typeof schema.maximum === 'number') return true
  if (typeof schema.minLength === 'number' || typeof schema.maxLength === 'number') return true
  if (typeof schema.minItems === 'number' || typeof schema.maxItems === 'number') return true
  if (typeof schema.minProperties === 'number' || typeof schema.maxProperties === 'number') return true

  if (isPlainObject(schema.properties) && Object.keys(schema.properties).length > 0) return true
  if (isPlainObject(schema.patternProperties) && Object.keys(schema.patternProperties).length > 0) return true
  if (hasNonEmptyArray(schema.required)) return true
  if (schema.additionalProperties !== undefined) return true
  if (schema.items !== undefined || hasNonEmptyArray(schema.prefixItems) || schema.contains !== undefined) return true

  const rawType = schema.type
  const types = Array.isArray(rawType) ? rawType.map(type => String(type || '').trim()) : [String(rawType || '').trim()]
  const normalizedTypes = types.filter(Boolean)
  if (!normalizedTypes.length) return false

  if (normalizedTypes.some(type => ['string', 'number', 'integer', 'boolean', 'null'].includes(type))) return true
  if (normalizedTypes.includes('array')) {
    return (
      schema.items !== undefined ||
      hasNonEmptyArray(schema.prefixItems) ||
      schema.contains !== undefined ||
      typeof schema.minItems === 'number' ||
      typeof schema.maxItems === 'number'
    )
  }
  if (normalizedTypes.includes('object')) {
    return (
      (isPlainObject(schema.properties) && Object.keys(schema.properties).length > 0) ||
      (isPlainObject(schema.patternProperties) && Object.keys(schema.patternProperties).length > 0) ||
      hasNonEmptyArray(schema.required) ||
      schema.additionalProperties !== undefined ||
      typeof schema.minProperties === 'number' ||
      typeof schema.maxProperties === 'number'
    )
  }

  return false
}

export function hasImplementedHandler(source: string): boolean {
  const text = String(source || '')
  if (!text.trim()) return false
  if (text.includes('assistant response was incomplete')) return false
  if (text.includes('Missing information to generate function')) return false
  if (text.includes('Your function code here')) return false
  return /module\.exports\.handler\s*=/.test(text)
}

export function getApplicableDraftUpdates(draft: {
  source?: string
  inputSchema?: unknown
  outputSchema?: unknown
  configKeys?: string[]
}) {
  return {
    source: hasImplementedHandler(String(draft.source || '')) ? String(draft.source) : null,
    inputSchemaText: hasMeaningfulSchema(draft.inputSchema) ? JSON.stringify(draft.inputSchema, null, 2) : null,
    outputSchemaText: hasMeaningfulSchema(draft.outputSchema) ? JSON.stringify(draft.outputSchema, null, 2) : null,
    configKeys: Array.isArray(draft.configKeys) && draft.configKeys.length ? draft.configKeys : null
  }
}
