import { useState, useCallback, useRef } from 'react'
import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type UniqueIdentifier
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { NoteTreeNode } from '../types'

export interface DropProjection {
  parentId: string | null
  position: number
  depth: number
}

export interface UseNoteTreeDragDropOptions {
  flatNodes: NoteTreeNode[]
  expandedIds: Set<string>
  onMoveNode: (nodeId: string, parentId: string | null, position: number) => Promise<boolean>
  toggleExpand: (id: string) => void
}

export interface UseNoteTreeDragDropReturn {
  sensors: ReturnType<typeof useSensors>
  activeId: UniqueIdentifier | null
  overId: UniqueIdentifier | null
  dropProjection: DropProjection | null
  handleDragStart: (event: DragStartEvent) => void
  handleDragOver: (event: DragOverEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
  handleDragCancel: () => void
}

const INDENT_PX = 24

function computeProjection(
  flatNodes: NoteTreeNode[],
  activeId: string,
  overId: string,
  offsetX: number
): DropProjection | null {
  const overIndex = flatNodes.findIndex(n => n.id === overId)
  if (overIndex === -1) return null

  const overNode = flatNodes[overIndex]
  const indentShift = Math.round(offsetX / INDENT_PX)
  const targetDepth = Math.max(0, overNode.depth + indentShift)

  if (targetDepth > overNode.depth) {
    return {
      parentId: overNode.id,
      position: 0,
      depth: overNode.depth + 1
    }
  }

  const parentId = overNode.parentId || null
  let siblingIndex = 0

  if (parentId) {
    const siblings = flatNodes.filter(n => n.parentId === parentId && n.id !== activeId)
    const overSiblingIndex = siblings.findIndex(n => n.id === overId)
    siblingIndex = overSiblingIndex >= 0 ? overSiblingIndex + 1 : siblings.length
  } else {
    const roots = flatNodes.filter(n => !n.parentId && n.depth === 0 && n.id !== activeId)
    const overRootIndex = roots.findIndex(n => n.id === overId)
    siblingIndex = overRootIndex >= 0 ? overRootIndex + 1 : roots.length
  }

  return {
    parentId,
    position: siblingIndex,
    depth: overNode.depth
  }
}

export function useNoteTreeDragDrop(options: UseNoteTreeDragDropOptions): UseNoteTreeDragDropReturn {
  const { flatNodes, onMoveNode } = options

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null)
  const [dropProjection, setDropProjection] = useState<DropProjection | null>(null)
  const offsetXRef = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id)
    setOverId(null)
    setDropProjection(null)
    offsetXRef.current = 0
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over, delta } = event
      if (!over || !activeId) {
        setOverId(null)
        setDropProjection(null)
        return
      }

      setOverId(over.id)
      offsetXRef.current = delta.x

      const projection = computeProjection(flatNodes, String(activeId), String(over.id), delta.x)
      setDropProjection(projection)
    },
    [activeId, flatNodes]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active } = event
      const projection = dropProjection

      setActiveId(null)
      setOverId(null)
      setDropProjection(null)
      offsetXRef.current = 0

      if (!projection || !active) return

      await onMoveNode(String(active.id), projection.parentId, projection.position)
    },
    [dropProjection, onMoveNode]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setOverId(null)
    setDropProjection(null)
    offsetXRef.current = 0
  }, [])

  return {
    sensors,
    activeId,
    overId,
    dropProjection,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel
  }
}
