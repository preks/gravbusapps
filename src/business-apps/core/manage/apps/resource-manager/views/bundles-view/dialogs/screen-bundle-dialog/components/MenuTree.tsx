import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import type { PendingMenuItem, UrlRow } from '../types'
import { getMenuEntryPathHighlightIds } from '../utils'
import { MenuTreeRow, type MenuTreeRowCallbacks } from './MenuTreeRows'

export interface MenuTreeProps {
  menuItems: MenuItemDTO[]
  urlRowIndex: number
  row: UrlRow
  rootName: string
  pathOptionById: Map<string, { path: string; item: MenuItemDTO }>
  expandedIds: Set<string>
  pendingMenuItems: PendingMenuItem[]
  dataTestId: string
  callbacks: MenuTreeRowCallbacks
}

export function MenuTree({
  menuItems,
  urlRowIndex,
  row,
  rootName,
  pathOptionById,
  expandedIds,
  pendingMenuItems,
  dataTestId,
  callbacks
}: MenuTreeProps) {
  if (menuItems.length === 0) {
    return <p className="gba:text-sm gba:text-muted-foreground gba:py-2">No menu structure in this space.</p>
  }
  const highlightedNodeIds = getMenuEntryPathHighlightIds(menuItems, row, pendingMenuItems)
  return (
    <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/5 gba:p-4 gba:min-h-[28rem] gba:max-h-[70vh] gba:overflow-y-auto gba:shadow-sm">
      {menuItems.map(hub => (
        <MenuTreeRow
          key={hub.id}
          item={hub}
          depth={0}
          urlRowIndex={urlRowIndex}
          row={row}
          rootName={rootName}
          pathOptionById={pathOptionById}
          expandedIds={expandedIds}
          pendingMenuItems={pendingMenuItems}
          highlightedNodeIds={highlightedNodeIds}
          dataTestId={dataTestId}
          callbacks={callbacks}
        />
      ))}
    </div>
  )
}
