import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TreeItem } from './TreeItem'

interface SortableTreeItemProps {
  readonly id: string
  readonly children: React.ReactNode
  readonly indentationWidth: number
}

export function SortableTreeItem({ id, indentationWidth, children }: SortableTreeItemProps) {
  const { attributes, listeners, setDraggableNodeRef, setDroppableNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      animateLayoutChanges: ({ isSorting, wasDragging }) => !(isSorting || wasDragging)
    })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition
  }

  return (
    <TreeItem
      ref={setDraggableNodeRef}
      wrapperRef={setDroppableNodeRef}
      ghost={isDragging}
      indentationWidth={indentationWidth}
      handleProps={{ ...attributes, ...listeners }}
      style={style}
    >
      {children}
    </TreeItem>
  )
}
