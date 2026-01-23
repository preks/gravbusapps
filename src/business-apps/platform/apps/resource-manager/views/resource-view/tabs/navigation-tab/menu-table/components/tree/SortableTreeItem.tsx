import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TreeItem } from './TreeItem'

interface SortableTreeItemProps {
  id: string
  isDraft: boolean
  children: React.ReactNode
  indentationWidth: number
}

export function SortableTreeItem({ id, isDraft, indentationWidth, children }: SortableTreeItemProps) {
  const { attributes, listeners, setDraggableNodeRef, setDroppableNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      animateLayoutChanges: ({ isSorting, wasDragging }) => (isSorting || wasDragging ? false : true)
    })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition
  }

  return (
    <TreeItem
      ref={setDraggableNodeRef}
      wrapperRef={setDroppableNodeRef}
      id={id}
      isDraft={isDraft}
      ghost={isDragging}
      indentationWidth={indentationWidth}
      handleProps={{ ...attributes, ...listeners }}
      style={style}
    >
      {children}
    </TreeItem>
  )
}
