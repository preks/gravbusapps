import type { TFunction } from 'i18next'
import { Content } from '../types/content.types'
import { toast } from 'sonner'

// Trending score weight constants
const REACTIONS_WEIGHT = 1
const COMMENTS_WEIGHT = 2
const SHARES_WEIGHT = 3

// Reading time constants
const WORDS_PER_MINUTE = 225

// File size constants
const MAX_IMAGE_SIZE_MB = 1
const MAX_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024 // 1MB in bytes

// Tag constants
const ALL_TAG = 'All'

export const copyUrlToClipboard = (message: string, contentId?: string) => {
  const url = contentId ? `${globalThis.window.location.href}/${contentId}` : globalThis.window.location.href
  navigator.clipboard.writeText(url)
  toast.success(message)
}

export interface SelectOption {
  id: string
  name: string
}

export const tagMapper = (tagId: string, tags: SelectOption[]) => {
  if (!tags || tags.length === 0) {
    return { id: '', name: '' }
  }
  const foundTag = tags.find(t => t.id === tagId)
  if (foundTag) {
    return { id: foundTag.id, name: foundTag.name }
  }
  const foundByName = tags.find(t => t.name === tagId)
  if (foundByName) {
    return { id: foundByName.id, name: foundByName.name }
  }
  return { id: '', name: '' }
}

export const updateTags = (tags: { checked: boolean; label: string }[], label: string) => {
  return tags.map(tag => {
    // If "All" tag is clicked, only select it and deselect all others
    if (label === ALL_TAG) {
      return { ...tag, checked: tag.label === ALL_TAG }
    }

    // If another tag is clicked, deselect "All" tag
    if (tag.label === ALL_TAG) {
      return { ...tag, checked: false }
    }

    // For the clicked tag, always set to checked (unless it's already checked, then toggle back to All)
    if (tag.label === label) {
      const isAlreadyChecked = tag.checked
      // If the tag is already checked, we'll need to re-enable the "All" tag
      if (isAlreadyChecked) {
        return { ...tag, checked: false }
      }
      return { ...tag, checked: true }
    }

    // For all other tags, ensure they're unchecked (single selection only)
    return { ...tag, checked: false }
  })
}

export const validateImage = (file: Blob, t: TFunction) => {
  const acceptedFormats = ['image/png', 'image/jpeg', 'image/jpg']
  const isFormatAccepted = acceptedFormats.includes(file.type)
  if (!isFormatAccepted) {
    toast.error(t('validations.invalid_file_format'))
    return false
  }
  if (file.size > MAX_SIZE) {
    // Calculate file size in MB for display
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
    toast.error(`${t('validations.file_too_large')} (${fileSizeMB}MB/${MAX_IMAGE_SIZE_MB}MB)`)
    return false
  }
  return true
}

export const calculateReadingTime = (text: string): number => {
  if (!text) return 0
  const wordCount = text.trim().split(/\s+/).length
  const readingTime = Math.ceil(wordCount / WORDS_PER_MINUTE)
  return Math.max(1, readingTime)
}

export const calculateTrendingScore = (content: Content): number => {
  const reactions = content.reactionsCount ?? 0
  const comments = content.commentsCount ?? 0
  const shares = content.shareCount ?? 0

  return reactions * REACTIONS_WEIGHT + comments * COMMENTS_WEIGHT + shares * SHARES_WEIGHT
}

/**
 * Interface for tag objects from the API
 */
export interface ContentTagAPI {
  id: string
  name: string
  value?: string
}

/**
 * Interface for formatted tags used in content previews
 */
export interface FormattedTag {
  tag: string
  tag_id: string
}

/**
 * Format a tag ID or object into a properly formatted tag with name and ID
 */
export const formatTag = (tagIdOrName: string, availableTags: ContentTagAPI[] = []): FormattedTag => {
  // Case 1: Existing tag from dropdown
  const existingTag = availableTags.find(t => t.id === tagIdOrName)
  if (existingTag) {
    return { tag: existingTag.name, tag_id: tagIdOrName }
  }

  // Case 2: Newly created tag as JSON string
  if (typeof tagIdOrName === 'string' && tagIdOrName.startsWith('{')) {
    try {
      const newTag = JSON.parse(tagIdOrName)
      if (newTag.name) {
        return { tag: newTag.name, tag_id: newTag.id ?? tagIdOrName }
      }
    } catch {
      // Failed to parse JSON, continue to fallback
    }
  }

  // Case 3: Fallback - create readable name from ID
  const displayName = tagIdOrName.toString().replace(/^\d+_/, '').replaceAll('_', ' ')
  return { tag: displayName, tag_id: tagIdOrName }
}

/**
 * Maps an array of tag IDs or objects to formatted tag objects
 */
export const formatTags = (tagIds: string[] = [], availableTags: ContentTagAPI[] = []): FormattedTag[] => {
  return tagIds.map(tagId => formatTag(tagId, availableTags))
}

/**
 * Formats content tags from various input formats into a standardized format
 */
export const formatEditContentTags = (tags: any[] = [], availableTags: ContentTagAPI[] = []): FormattedTag[] => {
  if (!tags || !Array.isArray(tags)) {
    return []
  }

  return (
    tags
      .map(tag => {
        // Handle null/undefined values
        if (!tag) return null

        // Handle string tags (tag IDs)
        if (typeof tag === 'string') {
          const foundTag = availableTags.find(availableTag => availableTag.id === tag)
          if (foundTag) {
            return { tag: foundTag.name, tag_id: tag }
          }
          return { tag: tag, tag_id: tag }
        }

        // Handle object tags
        const tagObj = tag as Record<string, any>
        const tagId = tagObj.tag_id ?? tagObj.id?.toString() ?? ''
        const tagName = tagObj.tag ?? tagObj.name ?? tagObj.label ?? tagId

        // Try to find by ID in availableTags
        if (tagId) {
          const foundTag = availableTags.find(availableTag => availableTag.id === tagId)
          if (foundTag) {
            return { tag: foundTag.name, tag_id: tagId }
          }
        }

        return { tag: tagName, tag_id: tagId }
      })
      // Filter out null values and empty tags
      .filter((tag): tag is FormattedTag => tag !== null && (tag.tag_id !== '' || tag.tag !== ''))
  )
}

export const removeDiacriticalMarks = (str: string): string => {
  return str.normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '')
}
