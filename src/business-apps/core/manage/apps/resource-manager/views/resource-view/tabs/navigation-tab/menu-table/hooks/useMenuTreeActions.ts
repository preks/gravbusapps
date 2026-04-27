import { useCallback, useMemo, useRef } from 'react'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import type { UseEditableStateResult } from '../../../../../../hooks/useEditableState'
import { useCreateMenuItem } from '@/common/data/resources/hooks/useCreateMenuItem'
import { useUpdateMenuItem } from '@/common/data/resources/hooks/useUpdateMenuItem'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EMPTY_ICON_VALUE } from '../../../../../../utils/iconUtils'
import type { EnrichedMenuItem } from '../types/menuTree.types'

function collectDraftSubtreeIds(draftId: string, allDrafts: MenuItemDTO[]): Set<string> {
  const ids = new Set<string>([draftId])
  const item = allDrafts.find(d => d.id === draftId)
  if (!item) return ids
  const directChildren = allDrafts.filter(d =>
    item.level === 0 ? d.hubId === draftId && d.level === 1 : d.parentId === draftId
  )
  directChildren.forEach(child => {
    collectDraftSubtreeIds(child.id, allDrafts).forEach(id => ids.add(id))
  })
  return ids
}

interface UseMenuTreeActionsProps {
  context: BusinessAppContextProps
  allMenuItemsFlat: EnrichedMenuItem[]
  editableState: UseEditableStateResult<any>
  draftMenuItems: MenuItemDTO[]
  setDraftMenuItems: React.Dispatch<React.SetStateAction<MenuItemDTO[]>>
  refetchMenuItems: () => Promise<void>
  setExpandedItems: React.Dispatch<React.SetStateAction<Set<string>>>
  setPendingDeletes: React.Dispatch<React.SetStateAction<Set<string>>>
}

interface UseMenuTreeActionsReturn {
  handleQuickAdd: (parentItem: Partial<MenuItemDTO>) => void
  handleSaveEntry: (itemId: string) => Promise<void>
  handleDiscardEntry: (itemId: string) => void
  handleDelete: (itemId: string) => Promise<void>
}

/**
 * Hook for menu tree CRUD actions
 */
export function useMenuTreeActions(props: UseMenuTreeActionsProps): UseMenuTreeActionsReturn {
  const {
    context,
    allMenuItemsFlat,
    editableState,
    draftMenuItems,
    setDraftMenuItems,
    refetchMenuItems,
    setExpandedItems,
    setPendingDeletes
  } = props

  const { createMenuItem } = useCreateMenuItem(context)
  const { updateMenuItem } = useUpdateMenuItem(context)

  const { setState: setEditableState, onDiscardEntry, isDraft } = editableState
  const editableStateRef = useRef(editableState)
  editableStateRef.current = editableState

  // Quick add child
  const handleQuickAdd = useCallback(
    (parentItem: Partial<MenuItemDTO>) => {
      const parentLevel = parentItem.level ?? -1
      const parentIsSpace = parentLevel === -1 // Space has no level
      const parentIsHub = parentLevel === 0
      const parentIsMenuItem = parentLevel > 0

      const draftId = `draft:${Date.now()}`

      let newDraft: MenuItemDTO

      if (parentIsSpace) {
        // Adding a hub to a space
        // IMPORTANT: Hubs MUST have a type (USE, CREATE, or MANAGE)
        const hubType = (parentItem.type as 'USE' | 'CREATE' | 'MANAGE') || 'USE' // Default to USE if missing
        newDraft = {
          id: draftId,
          name: '',
          description: '',
          nameTranslated: {},
          descriptionTranslated: {},
          icon: EMPTY_ICON_VALUE,
          rank: 0,
          code: '',
          level: 0, // Hub level
          parentId: undefined,
          hubId: undefined,
          type: hubType,
          children: []
        }
      } else if (parentIsHub) {
        // Adding a menu item to a hub (level 1)
        // IMPORTANT: Level 1 items have parentId = null, hubId = hub-id, type = undefined
        newDraft = {
          id: draftId,
          name: '',
          description: '',
          nameTranslated: {},
          descriptionTranslated: {},
          icon: EMPTY_ICON_VALUE,
          rank: 0,
          code: '',
          level: 1, // Menu item level
          parentId: null, // Level 1 items have null parentId
          hubId: parentItem.id, // hubId points to the hub
          type: undefined, // Menu items don't have type
          children: []
        }
      } else if (parentIsMenuItem) {
        // Adding a child menu item to a menu item (level 2+)
        // IMPORTANT: Level 2+ items have parentId set, hubId = null, type = undefined
        newDraft = {
          id: draftId,
          name: '',
          description: '',
          nameTranslated: {},
          descriptionTranslated: {},
          icon: EMPTY_ICON_VALUE,
          rank: 0,
          code: '',
          level: (parentLevel ?? 0) + 1, // Increase level by 1
          parentId: parentItem.id,
          hubId: null, // Level 2+ items have null hubId
          type: undefined, // Menu items don't have type
          children: []
        }
      } else {
        console.warn('[QuickAdd] Unknown parent type, cannot add child')
        return
      }

      setDraftMenuItems(prev => [...prev, newDraft])

      // Auto-expand parent if it's a hub or menuitem
      if (!parentIsSpace && parentItem.id) {
        setExpandedItems(prev => {
          const newSet = new Set(prev)
          newSet.add(parentItem.id!)
          return newSet
        })
      }

      // Seed edits and mark as draft
      setEditableState(prev => {
        const newEdited = new Map(prev.editedEntries)
        newEdited.set(draftId, { name: '' })
        const newDrafts = new Set(prev.draftEntryIds)
        newDrafts.add(draftId)
        return {
          ...prev,
          editedEntries: newEdited,
          draftEntryIds: newDrafts
        }
      })

      console.log('[QuickAdd] Draft created:', { draftId, parentId: parentItem.id, level: newDraft.level })
    },
    [setEditableState, setDraftMenuItems, setExpandedItems]
  )

  // Save entry (ref keeps latest edit state; callback identity stable during typing in other fields)
  const handleSaveEntry = useCallback(
    async (itemId: string) => {
      const es = editableStateRef.current
      es.setSaving(itemId, true)

      try {
        const edits = es.state.editedEntries.get(itemId)
        const item = allMenuItemsFlat.find(m => m.id === itemId)
        if (!item) return

        const isHub = item.level === 0
        const isNewDraft = itemId.startsWith('draft:')

        const updates = {
          name: (edits?.name as string | undefined) ?? item.name,
          nameTranslated: (edits?.nameTranslated as Record<string, string> | undefined) ?? item.nameTranslated ?? {},
          description: (edits?.description as string | undefined) ?? item.description ?? '',
          descriptionTranslated:
            (edits?.descriptionTranslated as Record<string, string> | undefined) ?? item.descriptionTranslated ?? {},
          icon: (edits?.icon as string | undefined) ?? item.icon ?? '',
          rank: item.rank ?? 0,
          code: (edits?.code as string | undefined) ?? item.code ?? '',
          level: item.level ?? 0,
          parentId: item.parentId,
          hubId: item.hubId,
          type: item.type
        }

        if (isNewDraft) {
          await createMenuItem(updates, isHub)
          setDraftMenuItems(prev => prev.filter(d => d.id !== itemId))
          es.setState(prev => {
            const newEdited = new Map(prev.editedEntries)
            newEdited.delete(itemId)
            const newDrafts = new Set(prev.draftEntryIds)
            newDrafts.delete(itemId)
            return { ...prev, editedEntries: newEdited, draftEntryIds: newDrafts }
          })
        } else {
          await updateMenuItem(itemId, updates, isHub)
          es.onDiscardEntry(itemId)
        }

        await refetchMenuItems()
      } catch {
        // Error handled
      } finally {
        editableStateRef.current.setSaving(itemId, false)
      }
    },
    [allMenuItemsFlat, createMenuItem, updateMenuItem, refetchMenuItems, setDraftMenuItems]
  )

  // Discard entry (cascade for drafts)
  const handleDiscardEntry = useCallback(
    (itemId: string) => {
      if (isDraft(itemId)) {
        const idsToRemove = collectDraftSubtreeIds(itemId, draftMenuItems)
        setDraftMenuItems(prev => prev.filter(d => !idsToRemove.has(d.id)))
        idsToRemove.forEach(id => onDiscardEntry(id))
      } else {
        onDiscardEntry(itemId)
      }
    },
    [isDraft, onDiscardEntry, setDraftMenuItems, draftMenuItems]
  )

  // Delete item — drafts are removed locally; persisted items are marked for deletion
  const handleDelete = useCallback(
    (itemId: string) => {
      if (itemId.startsWith('draft:')) {
        const idsToRemove = collectDraftSubtreeIds(itemId, draftMenuItems)
        setDraftMenuItems(prev => prev.filter(d => !idsToRemove.has(d.id)))
        idsToRemove.forEach(id => onDiscardEntry(id))
        return
      }
      setPendingDeletes(prev => {
        const newSet = new Set(prev)
        newSet.add(itemId)
        return newSet
      })
    },
    [onDiscardEntry, setPendingDeletes, draftMenuItems, setDraftMenuItems]
  )

  return useMemo(
    () => ({
      handleQuickAdd,
      handleSaveEntry,
      handleDiscardEntry,
      handleDelete
    }),
    [handleQuickAdd, handleSaveEntry, handleDiscardEntry, handleDelete]
  )
}
