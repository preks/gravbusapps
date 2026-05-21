import { useEffect, useMemo, useState } from 'react'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import type { ColumnDefinition, CustomDataDefinition, InputDataSource, InputOption } from '../types'
import { InputType } from '../types'

export interface EntityDataSelectOption extends InputOption {
  disabled?: boolean
}

interface UseEntityDataSelectOptionsResult {
  optionsByColumn: Record<string, EntityDataSelectOption[]>
  loadingByColumn: Record<string, boolean>
  errorByColumn: Record<string, string | null>
}

function getCatalogEntryField(entry: CatalogEntry, fieldName: string | undefined): unknown {
  if (!fieldName) {
    return entry.value ?? entry.code ?? entry.displayValue ?? entry.id
  }
  const directValue = (entry as unknown as Record<string, unknown>)[fieldName]
  if (directValue != null) {
    return directValue
  }
  if (entry.objectValue && typeof entry.objectValue === 'object') {
    return (entry.objectValue as Record<string, unknown>)[fieldName]
  }
  return null
}

function mapCatalogEntries(entries: CatalogEntry[], dataSource: InputDataSource): EntityDataSelectOption[] {
  return entries
    .map(entry => {
      const value = getCatalogEntryField(entry, dataSource.valueField)
      const label = getCatalogEntryField(entry, dataSource.labelField)
      const fallbackLabel = entry.displayValue ?? entry.value ?? entry.code ?? entry.id
      return {
        value: value != null && value !== '' ? String(value) : entry.id,
        label: label != null && label !== '' ? String(label) : String(fallbackLabel)
      }
    })
    .filter(option => option.value)
}

function mapManualOptions(options: InputOption[] | undefined): EntityDataSelectOption[] {
  return (options ?? [])
    .map(option => ({
      value: option.value || option.label,
      label: option.label || option.value
    }))
    .filter(option => option.value)
}

async function fetchCustomEntityOptions(params: {
  accessToken: string
  targetDefinition: CustomDataDefinition
  dataSource: InputDataSource
}): Promise<EntityDataSelectOption[]> {
  const { accessToken, targetDefinition, dataSource } = params
  const listFieldName = targetDefinition.entityName
  const graphqlUrl = `${CUSTOM_FLOW_ENGINE_API_URL}/custom-data/graphql`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'x-schema-namespace': targetDefinition.namespace
  }
  const valueField = dataSource.valueField || 'id'
  const labelField = dataSource.labelField || valueField
  const selections = Array.from(new Set(['id', valueField, labelField]))
  const dataResponse = await fetch(graphqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: `{ ${listFieldName} { ${selections.join('\n')} } }` })
  })
  const dataJson = await dataResponse.json()
  if (dataJson.errors?.length) {
    throw new Error(dataJson.errors[0].message)
  }
  const rows = (dataJson.data?.[listFieldName] as Record<string, unknown>[] | undefined) ?? []
  return rows.map(row => {
    const value = row[valueField] ?? row.id
    const label = row[labelField] ?? value
    return {
      value: String(value),
      label: String(label)
    }
  })
}

async function fetchDatasourceOptions(params: {
  accessToken: string
  dataSource: InputDataSource
}): Promise<EntityDataSelectOption[]> {
  const { accessToken, dataSource } = params
  if (!dataSource.entity) {
    return []
  }

  const datasourceUrl = new URL(`${CUSTOM_FLOW_ENGINE_API_URL}/datasource/${encodeURIComponent(dataSource.entity)}`)
  datasourceUrl.searchParams.set('kind', dataSource.type)
  datasourceUrl.searchParams.set('limit', '200')
  if (dataSource.namespace) {
    datasourceUrl.searchParams.set('namespace', dataSource.namespace)
  }
  if (dataSource.labelField) {
    datasourceUrl.searchParams.set('labelField', dataSource.labelField)
  }

  const response = await fetch(datasourceUrl.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to load ${dataSource.type} options: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  const entities = (payload?.entities as Record<string, unknown>[] | undefined) ?? []
  const valueField = dataSource.valueField || 'id'
  const labelField = dataSource.labelField || 'displayName'

  return entities.map(entity => {
    const value = entity[valueField] ?? entity.id
    const label = entity[labelField] ?? entity.displayName ?? entity.code ?? value
    return {
      value: String(value),
      label: String(label)
    }
  })
}

function resolveCustomEntityDefinition(
  dataSource: InputDataSource,
  currentNamespace: string,
  allDefinitions: CustomDataDefinition[]
): CustomDataDefinition | null {
  const targetNamespace = dataSource.namespace || currentNamespace
  return (
    allDefinitions.find(
      definition => definition.namespace === targetNamespace && definition.entityName === dataSource.entity
    ) ?? null
  )
}

function getUnsupportedOptions(dataSource: InputDataSource): EntityDataSelectOption[] {
  return [
    {
      value: '__unsupported__',
      label: `${dataSource.type} data source is not available for table editing`,
      disabled: true
    }
  ]
}

export function useEntityDataSelectOptions(params: {
  accessToken: string
  columns: ColumnDefinition[]
  currentNamespace: string
  allDefinitions: CustomDataDefinition[]
}): UseEntityDataSelectOptionsResult {
  const { accessToken, columns, currentNamespace, allDefinitions } = params
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })
  const [optionsByColumn, setOptionsByColumn] = useState<Record<string, EntityDataSelectOption[]>>({})
  const [loadingByColumn, setLoadingByColumn] = useState<Record<string, boolean>>({})
  const [errorByColumn, setErrorByColumn] = useState<Record<string, string | null>>({})

  const selectColumns = useMemo(
    () => columns.filter(column => column.type === InputType.SELECT || column.type === InputType.MULTISELECT),
    [columns]
  )

  useEffect(() => {
    let cancelled = false

    async function loadOptions() {
      const nextOptionsByColumn: Record<string, EntityDataSelectOption[]> = {}
      const nextErrorByColumn: Record<string, string | null> = {}
      const dynamicColumns = selectColumns.filter(column => column.dataSource)
      setLoadingByColumn(Object.fromEntries(dynamicColumns.map(column => [column.fieldName, true])))

      for (const column of selectColumns) {
        const dataSource = column.dataSource
        if (!dataSource) {
          nextOptionsByColumn[column.fieldName] = mapManualOptions(column.options)
          nextErrorByColumn[column.fieldName] = null
          continue
        }

        try {
          if (dataSource.type === 'CATALOG' && dataSource.catalog) {
            const { entries } = await fetchCatalogEntriesByIdentifier(dataSource.catalog, {
              includeDeleted: false,
              limit: 200
            })
            nextOptionsByColumn[column.fieldName] = mapCatalogEntries(entries, dataSource)
            nextErrorByColumn[column.fieldName] = null
          } else if (dataSource.type === 'CUSTOM_ENTITY' && dataSource.entity) {
            const targetDefinition = resolveCustomEntityDefinition(dataSource, currentNamespace, allDefinitions)
            if (!targetDefinition) {
              nextOptionsByColumn[column.fieldName] = []
              nextErrorByColumn[column.fieldName] = 'Custom entity data source not found'
            } else {
              nextOptionsByColumn[column.fieldName] = await fetchCustomEntityOptions({
                accessToken,
                targetDefinition,
                dataSource
              })
              nextErrorByColumn[column.fieldName] = null
            }
          } else if (dataSource.type === 'INTERNAL_ENTITY' && dataSource.entity) {
            nextOptionsByColumn[column.fieldName] = await fetchDatasourceOptions({ accessToken, dataSource })
            nextErrorByColumn[column.fieldName] = null
          } else {
            nextOptionsByColumn[column.fieldName] = getUnsupportedOptions(dataSource)
            nextErrorByColumn[column.fieldName] = null
          }
        } catch (optionError) {
          nextOptionsByColumn[column.fieldName] = []
          nextErrorByColumn[column.fieldName] =
            optionError instanceof Error ? optionError.message : 'Failed to load options'
        }
      }

      if (cancelled) {
        return
      }
      setOptionsByColumn(nextOptionsByColumn)
      setErrorByColumn(nextErrorByColumn)
      setLoadingByColumn(Object.fromEntries(selectColumns.map(column => [column.fieldName, false])))
    }

    void loadOptions()

    return () => {
      cancelled = true
    }
  }, [accessToken, allDefinitions, currentNamespace, fetchCatalogEntriesByIdentifier, selectColumns])

  return { optionsByColumn, loadingByColumn, errorByColumn }
}
