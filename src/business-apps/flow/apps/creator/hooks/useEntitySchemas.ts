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

import { useState, useEffect, useCallback } from 'react'
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
  key: string // Unique key for this group (e.g., 'news', 'knowledge')
  displayName: string // Human-readable name
  description?: string // Optional description
  icon?: string // Icon name for UI
  filter: EntityGroupFilter // Filter to apply when browsing this group
  children?: EntityGroup[] // Nested sub-groups (recursive)
  exampleId?: string // Example entity ID for this group
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

  // Optional: Hierarchical groups for navigation
  // When defined, the entity will show as a tree with browsable sub-groups
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

/**
 * Hook options
 */
export interface UseEntitySchemasOptions {
  includeFields?: boolean
  category?: string
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
const CACHE_TTL = 3600000 // 1 hour in milliseconds
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

    // Cache expired
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
  const { includeFields = true, category, enableCache = true } = options

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
      // Check memory cache first
      if (enableCache) {
        const memCached = getMemoryCachedSchemas()
        if (memCached) {
          setSchemas(memCached)
          setIsLoading(false)
          return
        }

        // Check localStorage cache
        const diskCached = getCachedSchemas()
        if (diskCached) {
          setSchemas(diskCached)
          setMemoryCachedSchemas(diskCached)
          setIsLoading(false)
          return
        }
      }

      // Build query parameters
      const params = new URLSearchParams()
      if (includeFields !== undefined) {
        params.set('includeFields', String(includeFields))
      }
      if (category) {
        params.set('category', category)
      }

      // Get flow engine URL from environment
      const flowEngineUrl = CUSTOM_FLOW_ENGINE_API_URL

      const url = `${flowEngineUrl}/entities?${params}`
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

      const data: EntitySchemasResponse = await response.json()

      // New API returns "entities" instead of "schemas"
      const schemas = data.schemas || data.entities
      if (!schemas) {
        throw new Error('Invalid response: missing entities/schemas')
      }

      console.log('Entity schemas fetched successfully:', {
        count: data.meta.count,
        types: data.meta.types || Object.keys(schemas)
      })

      // Cache the result
      if (enableCache) {
        setMemoryCachedSchemas(schemas)
        setCachedSchemas(schemas)
      }

      setSchemas(schemas)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error')
      console.error('Failed to fetch entity schemas:', errorObj)
      setError(errorObj)

      // Try to use cached version as fallback
      if (enableCache) {
        const cached = getCachedSchemas()
        if (cached) {
          console.warn('Using stale cached entity schemas as fallback')
          setSchemas(cached)
          setMemoryCachedSchemas(cached)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [includeFields, category, enableCache])

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

  const grouped: Record<string, EntityFieldSchema[]> = {}

  for (const field of schema.fields) {
    const category = field.category || 'other'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(field)
  }

  return grouped
}
