/**
 * Content Mappers
 * Transform GraphQL responses to Content types with computed fields
 */
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import { ContentRole } from '../types/contentEnums'
import type {
  ContentEntry,
  ContentEntryCategory,
  ContentEntryTag,
  ContentDocument,
  ContentEntryReaction,
  ReactionAggregation
} from '../types/contentTypes'

/**
 * Map GraphQL response to ContentEntry with computed fields
 * FIXED: Relations are singular in GraphQL (contentEntryCategory, not contentEntryCategories)
 */
export const mapBaseToContentEntry = (
  base: any, // GraphQL response entry
  options?: {
    contentEntryCategory?: any[]
    contentEntryTag?: any[]
    contentDocument?: any[]
    contentEntryReaction?: any[]
    childContentEntries?: any[]
    descendantContentEntryAggregate?: { aggregate: { count: number } }
    childContentEntryAggregate?: { aggregate: { count: number } }
  }
): ContentEntry => {
  const mapped: ContentEntry = {
    ...base,

    // Prefer childContentEntryAggregate (direct answers for Questions), fallback to descendantContentEntryAggregate (all nested), then manual count
    commentCount:
      options?.childContentEntryAggregate?.aggregate?.count ??
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
 * Map GraphQL response to ContentEntryCategory with computed fields
 */
export const mapBaseToContentEntryCategory = (base: any): ContentEntryCategory => {
  return {
    ...base,
    categoryName: base.contentCategory?.value
  }
}

/**
 * Map GraphQL response to ContentEntryTag with computed fields
 */
export const mapBaseToContentEntryTag = (base: any): ContentEntryTag => {
  return {
    ...base,
    tagName: base.contentTag?.value
  }
}

/**
 * Map GraphQL response to ContentDocument with computed fields
 */
export const mapBaseToContentDocument = (base: any): ContentDocument => {
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
 * Map GraphQL response to ContentEntryReaction with computed fields
 * FIXED: CatalogEntry has no label or icon - use value for both name and emoji
 */
export const mapBaseToContentEntryReaction = (base: any): ContentEntryReaction => {
  return {
    ...base,
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
  comments: any[], // GraphQL response comments
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
export const aggregateReactions = (reactions: any[]): ReactionAggregation[] => {
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
export interface IntranetContent {
  articleId: string
  title: string
  content: string
  previewText: string
  contentImage?: string | null
  createdAt?: string | null
  createdAtText?: string
  timeToRead?: number | null
  allowReaction: boolean
  allowComment: boolean
  reactionsCount: number
  commentsCount: number
  feedbacksCount?: number
  tags: string[]
  tagNames: string[]
  categories: string[]
  contentType?: string
  authorFullName: string
  displayAuthor: boolean
  status?: string
  creatorEmployeeId?: string | null
  creatorEmployee?: EmployeeRef | null
  // Include reaction counts and user reactions for ReactionPicker
  contentEntryReactionCounts?: ContentEntry['contentEntryReactionCounts']
  contentEntryReaction?: ContentEntry['contentEntryReaction']
}

export const toIntranetContent = (entry: ContentEntry): IntranetContent => {
  return {
    articleId: entry.id,
    title: entry.title || '',
    content: entry.content || '',
    previewText: entry.preview || '',
    contentImage: entry.picture,
    createdAt: entry.createdAt,
    timeToRead: entry.timeToRead,
    allowReaction: entry.allowReaction ?? false,
    allowComment: entry.allowComment ?? false,
    reactionsCount:
      entry.contentEntryReactionCounts?.reduce((sum: number, item: any) => sum + (item.count || 0), 0) || 0,
    commentsCount: entry.commentCount || 0,
    feedbacksCount: 0, // TODO: Add view count tracking
    tags: entry.tagNames || [],
    tagNames: entry.tagNames || [],
    categories: entry.categoryNames || [],
    contentType: entry.contentType?.value,
    authorFullName: entry.creatorEmployee?.displayName || '',
    displayAuthor: entry.displayCreator ?? false,
    creatorEmployeeId: entry.creatorEmployeeId,
    creatorEmployee: entry.creatorEmployee,
    // Include reaction data for ReactionPicker
    contentEntryReactionCounts: entry.contentEntryReactionCounts,
    contentEntryReaction: entry.contentEntryReaction
  }
}
