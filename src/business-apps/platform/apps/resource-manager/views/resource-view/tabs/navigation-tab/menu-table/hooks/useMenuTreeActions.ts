import { useCallback } from 'react'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import type { UseEditableStateResult } from '../../../../../../hooks/useEditableState'
import { useCreateMenuItem } from '@/common/data/resources/hooks/useCreateMenuItem'
import { useUpdateMenuItem } from '@/common/data/resources/hooks/useUpdateMenuItem'
import { useDeleteMenuItem } from '@/common/data/resources/hooks/useDeleteMenuItem'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EMPTY_ICON_VALUE } from '../../../../../../utils/iconUtils'
import type { EnrichedMenuItem } from '../types/menuTree.types'

interface UseMenuTreeActionsProps {
  context: BusinessAppContextProps
  allMenuItemsFlat: EnrichedMenuItem[]
  editableState: UseEditableStateResult<any>
  setDraftMenuItems: React.Dispatch<React.SetStateAction<MenuItemDTO[]>>
  refetchMenuItems: () => Promise<void>
  setExpandedItems: React.Dispatch<React.SetStateAction<Set<string>>>
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
  const { context, allMenuItemsFlat, editableState, setDraftMenuItems, refetchMenuItems, setExpandedItems } = props

  const { createMenuItem } = useCreateMenuItem(context)
  const { updateMenuItem } = useUpdateMenuItem(context)
  const { deleteMenuItem } = useDeleteMenuItem(context)

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
          type: parentItem.type as 'USE' | 'CREATE' | 'MANAGE' | undefined,
          children: []
        }
      } else if (parentIsHub) {
        // Adding a menu item to a hub
        newDraft = {
          id: draftId,
          name: '',
          description: '',
          nameTranslated: {},
          descriptionTranslated: {},
          icon: EMPTY_ICON_VALUE,
          rank: 0,
          code: '',
          level: 1, // First level menu item
          parentId: undefined,
          hubId: parentItem.id,
          type: parentItem.type as 'USE' | 'CREATE' | 'MANAGE' | undefined,
          children: []
        }
      } else if (parentIsMenuItem) {
        // Adding a menu item to another menu item
        newDraft = {
          id: draftId,
          name: '',
          description: '',
          nameTranslated: {},
          descriptionTranslated: {},
          icon: EMPTY_ICON_VALUE,
          rank: 0,
          code: '',
          level: parentLevel + 1,
          parentId: parentItem.id,
          hubId: parentItem.hubId,
          type: parentItem.type as 'USE' | 'CREATE' | 'MANAGE' | undefined,
          children: []
        }
      } else {
        // Fallback - should not happen
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
      editableState.setState(prev => {
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
    },
    [editableState, setDraftMenuItems, setExpandedItems]
  )

  // Save entry
  const handleSaveEntry = useCallback(
    async (itemId: string) => {
      editableState.setSaving(itemId, true)

      try {
        const edits = editableState.state.editedEntries.get(itemId)
        const item = allMenuItemsFlat.find(m => m.id === itemId)
        if (!item) return

        const isHub = item.level === 0
        const isDraft = itemId.startsWith('draft:')

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

        if (isDraft) {
          await createMenuItem(updates, isHub)
          setDraftMenuItems(prev => prev.filter(d => d.id !== itemId))
          editableState.setState(prev => {
            const newEdited = new Map(prev.editedEntries)
            newEdited.delete(itemId)
            const newDrafts = new Set(prev.draftEntryIds)
            newDrafts.delete(itemId)
            return { ...prev, editedEntries: newEdited, draftEntryIds: newDrafts }
          })
        } else {
          await updateMenuItem(itemId, updates, isHub)
          editableState.onDiscardEntry(itemId)
        }

        await refetchMenuItems()
      } catch {
        // Error handled
      } finally {
        editableState.setSaving(itemId, false)
      }
    },
    [editableState, allMenuItemsFlat, createMenuItem, updateMenuItem, refetchMenuItems, setDraftMenuItems]
  )

  // Discard entry
  const handleDiscardEntry = useCallback(
    (itemId: string) => {
      const isDraft = editableState.isDraft(itemId)
      if (isDraft) {
        setDraftMenuItems(prev => prev.filter(d => d.id !== itemId))
      }
      editableState.onDiscardEntry(itemId)
    },
    [editableState, setDraftMenuItems]
  )

  // Delete item
  const handleDelete = useCallback(
    async (itemId: string) => {
      const item = allMenuItemsFlat.find(m => m.id === itemId)
      if (!item) return

      const isHub = item.level === 0
      try {
        await deleteMenuItem(itemId, isHub)
        await refetchMenuItems()
      } catch {
        // Error handled
      }
    },
    [allMenuItemsFlat, deleteMenuItem, refetchMenuItems]
  )

  return {
    handleQuickAdd,
    handleSaveEntry,
    handleDiscardEntry,
    handleDelete
  }
}
