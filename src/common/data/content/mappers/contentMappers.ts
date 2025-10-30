/**
 * Content Mappers
 * Transform base types to enhanced types with computed fields
 */
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import { ContentRole } from '../types/contentEnums'
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
 * FIXED: Relations are singular in GraphQL (contentEntryCategory, not contentEntryCategories)
 */
export const mapBaseToContentEntry = (
  base: BaseContentEntry,
  options?: {
    contentEntryCategory?: BaseContentEntryCategory[]
    contentEntryTag?: BaseContentEntryTag[]
    contentDocument?: BaseContentDocument[]
    contentEntryReaction?: BaseContentEntryReaction[]
    childContentEntries?: BaseContentEntry[]
    descendantContentEntryAggregate?: { aggregate: { count: number } }
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
    reactionCount: options?.contentEntryReaction?.length || 0,
    // Use aggregate count for all descendants (nested comments)
    commentCount:
      options?.descendantContentEntryAggregate?.aggregate?.count ??
      options?.childContentEntries?.filter(e => e.role === ContentRole.COMMENT).length ??
      0,

    // Map relations if provided (singular names)
    contentEntryCategory: options?.contentEntryCategory?.map(mapBaseToContentEntryCategory),
    contentEntryTag: options?.contentEntryTag?.map(mapBaseToContentEntryTag),
    contentDocument: options?.contentDocument?.map(mapBaseToContentDocument),
    contentEntryReaction: options?.contentEntryReaction?.map(mapBaseToContentEntryReaction),
    childContentEntries: options?.childContentEntries?.map(child => mapBaseToContentEntry(child)),

    // Computed category and tag names
    categoryNames: options?.contentEntryCategory?.map(c => c.contentCategory?.value).filter(Boolean) as
      | string[]
      | undefined,
    tagNames: options?.contentEntryTag?.map(t => t.contentTag?.value).filter(Boolean) as string[] | undefined
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
  const fileInfo = base.fileInfo as any // fileInfo is jsonb, dynamic structure
  return {
    ...base,
    documentTypeName: base.documentType?.value,
    fileSize: fileInfo?.size,
    mimeType: fileInfo?.type,
    filePath: fileInfo?.name
  }
}

/**
 * Map base content entry reaction to enhanced
 * FIXED: CatalogEntry has no label or icon - use value for both name and emoji
 */
export const mapBaseToContentEntryReaction = (base: BaseContentEntryReaction): ContentEntryReaction => {
  return {
    ...base,
    creatorDisplayName: getEmployeeDisplayName(base.creatorEmployee),
    reactionName: base.contentReaction?.value,
    reactionEmoji: base.contentReaction?.value // Use value as emoji fallback
  }
}

/**
 * Build nested comment hierarchy
 * Recursively builds tree structure from flat comment list
 * FIXED: Use singular relation names
 */
export const buildCommentHierarchy = (
  comments: BaseContentEntry[],
  parentEntryId: string | null = null
): ContentEntry[] => {
  const childComments = comments.filter(c => c.parentContentEntryId === parentEntryId)

  return childComments.map(comment => {
    const nestedChildren = buildCommentHierarchy(comments, comment.id)
    const reactions = comment.contentEntryReaction || []

    return mapBaseToContentEntry(comment, {
      childContentEntries: nestedChildren,
      contentEntryReaction: reactions,
      contentEntryCategory: comment.contentEntryCategory,
      contentEntryTag: comment.contentEntryTag,
      contentDocument: comment.contentDocument
    })
  })
}

/**
 * Aggregate reactions by emoji type
 * FIXED: Use value instead of label/icon
 */
export const aggregateReactions = (reactions: BaseContentEntryReaction[]): ReactionAggregation[] => {
  const reactionMap = new Map<string, ReactionAggregation>()

  reactions.forEach(reaction => {
    const reactionRef = reaction.contentReactionRef || 'unknown'
    const existing = reactionMap.get(reactionRef)

    if (existing && reaction.creatorEmployee) {
      existing.count++
      existing.employees.push(reaction.creatorEmployee)
    } else if (reaction.creatorEmployee) {
      reactionMap.set(reactionRef, {
        reactionRef,
        reactionName: reaction.contentReaction?.value || 'Unknown',
        reactionEmoji: reaction.contentReaction?.value, // Use value as emoji
        count: 1,
        employees: [reaction.creatorEmployee]
      })
    }
  })

  return Array.from(reactionMap.values()).sort((a, b) => b.count - a.count)
}

/**
 * Extract unique catalog entries from content entries
 * FIXED: Use singular relation names
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
        catalogs = entry.contentGroup ? [entry.contentGroup] : []
        break
      case 'type':
        catalogs = entry.contentType ? [entry.contentType] : []
        break
      case 'category':
        catalogs = (entry.contentEntryCategory?.map(c => c.contentCategory).filter(Boolean) as CatalogEntry[]) || []
        break
      case 'tag':
        catalogs = (entry.contentEntryTag?.map(t => t.contentTag).filter(Boolean) as CatalogEntry[]) || []
        break
    }

    catalogs.forEach(catalog => {
      if (catalog && catalog.id) {
        catalogMap.set(catalog.id, catalog)
      }
    })
  })

  return Array.from(catalogMap.values()).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
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

/**
 * Map ContentEntry to legacy Content format (for backward compatibility)
 * Used during migration period for Intranet views
 */
export const toIntranetContent = (entry: ContentEntry): any => {
  return {
    articleId: entry.id,
    title: entry.title,
    content: entry.content || '',
    previewText: entry.preview || '',
    contentImage: entry.picture,
    createdAt: entry.createdAt,
    timeToRead: entry.timeToRead,
    allowReaction: entry.allowReaction,
    allowComment: entry.allowComment,
    reactionsCount: entry.reactionCount || 0,
    commentsCount: entry.commentCount || 0,
    tags: entry.tagNames || [],
    tagNames: entry.tagNames || [],
    categories: entry.categoryNames || [],
    contentType: entry.contentType?.value,
    authorFullName: entry.creatorDisplayName || '',
    displayAuthor: entry.displayCreator
  }
}
