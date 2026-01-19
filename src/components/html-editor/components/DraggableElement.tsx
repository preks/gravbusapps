import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@newwork/nw-design-system'
import { DotsSixVerticalIcon, TrashIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { EditorElement } from '../types'
import { generateElementHtml } from '../templates'
import { ResizeHandle } from './ResizeHandle'

interface DraggableElementProps {
  element: EditorElement
  index: number
  onEdit: (element: EditorElement) => void
  onDelete: (id: string) => void
  onResize?: (id: string, newColSpan: number) => void
  disabled?: boolean
  prefixDataTestId?: string
}

export const DraggableElement: React.FC<DraggableElementProps> = ({
  element,
  index,
  onEdit,
  onDelete,
  onResize,
  disabled,
  prefixDataTestId = 'draggable-element'
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: element.id,
    disabled
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const renderContent = () => {
    // Generate HTML from element configuration using design system templates
    const html = generateElementHtml(element)
    return <div dangerouslySetInnerHTML={{ __html: html }} />
  }

  // Map colSpan to explicit Tailwind classes for proper purging
  const getColSpanClass = (colSpan?: number) => {
    switch (colSpan) {
      case 1:
        return 'gba:col-span-1'
      case 2:
        return 'gba:col-span-2'
      case 3:
        return 'gba:col-span-3'
      case 4:
        return 'gba:col-span-4'
      case 5:
        return 'gba:col-span-5'
      case 6:
        return 'gba:col-span-6'
      case 7:
        return 'gba:col-span-7'
      case 8:
        return 'gba:col-span-8'
      case 9:
        return 'gba:col-span-9'
      case 10:
        return 'gba:col-span-10'
      case 11:
        return 'gba:col-span-11'
      case 12:
        return 'gba:col-span-12'
      default:
        return 'gba:col-span-12'
    }
  }

  const colSpanClass = getColSpanClass(element.colSpan)

  const handleResize = (deltaColumns: number) => {
    if (!onResize || deltaColumns === 0) return

    const currentSpan = element.colSpan || 12
    let newSpan = currentSpan + deltaColumns

    // Clamp to valid range (all columns 1-12)
    newSpan = Math.max(1, Math.min(12, newSpan))

    // Only update if changed
    if (newSpan !== currentSpan) {
      onResize(element.id, newSpan as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`gba:group gba:relative gba:border gba:border-input gba:rounded gba:p-4 gba:transition-all gba:hover:border-primary gba:hover:shadow-sm gba:bg-background ${colSpanClass}`}
      data-testid={`${prefixDataTestId}-${index}`}
    >
      {/* Drag Handle & Width Indicator - Always visible on left */}
      <div className="gba:absolute gba:left-2 gba:top-2 gba:flex gba:items-start gba:gap-1">
        <Button
          variant="ghost"
          size="iconSm"
          className="gba:cursor-grab gba:active:cursor-grabbing gba:bg-muted/50 gba:hover:bg-muted"
          {...attributes}
          {...listeners}
          disabled={disabled}
          data-testid={`${prefixDataTestId}-drag-handle-${index}`}
          title="Drag to reorder"
        >
          <DotsSixVerticalIcon className="gba:w-4 gba:h-4" />
        </Button>
        <div className="gba:flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted/70 gba:text-xs gba:text-muted-foreground gba:font-mono">
          {element.colSpan || 12}/12
        </div>
      </div>

      {/* Action Buttons - Always visible on right */}
      <div className="gba:absolute gba:right-2 gba:top-2 gba:flex gba:gap-1">
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => onEdit(element)}
          disabled={disabled}
          data-testid={`${prefixDataTestId}-edit-${index}`}
          title="Edit element"
          className="gba:bg-muted/50 gba:hover:bg-muted"
        >
          <PencilSimpleIcon className="gba:w-4 gba:h-4" />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => onDelete(element.id)}
          disabled={disabled}
          data-testid={`${prefixDataTestId}-delete-${index}`}
          title="Delete element"
          className="gba:bg-muted/50 gba:hover:bg-destructive gba:hover:text-destructive-foreground"
        >
          <TrashIcon className="gba:w-4 gba:h-4" />
        </Button>
      </div>

      {/* Resize Handles - Only show right handle (simpler UX) */}
      {!disabled && onResize && (
        <ResizeHandle
          position="right"
          onResize={handleResize}
          disabled={disabled}
          prefixDataTestId={`${prefixDataTestId}-resize`}
        />
      )}

      {/* Content with padding for buttons and width indicator */}
      <div className="gba:min-h-[2rem] gba:prose gba:prose-sm gba:max-w-none gba:pl-20 gba:pr-20">
        {renderContent()}
      </div>
    </div>
  )
}

export default DraggableElement
