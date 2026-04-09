/**
 * Content Entry Mappers
 * Transforms GraphQL ContentEntry responses to form-compatible data shapes.
 */
import type { ContentEntry } from '../types/contentEntryTypes'

/**
 * Shape returned by mapContentEntryToFormData.
 * Field names match the backend DTO so contentEntryFormFields is a near-identity map.
 */
export interface ContentEntryMappedFormData {
  id: string
  version?: number
  title: string
  preview: string
  content: string
  contentGroup: string
  contentTypeId: string
  picture: string | null
  pictureThumbnail: string | null
  displayCreator: boolean
  allowComment: boolean
  allowReaction: boolean
  schedulePublication: boolean
  activeFrom: string | null
  activeTo: string | null
  contentCategoryIds: string[]
  contentCategoryNames: string[]
  contentTagIds: string[]
  contentTagNames: string[]
}

/**
 * Maps a loaded ContentEntry to the flat form data shape used by ContentEntryWindow.
 *
 * Handles:
 * - contentTypeId resolution (scalar field takes precedence over relation id)
 * - picture JSON parsing / passthrough
 * - category/tag relation id extraction with deduplication
 * - schedulePublication derived from activeFrom/activeTo presence
 */
export function mapContentEntryToFormData(entry: ContentEntry): ContentEntryMappedFormData {
  const categoryIds = [
    ...new Set(
      (entry.contentEntryCategories || []).map(cat => cat.contentCategoryId).filter((id): id is string => Boolean(id))
    )
  ]

  const tagIds = [
    ...new Set((entry.contentEntryTags || []).map(tag => tag.contentTagId).filter((id): id is string => Boolean(id)))
  ]

  let picture: string | null = null
  if (entry.picture) {
    try {
      const parsed = typeof entry.picture === 'string' ? JSON.parse(entry.picture) : entry.picture
      picture = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
    } catch {
      picture = typeof entry.picture === 'string' ? entry.picture : null
    }
  }

  return {
    id: entry.id || '',
    version: entry.version,
    title: entry.title || '',
    preview: entry.preview || '',
    content: entry.content || '',
    contentGroup: entry.contentGroup || '',
    contentTypeId: entry.contentTypeId || entry.contentType?.id || '',
    picture,
    pictureThumbnail: entry.pictureThumbnail || null,
    displayCreator: entry.displayCreator ?? true,
    allowComment: entry.allowComment ?? true,
    allowReaction: entry.allowReaction ?? true,
    schedulePublication: !!(entry.activeFrom || entry.activeTo),
    activeFrom: entry.activeFrom || null,
    activeTo: entry.activeTo || null,
    contentCategoryIds: categoryIds,
    contentCategoryNames: [],
    contentTagIds: tagIds,
    contentTagNames: []
  }
}
