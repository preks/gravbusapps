import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Badge } from '@newwork/nw-design-system'
import { DotsSixVerticalIcon, PencilIcon, TrashIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FieldDefinition } from '../types'

interface SortableFieldItemProps extends BusinessAppContextProps {
  field: FieldDefinition
  onEdit: () => void
  onDelete: () => void
  prefixDataTestId?: string
}

export const SortableFieldItem: React.FC<SortableFieldItemProps> = ({
  field,
  onEdit,
  onDelete,
  prefixDataTestId = 'sortable-field'
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-md gba:border gba:border-border gba:bg-card gba:h-full"
      data-testid={prefixDataTestId}
    >
      {/* Header with drag handle and actions */}
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <div
          {...listeners}
          {...attributes}
          className="gba:cursor-grab gba:flex gba:items-center gba:text-muted-foreground"
          data-testid={`${prefixDataTestId}-drag-handle`}
        >
          <DotsSixVerticalIcon size={20} />
        </div>

        <div className="gba:flex gba:items-center gba:gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            data-testid={`${prefixDataTestId}-edit`}
            aria-label={`Edit ${field.label}`}
          >
            <PencilIcon />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            data-testid={`${prefixDataTestId}-delete`}
            aria-label={`Delete ${field.label}`}
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      {/* Field Info */}
      <div className="gba:flex-1" data-testid={`${prefixDataTestId}-info`}>
        <div className="gba:mb-2">
          <span className="gba:font-semibold gba:text-sm gba:block">{field.label}</span>
        </div>
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:mb-2">
          {field.required && <Badge variant="destructive">Required</Badge>}
          <Badge variant="outline">{field.type}</Badge>
          <Badge variant="secondary" className="gba:bg-info-secondary gba:text-info-secondary-foreground">
            {field.displayOrder}
          </Badge>
        </div>
        <div className="gba:text-xs gba:text-muted-foreground gba:break-all">{field.property}</div>
      </div>
    </div>
  )
}
