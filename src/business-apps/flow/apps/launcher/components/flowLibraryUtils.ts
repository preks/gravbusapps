import type { FlowTemplateLibraryItem } from '../hooks/useFlowTemplateLibrary'

export type ItemsByCategory = {
  byCategoryId: Map<string, FlowTemplateLibraryItem[]>
  uncategorized: FlowTemplateLibraryItem[]
}

const normalizeContentKey = (item: FlowTemplateLibraryItem): string => {
  const name = (item.name || '').trim().toLowerCase()
  const description = (item.description || '').trim().toLowerCase()
  return `${name}\u0000${description}`
}

/**
 * Drop visually duplicate flow templates returned by the backend.
 *
 * The launcher must never show the same flow tile twice (issue a36d2a23).
 * Two defenses, applied in input order so the first occurrence wins:
 *
 *   1. `templateId` — guards against the backend returning the same id twice.
 *   2. normalized `name + description` — guards against the backend returning
 *      multiple distinct ids whose user-visible content is identical (the
 *      pattern observed in production: every tile rendered 2–3 times).
 *
 * Items with an empty `name` AND empty `description` only dedup on `templateId`,
 * since collapsing them by content would merge unrelated stub records.
 */
export const dedupFlowTemplateLibraryItems = (
  items: FlowTemplateLibraryItem[]
): FlowTemplateLibraryItem[] => {
  const seenIds = new Set<string>()
  const seenContent = new Set<string>()
  const result: FlowTemplateLibraryItem[] = []

  items.forEach(item => {
    if (seenIds.has(item.templateId)) return
    seenIds.add(item.templateId)

    const contentKey = normalizeContentKey(item)
    const hasContent = contentKey !== '\u0000'
    if (hasContent && seenContent.has(contentKey)) return
    if (hasContent) seenContent.add(contentKey)

    result.push(item)
  })

  return result
}

/**
 * Group flow templates by service category.
 *
 * Each item is appended at most once per category, even when its
 * `serviceCategoryIds` lists the same id more than once. That happens
 * whenever multiple `ServicePortalCategory` tags decode to the same code
 * (e.g. `ServicePortalCategory:1:hr` and `ServicePortalCategory:2:hr`
 * both resolving to `'hr'`). Without this dedup, the Flow Launcher
 * renders the same template tile multiple times in a category (issue
 * a36d2a23).
 */
export const computeItemsByCategory = (
  items: FlowTemplateLibraryItem[],
  knownCategoryIds: Set<string>
): ItemsByCategory => {
  const byCategoryId = new Map<string, FlowTemplateLibraryItem[]>()
  const uncategorized: FlowTemplateLibraryItem[] = []

  items.forEach(item => {
    const matching = new Set<string>()
    item.serviceCategoryIds.forEach(id => {
      if (knownCategoryIds.has(id)) {
        matching.add(id)
      }
    })
    if (matching.size === 0) {
      uncategorized.push(item)
      return
    }
    matching.forEach(id => {
      const prev = byCategoryId.get(id) || []
      byCategoryId.set(id, [...prev, item])
    })
  })

  return { byCategoryId, uncategorized }
}
