import React from 'react'
import {
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Spinner
} from '@newwork/nw-design-system'
import { ENTITY_REGISTRY } from '../../queries/entityQueries'

const ENTITY_OPTIONS = Object.entries(ENTITY_REGISTRY).map(([key, def]) => ({
  value: key,
  label: def.displayName,
  desc: def.description
}))

export interface EntitySelectorProps {
  entity: string
  onEntityChange: (entity: string) => void
  onNext: () => void
  isLoading: boolean
  'data-testid'?: string
}

export const EntitySelector: React.FC<EntitySelectorProps> = ({
  entity,
  onEntityChange,
  onNext,
  isLoading,
  'data-testid': testId = 'entity-selector'
}) => {
  const selected = ENTITY_OPTIONS.find(e => e.value === entity)

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <p className="gba:text-xs gba:text-muted-foreground">
        Pull data from NEWWORK systems into this sheet. Select a data source to preview available records before
        importing.
      </p>

      <div>
        <Label className="gba:text-xs">Data source</Label>
        <Select value={entity} onValueChange={onEntityChange}>
          <SelectTrigger className="gba:h-9" data-testid={`${testId}-entity`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_OPTIONS.map(e => (
              <SelectItem key={e.value} value={e.value}>
                <span className="gba:font-medium">{e.label}</span>
                <span className="gba:text-muted-foreground gba:ml-2">{e.desc}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <div className="gba:rounded gba:border gba:border-border gba:p-3">
          <p className="gba:text-sm gba:font-medium">{selected.label}</p>
          <p className="gba:text-xs gba:text-muted-foreground">{selected.desc}</p>
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={!entity || isLoading}
        className="gba:w-full gba:gap-1.5"
        data-testid={`${testId}-preview-btn`}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" /> Loading preview...
          </>
        ) : (
          'Preview data'
        )}
      </Button>
    </div>
  )
}
