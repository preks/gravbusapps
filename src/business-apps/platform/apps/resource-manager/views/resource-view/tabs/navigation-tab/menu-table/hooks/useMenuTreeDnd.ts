import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragMoveEvent
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { EnrichedMenuItem } from '../types/menuTree.types'
import { flattenTree, buildTree, getProjection, removeChildrenOf } from '../utils/treeUtils'
import { calculateDiff } from '../utils/menuTreeDiff'

interface UseMenuTreeDndProps {
  targetTree: EnrichedMenuItem[]
  sourceTree: EnrichedMenuItem[]
  expandedItems: Set<string>
  indentationWidth?: number
  setSourceTree: React.Dispatch<React.SetStateAction<EnrichedMenuItem[]>>
  setTargetTree: React.Dispatch<React.SetStateAction<EnrichedMenuItem[]>>
  setExpandedItems: React.Dispatch<React.SetStateAction<Set<string>>>
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  updateMenuItem: (id: string, data: any, isHub: boolean) => Promise<any>
  refetchMenuItems: () => Promise<void>
}

interface UseMenuTreeDndReturn {
  activeId: string | null
  activeItem: EnrichedMenuItem | null
  overId: string | null
  offsetLeft: number
  flattenedItems: EnrichedMenuItem[]
  projected: { depth: number; parentId: string | null } | null
  sensors: any
  handleDragStart: (event: DragStartEvent) => void
  handleDragMove: (event: DragMoveEvent) => void
  handleDragOver: (event: DragOverEvent) => void
  handleDragEnd: (event: DragEndEvent) => Promise<void>
}

/**
 * Hook for menu tree drag and drop operations
 */
export function useMenuTreeDnd(props: UseMenuTreeDndProps): UseMenuTreeDndReturn {
  const {
    targetTree,
    sourceTree,
    expandedItems,
    indentationWidth = 20,
    setSourceTree,
    setTargetTree,
    setExpandedItems,
    setIsDragging,
    updateMenuItem,
    refetchMenuItems
  } = props

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [offsetLeft, setOffsetLeft] = useState(0)
  const autoExpandedItemsRef = useRef<Set<string>>(new Set())
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const expandedItemsBeforeDragRef = useRef<Set<string>>(new Set())

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  // Flatten tree and remove children of collapsed/active items (like in example)
  const flattenedItems = useMemo(() => {
    const flattenedTree = flattenTree(targetTree)

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/00afbd5c-2483-4caa-966f-80d58bf9e341', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'useMenuTreeDnd.ts:72',
        message: 'flattenedItems calculation',
        data: { flattenedTreeLength: flattenedTree.length, activeId, expandedItemsSize: expandedItems.size },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H4.1'
      })
    }).catch(() => {})
    // #endregion

    // Collect collapsed items
    const collapsedItems = flattenedTree.reduce<string[]>((acc, item) => {
      const isCollapsed = !expandedItems.has(item.id)
      return isCollapsed && item.children && item.children.length > 0 ? [...acc, item.id] : acc
    }, [])

    // Remove children of active item AND collapsed items
    const result = removeChildrenOf(flattenedTree, activeId ? [activeId, ...collapsedItems] : collapsedItems)

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/00afbd5c-2483-4caa-966f-80d58bf9e341', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'useMenuTreeDnd.ts:92',
        message: 'flattenedItems result',
        data: {
          resultLength: result.length,
          collapsedItemsLength: collapsedItems.length,
          firstFiveIds: result.slice(0, 5).map(i => i.id)
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H4.1'
      })
    }).catch(() => {})
    // #endregion

    return result
  }, [activeId, targetTree, expandedItems])

  // Calculate projection for depth changes
  const projected = useMemo(() => {
    if (!activeId || !overId) return null
    const proj = getProjection(flattenedItems, activeId, overId, offsetLeft, indentationWidth)

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/00afbd5c-2483-4caa-966f-80d58bf9e341', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'useMenuTreeDnd.ts:104',
        message: 'Projection calculated',
        data: { activeId, overId, offsetLeft, projection: proj },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H4.2'
      })
    }).catch(() => {})
    // #endregion

    return proj
  }, [activeId, overId, flattenedItems, offsetLeft, indentationWidth])

  // Get active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null
    return flattenedItems.find(item => item.id === activeId) || null
  }, [activeId, flattenedItems])

  // Drag start handler
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const draggedId = event.active.id as string

      setActiveId(draggedId)
      setOverId(draggedId)
      setIsDragging(true)

      // Save current expanded state
      expandedItemsBeforeDragRef.current = new Set(expandedItems)

      // Clear auto-expanded tracking
      autoExpandedItemsRef.current = new Set()

      // Set cursor to grabbing
      document.body.style.setProperty('cursor', 'grabbing')
    },
    [flattenedItems, expandedItems, setIsDragging]
  )

  // Drag move handler (track horizontal offset for depth changes)
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    setOffsetLeft(event.delta.x)
  }, [])

  // Drag over handler - simplified, only tracks overId (no auto-expand logic here)
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over, active } = event

      if (over && over.id !== overId) {
        setOverId(over.id as string)

        // Clear any existing timeout
        if (expandTimeoutRef.current) {
          clearTimeout(expandTimeoutRef.current)
          expandTimeoutRef.current = null
        }

        // Only auto-expand when dragging menu items (not hubs)
        const activeItem = flattenedItems.find(item => item.id === active.id)
        const isHub = activeItem?.level === 0

        if (!isHub) {
          // Start new timeout to expand item after 800ms hover
          expandTimeoutRef.current = setTimeout(() => {
            const overItem = flattenedItems.find(item => item.id === over.id)
            if (
              overItem &&
              overItem.children &&
              overItem.children.length > 0 &&
              !expandedItems.has(over.id as string)
            ) {
              setExpandedItems(prev => {
                const newSet = new Set(prev)
                newSet.add(over.id as string)
                return newSet
              })
              // Track that this was auto-expanded
              autoExpandedItemsRef.current.add(over.id as string)
            }
          }, 800)
        }
      }
    },
    [overId, flattenedItems, expandedItems, setExpandedItems]
  )

  // Drag end handler - following example pattern: flatten -> arrayMove -> buildTree
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/00afbd5c-2483-4caa-966f-80d58bf9e341', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'useMenuTreeDnd.ts:173',
          message: 'handleDragEnd entry',
          data: {
            activeId: active.id,
            overId: over?.id,
            projectedDepth: projected?.depth,
            projectedParentId: projected?.parentId
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H1.2'
        })
      }).catch(() => {})
      // #endregion

      // Reset state
      setActiveId(null)
      setOverId(null)
      setOffsetLeft(0)
      setIsDragging(false)

      // Reset cursor
      document.body.style.setProperty('cursor', '')

      // Clear expand timeout
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current)
        expandTimeoutRef.current = null
      }

      // Close auto-expanded items
      if (autoExpandedItemsRef.current.size > 0) {
        setExpandedItems(prev => {
          const newSet = new Set(prev)
          autoExpandedItemsRef.current.forEach(id => newSet.delete(id))
          return newSet
        })
        autoExpandedItemsRef.current.clear()
      }

      // If just canceling drag (no drop), restore previous state
      if (!over || active.id === over.id) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/00afbd5c-2483-4caa-966f-80d58bf9e341', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useMenuTreeDnd.ts:207',
            message: 'Early return - no over or same',
            data: { hasOver: !!over, sameId: active.id === over?.id },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'H1.2'
          })
        }).catch(() => {})
        // #endregion
        return
      }

      // Check if we have valid projection
      if (!projected) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/00afbd5c-2483-4caa-966f-80d58bf9e341', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useMenuTreeDnd.ts:216',
            message: 'Early return - no projection',
            data: {},
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'H1.2'
          })
        }).catch(() => {})
        // #endregion
        return
      }

      const { depth, parentId } = projected

      // Clone flattened items from source tree (to preserve loadedRank)
      const clonedItems = JSON.parse(JSON.stringify(flattenTree(targetTree)))
      const overIndex = clonedItems.findIndex((item: any) => item.id === over.id)
      const activeIndex = clonedItems.findIndex((item: any) => item.id === active.id)

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/00afbd5c-2483-4caa-966f-80d58bf9e341', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'useMenuTreeDnd.ts:228',
          message: 'Before arrayMove',
          data: { activeIndex, overIndex, activeId: active.id, overId: over.id },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H1.3'
        })
      }).catch(() => {})
      // #endregion

      if (overIndex === -1 || activeIndex === -1) {
        return
      }

      const activeTreeItem = clonedItems[activeIndex]

      // Validation: Hubs cannot become children of menu items
      if (activeTreeItem.level === 0 && depth > 0) {
        return
      }

      // Update depth and parentId on active item
      clonedItems[activeIndex] = { ...activeTreeItem, depth, parentId }

      // Reorder using arrayMove
      const sortedItems = arrayMove(clonedItems, activeIndex, overIndex)

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/00afbd5c-2483-4caa-966f-80d58bf9e341', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'useMenuTreeDnd.ts:248',
          message: 'After arrayMove',
          data: {
            sortedItemsLength: sortedItems.length,
            firstThree: sortedItems.slice(0, 3).map((i: any) => ({ id: i.id, depth: i.depth, parentId: i.parentId }))
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H1.3'
        })
      }).catch(() => {})
      // #endregion

      // Rebuild tree structure
      const newTargetTree = buildTree(sortedItems)

      // Update targetTree state
      setTargetTree(newTargetTree)

      // Calculate diff between source and target
      const changes = calculateDiff(sourceTree, newTargetTree, active.id as string)

      console.log('[DND] Changes to save:', changes)

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/00afbd5c-2483-4caa-966f-80d58bf9e341', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'useMenuTreeDnd.ts:263',
          message: 'Changes calculated',
          data: {
            changesCount: changes.length,
            changes: changes.map(c => ({ id: c.id, rank: c.rank, _debug: c._debug }))
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H1.1'
        })
      }).catch(() => {})
      // #endregion

      // If no changes, just return
      if (changes.length === 0) {
        return
      }

      // Apply batch updates
      try {
        await Promise.all(changes.map(change => updateMenuItem(change.id, change, change.level === 0)))

        // On success: Update sourceTree to match targetTree
        setSourceTree(JSON.parse(JSON.stringify(newTargetTree)))

        // Refetch to ensure consistency
        await refetchMenuItems()
      } catch (err) {
        console.error('[DND] Failed to save changes:', err)
        // On failure: Revert targetTree to sourceTree
        setTargetTree(JSON.parse(JSON.stringify(sourceTree)))
      }
    },
    [
      projected,
      targetTree,
      sourceTree,
      updateMenuItem,
      refetchMenuItems,
      setSourceTree,
      setTargetTree,
      setExpandedItems,
      setIsDragging
    ]
  )

  // Cleanup expand timeout on unmount
  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current)
      }
    }
  }, [])

  return {
    activeId,
    activeItem,
    overId,
    offsetLeft,
    flattenedItems,
    projected,
    sensors,
    handleDragStart,
    handleDragMove,
    handleDragOver,
    handleDragEnd
  }
}
