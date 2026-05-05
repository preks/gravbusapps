/**
 * React hook for fetching and caching entity schemas from backend
 *
 * Features:
 * - Fetches entity metadata from custom-flow-engine API
 * - Memory caching for performance
 * - localStorage fallback for offline scenarios
 * - Automatic retry on error
 * - Type-safe entity schema interfaces
 */

import { useCallback, useEffect, useState } from 'react'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

/**
 * Entity field types (const object for better Vite compatibility)
 */
export const EntityFieldType = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  EMAIL: 'email',
  URL: 'url',
  CURRENCY: 'currency',
  CATALOG: 'catalog',
  REFERENCE: 'reference',
  ARRAY: 'array',
  OBJECT: 'object'
} as const

/**
 * Entity field type union type
 */
export type EntityFieldTypeValue = (typeof EntityFieldType)[keyof typeof EntityFieldType]

/**
 * Entity field schema interface
 */
export interface EntityFieldSchema {
  name: string
  displayName: string
  type: EntityFieldTypeValue
  description?: string
  required?: boolean
  catalogName?: string
  referencedEntity?: string
  arrayItemType?: EntityFieldTypeValue
  fields?: EntityFieldSchema[]
  icon?: string
  category?: string
}

/**
 * Entity group filter definition
 * Used to pre-filter entities when browsing a specific group
 */
export interface EntityGroupFilter {
  field: string
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'like' | 'ilike' | 'isNull' | 'isNotNull'
  value: any
}

/**
 * Entity group definition for hierarchical navigation
 * Supports recursive nesting via children property
 */
export interface EntityGroup {
  key: string
  displayName: string
  description?: string
  icon?: string
  filter: EntityGroupFilter
  children?: EntityGroup[]
  exampleId?: string
}

/**
 * Entity schema interface
 */
export interface EntitySchema {
  type: string
  displayName: string
  description: string
  icon?: string
  apiEndpoint?: string
  exampleId?: string
  fields: EntityFieldSchema[]
  groups?: EntityGroup[]
}

/**
 * Entity schemas response from API
 */
export interface EntitySchemasResponse {
  schemas: Record<string, EntitySchema>
  meta: {
    count: number
    types: string[]
    version: string
    timestamp: string
  }
}

type EntitySchemasApiResponse =
  | { schemas?: Record<string, EntitySchema>; entities?: Record<string, EntitySchema> }
  | EntitySchema[]

function buildSchemaRecord(response: EntitySchemasApiResponse): Record<string, EntitySchema> | null {
  if (Array.isArray(response)) {
    return response.reduce<Record<string, EntitySchema>>((schemaRecord, schema) => {
      const type = String(schema?.type || '')
        .trim()
        .toLowerCase()
      if (type) {
        schemaRecord[type] = schema
      }

      return schemaRecord
    }, {})
  }

  if ('schemas' in response && response.schemas) {
    return response.schemas
  }

  if ('entities' in response && response.entities) {
    return response.entities
  }

  return null
}

/**
 * Hook options
 */
export interface UseEntitySchemasOptions {
  enableCache?: boolean
}

/**
 * Hook return value
 */
export interface UseEntitySchemasResult {
  schemas: Record<string, EntitySchema> | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Cache configuration
 */
const CACHE_KEY = 'entity-schemas-cache'
const CACHE_TTL = 3600000
const MEMORY_CACHE: {
  data: Record<string, EntitySchema> | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

/**
 * Get cached schemas from localStorage
 */
const getCachedSchemas = (): Record<string, EntitySchema> | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const parsed = JSON.parse(cached)
    const age = Date.now() - parsed.timestamp

    if (age < CACHE_TTL) {
      console.debug('Using cached entity schemas from localStorage', {
        age: Math.floor(age / 1000),
        count: Object.keys(parsed.data || {}).length
      })
      return parsed.data
    }

    localStorage.removeItem(CACHE_KEY)
    return null
  } catch (error) {
    console.error('Failed to read cached entity schemas', error)
    return null
  }
}

/**
 * Save schemas to localStorage cache
 */
const setCachedSchemas = (schemas: Record<string, EntitySchema>): void => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: schemas,
        timestamp: Date.now()
      })
    )
    console.debug('Cached entity schemas to localStorage', {
      count: Object.keys(schemas).length
    })
  } catch (error) {
    console.error('Failed to cache entity schemas', error)
  }
}

/**
 * Get cached schemas from memory
 */
const getMemoryCachedSchemas = (): Record<string, EntitySchema> | null => {
  const age = Date.now() - MEMORY_CACHE.timestamp
  if (age < CACHE_TTL && MEMORY_CACHE.data) {
    console.debug('Using cached entity schemas from memory', {
      age: Math.floor(age / 1000)
    })
    return MEMORY_CACHE.data
  }
  return null
}

/**
 * Save schemas to memory cache
 */
const setMemoryCachedSchemas = (schemas: Record<string, EntitySchema>): void => {
  MEMORY_CACHE.data = schemas
  MEMORY_CACHE.timestamp = Date.now()
}

/**
 * Clear all caches
 */
export const clearEntitySchemasCache = (): void => {
  MEMORY_CACHE.data = null
  MEMORY_CACHE.timestamp = 0
  localStorage.removeItem(CACHE_KEY)
  console.info('Cleared entity schemas cache')
}

/**
 * Hook to fetch and cache entity schemas
 */
export const useEntitySchemas = (options: UseEntitySchemasOptions = {}): UseEntitySchemasResult => {
  const { enableCache = true } = options

  const [schemas, setSchemas] = useState<Record<string, EntitySchema> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Fetch entity schemas from backend
   */
  const fetchSchemas = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (enableCache) {
        const memoryCachedSchemas = getMemoryCachedSchemas()
        if (memoryCachedSchemas) {
          setSchemas(memoryCachedSchemas)
          setIsLoading(false)
          return
        }

        const diskCachedSchemas = getCachedSchemas()
        if (diskCachedSchemas) {
          setSchemas(diskCachedSchemas)
          setMemoryCachedSchemas(diskCachedSchemas)
          setIsLoading(false)
          return
        }
      }

      const url = `${CUSTOM_FLOW_ENGINE_API_URL}/v1/custom-data/internal-entities`
      console.debug('Fetching entity schemas', { url })

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch entity schemas: ${response.status} ${response.statusText}`)
      }

      const data: EntitySchemasApiResponse = await response.json()
      const schemas = buildSchemaRecord(data)
      if (!schemas) {
        throw new Error('Invalid response: missing entities/schemas')
      }

      console.log('Entity schemas fetched successfully:', {
        count: Object.keys(schemas).length,
        types: Object.keys(schemas)
      })

      if (enableCache) {
        setMemoryCachedSchemas(schemas)
        setCachedSchemas(schemas)
      }

      setSchemas(schemas)
    } catch (error) {
      const errorObject = error instanceof Error ? error : new Error('Unknown error')
      console.error('Failed to fetch entity schemas:', errorObject)
      setError(errorObject)

      if (enableCache) {
        const cachedSchemas = getCachedSchemas()
        if (cachedSchemas) {
          console.warn('Using stale cached entity schemas as fallback')
          setSchemas(cachedSchemas)
          setMemoryCachedSchemas(cachedSchemas)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [enableCache])

  /**
   * Fetch on mount and when options change
   */
  useEffect(() => {
    fetchSchemas()
  }, [fetchSchemas])

  return {
    schemas,
    isLoading,
    error,
    refetch: fetchSchemas
  }
}

/**
 * Get specific entity schema
 */
export const getEntitySchema = (
  schemas: Record<string, EntitySchema> | null,
  entityType: string
): EntitySchema | null => {
  if (!schemas) return null
  return schemas[entityType.toLowerCase()] || null
}

/**
 * Get all registered entity types
 */
export const getRegisteredEntityTypes = (schemas: Record<string, EntitySchema> | null): string[] => {
  if (!schemas) return []
  return Object.keys(schemas)
}

/**
 * Get fields grouped by category
 */
export const getFieldsByCategory = (schema: EntitySchema | null): Record<string, EntityFieldSchema[]> => {
  if (!schema) return {}

  const groupedFields: Record<string, EntityFieldSchema[]> = {}

  for (const field of schema.fields) {
    const categoryKey = field.category || 'other'
    if (!groupedFields[categoryKey]) {
      groupedFields[categoryKey] = []
    }
    groupedFields[categoryKey].push(field)
  }

  return groupedFields
}
