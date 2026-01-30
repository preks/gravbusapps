/**
 * Resolve {{entityKey.fieldPath}} placeholders in template content using entity data.
 * Supports multiple entities (job_candidate, company, company_address, etc.) and
 * nested paths like job_candidate.address.locality or company_address.locality.
 */

/** Convert camelCase to snake_case for API response key fallback */
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
}

/**
 * Get a value from an object by dot-separated path (e.g. "address.locality").
 * Tries snake_case key when camelCase lookup is undefined (some GraphQL backends return snake_case).
 */
function getByPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined
  const parts = path.split('.')
  let current: unknown = obj
  for (const key of parts) {
    if (current == null || typeof current !== 'object') return undefined
    const record = current as Record<string, unknown>
    let value = record[key]
    if (value === undefined && key !== camelToSnake(key)) {
      value = record[camelToSnake(key)]
    }
    current = value
  }
  return current
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
    return typeof (value as { displayName?: string }).displayName === 'string'
      ? (value as { displayName: string }).displayName
      : typeof (value as { name?: string }).name === 'string'
        ? (value as { name: string }).name
        : JSON.stringify(value)
  }
  return String(value)
}

/**
 * Replace {{entityKey.fieldPath}} placeholders in content with values from the entity data map.
 * Each key in entityDataMap is an entity key (e.g. job_candidate, company, company_address);
 * placeholders like {{company.name}} are replaced with getByPath(entityDataMap['company'], 'name').
 * Placeholders for entities not in the map are left as-is.
 */
export function resolvePlaceholders(content: string, entityDataMap: Record<string, Record<string, unknown>>): string
/**
 * @deprecated Use resolvePlaceholders(content, { [entityType]: data }) for multiple entities.
 * Single-entity overload: replaces only {{entityType.fieldPath}} with values from data.
 */
export function resolvePlaceholders(content: string, entityType: string, data: Record<string, unknown>): string
export function resolvePlaceholders(
  content: string,
  entityTypeOrMap: string | Record<string, Record<string, unknown>>,
  data?: Record<string, unknown>
): string {
  const map: Record<string, Record<string, unknown>> = typeof entityTypeOrMap === 'string' && data != null
    ? { [entityTypeOrMap]: data }
    : (entityTypeOrMap as Record<string, Record<string, unknown>>)

  const regex = /\{\{(\w+)\.([^}]+)\}\}/g
  return content.replace(regex, (_, entityKey: string, path: string) => {
    const entityData = map[entityKey]
    if (entityData == null) return _ // leave placeholder if no data
    const value = getByPath(entityData, path.trim())
    return formatValue(value)
  })
}

/** Same regex used for placeholder replacement */
const PLACEHOLDER_REGEX = /\{\{(\w+)\.([^}]+)\}\}/g

/**
 * Extract unique entity keys referenced in template content (e.g. {{job_candidate.firstName}} → job_candidate).
 * Useful for showing "Entities used in this template" in the editor side panel.
 */
export function extractEntityKeysFromContent(content: string): string[] {
  const keys = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = PLACEHOLDER_REGEX.exec(content)) !== null) {
    keys.add(m[1])
  }
  return Array.from(keys).sort()
}
