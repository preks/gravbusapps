import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TreeItem } from './TreeItem'

interface SortableTreeItemProps {
  id: string
  isDraft: boolean
  children: React.ReactNode
  indicator?: boolean
  indentationWidth: number
}

export function SortableTreeItem({
  id,
  isDraft,
  indicator = false,
  indentationWidth,
  children
}: SortableTreeItemProps) {
  const { attributes, listeners, setDraggableNodeRef, setDroppableNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      animateLayoutChanges: ({ isSorting, wasDragging }) => (isSorting || wasDragging ? false : true)
    })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition
  }

  // #region agent log
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7244/ingest/00afbd5c-2483-4caa-966f-80d58bf9e341', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'SortableTreeItem.tsx:38',
        message: 'Render SortableTreeItem',
        data: { id, indicator, isDragging, indentationWidth },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H2.1,H2.2'
      })
    }).catch(() => {})
  }
  // #endregion

  return (
    <TreeItem
      ref={setDraggableNodeRef}
      wrapperRef={setDroppableNodeRef}
      id={id}
      isDraft={isDraft}
      ghost={isDragging}
      indicator={indicator}
      indentationWidth={indentationWidth}
      handleProps={{ ...attributes, ...listeners }}
      style={style}
    >
      {children}
    </TreeItem>
  )
}
