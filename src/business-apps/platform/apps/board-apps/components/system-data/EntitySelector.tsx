import React from 'react'
import {
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  Spinner
} from '@newwork/nw-design-system'
import { getEntitiesByCategory, ENTITY_REGISTRY } from '../../queries/entityQueries'

const GROUPED_ENTITIES = getEntitiesByCategory()

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
  const selected = entity ? ENTITY_REGISTRY[entity] : undefined

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
            {GROUPED_ENTITIES.map(group => (
              <SelectGroup key={group.category}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.entities.map(e => (
                  <SelectItem key={e.key} value={e.key}>
                    <span className="gba:font-medium">{e.def.displayName}</span>
                    <span className="gba:text-muted-foreground gba:ml-2">{e.def.description}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <div className="gba:rounded gba:border gba:border-border gba:p-3">
          <p className="gba:text-sm gba:font-medium">{selected.displayName}</p>
          <p className="gba:text-xs gba:text-muted-foreground">{selected.description}</p>
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
