import React, { useMemo, useState } from 'react'
import { Combobox, Label } from '@newwork/nw-design-system'
import type { DataSource, InputBlock } from '@/business-apps/flow/apps/creator/types/flowTemplate'

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

export const EntitySourceSection: React.FC<{
  field: InputBlock
  entities?: Array<{ type: string; name: string; fields: string[] }>
  entitiesLoading?: boolean
  entitiesError?: string | null
  showFieldMapping?: boolean
  index: number
  onChange: (updated: InputBlock) => void
  testId: string
}> = ({ field, entities, entitiesLoading, entitiesError, index, onChange, testId }) => {
  const [search, setSearch] = useState('')
  const list = Array.isArray(entities) ? entities : []
  const selectedType = field.dataSource?.type === 'ENTITY' ? field.dataSource.entity || '' : ''

  const sortedEntities = useMemo(
    () => list.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [list]
  )

  const filteredEntities = useMemo(() => {
    const q = String(search || '')
      .trim()
      .toLowerCase()
    if (!q) return sortedEntities
    return sortedEntities.filter(e => {
      const name = String(e.name || '').toLowerCase()
      const type = String(e.type || '').toLowerCase()
      return name.includes(q) || type.includes(q)
    })
  }, [search, sortedEntities])

  const entityOptions = useMemo(
    () =>
      filteredEntities.map(e => ({
        value: e.type,
        label: e.name
      })),
    [filteredEntities]
  )

  const setEntity = (entityType: string) => {
    const target = list.find(e => e.type === entityType)
    const mapping = deriveEntityMapping(target?.fields ?? [])
    onChange({
      ...field,
      dataSource: {
        ...(field.dataSource?.type === 'ENTITY' ? field.dataSource : { type: 'ENTITY' }),
        type: 'ENTITY',
        entity: entityType,
        valueField: mapping.valueField,
        labelField: mapping.labelField
      } as DataSource
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <div className="gba:flex gba:flex-col gba:gap-1">
        <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Entity type</Label>
        <Combobox
          className="gba:w-full gba:h-auto"
          options={entityOptions as any}
          value={selectedType}
          onValueChange={setEntity}
          placeholder={entitiesLoading ? 'Loading entities…' : 'Select entity…'}
          searchPlaceholder="Search entities…"
          emptyText={entitiesLoading ? 'Loading entities…' : 'No matching entities'}
          loading={Boolean(entitiesLoading)}
          onSearch={q => setSearch(q)}
          searchDebounce={150}
          data-testid={`${testId}-${index}-entity`}
          align="start"
        />
        {entitiesError ? <p className="gba:text-xs gba:text-muted-foreground">{entitiesError}</p> : null}
      </div>
    </div>
  )
}
