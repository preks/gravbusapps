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
  // Flags for operation type
  isDelete?: boolean
  isDraft?: boolean
  isHub?: boolean
  // Field data for creates/updates
  name?: string
  nameTranslated?: Record<string, string>
  description?: string
  descriptionTranslated?: Record<string, string>
  icon?: string
  code?: string
  resourceUrlId?: string
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
 *
 * @param tree - The tree to search
 * @param itemId - The item ID to find siblings for
 * @param pendingDeletes - Optional set of IDs marked for deletion (will be filtered out)
 */
function findSiblings(
  tree: EnrichedMenuItem[],
  itemId: string,
  pendingDeletes?: Set<string>
): { siblings: EnrichedMenuItem[]; parentKey: string } | null {
  function traverse(
    items: EnrichedMenuItem[],
    parentKey: string
  ): { siblings: EnrichedMenuItem[]; parentKey: string } | null {
    for (const item of items) {
      if (item.id === itemId) {
        // Found the item
        // Filter out pending deletes before processing
        let siblings = items
        if (pendingDeletes) {
          siblings = items.filter(i => !pendingDeletes.has(i.id))
        }

        // If it's a hub (level 0), filter siblings by type (space)
        if (item.level === 0) {
          const hubsInSameSpace = siblings.filter(i => i.level === 0 && i.type === item.type)
          return { siblings: hubsInSameSpace, parentKey }
        }
        // Otherwise return all siblings
        return { siblings, parentKey }
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

/**
 * Calculate full diff between source and target trees including deletes, creates, and updates
 * This is used for Save All functionality
 *
 * OPTIMIZATION: Only checks siblings of affected items (moved, deleted, or created) instead of the entire tree
 */
export function calculateFullDiff(
  sourceTree: EnrichedMenuItem[],
  targetTree: EnrichedMenuItem[],
  editableState: any,
  pendingDeletes: Set<string>,
  movedItemIds: Set<string>
): MenuItemChange[] {
  const changes: MenuItemChange[] = []
  const processedIds = new Set<string>()

  // Helper to build create payload
  const buildCreatePayload = (targetItem: EnrichedMenuItem, edits: any) => {
    const basePayload = {
      name: (edits?.name as string) ?? targetItem.name,
      nameTranslated: (edits?.nameTranslated as Record<string, string>) ?? targetItem.nameTranslated ?? {},
      description: (edits?.description as string) ?? targetItem.description ?? '',
      descriptionTranslated:
        (edits?.descriptionTranslated as Record<string, string>) ?? targetItem.descriptionTranslated ?? {},
      icon: (edits?.icon as string) ?? targetItem.icon ?? '',
      code: (edits?.code as string) ?? targetItem.code ?? '',
      rank: targetItem.rank ?? 0,
      level: targetItem.level ?? 0,
      resourceUrlId: (edits?.resourceUrlId as string) ?? targetItem.resourceUrlId ?? ''
    }

    // Only set ONE of (type, hubId, parentId) based on level
    if (targetItem.level === 0) {
      // Hub: only type is set (MUST have a type - default to USE if missing)
      const hubType = targetItem.type || 'USE'

      return {
        ...basePayload,
        type: hubType,
        parentId: undefined,
        hubId: undefined
      }
    } else if (targetItem.level === 1) {
      // Menu item under hub: only hubId is set, parentId = null
      return {
        ...basePayload,
        parentId: null,
        hubId: targetItem.hubId,
        type: undefined
      }
    } else {
      // Nested menu item (level 2+): parentId is set, hubId is NULL
      return {
        ...basePayload,
        parentId: targetItem.parentId,
        hubId: null, // Always null for nested items
        type: undefined
      }
    }
  }

  // Helper to check and add field edits for a single item
  const checkFieldEdits = (itemId: string): Partial<MenuItemChange> | null => {
    const edits = editableState.state.editedEntries.get(itemId)
    if (!edits) return null

    const itemChanges: Partial<MenuItemChange> = {}
    let hasChanges = false

    if (edits.name !== undefined) {
      itemChanges.name = edits.name as string
      hasChanges = true
    }
    if (edits.nameTranslated !== undefined) {
      itemChanges.nameTranslated = edits.nameTranslated as Record<string, string>
      hasChanges = true
    }
    if (edits.description !== undefined) {
      itemChanges.description = edits.description as string
      hasChanges = true
    }
    if (edits.descriptionTranslated !== undefined) {
      itemChanges.descriptionTranslated = edits.descriptionTranslated as Record<string, string>
      hasChanges = true
    }
    if (edits.icon !== undefined) {
      itemChanges.icon = edits.icon as string
      hasChanges = true
    }
    if (edits.code !== undefined) {
      itemChanges.code = edits.code as string
      hasChanges = true
    }
    if (edits.resourceUrlId !== undefined) {
      itemChanges.resourceUrlId = edits.resourceUrlId as string
      hasChanges = true
    }

    return hasChanges ? itemChanges : null
  }

  // Helper to compare values, treating undefined and null as equivalent
  const isEqual = (a: any, b: any): boolean => {
    // Treat undefined and null as equal
    if ((a === undefined || a === null) && (b === undefined || b === null)) {
      return true
    }
    return a === b
  }

  // Helper to apply level change cleanup
  const applyLevelChangeCleanup = (
    targetLevel: number,
    targetItem: EnrichedMenuItem,
    itemChanges: Partial<MenuItemChange>
  ): void => {
    if (targetLevel === 0) {
      if (!('parentId' in itemChanges)) itemChanges.parentId = undefined
      if (!('hubId' in itemChanges)) itemChanges.hubId = undefined
      if (!('type' in itemChanges)) itemChanges.type = targetItem.type
    } else if (targetLevel === 1) {
      if (!('parentId' in itemChanges)) itemChanges.parentId = null
      if (!('hubId' in itemChanges)) itemChanges.hubId = targetItem.hubId
      if (!('type' in itemChanges)) itemChanges.type = undefined
    } else {
      if (!('hubId' in itemChanges)) itemChanges.hubId = null
      if (!('type' in itemChanges)) itemChanges.type = undefined
    }
  }

  // Helper to check structural changes
  const checkStructuralChanges = (
    targetItem: EnrichedMenuItem,
    sourceItem: EnrichedMenuItem | null,
    targetRank: number
  ): { changes: Partial<MenuItemChange>; hasChanges: boolean } => {
    const itemChanges: Partial<MenuItemChange> = {}
    let hasChanges = false

    // Rank change (compare with loadedRank from source)
    if (sourceItem && targetRank !== sourceItem.loadedRank) {
      itemChanges.rank = targetRank
      hasChanges = true
    }

    // Structural changes (use isEqual to treat undefined and null as same)
    if (sourceItem) {
      const targetLevel = targetItem.level ?? 0
      const sourceLevel = sourceItem.level ?? 0
      const levelChanged = targetLevel !== sourceLevel

      if (!isEqual(targetItem.parentId, sourceItem.parentId)) {
        itemChanges.parentId = targetItem.parentId
        hasChanges = true
      }
      if (!isEqual(targetItem.hubId, sourceItem.hubId)) {
        itemChanges.hubId = targetItem.hubId
        hasChanges = true
      }
      if (levelChanged) {
        itemChanges.level = targetLevel
        hasChanges = true
      }

      // Hub type changes
      if (targetLevel === 0 && targetItem.type !== sourceItem.type) {
        itemChanges.type = targetItem.type
        hasChanges = true
      }

      if (targetLevel > 0 && targetItem.type !== sourceItem.type) {
        itemChanges.type = targetItem.type
        hasChanges = true
      }

      // When level changes, ensure proper cleanup of fields
      if (levelChanged) {
        applyLevelChangeCleanup(targetLevel, targetItem, itemChanges)
      }
    }

    return { changes: itemChanges, hasChanges }
  }

  // Helper to process siblings and detect rank changes
  const processSiblings = (itemIds: string[]) => {
    itemIds.forEach(itemId => {
      if (processedIds.has(itemId)) return
      processedIds.add(itemId)

      const targetItem = findItemInTree(targetTree, itemId)
      const sourceItem = findItemInTree(sourceTree, itemId)

      if (!targetItem) return

      // Draft items must be created
      if (itemId.startsWith('draft:')) {
        const edits = editableState.state.editedEntries.get(itemId)
        changes.push({
          id: itemId,
          isDraft: true,
          isHub: targetItem.level === 0,
          ...buildCreatePayload(targetItem, edits)
        })
        return
      }

      // Find target siblings to get correct rank
      const targetSiblingsResult = findSiblings(targetTree, itemId, pendingDeletes)
      if (!targetSiblingsResult) return

      const { siblings: targetSiblings } = targetSiblingsResult
      const targetRank = targetSiblings.findIndex(s => s.id === itemId)
      if (targetRank === -1) return

      // Check for changes
      const { changes: structuralChanges, hasChanges: hasStructuralChanges } = checkStructuralChanges(
        targetItem,
        sourceItem,
        targetRank
      )

      // Field edits
      const fieldEdits = checkFieldEdits(itemId)
      const hasChanges = hasStructuralChanges || Boolean(fieldEdits)

      if (hasChanges) {
        changes.push({
          id: itemId,
          isHub: targetItem.level === 0,
          ...structuralChanges,
          ...fieldEdits
        })
      }
    })
  }

  // 1. DELETES: Items in pendingDeletes
  pendingDeletes.forEach(itemId => {
    const sourceItem = findItemInTree(sourceTree, itemId)
    if (sourceItem) {
      changes.push({
        id: itemId,
        isDelete: true,
        isHub: sourceItem.level === 0
      })
      processedIds.add(itemId)

      // Also check siblings of deleted item (their ranks may need to be updated)
      const sourceSiblingsResult = findSiblings(sourceTree, itemId)
      if (sourceSiblingsResult) {
        const siblingIds = sourceSiblingsResult.siblings
          .map(s => s.id)
          .filter(id => id !== itemId && !pendingDeletes.has(id))
        processSiblings(siblingIds)
      }
    }
  })

  // 2. DRAFTS: Find all drafts and process them + their siblings
  const allTargetItems = flattenTree(targetTree)
  const draftIds = allTargetItems.filter(item => item.id.startsWith('draft:')).map(item => item.id)

  draftIds.forEach(draftId => {
    const draftItem = findItemInTree(targetTree, draftId)
    if (!draftItem) return

    // Process the draft itself
    if (!processedIds.has(draftId)) {
      const edits = editableState.state.editedEntries.get(draftId)
      changes.push({
        id: draftId,
        isDraft: true,
        isHub: draftItem.level === 0,
        ...buildCreatePayload(draftItem, edits)
      })
      processedIds.add(draftId)
    }

    // Process siblings of the draft
    const targetSiblingsResult = findSiblings(targetTree, draftId, pendingDeletes)
    if (targetSiblingsResult) {
      const siblingIds = targetSiblingsResult.siblings.map(s => s.id).filter(id => id !== draftId)
      processSiblings(siblingIds)
    }
  })

  // 3. DND MOVES: Process only explicitly moved items and their siblings
  movedItemIds.forEach(movedId => {
    if (processedIds.has(movedId)) return

    const targetItem = findItemInTree(targetTree, movedId)
    const sourceItem = findItemInTree(sourceTree, movedId)

    if (!targetItem || !sourceItem) return

    // Get new siblings (where item moved TO)
    const targetSiblingsResult = findSiblings(targetTree, movedId, pendingDeletes)
    if (targetSiblingsResult) {
      processSiblings(targetSiblingsResult.siblings.map(s => s.id))
    }

    // Get old siblings (where item moved FROM) - only if parent changed
    const parentChanged =
      targetItem.parentId !== sourceItem.parentId ||
      targetItem.hubId !== sourceItem.hubId ||
      (targetItem.level === 0 && targetItem.type !== sourceItem.type)

    if (parentChanged) {
      const sourceSiblingsResult = findSiblings(sourceTree, movedId)
      if (sourceSiblingsResult) {
        const oldSiblingIds = sourceSiblingsResult.siblings.map(s => s.id).filter(id => !pendingDeletes.has(id))
        processSiblings(oldSiblingIds)
      }
    }
  })

  // 4. FIELD EDITS ONLY: Items with field edits but no structural changes
  editableState.state.editedEntries.forEach((_edits: any, itemId: string) => {
    if (processedIds.has(itemId)) return
    if (itemId.startsWith('draft:')) return
    if (pendingDeletes.has(itemId)) return

    const targetItem = findItemInTree(targetTree, itemId)
    if (!targetItem) return

    const fieldEdits = checkFieldEdits(itemId)
    if (fieldEdits) {
      changes.push({
        id: itemId,
        isHub: targetItem.level === 0,
        ...fieldEdits
      })
      processedIds.add(itemId)
    }
  })

  return changes
}

/**
 * Helper to flatten tree (exported for reuse)
 */
function flattenTree(tree: EnrichedMenuItem[]): EnrichedMenuItem[] {
  const result: EnrichedMenuItem[] = []

  function traverse(items: EnrichedMenuItem[]) {
    for (const item of items) {
      result.push(item)
      if (item.children && item.children.length > 0) {
        traverse(item.children)
      }
    }
  }

  traverse(tree)
  return result
}
