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

interface UseMenuTreeDndProps {
  targetTree: EnrichedMenuItem[]
  sourceTree: EnrichedMenuItem[]
  expandedItems: Set<string>
  indentationWidth?: number
  setSourceTree: React.Dispatch<React.SetStateAction<EnrichedMenuItem[]>>
  setTargetTree: React.Dispatch<React.SetStateAction<EnrichedMenuItem[]>>
  setExpandedItems: React.Dispatch<React.SetStateAction<Set<string>>>
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  setMovedItemIds: React.Dispatch<React.SetStateAction<Set<string>>>
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
    expandedItems,
    indentationWidth = 20,
    setTargetTree,
    setExpandedItems,
    setIsDragging,
    setMovedItemIds
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

    // Collect collapsed items
    const collapsedItems = flattenedTree.reduce<string[]>((acc, item) => {
      const isCollapsed = !expandedItems.has(item.id)
      return isCollapsed && item.children && item.children.length > 0 ? [...acc, item.id] : acc
    }, [])

    // Remove children of active item AND collapsed items
    const result = removeChildrenOf(flattenedTree, activeId ? [activeId, ...collapsedItems] : collapsedItems)

    return result
  }, [activeId, targetTree, expandedItems])

  // Calculate projection for depth changes
  const projected = useMemo(() => {
    if (!activeId || !overId) return null
    const proj = getProjection(flattenedItems, activeId, overId, offsetLeft, indentationWidth)

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
      // BUT: Allow drop if depth changed (even if overId === activeId)
      if (!over) {
        return
      }

      // Check if we have valid projection
      if (!projected) {
        return
      }

      const { depth, visualParentId } = projected

      // Allow drop on self ONLY if depth changed
      if (active.id === over.id) {
        const activeItem = flattenedItems.find(item => item.id === active.id)
        if (!activeItem || depth === activeItem.depth) {
          return // Cancel: same position, no depth change
        }
      }

      // Clone flattened items from source tree (to preserve loadedRank)
      const clonedItems = JSON.parse(JSON.stringify(flattenTree(targetTree)))
      const overIndex = clonedItems.findIndex((item: any) => item.id === over.id)
      const activeIndex = clonedItems.findIndex((item: any) => item.id === active.id)

      if (overIndex === -1 || activeIndex === -1) {
        return
      }

      const activeTreeItem = clonedItems[activeIndex]

      // Validation: Hubs (level 0) must stay at depth 0
      // They can be reordered within their space but not moved to other depths
      if (activeTreeItem.level === 0 && depth !== 0) {
        console.warn('[DND] Hubs cannot change depth - must stay at level 0')
        return
      }

      // Validation: Menu items (level > 0) cannot become hubs (depth 0)
      if (activeTreeItem.level > 0 && depth === 0) {
        console.warn('[DND] Menu items cannot become hubs')
        return
      }

      // Calculate backend fields based on new depth and visual parent
      // IMPORTANT: Only ONE of (type, hubId, parentId) should be set at a time
      // - Level 0 (Hub): type = <type>, parentId = undefined, hubId = undefined
      // - Level 1 (under Hub): parentId = null, hubId = <hub-id>, type = undefined
      // - Level 2+ (nested): parentId = <parent-id>, hubId = <hub-id>, type = undefined

      let backendParentId: string | null | undefined
      let backendHubId: string | null | undefined
      let backendType: string | undefined

      if (depth === 0) {
        // Hub level - only type is set, clear parent/hub
        backendParentId = undefined
        backendHubId = undefined
        backendType = activeTreeItem.type // Keep existing type
      } else if (depth === 1) {
        // Menu item under hub - only hubId is set, parentId must be null, clear type
        backendParentId = null
        backendHubId = visualParentId
        backendType = undefined // Clear type when moving from hub to menu item
      } else {
        // Nested menu item (depth 2+) - parentId is set, hubId is NULL, clear type
        // IMPORTANT: Level 2+ items have hubId: null (not inherited from hub)
        backendParentId = visualParentId
        backendHubId = null // Always null for nested items (level 2+)
        backendType = undefined // Clear type
      }

      // Update item with new depth, visualParentId, and backend fields
      clonedItems[activeIndex] = {
        ...activeTreeItem,
        depth,
        visualParentId,
        parentId: backendParentId,
        hubId: backendHubId,
        type: backendType
      }

      // Reorder using arrayMove
      const sortedItems = arrayMove(clonedItems, activeIndex, overIndex)

      // Rebuild tree structure
      const newTargetTree = buildTree(sortedItems)

      // Update targetTree state (NO auto-save, just local state change)
      setTargetTree(newTargetTree)

      // Auto-expand the parent if item was nested under a new parent
      if (visualParentId && visualParentId !== activeTreeItem.visualParentId) {
        setExpandedItems(prev => {
          const next = new Set(prev)
          next.add(visualParentId)
          return next
        })
      }

      // Track that this item was moved for efficient diff calculation
      setMovedItemIds(prev => {
        const next = new Set(prev)
        next.add(active.id as string)
        return next
      })

      console.log('[DND] Tree updated locally (no auto-save). Use Save All to persist changes.')
    },
    [projected, targetTree, setTargetTree, setExpandedItems, setIsDragging, setMovedItemIds]
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
