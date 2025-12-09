import React from 'react'
import {
  Building2,
  User,
  Users,
  Rocket,
  TrendingUp,
  UserCircle,
  Megaphone,
  Receipt,
  FileText,
  Newspaper,
  BookOpen,
  Globe
} from 'lucide-react'
import type { EntityType, MessageEntityReference } from '../../types'
import { ENTITY_NAVIGATION_PATHS, ENTITY_QUERY_PARAMS, isSupportedEntityType } from '../../types'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

/**
 * Entity type to icon mapping
 */
export const ENTITY_ICONS: Record<EntityType, React.ElementType> = {
  // CRM
  account: Building2,
  contact: User,
  lead: Users,
  opportunity: Rocket,
  // IRM
  investment_account: Building2,
  investment_contact: User,
  investment_lead: Users,
  investment_opportunity: Rocket,
  investment: TrendingUp,
  // Intranet content
  news_article: Newspaper,
  knowledge_article: BookOpen,
  intranet_article: Globe,
  document_article: FileText,
  // Other
  employee: UserCircle,
  campaign: Megaphone,
  expense_request: Receipt
}

/**
 * Content entity types that need the tab parameter for navigation
 */
export const CONTENT_ENTITY_TYPES: EntityType[] = [
  'news_article',
  'knowledge_article',
  'intranet_article',
  'document_article'
]

/**
 * Navigate to entity record page using platform navigation
 */
export const navigateToEntity = (entity: MessageEntityReference): void => {
  if (!isSupportedEntityType(entity.type)) {
    console.warn('[Chat] Unsupported entity type for navigation', entity)
    return
  }

  const basePath = ENTITY_NAVIGATION_PATHS[entity.type]
  const queryParam = ENTITY_QUERY_PARAMS[entity.type]

  // Add tab=home for intranet content types
  const isContentType = CONTENT_ENTITY_TYPES.includes(entity.type)

  const url = buildPlatformUrl(basePath, {
    [queryParam]: entity.id,
    source: 'chat',
    ...(isContentType && { tab: 'home' })
  })

  navigateTo(url)
}
