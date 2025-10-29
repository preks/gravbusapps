/**
 * Content Mappers
 * Transform base types to enhanced types with computed fields
 */
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type {
  BaseContentEntry,
  BaseContentEntryCategory,
  BaseContentEntryTag,
  BaseContentDocument,
  BaseContentEntryReaction
} from '../types/contentBaseTypes'
import type {
  ContentEntry,
  ContentEntryCategory,
  ContentEntryTag,
  ContentDocument,
  ContentEntryReaction,
  ReactionAggregation
} from '../types/contentTypes'

/**
 * Format date for display
 */
const formatDate = (dateString?: string | null): string | undefined => {
  if (!dateString) return undefined
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return undefined
  }
}

/**
 * Get employee display name
 */
const getEmployeeDisplayName = (employee?: EmployeeRef | null): string | undefined => {
  if (!employee) return undefined
  return employee.displayName || `${employee.firstName} ${employee.lastName}`.trim() || undefined
}

/**
 * Map base content entry to enhanced content entry
 */
export const mapBaseToContentEntry = (
  base: BaseContentEntry,
  options?: {
    contentEntryCategories?: BaseContentEntryCategory[]
    contentEntryTags?: BaseContentEntryTag[]
    contentDocuments?: BaseContentDocument[]
    contentEntryReactions?: BaseContentEntryReaction[]
    childContentEntries?: BaseContentEntry[]
  }
): ContentEntry => {
  const mapped: ContentEntry = {
    ...base,

    // Computed display fields
    creatorDisplayName: getEmployeeDisplayName(base.creatorEmployee),
    updaterDisplayName: getEmployeeDisplayName(base.updaterEmployee),
    formattedCreatedAt: formatDate(base.createdAt),
    formattedUpdatedAt: formatDate(base.updatedAt),

    // Relation counts
    reactionCount: options?.contentEntryReactions?.length || 0,
    commentCount: options?.childContentEntries?.filter(e => e.role === 'COMMENT').length || 0,

    // Map relations if provided
    contentEntryCategories: options?.contentEntryCategories?.map(mapBaseToContentEntryCategory),
    contentEntryTags: options?.contentEntryTags?.map(mapBaseToContentEntryTag),
    contentDocuments: options?.contentDocuments?.map(mapBaseToContentDocument),
    contentEntryReactions: options?.contentEntryReactions?.map(mapBaseToContentEntryReaction),
    childContentEntries: options?.childContentEntries?.map(child => mapBaseToContentEntry(child)),

    // Computed category and tag names
    categoryNames: options?.contentEntryCategories?.map(c => c.contentCategory?.value).filter(Boolean) as
      | string[]
      | undefined,
    tagNames: options?.contentEntryTags?.map(t => t.contentTag?.value).filter(Boolean) as string[] | undefined
  }

  return mapped
}

/**
 * Map base content entry category to enhanced
 */
export const mapBaseToContentEntryCategory = (base: BaseContentEntryCategory): ContentEntryCategory => {
  return {
    ...base,
    categoryName: base.contentCategory?.value
  }
}

/**
 * Map base content entry tag to enhanced
 */
export const mapBaseToContentEntryTag = (base: BaseContentEntryTag): ContentEntryTag => {
  return {
    ...base,
    tagName: base.contentTag?.value
  }
}

/**
 * Map base content document to enhanced
 */
export const mapBaseToContentDocument = (base: BaseContentDocument): ContentDocument => {
  return {
    ...base,
    documentTypeName: base.documentType?.value,
    fileSize: base.fileInfo?.size,
    mimeType: base.fileInfo?.type,
    filePath: base.fileInfo?.name
  }
}

/**
 * Map base content entry reaction to enhanced
 */
export const mapBaseToContentEntryReaction = (base: BaseContentEntryReaction): ContentEntryReaction => {
  return {
    ...base,
    creatorDisplayName: getEmployeeDisplayName(base.creatorEmployee),
    reactionEmoji: base.reaction
  }
}

/**
 * Build nested comment hierarchy
 * Recursively builds tree structure from flat comment list
 */
export const buildCommentHierarchy = (
  comments: BaseContentEntry[],
  parentEntryId: string | null = null
): ContentEntry[] => {
  const childComments = comments.filter(c => c.parentContentEntryId === parentEntryId)

  return childComments.map(comment => {
    const nestedChildren = buildCommentHierarchy(comments, comment.id)
    const reactions = comment.contentEntryReactions || []

    return mapBaseToContentEntry(comment, {
      childContentEntries: nestedChildren,
      contentEntryReactions: reactions,
      contentEntryCategories: comment.contentEntryCategories,
      contentEntryTags: comment.contentEntryTags,
      contentDocuments: comment.contentDocuments
    })
  })
}

/**
 * Aggregate reactions by emoji type
 */
export const aggregateReactions = (reactions: BaseContentEntryReaction[]): ReactionAggregation[] => {
  const reactionMap = new Map<string, ReactionAggregation>()

  reactions.forEach(reaction => {
    const existing = reactionMap.get(reaction.reaction)

    if (existing && reaction.creatorEmployee) {
      existing.count++
      existing.employees.push(reaction.creatorEmployee)
    } else if (reaction.creatorEmployee) {
      reactionMap.set(reaction.reaction, {
        reaction: reaction.reaction,
        count: 1,
        employees: [reaction.creatorEmployee]
      })
    }
  })

  return Array.from(reactionMap.values()).sort((a, b) => b.count - a.count)
}

/**
 * Extract unique catalog entries from content entries
 */
export const extractUniqueCatalogRefs = (
  entries: ContentEntry[],
  type: 'group' | 'type' | 'category' | 'tag'
): CatalogEntry[] => {
  const catalogMap = new Map<string, CatalogEntry>()

  entries.forEach(entry => {
    let catalogs: (CatalogEntry | undefined)[] = []

    switch (type) {
      case 'group':
        catalogs = [entry.contentGroup]
        break
      case 'type':
        catalogs = [entry.contentType]
        break
      case 'category':
        catalogs = entry.contentEntryCategories?.map(c => c.contentCategory) || []
        break
      case 'tag':
        catalogs = entry.contentEntryTags?.map(t => t.contentTag) || []
        break
    }

    catalogs.forEach(catalog => {
      if (catalog && catalog.id) {
        catalogMap.set(catalog.id, catalog)
      }
    })
  })

  return Array.from(catalogMap.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
}

/**
 * Group content entries by field value
 */
export const groupContentEntriesBy = (
  entries: ContentEntry[],
  field: 'contentGroupRef' | 'contentTypeRef' | 'creatorEmployeeId'
): Record<string, ContentEntry[]> => {
  const grouped: Record<string, ContentEntry[]> = {}

  entries.forEach(entry => {
    const key = entry[field]
    if (key) {
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(entry)
    }
  })

  return grouped
}

/**
 * Calculate reading time from content
 */
export const calculateReadingTime = (content: string, wordsPerMinute = 200): number => {
  if (!content) return 0

  // Strip HTML tags and count words
  const text = content.replace(/<[^>]*>/g, ' ')
  const words = text.trim().split(/\s+/).length

  return Math.ceil(words / wordsPerMinute)
}

/**
 * Filter entries by date range
 */
export const filterEntriesByDateRange = (entries: ContentEntry[], startDate?: Date, endDate?: Date): ContentEntry[] => {
  return entries.filter(entry => {
    if (!entry.createdAt) return false

    const entryDate = new Date(entry.createdAt)

    if (startDate && entryDate < startDate) return false
    if (endDate && entryDate > endDate) return false

    return true
  })
}
