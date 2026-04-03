import type { NavigationDTO } from '@/common/data/resources/types/navigation.types'

export interface NavigationWithMenuItems extends NavigationDTO {
  menuItems?: Array<{
    id: string
    name: string
    code?: string
    type?: string
  }>
  hubs?: Array<{
    id: string
    name: string
    code?: string
    type?: string
  }>
  allMenuItems?: Array<{
    id: string
    name: string
    code?: string
    type?: string
  }>
}
