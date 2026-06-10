/**
 * Form Field Utilities
 * Utility functions for form field value transformations and formatting
 */

/**
 * Sanitize control ID for HTML attributes
 */
export const sanitizeControlId = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9-_:.]/g, '-').toLowerCase()
}

/**
 * Deep equality check for objects/arrays
 */
export const deepEquals = (a: unknown, b: unknown): boolean => {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch (error) {
    console.error('[EveryAI][FormFieldUtils] Failed deep comparison', error)
    return a === b
  }
}

/**
 * Convert any value to display string
 */
export const toDisplayString = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value == null) return ''
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Convert value to option ID for select elements
 */
export const toOptionId = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return toDisplayString(value)
}

/**
 * Format field name for display (e.g., "firstName" -> "First Name")
 */
export const formatFieldName = (name: string): string => {
  if (!name) return ''

  const lowerName = name.toLowerCase()

  // Employee ID should display as "Employee"
  if (lowerName === 'employeeid') {
    return 'Employee'
  }

  // Sender Employee ID should display as "Sender Employee"
  if (lowerName === 'senderemployeeid') {
    return 'Sender Employee'
  }

  let processedName = name
  if (processedName.endsWith('Ref')) {
    processedName = processedName.slice(0, -3)
  }
  return processedName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

/**
 * Get nested value from object by path (e.g., "user.name" -> obj.user.name)
 */
export const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

/**
 * Immutable nested assign: returns a new root object with `path` set to `value`.
 * Intermediate objects are shallow-cloned; does not mutate `root`.
 */
export const immutableSetByPath = <T extends Record<string, any>>(root: T, path: string, value: any): T => {
  const keys = path.split('.').filter(Boolean)
  if (keys.length === 0) return root
  if (keys.length === 1) {
    return { ...root, [keys[0]]: value }
  }
  const [head, ...rest] = keys
  const restPath = rest.join('.')
  const child = root[head]
  const nextBase =
    typeof child === 'object' && child !== null && !Array.isArray(child) ? (child as Record<string, any>) : {}
  return {
    ...root,
    [head]: immutableSetByPath(nextBase, restPath, value)
  }
}

/**
 * Set nested value in object by path
 */
export const setNestedValue = (obj: any, path: string, value: any): any => {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }
    return current[key]
  }, obj)
  target[lastKey] = value
  return obj
}

/**
 * Format date-time value for datetime-local input
 */
export const formatDateForInput = (dateValue: string | undefined): string => {
  if (!dateValue) return ''
  try {
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ''
  }
}

/**
 * Parse datetime-local input value to ISO string
 */
export const parseDateTimeInput = (inputValue: string): string | null => {
  if (!inputValue) return null
  const date = new Date(inputValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}
