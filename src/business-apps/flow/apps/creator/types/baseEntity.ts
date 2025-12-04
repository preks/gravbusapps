/**
 * Base Entity Interface
 *
 * Mirrors the BaseEntity contract from custom-flow-engine
 * All entities returned from the API must conform to this structure
 */

export interface BaseEntity {
  /**
   * Unique identifier (UUID or similar)
   */
  id: string

  /**
   * Business code/identifier
   */
  code: string

  /**
   * Human-readable display name
   */
  displayName: string

  /**
   * Entity type identifier
   */
  type: string

  /**
   * Optional description or summary
   */
  description?: string

  /**
   * Creation timestamp (ISO 8601)
   */
  createdAt?: string

  /**
   * Last update timestamp (ISO 8601)
   */
  updatedAt?: string

  /**
   * Allow entity-specific fields
   */
  [key: string]: any
}

/**
 * Type guard to check if an object is a valid BaseEntity
 * Note: code can be null in some cases, so we accept null or string
 */
export function isBaseEntity(obj: any): obj is BaseEntity {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    (typeof obj.code === 'string' || obj.code === null) &&
    typeof obj.displayName === 'string' &&
    typeof obj.type === 'string'
  )
}

/**
 * Validates that an entity has all required base fields
 */
export function validateBaseEntity(entity: any, entityType?: string): void {
  if (!entity) {
    throw new Error(`Entity is null or undefined${entityType ? ` for type: ${entityType}` : ''}`)
  }

  const requiredFields = ['id', 'code', 'displayName', 'type']
  const missingFields = requiredFields.filter(field => !entity[field])

  if (missingFields.length > 0) {
    throw new Error(
      `Entity${entityType ? ` of type '${entityType}'` : ''} is missing required base fields: ${missingFields.join(', ')}`
    )
  }

  if (entityType && entity.type !== entityType) {
    throw new Error(`Entity type mismatch: expected '${entityType}', got '${entity.type}'`)
  }
}

/**
 * Get display label for an entity using BaseEntity contract
 */
export function getEntityDisplayLabel(entity: BaseEntity): string {
  // BaseEntity guarantees displayName exists
  const displayName = entity.displayName
  const code = entity.code && entity.code !== entity.displayName ? ` [${entity.code}]` : ''
  return `${displayName}${code}`
}

/**
 * Get short display label (displayName only)
 */
export function getEntityShortLabel(entity: BaseEntity): string {
  return entity.displayName
}

/**
 * Get entity description for tooltips
 */
export function getEntityDescription(entity: BaseEntity): string {
  const parts: string[] = []

  if (entity.type) parts.push(`Type: ${entity.type}`)
  if (entity.code) parts.push(`Code: ${entity.code}`)
  if (entity.id) parts.push(`ID: ${entity.id}`)
  if (entity.description) parts.push(entity.description)

  return parts.join(' | ')
}
