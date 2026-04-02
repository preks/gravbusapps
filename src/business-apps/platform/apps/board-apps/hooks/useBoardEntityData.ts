/**
 * useBoardEntityData - fetches system entity data via GraphQL for board sheets.
 *
 * Replaces the previous broken REST-based approach with proper GraphQL queries
 * matching how the rest of the codebase (HR, CRM, Finance apps) fetches data.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import {
  getEntityDef,
  flattenEntityRecord,
  buildEntityDefaultWhere,
  type EntityFieldDef,
  type EntityQueryDef
} from '../queries/entityQueries'
import { buildGraphQLWhere } from '@/business-apps/core/office/apps/spreadsheets/hooks/useEntityDataSource'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import type { EntityDataSource } from '../types'
import { BoardApiService } from '../services/BoardApiService'

export interface EntityDataState {
  isLoading: boolean
  isLoaded: boolean
  records: Record<string, unknown>[]
  rawRecords: Record<string, unknown>[]
  total: number
  error: string | null
}

export interface UseBoardEntityDataReturn {
  state: EntityDataState
  /** Fetch a preview sample for an entity type (default 20 records) */
  fetchPreview: (entityType: string, limit?: number) => Promise<void>
  /** Load full data using an EntityDataSource config with filters/sorting */
  loadLiveData: (dataSource: EntityDataSource) => Promise<void>
  /** Refresh data using the last configuration */
  refreshLiveData: () => Promise<void>
  /** Import fetched records into a board via the document service */
  copyToBoard: (
    boardId: string,
    sheetId: string,
    mode: 'replace' | 'append' | 'merge',
    mergeKey?: string
  ) => Promise<{ synced: number; deleted: number } | null>
  /** Clear all state */
  clear: () => void
  /** Current entity definition (null if none selected) */
  entityDef: EntityQueryDef | null
  /** All available fields for the current entity */
  availableFields: EntityFieldDef[]
  /** Currently selected field keys */
  selectedFields: string[]
  /** Update selected fields */
  setSelectedFields: (fields: string[]) => void
  /** Select only default-visible fields */
  resetFieldsToDefault: () => void
}

const INITIAL_STATE: EntityDataState = {
  isLoading: false,
  isLoaded: false,
  records: [],
  rawRecords: [],
  total: 0,
  error: null
}

export function useBoardEntityData(accessToken: string): UseBoardEntityDataReturn {
  const [state, setState] = useState<EntityDataState>(INITIAL_STATE)
  const [currentEntityType, setCurrentEntityType] = useState<string | null>(null)
  const [selectedFields, setSelectedFields] = useState<string[]>([])

  const lastDataSourceRef = useRef<EntityDataSource | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  if (accessToken) {
    graphQLClient.setAccessToken(accessToken)
  }

  const entityDef = currentEntityType ? (getEntityDef(currentEntityType) ?? null) : null

  const availableFields = entityDef?.fields ?? []

  const resetFieldsToDefault = useCallback(() => {
    if (!entityDef) {
      setSelectedFields([])
      return
    }
    setSelectedFields(entityDef.fields.filter(f => f.defaultVisible).map(f => f.key))
  }, [entityDef])

  const executeQuery = useCallback(
    async (
      def: EntityQueryDef,
      variables: Record<string, unknown>,
      fieldsToUse: EntityFieldDef[]
    ): Promise<{ records: Record<string, unknown>[]; rawRecords: Record<string, unknown>[]; total: number }> => {
      const data = await graphQLClient.request<Record<string, unknown>>(def.query, variables)
      const rawEntities = (data[def.entityKey] ?? []) as Record<string, unknown>[]
      const aggregate = data[def.aggregateKey] as { aggregate: { count: number } } | undefined
      const total = aggregate?.aggregate?.count ?? rawEntities.length

      const flatRecords = rawEntities.map(rec => flattenEntityRecord(rec, fieldsToUse))

      return { records: flatRecords, rawRecords: rawEntities, total }
    },
    []
  )

  const fetchPreview = useCallback(
    async (entityType: string, limit = 20) => {
      const def = getEntityDef(entityType)
      if (!def) {
        setState(prev => ({ ...prev, error: `Unknown entity type: ${entityType}` }))
        return
      }

      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      setCurrentEntityType(entityType)

      const defaultFields = def.fields.filter(f => f.defaultVisible)
      setSelectedFields(defaultFields.map(f => f.key))

      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const structureId = getCurrentActiveStructureId()
        const defaultWhere = buildEntityDefaultWhere(entityType, structureId)

        const variables: Record<string, unknown> = {
          limit,
          offset: 0,
          where: defaultWhere
        }

        const result = await executeQuery(def, variables, def.fields)

        setState({
          isLoading: false,
          isLoaded: true,
          records: result.records,
          rawRecords: result.rawRecords,
          total: result.total,
          error: null
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch preview'
        }))
      }
    },
    [executeQuery]
  )

  const loadLiveData = useCallback(
    async (dataSource: EntityDataSource) => {
      if (!dataSource.enabled) return

      const def = getEntityDef(dataSource.entityType)
      if (!def) {
        setState(prev => ({ ...prev, error: `Unknown entity type: ${dataSource.entityType}` }))
        return
      }

      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      lastDataSourceRef.current = dataSource

      setCurrentEntityType(dataSource.entityType)
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const structureId = getCurrentActiveStructureId()
        const defaultWhere = buildEntityDefaultWhere(dataSource.entityType, structureId)
        const userWhere = dataSource.filters?.conditions?.length ? buildGraphQLWhere(dataSource.filters) : {}
        const where = { ...defaultWhere, ...userWhere }

        const variables: Record<string, unknown> = {
          where,
          limit: dataSource.limit > 0 ? dataSource.limit : undefined,
          offset: 0
        }

        if (dataSource.orderBy?.length) {
          const orderBy: Record<string, string>[] = dataSource.orderBy.map(sort => {
            const parts = sort.field.split('.')
            if (parts.length === 1) {
              return { [parts[0]]: sort.direction.toLowerCase().replace(/_/g, '_') }
            }
            const obj: Record<string, unknown> = {}
            let current: Record<string, unknown> = obj
            for (let i = 0; i < parts.length - 1; i++) {
              current[parts[i]] = {}
              current = current[parts[i]] as Record<string, unknown>
            }
            current[parts[parts.length - 1]] = sort.direction.toLowerCase()
            return obj as Record<string, string>
          })
          variables.orderBy = orderBy
        }

        const result = await executeQuery(def, variables, def.fields)

        setState({
          isLoading: false,
          isLoaded: true,
          records: result.records,
          rawRecords: result.rawRecords,
          total: result.total,
          error: null
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load entity data'
        }))
      }
    },
    [executeQuery]
  )

  const refreshLiveData = useCallback(async () => {
    if (lastDataSourceRef.current) await loadLiveData(lastDataSourceRef.current)
  }, [loadLiveData])

  const copyToBoard = useCallback(
    async (
      boardId: string,
      sheetId: string,
      mode: 'replace' | 'append' | 'merge',
      mergeKey?: string
    ): Promise<{ synced: number; deleted: number } | null> => {
      if (state.records.length === 0) return null

      const activeFieldDefs = availableFields.filter(f => selectedFields.includes(f.key))
      const filteredRecords = state.rawRecords.map(rec => flattenEntityRecord(rec, activeFieldDefs))

      return BoardApiService.syncFromEntity(boardId, sheetId, filteredRecords, mode, mergeKey)
    },
    [state.records.length, state.rawRecords, availableFields, selectedFields]
  )

  const clear = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    setState(INITIAL_STATE)
    setCurrentEntityType(null)
    setSelectedFields([])
    lastDataSourceRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  return {
    state,
    fetchPreview,
    loadLiveData,
    refreshLiveData,
    copyToBoard,
    clear,
    entityDef,
    availableFields,
    selectedFields,
    setSelectedFields,
    resetFieldsToDefault
  }
}
