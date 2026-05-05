import { useCallback, useEffect, useState } from 'react'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import type { CustomDataDefinition, ColumnDefinition } from '../types'
import { snakeToCamelCase, toPascalCase } from '../utils/definitionFormUtils'

export interface EntityRow {
  id: string
  [key: string]: unknown
}

interface UseEntityDataResult {
  rows: EntityRow[]
  loading: boolean
  error: string | null
  refetch: () => void
  /** JSON response key for this storage column (matches selection sent to custom-data GraphQL). */
  responseKeyForColumn: (columnName: string) => string
}

function buildGraphqlTypeName(definition: CustomDataDefinition): string {
  return toPascalCase(definition.key) || 'Entity'
}

function pickGraphqlFieldNameFromIntrospection(storageColumn: string, introspected: Set<string> | null): string {
  const heuristic = snakeToCamelCase(storageColumn)
  if (!introspected) {
    return heuristic
  }
  if (introspected.has(heuristic)) {
    return heuristic
  }
  if (introspected.has(storageColumn)) {
    return storageColumn
  }
  return heuristic
}

function buildFieldKeyByColumnName(
  columns: ColumnDefinition[] | undefined,
  introspected: Set<string> | null
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const c of columns ?? []) {
    if (c.name === 'id') {
      continue
    }
    map[c.name] = pickGraphqlFieldNameFromIntrospection(c.name, introspected)
  }
  return map
}

function buildSelectionFragment(columns: ColumnDefinition[] | undefined, keyByColumn: Record<string, string>): string {
  const names = (columns ?? []).map(c => c.name).filter(n => n !== 'id')
  return ['id', ...names.map(n => keyByColumn[n] ?? snakeToCamelCase(n))].join('\n    ')
}

export function useEntityData(accessToken: string, definition: CustomDataDefinition): UseEntityDataResult {
  const [rows, setRows] = useState<EntityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchTrigger, setFetchTrigger] = useState(0)
  const [fieldKeyByColumnName, setFieldKeyByColumnName] = useState<Record<string, string>>({})

  const queryName = toPascalCase(definition.key) || 'Entity'
  const listFieldName = queryName

  const responseKeyForColumn = useCallback(
    (columnName: string) => {
      if (columnName === 'id') {
        return 'id'
      }
      return fieldKeyByColumnName[columnName] ?? snakeToCamelCase(columnName)
    },
    [fieldKeyByColumnName]
  )

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    setFieldKeyByColumnName({})
    const columns = definition.columns_json
    const typeName = buildGraphqlTypeName(definition)
    const introspectQuery = `{ __type(name: ${JSON.stringify(typeName)}) { fields { name } } }`

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-schema-namespace': definition.namespace
      }
      const graphqlUrl = `${CUSTOM_FLOW_ENGINE_API_URL}/custom-data/graphql`

      let fieldSet: Set<string> | null = null
      const introRes = await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: introspectQuery })
      })
      const introJson = await introRes.json()
      if (!introJson.errors?.length && introJson.data?.__type?.fields?.length) {
        fieldSet = new Set((introJson.data.__type.fields as { name: string }[]).map(f => f.name))
      }

      const keyByColumn = buildFieldKeyByColumnName(columns, fieldSet)
      setFieldKeyByColumnName(keyByColumn)
      const fields = buildSelectionFragment(columns, keyByColumn)
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
    if (definition.publish_state === 'PROMOTED_TRACKED') {
      void fetchRows()
    }
  }, [fetchRows, fetchTrigger, definition.publish_state])

  const refetch = useCallback(() => setFetchTrigger(prev => prev + 1), [])

  return { rows, loading, error, refetch, responseKeyForColumn }
}
