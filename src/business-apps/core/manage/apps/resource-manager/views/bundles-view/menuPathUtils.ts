import type { MenuItemDTO, MenuItemUpsertRequestDTO } from '@/common/data/resources/types/menuItem.types'

const SPACE_LABELS: Record<string, string> = {
  USE: 'Use',
  CREATE: 'Create',
  MANAGE: 'Manage',
  OTHER: 'Other'
}

const SPACE_TYPES = ['USE', 'CREATE', 'MANAGE'] as const
type SpaceType = (typeof SPACE_TYPES)[number]

function parseSpaceType(segment: string): SpaceType | null {
  const lower = segment.trim().toLowerCase()
  if (lower === 'use') return 'USE'
  if (lower === 'create') return 'CREATE'
  if (lower === 'manage') return 'MANAGE'
  return null
}

function getItemName(item: MenuItemDTO): string {
  return (item.name || item.code || item.id || '').trim()
}

function findHub(hubs: MenuItemDTO[], spaceType: SpaceType, name: string): MenuItemDTO | undefined {
  const n = name.trim()
  return hubs.find(h => (h.level === 0 || h.type === spaceType) && getItemName(h).toLowerCase() === n.toLowerCase())
}

function findChild(parent: MenuItemDTO, segmentName: string): MenuItemDTO | undefined {
  const children = parent.children ?? []
  const n = segmentName.trim()
  return children.find(c => getItemName(c).toLowerCase() === n.toLowerCase())
}

export interface ResolveMenuPathResult {
  hubId?: string
  parentId?: string
}

/** Ensures SPACE/HUB/... path exists; returns the parent for the new menu entry (last segment). */
export async function resolveOrCreateMenuPath(
  pathString: string,
  hubs: MenuItemDTO[],
  createMenuItem: (data: MenuItemUpsertRequestDTO, isHub: boolean) => Promise<MenuItemDTO>,
  createdPathIds?: Map<string, { id: string; level: number }>
): Promise<ResolveMenuPathResult | null> {
  const segments = pathString
    .split('/')
    .map(s => s.trim())
    .filter(Boolean)
  if (segments.length < 2) return null
  const spaceType = parseSpaceType(segments[0])
  if (!spaceType) return null

  const pathKey = (endIndex: number) => segments.slice(0, endIndex + 1).join('/')

  let hub: MenuItemDTO | undefined = createdPathIds?.get(pathKey(1)) as MenuItemDTO | undefined
  if (!hub?.id) {
    hub = findHub(hubs, spaceType, segments[1])
  }
  if (!hub) {
    hub = await createMenuItem({ name: segments[1], parentId: `SPACE_${spaceType}` }, true)
    if (hub?.id && createdPathIds) createdPathIds.set(pathKey(1), { id: hub.id, level: 0 })
  }
  if (!hub?.id) return null

  if (segments.length === 2) {
    return hub.level === 0 ? { hubId: hub.id } : { parentId: hub.id }
  }

  let current: MenuItemDTO = hub
  for (let i = 2; i < segments.length; i++) {
    const segmentName = segments[i]
    const key = pathKey(i)
    const cached = createdPathIds?.get(key)
    let child: MenuItemDTO | undefined = cached
      ? ({ id: cached.id, level: cached.level, children: [] } as MenuItemDTO)
      : findChild(current, segmentName)
    if (!child) {
      child = await createMenuItem(
        {
          name: segmentName,
          ...(current.level === 0 ? { hubId: current.id } : { parentId: current.id })
        },
        false
      )
      if (child?.id && createdPathIds) createdPathIds.set(key, { id: child.id, level: 1 })
    }
    if (!child?.id) return null
    current = child
  }

  return current.level === 0 ? { hubId: current.id } : { parentId: current.id }
}

export function getSpaceLabel(type?: string): string {
  return SPACE_LABELS[type ?? ''] ?? type ?? 'Other'
}

/** Find item at path given by segment names (e.g. ['Use', 'MyHub', 'Section']). */
export function getItemByPathSegments(items: MenuItemDTO[], segments: string[]): MenuItemDTO | null {
  if (segments.length === 0) return null
  if (segments.length === 1) return null
  const spaceType = parseSpaceType(segments[0])
  if (!spaceType) return null
  const hub = findHub(items, spaceType, segments[1])
  if (!hub) return null
  if (segments.length === 2) return hub
  let current: MenuItemDTO = hub
  for (let i = 2; i < segments.length; i++) {
    const child = findChild(current, segments[i])
    if (!child) return null
    current = child
  }
  return current
}

export interface SegmentOption {
  value: string
  label: string
}

/**
 * Options for the next path segment only (one step).
 * pathSegments = segment names so far: [] -> space (Use/Create/Manage), [space] -> hubs, [space, hub, ...] -> children.
 */
export function getOptionsForSegmentLevel(items: MenuItemDTO[], pathSegments: string[]): SegmentOption[] {
  if (pathSegments.length === 0) {
    return SPACE_TYPES.map(type => ({ value: type, label: getSpaceLabel(type) }))
  }
  if (pathSegments.length === 1) {
    const spaceLabel = pathSegments[0].trim()
    return items
      .filter(h => (h.level === 0 || h.type) && getSpaceLabel(h.type) === spaceLabel)
      .map(h => ({ value: h.id, label: getItemName(h) }))
  }
  const parent = getItemByPathSegments(items, pathSegments)
  const children = parent?.children ?? []
  return children.map(c => ({ value: c.id, label: getItemName(c) }))
}

function buildPathForItem(item: MenuItemDTO, parentPath: string): string {
  const segment = item.name || item.code || item.id || ''
  return parentPath ? `${parentPath}/${segment}` : segment
}

export function buildMenuPathOptions(
  items: MenuItemDTO[],
  parentPath = ''
): Array<{ id: string; path: string; item: MenuItemDTO; level: number }> {
  const result: Array<{ id: string; path: string; item: MenuItemDTO; level: number }> = []
  for (const item of items) {
    const level = item.level ?? (item.type ? 0 : 1)
    const spaceLabel = level === 0 ? getSpaceLabel(item.type) : ''
    const segment = item.name || item.code || item.id || ''
    const path = level === 0 ? `${spaceLabel}/${segment}` : buildPathForItem(item, parentPath)
    result.push({ id: item.id, path, item, level })
    if (item.children && item.children.length > 0) {
      result.push(...buildMenuPathOptions(item.children, path))
    }
  }
  return result
}

export type HubWithMenuItems = { id: string; name?: string; type?: string; menuItems?: MenuItemDTO[] }

export function buildMenuEntryPathsForUrl(
  hub: HubWithMenuItems,
  targetUrl: string,
  normalizeUrl: (u: string) => string
): Array<{ path: string; item: MenuItemDTO }> {
  const normalizedTarget = normalizeUrl(targetUrl)
  const spaceLabel = getSpaceLabel(hub.type)
  const hubSegment = hub.name ?? hub.id ?? ''
  const rootPath = hubSegment ? `${spaceLabel}/${hubSegment}` : spaceLabel
  const result: Array<{ path: string; item: MenuItemDTO }> = []
  function walk(items: MenuItemDTO[] | undefined, parentPath: string) {
    if (!items) return
    for (const item of items) {
      const segment = item.name || (item as { code?: string }).code || item.id || ''
      const path = parentPath ? `${parentPath}/${segment}` : segment
      const itemUrl = (item.resourceUrl as { url?: string } | undefined)?.url
      if (itemUrl && normalizeUrl(itemUrl) === normalizedTarget) result.push({ path, item })
      walk(item.children, path)
    }
  }
  walk(hub.menuItems, rootPath)
  return result
}
