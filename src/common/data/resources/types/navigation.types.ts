// Navigation Types (Backend: ResourceUrl)
import type { MenuItemDTO } from './menuItem.types'

export interface NavigationDTO {
  id?: string
  code: string
  name: string
  url: string
  createdAt?: string
  updatedAt?: string
  roles?: { name: string }[]
  features?: { name: string }[]
  name_i18n?: Record<string, string>
  description?: string
  description_i18n?: Record<string, string>
  isSearchable?: boolean
  menuItems?: MenuItemDTO[]
}

// Query Parameters
export interface GetNavigationsParams {
  search?: string
  sort?: string
  limit?: number
  offset?: number
}
