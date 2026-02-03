/**
 * Resolve {{entityKey.fieldPath}} placeholders in template content using entity data.
 * Supports multiple entities (job_candidate, company, company_address, etc.) and
 * nested paths like job_candidate.address.locality or company_address.locality.
 */

/** Convert camelCase to snake_case for API response key fallback */
function camelToSnake(s: string): string {
  return s.replaceAll(/[A-Z]/g, c => `_${c.toLowerCase()}`)
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

/** Format ISO date string to dd/mm/yyyy */
function formatDateString(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/** Check if string looks like an ISO date (e.g. 2026-02-09 or 2026-02-09T00:00:00) */
function isIsoDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(s.trim())
}

/** Format probation-period JSON (e.g. {"value":3,"unit":"months"}) as "3 months". Returns empty if not valid. */
function formatProbationPeriod(value: string): string {
  try {
    const parsed = JSON.parse(value) as { value?: number; unit?: string }
    if (parsed != null && typeof parsed.value === 'number' && typeof parsed.unit === 'string') {
      return `${parsed.value} ${parsed.unit}`
    }
  } catch {
    // not JSON or wrong shape
  }
  return ''
}

/** Get string from object with camelCase/snake_case fallback */
function getStr(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key] ?? obj[camelToSnake(key)]
  return typeof v === 'string' ? v : undefined
}

/** Get nested object with camelCase/snake_case fallback */
function getObj(obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const v = obj[key] ?? obj[camelToSnake(key)]
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined
}

/**
 * Format address-like objects (company_address, primary, streetAddress, etc.) as a single readable line.
 * Returns empty string if value is not address-like.
 */
function formatAddressLike(value: unknown): string {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return ''
  const o = value as Record<string, unknown>

  // Simple shape: { streetAddress: "..." }
  const streetAddress = getStr(o, 'streetAddress')
  if (streetAddress) {
    const parts = [streetAddress, getStr(o, 'locality'), getStr(o, 'postalCode')].filter(Boolean)
    return parts.join(', ')
  }

  // Nested shape: { primary: { locality, postalCode, addressLine: { lines: [] } } }
  const primary = getObj(o, 'primary') ?? o
  const locality = getStr(primary, 'locality')
  const postalCode = getStr(primary, 'postalCode')
  const addressLine = getObj(primary, 'addressLine')
  const linesArr = addressLine?.lines ?? addressLine?.addressLine
  const lines = Array.isArray(linesArr)
    ? (linesArr as string[]).filter(l => typeof l === 'string').join(', ')
    : (getStr(primary, 'addressLine') ?? getStr(primary, 'streetAddress') ?? '')

  const parts = [lines, locality, postalCode].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return ''
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') {
    if (isIsoDateString(value)) return formatDateString(value)
    const probationFormatted = formatProbationPeriod(value)
    if (probationFormatted) return probationFormatted
  }
  if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
    const addressFormatted = formatAddressLike(value)
    if (addressFormatted) return addressFormatted
    const obj = value as { displayName?: string; name?: string }
    if (typeof obj.displayName === 'string') return obj.displayName
    if (typeof obj.name === 'string') return obj.name
    return JSON.stringify(value)
  }
  if (typeof value === 'object' && value !== null) return JSON.stringify(value)
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

  // Allow optional whitespace inside {{ }} so "{{ job_candidate.firstName }}" still matches
  const regex = /\{\{\s*(\w+)\s*\.\s*([^}]+)\s*\}\}/g
  return content.replaceAll(regex, (match: string, entityKey: string, path: string) => {
    const keyTrimmed = entityKey.trim()
    const pathTrimmed = path.trim()
    if (keyTrimmed.toLowerCase() === 'today') {
      if (pathTrimmed.toLowerCase() === 'date' || pathTrimmed.toLowerCase() === 'dateonly') {
        return formatDateString(new Date().toISOString())
      }
    }
    // Case-insensitive entity lookup (templates may use Job_Candidate vs job_candidate)
    const entry = Object.entries(map).find(([k]) => k.toLowerCase() === keyTrimmed.toLowerCase())
    const entityData = map[keyTrimmed] ?? map[keyTrimmed.toLowerCase()] ?? entry?.[1]
    if (entityData == null) return match
    const value = getByPath(entityData, pathTrimmed)
    return formatValue(value)
  })
}

/** Same regex used for placeholder replacement (allows optional whitespace inside braces) */
const PLACEHOLDER_REGEX = /\{\{\s*(\w+)\s*\.\s*([^}]+)\s*\}\}/g

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
  return Array.from(keys).sort((a, b) => a.localeCompare(b))
}
