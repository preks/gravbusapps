import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge, Button, Card, CardAction, CardContent, CardHeader } from '@newwork/nw-design-system'
import { DotsSixVerticalIcon, PencilIcon, TrashIcon } from '@phosphor-icons/react'
import { ProspectField } from '../types'

interface SortableProspectItemProps {
  field: ProspectField
  onEdit?: () => void
  onDelete?: () => void
  prefixDataTestId?: string
  isReadOnly?: boolean
}

export const SortableProspectItem: React.FC<SortableProspectItemProps> = ({
  field,
  onEdit,
  onDelete,
  prefixDataTestId = 'sortable-prospect',
  isReadOnly = false
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.key,
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
            aria-label={`Drag ${field.label}`}
          >
            <DotsSixVerticalIcon size={20} />
          </button>
        )}

        {!isReadOnly && (
          <CardAction className="gba:flex gba:items-center gba:gap-1">
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
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="gba:px-3" data-testid={`${prefixDataTestId}-info`}>
        <div className="gba:mb-2">
          <span className="gba:font-semibold gba:text-sm gba:block">{field.label}</span>
        </div>
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:mb-2">
          <Badge variant="outline">{field.type}</Badge>
          <Badge variant="secondary">{field.section}</Badge>
          <Badge variant="info">Order: {field.displayOrder}</Badge>
        </div>
        <div className="gba:text-xs gba:text-muted-foreground gba:break-all">Property: {field.property}</div>
      </CardContent>
    </Card>
  )
}
