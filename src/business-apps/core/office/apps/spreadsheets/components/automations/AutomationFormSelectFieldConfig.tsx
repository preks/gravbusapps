/**
 * Configure dropdown options for bulk collection form fields (static list or entity-backed).
 */

import React, { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Plus, Trash2 } from 'lucide-react'
import type { BulkCollectionEntitySelectConfig } from '../../types/automation'
import type { AvailableEntity, EntityField } from '../../types/entityDataSource'
import { createFilterGroup } from '../../types/entityDataSource'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

export function createDefaultBulkEntitySelect(): BulkCollectionEntitySelectConfig {
  return {
    entityType: '',
    entityDisplayName: '',
    valueField: '',
    labelField: '',
    filters: createFilterGroup('AND'),
    orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }],
    limit: 100
  }
}

export interface AutomationFormSelectFieldConfigProps {
  selectOptionsSource: 'static' | 'entity'
  options: string[]
  entitySelect: BulkCollectionEntitySelectConfig | undefined
  accessToken?: string
  translate: (key: string, vars?: Record<string, string | number>) => string
  onChange: (patch: {
    selectOptionsSource: 'static' | 'entity'
    options: string[]
    entitySelect?: BulkCollectionEntitySelectConfig
  }) => void
  'data-testid'?: string
}

async function fetchAvailableEntities(accessToken: string): Promise<AvailableEntity[]> {
  const base = getFlowEngineApiBaseUrl()
  const url = `${base}/entities?includeFields=true`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  })
  if (!response.ok) return []
  const data = await response.json()
  let entities: Record<string, unknown> | unknown[] = {}
  if (Array.isArray(data)) {
    entities = data.reduce(
      (acc: Record<string, unknown>, entity: Record<string, unknown>) => {
        const key = String(entity.type || entity.name || '')
        if (key) acc[key] = entity
        return acc
      },
      {} as Record<string, unknown>
    )
  } else if (data.entities) {
    entities = data.entities
  } else if (data.schemas) {
    entities = data.schemas
  } else if (typeof data === 'object' && data !== null) {
    entities = data as Record<string, unknown>
  }

  if (!entities || (Array.isArray(entities) && entities.length === 0)) return []

  return Object.entries(entities as Record<string, unknown>).map(([type, schema]) => {
    const s = schema as Record<string, unknown>
    if (s.type && !s.displayName) {
      return s as unknown as AvailableEntity
    }
    return {
      type,
      displayName: String(s.displayName || s.name || type),
      description: String(s.description || ''),
      fields: ((s.fields as EntityField[]) || []).map((f: EntityField) => ({
        name: f.name,
        displayName: f.displayName || f.name,
        type: f.type
      }))
    }
  })
}

export const AutomationFormSelectFieldConfig: React.FC<AutomationFormSelectFieldConfigProps> = ({
  selectOptionsSource,
  options,
  entitySelect,
  accessToken,
  translate: t,
  onChange,
  'data-testid': testId = 'automation-form-select-config'
}) => {
  const [entities, setEntities] = useState<AvailableEntity[]>([])
  const [entitiesLoading, setEntitiesLoading] = useState(false)

  const effectiveEntity = entitySelect ?? createDefaultBulkEntitySelect()

  useEffect(() => {
    if (!accessToken?.trim()) {
      setEntities([])
      return
    }
    let cancelled = false
    setEntitiesLoading(true)
    void fetchAvailableEntities(accessToken)
      .then(list => {
        if (!cancelled) setEntities(list)
      })
      .catch(() => {
        if (!cancelled) setEntities([])
      })
      .finally(() => {
        if (!cancelled) setEntitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const setSource = useCallback(
    (mode: 'static' | 'entity') => {
      if (mode === 'entity') {
        onChange({
          selectOptionsSource: 'entity',
          options: [],
          entitySelect: entitySelect ?? createDefaultBulkEntitySelect()
        })
      } else {
        onChange({
          selectOptionsSource: 'static',
          options: options.length > 0 ? options : [''],
          entitySelect: undefined
        })
      }
    },
    [entitySelect, onChange, options]
  )

  const updateOptionAt = useCallback(
    (index: number, value: string) => {
      const next = [...(options.length > 0 ? options : [''])]
      next[index] = value
      onChange({ selectOptionsSource: 'static', options: next, entitySelect: undefined })
    },
    [onChange, options]
  )

  const addOption = useCallback(() => {
    const next = [...(options.length > 0 ? options : ['']), '']
    onChange({ selectOptionsSource: 'static', options: next, entitySelect: undefined })
  }, [onChange, options])

  const removeOption = useCallback(
    (index: number) => {
      const base = options.length > 0 ? options : ['']
      const next = base.filter((_, i) => i !== index)
      onChange({
        selectOptionsSource: 'static',
        options: next.length > 0 ? next : [''],
        entitySelect: undefined
      })
    },
    [onChange, options]
  )

  const patchEntity = useCallback(
    (patch: Partial<BulkCollectionEntitySelectConfig>) => {
      onChange({
        selectOptionsSource: 'entity',
        options: [],
        entitySelect: { ...effectiveEntity, ...patch }
      })
    },
    [effectiveEntity, onChange]
  )

  const entityFields: EntityField[] =
    entities.find(e => e.type.toLowerCase() === effectiveEntity.entityType.toLowerCase())?.fields || []

  return (
    <div className="gba:mt-3 gba:pl-9 gba:space-y-3 gba:border-l-2 gba:border-border" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:gap-2">
        <Button
          type="button"
          size="sm"
          variant={selectOptionsSource === 'static' ? 'default' : 'outline'}
          onClick={() => setSource('static')}
          data-testid={`${testId}-mode-static`}
        >
          {t('wizard-select-options-custom')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={selectOptionsSource === 'entity' ? 'default' : 'outline'}
          onClick={() => setSource('entity')}
          data-testid={`${testId}-mode-entity`}
        >
          {t('wizard-select-options-entity')}
        </Button>
      </div>

      {selectOptionsSource === 'static' && (
        <div className="gba:space-y-2">
          <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-select-options-custom-help')}</Label>
          {(options.length > 0 ? options : ['']).map((opt, index) => (
            <div key={index} className="gba:flex gba:items-center gba:gap-2">
              <Input
                value={opt}
                onChange={e => updateOptionAt(index, e.target.value)}
                placeholder={t('wizard-select-option-placeholder')}
                className="gba:h-8 gba:flex-1"
                data-testid={`${testId}-option-${index}`}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="gba:h-8 gba:w-8"
                onClick={() => removeOption(index)}
                disabled={(options.length > 0 ? options : ['']).length <= 1}
                data-testid={`${testId}-remove-${index}`}
              >
                <Trash2 className="gba:w-4 gba:h-4" />
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addOption} data-testid={`${testId}-add-option`}>
            <Plus className="gba:w-3 gba:h-3 gba:mr-1" />
            {t('wizard-select-add-option')}
          </Button>
        </div>
      )}

      {selectOptionsSource === 'entity' && (
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
          <div>
            <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-select-entity-type')}</Label>
            <Select
              value={effectiveEntity.entityType || ''}
              onValueChange={v => {
                const ent = entities.find(e => e.type === v)
                patchEntity({
                  entityType: v,
                  entityDisplayName: ent?.displayName || v
                })
              }}
              disabled={entitiesLoading || !accessToken}
            >
              <SelectTrigger className="gba:mt-1 gba:h-8" data-testid={`${testId}-entity-type`}>
                <SelectValue
                  placeholder={entitiesLoading ? t('wizard-select-entity-loading') : t('wizard-select-entity-pick')}
                />
              </SelectTrigger>
              <SelectContent style={{ zIndex: 1000003 }}>
                {entities.map(ent => (
                  <SelectItem key={ent.type} value={ent.type}>
                    {ent.displayName || ent.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-select-max-records')}</Label>
            <Input
              type="number"
              min={1}
              max={500}
              className="gba:mt-1 gba:h-8"
              value={effectiveEntity.limit}
              onChange={e => {
                const n = Number(e.target.value)
                if (!Number.isNaN(n)) patchEntity({ limit: Math.min(500, Math.max(1, n)) })
              }}
              data-testid={`${testId}-limit`}
            />
          </div>
          <div>
            <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-select-value-field')}</Label>
            <Select
              value={effectiveEntity.valueField || ''}
              onValueChange={v => patchEntity({ valueField: v })}
              disabled={!effectiveEntity.entityType}
            >
              <SelectTrigger className="gba:mt-1 gba:h-8" data-testid={`${testId}-value-field`}>
                <SelectValue placeholder={t('wizard-select-field-pick')} />
              </SelectTrigger>
              <SelectContent style={{ zIndex: 1000003 }}>
                {entityFields.map(f => (
                  <SelectItem key={f.name} value={f.name}>
                    {f.displayName || f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-select-label-field')}</Label>
            <Select
              value={effectiveEntity.labelField || ''}
              onValueChange={v => patchEntity({ labelField: v })}
              disabled={!effectiveEntity.entityType}
            >
              <SelectTrigger className="gba:mt-1 gba:h-8" data-testid={`${testId}-label-field`}>
                <SelectValue placeholder={t('wizard-select-field-pick')} />
              </SelectTrigger>
              <SelectContent style={{ zIndex: 1000003 }}>
                {entityFields.map(f => (
                  <SelectItem key={`${f.name}-label`} value={f.name}>
                    {f.displayName || f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
