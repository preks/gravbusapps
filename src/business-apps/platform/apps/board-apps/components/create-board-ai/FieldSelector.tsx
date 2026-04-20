/**
 * FieldSelector - collapsible checklist of entity fields shown inside
 * the primary data source card during AI board creation.
 *
 * Pre-selects fields that are `defaultVisible` or suggested by the AI,
 * and lets the user toggle individual fields on/off.
 */

import React, { useMemo, useState } from 'react'
import { Checkbox, Badge } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Columns3 } from 'lucide-react'
import { ENTITY_REGISTRY, type EntityFieldDef } from '../../queries/entityQueries'

export interface FieldSelectorProps {
  entityType: string
  selectedFields: Set<string>
  onToggleField: (entityType: string, fieldKey: string) => void
  'data-testid'?: string
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  entityType,
  selectedFields,
  onToggleField,
  'data-testid': testId = 'field-selector'
}) => {
  const [expanded, setExpanded] = useState(false)

  const fields = useMemo<EntityFieldDef[]>(() => {
    const def = ENTITY_REGISTRY[entityType]
    return def?.fields.filter(f => f.key !== 'id') ?? []
  }, [entityType])

  if (fields.length === 0) return null

  const totalSelected = fields.filter(f => selectedFields.has(f.key)).length
  const ChevronIcon = expanded ? ChevronDown : ChevronRight

  return (
    <div className="gba:mt-1.5" data-testid={testId}>
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="gba:flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
        data-testid={`${testId}-toggle`}
      >
        <ChevronIcon className="gba:w-3 gba:h-3" />
        <Columns3 className="gba:w-3 gba:h-3" />
        <span>Fields to import</span>
        <Badge variant="secondary" className="gba:text-[10px] gba:py-0 gba:ml-1">
          {totalSelected}/{fields.length}
        </Badge>
      </button>

      {expanded && (
        <div className="gba:mt-1.5 gba:ml-3 gba:space-y-0.5 gba:max-h-40 gba:overflow-y-auto gba:pr-1">
          <div className="gba:flex gba:gap-2 gba:mb-1">
            <button
              type="button"
              onClick={() =>
                fields.forEach(f => {
                  if (!selectedFields.has(f.key)) onToggleField(entityType, f.key)
                })
              }
              className="gba:text-[10px] gba:text-primary gba:hover:underline"
              data-testid={`${testId}-select-all`}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() =>
                fields.forEach(f => {
                  if (selectedFields.has(f.key)) onToggleField(entityType, f.key)
                })
              }
              className="gba:text-[10px] gba:text-muted-foreground gba:hover:underline"
              data-testid={`${testId}-clear-all`}
            >
              Clear all
            </button>
          </div>
          {fields.map(f => (
            <label
              key={f.key}
              className="gba:flex gba:items-center gba:gap-1.5 gba:py-0.5 gba:cursor-pointer gba:hover:bg-accent/30 gba:rounded gba:px-1"
              data-testid={`${testId}-field-${f.key}`}
            >
              <Checkbox
                checked={selectedFields.has(f.key)}
                onCheckedChange={() => onToggleField(entityType, f.key)}
                className="gba:h-3 gba:w-3"
              />
              <span className="gba:text-[11px] gba:text-foreground">{f.label}</span>
              <span className="gba:text-[10px] gba:text-muted-foreground gba:ml-auto">{f.type}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
