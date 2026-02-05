import { useCallback, useMemo, useState } from 'react'
import type { EnrichedMenuItem } from '../types/menuTree.types'
import { calculateFullDiff } from '../utils/menuTreeDiff'
import { useCreateMenuItem } from '@/common/data/resources/hooks/useCreateMenuItem'
import { useUpdateMenuItem } from '@/common/data/resources/hooks/useUpdateMenuItem'
import { useDeleteMenuItem } from '@/common/data/resources/hooks/useDeleteMenuItem'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface UseMenuTableSaveAllProps {
  context: BusinessAppContextProps
  sourceTree: EnrichedMenuItem[]
  targetTree: EnrichedMenuItem[]
  editableState: any
  pendingDeletes: Set<string>
  movedItemIds: Set<string>
  setSourceTree: React.Dispatch<React.SetStateAction<EnrichedMenuItem[]>>
  setTargetTree: React.Dispatch<React.SetStateAction<EnrichedMenuItem[]>>
  setDraftMenuItems: React.Dispatch<React.SetStateAction<any[]>>
  setPendingDeletes: React.Dispatch<React.SetStateAction<Set<string>>>
  setMovedItemIds: React.Dispatch<React.SetStateAction<Set<string>>>
  refetchMenuItems: () => Promise<void>
}

interface UseMenuTableSaveAllReturn {
  handleSaveAll: () => Promise<void>
  handleDiscardAll: () => void
  hasChanges: boolean
  isSaving: boolean
}

/**
 * Helper to find item in tree by ID
 */
function findInTree(tree: EnrichedMenuItem[], id: string): EnrichedMenuItem | null {
  for (const item of tree) {
    if (item.id === id) return item
    if (item.children) {
      const found = findInTree(item.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Sort deletes in reverse dependency order (children before parents)
 * Uses depth-first post-order traversal
 */
function sortDeletesByDependency(deletes: any[], tree: EnrichedMenuItem[]): any[] {
  const deleteIds = new Set(deletes.map(d => d.id))
  const sorted: any[] = []
  const visited = new Set<string>()

  // Post-order traversal: visit children before parent
  function traverse(item: EnrichedMenuItem) {
    if (visited.has(item.id)) return
    visited.add(item.id)

    // Visit children first
    if (item.children) {
      for (const child of item.children) {
        traverse(child)
      }
    }

    // Then add this item if it's marked for deletion
    if (deleteIds.has(item.id)) {
      const deleteChange = deletes.find(d => d.id === item.id)
      if (deleteChange) {
        sorted.push(deleteChange)
      }
    }
  }

  // Traverse entire tree
  for (const item of tree) {
    traverse(item)
  }

  return sorted
}

/**
 * Build create payload from change object
 * Resolves draft IDs using the provided mapping
 */
function buildCreatePayload(change: any, draftIdMap: Map<string, string>): any {
  const payload: any = {
    name: change.name || '',
    nameTranslated: change.nameTranslated || {},
    description: change.description || '',
    descriptionTranslated: change.descriptionTranslated || {},
    icon: change.icon || '',
    code: change.code || '',
    rank: change.rank ?? 0
  }

  // Add resourceUrlId if present
  if (change.resourceUrlId) {
    payload.resourceUrlId = change.resourceUrlId
  }

  // Resolve draft IDs to real IDs
  if (change.parentId) {
    if (change.parentId.startsWith('draft:')) {
      payload.parentId = draftIdMap.get(change.parentId) ?? null
    } else {
      payload.parentId = change.parentId
    }
  }

  if (change.hubId) {
    if (change.hubId.startsWith('draft:')) {
      payload.hubId = draftIdMap.get(change.hubId) ?? null
    } else {
      payload.hubId = change.hubId
    }
  }

  // Hub-specific: type
  if (change.type) {
    payload.type = change.type
  }

  // Remove internal fields (not sent to backend)
  delete payload.id
  delete payload.isDraft
  delete payload.isHub
  delete payload._debug
  delete payload.level

  return payload
}

/**
 * Build update payload from change object
 * Fetches full item from targetTree and merges changes on top
 * This ensures all required fields are present for the backend
 * Resolves draft IDs using the provided mapping
 */
function buildUpdatePayload(change: any, targetTree: EnrichedMenuItem[], draftIdMap: Map<string, string>): any {
  // Find the full item in targetTree
  const fullItem = findInTree(targetTree, change.id)
  if (!fullItem) {
    console.warn(`[buildUpdatePayload] Item ${change.id} not found in targetTree, using change only`)
    const payload: any = {}
    Object.keys(change).forEach(key => {
      if (key !== 'id' && key !== 'isDraft' && key !== 'isHub' && key !== '_debug' && change[key] !== undefined) {
        payload[key] = change[key]
      }
    })
    return payload
  }

  // Start with full item data (all required fields)
  const isHub = change.isHub ?? fullItem.level === 0

  const payload: any = {
    name: fullItem.name || '',
    nameTranslated: fullItem.nameTranslated || {},
    description: fullItem.description || '',
    descriptionTranslated: fullItem.descriptionTranslated || {},
    icon: fullItem.icon || '',
    rank: fullItem.rank ?? 0
  }

  const resourceUrlId = fullItem.resourceUrlId ?? fullItem.resourceUrl?.id ?? null

  // Hub-specific fields
  if (isHub) {
    payload.code = fullItem.code || ''
    payload.codeTranslated = fullItem.codeTranslated || {}
    payload.type = fullItem.type || 'USE'
    payload.resourceUrlId = resourceUrlId
  } else {
    // Menu item specific fields
    payload.resourceUrlId = resourceUrlId
    payload.hubId = fullItem.hubId || null
    payload.parentId = fullItem.parentId || null
  }

  // Merge changes on top of base payload
  const fieldsToMerge = [
    'name',
    'nameTranslated',
    'description',
    'descriptionTranslated',
    'icon',
    'code',
    'codeTranslated',
    'rank',
    'resourceUrlId',
    'parentId',
    'hubId',
    'type'
  ]

  fieldsToMerge.forEach(field => {
    if (field in change && change[field] !== undefined) {
      let value = change[field]

      // Resolve draft IDs
      if ((field === 'parentId' || field === 'hubId') && typeof value === 'string' && value.startsWith('draft:')) {
        value = draftIdMap.get(value) ?? value
      }

      payload[field] = value
    }
  })

  // Remove internal fields (not sent to backend)
  delete payload._debug
  delete payload.level

  return payload
}

/**
 * Hook for Save All / Discard All functionality in MenuTable
 */
export function useMenuTableSaveAll(props: UseMenuTableSaveAllProps): UseMenuTableSaveAllReturn {
  const {
    context,
    sourceTree,
    targetTree,
    editableState,
    pendingDeletes,
    movedItemIds,
    setTargetTree,
    setDraftMenuItems,
    setPendingDeletes,
    setMovedItemIds,
    refetchMenuItems
  } = props

  const { createMenuItem } = useCreateMenuItem(context)
  const { updateMenuItem } = useUpdateMenuItem(context)
  const { deleteMenuItem } = useDeleteMenuItem(context)

  // Track saving state
  const [isSaving, setIsSaving] = useState(false)

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    // Check for pending deletes
    if (pendingDeletes.size > 0) return true

    // Check for edits
    if (editableState.state.editedEntries.size > 0) return true

    // Check for DND moves
    if (movedItemIds.size > 0) return true

    return false
  }, [pendingDeletes.size, editableState.state.editedEntries.size, movedItemIds.size])

  // Handle Save All
  const handleSaveAll = useCallback(async () => {
    try {
      setIsSaving(true)

      // Calculate all changes
      const changes = calculateFullDiff(sourceTree, targetTree, editableState, pendingDeletes, movedItemIds)

      // Separate by type
      const deletes = changes.filter(c => c.isDelete)
      const drafts = changes.filter(c => c.isDraft)
      const updates = changes.filter(c => !c.isDraft && !c.isDelete)

      // PHASE 1: DELETES (reverse order - children before parents)
      const sortedDeletes = sortDeletesByDependency(deletes, targetTree)

      for (const del of sortedDeletes) {
        await deleteMenuItem(del.id, del.isHub ?? false)
      }

      // PHASE 2: CREATES (parent-first order with ID mapping)
      const draftIdMap = new Map<string, string>()

      // Sort drafts by level (parents before children)
      const sortedDrafts = [...drafts].sort((a, b) => (a.level ?? 0) - (b.level ?? 0))

      for (const draft of sortedDrafts) {
        const payload = buildCreatePayload(draft, draftIdMap)

        // Don't send draft ID to backend
        const result = await createMenuItem(payload, draft.isHub ?? false)

        // Map draft ID to real ID for subsequent operations
        draftIdMap.set(draft.id, result.id)
      }

      // PHASE 3: UPDATES
      for (const update of updates) {
        const payload = buildUpdatePayload(update, targetTree, draftIdMap)

        // Only update if there are actual changes
        if (Object.keys(payload).length > 0) {
          await updateMenuItem(update.id, payload, update.isHub ?? false)
        }
      }

      // PHASE 4: REFETCH AND CLEANUP
      await refetchMenuItems()

      // Clear all tracking state
      setMovedItemIds(new Set())
      setPendingDeletes(new Set())
      setDraftMenuItems([])
      editableState.setState((prev: any) => ({
        ...prev,
        editedEntries: new Map(),
        draftEntryIds: new Set()
      }))
    } catch (err) {
      console.error('[SAVE ALL] ❌ Save operation failed:', err)
      // Don't clear state on error - allow user to retry
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [
    sourceTree,
    targetTree,
    editableState,
    pendingDeletes,
    movedItemIds,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    refetchMenuItems,
    setMovedItemIds,
    setPendingDeletes,
    setDraftMenuItems
  ])

  // Handle Discard All
  const handleDiscardAll = useCallback(() => {
    if (globalThis.window.confirm('Discard all unsaved changes?')) {
      // Revert targetTree to sourceTree
      setTargetTree(structuredClone(sourceTree))

      // Clear draft items
      setDraftMenuItems([])

      // Clear edits
      editableState.setState((prev: any) => ({
        ...prev,
        editedEntries: new Map(),
        draftEntryIds: new Set()
      }))

      // Clear pending deletes
      setPendingDeletes(new Set())

      // Clear moved items tracking
      setMovedItemIds(new Set())
    }
  }, [sourceTree, setTargetTree, setDraftMenuItems, editableState, setPendingDeletes, setMovedItemIds])

  return {
    handleSaveAll,
    handleDiscardAll,
    hasChanges,
    isSaving
  }
}
