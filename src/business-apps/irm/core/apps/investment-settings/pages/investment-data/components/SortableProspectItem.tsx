import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Badge } from '@newwork/nw-design-system'
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
    <div
      ref={setNodeRef}
      style={style}
      className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-md gba:border gba:border-gray-200 gba:bg-white"
      data-testid={prefixDataTestId}
    >
      {/* Drag Handle */}
      {!isReadOnly && (
        <div
          {...listeners}
          {...attributes}
          style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'var(--nw-color-text-secondary)' }}
          data-testid={`${prefixDataTestId}-drag-handle`}
        >
          <DotsSixVerticalIcon size={20} />
        </div>
      )}

      {/* Field Info */}
      <div className="gba:flex-1" data-testid={`${prefixDataTestId}-info`}>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{field.label}</span>
          <Badge variant="outline">{field.type}</Badge>
          <Badge variant="secondary">{field.section}</Badge>
          <Badge
            variant="secondary"
            style={{ backgroundColor: 'var(--nw-color-blue-100)', color: 'var(--nw-color-blue-800)' }}
          >
            Order: {field.displayOrder}
          </Badge>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--nw-color-text-secondary)' }}>Property: {field.property}</div>
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="gba:flex gba:items-center gba:gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit} data-testid={`${prefixDataTestId}-edit`}>
            <PencilIcon />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} data-testid={`${prefixDataTestId}-delete`}>
            <TrashIcon />
          </Button>
        </div>
      )}
    </div>
  )
}
