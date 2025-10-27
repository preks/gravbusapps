/**
 * 🔧 Query Helpers for Mock GraphQL Client
 *
 * Provides common utilities for filtering, sorting, pagination, and variable extraction
 * that are used across all query handlers.
 */

export interface MockGraphQLVariables {
  offset?: number
  limit?: number
  where?: any
  orderBy?: any[]
  id?: string
  productId?: string
  parentProductId?: string
  componentProductId?: string
  // Sales-specific variables
  customerAccountId?: string
  salesOrderId?: string
  salesQuoteId?: string
  invoiceId?: string
  status?: string
  catalogType?: string
  [key: string]: any
}

export interface MockGraphQLResponse<T = any> {
  [key: string]: T
}

export interface PaginatedResponse<T> {
  data: T[]
  aggregate?: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Extract variables from GraphQL query string
 * Note: This is a simplified implementation for mock purposes
 */
export const extractVariables = (): MockGraphQLVariables => {
  // For now, return empty object as variables are typically passed separately
  // In a real implementation, this would parse inline variables or receive them as a parameter
  return {}
}

/**
 * Apply filtering to data based on GraphQL where conditions
 */
export const applyFilters = (data: any[], whereCondition?: any): any[] => {
  if (!whereCondition || !data) {
    return data || []
  }

  return data.filter(item => {
    return evaluateWhereCondition(item, whereCondition)
  })
}

/**
 * Recursively evaluate GraphQL where conditions
 */
const evaluateWhereCondition = (item: any, condition: any): boolean => {
  if (!condition) return true

  // Handle _and conditions
  if (condition._and) {
    return condition._and.every((subCondition: any) => evaluateWhereCondition(item, subCondition))
  }

  // Handle _or conditions
  if (condition._or) {
    return condition._or.some((subCondition: any) => evaluateWhereCondition(item, subCondition))
  }

  // Handle _not conditions
  if (condition._not) {
    return !evaluateWhereCondition(item, condition._not)
  }

  // Handle field-level conditions
  for (const [field, fieldCondition] of Object.entries(condition)) {
    if (field.startsWith('_')) continue // Skip GraphQL operators

    const itemValue = getNestedValue(item, field)

    if (!evaluateFieldCondition(itemValue, fieldCondition)) {
      return false
    }
  }

  return true
}

/**
 * Get nested value from object using dot notation (e.g., 'product.name')
 */
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
}

/**
 * Evaluate field-level conditions (_eq, _neq, _ilike, etc.)
 */
const evaluateFieldCondition = (value: any, condition: any): boolean => {
  if (typeof condition !== 'object' || condition === null) {
    // Direct equality check
    return value === condition
  }

  for (const [operator, conditionValue] of Object.entries(condition)) {
    switch (operator) {
      case '_eq':
        if (value !== conditionValue) return false
        break
      case '_neq':
        if (value === conditionValue) return false
        break
      case '_ilike':
        if (
          !value ||
          !value
            .toString()
            .toLowerCase()
            .includes((conditionValue as string).toString().toLowerCase().replace(/%/g, ''))
        ) {
          return false
        }
        break
      case '_like':
        if (!value || !value.toString().includes((conditionValue as string).toString().replace(/%/g, ''))) {
          return false
        }
        break
      case '_gt':
        if (value <= (conditionValue as number)) return false
        break
      case '_gte':
        if (value < (conditionValue as number)) return false
        break
      case '_lt':
        if (value >= (conditionValue as number)) return false
        break
      case '_lte':
        if (value > (conditionValue as number)) return false
        break
      case '_in':
        if (!Array.isArray(conditionValue) || !conditionValue.includes(value)) {
          return false
        }
        break
      case '_nin':
        if (Array.isArray(conditionValue) && conditionValue.includes(value)) {
          return false
        }
        break
      case '_is_null':
        if (conditionValue && value !== null) return false
        if (!conditionValue && value === null) return false
        break
      default:
        // Unknown operator, treat as nested condition
        if (!evaluateWhereCondition(value, { [operator]: conditionValue })) {
          return false
        }
    }
  }

  return true
}

/**
 * Apply sorting to data based on GraphQL orderBy conditions
 */
export const applySorting = (data: any[], orderBy?: any[]): any[] => {
  if (!orderBy || !Array.isArray(orderBy) || orderBy.length === 0) {
    return data
  }

  return [...data].sort((a, b) => {
    for (const sortField of orderBy) {
      for (const [field, direction] of Object.entries(sortField)) {
        const valueA = getNestedValue(a, field)
        const valueB = getNestedValue(b, field)

        let comparison = 0

        // Handle null/undefined values
        if (valueA == null && valueB == null) {
          comparison = 0
        } else if (valueA == null) {
          comparison = -1
        } else if (valueB == null) {
          comparison = 1
        } else {
          // Compare values
          if (valueA < valueB) comparison = -1
          else if (valueA > valueB) comparison = 1
        }

        // Apply direction
        if (direction === 'DESC') {
          comparison = -comparison
        }

        if (comparison !== 0) {
          return comparison
        }
      }
    }

    return 0
  })
}

/**
 * Apply pagination to data
 */
export const applyPagination = (data: any[], offset?: number, limit?: number): any[] => {
  if (!data) return []

  const start = offset || 0
  const end = limit ? start + limit : data.length

  return data.slice(start, end)
}

/**
 * Create paginated response with aggregate count
 */
export const createPaginatedResponse = <T>(
  data: T[],
  totalCount: number,
  entityName: string,
  offset?: number,
  limit?: number
): MockGraphQLResponse => {
  const paginatedData = applyPagination(data, offset, limit)

  return {
    [entityName]: paginatedData,
    [`${entityName}Aggregate`]: {
      aggregate: {
        count: totalCount
      }
    }
  }
}

/**
 * Simple response for single entity queries
 */
export const createSimpleResponse = <T>(data: T[], entityName: string): MockGraphQLResponse => {
  return {
    [entityName]: data
  }
}

/**
 * Check if query is requesting specific ID
 */
export const isIdQuery = (variables: MockGraphQLVariables): boolean => {
  return Boolean(variables.id)
}

/**
 * Extract entity ID from where condition
 */
export const extractIdFromWhere = (whereCondition?: any): string | null => {
  if (!whereCondition) return null

  if (whereCondition.id && whereCondition.id._eq) {
    return whereCondition.id._eq
  }

  return null
}
