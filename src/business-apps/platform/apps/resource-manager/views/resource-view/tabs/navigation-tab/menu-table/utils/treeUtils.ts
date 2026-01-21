import type { EnrichedMenuItem } from '../types/menuTree.types'
import { arrayMove } from '@dnd-kit/sortable'

/**
 * Flattened item with computed properties for DnD
 */
export interface FlattenedMenuItem extends EnrichedMenuItem {
  depth: number
  index: number
}

/**
 * Flatten a nested tree into a flat list with depth and parentId
 * This enables us to use dnd-kit's arrayMove for reordering
 */
function flattenNode(
  items: EnrichedMenuItem[],
  parentId: string | null = null,
  depth: number = 0
): FlattenedMenuItem[] {
  return items.reduce<FlattenedMenuItem[]>((acc, item, index) => {
    return [...acc, { ...item, parentId, depth, index }, ...flattenNode(item.children || [], item.id, depth + 1)]
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
 * Reconstructs the hierarchical structure based on parentId
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
    const parentId = item.parentId ?? root.id
    const parent = nodes[parentId] ?? findItemInList(items, parentId)

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
 * Determines new depth and parentId based on drag position and offset
 */
export function getProjection(
  items: FlattenedMenuItem[],
  activeId: string,
  overId: string,
  dragOffset: number,
  indentationWidth: number
): { depth: number; parentId: string | null } {
  const overItemIndex = items.findIndex(({ id }) => id === overId)
  const activeItemIndex = items.findIndex(({ id }) => id === activeId)
  const activeItem = items[activeItemIndex]

  if (!activeItem) {
    return { depth: 0, parentId: null }
  }

  const newItems = arrayMove(items, activeItemIndex, overItemIndex)
  const previousItem = newItems[overItemIndex - 1]
  const nextItem = newItems[overItemIndex + 1]

  // Calculate depth change based on horizontal drag offset
  const dragDepth = Math.round(dragOffset / indentationWidth)
  const projectedDepth = activeItem.depth + dragDepth

  // Calculate max depth (can only nest under previous item)
  const maxDepth = previousItem ? previousItem.depth + 1 : 0

  // Calculate min depth (must be at least as deep as next item)
  const minDepth = nextItem ? nextItem.depth : 0

  // Clamp depth
  let depth = projectedDepth
  if (projectedDepth >= maxDepth) {
    depth = maxDepth
  } else if (projectedDepth < minDepth) {
    depth = minDepth
  }

  // Calculate parentId based on depth
  function getParentId(): string | null {
    if (depth === 0 || !previousItem) {
      return null
    }

    // Same depth as previous item = same parent
    if (depth === previousItem.depth) {
      return previousItem.parentId
    }

    // Deeper than previous item = child of previous item
    if (depth > previousItem.depth) {
      return previousItem.id
    }

    // Shallower than previous item = find ancestor at target depth
    const newParent = newItems
      .slice(0, overItemIndex)
      .reverse()
      .find(item => item.depth === depth)?.parentId

    return newParent ?? null
  }

  return { depth, parentId: getParentId() }
}

/**
 * Remove children of specific items from flattened list
 * Used to hide collapsed items
 */
export function removeChildrenOf(items: FlattenedMenuItem[], ids: string[]): FlattenedMenuItem[] {
  const excludeParentIds = [...ids]

  return items.filter(item => {
    if (item.parentId && excludeParentIds.includes(item.parentId)) {
      if (item.children?.length) {
        excludeParentIds.push(item.id)
      }
      return false
    }
    return true
  })
}
