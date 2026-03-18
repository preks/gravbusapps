import React, { useMemo } from 'react'
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ScrollArea, Spinner } from '@newwork/nw-design-system'
import { DraggableNoteTreeItem } from './DraggableNoteTreeItem'
import type { NoteTreeNode } from '../types'
import type { UseNoteTreeDragDropReturn } from '../hooks/useNoteTreeDragDrop'

export interface SortableNoteTreeProps {
  tree: NoteTreeNode[]
  expandedIds: Set<string>
  selectedId: string | null
  isLoading: boolean
  dragDrop: UseNoteTreeDragDropReturn
  onSelect: (id: string) => void
  onToggleExpand: (id: string) => void
  onCreateChild?: (parentId: string) => void
  onRename?: (id: string) => void
  onMove?: (id: string) => void
  onDelete?: (id: string) => void
  onTogglePin?: (id: string) => void
}

function getVisibleNodes(tree: NoteTreeNode[], expandedIds: Set<string>): NoteTreeNode[] {
  const result: NoteTreeNode[] = []
  const walk = (nodes: NoteTreeNode[]) => {
    for (const node of nodes) {
      result.push(node)
      if (node.children.length > 0 && expandedIds.has(node.id)) {
        walk(node.children)
      }
    }
  }
  walk(tree)
  return result
}

export const SortableNoteTree: React.FC<SortableNoteTreeProps> = ({
  tree,
  expandedIds,
  selectedId,
  isLoading,
  dragDrop,
  onSelect,
  onToggleExpand,
  onCreateChild,
  onRename,
  onMove,
  onDelete,
  onTogglePin
}) => {
  const visibleNodes = useMemo(() => getVisibleNodes(tree, expandedIds), [tree, expandedIds])

  const sortableIds = useMemo(() => visibleNodes.map(n => n.id), [visibleNodes])

  const activeNode = useMemo(() => {
    if (!dragDrop.activeId) return null
    return visibleNodes.find(n => n.id === dragDrop.activeId) || null
  }, [dragDrop.activeId, visibleNodes])

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
        <Spinner size="sm" />
      </div>
    )
  }

  return (
    <DndContext
      sensors={dragDrop.sensors}
      collisionDetection={closestCenter}
      onDragStart={dragDrop.handleDragStart}
      onDragOver={dragDrop.handleDragOver}
      onDragEnd={dragDrop.handleDragEnd}
      onDragCancel={dragDrop.handleDragCancel}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <ScrollArea className="gba:flex-1">
          <div className="gba:py-1 gba:px-2" role="tree" data-testid="note-tree">
            {visibleNodes.length === 0 ? (
              <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-xs">No notes yet</div>
            ) : (
              visibleNodes.map(node => {
                const showDropIndicator =
                  dragDrop.overId === node.id && dragDrop.activeId !== node.id && dragDrop.dropProjection !== null

                return (
                  <React.Fragment key={node.id}>
                    {showDropIndicator && dragDrop.dropProjection && (
                      <div
                        className="gba:h-0.5 gba:bg-primary gba:rounded-full gba:mx-2 gba:transition-all gba:duration-150"
                        style={{
                          marginLeft: `${12 + (dragDrop.dropProjection?.depth || 0) * 20}px`
                        }}
                      />
                    )}
                    <DraggableNoteTreeItem
                      node={node}
                      isSelected={selectedId === node.id}
                      isExpanded={expandedIds.has(node.id)}
                      onSelect={onSelect}
                      onToggleExpand={onToggleExpand}
                      onCreateChild={onCreateChild}
                      onRename={onRename}
                      onMove={onMove}
                      onDelete={onDelete}
                      onTogglePin={onTogglePin}
                    />
                  </React.Fragment>
                )
              })
            )}
          </div>
        </ScrollArea>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeNode ? (
          <DraggableNoteTreeItem
            node={activeNode}
            isSelected={false}
            isExpanded={false}
            isOverlay
            onSelect={() => {}}
            onToggleExpand={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
