// MenuTableColumns.tsx
// Note: MenuTable is a tree view, not a table, so this file contains only type definitions
// that may be used if MenuTable is converted to a table in the future

import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'

export interface MenuTableColumnsConfig {
  dataTestId: string
  menuItems: MenuItemDTO[]
}

// Placeholder for potential future table columns
// Currently MenuTable uses a tree view structure, not a DataTable
export const createMenuTableColumns = (): never[] => {
  // This function is a placeholder for potential future table implementation
  // MenuTable currently uses a custom tree view, not a DataTable
  return []
}
