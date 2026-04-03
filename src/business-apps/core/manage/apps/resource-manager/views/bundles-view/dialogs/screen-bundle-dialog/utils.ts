import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import type { NavigationDTO } from '@/common/data/resources/types/navigation.types'
import { PLACEHOLDER_DISPLAY_NAME, PLACEHOLDER_MENU_ENTRY_NAME } from './constants'
import type { MenuEntryRow, PendingMenuItem, UrlRow } from './types'

export type MergedChildRow =
  | { type: 'real'; item: MenuItemDTO; rank: number }
  | { type: 'entry'; entry: MenuEntryRow; menuEntryIndex: number; rank: number }
  | { type: 'pending'; pending: PendingMenuItem; rank: number }

export function getMergedChildRows(
  parentId: string,
  parentIsHub: boolean,
  itemChildren: MenuItemDTO[],
  entries: MenuEntryRow[],
  pendingItems: PendingMenuItem[]
): MergedChildRow[] {
  const atParent = entries
    .map((e, i) => ({ entry: e, menuEntryIndex: i, rank: e.rank ?? 9999 + i }))
    .filter(x => (parentIsHub && x.entry.hubId === parentId) || (!parentIsHub && x.entry.parentId === parentId))
  const pendingAtParent = pendingItems
    .filter(p => p.parentNodeId === parentId && p.parentIsHub === parentIsHub)
    .map(p => ({ type: 'pending' as const, pending: p, rank: p.rank }))
  const realRows: MergedChildRow[] = (itemChildren ?? []).map((child, i) => ({
    type: 'real' as const,
    item: child,
    rank: child.rank ?? i
  }))
  const entryRows: MergedChildRow[] = atParent.map(({ entry, menuEntryIndex, rank }) => ({
    type: 'entry' as const,
    entry,
    menuEntryIndex,
    rank
  }))
  const merged = [...realRows, ...entryRows, ...pendingAtParent].sort((a, b) => a.rank - b.rank)
  return merged
}

export function getItemLabel(item: MenuItemDTO): string {
  return (item.name || item.code || item.id || '').trim()
}

export function getUrlEffectiveName(row: UrlRow, rootName: string): string {
  return row.useCustomName && row.customName?.trim() ? row.customName.trim() : rootName || PLACEHOLDER_DISPLAY_NAME
}

export function getMenuEntryEffectiveName(entry: MenuEntryRow, inheritedName: string): string {
  return entry.useCustomName && entry.name?.trim() ? entry.name.trim() : inheritedName || PLACEHOLDER_MENU_ENTRY_NAME
}

function buildParentMap(items: MenuItemDTO[], parentId: string | null): Map<string, string | null> {
  const map = new Map<string, string | null>()
  for (const item of items) {
    map.set(item.id, parentId)
    if (item.children?.length) {
      for (const [childId, childParentId] of buildParentMap(item.children, item.id)) {
        map.set(childId, childParentId)
      }
    }
  }
  return map
}

export function getMenuEntryPathHighlightIds(
  menuItems: MenuItemDTO[],
  row: UrlRow,
  pendingMenuItems: PendingMenuItem[]
): Set<string> {
  const parentMap = new Map<string, string | null>()
  for (const hub of menuItems) {
    parentMap.set(hub.id, null)
    if (hub.children?.length) {
      for (const [id, p] of buildParentMap(hub.children, hub.id)) {
        parentMap.set(id, p)
      }
    }
  }
  const placementIds = new Set<string>()
  for (const e of row.menuEntries) {
    const id = e.hubId ?? e.parentId
    if (id && !id.startsWith('pending-')) placementIds.add(id)
  }
  for (const p of pendingMenuItems) {
    if (p.parentNodeId && !p.parentNodeId.startsWith('pending-')) placementIds.add(p.parentNodeId)
  }
  const highlighted = new Set<string>()
  for (const id of placementIds) {
    let current: string | null = id
    while (current) {
      highlighted.add(current)
      current = parentMap.get(current) ?? null
    }
  }
  return highlighted
}

export function navigationToUrlRow(
  nav: NavigationDTO,
  rootName?: string,
  roleOptions?: { id: string; name: string }[],
  featureOptions?: { id: string; name: string }[]
): UrlRow {
  const navName = nav.name ?? ''
  const menuEntries =
    nav.menuItems?.map((mi, idx) => ({
      icon: mi.icon ?? '',
      name: mi.name ?? '',
      parentId: mi.parentId ?? null,
      hubId: mi.hubId ?? null,
      useCustomName: !!(mi.name?.trim() && mi.name.trim() !== navName),
      pathString: '',
      definePath: false,
      rank: mi.rank ?? idx
    })) ?? []
  const roleIds =
    roleOptions && nav.roles?.length
      ? (nav.roles.map(r => roleOptions.find(ro => ro.name === r.name)?.id).filter(Boolean) as string[])
      : (nav.roles?.map(r => r.name) ?? [])
  const featureIds =
    featureOptions && nav.features?.length
      ? (nav.features.map(f => featureOptions.find(fo => fo.name === f.name)?.id).filter(Boolean) as string[])
      : (nav.features?.map(f => f.name) ?? [])
  return {
    navigationId: nav.id,
    url: nav.url ?? '',
    roles: roleIds,
    features: featureIds,
    menuEntries: menuEntries.length > 0 ? menuEntries : [],
    flows: [],
    useCustomName: !!(navName && navName !== (rootName ?? '').trim()),
    customName: navName || ''
  }
}
