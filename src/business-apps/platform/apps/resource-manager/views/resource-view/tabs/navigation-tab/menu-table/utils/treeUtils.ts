import type { EnrichedMenuItem } from '../types/menuTree.types'
import { arrayMove } from '@dnd-kit/sortable'

/**
 * Flattened item with computed properties for DnD
 */
export interface FlattenedMenuItem extends EnrichedMenuItem {
  depth: number
  index: number
  visualParentId?: string | null // Computed parent for tree structure (not for backend)
}

/**
 * Flatten a nested tree into a flat list with depth and visualParentId
 * This enables us to use dnd-kit's arrayMove for reordering
 *
 * IMPORTANT: Does NOT overwrite the original parentId/hubId from backend
 */
function flattenNode(
  items: EnrichedMenuItem[],
  visualParentId: string | null = null,
  depth: number = 0
): FlattenedMenuItem[] {
  return items.reduce<FlattenedMenuItem[]>((acc, item, index) => {
    return [...acc, { ...item, visualParentId, depth, index }, ...flattenNode(item.children || [], item.id, depth + 1)]
  }, [])
}

/**
 * Flatten the entire tree
 */
export function flattenTree(items: EnrichedMenuItem[]): FlattenedMenuItem[] {
  return flattenNode(items)
}

/**
 * Build a nested tree from a flat list
 * Reconstructs the hierarchical structure based on parentId and hubId
 *
 * Backend structure:
 * - Level 0 (Hubs): parentId: undefined/null → goes to root
 * - Level 1 (under Hub): parentId: null, hubId: <hub-id> → goes under hub
 * - Level 2+ (nested): parentId: <parent-id>, hubId: <hub-id> → goes under parent
 */
export function buildTree(flattenedItems: FlattenedMenuItem[]): EnrichedMenuItem[] {
  const root: EnrichedMenuItem = {
    id: 'root',
    children: [],
    class: 'hub',
    parentClass: 'space',
    level: -1,
    rank: -1
  }
  const nodes: Record<string, EnrichedMenuItem> = { [root.id]: root }
  const items = flattenedItems.map(item => ({ ...item, children: [] }))

  for (const item of items) {
    const { id, children } = item

    // Determine parent based on backend structure
    // Use visualParentId if available (from DND), otherwise derive from backend fields
    let parentKey: string
    if (item.visualParentId !== undefined) {
      // Use computed visual parent from DND (if present)
      parentKey = item.visualParentId ?? root.id
    } else if (item.level === 0) {
      // Hubs go to root
      parentKey = root.id
    } else if (item.parentId) {
      // Items with explicit parentId (Level 2+)
      parentKey = item.parentId
    } else if (item.hubId) {
      // Items with hubId but no parentId (Level 1)
      parentKey = item.hubId
    } else {
      // Fallback to root
      parentKey = root.id
    }

    const parent = nodes[parentKey] ?? findItemInList(items, parentKey)

    if (parent) {
      nodes[id] = { ...item, children }
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push(item)
    }
  }

  return root.children || []
}

/**
 * Find item in flat list
 */
function findItemInList(items: FlattenedMenuItem[], itemId: string): FlattenedMenuItem | undefined {
  return items.find(({ id }) => id === itemId)
}

/**
 * Calculate projection for drag operation
 * Returns the visual parent (for tree structure) and depth
 * Does NOT calculate backend fields (parentId/hubId) - those are derived at save time
 */
export function getProjection(
  items: FlattenedMenuItem[],
  activeId: string,
  overId: string,
  dragOffset: number,
  indentationWidth: number
): { depth: number; visualParentId: string | null } {
  const overItemIndex = items.findIndex(({ id }) => id === overId)
  const activeItemIndex = items.findIndex(({ id }) => id === activeId)
  const activeItem = items[activeItemIndex]

  if (!activeItem) {
    return { depth: 0, visualParentId: null }
  }

  const newItems = arrayMove(items, activeItemIndex, overItemIndex)
  const previousItem = newItems[overItemIndex - 1]
  const nextItem = newItems[overItemIndex + 1]

  // Calculate depth change based on horizontal drag offset
  const dragDepth = Math.round(dragOffset / indentationWidth)
  const projectedDepth = activeItem.depth + dragDepth

  // Calculate max depth (can only nest under previous item)
  const maxDepth = previousItem ? previousItem.depth + 1 : 0

  // Calculate min depth based on next item
  // IMPORTANT: Only enforce minDepth if nextItem is at a LOWER or EQUAL depth than projected
  // If nextItem is deeper (e.g., a child of a sibling), it shouldn't block flattening
  let minDepth = 0
  if (nextItem) {
    // If we're moving UP (projectedDepth < activeItem.depth), ignore deeper siblings
    if (projectedDepth < activeItem.depth && nextItem.depth > projectedDepth) {
      minDepth = 0 // Don't let deeper siblings block the move up
    } else {
      minDepth = nextItem.depth
    }
  }

  // Additional constraint: Menu items (level > 0) cannot become hubs (depth 0)
  // They must stay at least at depth 1
  const minDepthForLevel = activeItem.level > 0 ? 1 : 0
  const effectiveMinDepth = Math.max(minDepth, minDepthForLevel)

  // Clamp depth
  let depth = projectedDepth
  if (projectedDepth >= maxDepth) {
    depth = maxDepth
  } else if (projectedDepth < effectiveMinDepth) {
    depth = effectiveMinDepth
  }

  // Calculate visual parent for tree structure (NOT backend parentId!)
  function getVisualParentId(): string | null {
    if (depth === 0 || !previousItem) {
      return null
    }

    // Same depth as previous item = same visual parent
    if (depth === previousItem.depth) {
      return previousItem.visualParentId ?? null
    }

    // Deeper than previous item = child of previous item
    if (depth > previousItem.depth) {
      return previousItem.id
    }

    // Shallower than previous item = find ancestor at target depth
    // Special case: if overId === activeId (dropping on itself), use current parent's parent
    if (activeId === overId && depth === activeItem.depth - 1) {
      // Moving up one level: find the parent of the current parent
      const currentParent = newItems.find(item => item.id === activeItem.visualParentId)
      return currentParent?.visualParentId ?? null
    }

    const ancestor = newItems
      .slice(0, overItemIndex)
      .reverse()
      .find(item => item.depth === depth)

    return ancestor?.visualParentId ?? null
  }

  const visualParentId = getVisualParentId()

  return { depth, visualParentId }
}

/**
 * Remove children of specific items from flattened list
 * Used to hide collapsed items
 */
export function removeChildrenOf(items: FlattenedMenuItem[], ids: string[]): FlattenedMenuItem[] {
  const excludeParentIds = [...ids]

  return items.filter(item => {
    // Use visualParentId if available (from DND), otherwise derive from backend structure
    const itemParentId =
      item.visualParentId !== undefined
        ? item.visualParentId
        : item.parentId || (item.hubId && item.level === 1 ? item.hubId : null)

    if (itemParentId && excludeParentIds.includes(itemParentId)) {
      if (item.children?.length) {
        excludeParentIds.push(item.id)
      }
      return false
    }
    return true
  })
}
