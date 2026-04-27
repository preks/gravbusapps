/**
 * Utility functions for handling nullable fields consistently across MDM entities
 */

/**
 * Type helper to convert nullable fields to optional fields for domain types
 */
export type NullableToOptional<T> = {
  [K in keyof T]: T[K] extends string | null ? string : T[K] extends number | null ? number : T[K]
} & {
  [K in keyof T as T[K] extends string | null ? K : never]?: string
}

/**
 * Converts a nullable string to a non-null string for display purposes
 * @param value - The nullable string field
 * @param fallback - The fallback value to use when value is null (default: empty string)
 * @returns A non-null string
 */
export const normalizeString = (value: string | null, fallback: string = ''): string => {
  return value ?? fallback
}

/**
 * Converts a nullable description to a non-null string for display purposes
 * @param description - The nullable description field
 * @param fallback - The fallback value to use when description is null (default: empty string)
 * @returns A non-null string
 */
export const normalizeDescription = (description: string | null, fallback: string = ''): string => {
  return normalizeString(description, fallback)
}

/**
 * Converts a nullable number to a non-null number for calculations
 * @param value - The nullable number field
 * @param fallback - The fallback value to use when value is null (default: 0)
 * @returns A non-null number
 */
export const normalizeNumber = (value: number | null, fallback: number = 0): number => {
  return value ?? fallback
}

/**
 * Converts a non-null string to a nullable string for API/database operations
 * @param value - The non-null string field
 * @param treatEmptyAsNull - Whether to treat empty strings as null (default: true)
 * @returns A nullable string
 */
export const denormalizeString = (value: string, treatEmptyAsNull: boolean = true): string | null => {
  if (treatEmptyAsNull && value.trim() === '') {
    return null
  }
  return value
}

/**
 * Converts a non-null description to a nullable description for API/database operations
 * @param description - The non-null description field
 * @param treatEmptyAsNull - Whether to treat empty strings as null (default: true)
 * @returns A nullable string
 */
export const denormalizeDescription = (description: string, treatEmptyAsNull: boolean = true): string | null => {
  return denormalizeString(description, treatEmptyAsNull)
}

/**
 * Type guard to check if an entity has a valid (non-null, non-empty) string field
 * @param value - The string value to check
 * @returns True if the value is valid
 */
export const isValidString = (value: string | null | undefined): value is string => {
  return value != null && value.trim() !== ''
}

/**
 * Type guard to check if an entity has a valid (non-null, non-empty) description
 * @param entity - The entity to check
 * @returns True if the entity has a valid description
 */
export const hasValidDescription = (entity: { description?: string | null }): boolean => {
  return isValidString(entity.description)
}
