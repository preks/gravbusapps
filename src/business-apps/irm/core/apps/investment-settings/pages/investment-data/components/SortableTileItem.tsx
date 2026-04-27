import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Card, CardAction, CardContent, CardHeader, Input, Label } from '@newwork/nw-design-system'
import { DotsSixVerticalIcon, XIcon } from '@phosphor-icons/react'
import { TileField } from '../types'
import { IconSelect } from '@/components/icon-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface SortableTileItemProps extends BusinessAppContextProps {
  tile: TileField
  onUpdate?: (updatedTile: TileField) => void
  onDelete?: () => void
  prefixDataTestId?: string
  isReadOnly?: boolean
}

export const SortableTileItem: React.FC<SortableTileItemProps> = ({
  tile,
  onUpdate,
  onDelete,
  prefixDataTestId = 'sortable-tile',
  isReadOnly = false
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tile.key,
    disabled: isReadOnly
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <Card
      ref={setNodeRef}
      variant="default"
      style={style}
      className="gba:group gba:gap-2 gba:py-3 gba:shadow-sm gba:transition-shadow gba:duration-300 hover:gba:shadow-md"
      data-testid={prefixDataTestId}
    >
      <CardHeader className="gba:px-3 gba:items-center">
        {!isReadOnly && (
          <button
            type="button"
            {...listeners}
            {...attributes}
            className="gba:cursor-grab gba:flex gba:items-center gba:bg-transparent gba:border-0 gba:p-0 gba:text-muted-foreground gba:rounded gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring"
            data-testid={`${prefixDataTestId}-drag-handle`}
            aria-label={`Drag ${tile.label}`}
          >
            <DotsSixVerticalIcon size={20} />
          </button>
        )}

        {!isReadOnly && (
          <CardAction>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              data-testid={`${prefixDataTestId}-delete`}
              aria-label={`Delete ${tile.label}`}
            >
              <XIcon />
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="gba:px-3 gba:flex gba:items-start gba:gap-3" data-testid={`${prefixDataTestId}-info`}>
        <div className="gba:w-[60px] gba:flex-shrink-0" data-testid={`${prefixDataTestId}-icon`}>
          <Label>Icon</Label>
          <IconSelect
            value={tile.icon}
            onValueChange={value => onUpdate?.({ ...tile, icon: value })}
            disabled={isReadOnly}
            className="gba:w-full"
            data-testid={`${prefixDataTestId}-icon-select`}
          />
        </div>

        <div className="gba:flex-1 gba:space-y-3" data-testid={`${prefixDataTestId}-inputs`}>
          <div>
            <Label>Label</Label>
            <Input
              value={tile.label}
              onChange={e => onUpdate?.({ ...tile, label: e.target.value })}
              placeholder="Enter tile label"
              disabled={isReadOnly}
              data-testid={`${prefixDataTestId}-label-input`}
            />
          </div>
          <div>
            <Label>Key</Label>
            <Input
              value={tile.key}
              onChange={e => onUpdate?.({ ...tile, key: e.target.value })}
              placeholder="e.g., description"
              disabled={isReadOnly}
              className="gba:font-mono gba:text-xs"
              data-testid={`${prefixDataTestId}-key-input`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
