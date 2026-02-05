import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'

/**
 * Enriched menu item with metadata for DND operations
 */
export interface EnrichedMenuItem extends MenuItemDTO {
  class: 'hub' | 'menuitem'
  parentClass: 'space' | 'hub' | 'menuitem'
  children?: EnrichedMenuItem[]
  loadedRank?: number // Original rank from database (before sanitization)
  collapsed?: boolean // Whether the item is collapsed (children hidden)
}

/**
 * Space types for menu organization
 */
export type SpaceType = 'USE' | 'CREATE' | 'MANAGE' | 'OTHER'

/**
 * Grouped menu items by space
 */
export type GroupedBySpace = Record<SpaceType, EnrichedMenuItem[]>

/**
 * Menu tree state
 */
export interface MenuTreeState {
  sourceTree: EnrichedMenuItem[]
  targetTree: EnrichedMenuItem[]
  allMenuItemsFlat: EnrichedMenuItem[]
  groupedBySpace: GroupedBySpace
  allSortableIds: string[]
}

/**
 * DND state
 */
export interface DndState {
  activeId: string | null
  overId: string | null
  isDragging: boolean
  activeItem: EnrichedMenuItem | null
}

/**
 * Expansion state
 */
export interface ExpansionState {
  expandedItems: Set<string>
  expandedSpaces: Set<string>
}
