import React, { useMemo, useState } from 'react'
import {
  Combobox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import type { DataSource, InputBlock } from '@/common/data/flow/types/flowTemplate'
import type { EntityOption } from '../../hooks/useFlowStudioData'

const pickFirst = (fields: string[], candidates: string[], fallback: string): string => {
  const set = new Set(fields.map(f => String(f || '').trim()).filter(Boolean))
  for (const c of candidates) {
    if (set.has(c)) return c
  }
  return fallback
}

const deriveEntityMapping = (fields: string[]) => {
  const valueField = pickFirst(fields, ['id', 'code', 'uuid', 'key'], 'id')
  const labelField = pickFirst(fields, ['displayName', 'name', 'title', 'label', 'code', 'id'], 'displayName')
  return { valueField, labelField }
}

const getEntitySelectionValue = (entity: EntityOption): string =>
  entity.kind === 'CUSTOM_ENTITY' ? `${entity.namespace || 'default'}:${entity.type}` : entity.type

const getCurrentSelectionValue = (field: InputBlock, sourceType: 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY'): string => {
  if (field.dataSource?.type !== sourceType || !field.dataSource.entity) {
    return ''
  }

  return sourceType === 'CUSTOM_ENTITY'
    ? `${field.dataSource.namespace || 'default'}:${field.dataSource.entity}`
    : field.dataSource.entity
}

const normalizeNamespace = (namespace: string | undefined): string => String(namespace || '').trim() || 'default'

export const EntitySourceSection: React.FC<{
  field: InputBlock
  entities?: EntityOption[]
  entitiesLoading?: boolean
  entitiesError?: string | null
  showFieldMapping?: boolean
  sourceType: 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY'
  index: number
  onChange: (updated: InputBlock) => void
  testId: string
}> = ({ field, entities, entitiesLoading, entitiesError, sourceType, index, onChange, testId }) => {
  const [search, setSearch] = useState('')
  const entityTypeLabel = sourceType === 'INTERNAL_ENTITY' ? 'Internal entity type' : 'Custom entity type'
  const list = useMemo(
    () => (Array.isArray(entities) ? entities.filter(entity => entity.kind === sourceType) : []),
    [entities, sourceType]
  )
  const namespaceOptions = useMemo(() => {
    if (sourceType !== 'CUSTOM_ENTITY') {
      return []
    }

    return Array.from(new Set(list.map(entity => normalizeNamespace(entity.namespace)))).sort((left, right) =>
      left.localeCompare(right)
    )
  }, [list, sourceType])
  const selectedNamespace =
    sourceType === 'CUSTOM_ENTITY'
      ? field.dataSource?.type === 'CUSTOM_ENTITY'
        ? String(field.dataSource.namespace || '').trim() || (field.dataSource.entity ? 'default' : '')
        : ''
      : ''
  const selectedType = getCurrentSelectionValue(field, sourceType)

  const sortedEntities = useMemo(
    () => list.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [list]
  )

  const filteredEntities = useMemo(() => {
    const namespaceScopedEntities =
      sourceType === 'CUSTOM_ENTITY'
        ? sortedEntities.filter(entity => normalizeNamespace(entity.namespace) === selectedNamespace)
        : sortedEntities
    const q = String(search || '')
      .trim()
      .toLowerCase()
    if (!q) return namespaceScopedEntities
    return namespaceScopedEntities.filter(e => {
      const name = String(e.name || '').toLowerCase()
      const type = String(e.type || '').toLowerCase()
      return name.includes(q) || type.includes(q)
    })
  }, [search, selectedNamespace, sortedEntities, sourceType])

  const entityOptions = useMemo(
    () =>
      filteredEntities.map(e => ({
        value: getEntitySelectionValue(e),
        label: e.name
      })),
    [filteredEntities]
  )

  const setNamespace = (namespace: string) => {
    onChange({
      ...field,
      dataSource: {
        ...(field.dataSource?.type === sourceType ? field.dataSource : { type: sourceType }),
        type: sourceType,
        entity: '',
        namespace: namespace || undefined,
        valueField: field.dataSource?.valueField ?? 'id',
        labelField: field.dataSource?.labelField ?? 'displayName'
      } as DataSource
    })
  }

  const setEntity = (selectionValue: string) => {
    const target = list.find(entity => getEntitySelectionValue(entity) === selectionValue)
    const mapping = deriveEntityMapping(target?.fields ?? [])
    onChange({
      ...field,
      dataSource: {
        ...(field.dataSource?.type === sourceType ? field.dataSource : { type: sourceType }),
        type: sourceType,
        entity: target?.type || '',
        namespace: sourceType === 'CUSTOM_ENTITY' ? target?.namespace || 'default' : undefined,
        valueField: mapping.valueField,
        labelField: mapping.labelField
      } as DataSource
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      {sourceType === 'CUSTOM_ENTITY' ? (
        <div className="gba:flex gba:flex-col gba:gap-1">
          <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Custom entity namespace</Label>
          <Select value={selectedNamespace || undefined} onValueChange={setNamespace}>
            <SelectTrigger data-testid={`${testId}-${index}-entity-custom_entity-namespace`}>
              <SelectValue placeholder={entitiesLoading ? 'Loading namespaces…' : 'Select namespace…'} />
            </SelectTrigger>
            <SelectContent>
              {namespaceOptions.map(namespace => (
                <SelectItem key={namespace} value={namespace}>
                  {namespace}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="gba:flex gba:flex-col gba:gap-1">
        <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">{entityTypeLabel}</Label>
        <Combobox
          key={`${sourceType}-${index}`}
          className="gba:w-full gba:h-auto"
          options={entityOptions as any}
          value={selectedType}
          onValueChange={setEntity}
          placeholder={
            entitiesLoading
              ? 'Loading entities…'
              : sourceType === 'INTERNAL_ENTITY'
                ? 'Select internal entity…'
                : selectedNamespace
                  ? 'Select custom entity…'
                  : 'Select namespace first…'
          }
          searchPlaceholder={sourceType === 'INTERNAL_ENTITY' ? 'Search internal entities…' : 'Search custom entities…'}
          emptyText={
            entitiesLoading
              ? 'Loading entities…'
              : sourceType === 'CUSTOM_ENTITY' && !selectedNamespace
                ? 'Select a namespace first'
                : 'No matching entities'
          }
          loading={Boolean(entitiesLoading)}
          onSearch={q => setSearch(q)}
          searchDebounce={150}
          data-testid={`${testId}-${index}-entity-${sourceType.toLowerCase()}`}
          align="start"
          disabled={sourceType === 'CUSTOM_ENTITY' && !selectedNamespace}
        />
        {entitiesError ? <p className="gba:text-xs gba:text-muted-foreground">{entitiesError}</p> : null}
      </div>
    </div>
  )
}
