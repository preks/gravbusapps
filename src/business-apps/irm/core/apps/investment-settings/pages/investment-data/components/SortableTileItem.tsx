import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Input, Label } from '@newwork/nw-design-system'
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
    <div
      ref={setNodeRef}
      style={style}
      className="gba:flex gba:items-start gba:gap-3 gba:p-4 gba:rounded-md gba:border gba:border-border gba:bg-card"
      data-testid={prefixDataTestId}
    >
      {/* Drag Handle */}
      {!isReadOnly && (
        <div
          {...listeners}
          {...attributes}
          className="gba:cursor-grab gba:flex gba:items-center gba:text-muted-foreground gba:mt-8"
          data-testid={`${prefixDataTestId}-drag-handle`}
        >
          <DotsSixVerticalIcon size={20} />
        </div>
      )}

      {/* Icon Selector */}
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

      {/* Label and Key Inputs */}
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

      {/* Delete Button */}
      {!isReadOnly && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          className="gba:mt-8"
          data-testid={`${prefixDataTestId}-delete`}
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
