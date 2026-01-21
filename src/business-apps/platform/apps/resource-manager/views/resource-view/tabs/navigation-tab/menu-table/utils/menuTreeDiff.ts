import type { EnrichedMenuItem } from '../types/menuTree.types'

/**
 * Change to be saved to backend
 */
export interface MenuItemChange {
  id: string
  rank?: number
  parentId?: string | null
  hubId?: string | null
  level?: number
  type?: 'USE' | 'CREATE' | 'MANAGE'
  // Debug info
  _debug?: {
    loadedRank: number | undefined
    sourceRank: number | undefined
    targetRank: number | undefined
  }
}

/**
 * Find an item in the tree by ID
 */
function findItemInTree(tree: EnrichedMenuItem[], id: string): EnrichedMenuItem | null {
  for (const item of tree) {
    if (item.id === id) return item
    if (item.children && item.children.length > 0) {
      const found = findItemInTree(item.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Find the siblings of an item in the tree
 * For hubs (level 0), only return hubs with the same type (space)
 * For menu items, return all items with the same parent
 */
function findSiblings(
  tree: EnrichedMenuItem[],
  itemId: string
): { siblings: EnrichedMenuItem[]; parentKey: string } | null {
  function traverse(
    items: EnrichedMenuItem[],
    parentKey: string
  ): { siblings: EnrichedMenuItem[]; parentKey: string } | null {
    for (const item of items) {
      if (item.id === itemId) {
        // Found the item
        // If it's a hub (level 0), filter siblings by type (space)
        if (item.level === 0) {
          const hubsInSameSpace = items.filter(i => i.level === 0 && i.type === item.type)
          return { siblings: hubsInSameSpace, parentKey }
        }
        // Otherwise return all siblings
        return { siblings: items, parentKey }
      }
      if (item.children && item.children.length > 0) {
        const result = traverse(item.children, item.id)
        if (result) return result
      }
    }
    return null
  }

  return traverse(tree, 'root')
}

/**
 * Calculate differences between source and target trees
 * Returns all siblings of the moved item (and optionally old siblings if parent changed)
 *
 * Logic:
 * - sourceTree has loadedRank (original DB rank)
 * - targetTree array position = new rank
 * - Save if array index !== sourceTree.loadedRank
 */
export function calculateDiff(
  sourceTree: EnrichedMenuItem[],
  targetTree: EnrichedMenuItem[],
  movedItemId: string
): MenuItemChange[] {
  const changes: MenuItemChange[] = []

  // Find moved item in target tree to get its new parent context
  const targetItem = findItemInTree(targetTree, movedItemId)
  if (!targetItem) return changes

  // Find moved item in source tree to get its old parent context
  const sourceItem = findItemInTree(sourceTree, movedItemId)
  if (!sourceItem) return changes

  // Get target siblings (new siblings after move)
  const targetSiblingsResult = findSiblings(targetTree, movedItemId)
  if (!targetSiblingsResult) return changes
  const { siblings: targetSiblings } = targetSiblingsResult

  // Check all target siblings - use array index as new rank
  targetSiblings.forEach((targetSibling, targetIndex) => {
    const sourceSibling = findItemInTree(sourceTree, targetSibling.id)
    if (!sourceSibling) return

    // Find source index for debug
    const sourceSiblingsResult = findSiblings(sourceTree, targetSibling.id)
    const sourceIndex = sourceSiblingsResult?.siblings.findIndex(s => s.id === targetSibling.id) ?? -1

    const itemChanges: Partial<MenuItemChange> = {}
    let hasChanges = false

    // Compare: targetIndex (array position = new rank) vs sourceSibling.loadedRank (DB rank)
    if (targetIndex !== sourceSibling.loadedRank) {
      itemChanges.rank = targetIndex
      hasChanges = true
    }

    // Check other properties
    if (targetSibling.parentId !== sourceSibling.parentId) {
      itemChanges.parentId = targetSibling.parentId
      hasChanges = true
    }

    if (targetSibling.hubId !== sourceSibling.hubId) {
      itemChanges.hubId = targetSibling.hubId
      hasChanges = true
    }

    if (targetSibling.level !== sourceSibling.level) {
      itemChanges.level = targetSibling.level
      hasChanges = true
    }

    if (targetSibling.type !== sourceSibling.type) {
      itemChanges.type = targetSibling.type
      hasChanges = true
    }

    if (hasChanges) {
      changes.push({
        id: targetSibling.id,
        ...itemChanges,
        _debug: {
          loadedRank: sourceSibling.loadedRank,
          sourceRank: sourceIndex,
          targetRank: targetIndex
        }
      })
    }
  })

  // If parent changed, also check old siblings
  const parentChanged =
    targetItem.parentId !== sourceItem.parentId ||
    targetItem.hubId !== sourceItem.hubId ||
    (targetItem.level === 0 && targetItem.type !== sourceItem.type)

  if (parentChanged) {
    const sourceSiblingsResult = findSiblings(sourceTree, movedItemId)
    if (sourceSiblingsResult) {
      const { siblings: sourceSiblings } = sourceSiblingsResult

      // Get target siblings for old parent
      sourceSiblings.forEach(sourceSibling => {
        // Skip the moved item itself
        if (sourceSibling.id === movedItemId) return

        // Check if this sibling is already in changes
        if (changes.some(c => c.id === sourceSibling.id)) return

        // Find this sibling in target tree to get its new siblings
        const targetSiblingItem = findItemInTree(targetTree, sourceSibling.id)
        if (!targetSiblingItem) return

        const targetSiblingResult = findSiblings(targetTree, sourceSibling.id)
        if (!targetSiblingResult) return

        const { siblings: newSiblings } = targetSiblingResult
        const targetIndex = newSiblings.findIndex(s => s.id === sourceSibling.id)
        if (targetIndex === -1) return

        // Find source index for debug
        const sourceIndex = sourceSiblings.findIndex(s => s.id === sourceSibling.id)

        const itemChanges: Partial<MenuItemChange> = {}
        let hasChanges = false

        // Compare ranks using array index
        if (targetIndex !== sourceSibling.loadedRank) {
          itemChanges.rank = targetIndex
          hasChanges = true
        }

        // Check other properties
        if (targetSiblingItem.parentId !== sourceSibling.parentId) {
          itemChanges.parentId = targetSiblingItem.parentId
          hasChanges = true
        }

        if (targetSiblingItem.hubId !== sourceSibling.hubId) {
          itemChanges.hubId = targetSiblingItem.hubId
          hasChanges = true
        }

        if (targetSiblingItem.level !== sourceSibling.level) {
          itemChanges.level = targetSiblingItem.level
          hasChanges = true
        }

        if (targetSiblingItem.type !== sourceSibling.type) {
          itemChanges.type = targetSiblingItem.type
          hasChanges = true
        }

        if (hasChanges) {
          changes.push({
            id: sourceSibling.id,
            ...itemChanges,
            _debug: {
              loadedRank: sourceSibling.loadedRank,
              sourceRank: sourceIndex,
              targetRank: targetIndex
            }
          })
        }
      })
    }
  }

  return changes
}
