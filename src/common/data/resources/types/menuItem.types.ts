// MenuItem Types (Navigation Service)
// Unified interface for both Hubs and Menu Items
// Level 0 = Hub, Level > 0 = Menu Item
export interface MenuItemDTO {
  id: string
  name: string
  icon?: string
  description?: string
  parentId?: string
  hubId?: string
  rank?: number
  nameTranslated?: Record<string, string>
  descriptionTranslated?: Record<string, string>
  resourceUrlId?: string
  resourceUrl?: any
  children?: MenuItemDTO[]
  createdAt?: string
  updatedAt?: string
  // Internal: level determines if it's a Hub (level 0) or Menu Item (level > 0)
  level?: number
  // Hub-specific properties (only present for level 0 items)
  code?: string
  type?: 'USE' | 'CREATE' | 'MANAGE'
  hasChildren?: boolean
  codeTranslated?: Record<string, string>
}

export interface MenuItemResultDTO {
  menuItems: MenuItemDTO[]
}

export interface MenuItemUpsertRequestDTO {
  id?: string
  name: string
  icon?: string
  description?: string
  parentId?: string
  hubId?: string
  rank?: number
  nameTranslated?: Record<string, string>
  descriptionTranslated?: Record<string, string>
  resourceUrlId?: string
  children?: MenuItemUpsertRequestDTO[]
  createdAt?: string
  updatedAt?: string
  // Hub-specific: type (only for level 0 / hubs)
  type?: 'USE' | 'CREATE' | 'MANAGE'
  code?: string
  codeTranslated?: Record<string, string>
}
