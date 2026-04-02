import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'

export const getEntityType = (item: MenuItemDTO): 'SPACE' | 'HUB' | 'MENUITEM' => {
  if (item.level === 0) return 'HUB'
  if (item.level && item.level > 0) return 'MENUITEM'
  return 'MENUITEM'
}

export const getTypeBadgeColor = (type: 'SPACE' | 'HUB' | 'MENUITEM'): 'default' | 'secondary' | 'outline' => {
  if (type === 'HUB') return 'default'
  if (type === 'MENUITEM') return 'secondary'
  return 'outline'
}

export const buildMenuTree = (
  spaces: { id: string; name: string }[],
  menuItems: MenuItemDTO[],
  draftMenuItems: MenuItemDTO[]
): Array<{ spaceId: string; spaceName: string; hubs: MenuItemDTO[] }> => {
  const allItems = [...menuItems, ...draftMenuItems]
  const itemMap = new Map<string, MenuItemDTO & { children: MenuItemDTO[] }>()

  allItems.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] })
  })

  allItems.forEach(item => {
    if (item.parentId) {
      const parent = itemMap.get(item.parentId)
      const current = itemMap.get(item.id)
      if (parent && current) {
        parent.children.push(current)
      }
    }
  })

  return spaces.map(space => {
    const hubs = allItems.filter(item => item.level === 0 && item.type === space.id)
    return {
      spaceId: space.id,
      spaceName: space.name,
      hubs: hubs.map(hub => itemMap.get(hub.id)!).filter(Boolean)
    }
  })
}
