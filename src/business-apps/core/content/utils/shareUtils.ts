import { ContentGroup } from '@/common/data/content/types/contentEnums'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

/**
 * Map ContentGroup to entity type identifier
 */
export const getEntityTypeFromContentGroup = (
  contentGroup?: string | null
): 'news-article' | 'knowledge-article' | 'document' | 'question' | null => {
  if (!contentGroup) return null

  switch (contentGroup) {
    case ContentGroup.NEWS:
      return 'news-article'
    case ContentGroup.KNOWLEDGE:
      return 'knowledge-article'
    case ContentGroup.DOCUMENT:
      return 'document'
    case ContentGroup.QUESTION:
      return 'question'
    default:
      return null
  }
}

/**
 * Map variant to entity type identifier
 */
export const getEntityTypeFromVariant = (
  variant: 'news' | 'knowledge' | 'intranet' | 'document'
): 'news-article' | 'knowledge-article' | 'document' | null => {
  switch (variant) {
    case 'news':
      return 'news-article'
    case 'knowledge':
      return 'knowledge-article'
    case 'document':
      return 'document'
    case 'intranet':
      return 'news-article' // Intranet defaults to news-article
    default:
      return null
  }
}

/**
 * Map currentTab to entity type identifier
 */
export const getEntityTypeFromTab = (
  tab?: string
): 'news-article' | 'knowledge-article' | 'document' | 'question' | null => {
  switch (tab) {
    case 'news':
      return 'news-article'
    case 'knowledge':
      return 'knowledge-article'
    case 'documents':
      return 'document'
    case 'questions':
      return 'question'
    default:
      return null
  }
}

/**
 * Build content record URL
 */
export const buildContentRecordUrl = (contentId: string, currentTab?: string): string => {
  return buildPlatformUrl('/platform/content/intranet/content-record', {
    contentId,
    ...(currentTab && { tab: currentTab })
  })
}
