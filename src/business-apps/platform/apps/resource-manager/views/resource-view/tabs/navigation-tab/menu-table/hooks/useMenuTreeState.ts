import { useState, useCallback, useMemo, useEffect } from 'react'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import type {
  EnrichedMenuItem,
  MenuTreeState,
  ExpansionState,
  SpaceType,
  GroupedBySpace
} from '../types/menuTree.types'

interface UseMenuTreeStateProps {
  menuItemsProp: MenuItemDTO[]
  draftMenuItems: MenuItemDTO[]
  isDragging: boolean
  currentView: string
  onCountChange?: (count: number) => void
}

interface UseMenuTreeStateReturn extends MenuTreeState, ExpansionState {
  setSourceTree: React.Dispatch<React.SetStateAction<EnrichedMenuItem[]>>
  setTargetTree: React.Dispatch<React.SetStateAction<EnrichedMenuItem[]>>
  setExpandedItems: React.Dispatch<React.SetStateAction<Set<string>>>
  setExpandedSpaces: React.Dispatch<React.SetStateAction<Set<string>>>
  toggleExpansion: (itemId: string) => void
  toggleSpaceExpansion: (spaceType: string) => void
  flattenTree: (items: EnrichedMenuItem[]) => EnrichedMenuItem[]
  findItemById: (tree: EnrichedMenuItem[], id: string) => EnrichedMenuItem | null
  enrichTree: (items: MenuItemDTO[], parentClass: 'space' | 'hub' | 'menuitem') => EnrichedMenuItem[]
}

/**
 * Hook for managing menu tree state
 */
export function useMenuTreeState(props: UseMenuTreeStateProps): UseMenuTreeStateReturn {
  const { menuItemsProp, draftMenuItems, isDragging, currentView, onCountChange } = props

  // Expansion state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set(['USE', 'CREATE', 'MANAGE']))

  // Tree state
  const [sourceTree, setSourceTree] = useState<EnrichedMenuItem[]>([])
  const [targetTree, setTargetTree] = useState<EnrichedMenuItem[]>([])

  // Enrich tree with class and parentClass metadata
  const enrichTree = useCallback(
    (items: MenuItemDTO[], parentClass: 'space' | 'hub' | 'menuitem'): EnrichedMenuItem[] => {
      // For top-level items (hubs), group by type first, then sort within each group
      if (parentClass === 'space') {
        const hubsByType: Record<string, MenuItemDTO[]> = {}

        items.forEach(item => {
          const type = item.type || 'OTHER'
          if (!hubsByType[type]) {
            hubsByType[type] = []
          }
          hubsByType[type].push(item)
        })

        const enrichedHubs: EnrichedMenuItem[] = []

        // Process each space type
        for (const type of ['USE', 'CREATE', 'MANAGE', 'OTHER']) {
          const hubs = hubsByType[type] || []
          const sortedHubs = hubs.sort((a, b) => (a.rank || 0) - (b.rank || 0))

          sortedHubs.forEach(hub => {
            enrichedHubs.push({
              ...hub,
              class: 'hub',
              parentClass: 'space',
              loadedRank: hub.rank, // Original DB rank
              children: hub.children ? enrichTree(hub.children, 'hub') : []
            })
          })
        }

        return enrichedHubs
      }

      // For menu items (children of hubs or other menu items)
      const sortedItems = [...items].sort((a, b) => (a.rank || 0) - (b.rank || 0))

      return sortedItems.map(item => ({
        ...item,
        class: 'menuitem',
        parentClass: parentClass,
        loadedRank: item.rank, // Original DB rank
        children: item.children ? enrichTree(item.children, 'menuitem') : []
      }))
    },
    []
  )

  // Update source and target tree when menu items change
  useEffect(() => {
    // Don't reset trees during drag operation
    if (isDragging) return

    // Insert drafts into nested tree structure
    const insertDrafts = (items: MenuItemDTO[]): MenuItemDTO[] => {
      return items.map(item => {
        // Clone item
        const cloned = { ...item }

        // Recursively process children
        if (cloned.children && cloned.children.length > 0) {
          cloned.children = insertDrafts(cloned.children)
        } else {
          cloned.children = []
        }

        // Add drafts that belong to this item
        // Based on unified MenuItem concept with class:
        // - Hubs (level 0): children have hubId pointing to hub
        // - Menu Items (level 1+): children have parentId pointing to parent
        const itemDrafts = draftMenuItems.filter(draft => {
          if (item.level === 0) {
            // Hub: children have hubId
            return draft.hubId === item.id && draft.level === 1
          } else {
            // Menu Item: children have parentId
            return draft.parentId === item.id
          }
        })

        if (itemDrafts.length > 0) {
          cloned.children = [...cloned.children, ...itemDrafts]
        }

        return cloned
      })
    }

    const menuItemsWithDrafts = insertDrafts(menuItemsProp)

    // Add draft hubs (level 0) to root
    // Hubs have type (USE, CREATE, MANAGE) instead of parent reference
    const draftHubs = draftMenuItems.filter(draft => draft.level === 0)
    const allItemsWithDrafts = [...menuItemsWithDrafts, ...draftHubs]

    const enriched = enrichTree(allItemsWithDrafts, 'space')

    setSourceTree(enriched)
    setTargetTree(enriched)
  }, [draftMenuItems, menuItemsProp, enrichTree, isDragging])

  // Flatten tree recursively for finding items by ID
  const flattenTree = useCallback((items: EnrichedMenuItem[]): EnrichedMenuItem[] => {
    const result: EnrichedMenuItem[] = []
    items.forEach(item => {
      result.push(item)
      if (item.children && item.children.length > 0) {
        result.push(...flattenTree(item.children))
      }
    })
    return result
  }, [])

  // Find item by ID in tree
  const findItemById = useCallback((tree: EnrichedMenuItem[], id: string): EnrichedMenuItem | null => {
    for (const item of tree) {
      if (item.id === id) return item
      if (item.children && item.children.length > 0) {
        const found = findItemById(item.children, id)
        if (found) return found
      }
    }
    return null
  }, [])

  // Get flat list of all items from target tree
  const allMenuItemsFlat = useMemo(() => flattenTree(targetTree), [targetTree, flattenTree])

  // Group by space
  const groupedBySpace = useMemo((): GroupedBySpace => {
    const spaces: GroupedBySpace = {
      USE: [],
      CREATE: [],
      MANAGE: [],
      OTHER: []
    }

    targetTree.forEach(hub => {
      const spaceType = (hub.type || 'OTHER') as SpaceType
      if (spaces[spaceType]) {
        spaces[spaceType].push(hub)
      } else {
        spaces.OTHER.push(hub)
      }
    })

    return spaces
  }, [targetTree])

  // Collect all sortable IDs globally for cross-space dragging
  const allSortableIds = useMemo(() => {
    const collectIds = (items: MenuItemDTO[]): string[] => {
      const ids: string[] = []
      items.forEach(item => {
        ids.push(item.id)
        if (item.children && item.children.length > 0) {
          ids.push(...collectIds(item.children))
        }
      })
      return ids
    }

    return collectIds([
      ...groupedBySpace.USE,
      ...groupedBySpace.CREATE,
      ...groupedBySpace.MANAGE,
      ...groupedBySpace.OTHER
    ])
  }, [groupedBySpace])

  // Toggle expansion handlers
  const toggleExpansion = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  const toggleSpaceExpansion = useCallback((spaceType: string) => {
    setExpandedSpaces(prev => {
      const next = new Set(prev)
      if (next.has(spaceType)) {
        next.delete(spaceType)
      } else {
        next.add(spaceType)
      }
      return next
    })
  }, [])

  // Report count changes
  useEffect(() => {
    if (currentView === 'menu' && onCountChange) {
      onCountChange(allMenuItemsFlat.length)
    }
  }, [allMenuItemsFlat.length, currentView, onCountChange])

  return {
    // State
    sourceTree,
    targetTree,
    allMenuItemsFlat,
    groupedBySpace,
    allSortableIds,
    expandedItems,
    expandedSpaces,

    // Setters
    setSourceTree,
    setTargetTree,
    setExpandedItems,
    setExpandedSpaces,

    // Methods
    toggleExpansion,
    toggleSpaceExpansion,
    flattenTree,
    findItemById,
    enrichTree
  }
}
