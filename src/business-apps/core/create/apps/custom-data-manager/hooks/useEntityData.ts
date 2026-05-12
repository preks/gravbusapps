import { useCallback, useEffect, useState } from 'react'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import type { CustomDataDefinition, ColumnDefinition } from '../types'

export interface EntityRow {
  id: string
  [key: string]: unknown
}

interface UseEntityDataResult {
  rows: EntityRow[]
  loading: boolean
  error: string | null
  refetch: () => void
  responseKeyForColumn: (columnName: string) => string
}

function buildGraphqlTypeName(definition: CustomDataDefinition): string {
  return definition.entityName
}

function getPublicFieldName(column: ColumnDefinition): string {
  return column.fieldName
}

function buildSelectionFragment(columns: ColumnDefinition[] | undefined): string {
  const names = (columns ?? []).map(getPublicFieldName).filter(name => name !== 'id')
  return ['id', ...names].join('\n    ')
}

export function useEntityData(accessToken: string, definition: CustomDataDefinition): UseEntityDataResult {
  const [rows, setRows] = useState<EntityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  const queryName = buildGraphqlTypeName(definition)
  const listFieldName = queryName

  const responseKeyForColumn = useCallback((columnName: string) => {
    return columnName
  }, [])

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    const columns = definition.columns

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-schema-namespace': definition.namespace
      }
      const graphqlUrl = `${CUSTOM_FLOW_ENGINE_API_URL}/custom-data/graphql`

      const fields = buildSelectionFragment(columns)
      const dataQuery = `{ ${listFieldName} { ${fields} } }`

      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: dataQuery })
      })
      const json = await res.json()
      if (json.errors?.length) {
        setError(json.errors[0].message)
        setRows([])
        return
      }
      setRows((json.data?.[listFieldName] as EntityRow[]) ?? [])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, definition, listFieldName])

  useEffect(() => {
    if (definition.publishState === 'PROMOTED_TRACKED') {
      void fetchRows()
    }
  }, [fetchRows, fetchTrigger, definition.publishState])

  const refetch = useCallback(() => setFetchTrigger(prev => prev + 1), [])

  return { rows, loading, error, refetch, responseKeyForColumn }
}
