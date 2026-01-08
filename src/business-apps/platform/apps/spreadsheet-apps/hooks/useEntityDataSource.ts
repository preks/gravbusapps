/**
 * useEntityDataSource Hook
 *
 * Fetches and manages entity data from NEWWORK system for spreadsheet apps.
 * Uses the flow-engine datasource API to query entities with filters.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { env } from '@/common/env/EnvUtils'
import type {
  EntityDataSource,
  EntityDataResult,
  EntityDataLoadState,
  EntityFilterGroup,
  EntitySortConfig,
  AvailableEntity,
  EntityField
} from '../types/entityDataSource'

/**
 * Filter operator mapping from our types to API types
 */
const OPERATOR_MAP: Record<string, string> = {
  eq: 'eq',
  neq: 'neq',
  gt: 'gt',
  gte: 'gte',
  lt: 'lt',
  lte: 'lte',
  in: 'in',
  nin: 'nin',
  like: 'like',
  ilike: 'ilike',
  isNull: 'isNull',
  isNotNull: 'isNotNull',
  contains: 'contains'
}

/**
 * Options for the hook
 */
export interface UseEntityDataSourceOptions {
  /** Access token for API authentication */
  accessToken: string
  /** Current user ID for variable substitution */
  userId?: string
}

/**
 * Hook result
 */
export interface UseEntityDataSourceResult {
  /** Current loading state */
  state: EntityDataLoadState
  /** Load data for a data source configuration */
  loadData: (dataSource: EntityDataSource) => Promise<EntityDataResult | null>
  /** Refresh data using the last configuration */
  refresh: () => Promise<EntityDataResult | null>
  /** Clear loaded data */
  clear: () => void
  /** Available entities from schema */
  availableEntities: AvailableEntity[]
  /** Whether entities are loading */
  isLoadingEntities: boolean
  /** Fetch available entities */
  fetchAvailableEntities: () => Promise<void>
  /** Get fields for a specific entity */
  getEntityFields: (entityType: string) => EntityField[]
}

/**
 * Get the flow engine API URL
 */
function getApiUrl(): string {
  return env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
}

/**
 * Substitute template variables in filter values
 */
function substituteVariables(value: unknown, userId?: string): unknown {
  if (typeof value !== 'string') return value

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const replacements: Record<string, string> = {
    '{{currentUserId}}': userId || '',
    '{{today}}': now.toISOString().split('T')[0],
    '{{now}}': now.toISOString(),
    '{{startOfMonth}}': startOfMonth.toISOString(),
    '{{endOfMonth}}': endOfMonth.toISOString(),
    '{{startOfYear}}': startOfYear.toISOString()
  }

  let result = value
  for (const [template, replacement] of Object.entries(replacements)) {
    result = result.replace(template, replacement)
  }

  return result
}

/**
 * Convert filter group to API filter format
 */
function buildApiFilters(
  group: EntityFilterGroup,
  userId?: string
): Array<{ field: string; operator: string; value: unknown }> {
  const filters: Array<{ field: string; operator: string; value: unknown }> = []

  // Process conditions
  for (const condition of group.conditions) {
    if (!condition.isActive) continue

    const value = substituteVariables(condition.value, userId)

    // Skip empty values (except for isNull/isNotNull)
    if (value === null || value === undefined || value === '') {
      if (condition.operator !== 'isNull' && condition.operator !== 'isNotNull') {
        continue
      }
    }

    filters.push({
      field: condition.field,
      operator: OPERATOR_MAP[condition.operator] || condition.operator,
      value
    })
  }

  // Process nested groups (flatten them for now - API may not support complex nesting)
  if (group.groups) {
    for (const nestedGroup of group.groups) {
      filters.push(...buildApiFilters(nestedGroup, userId))
    }
  }

  return filters
}

/**
 * Convert sort config to API format
 */
function buildApiOrderBy(orderBy: EntitySortConfig[]): Array<{ field: string; direction: string }> {
  return orderBy.map(sort => ({
    field: sort.field,
    direction: sort.direction
  }))
}

/**
 * Hook for entity data source management
 */
export function useEntityDataSource(options: UseEntityDataSourceOptions): UseEntityDataSourceResult {
  const { accessToken, userId } = options

  // State
  const [state, setState] = useState<EntityDataLoadState>({
    isLoading: false,
    isLoaded: false,
    data: null,
    error: null
  })
  const [availableEntities, setAvailableEntities] = useState<AvailableEntity[]>([])
  const [isLoadingEntities, setIsLoadingEntities] = useState(false)

  // Refs for last config (for refresh)
  const lastDataSourceRef = useRef<EntityDataSource | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Fetch available entities from the schema API
   */
  const fetchAvailableEntities = useCallback(async () => {
    if (isLoadingEntities) return

    setIsLoadingEntities(true)

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/entities?includeFields=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch entities: ${response.status}`)
      }

      const data = await response.json()
      const entities = data.entities || data.schemas || {}

      // Convert to array format
      const entityList: AvailableEntity[] = Object.entries(entities).map(([type, schema]: [string, any]) => ({
        type,
        displayName: schema.displayName || type,
        description: schema.description || '',
        icon: schema.icon,
        category: schema.category,
        fields: (schema.fields || []).map((f: any) => ({
          name: f.name,
          displayName: f.displayName || f.name,
          type: f.type,
          description: f.description,
          required: f.required,
          referencedEntity: f.referencedEntity,
          catalogName: f.catalogName,
          icon: f.icon,
          category: f.category,
          fields: f.fields
        })),
        exampleId: schema.exampleId
      }))

      setAvailableEntities(entityList)
    } catch (error) {
      console.error('[useEntityDataSource] Failed to fetch entities:', error)
    } finally {
      setIsLoadingEntities(false)
    }
  }, [accessToken, isLoadingEntities])

  /**
   * Get fields for a specific entity type
   */
  const getEntityFields = useCallback(
    (entityType: string): EntityField[] => {
      const entity = availableEntities.find(e => e.type.toLowerCase() === entityType.toLowerCase())
      return entity?.fields || []
    },
    [availableEntities]
  )

  /**
   * Load data from an entity data source
   */
  const loadData = useCallback(
    async (dataSource: EntityDataSource): Promise<EntityDataResult | null> => {
      if (!dataSource.enabled) {
        return null
      }

      // Cancel any in-progress request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      // Store for refresh
      lastDataSourceRef.current = dataSource

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }))

      try {
        const apiUrl = getApiUrl()

        // Build query parameters
        const params = new URLSearchParams()

        // Limit
        if (dataSource.limit > 0) {
          params.set('limit', String(dataSource.limit))
        }

        // Filters
        const filters = buildApiFilters(dataSource.filters, userId)
        if (filters.length > 0) {
          params.set('filters', JSON.stringify(filters))
        }

        // Order by
        if (dataSource.orderBy.length > 0) {
          params.set('orderBy', JSON.stringify(buildApiOrderBy(dataSource.orderBy)))
        }

        const queryString = params.toString()
        const url = `${apiUrl}/api/datasource/${dataSource.entityType}${queryString ? `?${queryString}` : ''}`

        console.log('[useEntityDataSource] Loading data from:', url)

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          },
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        const result: EntityDataResult = {
          records: data.entities || [],
          total: data.meta?.total || data.entities?.length || 0,
          count: data.entities?.length || 0,
          hasMore: data.meta?.hasMore || false,
          entityType: dataSource.entityType,
          fetchedAt: new Date().toISOString()
        }

        setState({
          isLoading: false,
          isLoaded: true,
          data: result,
          error: null
        })

        console.log('[useEntityDataSource] Loaded', result.count, 'records for', dataSource.entityType)

        return result
      } catch (error) {
        // Don't update state if aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return null
        }

        const errorMessage = error instanceof Error ? error.message : 'Failed to load data'
        console.error('[useEntityDataSource] Error:', errorMessage)

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }))

        return null
      }
    },
    [accessToken, userId]
  )

  /**
   * Refresh using last configuration
   */
  const refresh = useCallback(async (): Promise<EntityDataResult | null> => {
    if (!lastDataSourceRef.current) {
      console.warn('[useEntityDataSource] No data source to refresh')
      return null
    }

    return loadData(lastDataSourceRef.current)
  }, [loadData])

  /**
   * Clear loaded data
   */
  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setState({
      isLoading: false,
      isLoaded: false,
      data: null,
      error: null
    })

    lastDataSourceRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    state,
    loadData,
    refresh,
    clear,
    availableEntities,
    isLoadingEntities,
    fetchAvailableEntities,
    getEntityFields
  }
}

/**
 * Build a GraphQL-style where clause from our filter format
 * This is useful if we need to make direct GraphQL queries
 */
export function buildGraphQLWhere(group: EntityFilterGroup, userId?: string): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = []

  // Process conditions
  for (const condition of group.conditions) {
    if (!condition.isActive) continue

    const value = substituteVariables(condition.value, userId)

    // Build the condition based on field path
    const parts = condition.field.split('.')
    const conditionObj: Record<string, unknown> = {}
    let current = conditionObj

    // Navigate nested fields
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = {}
      current = current[parts[i]] as Record<string, unknown>
    }

    // Set the final operator
    const lastPart = parts[parts.length - 1]
    const operator = `_${condition.operator}`

    current[lastPart] = { [operator]: value }

    conditions.push(conditionObj)
  }

  // Handle nested groups
  if (group.groups) {
    for (const nestedGroup of group.groups) {
      const nestedWhere = buildGraphQLWhere(nestedGroup, userId)
      conditions.push(nestedWhere)
    }
  }

  // Combine with logic operator
  if (conditions.length === 0) {
    return {}
  }

  if (conditions.length === 1) {
    return conditions[0]
  }

  const logicKey = group.logic === 'OR' ? '_or' : '_and'
  return { [logicKey]: conditions }
}
